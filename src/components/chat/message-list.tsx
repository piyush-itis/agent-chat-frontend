"use client";

import type { ContentBlock, Message, RunResponse } from "@/generated/api";
import { ToolCard } from "./tool-card";

export function MessageList({
  messages,
  liveRun,
}: {
  messages: Message[];
  liveRun?: RunResponse;
}) {
  const merged = mergeMessages(messages, liveRun);

  if (merged.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <h2 className="text-xl font-medium">What can I help with?</h2>
        <p className="text-sm text-muted-foreground">
          Chat, attach media, and let the agent load skills and Magica tools.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      {merged.map((message) => (
        <article key={message.id} className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {message.role}
            {message.status !== "success" ? ` · ${message.status}` : ""}
          </p>
          <div className="rounded-2xl bg-card px-4 py-3">
            {message.role === "assistant" ? (
              <button
                type="button"
                className="mb-2 text-xs text-muted-foreground underline"
                onClick={() => {
                  const text = message.blocks
                    .filter((block): block is Extract<ContentBlock, { type: "text" }> => block.type === "text")
                    .map((block) => block.text)
                    .join("\n");
                  void navigator.clipboard.writeText(text);
                }}
              >
                Copy
              </button>
            ) : null}
            {message.blocks.length === 0 && liveRun && isActive(liveRun.status) ? (
              <p className="text-sm text-muted-foreground">
                {liveRun.status === "thinking" ? "Thinking…" : "Working…"}
              </p>
            ) : (
              renderBlocks(message.blocks)
            )}
            {message.status === "failed" && liveRun?.errorSafeMessage ? (
              <p className="mt-2 text-sm text-destructive">{liveRun.errorSafeMessage}</p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function renderBlocks(blocks: ContentBlock[]) {
  const usedResults = new Set<string>();
  return blocks.map((block, index) => {
    if (block.type === "tool_use") {
      const result = blocks.find(
        (candidate): candidate is Extract<ContentBlock, { type: "tool_result" }> =>
          candidate.type === "tool_result" && candidate.invocationId === block.invocationId,
      );
      if (result) usedResults.add(result.invocationId);
      return <ToolCard key={`${block.invocationId}-use`} use={block} result={result} />;
    }
    if (block.type === "tool_result" && usedResults.has(block.invocationId)) {
      return null;
    }
    return <BlockView key={`${block.type}-${index}`} block={block} />;
  });
}

function BlockView({ block }: { block: ContentBlock }) {
  if (block.type === "thinking") {
    return (
      <details className="mb-2 text-sm text-muted-foreground">
        <summary>Thinking</summary>
        <p className="mt-1 whitespace-pre-wrap">{block.text}</p>
      </details>
    );
  }
  if (block.type === "text") {
    return <p className="whitespace-pre-wrap text-[15px] leading-7">{block.text}</p>;
  }
  if (block.type === "usage") {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        {block.modelRouted ?? "openrouter/free"} · {block.promptTokens}+
        {block.completionTokens} tokens · {block.applicationCredits} credits
      </p>
    );
  }
  if (block.type === "tool_result") {
    return (
      <p className="text-xs text-muted-foreground">
        {block.toolName} {block.status}
      </p>
    );
  }
  return null;
}

function isActive(status: string) {
  return ["queued", "thinking", "working", "waiting", "stopping"].includes(status);
}

function mergeMessages(messages: Message[], liveRun?: RunResponse): Message[] {
  const byId = new Map(messages.map((message) => [message.id, message]));
  if (liveRun?.assistant) {
    byId.set(liveRun.assistant.id, liveRun.assistant);
  }
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
