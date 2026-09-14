"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRightIcon, CheckIcon, CopyIcon, KeyRoundIcon, MenuIcon } from "lucide-react";
import { toast } from "sonner";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api/settings";
import { ApiClientError } from "@/lib/api/client";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";

export const API_DOCS_URL = "https://chat-agent.mintlify.site/";

export function DevelopersBoard() {
  const queryClient = useQueryClient();
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const keys = useQuery({ queryKey: ["api-keys"], queryFn: listApiKeys });
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createKey = useMutation({
    mutationFn: () => createApiKey(name.trim() || "Default"),
    onSuccess: (data) => {
      setSecret(data.secret ?? null);
      setCopied(false);
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) => {
      toast.message(error instanceof ApiClientError ? error.message : "Couldn’t create an API key.");
    },
  });

  const revoke = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
    onError: (error) => {
      toast.message(error instanceof ApiClientError ? error.message : "Couldn’t revoke this key.");
    },
  });

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="px-6 pt-5 pb-12 md:px-10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-foreground hover:bg-muted",
              sidebarCollapsed ? "" : "md:hidden",
            )}
            aria-label="Open sidebar"
            onClick={() => {
              setSidebarCollapsed(false);
              setSidebarOpen(true);
            }}
          >
            <MenuIcon className="size-[18px]" strokeWidth={1.75} />
          </button>
          <h1 className="text-[28px] font-medium tracking-[-0.03em] text-foreground">API / MCP</h1>
        </div>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Generate a <span className="text-foreground">gx_live_</span> key and call the public REST API from your
          server. Every mutating request returns <span className="text-foreground">202</span> — then poll the run.
        </p>

        <a
          href={API_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/50"
        >
          <div>
            <p className="text-[15px] font-medium text-foreground">API documentation</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Auth, async runs, tools, and webhooks — {API_DOCS_URL.replace(/\/$/, "")}
            </p>
          </div>
          <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        </a>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-medium text-foreground">API keys</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                The secret is shown once. Use it as <span className="text-foreground">Authorization: Bearer</span>.
              </p>
            </div>
          </div>

          <form
            className="mt-5 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              createKey.mutate();
            }}
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Key name (optional)"
              aria-label="Key name"
              className="h-10 flex-1 rounded-full border border-border bg-transparent px-4 text-[14px] text-foreground outline-none placeholder:text-muted-foreground transition-colors hover:border-foreground/20 focus-visible:border-foreground/25"
            />
            <button
              type="submit"
              disabled={createKey.isPending}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-opacity disabled:opacity-60"
            >
              <KeyRoundIcon className="size-3.5" strokeWidth={1.75} />
              {createKey.isPending ? "Generating…" : "Generate key"}
            </button>
          </form>

          {secret ? (
            <div className="mt-5 rounded-2xl border border-border bg-card px-5 py-4">
              <p className="text-[13px] text-muted-foreground">Copy this key now. It won’t be shown again.</p>
              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">{secret}</code>
                <button
                  type="button"
                  onClick={() => void copySecret()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] text-foreground transition-colors hover:bg-muted"
                >
                  {copied ? (
                    <CheckIcon className="size-3.5" strokeWidth={1.75} />
                  ) : (
                    <CopyIcon className="size-3.5" strokeWidth={1.75} />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : null}

          <ul className="mt-6 divide-y divide-border border-t border-border">
            {(keys.data?.items ?? []).length === 0 && !keys.isLoading ? (
              <li className="py-10 text-[15px] text-muted-foreground">No keys yet. Generate one to call the API.</li>
            ) : (
              (keys.data?.items ?? []).map((key) => (
                <li key={key.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] text-foreground">{key.name}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {key.prefix}… · Created {formatRelativeTime(key.createdAt)}
                      {key.lastUsedAt ? ` · Last used ${formatRelativeTime(key.lastUsedAt)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-[13px] text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() => revoke.mutate(key.id)}
                  >
                    Revoke
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <p className="mt-10 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
          MCP is not a separate runtime in this workspace. Use the REST API from your server — browsers on other
          origins are blocked by CORS. Full reference:{" "}
          <a href={API_DOCS_URL} target="_blank" rel="noreferrer" className="text-foreground underline-offset-4 hover:underline">
            chat-agent.mintlify.site
          </a>
          .
        </p>
      </div>
    </div>
  );
}
