"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createApiKey,
  createWebhook,
  deleteWebhook,
  listApiKeys,
  listWebhooks,
  revokeApiKey,
} from "@/lib/api/settings";
import { Sidebar } from "@/components/chat/sidebar";
import { TopBar } from "@/components/chat/top-bar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const keys = useQuery({ queryKey: ["api-keys"], queryFn: listApiKeys });
  const hooks = useQuery({ queryKey: ["webhooks"], queryFn: listWebhooks });
  const [secret, setSecret] = useState<string | null>(null);
  const [hookSecret, setHookSecret] = useState<string | null>(null);
  const [hookUrl, setHookUrl] = useState("");

  const createKey = useMutation({
    mutationFn: () => createApiKey("Default"),
    onSuccess: (data) => {
      setSecret(data.secret ?? null);
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
  const revoke = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });
  const addHook = useMutation({
    mutationFn: () => createWebhook(hookUrl),
    onSuccess: (data) => {
      setHookSecret(data.secret ?? null);
      setHookUrl("");
      void queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
  const removeHook = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Public API keys are shown once. Use them as <code>Authorization: Bearer</code> on{" "}
            <code>/v1</code>. MCP is not part of this app.
          </p>

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">API keys</h2>
              <Button type="button" className="rounded-full" onClick={() => createKey.mutate()}>
                Create key
              </Button>
            </div>
            {secret ? (
              <Alert className="mt-3">
                <AlertDescription>Copy now: {secret}</AlertDescription>
              </Alert>
            ) : null}
            <ul className="mt-4 space-y-2">
              {(keys.data?.items ?? []).map((key) => (
                <li
                  key={key.id}
                  className="flex items-center justify-between rounded-2xl border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {key.name} · {key.prefix}…
                  </span>
                  <Button type="button" variant="destructive" size="sm" onClick={() => revoke.mutate(key.id)}>
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-medium">Webhooks</h2>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (hookUrl) addHook.mutate();
              }}
            >
              <Input
                value={hookUrl}
                onChange={(event) => setHookUrl(event.target.value)}
                placeholder="https://example.com/webhooks"
                className="flex-1 rounded-full"
              />
              <Button type="submit" className="rounded-full">
                Add
              </Button>
            </form>
            {hookSecret ? (
              <p className="mt-3 break-all rounded-2xl border border-border bg-secondary p-3 text-sm">
                Signing secret (copy now): {hookSecret}
              </p>
            ) : null}
            <ul className="mt-4 space-y-2">
              {(hooks.data?.items ?? []).map((hook) => (
                <li
                  key={hook.id}
                  className="flex items-center justify-between rounded-2xl border border-border px-3 py-2 text-sm"
                >
                  <span className="truncate">{hook.url}</span>
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeHook.mutate(hook.id)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}
