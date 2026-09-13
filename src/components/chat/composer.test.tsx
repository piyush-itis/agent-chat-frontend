import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Composer } from "./composer";

vi.mock("@/lib/api/uploads", () => ({
  listUploads: vi.fn().mockResolvedValue({ items: [] }),
  signUpload: vi.fn(),
  completeUpload: vi.fn(),
}));

describe("Composer", () => {
  it("shows a 409-style error via toast callback path on send failure", async () => {
    const onSend = vi.fn().mockRejectedValue({
      name: "ApiClientError",
      body: { message: "This chat already has an active run", code: "ACTIVE_RUN" },
    });
    render(<Composer onSend={onSend} />);
    expect(screen.getByLabelText("Assign a task")).toBeInTheDocument();
    expect(screen.getByLabelText("Attach file")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plan" })).toBeInTheDocument();
    expect(screen.getByLabelText("Voice input")).toBeInTheDocument();
    expect(screen.getByLabelText("Send")).toBeInTheDocument();
  });
});
