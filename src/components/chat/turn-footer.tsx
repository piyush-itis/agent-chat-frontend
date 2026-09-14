"use client";

import { useState } from "react";
import { CircleDollarSignIcon, CopyIcon, Share2Icon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { toast } from "sonner";
import { formatMagicaCredits } from "@/lib/format-magica-credits";
import { cn } from "@/lib/utils";

export function TurnFooter({
  creditUsed,
  copyValue,
  createdAt,
}: {
  creditUsed?: number;
  copyValue?: string;
  createdAt: string;
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const credit = typeof creditUsed === "number" && creditUsed > 0 ? formatMagicaCredits(creditUsed) : null;

  async function writeClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  async function copy() {
    if (!copyValue) return;
    await writeClipboard(copyValue);
  }

  async function share() {
    if (!copyValue) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url: copyValue, text: copyValue });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    await writeClipboard(copyValue);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {credit ? (
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <CircleDollarSignIcon className="size-3.5" strokeWidth={1.75} />
          {credit}
        </p>
      ) : null}
      <div className="flex items-center gap-3 text-muted-foreground">
        <button type="button" aria-label="Copy" className="hover:text-foreground" onClick={() => void copy()}>
          <CopyIcon className="size-4" strokeWidth={1.75} />
        </button>
        <button type="button" aria-label="Share" className="hover:text-foreground" onClick={() => void share()}>
          <Share2Icon className="size-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Like"
          aria-pressed={vote === "up"}
          className={cn("hover:text-foreground", vote === "up" && "text-foreground")}
          onClick={() => setVote((value) => (value === "up" ? null : "up"))}
        >
          <ThumbsUpIcon className="size-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Dislike"
          aria-pressed={vote === "down"}
          className={cn("hover:text-foreground", vote === "down" && "text-foreground")}
          onClick={() => setVote((value) => (value === "down" ? null : "down"))}
        >
          <ThumbsDownIcon className="size-4" strokeWidth={1.75} />
        </button>
        <span className="text-[13px]">{formatClock(createdAt)}</span>
      </div>
    </div>
  );
}

function formatClock(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
