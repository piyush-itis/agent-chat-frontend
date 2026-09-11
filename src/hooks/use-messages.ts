import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMessages, sendTurn } from "@/lib/api/messages";

export function useMessages(chatId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["chats", chatId, "messages"],
    queryFn: ({ pageParam }) => listMessages(chatId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(chatId),
  });
}

export function useSendTurn(chatId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      sendTurn(chatId!, {
        text,
        model: "openrouter/free",
        clientIdempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chats", chatId, "messages"] });
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      await queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
  });
}
