"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  ArrowRightIcon,
  EllipsisVerticalIcon,
  LaptopIcon,
  MoonIcon,
  SettingsIcon,
  SparkleIcon,
  SunIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useCredits } from "@/hooks/use-credits";
import { formatCredits } from "@/lib/format-credits";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";

export function SidebarAccountMenu() {
  const { user } = useUser();
  const credits = useCredits();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const expanded = useUiStore((state) => state.accountExpanded);
  const setAccountExpanded = useUiStore((state) => state.setAccountExpanded);
  const [mounted, setMounted] = useState(false);
  const extrasRef = useRef<HTMLDivElement>(null);
  const skipHeightAnimation = useRef(true);
  const [extrasHeight, setExtrasHeight] = useState<number | "auto">(expanded ? "auto" : 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    const extras = extrasRef.current;
    if (!extras) return;

    if (skipHeightAnimation.current) {
      skipHeightAnimation.current = false;
      setExtrasHeight(expanded ? "auto" : 0);
      return;
    }

    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setExtrasHeight(expanded ? "auto" : 0);
      return;
    }

    if (expanded) {
      setExtrasHeight(extras.scrollHeight);
      const done = window.setTimeout(() => setExtrasHeight("auto"), 320);
      return () => window.clearTimeout(done);
    }

    setExtrasHeight(extras.getBoundingClientRect().height || extras.scrollHeight);
    let innerFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => setExtrasHeight(0));
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(innerFrame);
    };
  }, [expanded]);

  const name = user?.fullName ?? user?.username ?? "Account";
  const activeTheme = mounted ? (theme ?? resolvedTheme ?? "light") : "light";

  return (
    <div className="border-t border-border px-3 pb-3 pt-3">
      <button
        type="button"
        aria-expanded={expanded}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground hover:shadow-[0_6px_18px_rgba(17,17,17,0.06)] hover:ring-1 hover:ring-border"
        onClick={() => setAccountExpanded(!expanded)}
      >
        <EllipsisVerticalIcon className="size-3.5" strokeWidth={1.75} />
        {expanded ? "Less" : "More"}
      </button>

      <div
        className={cn(
          "mt-1.5 overflow-hidden bg-card text-card-foreground shadow-[0_8px_22px_rgba(17,17,17,0.06)] ring-1 ring-border",
          extrasHeight === 0 ? "rounded-full" : "rounded-[22px]",
        )}
      >
        <div
          className={cn(
            "overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            expanded ? "flex items-end" : "flex items-start",
          )}
          style={{ height: extrasHeight }}
        >
          <div
            ref={extrasRef}
            inert={!expanded}
            aria-hidden={!expanded}
            className={cn(
              "w-full px-2.5 pt-2 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              expanded ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            )}
          >
              <div className="flex items-center justify-between px-0.5 text-[12px] text-foreground">
                <span>Available Credits</span>
                <span>{formatCredits(credits.data?.balance)}</span>
              </div>

              <button
                type="button"
                className="mt-1.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-[12px] font-medium text-primary-foreground"
                onClick={() => toast.message("Credit top-up isn’t available in this workspace.")}
              >
                <WalletIcon className="size-3.5" strokeWidth={1.75} />
                Add Credits
              </button>

              <div className="mt-1.5 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  className="flex h-8 items-center justify-center gap-1 rounded-full bg-muted text-[12px] text-foreground"
                  onClick={() => toast.message("Not available in this workspace.")}
                >
                  <SettingsIcon className="size-3.5" strokeWidth={1.75} />
                  Settings
                </button>
                <button
                  type="button"
                  className="relative flex h-8 items-center justify-center gap-1 rounded-full bg-muted text-[12px] text-foreground"
                  onClick={() => toast.message("You’re on the latest workspace updates.")}
                >
                  <SparkleIcon className="size-3.5" strokeWidth={1.75} />
                  Updates
                  <span className="absolute top-1.5 right-2 size-1 rounded-full bg-[#3b82f6]" />
                </button>
              </div>

              <button
                type="button"
                className="mt-1 flex h-8 w-full items-center justify-between rounded-full bg-muted px-2.5 text-[12px] text-foreground"
                onClick={() => toast.message("Team invites aren’t available in this workspace.")}
              >
                <span className="flex items-center gap-1">
                  <UsersIcon className="size-3.5" strokeWidth={1.75} />
                  Invite team members
                </span>
                <ArrowRightIcon className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
              </button>

              <div className="mt-1.5 flex h-8 items-center justify-between rounded-full bg-muted px-3">
                <ThemeOption label="System theme" active={activeTheme === "system"} onClick={() => setTheme("system")}>
                  <LaptopIcon className="size-3.5" strokeWidth={1.75} />
                </ThemeOption>
                <ThemeOption label="Light theme" active={activeTheme === "light"} onClick={() => setTheme("light")}>
                  <SunIcon className="size-3.5" strokeWidth={1.75} />
                </ThemeOption>
                <ThemeOption label="Dark theme" active={activeTheme === "dark"} onClick={() => setTheme("dark")}>
                  <MoonIcon className="size-3.5" strokeWidth={1.75} />
                </ThemeOption>
              </div>
            </div>
          </div>

        <UserRow
          name={name}
          imageUrl={user?.imageUrl}
          className={cn("px-2.5 transition-[padding] duration-300 motion-reduce:transition-none", expanded ? "pt-2 pb-2" : "py-1.5")}
        />
      </div>
    </div>
  );
}

function UserRow({
  name,
  imageUrl,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <UserAvatar name={name} imageUrl={imageUrl} />
      <span className="truncate text-[13px] text-foreground">{name}</span>
    </div>
  );
}

function ThemeOption({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-6 items-center justify-center rounded-full text-muted-foreground",
        active && "bg-background text-foreground shadow-sm",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function UserAvatar({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className="size-6 rounded-full object-cover" />
    );
  }
  return (
    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-foreground">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
