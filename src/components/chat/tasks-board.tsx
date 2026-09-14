"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronDownIcon, MenuIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useChatList } from "@/hooks/use-chats";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TaskFilter = "all" | "favorited" | "pinned";

const FILTER_LABEL: Record<TaskFilter, string> = {
  all: "All",
  favorited: "Favorited",
  pinned: "Pinned",
};

const pill =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[13px] text-foreground transition-colors hover:bg-muted";

export function TasksBoard() {
  const router = useRouter();
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const chats = useChatList(query);

  useEffect(() => {
    if (chats.hasNextPage && !chats.isFetchingNextPage) {
      void chats.fetchNextPage();
    }
  }, [chats.hasNextPage, chats.isFetchingNextPage, chats.fetchNextPage]);

  const items = useMemo(() => {
    const all = chats.data?.pages.flatMap((page) => page.items) ?? [];
    if (filter === "favorited") return all.filter((chat) => chat.favorited);
    if (filter === "pinned") return all.filter((chat) => chat.pinned);
    return all;
  }, [chats.data, filter]);

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function newTask() {
    setSidebarOpen(false);
    router.push("/");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background pt-5">
      <div className="flex items-center justify-between gap-4 px-6 md:px-10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-foreground hover:bg-muted",
              sidebarCollapsed ? "" : "md:hidden",
            )}
            aria-label="Open sidebar"
            onClick={() => {
              setSidebarCollapsed(false);
              setSidebarOpen(true);
            }}
          >
            <MenuIcon className="size-[18px]" strokeWidth={1.75} />
          </button>
          <h1 className="text-[28px] font-medium tracking-[-0.03em] text-foreground">Tasks</h1>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className={pill}>
              Filter by {FILTER_LABEL[filter]}
              <ChevronDownIcon className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(FILTER_LABEL) as TaskFilter[]).map((value) => (
                <DropdownMenuItem key={value} onClick={() => setFilter(value)}>
                  {FILTER_LABEL[value]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            className={pill}
            aria-pressed={selecting}
            onClick={() => {
              setSelecting((open) => !open);
              setSelected(new Set());
            }}
          >
            {selecting ? "Cancel" : "Select tasks"}
          </button>

          <button type="button" className={pill} onClick={newTask}>
            New task
            <PlusIcon className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <label className="relative mt-4 block px-6 md:px-10">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tasks..."
          className="h-10 w-full rounded-full border border-border bg-transparent pr-4 pl-11 text-[15px] text-foreground outline-none placeholder:text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 focus-visible:border-foreground/25"
        />
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-8 md:px-4">
        {items.length === 0 ? (
          <p className="px-3 pt-8 text-[15px] text-muted-foreground md:px-6">No tasks yet</p>
        ) : (
          <ul>
            {items.map((chat) => {
              const checked = selected.has(chat.id);
              const row = (
                <>
                  {selecting ? (
                    <span
                      className={cn(
                        "mr-3 flex size-4 shrink-0 items-center justify-center rounded-full border border-border",
                        checked && "border-foreground bg-foreground text-background",
                      )}
                    >
                      {checked ? <CheckIcon className="size-2.5" strokeWidth={2.5} /> : null}
                    </span>
                  ) : null}
                  <span className="min-w-0 truncate">{chat.title}</span>
                  <span className="ml-6 shrink-0 text-[13px] text-muted-foreground">
                    {formatRelativeTime(chat.updatedAt)}
                  </span>
                </>
              );

              return (
                <li key={chat.id}>
                  {selecting ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-[15px] text-foreground transition-colors hover:bg-muted/60 md:px-6"
                      onClick={() => toggleSelected(chat.id)}
                    >
                      {row}
                    </button>
                  ) : (
                    <Link
                      href={`/c/${chat.id}`}
                      className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] text-foreground transition-colors hover:bg-muted/60 md:px-6"
                      onClick={() => setSidebarOpen(false)}
                    >
                      {row}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
