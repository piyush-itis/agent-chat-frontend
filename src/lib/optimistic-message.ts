import type { QueryClient } from "@tanstack/react-query";
import type { Attachment, Message } from "@/generated/api";

export const OPTIMISTIC_PREFIX = "optimistic:";

export function makeOptimisticUserMessage(
  chatId: string,
  text: string,
  attachments: Attachment[],
): Message {
  return {
    id: `${OPTIMISTIC_PREFIX}${crypto.randomUUID()}`,
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
  const confirmed = new Set(
    messages
      .filter((message) => message.role === "user" && !message.id.startsWith(OPTIMISTIC_PREFIX))
      .map((message) => messageText(message)),
  );
  return messages.filter(
    (message) => !message.id.startsWith(OPTIMISTIC_PREFIX) || !confirmed.has(messageText(message)),
  );
}

function messageText(message: Message) {
  return message.blocks
    .filter((block): block is Extract<(typeof message.blocks)[number], { type: "text" }> => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
