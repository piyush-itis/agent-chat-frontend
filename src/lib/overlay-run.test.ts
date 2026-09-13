import { describe, expect, it } from "vitest";
import type { RunResponse } from "@/generated/api";
import { overlayRun } from "./overlay-run";

const base: RunResponse = {
  id: "r1",
  chatId: "c1",
  status: "thinking",
  modelRequested: "openrouter/free",
  modelRouted: null,
  userMessageId: "u1",
  assistantMessageId: "a1",
  errorCode: null,
  errorSafeMessage: null,
  assistant: {
    id: "a1",
    chatId: "c1",
    runId: "r1",
    role: "assistant",
    status: "success",
    blocks: [{ type: "thinking", text: "I will" }],
    createdAt: "2026-09-13T00:00:00.000Z",
  },
  waitpoint: null,
  generatedAssets: [],
  createdAt: "2026-09-13T00:00:00.000Z",
};

describe("overlayRun", () => {
  it("overlays thinking and assistant stream parts onto the live run", () => {
    const next = overlayRun(base, {
      thinkingParts: ["I will", " sketch a rose."],
      assistantParts: ["Here is your rose."],
      meta: { status: "working", pendingTool: "gpt_image_2" },
    });
    expect(next.status).toBe("working");
    expect(next.pendingTool).toBe("gpt_image_2");
    expect(next.assistant?.blocks).toEqual([
      { type: "thinking", text: "I will sketch a rose." },
      { type: "text", text: "Here is your rose." },
    ]);
  });

  it("slices stream parts to the current hop using metadata offsets", () => {
    const next = overlayRun(
      {
        ...base,
        assistant: {
          ...base.assistant!,
          blocks: [{ type: "text", text: "Crop" }],
        },
      },
      {
        thinkingParts: ["I will crop this.", "Need a short confirmation."],
        assistantParts: ["I'll crop this now.", "Cropped to 16:9."],
        meta: { thinkingOffset: "I will crop this.".length, assistantOffset: "I'll crop this now.".length },
      },
    );
    expect(next.assistant?.blocks).toEqual([
      { type: "text", text: "Cropped to 16:9." },
      { type: "thinking", text: "Need a short confirmation." },
    ]);
  });

  it("keeps persisted text when it is longer than the stream so far", () => {
    const next = overlayRun(
      {
        ...base,
        assistant: {
          ...base.assistant!,
          blocks: [{ type: "text", text: "Here is your finished rose." }],
        },
      },
      { assistantParts: ["Here"] },
    );
    expect(next.assistant?.blocks).toEqual([{ type: "text", text: "Here is your finished rose." }]);
  });

  it("merges metadata assets without replacing existing ones", () => {
    const next = overlayRun(
      {
        ...base,
        generatedAssets: [
          {
            id: "ga1",
            kind: "image",
            url: "https://cdn.example/elephant.png",
            durableUrl: null,
            mimeType: "image/png",
            createdAt: "2026-09-13T00:00:00.000Z",
          },
        ],
      },
      {
        meta: {
          assets: [{ url: "https://cdn.example/rose.png", durableUrl: null, kind: "image" }],
        },
      },
    );
    expect(next.generatedAssets.map((asset) => asset.url)).toEqual([
      "https://cdn.example/elephant.png",
      "https://cdn.example/rose.png",
    ]);
  });
});
