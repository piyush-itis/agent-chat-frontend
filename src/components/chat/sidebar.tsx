"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { PinIcon, PlusIcon, SearchIcon, StarIcon, Trash2Icon, XIcon } from "lucide-react";
import { useChatList, useCreateChat, useDeleteChat, useFavoriteChat, usePinChat } from "@/hooks/use-chats";
import { useCredits } from "@/hooks/use-credits";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";

export function Sidebar({ activeChatId }: { activeChatId?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const chats = useChatList(query);
  const createChat = useCreateChat();
  const favorite = useFavoriteChat();
  const pin = usePinChat();
  const remove = useDeleteChat();
  const credits = useCredits();

  const items = chats.data?.pages.flatMap((page) => page.items) ?? [];
  const pinned = items.filter((chat) => chat.pinned);
  const rest = items.filter((chat) => !chat.pinned);

  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex h-full w-72 shrink-0 flex-col border-r border-border bg-sidebar transition-transform md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-semibold">Galaxy</p>
            <p className="text-xs text-muted-foreground">Agent Chat</p>
          </div>
          <div className="flex items-center gap-2">
            <UserButton />
            <button
              type="button"
              className="md:hidden"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="px-3">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            disabled={createChat.isPending}
            onClick={async () => {
              const chat = await createChat.mutateAsync();
              router.push(`/c/${chat.id}`);
              setSidebarOpen(false);
            }}
          >
            <PlusIcon className="size-4" />
            New chat
          </button>
          <label className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
            <SearchIcon className="size-3.5 text-muted-foreground" />
            <input
              aria-label="Search chats"
              placeholder="Search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto px-2">
          {items.length === 0 ? (
            <p className="px-2 text-xs text-muted-foreground">
              {query ? "No chats match that search" : "No chats yet"}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {[...pinned, ...rest].map((chat) => (
                <li key={chat.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm",
                      activeChatId === chat.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/60",
                    )}
                  >
                    <Link
                      href={`/c/${chat.id}`}
                      className="min-w-0 flex-1 truncate"
                      onClick={() => setSidebarOpen(false)}
                    >
                      {chat.title}
                    </Link>
                    <button
                      type="button"
                      aria-label={chat.pinned ? "Unpin chat" : "Pin chat"}
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => pin.mutate({ chatId: chat.id, pinned: !chat.pinned })}
                    >
                      <PinIcon className={cn("size-3.5", chat.pinned && "fill-current")} />
                    </button>
                    <button
                      type="button"
                      aria-label={chat.favorited ? "Unfavorite chat" : "Favorite chat"}
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => favorite.mutate({ chatId: chat.id, favorited: !chat.favorited })}
                    >
                      <StarIcon className={cn("size-3.5", chat.favorited && "fill-current")} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete chat"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={async () => {
                        await remove.mutateAsync(chat.id);
                        if (activeChatId === chat.id) router.push("/");
                      }}
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <p>Credits: {credits.data?.balance ?? "—"}</p>
          <Link href="/settings" className="mt-1 inline-block underline">
            API keys
          </Link>
        </div>
      </aside>
    </>
  );
}
