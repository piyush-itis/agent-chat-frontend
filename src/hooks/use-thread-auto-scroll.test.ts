import { describe, expect, it } from "vitest";
import type { Message } from "@/generated/api";
import { threadFollowKey } from "./use-thread-auto-scroll";

const assistant = (text: string, extra: Partial<Message> = {}): Message => ({
  id: "a1",
  chatId: "c1",
  runId: "r1",
  role: "assistant",
  status: "success",
  blocks: [{ type: "text", text }],
  createdAt: "2026-09-12T00:00:01.000Z",
  ...extra,
});

describe("threadFollowKey", () => {
  it("changes as the live assistant reply grows", () => {
    const first = threadFollowKey({
      newestUserKey: "u1",
      runId: "r1",
      runStatus: "thinking",
      assistant: assistant("Hi"),
    });
    const next = threadFollowKey({
      newestUserKey: "u1",
      runId: "r1",
      runStatus: "thinking",
      assistant: assistant("Hi there, here is more of the answer."),
    });
    expect(next).not.toBe(first);
  });

  it("changes when a tool result or asset appears", () => {
    const before = threadFollowKey({
      newestUserKey: "u1",
      runId: "r1",
      runStatus: "working",
      assistant: assistant("Working"),
      assetIds: [],
    });
    const after = threadFollowKey({
      newestUserKey: "u1",
      runId: "r1",
      runStatus: "working",
      assistant: {
        ...assistant("Working"),
        blocks: [
          { type: "text", text: "Working" },
          {
            type: "tool_result",
            invocationId: "t1",
            toolName: "gpt_image_2",
            output: { image_url: "https://cdn.example/a.png" },
            status: "success",
          },
        ],
      },
      assetIds: ["ga_1"],
    });
    expect(after).not.toBe(before);
  });
});
