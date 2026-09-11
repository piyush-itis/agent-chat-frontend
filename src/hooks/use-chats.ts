import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { createChat, deleteChat, favoriteChat, getChat, listChats, pinChat } from "@/lib/api/chats";

export function useChatList(q?: string) {
  return useInfiniteQuery({
    queryKey: ["chats", q ?? ""],
    queryFn: ({ pageParam }) => listChats(pageParam, q),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useChat(chatId: string | undefined) {
  return useQuery({
    queryKey: ["chats", chatId],
    queryFn: () => getChat(chatId!),
    enabled: Boolean(chatId),
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => createChat(title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats"] }),
  });
}

export function useFavoriteChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, favorited }: { chatId: string; favorited: boolean }) =>
      favoriteChat(chatId, favorited),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats"] }),
  });
}

export function usePinChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, pinned }: { chatId: string; pinned: boolean }) => pinChat(chatId, pinned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats"] }),
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => deleteChat(chatId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chats"] }),
  });
}
