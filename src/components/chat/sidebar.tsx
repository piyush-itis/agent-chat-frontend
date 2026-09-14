"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AtomIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CirclePlusIcon,
  FolderIcon,
  LibraryIcon,
  LifeBuoyIcon,
  MessageCircleIcon,
  PanelLeftIcon,
  SearchIcon,
  SparkleIcon,
  SquareTerminalIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useChatList } from "@/hooks/use-chats";
import { useUiStore, type RailView } from "@/stores/ui";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MagicaWordmark } from "./magica-mark";
import { SidebarAccountMenu } from "./sidebar-account-menu";
import { SidebarChatItem } from "./sidebar-chat-item";

const UNAVAILABLE = "Not available in this workspace.";

const DEAD_NAV = [
  { label: "Projects", icon: FolderIcon },
  { label: "Library", icon: LibraryIcon },
  { label: "Tools", icon: AtomIcon },
  { label: "Help & Support", icon: LifeBuoyIcon },
  { label: "Unfair Advantage", icon: SparkleIcon },
] as const;

export function Sidebar({ activeChatId }: { activeChatId?: string }) {
  const router = useRouter();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const chats = useChatList(searchQuery);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(true);

  const items = [...(chats.data?.pages.flatMap((page) => page.items) ?? [])].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned),
  );

  function collapse() {
    setSidebarCollapsed(true);
    setSidebarOpen(false);
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

  function newTask() {
    closeSearch();
    setSidebarOpen(false);
    router.push("/");
  }

  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex h-full w-[280px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0",
          sidebarCollapsed && "md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="relative flex h-14 shrink-0 items-center justify-between px-5">
          <MagicaWordmark />
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Search tasks"
              aria-expanded={searchOpen}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-sidebar-accent"
              onClick={() => {
                setSearchOpen((open) => {
                  if (open) setSearchQuery("");
                  return !open;
                });
              }}
            >
              <SearchIcon className="size-[18px]" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Collapse sidebar"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-sidebar-accent"
              onClick={collapse}
            >
              <PanelLeftIcon className="size-[18px]" strokeWidth={1.75} />
            </button>
          </div>
          {searchOpen ? (
            <div className="absolute inset-x-3 top-12 z-10 rounded-2xl border border-border bg-card p-2 shadow-[0_12px_32px_rgba(17,17,17,0.08)]">
              <Input
                autoFocus
                aria-label="Search tasks"
                placeholder="Search tasks"
                value={searchQuery}
                className="h-9 border-0 bg-muted shadow-none focus-visible:ring-0 dark:bg-muted"
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeSearch();
                  }
                }}
              />
            </div>
          ) : null}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col px-4 pt-1">
          <RailButton
            icon={<CirclePlusIcon className="size-[18px]" strokeWidth={1.75} />}
            label="New task"
            onClick={() => void newTask()}
          />
          <RailButton
            icon={<MessageCircleIcon className="size-[18px]" strokeWidth={1.75} />}
            label="Tasks"
            href="/tasks"
            onClick={() => {
              closeSearch();
              setSidebarOpen(false);
            }}
          />
          <RailButton
            icon={<SquareTerminalIcon className="size-[18px]" strokeWidth={1.75} />}
            label="API / MCP"
            onClick={() => {
              closeSearch();
              setSidebarOpen(false);
              router.push("/developers");
            }}
          />
          {DEAD_NAV.map((item) => (
            <RailButton
              key={item.label}
              icon={<item.icon className="size-[18px]" strokeWidth={1.75} />}
              label={item.label}
              onClick={() => toast.message(UNAVAILABLE)}
            />
          ))}

          <div className="mt-3 flex h-9 items-center justify-between rounded-xl bg-card px-3.5 text-[13px] text-muted-foreground shadow-[0_6px_18px_rgba(17,17,17,0.06)] ring-1 ring-border">
            <button
              type="button"
              aria-expanded={recentOpen}
              className="flex items-center gap-1 rounded-lg py-1 transition-colors hover:text-foreground"
              onClick={() => setRecentOpen((open) => !open)}
            >
              Recent tasks
              <ChevronUpIcon
                className={cn("size-3.5 transition-transform", !recentOpen && "rotate-180")}
                strokeWidth={1.75}
              />
            </button>
            <Link
              href="/tasks"
              className="flex items-center gap-0.5 py-1 transition-colors hover:text-foreground"
              onClick={() => {
                closeSearch();
                setSidebarOpen(false);
              }}
            >
              View all
              <ChevronRightIcon className="size-3.5" strokeWidth={1.75} />
            </Link>
          </div>
          <div className="mt-1 min-h-0 flex-1 overflow-y-auto pb-3">
            {recentOpen ? (
              items.length === 0 ? (
                <p className="px-3.5 pt-3 text-[13px] text-muted-foreground">No tasks yet</p>
              ) : (
                <ul>
                  {items.map((chat) => (
                    <SidebarChatItem
                      key={chat.id}
                      chat={chat}
                      active={activeChatId === chat.id}
                      onNavigate={() => {
                        closeSearch();
                        setSidebarOpen(false);
                      }}
                    />
                  ))}
                </ul>
              )
            ) : null}
          </div>
        </nav>

        <SidebarAccountMenu />
      </aside>
    </>
  );
}

function RailButton({
  icon,
  label,
  onClick,
  href,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left text-[15px] text-sidebar-foreground hover:bg-sidebar-accent";
  const content = (
    <>
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export type { RailView };
