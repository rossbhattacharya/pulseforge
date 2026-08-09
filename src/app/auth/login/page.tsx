"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--pf-bg)] px-4">
      <Panel className="w-full max-w-md space-y-5 p-8">
        <div className="text-center">
          <p className="bg-gradient-to-r from-[var(--pf-cyan)] to-[var(--pf-magenta)] bg-clip-text font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-transparent">
            Pulseforge
          </p>
          <p className="mt-2 text-sm text-[var(--pf-muted)]">
            Sign in to sync projects. Demo mode works without auth.
          </p>
        </div>
        <input
          type="email"
          placeholder="Email"
          className="input-glow w-full rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F] px-3 py-3 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          className="input-glow w-full rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F] px-3 py-3 text-sm"
        />
        <Button className="w-full">Continue with email</Button>
        <Button variant="secondary" className="w-full">
          Continue with Google
        </Button>
        <p className="text-center text-xs text-[var(--pf-muted)]">
          Wire to Supabase Auth when env keys are set.{" "}
          <Link href="/" className="text-[var(--pf-cyan)]">
            Enter demo
          </Link>
        </p>
        <p className="text-center text-xs text-[var(--pf-muted)]">
          No account?{" "}
          <Link href="/auth/signup" className="text-[var(--pf-cyan)]">
            Sign up
          </Link>
        </p>
      </Panel>
    </div>
  );
}
