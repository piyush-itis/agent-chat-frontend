import { describe, expect, it } from "vitest";
import { formatCredits } from "./format-credits";

describe("formatCredits", () => {
  it("formats wallet balances as Magica M units", () => {
    expect(formatCredits(undefined)).toBe("—");
    expect(formatCredits(0)).toBe("0.00M");
    expect(formatCredits(9_800_000)).toBe("9.80M");
    expect(formatCredits(214_032)).toBe("0.21M");
  });
});
