"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createApiKey,
  createWebhook,
  deleteWebhook,
  listApiKeys,
  listWebhooks,
  revokeApiKey,
} from "@/lib/api/settings";

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
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-sm text-muted-foreground underline">
        Back to chat
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Developer settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Public API keys are shown once. Use them as <code>Authorization: Bearer</code> on{" "}
        <code>/v1</code>.
      </p>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">API keys</h2>
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            onClick={() => createKey.mutate()}
          >
            Create key
          </button>
        </div>
        {secret ? (
          <p className="mt-3 break-all rounded-lg border border-border bg-card p-3 text-sm">
            Copy now: {secret}
          </p>
        ) : null}
        <ul className="mt-4 space-y-2">
          {(keys.data?.items ?? []).map((key) => (
            <li key={key.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span>
                {key.name} · {key.prefix}…
              </span>
              <button type="button" className="text-destructive" onClick={() => revoke.mutate(key.id)}>
                Revoke
              </button>
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
          <input
            value={hookUrl}
            onChange={(event) => setHookUrl(event.target.value)}
            placeholder="https://example.com/webhooks"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            Add
          </button>
        </form>
        {hookSecret ? (
          <p className="mt-3 break-all rounded-lg border border-border bg-card p-3 text-sm">
            Signing secret (copy now): {hookSecret}
          </p>
        ) : null}
        <ul className="mt-4 space-y-2">
          {(hooks.data?.items ?? []).map((hook) => (
            <li key={hook.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span className="truncate">{hook.url}</span>
              <button type="button" className="text-destructive" onClick={() => removeHook.mutate(hook.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
