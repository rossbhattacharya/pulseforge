"use client";

import { cn } from "@/lib/utils";

export function Chip({
  selected,
  glow,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  glow?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-[12px] transition-colors",
        selected
          ? "border-[var(--pf-violet)] bg-[var(--pf-violet)]/15 text-[var(--pf-violet)]"
          : "border-[var(--pf-border)] bg-[var(--pf-panel)] text-[#d0bcff] hover:border-[var(--pf-violet)] hover:bg-[var(--pf-violet)]/10",
        glow && "shadow-[0_0_10px_rgba(139,92,246,0.35)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
