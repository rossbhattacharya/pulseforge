"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, AudioLines, Circle, X } from "lucide-react";
import type { GenerationStage } from "@/types";

const STAGES: { id: GenerationStage | "structure"; label: string }[] = [
  { id: "interpreting", label: "Interpreting" },
  { id: "composing", label: "Structure" },
  { id: "generating", label: "Generating" },
  { id: "mastering", label: "Mastering" },
];

const STATUS_COPY: Record<string, string> = {
  interpreting: "Reading your prompt DNA…",
  composing: "Laying down the structure…",
  generating: "Laying down the bassline…",
  mastering: "Polishing the final takes…",
  done: "Ready.",
  failed: "Something went wrong.",
};

async function poll(id: string) {
  const res = await fetch(`/api/generations/${id}`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{
    generation: {
      id: string;
      prompt_text: string;
      status: string;
      progress: number;
      stage: GenerationStage;
      error: string | null;
      params: { genre: string; bpm: number; key: string };
    };
  }>;
}

function stageIndex(stage: GenerationStage): number {
  if (stage === "interpreting") return 0;
  if (stage === "composing") return 1;
  if (stage === "generating") return 2;
  if (stage === "mastering" || stage === "done") return 3;
  return 0;
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

  const gen = data?.generation;
  const progress = gen?.progress ?? 0;
  const stage = gen?.stage ?? "interpreting";
  const active = stageIndex(stage);
  const label =
    stage === "composing"
      ? "COMPOSING"
      : stage === "interpreting"
        ? "INTERPRETING"
        : stage === "generating"
          ? "GENERATING"
          : stage === "mastering"
            ? "MASTERING"
            : stage === "failed"
              ? "FAILED"
              : "DONE";

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(20,16,31,0.9),transparent_65%)]" />

      <div className="relative z-10 mb-10 max-w-2xl rounded-xl border border-[var(--pf-border)] bg-[#131320]/80 px-6 py-4 text-center backdrop-blur-md">
        <p className="text-sm text-[var(--pf-body)]">
          {gen?.prompt_text || "Forging your track…"}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="rounded-full border border-[var(--pf-border)] px-2.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-wider text-[#d0bcff]">
            Genre: {gen?.params.genre ?? "—"}
          </span>
          <span className="rounded-full border border-[var(--pf-border)] px-2.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-wider text-[#d0bcff]">
            BPM: {gen?.params.bpm ?? "—"}
          </span>
          <span className="rounded-full border border-[var(--pf-border)] px-2.5 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-wider text-[#d0bcff]">
            Key: {gen?.params.key ?? "—"}
          </span>
        </div>
      </div>

      <div className="relative z-10 mb-8 flex h-72 w-72 items-center justify-center">
        <div className="pf-orbit absolute inset-0 rounded-full border border-[var(--pf-cyan)]/10" />
        <div className="absolute inset-6 rounded-full border border-[var(--pf-magenta)]/20" />
        <div className="pf-pulse absolute inset-10 rounded-full bg-[radial-gradient(circle,rgba(255,46,154,0.2),transparent_70%)]" />
        <div className="relative z-10 text-center">
          <p className="bg-gradient-to-b from-[var(--pf-magenta)] to-[var(--pf-cyan)] bg-clip-text font-[family-name:var(--font-space-grotesk)] text-5xl font-bold text-transparent">
            {progress}%
          </p>
          <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] text-[var(--pf-cyan)]">
            {label}
          </p>
        </div>
      </div>

      <p className="relative z-10 mb-10 text-sm text-[var(--pf-body)]">
        {STATUS_COPY[stage] ?? "Working…"}
      </p>

      <div className="relative z-10 mb-10 flex w-full max-w-xl items-center">
        {STAGES.map((s, i) => {
          const done = i < active || stage === "done";
          const current = i === active && stage !== "done" && stage !== "failed";
          return (
            <div key={s.label} className="flex flex-1 items-center">
              <div
                className={`flex w-24 flex-col items-center gap-1 text-center ${
                  current
                    ? "text-[var(--pf-cyan)]"
                    : done
                      ? "text-[var(--pf-success)]"
                      : "text-[var(--pf-muted)] opacity-40"
                }`}
              >
                {done && !current ? (
                  <Check size={20} />
                ) : current ? (
                  <div className="relative">
                    <div className="absolute inset-0 animate-pulse rounded-full bg-[var(--pf-cyan)]/40 blur-md" />
                    <AudioLines size={22} className="relative drop-shadow-[0_0_8px_rgba(0,218,243,0.8)]" />
                  </div>
                ) : (
                  <Circle size={18} />
                )}
                <span className="text-xs font-semibold">{s.label}</span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="mx-1 h-px flex-1 bg-[var(--pf-border)] opacity-40" />
              )}
            </div>
          );
        })}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        <p className="text-xs text-[var(--pf-muted)]">
          You can safely navigate away. We&apos;ll notify you when rendering is
          complete.
        </p>
        <Link
          href="/create"
          className="flex items-center gap-2 rounded border border-[var(--pf-border)] px-8 py-3 font-[family-name:var(--font-jetbrains)] text-[11px] font-bold uppercase tracking-widest text-[var(--pf-cyan)] transition-colors hover:bg-white/5"
        >
          <X size={14} />
          Cancel Generation
        </Link>
        {(error || gen?.status === "failed") && (
          <p className="text-sm text-red-300">
            {gen?.error || "Generation failed. Try again from Create."}
          </p>
        )}
      </div>
    </div>
  );
}
