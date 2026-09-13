"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { MessageList, mergeMessages } from "./message-list";
import { Composer } from "./composer";
import { InspectorPanel } from "./inspector-panel";
import { QuestionDock } from "./question-dock";
import { WaitpointOverlay } from "./waitpoint-overlay";
import type { InspectorTarget } from "./work-timeline";
import { HomeLanding } from "./home-landing";
import { useChat, useCreateChat } from "@/hooks/use-chats";
import { useMessages } from "@/hooks/use-messages";
import { useRun } from "@/hooks/use-run";
import { sendTurn } from "@/lib/api/messages";
import { stopRun } from "@/lib/api/runs";
import {
  clearOptimisticMessages,
  dropResolvedOptimistic,
  makeOptimisticUserMessage,
  seedOptimisticMessage,
} from "@/lib/optimistic-message";
import { questionsWaitpointFromRun } from "@/lib/pending-questions";
import { useUiStore } from "@/stores/ui";
import type { Attachment, RealtimeAccess } from "@/generated/api";

export function ChatWorkspace({ chatId }: { chatId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const chat = useChat(chatId);
  const messages = useMessages(chatId);
  const createChat = useCreateChat();
  const pendingOutgoing = useUiStore((state) => state.pendingOutgoing);
  const setPendingOutgoing = useUiStore((state) => state.setPendingOutgoing);
  const setComposerDraft = useUiStore((state) => state.setComposerDraft);
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const [seedRealtime, setSeedRealtime] = useState<RealtimeAccess | undefined>();
  const [sending, setSending] = useState(false);
  const [inspect, setInspect] = useState<InspectorTarget | null>(null);
  const runId = pendingRunId ?? chat.data?.activeRunId ?? null;
  const run = useRun(runId, seedRealtime);
  const history = dropResolvedOptimistic(messages.data?.pages.flatMap((page) => page.items) ?? []);
  const visible = mergeMessages(history, run.data);
  const questionsWaitpoint = questionsWaitpointFromRun(runId, run.data?.waitpoint, visible);
  const questionsOpen = Boolean(questionsWaitpoint);
  const outgoingHere = Boolean(chatId && pendingOutgoing?.chatId === chatId);
  const otherWaitpoint =
    run.data?.waitpoint &&
    run.data.waitpoint.status === "open" &&
    run.data.waitpoint.kind !== "questions"
      ? run.data.waitpoint
      : null;

  useEffect(() => {
    setPendingRunId(null);
    setSeedRealtime(undefined);
  }, [chatId]);

  useEffect(() => {
    if (run.data && isActive(run.data.status) && pendingOutgoing?.chatId === chatId) {
      setPendingOutgoing(null);
    }
  }, [run.data, chatId, pendingOutgoing?.chatId, setPendingOutgoing]);

  useEffect(() => {
    if (run.data && !isActive(run.data.status)) {
      void queryClient.invalidateQueries({ queryKey: ["chats", chatId, "messages"] });
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
    }
  }, [run.data, chatId, queryClient]);

  async function handleSend(text: string, attachments: Attachment[], planMode: boolean) {
    const attachmentIds = attachments.map((item) => item.id);
    setSending(true);
    try {
      let id = chatId;
      if (!id) {
        const created = await createChat.mutateAsync();
        id = created.id;
        beginOptimistic(id, text, attachments);
        router.push(`/c/${id}`);
      } else {
        beginOptimistic(id, text, attachments);
      }
      const result = await sendTurn(id, {
        text,
        model: "openrouter/free",
        clientIdempotencyKey: crypto.randomUUID(),
        attachmentIds,
        planMode,
      });
      setPendingRunId(result.runId);
      setSeedRealtime(result.realtime);
      await queryClient.invalidateQueries({ queryKey: ["chats", id, "messages"] });
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
    } catch (error) {
      if (chatId) clearOptimisticMessages(queryClient, chatId);
      setPendingOutgoing(null);
      setComposerDraft(text);
      throw error;
    } finally {
      setSending(false);
    }
  }

  function beginOptimistic(id: string, text: string, attachments: Attachment[]) {
    const message = makeOptimisticUserMessage(id, text, attachments);
    seedOptimisticMessage(queryClient, id, message);
    setPendingOutgoing({ chatId: id, text, attachments });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activeChatId={chatId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {chatId ? (
          <>
            <div className="flex min-h-0 flex-1">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
                <MessageList
                  messages={history}
                  pendingThinking={outgoingHere && !run.data}
                  liveRun={
                    run.data
                      ? { ...run.data, waitpoint: questionsWaitpoint ?? run.data.waitpoint }
                      : undefined
                  }
                  onInspect={setInspect}
                />
                <div id="task-attachments" />
              </div>
              {inspect ? <InspectorPanel target={inspect} onClose={() => setInspect(null)} /> : null}
            </div>
            {questionsOpen && questionsWaitpoint && runId ? (
              <QuestionDock
                runId={runId}
                waitpoint={questionsWaitpoint}
                onDone={() => {
                  void queryClient.invalidateQueries({ queryKey: ["runs", runId] });
                  void queryClient.invalidateQueries({ queryKey: ["chats", chatId, "messages"] });
                }}
              />
            ) : (
              <Composer
                chatId={chatId}
                disabled={createChat.isPending}
                sending={sending}
                active={Boolean((run.data && isActive(run.data.status)) || outgoingHere)}
                stopping={run.data?.status === "stopping"}
                onStop={async () => {
                  if (!runId) return;
                  await stopRun(runId);
                  await queryClient.invalidateQueries({ queryKey: ["runs", runId] });
                }}
                onSend={handleSend}
              />
            )}
          </>
        ) : (
          <HomeLanding sending={sending} onSend={handleSend} />
        )}
      </div>
      {otherWaitpoint && run.data ? (
        <WaitpointOverlay
          runId={run.data.id}
          waitpoint={otherWaitpoint}
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
