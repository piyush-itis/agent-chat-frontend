import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

  it("keeps Working in the header while the run is live", () => {
    render(
      <WorkTimeline
        live
        blocks={[
          {
            type: "tool_use",
            invocationId: "g1",
            toolName: "gpt_image_2",
            input: { prompt: "Earth" },
          },
          {
            type: "tool_result",
            invocationId: "g1",
            toolName: "gpt_image_2",
            output: { durationMs: 2000 },
            status: "success",
          },
        ]}
      />,
    );
    expect(screen.getByText("Working · 1 step")).toBeInTheDocument();
    expect(screen.queryByText(/Completed/)).not.toBeInTheDocument();
  });

  it("uses Completed N steps when the run is finished", () => {
    render(
      <WorkTimeline
        blocks={[
          {
            type: "tool_use",
            invocationId: "g1",
            toolName: "gpt_image_2",
            input: { prompt: "Earth" },
          },
          {
            type: "tool_result",
            invocationId: "g1",
            toolName: "gpt_image_2",
            output: { durationMs: 2000 },
            status: "success",
          },
        ]}
      />,
    );
    expect(screen.getByText("Completed 1 step")).toBeInTheDocument();
    expect(screen.queryByText(/Working/)).not.toBeInTheDocument();
  });

  it("formats sub-second durations as milliseconds", () => {
    render(
      <WorkTimeline
        live
        blocks={[
          { type: "tool_use", invocationId: "s1", toolName: "load_skill", input: { name: "image-generation" } },
          {
            type: "tool_result",
            invocationId: "s1",
            toolName: "load_skill",
            output: { durationMs: 207 },
            status: "success",
          },
        ]}
      />,
    );
    expect(screen.getByText("207ms")).toBeInTheDocument();
    expect(screen.queryByText("0.2s")).not.toBeInTheDocument();
  });

  it("omits Get Pricing from the visible step list", () => {
    render(
      <WorkTimeline
        live
        blocks={[
          { type: "tool_use", invocationId: "p1", toolName: "get_pricing", input: {} },
          {
            type: "tool_result",
            invocationId: "p1",
            toolName: "get_pricing",
            output: { durationMs: 100 },
            status: "success",
          },
          { type: "tool_use", invocationId: "s1", toolName: "load_skill", input: { name: "image-generation" } },
          {
            type: "tool_result",
            invocationId: "s1",
            toolName: "load_skill",
            output: { durationMs: 2000 },
            status: "success",
          },
          { type: "tool_use", invocationId: "s2", toolName: "read_skill_asset", input: { name: "generate.md" } },
          {
            type: "tool_result",
            invocationId: "s2",
            toolName: "read_skill_asset",
            output: { durationMs: 2000 },
            status: "success",
          },
          { type: "tool_use", invocationId: "m1", toolName: "model_schema", input: { modelId: "gpt-image-2-text" } },
          {
            type: "tool_result",
            invocationId: "m1",
            toolName: "model_schema",
            output: { durationMs: 2900 },
            status: "success",
          },
          { type: "tool_use", invocationId: "g1", toolName: "gpt_image_2", input: { prompt: "Earth" } },
        ]}
      />,
    );
    expect(screen.getByText("Working · 4 steps")).toBeInTheDocument();
    expect(screen.queryByText("Get Pricing")).not.toBeInTheDocument();
    expect(screen.queryByText("get_pricing")).not.toBeInTheDocument();
    expect(screen.getAllByText("Skill")).toHaveLength(2);
    expect(screen.getByText("Model schema")).toBeInTheDocument();
    expect(screen.getByText("AI Generation")).toBeInTheDocument();
  });

  it("opens generation fields without embedding the result image", () => {
    render(
      <WorkTimeline
        live
        blocks={[
          {
            type: "tool_use",
            invocationId: "g1",
            toolName: "gpt_image_2",
            input: { mode: "text", prompt: "A modern logo", size: "2048x2048", quality: "high" },
          },
          {
            type: "tool_result",
            invocationId: "g1",
            toolName: "gpt_image_2",
            output: {
              image_url: "https://cdn.example/a.png",
              model: "gpt-image-2-text",
              durationMs: 2000,
              creditUsed: 390000,
            },
            status: "success",
          },
        ]}
      />,
    );
    expect(screen.getByText("AI Generation")).toBeInTheDocument();
    expect(screen.getByText("Tool")).toBeInTheDocument();
    expect(screen.getByText("generate")).toBeInTheDocument();
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText("gpt-image-2-text")).toBeInTheDocument();
    expect(screen.getByText("Prompt")).toBeInTheDocument();
    expect(screen.getByText("A modern logo")).toBeInTheDocument();
    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByText("2048×2048")).toBeInTheDocument();
    expect(screen.getByText("Quality")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("2.0s")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("View more")).not.toBeInTheDocument();
    expect(screen.queryByText(/credits/)).not.toBeInTheDocument();
  });

  it("shows crop fields without the result image or step credits", () => {
    render(
      <WorkTimeline
        live
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
    expect(screen.getByText("Crop Image")).toBeInTheDocument();
    expect(screen.getByText("0, 0 · 50 × 50 percent")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText(/cdn\.example/)).not.toBeInTheDocument();
    expect(screen.queryByText("0.01M credits")).not.toBeInTheDocument();
    expect(screen.queryByText("View more")).not.toBeInTheDocument();
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
    expect(screen.queryByText("View more")).not.toBeInTheDocument();
    rerender(<WorkTimeline blocks={blocks} />);
    expect(screen.getByText("Completed 1 step")).toBeInTheDocument();
    expect(screen.queryByText("AI Generation")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View more" })).not.toBeInTheDocument();
  });

  it("expands a finished model schema card after reopen", () => {
    render(
      <WorkTimeline
        blocks={[
          {
            type: "tool_use",
            invocationId: "m1",
            toolName: "model_schema",
            input: { modelId: "gpt-image-2-text" },
          },
          {
            type: "tool_result",
            invocationId: "m1",
            toolName: "model_schema",
            output: { durationMs: 2900 },
            status: "success",
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByText("Completed 1 step"));
    fireEvent.click(screen.getByText("Model schema"));
    expect(screen.getByText("Model ID")).toBeInTheDocument();
    expect(screen.getByText("gpt-image-2-text")).toBeInTheDocument();
    expect(screen.getByText("2.9s")).toBeInTheDocument();
  });
});
