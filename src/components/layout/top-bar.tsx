"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, History, Search, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

async function fetchProfile() {
  const res = await fetch("/api/projects?profile=1");
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{
    profile: { display_name: string; credits_remaining: number };
  }>;
}

const CRUMBS: Record<string, string> = {
  "/create": "Studio / Create New Track",
  "/library": "Library",
  "/": "Home",
};

export function TopBar() {
  const pathname = usePathname();
  const { data } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const credits = data?.profile.credits_remaining ?? 47;
  const crumb =
    CRUMBS[pathname] ||
    (pathname.startsWith("/generating")
      ? "Studio / Generating"
      : pathname.startsWith("/results")
        ? "Studio / Takes"
        : pathname.startsWith("/editor")
          ? "Studio / Editor"
          : null);
  const isCreate = pathname.startsWith("/create");

  return (
    <header className="sticky top-0 z-40 ml-16 flex h-16 w-[calc(100%-4rem)] items-center justify-between border-b border-[var(--pf-border-subtle)] bg-[var(--pf-surface)]/80 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="bg-gradient-to-r from-[var(--pf-cyan)] to-[var(--pf-magenta)] bg-clip-text font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-transparent"
        >
          Pulseforge
        </Link>
        {crumb && (
          <>
            <div className="hidden h-6 w-px bg-[var(--pf-border-subtle)] sm:block" />
            <span className="hidden text-xs uppercase tracking-wider text-[var(--pf-muted)] sm:block">
              {crumb}
            </span>
          </>
        )}
      </div>

      {!isCreate && (
        <div className="ml-4 hidden max-w-md flex-1 md:block">
          <div className="input-glow relative flex h-9 items-center rounded border border-[var(--pf-border)] bg-[#0a0a0f] transition-all">
            <Search
              className="absolute left-3 text-[var(--pf-muted)]"
              size={16}
            />
            <input
              className="h-full w-full bg-transparent pl-10 pr-14 font-[family-name:var(--font-jetbrains)] text-sm text-white placeholder:text-[var(--pf-muted)] focus:outline-none"
              placeholder="Search projects, tracks, seeds..."
            />
            <span className="absolute right-3 rounded border border-[var(--pf-border)] bg-[var(--pf-panel)] px-1.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] font-bold tracking-wider text-[var(--pf-muted)]">
              ⌘K
            </span>
          </div>
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--pf-border)] bg-[#0A0A0F] px-3 py-1.5">
          <Zap size={14} className="text-[var(--pf-magenta)]" />
          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[var(--pf-cyan)]">
            {credits}
          </span>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--pf-muted)] hover:bg-white/5 hover:text-[var(--pf-cyan)]">
          <History size={18} />
        </button>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-lg text-[var(--pf-muted)] hover:bg-white/5 hover:text-[var(--pf-cyan)]">
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--pf-magenta)] shadow-[0_0_6px_rgba(225,0,131,0.8)]" />
        </button>
        <Link
          href="/auth/login"
          className="ml-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[var(--pf-border-subtle)] bg-gradient-to-br from-cyan-500/30 to-fuchsia-600/40 text-xs font-bold text-white hover:border-[var(--pf-cyan)]"
          title="Account"
        >
          P
        </Link>
      </div>
    </header>
  );
}
