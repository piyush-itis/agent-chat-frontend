"use client";

import { Fragment, useRef, useState, type RefObject } from "react";
import { ChevronRightIcon } from "lucide-react";
import type { Attachment, ContentBlock, GeneratedAsset, Message, RunResponse } from "@/generated/api";
import { threadFollowKey, useThreadAutoScroll } from "@/hooks/use-thread-auto-scroll";
import { isNarratedCropTargetList } from "@/lib/crop-target";
import { formatMagicaCredits } from "@/lib/format-magica-credits";
import { mediaFromBlocks, resolveMediaSrc } from "@/lib/generated-media";
import { OPTIMISTIC_PREFIX, clientKeyOf } from "@/lib/optimistic-message";
import { cn } from "@/lib/utils";
import { RichText, stripMarkdownMedia } from "./rich-text";
import { pendingToolLabel, RunActivity } from "./run-activity";
import { TurnFooter } from "./turn-footer";
import { WorkTimeline, type InspectorTarget } from "./work-timeline";

export function MessageList({
  messages,
  liveRun,
  pendingThinking,
  stopping,
  scrollRootRef,
  sendEpoch = 0,
  forceScroll = false,
  enterClientKey,
  onInspect,
}: {
  messages: Message[];
  liveRun?: RunResponse;
  pendingThinking?: boolean;
  stopping?: boolean;
  scrollRootRef?: RefObject<HTMLElement | null>;
  sendEpoch?: number;
  forceScroll?: boolean;
  enterClientKey?: string;
  onInspect?: (target: InspectorTarget) => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const displayRun =
    stopping && liveRun && isBusyStatus(liveRun.status) ? { ...liveRun, status: "stopping" as const } : liveRun;
  const merged = mergeMessages(messages, displayRun);
  const newestUser = [...merged].reverse().find((message) => message.role === "user");
  const newestUserKey = newestUser ? clientKeyOf(newestUser) : undefined;
  const activity = liveActivity(displayRun, pendingThinking, stopping);

  const latestAssistant = [...merged].reverse().find((message) => message.role === "assistant");

  useThreadAutoScroll({
    rootRef: scrollRootRef ?? sentinelRef,
    sentinelRef,
    pinToken: sendEpoch,
    force: forceScroll,
    layoutKey: merged.length === 0 ? "empty" : "thread",
    followKey: threadFollowKey({
      newestUserKey,
      pendingThinking,
      activityStatus: activity?.status,
      runId: displayRun?.id,
      runStatus: displayRun?.status,
      pendingTool: activity?.pendingTool ?? displayRun?.pendingTool,
      assistant: displayRun?.assistant ?? latestAssistant,
      assetIds: displayRun?.generatedAssets.map((asset) => asset.id),
      waitpoint: displayRun?.waitpoint ? `${displayRun.waitpoint.kind}:${displayRun.waitpoint.status}` : undefined,
    }),
  });

  if (merged.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight">Continue this task</h2>
        <p className="text-sm text-muted-foreground">Assign the next step or attach media.</p>
        <div ref={sentinelRef} data-thread-end />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[720px] flex-1 flex-col gap-6 px-6 py-8">
      {merged.map((message) => {
        if (message.role === "user") {
          const key = clientKeyOf(message);
          const newest = key === newestUserKey;
          return (
            <Fragment key={key}>
              <UserBubble
                message={message}
                enterOnce={newest && (message.id.startsWith(OPTIMISTIC_PREFIX) || key === enterClientKey)}
              />
              {newest && activity ? (
                <RunActivity
                  key="live-activity"
                  status={activity.status}
                  pendingTool={activity.pendingTool}
                  startedAt={activity.startedAt}
                  thinking={activity.thinking}
                />
              ) : null}
            </Fragment>
          );
        }
        if (message.role !== "assistant") return null;
        return (
          <AssistantTurn key={message.id} message={message} liveRun={displayRun} onInspect={onInspect} />
        );
      })}
      <div ref={sentinelRef} data-thread-end />
    </div>
  );
}

function UserBubble({ message, enterOnce }: { message: Message; enterOnce?: boolean }) {
  const text = messageText(message.blocks);
  const media = message.attachments ?? [];
  const [animated] = useState(Boolean(enterOnce));
  if (!text && media.length === 0) return null;
  return (
    <article
      className={cn(
        "flex justify-end",
        animated && "animate-in fade-in slide-in-from-bottom-3 duration-[260ms]",
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
  const heroUrls = new Set(assets.flatMap((asset) => [asset.url, asset.durableUrl ?? ""]).filter(Boolean));
  const hasTools = rest.some((block) => block.type === "tool_use" || block.type === "tool_result");
  const asking = liveRun?.waitpoint?.kind === "questions" && liveRun.waitpoint.status === "open";
  const captionBlocks = rest.filter(
    (block) =>
      block.type === "text" &&
      stripMarkdownMedia(block.text, heroUrls).trim() &&
      !isNarratedCropTargetList(block.text),
  );
  const creditUsed = turnCreditUsed(rest);
  const showMagicaFooter = !live && !asking && (assets.length > 0 || typeof creditUsed === "number");
  const pendingTool = pendingToolLabel(rest) ?? liveRun?.pendingTool;
  const toolWork = Boolean(pendingTool) || hasTools;
  const displayStatus =
    liveRun?.status === "working" && !toolWork ? "thinking" : liveRun?.status;
  const streamingReply = Boolean(
    live &&
      liveRun &&
      !asking &&
      isBusyStatus(displayStatus ?? "") &&
      !pendingTool &&
      rest.some((block) => block.type === "text" && block.text.trim() && !isNarratedCropTargetList(block.text)),
  );
  const hideForToolConfirmation = streamingReply && toolWork;
  const stopping = displayStatus === "stopping";
  const liveActivityHere =
    live &&
    !asking &&
    Boolean(liveRun) &&
    isBusyStatus(displayStatus ?? "") &&
    (!hideForToolConfirmation || stopping);
  const showThinking = !liveActivityHere && !stopping && Boolean(thinking);

  return (
    <article className="flex w-full flex-col items-start gap-4">
      {showThinking ? <ThinkingRow text={thinking} /> : null}
      <div
        className={cn(
          "flex w-full flex-col items-start gap-4 transition-[opacity,filter] duration-300",
          stopping && "pointer-events-none opacity-45",
        )}
      >
        {hasTools || asking ? (
          <WorkTimeline
            blocks={rest}
            waitpoint={liveRun?.waitpoint}
            assets={assets}
            live={(live || asking) && !stopping}
            onInspect={onInspect}
          />
        ) : null}
        {captionBlocks.length > 0 && !asking
          ? renderBlocks(
              captionBlocks,
              assets,
              live && isBusyStatus(displayStatus ?? "") && !stopping,
              heroUrls,
            )
          : null}
        {!asking ? <HeroMedia assets={assets} /> : null}
        {showMagicaFooter ? (
          <TurnFooter
            creditUsed={creditUsed}
            copyValue={heroCopyValue(assets) || captionText(captionBlocks)}
            createdAt={message.createdAt}
          />
        ) : (
          rest
            .filter((block) => block.type === "usage")
            .map((block, index) => <BlockView key={`usage-${index}`} block={block} />)
        )}
      </div>
      {message.status === "failed" &&
      !rest.some((block) => block.type === "text" && block.text.trim()) ? (
        <p className="text-sm text-destructive">
          {liveRun?.errorSafeMessage ?? "This turn failed. Send a new message to continue."}
        </p>
      ) : null}
      {message.status === "cancelled" ||
      (liveRun?.status === "cancelled" &&
        (liveRun.assistant?.id === message.id || liveRun.assistantMessageId === message.id)) ? (
        <p className="animate-in fade-in text-[14px] text-muted-foreground duration-200">Stopped</p>
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

function renderBlocks(
  blocks: ContentBlock[],
  assets?: GeneratedAsset[],
  streaming?: boolean,
  heroUrls?: Set<string>,
) {
  const visible = blocks.filter((block) => block.type !== "tool_use" && block.type !== "tool_result");
  const lastText = [...visible].reverse().findIndex((block) => block.type === "text");
  const lastTextIndex = lastText === -1 ? -1 : visible.length - 1 - lastText;
  return visible.map((block, index) => (
    <BlockView
      key={`${block.type}-${index}`}
      block={block}
      assets={assets}
      streaming={Boolean(streaming && block.type === "text" && index === lastTextIndex)}
      heroUrls={heroUrls}
    />
  ));
}

function HeroMedia({ assets }: { assets: GeneratedAsset[] }) {
  if (assets.length === 0) return null;
  return (
    <div className="flex w-full flex-col gap-3">
      {assets.map((asset) => {
        const src = asset.durableUrl ?? asset.url;
        return asset.kind === "video" ? (
          <video
            key={asset.id}
            src={src}
            controls
            className="h-auto max-h-[min(60vh,420px)] w-full max-w-[400px] rounded-[24px] bg-muted object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={asset.id}
            src={src}
            alt="Generated image"
            className="h-auto max-h-[min(60vh,420px)] w-full max-w-[400px] rounded-[24px] bg-muted object-contain"
          />
        );
      })}
    </div>
  );
}

function BlockView({
  block,
  assets,
  streaming,
  heroUrls,
}: {
  block: ContentBlock;
  assets?: GeneratedAsset[];
  streaming?: boolean;
  heroUrls?: Set<string>;
}) {
  if (block.type === "text") {
    const text = stripMarkdownMedia(block.text, heroUrls);
    if (!text) return null;
    return (
      <div>
        <RichText text={text} resolveSrc={(url) => resolveMediaSrc(url, assets)} />
        {streaming ? (
          <span
            className="mt-1 inline-block h-[1.05em] w-[2px] bg-foreground align-text-bottom [animation:stream-caret_1s_steps(1)_infinite]"
            aria-hidden
          />
        ) : null}
      </div>
    );
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

function captionText(blocks: ContentBlock[]) {
  return blocks
    .filter((block): block is Extract<ContentBlock, { type: "text" }> => block.type === "text")
    .map((block) => stripMarkdownMedia(block.text))
    .join("\n")
    .trim();
}

function heroCopyValue(assets: GeneratedAsset[]) {
  const first = assets[0];
  return first ? (first.durableUrl ?? first.url) : "";
}

function turnCreditUsed(blocks: ContentBlock[]) {
  const usage = blocks.find((block): block is Extract<ContentBlock, { type: "usage" }> => block.type === "usage");
  if (typeof usage?.magicaCreditUsed === "number" && usage.magicaCreditUsed > 0) {
    return usage.magicaCreditUsed;
  }
  let fromTools = 0;
  for (const block of blocks) {
    if (block.type !== "tool_result") continue;
    const output = block.output && typeof block.output === "object" ? (block.output as Record<string, unknown>) : {};
    if (typeof output.creditUsed === "number" && output.creditUsed > 0) {
      fromTools += output.creditUsed;
    }
  }
  return fromTools > 0 ? fromTools : undefined;
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

function liveActivity(displayRun?: RunResponse, pendingThinking?: boolean, stopping?: boolean) {
  if (pendingThinking && !displayRun) {
    return { status: stopping ? "stopping" : "thinking" };
  }
  if (!displayRun) return null;
  const asking = displayRun.waitpoint?.kind === "questions" && displayRun.waitpoint.status === "open";
  if (asking) return null;
  const message = displayRun.assistant;
  const thinking = message ? thinkingText(message.blocks) : undefined;
  const rest = message?.blocks.filter((block) => block.type !== "thinking") ?? [];
  const pendingTool = pendingToolLabel(rest) ?? displayRun.pendingTool;
  const toolWork =
    Boolean(pendingTool) || rest.some((block) => block.type === "tool_use" || block.type === "tool_result");
  const displayStatus =
    displayRun.status === "working" && !toolWork ? "thinking" : displayRun.status;
  if (!isBusyStatus(displayStatus ?? "")) return null;
  const streamingReply = Boolean(
    !pendingTool &&
      rest.some(
        (block) =>
          block.type === "text" && block.text.trim() && !isNarratedCropTargetList(block.text),
      ),
  );
  const hideForToolConfirmation = streamingReply && toolWork;
  if (hideForToolConfirmation && displayStatus !== "stopping") return null;
  return {
    status: displayStatus,
    pendingTool: displayStatus === "stopping" ? undefined : pendingTool,
    startedAt: displayRun.createdAt,
    thinking: displayStatus === "stopping" ? undefined : thinking,
  };
}

export function mergeMessages(messages: Message[], liveRun?: RunResponse): Message[] {
  const byId = new Map(messages.map((message) => [message.id, message]));
  if (liveRun?.assistant) {
    byId.set(liveRun.assistant.id, liveRun.assistant);
  }
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
