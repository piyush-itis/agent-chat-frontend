"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  ArrowRightIcon,
  GripVerticalIcon,
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
import { LIMITS } from "@/generated/api";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";

export function SidebarAccountMenu() {
  const { user } = useUser();
  const credits = useCredits();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const expanded = useUiStore((state) => state.accountExpanded);
  const setAccountExpanded = useUiStore((state) => state.setAccountExpanded);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const name = user?.fullName ?? user?.username ?? "Account";
  const grantDate = user?.createdAt ? formatGrantDate(user.createdAt) : null;
  const activeTheme = mounted ? (theme ?? resolvedTheme ?? "light") : "light";

  return (
    <div className="px-3 pb-3">
      {expanded ? (
        <div className="rounded-[28px] bg-card px-3.5 py-3 text-card-foreground shadow-[0_10px_30px_rgba(17,17,17,0.06)] ring-1 ring-border">
          <button
            type="button"
            className="flex items-center gap-2 text-[14px] text-muted-foreground"
            onClick={() => setAccountExpanded(false)}
          >
            <GripVerticalIcon className="size-4" strokeWidth={1.75} />
            Less
          </button>

          <div className="mt-3 flex items-center justify-between px-0.5 text-[14px] text-foreground">
            <span>Available Credits</span>
            <span>{formatCredits(credits.data?.balance)}</span>
          </div>

          {grantDate ? (
            <p className="mt-2.5 rounded-full bg-[#e8f8ee] px-3 py-1.5 text-center text-[13px] text-[#22a55a]">
              +{formatCredits(LIMITS.initialGrant)} credits on {grantDate}
            </p>
          ) : null}

          <button
            type="button"
            className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-[14px] font-medium text-primary-foreground"
            onClick={() => toast.message("Credit top-up isn’t available in this workspace.")}
          >
            <WalletIcon className="size-4" strokeWidth={1.75} />
            Add Credits
          </button>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Link
              href="/settings"
              className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-muted text-[14px] text-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <SettingsIcon className="size-4" strokeWidth={1.75} />
              Settings
            </Link>
            <button
              type="button"
              className="relative flex h-10 items-center justify-center gap-1.5 rounded-full bg-muted text-[14px] text-foreground"
              onClick={() => toast.message("You’re on the latest workspace updates.")}
            >
              <SparkleIcon className="size-4" strokeWidth={1.75} />
              Updates
              <span className="absolute top-2 right-2.5 size-1.5 rounded-full bg-[#3b82f6]" />
            </button>
          </div>

          <button
            type="button"
            className="mt-1.5 flex h-10 w-full items-center justify-between rounded-full bg-muted px-3.5 text-[14px] text-foreground"
            onClick={() => toast.message("Team invites aren’t available in this workspace.")}
          >
            <span className="flex items-center gap-1.5">
              <UsersIcon className="size-4" strokeWidth={1.75} />
              Invite team members
            </span>
            <ArrowRightIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />
          </button>

          <div className="mt-2 flex h-10 items-center justify-between rounded-full bg-muted px-4">
            <ThemeOption label="System theme" active={activeTheme === "system"} onClick={() => setTheme("system")}>
              <LaptopIcon className="size-4" strokeWidth={1.75} />
            </ThemeOption>
            <ThemeOption label="Light theme" active={activeTheme === "light"} onClick={() => setTheme("light")}>
              <SunIcon className="size-4" strokeWidth={1.75} />
            </ThemeOption>
            <ThemeOption label="Dark theme" active={activeTheme === "dark"} onClick={() => setTheme("dark")}>
              <MoonIcon className="size-4" strokeWidth={1.75} />
            </ThemeOption>
          </div>

          <UserRow name={name} imageUrl={user?.imageUrl} className="mt-3 px-1" />
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="flex items-center gap-2 px-1 text-[14px] text-muted-foreground"
            onClick={() => setAccountExpanded(true)}
          >
            <GripVerticalIcon className="size-4" strokeWidth={1.75} />
            More
          </button>
          <UserRow
            name={name}
            imageUrl={user?.imageUrl}
            className="mt-2 rounded-full bg-card px-3 py-2 shadow-[0_8px_24px_rgba(17,17,17,0.06)] ring-1 ring-border"
          />
        </div>
      )}
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
    <div className={cn("flex items-center gap-3", className)}>
      <UserAvatar name={name} imageUrl={imageUrl} />
      <span className="truncate text-[15px] text-foreground">{name}</span>
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
        "flex size-7 items-center justify-center rounded-full text-muted-foreground",
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
      <img src={imageUrl} alt="" className="size-8 rounded-full object-cover" />
    );
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[12px] font-medium text-foreground">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function formatGrantDate(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const month = date.toLocaleString("en-GB", { month: "long" });
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  return `${day} ${month} '${year}`;
}
