import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuestionDock } from "./question-dock";

const resumeWaitpoint = vi.fn();

vi.mock("@/lib/api/runs", () => ({
  resumeWaitpoint: (...args: unknown[]) => resumeWaitpoint(...args),
}));

describe("QuestionDock", () => {
  it("renders Magica crop targets and submits the selected label", async () => {
    const onDone = vi.fn();
    resumeWaitpoint.mockResolvedValue({});
    render(
      <QuestionDock
        runId="run_1"
        onDone={onDone}
        waitpoint={{
          id: "wp_1",
          token: "tok",
          runId: "run_1",
          kind: "questions",
          payload: {
            title: "Waiting for your input",
            summary: "Need a crop region.",
            message: "Need a crop region.",
            questions: [{ id: "Q1", prompt: "Please specify percent or pixel coordinates", required: true }],
          },
          status: "open",
          resumeKey: "rk",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          createdAt: new Date().toISOString(),
        }}
      />,
    );

    expect(screen.getByText("Choose a crop target")).toBeInTheDocument();
    expect(screen.getByText("Square (1:1)")).toBeInTheDocument();
    expect(screen.getByText("Story / Reel (9:16)")).toBeInTheDocument();
    expect(screen.getByText("Portrait (4:5)")).toBeInTheDocument();
    expect(screen.getByText("Landscape (16:9)")).toBeInTheDocument();
    expect(screen.getByText("Custom region or ratio")).toBeInTheDocument();
    expect(screen.getByText("Something else")).toBeInTheDocument();
    expect(screen.queryByText(/percent or pixel/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save & Next" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Square \(1:1\)/ }));
    await vi.waitFor(() => {
      expect(resumeWaitpoint).toHaveBeenCalledWith("run_1", "tok", {
        resumeKey: "rk",
        decision: "approved",
        answers: { Q1: "Square (1:1)" },
      });
    });
  });
});
