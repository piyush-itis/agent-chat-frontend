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
    <aside className="hidden h-full w-80 shrink-0 flex-col border-l border-border bg-card lg:flex">
      <div className="flex h-11 items-center justify-between px-4">
        <p className="text-sm font-medium">Artifacts</p>
        <button type="button" className="text-[12px] text-muted-foreground" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {latest.kind === "video" ? (
          <video src={src} controls className="w-full rounded-2xl" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Generated artifact" className="w-full rounded-2xl" />
        )}
        <ol className="mt-4 space-y-2 text-[12px] text-muted-foreground">
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
