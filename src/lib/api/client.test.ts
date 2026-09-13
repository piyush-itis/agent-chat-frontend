import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { apiFetch, ApiClientError } from "./client";

const server = setupServer(
  http.get("http://localhost:3001/api/chats", () =>
    HttpResponse.json({ items: [], nextCursor: null }),
  ),
  http.post("http://localhost:3001/api/chats/c1/turns", () =>
    HttpResponse.json(
      { error: "This chat already has an active run", message: "This chat already has an active run", code: "ACTIVE_RUN", traceId: "t1" },
      { status: 409 },
    ),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("api client + MSW", () => {
  it("parses a 409 ACTIVE_RUN envelope", async () => {
    await expect(apiFetch("/api/chats/c1/turns", { method: "POST", body: "{}" })).rejects.toBeInstanceOf(
      ApiClientError,
    );
    try {
      await apiFetch("/api/chats/c1/turns", { method: "POST", body: "{}" });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      expect((error as ApiClientError).status).toBe(409);
      expect((error as ApiClientError).body.code).toBe("ACTIVE_RUN");
    }
  });
});
