import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { ContentBlock, Message } from "@/generated/api";

const NEAR_BOTTOM_PX = 120;

export function threadFollowKey({
  newestUserKey,
  pendingThinking,
  activityStatus,
  runId,
  runStatus,
  pendingTool,
  assistant,
  assetIds,
  waitpoint,
}: {
  newestUserKey?: string;
  pendingThinking?: boolean;
  activityStatus?: string;
  runId?: string;
  runStatus?: string;
  pendingTool?: string;
  assistant?: Message;
  assetIds?: string[];
  waitpoint?: string;
}) {
  return [
    newestUserKey ?? "",
    pendingThinking ? "1" : "0",
    activityStatus ?? "",
    runId ?? "",
    runStatus ?? "",
    pendingTool ?? "",
    waitpoint ?? "",
    blockSignature(assistant?.blocks ?? []),
    (assetIds ?? []).join(","),
  ].join("::");
}

function blockSignature(blocks: ContentBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === "text" || block.type === "thinking" || block.type === "reasoning") {
        return `${block.type}:${block.text.length}:${block.text.slice(-24)}`;
      }
      if (block.type === "tool_use") return `use:${block.invocationId}:${block.toolName}`;
      if (block.type === "tool_result") return `res:${block.invocationId}:${block.status}`;
      if (block.type === "usage") return `usage:${block.completionTokens ?? 0}`;
      return block.type;
    })
    .join("|");
}

export function useThreadAutoScroll({
  rootRef,
  sentinelRef,
  pinToken,
  force,
  followKey,
  layoutKey = "thread",
}: {
  rootRef: RefObject<HTMLElement | null>;
  sentinelRef: RefObject<HTMLElement | null>;
  pinToken: number;
  force: boolean;
  followKey: string;
  layoutKey?: string;
}) {
  const pinned = useRef(true);
  const lastPin = useRef(pinToken);
  const lastFollow = useRef(followKey);
  const programmaticUntil = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onScroll = () => {
      if (performance.now() < programmaticUntil.current) return;
      pinned.current = distanceFromBottom(root) <= NEAR_BOTTOM_PX;
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [layoutKey, rootRef]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const pinChanged = pinToken !== lastPin.current;
    lastPin.current = pinToken;
    const followChanged = followKey !== lastFollow.current;
    lastFollow.current = followKey;

    if (force || pinChanged) pinned.current = true;
    const shouldForce = force || pinChanged;
    if (!shouldForce && !followChanged) return;
    if (!shouldForce && !pinned.current) return;

    scrollToEnd(root, sentinel, programmaticUntil, shouldForce ? "smooth" : "auto");
  }, [followKey, force, pinToken, rootRef, sentinelRef]);

  useEffect(() => {
    const root = rootRef.current;
    const sentinel = sentinelRef.current;
    const content = sentinel?.parentElement;
    if (!root || !content || typeof ResizeObserver === "undefined") return;
    let skip = true;
    const observer = new ResizeObserver(() => {
      if (skip) {
        skip = false;
        return;
      }
      if (!pinned.current) return;
      scrollToEnd(root, sentinel, programmaticUntil, "auto");
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [layoutKey, rootRef, sentinelRef]);
}

function distanceFromBottom(root: HTMLElement) {
  return root.scrollHeight - root.scrollTop - root.clientHeight;
}

function scrollToEnd(
  root: HTMLElement,
  sentinel: HTMLElement,
  programmaticUntil: { current: number },
  behavior: ScrollBehavior,
) {
  programmaticUntil.current = performance.now() + (behavior === "smooth" ? 450 : 80);
  if (behavior === "smooth") {
    sentinel.scrollIntoView?.({ block: "end", behavior: "smooth" });
    return;
  }
  root.scrollTop = root.scrollHeight;
}
