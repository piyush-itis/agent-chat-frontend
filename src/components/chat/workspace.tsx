"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MenuIcon } from "lucide-react";
import { Sidebar } from "./sidebar";
import { MessageList } from "./message-list";
import { Composer } from "./composer";
import { ArtifactPanel } from "./artifact-panel";
import { WaitpointOverlay } from "./waitpoint-overlay";
import { useChat, useCreateChat } from "@/hooks/use-chats";
import { useMessages } from "@/hooks/use-messages";
import { useRun } from "@/hooks/use-run";
import { sendTurn } from "@/lib/api/messages";
import { stopRun } from "@/lib/api/runs";
import { useUiStore } from "@/stores/ui";

export function ChatWorkspace({ chatId }: { chatId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const chat = useChat(chatId);
  const messages = useMessages(chatId);
  const createChat = useCreateChat();
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [artifactOpen, setArtifactOpen] = useState(true);
  const runId = pendingRunId ?? chat.data?.activeRunId ?? null;
  const run = useRun(runId);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  useEffect(() => {
    setPendingRunId(null);
  }, [chatId]);

  useEffect(() => {
    if (run.data && !isActive(run.data.status)) {
      void queryClient.invalidateQueries({ queryKey: ["chats", chatId, "messages"] });
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
    }
  }, [run.data, chatId, queryClient]);

  useEffect(() => {
    if ((run.data?.generatedAssets.length ?? 0) > 0) setArtifactOpen(true);
  }, [run.data?.generatedAssets.length]);

  const history = messages.data?.pages.flatMap((page) => page.items) ?? [];
  const assets = run.data?.generatedAssets ?? [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activeChatId={chatId} />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-3 border-b border-border px-4 text-sm md:px-5">
          <button
            type="button"
            className="md:hidden"
            aria-label="Open sidebar"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="size-4" />
          </button>
          <span className="truncate">{chat.data?.title ?? "Galaxy Agent Chat"}</span>
        </header>
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <MessageList messages={history} liveRun={run.data} />
          </div>
          {artifactOpen && assets.length > 0 ? (
            <ArtifactPanel assets={assets} onClose={() => setArtifactOpen(false)} />
          ) : null}
        </div>
        <Composer
          chatId={chatId}
          disabled={createChat.isPending}
          sending={sending}
          active={Boolean(run.data && isActive(run.data.status))}
          stopping={run.data?.status === "stopping"}
          onStop={async () => {
            if (!runId) return;
            await stopRun(runId);
            await queryClient.invalidateQueries({ queryKey: ["runs", runId] });
          }}
          onSend={async (text, attachmentIds, planMode) => {
            setSending(true);
            try {
              let id = chatId;
              if (!id) {
                const created = await createChat.mutateAsync();
                id = created.id;
                const result = await sendTurn(id, {
                  text,
                  model: "openrouter/free",
                  clientIdempotencyKey: crypto.randomUUID(),
                  attachmentIds,
                  planMode,
                });
                setPendingRunId(result.runId);
                router.push(`/c/${id}`);
                return;
              }
              const result = await sendTurn(id, {
                text,
                model: "openrouter/free",
                clientIdempotencyKey: crypto.randomUUID(),
                attachmentIds,
                planMode,
              });
              setPendingRunId(result.runId);
              await queryClient.invalidateQueries({ queryKey: ["chats", id, "messages"] });
              await queryClient.invalidateQueries({ queryKey: ["chats"] });
            } finally {
              setSending(false);
            }
          }}
        />
      </main>
      {run.data?.status === "waiting" && run.data.waitpoint ? (
        <WaitpointOverlay
          runId={run.data.id}
          waitpoint={run.data.waitpoint}
          onDone={() => {
            void queryClient.invalidateQueries({ queryKey: ["runs", run.data?.id] });
            void queryClient.invalidateQueries({ queryKey: ["chats", chatId, "messages"] });
          }}
        />
      ) : null}
    </div>
  );
}

function isActive(status: string) {
  return ["queued", "thinking", "working", "waiting", "stopping"].includes(status);
}
