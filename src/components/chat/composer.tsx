"use client";

import { useRef, useState } from "react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";
import { AttachButton } from "./attach-button";
import type { Attachment } from "@/generated/api";

export function Composer({
  chatId,
  disabled,
  sending,
  active,
  stopping,
  onSend,
  onStop,
}: {
  chatId?: string;
  disabled?: boolean;
  sending?: boolean;
  active?: boolean;
  stopping?: boolean;
  onSend: (text: string, attachmentIds: string[], planMode: boolean) => Promise<void>;
  onStop?: () => Promise<void>;
}) {
  const draft = useUiStore((state) => state.composerDraft);
  const setDraft = useUiStore((state) => state.setComposerDraft);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [planMode, setPlanMode] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    const text = draft.trim();
    if (!text || disabled || sending || active) return;
    setDraft("");
    const ids = attachments.map((item) => item.id);
    try {
      await onSend(text, ids, planMode);
      setAttachments([]);
    } catch (error) {
      setDraft(text);
      if (error instanceof ApiClientError) {
        window.alert(error.body.message);
      }
    }
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2">
          <AttachButton chatId={chatId} attachments={attachments} onChange={setAttachments} />
          <textarea
            ref={areaRef}
            aria-label="Message"
            rows={1}
            disabled={disabled || sending || Boolean(active)}
            placeholder="Message Galaxy…"
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2 text-sm outline-none"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
          />
          <button
            type="button"
            aria-label={active ? "Stop" : "Send"}
            disabled={active ? stopping || !onStop : !draft.trim() || disabled || sending}
            className={cn(
              "mb-1 flex size-8 items-center justify-center rounded-full",
              active ? "bg-foreground text-background" : "bg-primary text-primary-foreground",
              "disabled:opacity-40",
            )}
            onClick={() => {
              if (active) {
                void onStop?.();
                return;
              }
              void submit();
            }}
          >
            {active ? <SquareIcon className="size-3.5" /> : <ArrowUpIcon className="size-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <p>
            OpenRouter Free · no paid fallback
            {sending ? " · sending" : stopping ? " · stopping" : active ? " · run in progress" : ""}
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={planMode}
              onChange={(event) => setPlanMode(event.target.checked)}
            />
            Plan mode
          </label>
        </div>
      </div>
    </div>
  );
}
