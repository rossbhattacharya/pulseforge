import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  className,
  active,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { active?: boolean }) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-[var(--pf-border)] bg-[var(--pf-panel)]",
        active &&
          "glow-active border-[var(--pf-cyan)]/40 shadow-[inset_0_0_4px_rgba(0,218,243,0.15)]",
        className,
      )}
      {...props}
    >
      {active && <div className="active-track-strip" />}
      {children}
    </div>
  );
}
