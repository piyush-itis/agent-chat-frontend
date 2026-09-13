import { describe, expect, it } from "vitest";
import { mediaFromBlocks, urlsFromToolOutput } from "./generated-media";

describe("generated media", () => {
  it("reads image_url and image_urls from a tool result", () => {
    expect(
      urlsFromToolOutput({
        image_url: "https://cdn.example/a.png",
        image_urls: ["https://cdn.example/a.png", "https://cdn.example/b.png"],
      }),
    ).toEqual(["https://cdn.example/a.png", "https://cdn.example/b.png"]);
  });

  it("collects media from assistant tool results", () => {
    const assets = mediaFromBlocks([
      {
        type: "tool_result",
        invocationId: "g1",
        toolName: "gpt_image_2",
        output: { image_url: "https://g.tlcdn.com/gen/logo.png" },
        status: "success",
      },
    ]);
    expect(assets[0]?.url).toBe("https://g.tlcdn.com/gen/logo.png");
  });
});
