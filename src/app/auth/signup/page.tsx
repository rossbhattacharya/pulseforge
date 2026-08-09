"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--pf-bg)] px-4">
      <Panel className="w-full max-w-md space-y-5 p-8">
        <div className="text-center">
          <p className="bg-gradient-to-r from-[var(--pf-cyan)] to-[var(--pf-magenta)] bg-clip-text font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-transparent">
            Join Pulseforge
          </p>
          <p className="mt-2 text-sm text-[var(--pf-muted)]">
            Create an account when Supabase Auth is configured.
          </p>
        </div>
        <input
          type="text"
          placeholder="Display name"
          className="input-glow w-full rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F] px-3 py-3 text-sm"
        />
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
        <Button className="w-full">Create account</Button>
        <p className="text-center text-xs text-[var(--pf-muted)]">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[var(--pf-cyan)]">
            Sign in
          </Link>
        </p>
      </Panel>
    </div>
  );
}
