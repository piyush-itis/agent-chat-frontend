import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WaitpointOverlay } from "./waitpoint-overlay";

vi.mock("@/lib/api/runs", () => ({
  resumeWaitpoint: vi.fn(),
}));

describe("WaitpointOverlay", () => {
  it("renders plan approval copy and actions", () => {
    render(
      <WaitpointOverlay
        runId="run_1"
        onDone={vi.fn()}
        waitpoint={{
          id: "wp_1",
          token: "tok",
          runId: "run_1",
          kind: "plan",
          payload: { title: "Approve this plan", summary: "1. Generate\n2. Crop" },
          status: "open",
          resumeKey: "resume_1",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          createdAt: new Date().toISOString(),
        }}
      />,
    );
    expect(screen.getByText("Approve this plan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("renders confirm-media as an image, not a URL string", () => {
    render(
      <WaitpointOverlay
        runId="run_1"
        onDone={vi.fn()}
        waitpoint={{
          id: "wp_2",
          token: "tok",
          runId: "run_1",
          kind: "media",
          payload: {
            title: "Confirm media",
            summary: "The agent will use this media with a Magica tool.",
            mediaUrls: ["https://cdn.example/source.png"],
          },
          status: "open",
          resumeKey: "resume_2",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          createdAt: new Date().toISOString(),
        }}
      />,
    );
    expect(screen.getByRole("img", { name: "Media to confirm" })).toHaveAttribute(
      "src",
      "https://cdn.example/source.png",
    );
    expect(screen.queryByText(/cdn\.example\/source\.png/)).not.toBeInTheDocument();
  });
});
