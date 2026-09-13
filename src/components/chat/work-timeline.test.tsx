import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkTimeline } from "./work-timeline";

afterEach(() => {
  cleanup();
});

describe("WorkTimeline", () => {
  it("renders Working header and Magica step labels", () => {
    render(
      <WorkTimeline
        live
        blocks={[
          { type: "tool_use", invocationId: "s1", toolName: "load_skill", input: { name: "image-generation" } },
          {
            type: "tool_result",
            invocationId: "s1",
            toolName: "load_skill",
            output: { durationMs: 1700 },
            status: "success",
          },
          {
            type: "tool_use",
            invocationId: "q1",
            toolName: "ask_questions",
            input: { message: "Let's nail down a few details.", questions: [{ prompt: "App name?", required: true }] },
          },
        ]}
      />,
    );
    expect(screen.getByText("Working · 2 steps")).toBeInTheDocument();
    expect(screen.getByText("Skill")).toBeInTheDocument();
    expect(screen.getByText("Asking questions")).toBeInTheDocument();
    expect(screen.getByText("1.7s")).toBeInTheDocument();
  });

  it("opens inspector fields from View more", () => {
    const onInspect = vi.fn();
    render(
      <WorkTimeline
        onInspect={onInspect}
        blocks={[
          {
            type: "tool_use",
            invocationId: "g1",
            toolName: "gpt_image_2",
            input: { mode: "text", prompt: "A modern logo" },
          },
          {
            type: "tool_result",
            invocationId: "g1",
            toolName: "gpt_image_2",
            output: { image_url: "https://cdn.example/a.png", model: "gpt-image-2-text", durationMs: 2000 },
            status: "success",
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByText("Working · 1 step"));
    fireEvent.click(screen.getByText("AI Generation"));
    expect(screen.getByText("AI Generation")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Generated" })).toHaveAttribute("src", "https://cdn.example/a.png");
    fireEvent.click(screen.getByRole("button", { name: "View more" }));
    expect(onInspect).toHaveBeenCalled();
    expect(onInspect.mock.calls[0][0].title).toBe("AI Generation");
  });

  it("shows a cropped image instead of the source URL", () => {
    render(
      <WorkTimeline
        blocks={[
          {
            type: "tool_use",
            invocationId: "c1",
            toolName: "crop_image",
            input: {
              image_url: "https://cdn.example/source.png",
              crop: { x: 0, y: 0, width: 50, height: 50 },
              unit: "percent",
            },
          },
          {
            type: "tool_result",
            invocationId: "c1",
            toolName: "crop_image",
            output: { image_url: "https://cdn.example/cropped.png", creditCost: 1, creditUsed: 10000, durationMs: 3300 },
            status: "success",
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByText("Working · 1 step"));
    fireEvent.click(screen.getByText("Crop Image"));
    expect(screen.getByText("Crop Image")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Generated" })).toHaveAttribute("src", "https://cdn.example/cropped.png");
    expect(screen.queryByText(/cdn\.example/)).not.toBeInTheDocument();
    expect(screen.getByText("0, 0 · 50 × 50 percent")).toBeInTheDocument();
    expect(screen.getByText("0.01M credits")).toBeInTheDocument();
  });

  it("summarizes merge clips instead of dumping source URLs", () => {
    render(
      <WorkTimeline
        live
        blocks={[
          {
            type: "tool_use",
            invocationId: "m1",
            toolName: "merge_videos",
            input: {
              video_urls: [
                "https://pub-example.r2.dev/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/clip-one.mp4",
                "https://pub-example.r2.dev/cccccccccccccccccccccccccccccccc/dddddddddddddddddddddddddddddddd/clip-two.mp4",
              ],
              transition: "none",
            },
          },
        ]}
      />,
    );
    expect(screen.getByText("Merge Videos")).toBeInTheDocument();
    expect(screen.getByText("2 videos")).toBeInTheDocument();
    expect(screen.getByText("none")).toBeInTheDocument();
    expect(screen.queryByText(/pub-example/)).not.toBeInTheDocument();
  });

  it("auto-collapses steps when the run is no longer live", () => {
    const blocks = [
      {
        type: "tool_use" as const,
        invocationId: "g1",
        toolName: "gpt_image_2",
        input: { prompt: "A modern logo" },
      },
      {
        type: "tool_result" as const,
        invocationId: "g1",
        toolName: "gpt_image_2",
        output: { image_url: "https://cdn.example/a.png", durationMs: 2000 },
        status: "success" as const,
      },
    ];
    const { rerender } = render(<WorkTimeline live blocks={blocks} />);
    expect(screen.getByText("AI Generation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View more" })).toBeInTheDocument();
    rerender(<WorkTimeline blocks={blocks} />);
    expect(screen.getByText("Working · 1 step")).toBeInTheDocument();
    expect(screen.queryByText("AI Generation")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View more" })).not.toBeInTheDocument();
  });
});
