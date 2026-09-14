import { afterEach, describe, expect, it } from "vitest";
import {
  clientKeyOf,
  dropResolvedOptimistic,
  makeOptimisticUserMessage,
  resetOptimisticClientKeys,
} from "./optimistic-message";

describe("optimistic messages", () => {
  afterEach(() => {
    resetOptimisticClientKeys();
  });

  it("drops the optimistic user row once the real message arrives", () => {
    const optimistic = makeOptimisticUserMessage("c1", "crop this image", []);
    const confirmed = {
      ...optimistic,
      id: "u-real",
    };
    expect(dropResolvedOptimistic([optimistic, confirmed])).toEqual([confirmed]);
    expect(dropResolvedOptimistic([optimistic])).toEqual([optimistic]);
  });

  it("keeps the optimistic client key after the server id replaces the row", () => {
    const optimistic = makeOptimisticUserMessage("c1", "crop this image", [], "optimistic:stable-1");
    const confirmed = {
      ...optimistic,
      id: "u-real",
    };
    const first = dropResolvedOptimistic([optimistic, confirmed]);
    expect(first).toHaveLength(1);
    expect(first[0]?.id).toBe("u-real");
    expect(clientKeyOf(first[0]!)).toBe(optimistic.id);
    expect(clientKeyOf(first[0]!)).not.toBe("u-real");

    const second = dropResolvedOptimistic([confirmed]);
    expect(clientKeyOf(second[0]!)).toBe(optimistic.id);
  });
});
