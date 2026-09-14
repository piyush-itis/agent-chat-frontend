import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/ui";
import { Sidebar } from "./sidebar";

const toastMessage = vi.fn();
const push = vi.fn();

vi.mock("sonner", () => ({
  toast: { message: (...args: unknown[]) => toastMessage(...args) },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      fullName: "Piyush Sharma",
      username: "piyush",
      imageUrl: null,
      createdAt: new Date("2026-10-11T00:00:00.000Z"),
    },
  }),
}));

const pinMutate = vi.fn();
const renameMutate = vi.fn();
const deleteMutate = vi.fn();

vi.mock("@/hooks/use-chats", () => ({
  useChatList: () => ({
    data: {
      pages: [
        {
          items: [{ id: "c1", title: "Logo for agent chat app", pinned: false, favorited: false }],
        },
      ],
    },
  }),
  usePinChat: () => ({ mutate: pinMutate }),
  useRenameChat: () => ({ mutateAsync: renameMutate }),
  useDeleteChat: () => ({ mutateAsync: deleteMutate }),
}));

vi.mock("@/hooks/use-credits", () => ({
  useCredits: () => ({ data: { balance: 28_930_000 } }),
}));

afterEach(() => {
  cleanup();
  toastMessage.mockClear();
  push.mockClear();
  pinMutate.mockClear();
  renameMutate.mockClear();
  deleteMutate.mockClear();
  useUiStore.setState({ accountExpanded: true, searchQuery: "", sidebarCollapsed: false, pendingOutgoing: null });
});

describe("Sidebar", () => {
  it("renders the Magica rail labels and recent-task pill", () => {
    render(<Sidebar activeChatId="c1" />);
    expect(screen.getByText("Magica")).toBeInTheDocument();
    for (const label of [
      "New task",
      "Projects",
      "Library",
      "Tools",
      "API / MCP",
      "Help & Support",
      "Unfair Advantage",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Recent tasks" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute("href", "/tasks");
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/tasks");
    expect(screen.getByRole("link", { name: "Logo for agent chat app" })).toHaveAttribute("href", "/c/c1");
    expect(screen.getByText("Available Credits")).toBeInTheDocument();
    expect(screen.getByText("28.93M")).toBeInTheDocument();
    expect(document.querySelector("aside")).toHaveClass("bg-sidebar");
  });

  it("toasts on unimplemented nav items", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Unfair Advantage" }));
    expect(toastMessage).toHaveBeenCalledWith("Not available in this workspace.");
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(toastMessage).toHaveBeenCalledWith("Not available in this workspace.");
  });

  it("opens the API key page from API / MCP", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "API / MCP" }));
    expect(push).toHaveBeenCalledWith("/developers");
  });

  it("opens the search field from the header icon", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Search tasks" }));
    expect(screen.getByPlaceholderText("Search tasks")).toBeInTheDocument();
  });

  it("opens pin, rename, and delete from the chat actions menu", () => {
    render(<Sidebar activeChatId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: "Actions for Logo for agent chat app" }));
    expect(screen.getByRole("menuitem", { name: "Pin to top" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute("data-variant", "destructive");
    fireEvent.click(screen.getByRole("menuitem", { name: "Pin to top" }));
    expect(pinMutate).toHaveBeenCalledWith({ chatId: "c1", pinned: true });
  });

  it("collapses the account card to More without hiding the rail", () => {
    render(<Sidebar activeChatId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: "Less" }));
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Available Credits").closest("[aria-hidden='true']")).toBeTruthy();
    expect(screen.getByText("Piyush Sharma")).toBeInTheDocument();
    expect(screen.getByText("New task")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("button", { name: "Less" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Available Credits").closest("[aria-hidden='true']")).toBeNull();
  });
});
