import type { Chat, ChatListResponse } from "@/generated/api";
import { apiFetch } from "./client";

export function listChats(cursor?: string | null, q?: string) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (q?.trim()) params.set("q", q.trim());
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<ChatListResponse>(`/api/chats${query}`);
}

export function createChat(title?: string) {
  return apiFetch<Chat>("/api/chats", {
    method: "POST",
    body: JSON.stringify(title ? { title } : {}),
  });
}

export function getChat(chatId: string) {
  return apiFetch<Chat>(`/api/chats/${chatId}`);
}

export function favoriteChat(chatId: string, favorited: boolean) {
  return apiFetch<Chat>(`/api/chats/${chatId}`, {
    method: "PATCH",
    body: JSON.stringify({ favorited }),
  });
}

export function pinChat(chatId: string, pinned: boolean) {
  return apiFetch<Chat>(`/api/chats/${chatId}`, {
    method: "PATCH",
    body: JSON.stringify({ pinned }),
  });
}

export function renameChat(chatId: string, title: string) {
  return apiFetch<Chat>(`/api/chats/${chatId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export function deleteChat(chatId: string) {
  return apiFetch<{ ok: true }>(`/api/chats/${chatId}`, { method: "DELETE" });
}
