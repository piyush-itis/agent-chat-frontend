"use client";

import { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PaperclipIcon, XIcon } from "lucide-react";
import type { Waitpoint, WaitpointQuestion } from "@/generated/api";
import { resumeWaitpoint } from "@/lib/api/runs";
import { withCropTargetPreset } from "@/lib/crop-target";
import { canResumeWaitpoint } from "@/lib/pending-questions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function QuestionDock({
  runId,
  waitpoint,
  onDone,
}: {
  runId: string;
  waitpoint: Waitpoint;
  onDone: () => void;
}) {
  const questions = withCropTargetPreset(
    waitpoint.payload.message ?? waitpoint.payload.summary ?? "",
    waitpoint.payload.questions ?? [],
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const current = questions[index];

  useEffect(() => {
    setDraft(current ? (answers[current.id] ?? "") : "");
    setCustomOpen(false);
  }, [current, answers]);

  async function finish(nextAnswers: Record<string, string>) {
    if (!canResumeWaitpoint(waitpoint)) return;
    setBusy(true);
    try {
      await resumeWaitpoint(runId, waitpoint.token, {
        resumeKey: waitpoint.resumeKey,
        decision: "approved",
        answers: Object.fromEntries(questions.map((question) => [question.id, nextAnswers[question.id] ?? ""])),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  async function answer(value: string) {
    if (!current) return;
    const next = { ...answers, [current.id]: value };
    setAnswers(next);
    if (index + 1 >= questions.length) {
      await finish(next);
      return;
    }
    setIndex((currentIndex) => currentIndex + 1);
  }

  async function cancel() {
    if (!canResumeWaitpoint(waitpoint)) return;
    setBusy(true);
    try {
      await resumeWaitpoint(runId, waitpoint.token, {
        resumeKey: waitpoint.resumeKey,
        decision: "rejected",
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  if (!current) return null;

  if (current.choices?.length) {
    return (
      <ChoicePanel
        question={current}
        index={index}
        total={questions.length}
        busy={busy}
        customOpen={customOpen}
        draft={draft}
        onDraft={setDraft}
        onCustomOpen={setCustomOpen}
        onPrev={() => setIndex((value) => Math.max(0, value - 1))}
        onNext={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
        onCancel={() => void cancel()}
        onAnswer={(value) => void answer(value)}
      />
    );
  }

  return (
    <div className="bg-background px-4 pb-4 pt-2">
      <div className="mx-auto w-full max-w-[720px]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-[15px] leading-6 text-foreground">{current.prompt}</p>
          <Pager
            index={index}
            total={questions.length}
            busy={busy}
            onPrev={() => setIndex((value) => Math.max(0, value - 1))}
            onNext={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
            onCancel={() => void cancel()}
          />
        </div>
        <Input
          autoFocus
          disabled={busy}
          placeholder={current.placeholder || "Type an answer"}
          value={draft}
          className="h-11 border-0 bg-transparent px-0 text-[16px] shadow-none focus-visible:ring-0 dark:bg-transparent"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void answer(draft.trim());
            }
            if (event.key === "Escape") {
              event.preventDefault();
              void answer("");
            }
          }}
        />
        <div className="mt-4 flex items-center justify-end">
          <Button type="button" variant="outline" disabled={busy} className="rounded-full" onClick={() => void answer("")}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChoicePanel({
  question,
  index,
  total,
  busy,
  customOpen,
  draft,
  onDraft,
  onCustomOpen,
  onPrev,
  onNext,
  onCancel,
  onAnswer,
}: {
  question: WaitpointQuestion;
  index: number;
  total: number;
  busy: boolean;
  customOpen: boolean;
  draft: string;
  onDraft: (value: string) => void;
  onCustomOpen: (open: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  onCancel: () => void;
  onAnswer: (value: string) => void;
}) {
  return (
    <div className="bg-background px-6 pb-5 pt-2">
      <div className="mx-auto flex w-full max-w-[720px] flex-col">
        <div className="flex items-center justify-between gap-3 py-2">
          <p className="text-[15px] text-foreground">{question.prompt}</p>
          <Pager index={index} total={total} busy={busy} onPrev={onPrev} onNext={onNext} onCancel={onCancel} />
        </div>
        <ol className="mt-2">
          {question.choices?.map((choice, choiceIndex) => (
            <li key={choice.id}>
              <button
                type="button"
                disabled={busy}
                className="group flex w-full items-center gap-4 py-3.5 text-left"
                onClick={() => onAnswer(choice.label)}
              >
                <span className="w-4 shrink-0 text-[13px] text-muted-foreground">{choiceIndex + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-5 text-foreground">{choice.label}</span>
                  {choice.description ? (
                    <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">{choice.description}</span>
                  ) : null}
                </span>
                <ChevronRightIcon
                  className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  strokeWidth={1.75}
                />
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex items-center justify-between gap-3">
          {customOpen ? (
            <Input
              autoFocus
              disabled={busy}
              placeholder="Something else"
              value={draft}
              className="h-10 max-w-sm border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0 dark:bg-transparent"
              onChange={(event) => onDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (draft.trim()) onAnswer(draft.trim());
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  onCustomOpen(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              disabled={busy}
              className="flex items-center gap-2 text-[15px] text-muted-foreground"
              onClick={() => onCustomOpen(true)}
            >
              <PaperclipIcon className="size-4" strokeWidth={1.75} />
              Something else
            </button>
          )}
          <Button
            type="button"
            disabled={busy}
            className="h-9 rounded-full bg-muted px-5 text-[14px] text-foreground hover:bg-muted"
            onClick={() => onAnswer("")}
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}

function Pager({
  index,
  total,
  busy,
  onPrev,
  onNext,
  onCancel,
}: {
  index: number;
  total: number;
  busy: boolean;
  onPrev: () => void;
  onNext: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 text-[13px] text-muted-foreground">
      <button
        type="button"
        aria-label="Previous question"
        disabled={busy || index === 0}
        className={cn("flex size-7 items-center justify-center disabled:opacity-30")}
        onClick={onPrev}
      >
        <ChevronLeftIcon className="size-4" strokeWidth={1.75} />
      </button>
      <span>
        {index + 1} of {total}
      </span>
      <button
        type="button"
        aria-label="Next question"
        disabled={busy || index + 1 >= total}
        className="flex size-7 items-center justify-center disabled:opacity-30"
        onClick={onNext}
      >
        <ChevronRightIcon className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label="Cancel questions"
        disabled={busy}
        className="ml-1 flex size-7 items-center justify-center"
        onClick={onCancel}
      >
        <XIcon className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
