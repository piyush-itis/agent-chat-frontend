import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { API_DOCS_URL, DevelopersBoard } from "./developers-board";

const createApiKey = vi.fn();
const listApiKeys = vi.fn();
const revokeApiKey = vi.fn();

vi.mock("@/lib/api/settings", () => ({
  createApiKey: (...args: unknown[]) => createApiKey(...args),
  listApiKeys: (...args: unknown[]) => listApiKeys(...args),
  revokeApiKey: (...args: unknown[]) => revokeApiKey(...args),
}));

function renderBoard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DevelopersBoard />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  createApiKey.mockReset();
  listApiKeys.mockReset();
  revokeApiKey.mockReset();
});

describe("DevelopersBoard", () => {
  it("links to the API docs and generates a key", async () => {
    listApiKeys.mockResolvedValue({ items: [] });
    createApiKey.mockResolvedValue({
      id: "k1",
      name: "Production",
      prefix: "gx_live_abc",
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      secret: "gx_live_abc_secret",
    });

    renderBoard();

    expect(screen.getByRole("heading", { name: "API / MCP" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /API documentation/ })).toHaveAttribute("href", API_DOCS_URL);
    expect(screen.getByRole("link", { name: "chat-agent.mintlify.site" })).toHaveAttribute("href", API_DOCS_URL);

    fireEvent.change(screen.getByLabelText("Key name"), { target: { value: "Production" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate key" }));

    await waitFor(() => {
      expect(createApiKey).toHaveBeenCalledWith("Production");
      expect(screen.getByText("gx_live_abc_secret")).toBeInTheDocument();
    });
  });
});
