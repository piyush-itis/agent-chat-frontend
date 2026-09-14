"use client";

import { useEffect, useRef, useState } from "react";
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
  OPTIMISTIC_PREFIX,
  clearOptimisticMessages,
  dropResolvedOptimistic,
  forgetOutgoingClientKey,
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
  const [stopRequested, setStopRequested] = useState(false);
  const [sending, setSending] = useState(false);
  const [inspect, setInspect] = useState<InspectorTarget | null>(null);
  const [sendEpoch, setSendEpoch] = useState(0);
  const scrollRootRef = useRef<HTMLDivElement>(null);
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
    setStopRequested(false);
  }, [chatId]);

  useEffect(() => {
    if (!stopRequested || !runId) return;
    let cancelled = false;
    queryClient.setQueryData(["runs", runId], (current: typeof run.data) =>
      current && isActive(current.status) ? { ...current, status: "stopping" } : current,
    );
    void stopRun(runId)
      .then((result) => {
        if (!cancelled) queryClient.setQueryData(["runs", runId], result);
      })
      .catch(() => {
        if (!cancelled) setStopRequested(false);
      })
      .finally(() => {
        if (!cancelled) void queryClient.invalidateQueries({ queryKey: ["runs", runId] });
      });
    return () => {
      cancelled = true;
    };
  }, [queryClient, runId, stopRequested]);

  useEffect(() => {
    if (run.data && pendingOutgoing?.chatId === chatId) {
      setPendingOutgoing(null);
    }
  }, [run.data, chatId, pendingOutgoing?.chatId, setPendingOutgoing]);

  useEffect(() => {
    if (run.data && !isActive(run.data.status)) {
      setPendingRunId(null);
      setSeedRealtime(undefined);
      setStopRequested(false);
      void queryClient.invalidateQueries({ queryKey: ["chats", chatId, "messages"] });
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
    }
  }, [run.data, chatId, queryClient]);

  async function handleSend(text: string, attachments: Attachment[], planMode: boolean) {
    const attachmentIds = attachments.map((item) => item.id);
    const clientId = `${OPTIMISTIC_PREFIX}${crypto.randomUUID()}`;
    setSending(true);
    let id = chatId;
    try {
      if (!id) {
        const created = await createChat.mutateAsync();
        id = created.id;
        beginOptimistic(id, text, attachments, clientId);
        router.push(`/c/${id}`);
      } else {
        beginOptimistic(id, text, attachments, clientId);
      }
      const result = await sendTurn(id, {
        text,
        model: "openrouter/free",
        clientIdempotencyKey: clientId.slice(OPTIMISTIC_PREFIX.length),
        attachmentIds,
        planMode,
      });
      setPendingRunId(result.runId);
      setSeedRealtime(result.realtime);
      await queryClient.invalidateQueries({ queryKey: ["chats", id, "messages"] });
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
    } catch (error) {
      if (id) {
        clearOptimisticMessages(queryClient, id);
        forgetOutgoingClientKey(id, text);
      }
      setPendingOutgoing(null);
      setStopRequested(false);
      setComposerDraft(text);
      throw error;
    } finally {
      setSending(false);
    }
  }

  function beginOptimistic(id: string, text: string, attachments: Attachment[], clientId: string) {
    const message = makeOptimisticUserMessage(id, text, attachments, clientId);
    seedOptimisticMessage(queryClient, id, message);
    setPendingOutgoing({ chatId: id, text, attachments, clientKey: message.id });
    setSendEpoch((value) => value + 1);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activeChatId={chatId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {chatId ? (
          <>
            <div className="flex min-h-0 flex-1">
              <div
                key={chatId}
                ref={scrollRootRef}
                className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
              >
                <MessageList
                  messages={history}
                  pendingThinking={outgoingHere && !run.data}
                  stopping={stopRequested || run.data?.status === "stopping"}
                  liveRun={
                    run.data
                      ? { ...run.data, waitpoint: questionsWaitpoint ?? run.data.waitpoint }
                      : undefined
                  }
                  scrollRootRef={scrollRootRef}
                  sendEpoch={sendEpoch}
                  forceScroll={outgoingHere}
                  enterClientKey={pendingOutgoing?.chatId === chatId ? pendingOutgoing.clientKey : undefined}
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
                stopping={stopRequested || run.data?.status === "stopping"}
                onStop={async () => {
                  setStopRequested(true);
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
