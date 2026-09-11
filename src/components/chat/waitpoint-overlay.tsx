"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Waitpoint } from "@/generated/api";
import { resumeWaitpoint } from "@/lib/api/runs";

export function WaitpointOverlay({
  runId,
  waitpoint,
  onDone,
}: {
  runId: string;
  waitpoint: Waitpoint;
  onDone: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [choiceId, setChoiceId] = useState(waitpoint.payload.choices?.[0]?.id);
  const [busy, setBusy] = useState(false);
  const expired = new Date(waitpoint.expiresAt).getTime() < Date.now();

  useEffect(() => {
    const previously = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") event.preventDefault();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previously?.focus();
    };
  }, []);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    try {
      await resumeWaitpoint(runId, waitpoint.token, {
        resumeKey: waitpoint.resumeKey,
        decision,
        choiceId: waitpoint.kind === "options" ? choiceId : undefined,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl outline-none"
      >
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{waitpoint.kind}</p>
        <h2 id={titleId} className="mt-1 text-lg font-semibold">
          {waitpoint.payload.title}
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{waitpoint.payload.summary}</p>
        {waitpoint.payload.estimateCredits ? (
          <p className="mt-2 text-sm">About {waitpoint.payload.estimateCredits} credits</p>
        ) : null}
        {waitpoint.payload.mediaUrls?.length ? (
          <ul className="mt-3 space-y-2">
            {waitpoint.payload.mediaUrls.map((url) => (
              <li key={url} className="truncate text-xs text-muted-foreground">
                {url}
              </li>
            ))}
          </ul>
        ) : null}
        {waitpoint.payload.choices?.length ? (
          <fieldset className="mt-4 space-y-2">
            <legend className="text-sm font-medium">Options</legend>
            {waitpoint.payload.choices.map((choice) => (
              <label key={choice.id} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="waitpoint-choice"
                  checked={choiceId === choice.id}
                  onChange={() => setChoiceId(choice.id)}
                />
                {choice.label}
              </label>
            ))}
          </fieldset>
        ) : null}
        {expired ? (
          <p className="mt-4 text-sm text-destructive">
            This approval expired. Send a new message to continue later.
          </p>
        ) : (
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-1.5 text-sm"
              disabled={busy}
              onClick={() => void decide("rejected")}
            >
              Reject
            </button>
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              disabled={busy}
              onClick={() => void decide("approved")}
            >
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
