import type { ContentBlock, GeneratedAsset } from "@/generated/api";

export function urlsFromToolOutput(output: unknown): string[] {
  const record = output && typeof output === "object" ? (output as Record<string, unknown>) : {};
  const urls: string[] = [];
  for (const key of ["image_url", "video_url", "url"]) {
    if (typeof record[key] === "string") urls.push(record[key]);
  }
  for (const key of ["image_urls", "urls"]) {
    const value = record[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") urls.push(item);
      }
    }
  }
  return [...new Set(urls.filter((url) => /^https?:\/\//.test(url)))];
}

export function kindFromUrl(url: string): GeneratedAsset["kind"] {
  return /\.(mp4|webm)(?:\?|$)/i.test(url) ? "video" : "image";
}

export function assetFromUrl(id: string, url: string, assets?: GeneratedAsset[]): GeneratedAsset {
  const match = assets?.find((asset) => asset.url === url || asset.durableUrl === url);
  if (match) return match;
  return {
    id,
    kind: kindFromUrl(url),
    url,
    durableUrl: null,
    mimeType: null,
    createdAt: new Date(0).toISOString(),
  };
}

export function mediaFromBlocks(blocks: ContentBlock[], assets?: GeneratedAsset[]): GeneratedAsset[] {
  const found: GeneratedAsset[] = [...(assets ?? [])];
  for (const block of blocks) {
    if (block.type !== "tool_result") continue;
    for (const [index, url] of urlsFromToolOutput(block.output).entries()) {
      if (found.some((asset) => asset.url === url || asset.durableUrl === url)) continue;
      found.push(assetFromUrl(`${block.invocationId}-${index}`, url, assets));
    }
  }
  return found;
}

export function resolveMediaSrc(url: string, assets?: GeneratedAsset[]) {
  const match = assets?.find((asset) => asset.url === url || asset.durableUrl === url);
  return match?.durableUrl ?? match?.url ?? url;
}
