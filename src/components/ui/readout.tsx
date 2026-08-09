import { cn } from "@/lib/utils";

export function Readout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-[family-name:var(--font-jetbrains)] text-[13px] font-medium tabular-nums text-[var(--pf-body)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
