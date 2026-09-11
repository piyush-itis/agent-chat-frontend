import type { ErrorEnvelope } from "@/generated/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter = async () => null;

export function setTokenGetter(getter: TokenGetter) {
  tokenGetter = getter;
}

export function getAccessToken() {
  return tokenGetter();
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public body: ErrorEnvelope,
  ) {
    super(body.message);
    this.name = "ApiClientError";
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await tokenGetter();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({
      error: "Request failed",
      message: "Request failed",
      code: "UNKNOWN",
      traceId: "",
    }))) as ErrorEnvelope;
    throw new ApiClientError(response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
