import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./format-relative-time";

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-09-14T11:00:00.000Z");

  it("formats hours the way Magica does", () => {
    expect(formatRelativeTime("2026-09-13T12:00:00.000Z", now)).toBe("23 hours ago");
  });

  it("returns just now for very recent times", () => {
    expect(formatRelativeTime("2026-09-14T10:59:40.000Z", now)).toBe("just now");
  });
});
