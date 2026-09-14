"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentBlock } from "@/generated/api";
import { cn } from "@/lib/utils";

const TOOL_LABELS: Record<string, string> = {
  gpt_image_2: "AI Generation",
  crop_image: "Crop Image",
  merge_videos: "Merge Videos",
  ask_questions: "Asking questions",
  load_skill: "Skill",
  read_skill_asset: "Skill",
  model_schema: "Model schema",
  get_pricing: "Get Pricing",
};

export function isLiveThinkingText(text?: string) {
  const value = text?.trim() ?? "";
  if (value.length < 12) return false;
  if (/^(user|response|assistant)\s*safety\b/i.test(value)) return false;
  if (/^(user|assistant|system)$/i.test(value)) return false;
  return true;
}

export function activityLabel(status?: string, pendingTool?: string): string {
  if (status === "stopping") return "Stopping";
  if (pendingTool) return `Working · ${pendingTool}`;
  if (status === "working") return "Working";
  return "Thinking";
}

export function pendingToolLabel(blocks: ContentBlock[]): string | undefined {
  const done = new Set(
    blocks
      .filter((block): block is Extract<ContentBlock, { type: "tool_result" }> => block.type === "tool_result")
      .map((block) => block.invocationId),
  );
  const pending = [...blocks]
    .reverse()
    .find((block) => block.type === "tool_use" && !done.has(block.invocationId));
  if (!pending || pending.type !== "tool_use") return undefined;
  return TOOL_LABELS[pending.toolName] ?? pending.toolName;
}

export function formatElapsed(startedAt: string | number): string {
  const start = typeof startedAt === "number" ? startedAt : new Date(startedAt).getTime();
  const total = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ActivityDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      <span className="run-activity-dot size-1 rounded-full bg-muted-foreground" />
      <span className="run-activity-dot size-1 rounded-full bg-muted-foreground" />
      <span className="run-activity-dot size-1 rounded-full bg-muted-foreground" />
    </span>
  );
}

function StoppingDots() {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      <span className="run-stopping-dot size-1 rounded-full bg-[#ff3b30]" />
      <span className="run-stopping-dot size-1 rounded-full bg-[#ff3b30]" />
      <span className="run-stopping-dot size-1 rounded-full bg-[#ff3b30]" />
    </span>
  );
}

export function RunActivity({
  status,
  pendingTool,
  startedAt,
  thinking,
}: {
  status?: string;
  pendingTool?: string;
  startedAt?: string | number;
  thinking?: string;
}) {
  const stopping = status === "stopping";
  const label = activityLabel(status, pendingTool);
  const fallbackStart = useRef(Date.now());
  const origin = startedAt ?? fallbackStart.current;
  const [elapsed, setElapsed] = useState(() => formatElapsed(origin));
  const [open, setOpen] = useState(false);
  const visibleThinking = isLiveThinkingText(thinking);
  const sawThinking = useRef(false);
  const thinkingRef = useRef<HTMLParagraphElement>(null);
  const canExpand = visibleThinking && !stopping;

  useEffect(() => {
    if (visibleThinking && !sawThinking.current && !stopping) setOpen(true);
    sawThinking.current = visibleThinking;
  }, [stopping, visibleThinking]);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed(formatElapsed(origin)), 1000);
    return () => window.clearInterval(id);
  }, [origin]);

  useEffect(() => {
    if (!open || !thinkingRef.current) return;
    thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
  }, [open, thinking]);

  return (
    <div aria-live="polite" className="flex flex-col items-start gap-1">
      <button
        type="button"
        aria-label={label}
        aria-busy={stopping}
        aria-expanded={canExpand ? open : undefined}
        disabled={!canExpand}
        className={cn(
          "flex items-center gap-2 text-[14px] leading-5 disabled:opacity-100",
          stopping ? "text-[#ff3b30]" : "text-muted-foreground",
        )}
        onClick={() => {
          if (canExpand) setOpen((value) => !value);
        }}
      >
        {stopping ? <StoppingDots /> : <ActivityDots />}
        <span>{stopping ? "Stopping…" : label}</span>
        <span className={cn("tabular-nums text-[12px]", stopping && "opacity-70")}>{elapsed}</span>
      </button>
      {open && thinking ? (
        <p
          ref={thinkingRef}
          className="max-h-40 overflow-y-auto pl-7 whitespace-pre-wrap text-[14px] leading-6 text-muted-foreground"
        >
          {thinking}
        </p>
      ) : null}
    </div>
  );
}
