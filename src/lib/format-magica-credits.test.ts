import { describe, expect, it } from "vitest";
import { formatMagicaCredits } from "./format-magica-credits";

describe("formatMagicaCredits", () => {
  it("formats Magica units as M credits", () => {
    expect(formatMagicaCredits(10000)).toBe("0.01M credits");
    expect(formatMagicaCredits(240000)).toBe("0.24M credits");
    expect(formatMagicaCredits(214032)).toBe("0.21M credits");
    expect(formatMagicaCredits(0)).toBe("0.00M credits");
  });
});
