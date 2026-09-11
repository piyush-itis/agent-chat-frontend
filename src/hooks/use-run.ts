import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RunResponse } from "@/generated/api";
import { getAccessToken } from "@/lib/api/client";
import { getRun } from "@/lib/api/runs";

const ACTIVE = new Set(["queued", "thinking", "working", "waiting", "stopping"]);
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useRun(runId: string | null | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["runs", runId],
    queryFn: () => getRun(runId!),
    enabled: Boolean(runId),
    refetchInterval: (current) => {
      const status = current.state.data?.status;
      return status && ACTIVE.has(status) ? 2500 : false;
    },
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!runId) return;
    const status = query.data?.status;
    if (!status || !ACTIVE.has(status)) return;

    const controller = new AbortController();
    let closed = false;

    void (async () => {
      try {
        const bearer = await getAccessToken();
        const response = await fetch(`${API_URL}/api/runs/${runId}/events`, {
          headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
          signal: controller.signal,
        });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const line = chunk.split("\n").find((item) => item.startsWith("data: "));
            if (!line) continue;
            const payload = JSON.parse(line.slice(6)) as RunResponse;
            queryClient.setQueryData(["runs", runId], payload);
          }
        }
      } catch {
        /* poll fallback stays enabled */
      }
    })();

    return () => {
      closed = true;
      controller.abort();
    };
  }, [runId, query.data?.status, queryClient]);

  return query;
}
