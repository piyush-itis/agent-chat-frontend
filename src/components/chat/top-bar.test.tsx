import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/ui";
import { TopBar } from "./top-bar";

const toastMessage = vi.fn();

vi.mock("sonner", () => ({
  toast: { message: (...args: unknown[]) => toastMessage(...args) },
}));

vi.mock("@/hooks/use-credits", () => ({
  useCredits: () => ({ data: { balance: 9_922_000 } }),
}));

afterEach(() => {
  cleanup();
  toastMessage.mockClear();
  useUiStore.setState({ sidebarCollapsed: false, sidebarOpen: false });
});

describe("TopBar", () => {
  it("renders Magica Auto and sparkle credits without a chat title", () => {
    render(<TopBar />);
    expect(screen.getByRole("button", { name: "OpenRouter Free" })).toHaveTextContent("Magica Auto");
    expect(screen.getByText("9.92M")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Files" })).toBeInTheDocument();
    expect(screen.queryByText("Task")).not.toBeInTheDocument();
  });

  it("toasts when the files button is clicked", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    expect(toastMessage).toHaveBeenCalledWith("Not available in this workspace.");
  });
});
