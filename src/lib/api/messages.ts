import type { MessageListResponse, SendTurnRequest, SendTurnResponse } from "@/generated/api";
import { apiFetch } from "./client";

export function listMessages(chatId: string, cursor?: string | null) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiFetch<MessageListResponse>(`/api/chats/${chatId}/messages${query}`);
}

export function sendTurn(chatId: string, body: SendTurnRequest) {
  return apiFetch<SendTurnResponse>(`/api/chats/${chatId}/turns`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
