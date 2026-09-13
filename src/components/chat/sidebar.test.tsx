import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/ui";
import { Sidebar } from "./sidebar";

const toastMessage = vi.fn();

vi.mock("sonner", () => ({
  toast: { message: (...args: unknown[]) => toastMessage(...args) },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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
}));

vi.mock("@/hooks/use-credits", () => ({
  useCredits: () => ({ data: { balance: 28_930_000 } }),
}));

afterEach(() => {
  cleanup();
  toastMessage.mockClear();
  useUiStore.setState({ accountExpanded: true, searchQuery: "", sidebarCollapsed: false, pendingOutgoing: null });
});

describe("Sidebar", () => {
  it("renders the Magica rail labels and recent-task pill", () => {
    render(<Sidebar activeChatId="c1" />);
    expect(screen.getByText("Magica")).toBeInTheDocument();
    for (const label of [
      "New task",
      "Tasks",
      "Projects",
      "Library",
      "Tools",
      "API / MCP",
      "Help & Support",
      "Unfair Advantage",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText("Recent tasks")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Logo for agent chat app" })).toHaveAttribute("href", "/c/c1");
    expect(screen.getByText("Available Credits")).toBeInTheDocument();
    expect(screen.getByText("28.93M")).toBeInTheDocument();
    expect(document.querySelector("aside")).toHaveClass("bg-sidebar");
  });

  it("toasts on unimplemented nav items", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Unfair Advantage" }));
    expect(toastMessage).toHaveBeenCalledWith("Not available in this workspace.");
  });

  it("opens the search field from the header icon", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Search tasks" }));
    expect(screen.getByPlaceholderText("Search tasks")).toBeInTheDocument();
  });

  it("collapses the account card to More without hiding the rail", () => {
    render(<Sidebar activeChatId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: "Less" }));
    expect(screen.queryByText("Available Credits")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
    expect(screen.getByText("Piyush Sharma")).toBeInTheDocument();
    expect(screen.getByText("New task")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByText("Available Credits")).toBeInTheDocument();
  });
});
