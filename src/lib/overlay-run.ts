import type { ContentBlock, GeneratedAsset, RunResponse, RunStatus } from "@/generated/api";

export type RunRealtimeMeta = {
  status?: string;
  pendingTool?: string;
  waitpoint?: { kind: string; status: string; title?: string } | null;
  assets?: { url: string; durableUrl: string | null; kind: "image" | "video" | "audio" }[];
  thinkingOffset?: number;
  assistantOffset?: number;
};

const TERMINAL = new Set<RunStatus>(["complete", "failed", "cancelled"]);

const STATUSES = new Set<RunStatus>([
  "queued",
  "thinking",
  "working",
  "waiting",
  "stopping",
  "complete",
  "failed",
  "cancelled",
]);

function upsertBlock(blocks: ContentBlock[], next: ContentBlock): ContentBlock[] {
  const index = [...blocks].reverse().findIndex((block) => block.type === next.type);
  if (index === -1) return [...blocks, next];
  const copy = [...blocks];
  copy[copy.length - 1 - index] = next;
  return copy;
}

function mergeAssets(existing: GeneratedAsset[], extras?: RunRealtimeMeta["assets"]): GeneratedAsset[] {
  if (!extras?.length) return existing;
  const found = [...existing];
  for (const asset of extras) {
    if (found.some((item) => item.url === asset.url || item.durableUrl === asset.url)) continue;
    found.push({
      id: `live:${asset.url}`,
      kind: asset.kind,
      url: asset.url,
      durableUrl: asset.durableUrl,
      mimeType: null,
      createdAt: new Date(0).toISOString(),
    });
  }
  return found;
}

export function overlayRun(
  base: RunResponse,
  input: {
    thinkingParts?: string[] | null;
    assistantParts?: string[] | null;
    meta?: RunRealtimeMeta | null;
  },
): RunResponse {
  const thinkingOffset = Math.max(0, input.meta?.thinkingOffset ?? 0);
  const assistantOffset = Math.max(0, input.meta?.assistantOffset ?? 0);
  const thinkingText = (input.thinkingParts?.join("") ?? "").slice(thinkingOffset);
  const assistantText = (input.assistantParts?.join("") ?? "").slice(assistantOffset);
  let blocks = base.assistant?.blocks ?? [];
  const persistedThinking =
    blocks.find((block): block is Extract<ContentBlock, { type: "thinking" }> => block.type === "thinking")
      ?.text ?? "";
  const persistedText =
    blocks.find((block): block is Extract<ContentBlock, { type: "text" }> => block.type === "text")?.text ??
    "";
  if (thinkingText.length >= persistedThinking.length && thinkingText) {
    blocks = upsertBlock(blocks, { type: "thinking", text: thinkingText });
  }
  if (assistantText.length >= persistedText.length && assistantText) {
    blocks = upsertBlock(blocks, { type: "text", text: assistantText });
  }

  const metaStatus =
    input.meta?.status && STATUSES.has(input.meta.status as RunStatus)
      ? (input.meta.status as RunStatus)
      : undefined;
  const status = TERMINAL.has(base.status) ? base.status : (metaStatus ?? base.status);

  const assistant = base.assistant
    ? { ...base.assistant, blocks }
    : thinkingText || assistantText
      ? {
          id: base.assistantMessageId ?? `live:${base.id}`,
          chatId: base.chatId,
          runId: base.id,
          role: "assistant" as const,
          status: "success" as const,
          blocks,
          createdAt: base.createdAt,
        }
      : null;

  return {
    ...base,
    status,
    pendingTool: input.meta?.pendingTool ?? base.pendingTool,
    generatedAssets: mergeAssets(base.generatedAssets, input.meta?.assets),
    assistant,
  };
}
