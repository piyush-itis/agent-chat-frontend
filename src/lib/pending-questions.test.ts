import { describe, expect, it } from "vitest";
import { canResumeWaitpoint, pendingAskQuestions, questionsWaitpointFromRun } from "./pending-questions";
import type { Message, Waitpoint } from "@/generated/api";

function assistant(blocks: Message["blocks"]): Message {
  return {
    id: "m1",
    chatId: "c1",
    runId: "r1",
    role: "assistant",
    status: "success",
    blocks,
    createdAt: new Date().toISOString(),
  };
}

describe("pendingAskQuestions", () => {
  it("reads unanswered ask_questions from the latest assistant turn", () => {
    const found = pendingAskQuestions([
      assistant([
        {
          type: "tool_use",
          invocationId: "t1",
          toolName: "ask_questions",
          input: {
            message: "Need a few details.",
            questions: [{ prompt: "What style?", required: true }],
          },
        },
      ]),
    ]);
    expect(found?.message).toBe("Need a few details.");
    expect(found?.questions).toEqual([
      { id: "Q1", prompt: "What style?", required: true, placeholder: undefined },
    ]);
  });

  it("ignores ask_questions that already have a result", () => {
    expect(
      pendingAskQuestions([
        assistant([
          {
            type: "tool_use",
            invocationId: "t1",
            toolName: "ask_questions",
            input: { message: "Done", questions: [{ prompt: "Name?" }] },
          },
          {
            type: "tool_result",
            invocationId: "t1",
            toolName: "ask_questions",
            output: { answers: { Q1: "Galaxy" } },
            status: "success",
          },
        ]),
      ]),
    ).toBeNull();
  });
});

describe("questionsWaitpointFromRun", () => {
  it("does not invent resume credentials from the timeline", () => {
    const waitpoint = questionsWaitpointFromRun("run_1", null, [
      assistant([
        {
          type: "tool_use",
          invocationId: "t1",
          toolName: "ask_questions",
          input: { message: "Details", questions: [{ prompt: "Palette?" }] },
        },
      ]),
    ]);
    expect(waitpoint).toBeNull();
  });

  it("keeps a real questions waitpoint", () => {
    const real: Waitpoint = {
      id: "wp",
      token: "tok",
      runId: "run_1",
      kind: "questions",
      payload: {
        title: "Waiting",
        summary: "Details",
        questions: [{ id: "Q1", prompt: "Name?" }],
      },
      status: "open",
      resumeKey: "rk",
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    expect(questionsWaitpointFromRun("run_1", real, [])).toEqual(real);
  });

  it("rewrites a crop waitpoint into Magica crop-target choices", () => {
    const waitpoint = questionsWaitpointFromRun(
      "run_1",
      {
        id: "wp",
        token: "tok",
        runId: "run_1",
        kind: "questions",
        payload: {
          title: "Waiting",
          summary: "Need a crop region.",
          message: "Need a crop region.",
          questions: [{ id: "Q1", prompt: "Please specify percent or pixel coordinates" }],
        },
        status: "open",
        resumeKey: "rk",
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      [],
    );
    expect(waitpoint?.payload.questions?.[0]?.prompt).toBe("Choose a crop target");
    expect(waitpoint?.payload.questions?.[0]?.choices?.map((choice) => choice.label)).toEqual([
      "Square (1:1)",
      "Story / Reel (9:16)",
      "Portrait (4:5)",
      "Landscape (16:9)",
      "Custom region or ratio",
    ]);
    expect(canResumeWaitpoint(waitpoint)).toBe(true);
  });

  it("rejects synthetic open-wait credentials", () => {
    expect(
      canResumeWaitpoint({
        id: "pending-questions",
        token: "open",
        runId: "run_1",
        kind: "questions",
        payload: { title: "Waiting", summary: "Details" },
        status: "open",
        resumeKey: "open-wait",
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }),
    ).toBe(false);
  });
});
