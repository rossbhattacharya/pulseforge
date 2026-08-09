"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Library,
  AudioLines,
  Users,
  Settings,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/library", icon: Library, label: "Library" },
  { href: "/create", icon: AudioLines, label: "Studio" },
  { href: "#", icon: Users, label: "Collaboration", disabled: true },
  { href: "#", icon: Settings, label: "Settings", disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 z-50 flex h-full w-16 flex-col items-center border-r border-[var(--pf-border-subtle)] bg-[var(--pf-surface-low)] py-4">
      <Link
        href="/"
        className="mb-8 flex h-10 w-10 items-center justify-center rounded border border-[var(--pf-border)] bg-[#0a0a0f] font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-[var(--pf-cyan)]"
      >
        P
      </Link>
      <div className="flex w-full flex-col gap-2 px-2">
        {items.map(({ href, icon: Icon, label, disabled }) => {
          const active =
            !disabled &&
            (href === "/" ? pathname === "/" : pathname.startsWith(href));
          const Comp = disabled ? "span" : Link;
          return (
            <Comp
              key={label}
              href={disabled ? undefined! : href}
              className={cn(
                "group relative mb-1 flex h-12 w-full flex-col items-center justify-center rounded-lg transition-colors",
                active
                  ? "bg-[var(--pf-cyan)]/5 text-[var(--pf-cyan)] shadow-[0_0_8px_rgba(0,218,243,0.4)]"
                  : "text-[var(--pf-muted)] hover:text-[var(--pf-cyan)]",
                disabled && "cursor-not-allowed opacity-40",
              )}
            >
              {active && (
                <div className="absolute bottom-1 left-0 top-1 w-0.5 rounded-r-full bg-[var(--pf-cyan)] shadow-[0_0_8px_rgba(0,218,243,0.8)]" />
              )}
              <Icon size={20} strokeWidth={1.5} fill={active ? "currentColor" : "none"} />
              <span className="pointer-events-none absolute left-full z-50 ml-4 whitespace-nowrap rounded border border-[var(--pf-border)] bg-[var(--pf-panel)] px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100">
                {label}
              </span>
            </Comp>
          );
        })}
      </div>
      <div className="mt-auto w-full px-2">
        <a
          href="https://github.com/rossbhattacharya/pulseforge"
          target="_blank"
          rel="noreferrer"
          className="group relative flex h-12 w-full flex-col items-center justify-center rounded-lg text-[var(--pf-muted)] hover:text-[var(--pf-cyan)]"
        >
          <HelpCircle size={20} strokeWidth={1.5} />
        </a>
      </div>
    </nav>
  );
}
