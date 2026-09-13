"use client";

import { useState } from "react";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/generated/api";
import { Composer } from "./composer";
import { MagicaMark } from "./magica-mark";

const CHIPS = [
  { id: "all", label: "All", prompt: "" },
  {
    id: "viral",
    label: "Viral Video Formats",
    prompt: "Propose a viral short-form video format and generate a hero image for it.",
  },
  {
    id: "effects",
    label: "Video Special Effects",
    prompt: "Plan a video special-effects sequence I can merge from two clips.",
  },
  {
    id: "content",
    label: "Content Creation",
    prompt: "Draft a content brief and generate a matching image.",
  },
  {
    id: "brand",
    label: "Branding & Design",
    prompt: "Create a branding concept and generate a logo-style image.",
  },
  {
    id: "image",
    label: "Image & Editing",
    prompt: "Generate an image, then crop it to a tight square.",
  },
];

const TILES = [
  { src: "/tiles/lava.jpg", alt: "Volcanic landscape" },
  { src: "/tiles/leaves.jpg", alt: "Green leaves" },
  { src: "/tiles/temple.jpg", alt: "Temple architecture" },
];

export function HomeLanding({
  sending,
  onSend,
}: {
  sending?: boolean;
  onSend: (text: string, attachments: Attachment[], planMode: boolean) => Promise<void>;
}) {
  const [chip, setChip] = useState("all");
  const setDraft = useUiStore((state) => state.setComposerDraft);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 pb-16 pt-16">
      <MagicaMark className="size-10" />
      <h1 className="mt-6 text-[32px] font-semibold tracking-tight">Your AI worker</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">Work at the speed of thought.</p>

      <div className="mt-10 w-full">
        <Composer variant="home" sending={sending} onSend={onSend} />
      </div>

      <div className="mt-8 flex w-full max-w-[720px] flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">
        {CHIPS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "text-muted-foreground hover:text-foreground",
              chip === item.id && "font-medium text-foreground",
            )}
            onClick={() => {
              setChip(item.id);
              if (item.prompt) setDraft(item.prompt);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid w-full max-w-[720px] grid-cols-3 gap-3">
        {TILES.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.src}
            src={tile.src}
            alt={tile.alt}
            className="h-[148px] w-full rounded-2xl object-cover"
          />
        ))}
      </div>
    </div>
  );
}
