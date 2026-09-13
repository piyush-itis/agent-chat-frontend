"use client";

import type { InspectorTarget } from "./work-timeline";

export function InspectorPanel({
  target,
  onClose,
}: {
  target: InspectorTarget;
  onClose: () => void;
}) {
  return (
    <aside className="hidden h-full w-[360px] shrink-0 flex-col border-l border-border bg-card lg:flex">
      <div className="flex h-11 items-center justify-between px-4">
        <p className="text-sm font-medium">{target.title}</p>
        <button type="button" aria-label="Close inspector" className="text-[16px] text-muted-foreground" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="space-y-4">
          {target.fields.map((field) => (
            <div key={field.label}>
              <p className="text-[12px] text-muted-foreground">{field.label}</p>
              <p className="mt-1 min-w-0 break-words text-[13px] leading-6 text-foreground">{field.value}</p>
            </div>
          ))}
        </div>
        {target.asset ? (
          target.asset.kind === "video" ? (
            <video src={target.asset.durableUrl ?? target.asset.url} controls className="mt-6 w-full rounded-2xl" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={target.asset.durableUrl ?? target.asset.url}
              alt={target.title}
              className="mt-6 w-full rounded-2xl"
            />
          )
        ) : null}
      </div>
    </aside>
  );
}
