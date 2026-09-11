import { apiFetch } from "./client";

export type ApiKeyItem = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  secret?: string;
};

export type WebhookItem = {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
  secret?: string;
};

export function listApiKeys() {
  return apiFetch<{ items: ApiKeyItem[] }>("/api/me/api-keys");
}

export function createApiKey(name: string) {
  return apiFetch<ApiKeyItem>("/api/me/api-keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function revokeApiKey(keyId: string) {
  return apiFetch<{ ok: true }>(`/api/me/api-keys/${keyId}`, { method: "DELETE" });
}

export function listWebhooks() {
  return apiFetch<{ items: WebhookItem[] }>("/api/me/webhooks");
}

export function createWebhook(url: string) {
  return apiFetch<WebhookItem>("/api/me/webhooks", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export function deleteWebhook(id: string) {
  return apiFetch<{ ok: true }>(`/api/me/webhooks/${id}`, { method: "DELETE" });
}
