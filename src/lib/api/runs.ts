import type { RunResponse } from "@/generated/api";
import { apiFetch } from "./client";

export function refreshRealtimeToken(runId: string) {
  return apiFetch<{ token: string }>(`/api/runs/${runId}/realtime-token`);
}

export function getRun(runId: string) {
  return apiFetch<RunResponse>(`/api/runs/${runId}`);
}

export function stopRun(runId: string) {
  return apiFetch<RunResponse>(`/api/runs/${runId}/stop`, { method: "POST" });
}

export function resumeWaitpoint(
  runId: string,
  token: string,
  body: {
    resumeKey: string;
    decision: "approved" | "rejected";
    choiceId?: string;
    answers?: Record<string, string>;
  },
) {
  return apiFetch<RunResponse>(`/api/runs/${runId}/waitpoints/${token}/resume`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
