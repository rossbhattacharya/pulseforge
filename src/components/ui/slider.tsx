"use client";

import { cn } from "@/lib/utils";

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  className,
  label,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  className?: string;
  label?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-2 flex justify-between text-xs text-[var(--pf-muted)]">
          <span>{label}</span>
          <span className="font-[family-name:var(--font-jetbrains)] text-[var(--pf-cyan)]">
            {value}
          </span>
        </div>
      )}
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-[#0A0A0F]" />
        <div
          className="absolute left-0 h-1 rounded-full bg-[linear-gradient(90deg,#00E5FF,#FF2E9A)] shadow-[0_0_8px_rgba(0,229,255,0.5)]"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-[var(--pf-cyan)] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,229,255,0.8)]"
        />
      </div>
    </div>
  );
}
