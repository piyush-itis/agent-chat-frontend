"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EllipsisIcon } from "lucide-react";
import { toast } from "sonner";
import { useDeleteChat, usePinChat, useRenameChat } from "@/hooks/use-chats";
import { ApiClientError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { Chat } from "@/generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SidebarChatItem({
  chat,
  active,
  onNavigate,
}: {
  chat: Chat;
  active: boolean;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const pinChat = usePinChat();
  const renameChat = useRenameChat();
  const deleteChat = useDeleteChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(chat.title);

  async function saveTitle() {
    const next = title.trim();
    if (!next || next === chat.title) {
      setTitle(chat.title);
      setRenaming(false);
      return;
    }
    try {
      await renameChat.mutateAsync({ chatId: chat.id, title: next });
      setRenaming(false);
    } catch (error) {
      toast.message(error instanceof ApiClientError ? error.message : "Couldn’t rename this task.");
    }
  }

  async function onDelete() {
    try {
      await deleteChat.mutateAsync(chat.id);
      if (active) router.push("/");
    } catch (error) {
      toast.message(error instanceof ApiClientError ? error.message : "Couldn’t delete this task.");
    }
  }

  if (renaming) {
    return (
      <li className="px-1">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveTitle();
          }}
        >
          <input
            aria-label="Rename task"
            value={title}
            autoFocus
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setTitle(chat.title);
                setRenaming(false);
              }
            }}
            className="h-9 w-full rounded-lg bg-sidebar-accent px-3.5 text-[15px] text-sidebar-foreground outline-none"
          />
        </form>
      </li>
    );
  }

  return (
    <li className="group relative">
      <Link
        href={`/c/${chat.id}`}
        className={cn(
          "flex min-w-0 items-center rounded-lg py-2 pr-9 pl-3.5 text-[15px] transition-colors",
          active || menuOpen
            ? "bg-sidebar-accent/80 text-sidebar-foreground"
            : "text-muted-foreground group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground",
        )}
        onClick={onNavigate}
      >
        <span className="truncate">{chat.title}</span>
      </Link>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          aria-label={`Actions for ${chat.title}`}
          className={cn(
            "absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center border-0 bg-transparent text-muted-foreground shadow-none transition-colors hover:bg-transparent hover:text-foreground",
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <EllipsisIcon className="size-4" strokeWidth={1.75} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4} className="min-w-40">
          <DropdownMenuItem
            onClick={() => pinChat.mutate({ chatId: chat.id, pinned: !chat.pinned })}
          >
            {chat.pinned ? "Unpin" : "Pin to top"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setTitle(chat.title);
              setRenaming(true);
            }}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => void onDelete()}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
