"use client";

import { useState } from "react";
import { ArrowUpIcon, MicIcon, SquareIcon } from "lucide-react";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api/client";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttachButton, AttachmentPreviewRow, isPendingAttachment } from "./attach-button";
import type { Attachment } from "@/generated/api";

export function Composer({
  chatId,
  disabled,
  sending,
  active,
  stopping,
  variant = "dock",
  onSend,
  onStop,
}: {
  chatId?: string;
  disabled?: boolean;
  sending?: boolean;
  active?: boolean;
  stopping?: boolean;
  variant?: "home" | "dock";
  onSend: (text: string, attachments: Attachment[], planMode: boolean) => Promise<void>;
  onStop?: () => Promise<void>;
}) {
  const draft = useUiStore((state) => state.composerDraft);
  const setDraft = useUiStore((state) => state.setComposerDraft);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [planMode, setPlanMode] = useState(false);
  const [listening, setListening] = useState(false);
  const canSend =
    Boolean(draft.trim()) && !disabled && !sending && !attachments.some(isPendingAttachment);

  async function submit() {
    const text = draft.trim();
    const ready = attachments.filter((item) => !isPendingAttachment(item));
    if (!text || disabled || sending || active || attachments.some(isPendingAttachment)) return;
    setDraft("");
    try {
      await onSend(text, ready, planMode);
      setAttachments([]);
    } catch (error) {
      setDraft(text);
      if (error instanceof ApiClientError) {
        toast.error(error.body.message);
      }
    }
  }

  function startVoice() {
    type SpeechCtor = new () => {
      lang: string;
      interimResults: boolean;
      start: () => void;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
    };
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechCtor;
      webkitSpeechRecognition?: SpeechCtor;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      toast.error("Could not capture voice input");
    };
    recognition.onresult = (event) => {
      const spoken = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (!spoken) return;
      setDraft(draft ? `${draft} ${spoken}` : spoken);
    };
    recognition.start();
  }

  return (
    <div className={cn(variant === "dock" ? "bg-background px-4 pb-6 pt-2" : "w-full")}>
      <div className={cn("mx-auto w-full", variant === "home" ? "max-w-[720px]" : "max-w-[720px]")}>
        <div
          data-composer
          className="rounded-[24px] border border-border bg-card px-5 pb-3 pt-4 shadow-[0_8px_30px_rgba(17,17,17,0.06)]"
        >
          <AttachmentPreviewRow
            attachments={attachments}
            onRemove={(id) => {
              setAttachments((current) => {
                const next = current.filter((item) => item.id !== id);
                const removed = current.find((item) => item.id === id);
                if (removed?.resultUrl?.startsWith("blob:")) {
                  URL.revokeObjectURL(removed.resultUrl);
                }
                return next;
              });
            }}
          />
          <Textarea
            aria-label="Assign a task"
            rows={variant === "home" ? 2 : 1}
            disabled={disabled || sending || Boolean(active)}
            placeholder="Assign a task or ask anything..."
            className="min-h-11 w-full resize-none border-0 bg-transparent px-0 py-0 text-[16px] leading-6 text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 disabled:bg-transparent dark:bg-transparent dark:disabled:bg-transparent md:text-[16px]"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Tab" && event.shiftKey) {
                event.preventDefault();
                setPlanMode((value) => !value);
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
          />
          <div className="mt-1 flex items-center gap-0.5">
            <AttachButton
              chatId={chatId}
              attachments={attachments}
              onChange={setAttachments}
              placement={variant === "dock" ? "top" : "bottom"}
            />
            <Button
              type="button"
              size="sm"
              variant={planMode ? "default" : "ghost"}
              aria-pressed={planMode}
              className="rounded-full border-0 focus-visible:border-0 focus-visible:ring-0"
              onClick={() => setPlanMode((value) => !value)}
            >
              Plan
            </Button>
            <div className="ml-auto flex items-center gap-0.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={listening ? "Stop voice input" : "Voice input"}
                aria-pressed={listening}
                disabled={disabled || sending || Boolean(active)}
                className={cn(
                  "size-6 border-0 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground focus-visible:border-0 focus-visible:ring-0",
                  listening && "text-foreground",
                )}
                onClick={() => startVoice()}
              >
                <MicIcon className="size-4" strokeWidth={1.75} />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={canSend || active ? "default" : "ghost"}
                aria-label={active ? "Stop generation" : "Send"}
                disabled={active ? stopping || !onStop : !canSend}
                className={cn(
                  "border-0 shadow-none focus-visible:border-0 focus-visible:ring-0 disabled:opacity-100",
                  active
                    ? "size-8 rounded-full bg-[#ff3b30] text-white hover:bg-[#e0352b]"
                    : canSend
                      ? "size-8 rounded-full bg-primary text-primary-foreground hover:bg-primary"
                      : "size-6 bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground",
                )}
                onClick={() => {
                  if (active) {
                    void onStop?.();
                    return;
                  }
                  void submit();
                }}
              >
                {active ? (
                  <SquareIcon className="size-2.5 fill-current" strokeWidth={0} />
                ) : (
                  <ArrowUpIcon className="size-4" strokeWidth={2.25} />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
