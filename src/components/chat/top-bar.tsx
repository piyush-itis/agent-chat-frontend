"use client";

import { ChevronDownIcon, FolderIcon, MenuIcon, SparkleIcon } from "lucide-react";
import { toast } from "sonner";
import { useCredits } from "@/hooks/use-credits";
import { formatCredits } from "@/lib/format-credits";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";
import { MagicaHeaderMark } from "./magica-mark";

const UNAVAILABLE = "Not available in this workspace.";

export function TopBar() {
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const credits = useCredits();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-3 md:px-5">
      <button
        type="button"
        className={cn(
          "flex size-8 items-center justify-center rounded-full text-foreground hover:bg-muted",
          sidebarCollapsed ? "" : "md:hidden",
        )}
        aria-label="Open sidebar"
        onClick={() => {
          setSidebarCollapsed(false);
          setSidebarOpen(true);
        }}
      >
        <MenuIcon className="size-[18px]" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-foreground"
        aria-label="OpenRouter Free"
      >
        <MagicaHeaderMark className="size-4" />
        Magica Auto
        <ChevronDownIcon className="size-3.5 text-muted-foreground" strokeWidth={2} />
      </button>
      <div className="ml-auto flex items-center gap-2.5">
        <button
          type="button"
          aria-label="Files"
          className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
          onClick={() => toast.message(UNAVAILABLE)}
        >
          <FolderIcon className="size-4" strokeWidth={1.75} />
        </button>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium tabular-nums text-foreground">
          <SparkleIcon className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
          {formatCredits(credits.data?.balance)}
        </span>
      </div>
    </header>
  );
}
