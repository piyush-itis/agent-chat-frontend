import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TasksBoard } from "./tasks-board";

const push = vi.fn();

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

vi.mock("@/hooks/use-chats", () => ({
  useChatList: () => ({
    data: {
      pages: [
        {
          items: [
            {
              id: "c1",
              title: "Logo for agent chat app",
              pinned: false,
              favorited: false,
              updatedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
            },
          ],
        },
      ],
    },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
});

describe("TasksBoard", () => {
  it("renders the Magica tasks header, search, and relative times", () => {
    render(<TasksBoard />);
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Filter by All/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select tasks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New task" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Logo for agent chat app/ })).toHaveAttribute("href", "/c/c1");
    expect(screen.getByText("23 hours ago")).toBeInTheDocument();
  });

  it("sends New task to the home composer", () => {
    render(<TasksBoard />);
    fireEvent.click(screen.getByRole("button", { name: "New task" }));
    expect(push).toHaveBeenCalledWith("/");
  });

  it("enters select mode instead of navigating", () => {
    render(<TasksBoard />);
    fireEvent.click(screen.getByRole("button", { name: "Select tasks" }));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Logo for agent chat app/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Logo for agent chat app/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("link", { name: /Logo for agent chat app/ })).toBeInTheDocument();
  });
});
