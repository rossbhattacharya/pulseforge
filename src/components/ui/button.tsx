"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-[family-name:var(--font-space-grotesk)] font-bold transition-all disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-cyan)]/50",
  {
    variants: {
      variant: {
        primary:
          "bg-[linear-gradient(135deg,#00E5FF_0%,#FF2E9A_100%)] text-white shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:opacity-90",
        secondary:
          "bg-transparent border border-[var(--pf-border)] text-[var(--pf-cyan)] hover:border-[var(--pf-cyan)] hover:bg-[var(--pf-cyan)]/5",
        ai: "bg-[var(--pf-magenta)]/5 border border-[var(--pf-magenta)] text-[var(--pf-magenta)] hover:bg-[var(--pf-magenta)]/10",
        ghost:
          "bg-transparent text-[var(--pf-muted)] hover:text-white hover:bg-white/5",
        destructive:
          "bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-[15px]",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
