import { describe, expect, it } from "vitest";
import { isTransientRealtimeError } from "./realtime-error";

describe("isTransientRealtimeError", () => {
  it("treats canceled subscribe fetches as transient", () => {
    expect(isTransientRealtimeError(new DOMException("The user aborted a request.", "AbortError"))).toBe(true);
    expect(isTransientRealtimeError(new Error("Fetch is aborted"))).toBe(true);
    expect(isTransientRealtimeError(new Error("canceled"))).toBe(true);
  });

  it("treats a real auth failure as hard", () => {
    expect(isTransientRealtimeError(new Error("Unauthorized"))).toBe(false);
  });
});
