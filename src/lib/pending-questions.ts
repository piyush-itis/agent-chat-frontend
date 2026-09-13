import type { ContentBlock, Message, Waitpoint, WaitpointQuestion } from "@/generated/api";
import { withCropTargetPreset } from "./crop-target";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function pendingAskQuestions(messages: Message[]): {
  message: string;
  questions: WaitpointQuestion[];
} | null {
  for (const message of [...messages].reverse()) {
    if (message.role !== "assistant") continue;
    const uses = message.blocks.filter(isAskQuestions);
    for (const use of uses.reverse()) {
      const done = message.blocks.some(
        (block) => block.type === "tool_result" && block.invocationId === use.invocationId,
      );
      if (done) continue;
      const input = asRecord(use.input);
      const raw = Array.isArray(input.questions) ? input.questions : [];
      const askMessage = String(input.message ?? "");
      const questions = withCropTargetPreset(
        askMessage,
        raw
          .map((item, index) => {
            const record = asRecord(item);
            const choices = parseChoices(record.choices);
            return {
              id: typeof record.id === "string" ? record.id : `Q${index + 1}`,
              prompt: String(record.prompt ?? ""),
              required: record.required !== false,
              placeholder: typeof record.placeholder === "string" ? record.placeholder : undefined,
              ...(choices ? { choices } : {}),
            };
          })
          .filter((question) => question.prompt),
      );
      if (questions.length === 0) continue;
      return {
        message: askMessage,
        questions,
      };
    }
  }
  return null;
}

export function canResumeWaitpoint(waitpoint: Waitpoint | null | undefined): boolean {
  return Boolean(
    waitpoint &&
      waitpoint.status === "open" &&
      waitpoint.token &&
      waitpoint.token !== "open" &&
      waitpoint.resumeKey &&
      waitpoint.resumeKey !== "open-wait",
  );
}

export function questionsWaitpointFromRun(
  _runId: string | null,
  waitpoint: Waitpoint | null | undefined,
  messages: Message[],
): Waitpoint | null {
  if (waitpoint?.kind === "questions" && waitpoint.status === "open") {
    if (waitpoint.payload.questions?.length) {
      return {
        ...waitpoint,
        payload: {
          ...waitpoint.payload,
          questions: withCropTargetPreset(
            waitpoint.payload.message ?? waitpoint.payload.summary ?? "",
            waitpoint.payload.questions,
          ),
        },
      };
    }
    const pending = pendingAskQuestions(messages);
    if (!pending) return waitpoint;
    return {
      ...waitpoint,
      payload: {
        ...waitpoint.payload,
        message: waitpoint.payload.message ?? pending.message,
        questions: pending.questions,
      },
    };
  }
  return null;
}

function isAskQuestions(
  block: ContentBlock,
): block is Extract<ContentBlock, { type: "tool_use" }> {
  return block.type === "tool_use" && block.toolName === "ask_questions";
}

function parseChoices(value: unknown): WaitpointQuestion["choices"] {
  if (!Array.isArray(value)) return undefined;
  const choices = value.flatMap((item, index) => {
    const record = asRecord(item);
    const label = String(record.label ?? "").trim();
    if (!label) return [];
    return [
      {
        id: typeof record.id === "string" ? record.id : `c${index + 1}`,
        label,
        description: typeof record.description === "string" ? record.description : undefined,
      },
    ];
  });
  return choices.length > 0 ? choices : undefined;
}
