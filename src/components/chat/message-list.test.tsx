import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Message, RunResponse } from "@/generated/api";
import { MessageList } from "./message-list";

const user: Message = {
  id: "u1",
  chatId: "c1",
  runId: "r1",
  role: "user",
  status: "success",
  blocks: [{ type: "text", text: "create a logo for a agent chat app" }],
  createdAt: "2026-09-12T00:00:00.000Z",
};

const assistant: Message = {
  id: "a1",
  chatId: "c1",
  runId: "r1",
  role: "assistant",
  status: "success",
  blocks: [],
  createdAt: "2026-09-12T00:00:01.000Z",
};

const liveRun: RunResponse = {
  id: "r1",
  chatId: "c1",
  status: "thinking",
  modelRequested: "openrouter/free",
  modelRouted: null,
  userMessageId: "u1",
  assistantMessageId: "a1",
  errorCode: null,
  errorSafeMessage: null,
  assistant,
  waitpoint: null,
  generatedAssets: [],
  createdAt: "2026-09-12T00:00:01.000Z",
};

describe("MessageList thinking UI", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not label a chat-only reply as Working when overlay status is stale", () => {
    render(
      <MessageList
        messages={[
          { ...user, blocks: [{ type: "text", text: "say hi" }] },
          {
            ...assistant,
            blocks: [{ type: "thinking", text: "Response Safety: safe or unsafe" }],
          },
        ]}
        liveRun={{
          ...liveRun,
          status: "working",
          assistant: {
            ...assistant,
            blocks: [{ type: "thinking", text: "Response Safety: safe or unsafe" }],
          },
        }}
      />,
    );
    expect(screen.getByRole("button", { name: "Thinking" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Working" })).not.toBeInTheDocument();
  });

  it("shows a collapsed Magica Thinking row while the run is live", () => {
    render(<MessageList messages={[user, assistant]} liveRun={liveRun} />);
    expect(screen.getByText("create a logo for a agent chat app")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thinking" })).toBeInTheDocument();
    expect(screen.queryByText("Thinking…")).not.toBeInTheDocument();
    expect(screen.queryByText("Working…")).not.toBeInTheDocument();
    expect(screen.queryByText("You")).not.toBeInTheDocument();
    expect(screen.queryByText("Magica")).not.toBeInTheDocument();
  });

  it("hides assistant chatter and keeps the timeline while questions are open", () => {
    render(
      <MessageList
        messages={[
          user,
          {
            ...assistant,
            blocks: [
              { type: "text", text: "I'll create a logo! Let me ask a few questions:" },
              {
                type: "tool_use",
                invocationId: "q1",
                toolName: "ask_questions",
                input: { message: "Let's create a logo.", questions: [{ prompt: "App name?" }] },
              },
            ],
          },
        ]}
        liveRun={{
          ...liveRun,
          status: "working",
          waitpoint: {
            id: "wp_1",
            token: "tok",
            runId: "r1",
            kind: "questions",
            payload: {
              title: "Waiting for your input",
              summary: "Let's create a logo.",
              message: "Let's create a logo.",
              questions: [{ id: "Q1", prompt: "App name?", required: true }],
            },
            status: "open",
            resumeKey: "rk",
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            createdAt: new Date().toISOString(),
          },
        }}
      />,
    );
    expect(screen.getByText("Asking questions")).toBeInTheDocument();
    expect(screen.queryByText(/I'll create a logo/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thinking" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Working · Asking questions" })).not.toBeInTheDocument();
  });

  it("shows a live Merge Videos activity label while the tool is pending", () => {
    const blocks = [
      {
        type: "tool_use" as const,
        invocationId: "m1",
        toolName: "merge_videos",
        input: { video_urls: ["https://cdn.example/a.mp4", "https://cdn.example/b.mp4"] },
      },
    ];
    render(
      <MessageList
        messages={[user, { ...assistant, blocks }]}
        liveRun={{ ...liveRun, status: "working", assistant: { ...assistant, blocks } }}
      />,
    );
    expect(screen.getByRole("button", { name: "Working · Merge Videos" })).toBeInTheDocument();
  });

  it("streams the final confirmation instead of keeping the working row", () => {
    const blocks = [
      {
        type: "tool_use" as const,
        invocationId: "c1",
        toolName: "crop_image",
        input: {},
      },
      {
        type: "tool_result" as const,
        invocationId: "c1",
        toolName: "crop_image",
        output: { image_url: "https://cdn.example/cropped.png" },
        status: "success" as const,
      },
      { type: "text" as const, text: "Cropped to 16:9." },
    ];
    render(
      <MessageList
        messages={[user, { ...assistant, blocks }]}
        liveRun={{ ...liveRun, status: "working", assistant: { ...assistant, blocks } }}
      />,
    );
    expect(screen.getByText("Cropped to 16:9.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Working" })).not.toBeInTheDocument();
  });

  it("renders a generated markdown image instead of the raw URL", () => {
    render(
      <MessageList
        messages={[
          user,
          {
            ...assistant,
            blocks: [
              {
                type: "text",
                text: "Here it is:\n\n![Agent Chat App Logo](https://g.tlcdn.com/gen/logo.png)",
              },
            ],
          },
        ]}
      />,
    );
    expect(screen.queryByText(/!\[Agent Chat App Logo]/)).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Agent Chat App Logo" })).toHaveAttribute(
      "src",
      "https://g.tlcdn.com/gen/logo.png",
    );
  });

  it("renders user media with the caption instead of a text-only pill", () => {
    render(
      <MessageList
        messages={[
          {
            ...user,
            blocks: [{ type: "text", text: "crop this image" }],
            attachments: [
              {
                id: "att_1",
                mimeType: "image/png",
                originalName: "book.png",
                resultUrl: "https://cdn.example/book.png",
                durableUrl: null,
                sortOrder: 0,
              },
            ],
          },
        ]}
        pendingThinking
      />,
    );
    expect(screen.getByRole("img", { name: "book.png" })).toHaveAttribute("src", "https://cdn.example/book.png");
    expect(screen.getByText("crop this image")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thinking" })).toBeInTheDocument();
  });

  it("hides a narrated crop-target bullet list", () => {
    render(
      <MessageList
        messages={[
          user,
          {
            ...assistant,
            blocks: [
              {
                type: "text",
                text: "Choose a crop target\n- Square (1:1)\n- Story / Reel (9:16)\n- Portrait (4:5)\n- Landscape (16:9)",
              },
            ],
          },
        ]}
      />,
    );
    expect(screen.queryByText(/Choose a crop target/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Square \(1:1\)/)).not.toBeInTheDocument();
  });

  it("shows Magica M credits on the usage footer", () => {
    render(
      <MessageList
        messages={[
          user,
          {
            ...assistant,
            blocks: [
              { type: "text", text: "Cropped." },
              {
                type: "usage",
                modelRouted: "openrouter/free",
                promptTokens: 10,
                completionTokens: 4,
                applicationCredits: 1,
                magicaCreditUsed: 240000,
              },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText(/0\.24M credits/)).toBeInTheDocument();
    expect(screen.queryByText(/1 credits/)).not.toBeInTheDocument();
  });

  it("does not paint the latest run image onto an earlier assistant turn", () => {
    const first: Message = {
      ...assistant,
      blocks: [
        { type: "tool_use", invocationId: "g1", toolName: "gpt_image_2", input: { prompt: "elephant" } },
        {
          type: "tool_result",
          invocationId: "g1",
          toolName: "gpt_image_2",
          output: { image_url: "https://cdn.example/elephant.png" },
          status: "success",
        },
        { type: "text", text: "Here's your elephant." },
      ],
    };
    const laterUser: Message = {
      ...user,
      id: "u2",
      runId: "r2",
      createdAt: "2026-09-12T00:00:02.000Z",
      blocks: [{ type: "text", text: "generate another image of green rose" }],
    };
    const later: Message = {
      ...assistant,
      id: "a2",
      runId: "r2",
      createdAt: "2026-09-12T00:00:03.000Z",
      blocks: [
        { type: "tool_use", invocationId: "g2", toolName: "gpt_image_2", input: { prompt: "rose" } },
        {
          type: "tool_result",
          invocationId: "g2",
          toolName: "gpt_image_2",
          output: { image_url: "https://cdn.example/rose.png" },
          status: "success",
        },
        { type: "text", text: "Here's your rose." },
      ],
    };
    render(
      <MessageList
        messages={[user, first, laterUser, later]}
        liveRun={{
          ...liveRun,
          id: "r2",
          status: "complete",
          userMessageId: "u2",
          assistantMessageId: "a2",
          assistant: later,
          generatedAssets: [
            {
              id: "ga_rose",
              kind: "image",
              url: "https://cdn.example/rose.png",
              durableUrl: "https://cdn.example/rose.png",
              mimeType: "image/png",
              createdAt: "2026-09-12T00:00:03.000Z",
            },
          ],
        }}
      />,
    );
    const srcs = screen.getAllByRole("img").map((img) => img.getAttribute("src"));
    expect(srcs.filter((src) => src === "https://cdn.example/rose.png")).toHaveLength(1);
    expect(srcs.filter((src) => src === "https://cdn.example/elephant.png")).toHaveLength(1);
  });

  it("keeps generated media after the work steps collapse", () => {
    render(
      <MessageList
        messages={[
          user,
          {
            ...assistant,
            blocks: [
              { type: "tool_use", invocationId: "g1", toolName: "gpt_image_2", input: { prompt: "elephant" } },
              {
                type: "tool_result",
                invocationId: "g1",
                toolName: "gpt_image_2",
                output: { image_url: "https://cdn.example/elephant.png", durationMs: 1000 },
                status: "success",
              },
              { type: "text", text: "Here's your cartoon purple elephant!" },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText("Working · 1 step")).toBeInTheDocument();
    expect(screen.queryByText("View more")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Generated image" })).toHaveAttribute(
      "src",
      "https://cdn.example/elephant.png",
    );
    expect(screen.getByText("Here's your cartoon purple elephant!")).toBeInTheDocument();
  });

  it("expands thinking text only after click", async () => {
    render(
      <MessageList
        messages={[
          user,
          {
            ...assistant,
            blocks: [{ type: "thinking", text: "I will sketch a mark first." }],
          },
        ]}
      />,
    );
    expect(screen.queryByText("I will sketch a mark first.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thinking" }));
    expect(screen.getByText("I will sketch a mark first.")).toBeInTheDocument();
  });
});
