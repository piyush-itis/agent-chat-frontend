import type { QueryClient } from "@tanstack/react-query";
import type { Attachment, Message } from "@/generated/api";

export const OPTIMISTIC_PREFIX = "optimistic:";

const clientKeysByServerId = new Map<string, string>();
const clientKeysByOutgoing = new Map<string, string>();

export function outgoingFingerprint(chatId: string, text: string) {
  return `${chatId}\0${text}`;
}

export function rememberOutgoingClientKey(chatId: string, text: string, clientKey: string) {
  clientKeysByOutgoing.set(outgoingFingerprint(chatId, text), clientKey);
}

export function forgetOutgoingClientKey(chatId: string, text: string) {
  const fingerprint = outgoingFingerprint(chatId, text);
  const clientKey = clientKeysByOutgoing.get(fingerprint);
  clientKeysByOutgoing.delete(fingerprint);
  if (!clientKey) return;
  for (const [serverId, mapped] of clientKeysByServerId) {
    if (mapped === clientKey) clientKeysByServerId.delete(serverId);
  }
}

export function clientKeyOf(message: Message) {
  if (message.id.startsWith(OPTIMISTIC_PREFIX)) return message.id;
  return clientKeysByServerId.get(message.id) ?? message.id;
}

export function resetOptimisticClientKeys() {
  clientKeysByServerId.clear();
  clientKeysByOutgoing.clear();
}

export function makeOptimisticUserMessage(
  chatId: string,
  text: string,
  attachments: Attachment[],
  clientId = crypto.randomUUID(),
): Message {
  const id = clientId.startsWith(OPTIMISTIC_PREFIX) ? clientId : `${OPTIMISTIC_PREFIX}${clientId}`;
  rememberOutgoingClientKey(chatId, text, id);
  return {
    id,
    chatId,
    runId: null,
    role: "user",
    status: "success",
    blocks: [{ type: "text", text }],
    attachments,
    createdAt: new Date().toISOString(),
  };
}

export function seedOptimisticMessage(queryClient: QueryClient, chatId: string, message: Message) {
  queryClient.setQueryData(
    ["chats", chatId, "messages"],
    (current: { pages: { items: Message[]; nextCursor: string | null }[]; pageParams: unknown[] } | undefined) => {
      if (!current) {
        return { pages: [{ items: [message], nextCursor: null }], pageParams: [undefined] };
      }
      return {
        ...current,
        pages: current.pages.map((page, index) =>
          index === 0
            ? {
                ...page,
                items: [message, ...page.items.filter((item) => !item.id.startsWith(OPTIMISTIC_PREFIX))],
              }
            : page,
        ),
      };
    },
  );
}

export function clearOptimisticMessages(queryClient: QueryClient, chatId: string) {
  queryClient.setQueryData(
    ["chats", chatId, "messages"],
    (current: { pages: { items: Message[]; nextCursor: string | null }[]; pageParams: unknown[] } | undefined) => {
      if (!current) return current;
      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.filter((item) => !item.id.startsWith(OPTIMISTIC_PREFIX)),
        })),
      };
    },
  );
}

export function dropResolvedOptimistic(messages: Message[]) {
  for (const message of messages) {
    if (message.id.startsWith(OPTIMISTIC_PREFIX) && message.role === "user") {
      rememberOutgoingClientKey(message.chatId, messageText(message), message.id);
    }
  }

  const confirmedTexts = new Set(
    messages
      .filter((message) => message.role === "user" && !message.id.startsWith(OPTIMISTIC_PREFIX))
      .map((message) => messageText(message)),
  );

  for (const message of messages) {
    if (message.role !== "user" || message.id.startsWith(OPTIMISTIC_PREFIX)) continue;
    const clientKey = clientKeysByOutgoing.get(outgoingFingerprint(message.chatId, messageText(message)));
    if (clientKey) clientKeysByServerId.set(message.id, clientKey);
  }

  return messages.filter(
    (message) => !message.id.startsWith(OPTIMISTIC_PREFIX) || !confirmedTexts.has(messageText(message)),
  );
}

function messageText(message: Message) {
  return message.blocks
    .filter((block): block is Extract<(typeof message.blocks)[number], { type: "text" }> => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
