import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttachButton, AttachmentPreviewRow } from "./attach-button";

vi.mock("@/lib/api/uploads", () => ({
  listUploads: vi.fn().mockResolvedValue({ items: [] }),
  signUpload: vi.fn().mockRejectedValue({
    name: "ApiClientError",
    body: { message: "TRANSLOADIT_KEY or TRANSLOADIT_SECRET is not set", code: "CONFIG" },
    status: 500,
  }),
  completeUpload: vi.fn(),
}));

describe("AttachButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens the Magica attach popover from the paperclip", async () => {
    const view = render(<AttachButton attachments={[]} onChange={vi.fn()} />);
    const attach = view.getByLabelText("Attach file");
    expect(attach).toBeInTheDocument();
    attach.click();
    expect(await screen.findByText("Select Asset")).toBeInTheDocument();
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(
      screen.getByText("Add a file from your device or select one from your library"),
    ).toBeInTheDocument();
  });

  it("shows a removable thumbnail after a file is attached", () => {
    render(
      <AttachmentPreviewRow
        attachments={[
          {
            id: "att_1",
            mimeType: "image/jpeg",
            originalName: "sky.jpg",
            resultUrl: "https://example.com/sky.jpg",
            durableUrl: null,
            sortOrder: 0,
          },
        ]}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByAltText("sky.jpg")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove sky.jpg")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("fades a pending upload and shows circular progress until it finishes", () => {
    render(
      <AttachmentPreviewRow
        attachments={[
          {
            id: "pending:1",
            mimeType: "image/jpeg",
            originalName: "sky.jpg",
            resultUrl: "https://example.com/sky.jpg",
            durableUrl: null,
            sortOrder: 0,
            uploadProgress: 42,
          },
        ]}
        onRemove={vi.fn()}
      />,
    );
    const progress = screen.getByRole("progressbar", { name: "Uploading sky.jpg" });
    expect(progress).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByAltText("sky.jpg").parentElement).toHaveClass("opacity-40");
  });
});
