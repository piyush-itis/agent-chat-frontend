"use client";

import type { GeneratedAsset } from "@/generated/api";

export function ArtifactPanel({
  assets,
  onClose,
}: {
  assets: GeneratedAsset[];
  onClose: () => void;
}) {
  if (assets.length === 0) return null;
  const latest = assets[assets.length - 1];
  const src = latest.durableUrl ?? latest.url;

  return (
    <aside className="hidden h-full w-80 shrink-0 flex-col border-l border-border bg-sidebar lg:flex">
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <p className="text-sm font-medium">Artifacts</p>
        <button type="button" className="text-xs text-muted-foreground" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {latest.kind === "video" ? (
          <video src={src} controls className="w-full rounded-lg" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Generated artifact" className="w-full rounded-lg" />
        )}
        <ol className="mt-4 space-y-2 text-xs text-muted-foreground">
          {assets.map((asset, index) => (
            <li key={asset.id}>
              {index + 1}. {asset.kind}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
