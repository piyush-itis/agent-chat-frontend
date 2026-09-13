"use client";

import { useState } from "react";
import type { Waitpoint } from "@/generated/api";
import { resumeWaitpoint } from "@/lib/api/runs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatMagicaCredits } from "@/lib/format-magica-credits";
import { kindFromUrl } from "@/lib/generated-media";

export function WaitpointOverlay({
  runId,
  waitpoint,
  onDone,
}: {
  runId: string;
  waitpoint: Waitpoint;
  onDone: () => void;
}) {
  const [choiceId, setChoiceId] = useState(waitpoint.payload.choices?.[0]?.id);
  const [busy, setBusy] = useState(false);
  const expired = new Date(waitpoint.expiresAt).getTime() < Date.now();

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
    <Dialog open>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{waitpoint.kind}</p>
          <DialogTitle>{waitpoint.payload.title}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap">{waitpoint.payload.summary}</DialogDescription>
        </DialogHeader>
        {waitpoint.payload.estimateCredits ? (
          <p className="text-sm">About {formatMagicaCredits(waitpoint.payload.estimateCredits)}</p>
        ) : null}
        {waitpoint.payload.mediaUrls?.length ? (
          <ul className="flex flex-col gap-3">
            {waitpoint.payload.mediaUrls.map((url) => (
              <li key={url}>
                {kindFromUrl(url) === "video" ? (
                  <video src={url} controls className="w-full rounded-xl bg-muted" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt="Media to confirm"
                    referrerPolicy="no-referrer"
                    className="max-h-72 w-full rounded-xl bg-muted object-contain"
                  />
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {waitpoint.payload.choices?.length ? (
          <fieldset className="flex flex-col gap-2">
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
          <Alert variant="destructive">
            <AlertDescription>
              This approval expired. Send a new message to continue later.
            </AlertDescription>
          </Alert>
        ) : (
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void decide("rejected")}>
              Reject
            </Button>
            <Button type="button" disabled={busy} onClick={() => void decide("approved")}>
              Approve
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
