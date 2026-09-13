import { describe, expect, it } from "vitest";
import { dropResolvedOptimistic, makeOptimisticUserMessage } from "./optimistic-message";

describe("optimistic messages", () => {
  it("drops the optimistic user row once the real message arrives", () => {
    const optimistic = makeOptimisticUserMessage("c1", "crop this image", []);
    const confirmed = {
      ...optimistic,
      id: "u-real",
    };
    expect(dropResolvedOptimistic([optimistic, confirmed])).toEqual([confirmed]);
    expect(dropResolvedOptimistic([optimistic])).toEqual([optimistic]);
  });
});
