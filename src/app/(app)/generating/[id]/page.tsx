"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { GenerationStage } from "@/types";

const STAGES: { id: GenerationStage; label: string }[] = [
  { id: "interpreting", label: "Interpreting prompt" },
  { id: "composing", label: "Composing structure" },
  { id: "generating", label: "Generating audio" },
  { id: "mastering", label: "Mastering takes" },
];

async function poll(id: string) {
  const res = await fetch(`/api/generations/${id}`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{
    generation: {
      id: string;
      status: string;
      progress: number;
      stage: GenerationStage;
      error: string | null;
    };
  }>;
}

export default function GeneratingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error } = useQuery({
    queryKey: ["generation", id],
    queryFn: () => poll(id),
    refetchInterval: (q) => {
      const status = q.state.data?.generation.status;
      if (status === "succeeded" || status === "failed") return false;
      return 3000;
    },
  });

  useEffect(() => {
    if (data?.generation.status === "succeeded") {
      router.replace(`/results/${id}`);
    }
  }, [data, id, router]);

  const stage = data?.generation.stage ?? "interpreting";
  const progress = data?.generation.progress ?? 0;
  const activeIndex = Math.max(
    0,
    STAGES.findIndex((s) => s.id === stage),
  );

  return (
    <div className="hero-glow relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="pf-orbit absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--pf-cyan)]/10" />
        <div className="pf-pulse absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,46,154,0.25),transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-lg text-center">
        <p className="mb-3 font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] text-[var(--pf-magenta)]">
          Synthesizing
        </p>
        <h1 className="mb-8 font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-white">
          Forging your track…
        </h1>

        <div className="mb-8 h-2 overflow-hidden rounded-full bg-[#0A0A0F]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#00E5FF,#FF2E9A)] transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="space-y-3 text-left">
          {STAGES.map((s, i) => {
            const done = i < activeIndex || stage === "done";
            const active = i === activeIndex && stage !== "done";
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                  active
                    ? "border-[var(--pf-cyan)]/50 bg-[var(--pf-cyan)]/5 text-white"
                    : done
                      ? "border-[var(--pf-border)] text-[var(--pf-success)]"
                      : "border-[var(--pf-border)] text-[var(--pf-muted)]"
                }`}
              >
                <span className="font-[family-name:var(--font-jetbrains)] text-xs">
                  0{i + 1}
                </span>
                <span className="text-sm">{s.label}</span>
                {active && (
                  <span className="ml-auto animate-pulse text-xs text-[var(--pf-cyan)]">
                    live
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {(error || data?.generation.status === "failed") && (
          <p className="mt-6 text-sm text-red-300">
            {data?.generation.error || "Generation failed. Try again from Create."}
          </p>
        )}
      </div>
    </div>
  );
}
