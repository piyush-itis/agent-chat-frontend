"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeRun, useRealtimeStream } from "@trigger.dev/react-hooks";
import { REALTIME_STREAMS, type RealtimeAccess, type RunResponse } from "@/generated/api";
import { getRun, refreshRealtimeToken } from "@/lib/api/runs";
import { overlayRun, type RunRealtimeMeta } from "@/lib/overlay-run";
import { isTransientRealtimeError } from "@/lib/realtime-error";

const ACTIVE = new Set(["queued", "thinking", "working", "waiting", "stopping"]);

function triggerAccess(runId: string, triggerRunId: string, token: string): RealtimeAccess {
  return {
    transport: "trigger",
    pollUrl: `/api/runs/${runId}`,
    triggerRunId,
    publicAccessToken: token,
    streams: { thinking: REALTIME_STREAMS.thinking, assistant: REALTIME_STREAMS.assistant },
  };
}

export function useRun(runId: string | null | undefined, seedRealtime?: RealtimeAccess) {
  const queryClient = useQueryClient();
  const pollFallbackRef = useRef(true);
  const accessRef = useRef<RealtimeAccess | undefined>(seedRealtime);
  const [access, setAccess] = useState<RealtimeAccess | undefined>(seedRealtime);

  const query = useQuery({
    queryKey: ["runs", runId],
    queryFn: () => getRun(runId!),
    enabled: Boolean(runId),
    retry: 2,
    refetchInterval: (current) => {
      if (current.state.error) return 2500;
      const status = current.state.data?.status;
      if (!status || !ACTIVE.has(status)) return false;
      return pollFallbackRef.current ? 800 : false;
    },
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    accessRef.current = undefined;
    setAccess(undefined);
  }, [runId]);

  useEffect(() => {
    if (!runId) return;
    if (seedRealtime?.transport === "trigger") {
      accessRef.current = seedRealtime;
      setAccess(seedRealtime);
      return;
    }
    const triggerRunId = query.data?.triggerRunId;
    if (!triggerRunId || accessRef.current?.transport === "trigger") return;
    let cancelled = false;
    void refreshRealtimeToken(runId)
      .then((result) => {
        if (cancelled || !result.token) return;
        const next = triggerAccess(runId, triggerRunId, result.token);
        accessRef.current = next;
        setAccess(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [query.data?.triggerRunId, runId, seedRealtime]);

  const triggerReady = Boolean(runId && access?.transport === "trigger");
  const triggerRunId = access?.transport === "trigger" ? access.triggerRunId : undefined;
  const accessToken = access?.transport === "trigger" ? access.publicAccessToken : undefined;

  const refreshAccessToken = useCallback(async () => {
    const result = await refreshRealtimeToken(runId!);
    return result.token;
  }, [runId]);

  const { run: triggerRun, error: triggerError } = useRealtimeRun(triggerRunId, {
    accessToken,
    enabled: triggerReady,
    skipColumns: ["payload", "output"],
    refreshAccessToken: triggerReady ? refreshAccessToken : undefined,
    onComplete: () => {
      void queryClient.invalidateQueries({ queryKey: ["runs", runId] });
    },
  });

  const thinking = useRealtimeStream<string>(triggerRunId ?? "", "thinking", {
    accessToken,
    enabled: triggerReady,
    timeoutInSeconds: 3600,
    refreshAccessToken: triggerReady ? refreshAccessToken : undefined,
  });
  const assistant = useRealtimeStream<string>(triggerRunId ?? "", "assistant", {
    accessToken,
    enabled: triggerReady,
    timeoutInSeconds: 3600,
    refreshAccessToken: triggerReady ? refreshAccessToken : undefined,
  });

  const hardError = Boolean(triggerError) && !isTransientRealtimeError(triggerError) && !triggerRun;
  pollFallbackRef.current = !triggerReady || hardError;

  const meta = (triggerRun?.metadata?.galaxy ?? null) as RunRealtimeMeta | null;

  useEffect(() => {
    if (meta?.waitpoint?.status === "open" && !query.data?.waitpoint) {
      void queryClient.invalidateQueries({ queryKey: ["runs", runId] });
    }
  }, [meta?.waitpoint?.status, query.data?.waitpoint, queryClient, runId]);

  const data = useMemo((): RunResponse | undefined => {
    if (!query.data) return undefined;
    return overlayRun(query.data, {
      thinkingParts: thinking.parts,
      assistantParts: assistant.parts,
      meta,
    });
  }, [assistant.parts, meta, query.data, thinking.parts]);

  return { ...query, data };
}
