"use client";

import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import type { Attachment, ContentBlock, GeneratedAsset, Message, RunResponse } from "@/generated/api";
import { isNarratedCropTargetList } from "@/lib/crop-target";
import { formatMagicaCredits } from "@/lib/format-magica-credits";
import { mediaFromBlocks, resolveMediaSrc } from "@/lib/generated-media";
import { OPTIMISTIC_PREFIX } from "@/lib/optimistic-message";
import { cn } from "@/lib/utils";
import { extractMarkdownImages, RichText } from "./rich-text";
import { pendingToolLabel, RunActivity } from "./run-activity";
import { WorkTimeline, type InspectorTarget } from "./work-timeline";

export function MessageList({
  messages,
  liveRun,
  pendingThinking,
  onInspect,
}: {
  messages: Message[];
  liveRun?: RunResponse;
  pendingThinking?: boolean;
  onInspect?: (target: InspectorTarget) => void;
}) {
  const merged = mergeMessages(messages, liveRun);
  const newestUserId = [...merged].reverse().find((message) => message.role === "user")?.id;
  const askingQuestions =
    liveRun?.waitpoint?.kind === "questions" && liveRun.waitpoint.status === "open";

  if (merged.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight">Continue this task</h2>
        <p className="text-sm text-muted-foreground">Assign the next step or attach media.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[720px] flex-1 flex-col gap-6 px-6 py-8">
      {merged.map((message) => {
        if (message.role === "user") {
          return <UserBubble key={message.id} message={message} newest={message.id === newestUserId} />;
        }
        if (message.role !== "assistant") return null;
        return (
          <AssistantTurn key={message.id} message={message} liveRun={liveRun} onInspect={onInspect} />
        );
      })}
      {(pendingThinking ||
        (liveRun &&
          isBusyStatus(liveRun.status) &&
          !askingQuestions &&
          !merged.some((message) => message.role === "assistant"))) ? (
        <RunActivity status={liveRun?.status ?? "thinking"} startedAt={liveRun?.createdAt} />
      ) : null}
    </div>
  );
}

function UserBubble({ message, newest }: { message: Message; newest?: boolean }) {
  const text = messageText(message.blocks);
  const media = message.attachments ?? [];
  if (!text && media.length === 0) return null;
  const animated = newest || message.id.startsWith(OPTIMISTIC_PREFIX);
  return (
    <article
      className={cn(
        "flex justify-end",
        animated && "animate-in fade-in slide-in-from-bottom-2 duration-200",
      )}
    >
      {media.length > 0 ? (
        <div className="flex max-w-[min(100%,22rem)] flex-col items-end">
          <div className="overflow-hidden rounded-[28px] bg-card">
            {media.map((item) => (
              <UserMedia key={item.id} item={item} />
            ))}
            {text ? (
              <p className="px-4 pb-3 pt-2 text-[14px] leading-5 text-foreground">{text}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="max-w-[min(100%,34rem)] rounded-full bg-muted px-4 py-[7px] text-[15px] leading-6 text-foreground">
          {text}
        </p>
      )}
    </article>
  );
}

function UserMedia({ item }: { item: Attachment }) {
  const src = item.durableUrl ?? item.resultUrl;
  if (!src) return null;
  if (item.mimeType.startsWith("video/")) {
    return <video src={src} controls className="w-full bg-muted" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={item.originalName} className="w-full bg-muted object-cover" />
  );
}

function AssistantTurn({
  message,
  liveRun,
  onInspect,
}: {
  message: Message;
  liveRun?: RunResponse;
  onInspect?: (target: InspectorTarget) => void;
}) {
  const thinking = thinkingText(message.blocks);
  const live = Boolean(
    liveRun && isActive(liveRun.status) && (liveRun.assistant?.id === message.id || !liveRun.assistant),
  );
  const rest = message.blocks.filter((block) => block.type !== "thinking");
  const assets = mediaFromBlocks(rest, generatedAssetsForMessage(message, liveRun));
  const hasTools = rest.some((block) => block.type === "tool_use" || block.type === "tool_result");
  const hasText = rest.some((block) => block.type === "text" || block.type === "usage");
  const asking = liveRun?.waitpoint?.kind === "questions" && liveRun.waitpoint.status === "open";
  const pendingTool = pendingToolLabel(rest) ?? liveRun?.pendingTool;
  const streamingReply = Boolean(
    live &&
      liveRun &&
      !asking &&
      isBusyStatus(liveRun.status) &&
      !pendingTool &&
      rest.some((block) => block.type === "text" && block.text.trim() && !isNarratedCropTargetList(block.text)),
  );
  const showActivity = live && !asking && liveRun && isBusyStatus(liveRun.status) && !streamingReply;
  const showThinking = !showActivity && Boolean(thinking);

  return (
    <article className="flex w-full flex-col items-start gap-4">
      {showActivity ? (
        <RunActivity
          status={liveRun.status}
          pendingTool={pendingToolLabel(rest) ?? liveRun.pendingTool}
          startedAt={liveRun.createdAt}
          thinking={thinking}
        />
      ) : null}
      {showThinking ? <ThinkingRow text={thinking} /> : null}
      {hasTools || asking ? (
        <WorkTimeline
          blocks={rest}
          waitpoint={liveRun?.waitpoint}
          assets={assets}
          live={live || asking}
          onInspect={onInspect}
        />
      ) : null}
      {!asking ? <ExtraGeneratedMedia blocks={rest} assets={assets} /> : null}
      {hasText && !asking ? renderBlocks(rest.filter((block) => block.type !== "text" || !isNarratedCropTargetList(block.text)), assets) : null}
      {message.status === "failed" && liveRun?.errorSafeMessage ? (
        <p className="text-sm text-destructive">{liveRun.errorSafeMessage}</p>
      ) : null}
    </article>
  );
}

export function ThinkingRow({ text }: { text?: string }) {
  const [open, setOpen] = useState(false);
  const canExpand = Boolean(text?.trim());

  return (
    <div>
      <button
        type="button"
        aria-expanded={canExpand ? open : undefined}
        aria-label="Thinking"
        disabled={!canExpand}
        className="flex items-center gap-1.5 text-[14px] leading-5 text-muted-foreground disabled:opacity-100"
        onClick={() => {
          if (canExpand) setOpen((value) => !value);
        }}
      >
        <ChevronRightIcon
          aria-hidden
          className={cn("size-3.5 shrink-0 transition-transform duration-150", open && "rotate-90")}
          strokeWidth={2}
        />
        Thinking
      </button>
      {open && text ? (
        <p className="mt-2 pl-5 whitespace-pre-wrap text-[14px] leading-6 text-muted-foreground">{text}</p>
      ) : null}
    </div>
  );
}

function renderBlocks(blocks: ContentBlock[], assets?: GeneratedAsset[]) {
  return blocks
    .filter((block) => block.type !== "tool_use" && block.type !== "tool_result")
    .map((block, index) => <BlockView key={`${block.type}-${index}`} block={block} assets={assets} />);
}

function ExtraGeneratedMedia({
  blocks,
  assets,
}: {
  blocks: ContentBlock[];
  assets: GeneratedAsset[];
}) {
  const shown = new Set(
    blocks.flatMap((block) => (block.type === "text" ? extractMarkdownImages(block.text) : [])),
  );
  const extras = assets.filter((asset) => !shown.has(asset.url) && !shown.has(asset.durableUrl ?? ""));
  if (extras.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {extras.map((asset) => {
        const src = asset.durableUrl ?? asset.url;
        return asset.kind === "video" ? (
          <video key={asset.id} src={src} controls className="w-full max-w-[520px] rounded-2xl" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={asset.id} src={src} alt="Generated image" className="w-full max-w-[520px] rounded-2xl bg-muted" />
        );
      })}
    </div>
  );
}

function BlockView({ block, assets }: { block: ContentBlock; assets?: GeneratedAsset[] }) {
  if (block.type === "text") {
    return <RichText text={block.text} resolveSrc={(url) => resolveMediaSrc(url, assets)} />;
  }
  if (block.type === "usage") {
    const magica =
      typeof block.magicaCreditUsed === "number" && block.magicaCreditUsed > 0
        ? formatMagicaCredits(block.magicaCreditUsed)
        : null;
    return (
      <p className="text-[11px] text-muted-foreground">
        {block.modelRouted ?? "openrouter/free"}
        {magica ? ` · ${magica}` : ""}
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

function messageText(blocks: ContentBlock[]) {
  return blocks
    .filter((block): block is Extract<ContentBlock, { type: "text" }> => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function thinkingText(blocks: ContentBlock[]) {
  return blocks.find((block): block is Extract<ContentBlock, { type: "thinking" }> => block.type === "thinking")
    ?.text;
}

function generatedAssetsForMessage(message: Message, liveRun?: RunResponse) {
  if (!liveRun?.generatedAssets.length) return undefined;
  if (message.runId === liveRun.id) return liveRun.generatedAssets;
  if (liveRun.assistant?.id === message.id || liveRun.assistantMessageId === message.id) {
    return liveRun.generatedAssets;
  }
  return undefined;
}

function isActive(status: string) {
  return ["queued", "thinking", "working", "waiting", "stopping"].includes(status);
}

function isBusyStatus(status: string) {
  return ["queued", "thinking", "working", "stopping"].includes(status);
}

export function mergeMessages(messages: Message[], liveRun?: RunResponse): Message[] {
  const byId = new Map(messages.map((message) => [message.id, message]));
  if (liveRun?.assistant) {
    byId.set(liveRun.assistant.id, liveRun.assistant);
  }
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
