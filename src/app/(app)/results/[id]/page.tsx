"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Trash2,
  X,
  Play,
  Pause,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WaveCard } from "@/components/ui/wave-card";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/lib/store/player";

async function load(id: string) {
  const res = await fetch(`/api/generations/${id}`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{
    generation: {
      id: string;
      prompt_text: string;
      status: string;
      params: { genre: string; bpm: number; key: string };
    };
    takes: Array<{
      id: string;
      index: number;
      audio_url: string;
      duration_s: number;
      descriptor: string;
      selected: boolean;
      favorited: boolean;
    }>;
  }>;
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [compare, setCompare] = useState(true);
  const { playingId, toggle } = usePlayerStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["results", id],
    queryFn: () => load(id),
  });

  const patch = useMutation({
    mutationFn: async (body: {
      takeId: string;
      selected?: boolean;
      favorited?: boolean;
    }) => {
      const res = await fetch(`/api/generations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["results", id] }),
  });

  const bpm = data?.generation.params.bpm ?? 120;
  const key = data?.generation.params.key ?? "A min";
  const genre = data?.generation.params.genre ?? "Electronic";

  return (
    <div className="-ml-16 flex min-h-[calc(100vh-4rem)] w-[calc(100%+4rem)] flex-col bg-[var(--pf-bg)]">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--pf-border-subtle)] bg-[var(--pf-bg)]/90 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/create")}
            className="rounded-full p-2 text-[var(--pf-muted)] hover:bg-white/5 hover:text-[var(--pf-cyan)]"
          >
            <X size={20} />
          </button>
          <div>
            <h1 className="font-[family-name:var(--font-space-grotesk)] text-[32px] font-bold text-[var(--pf-cyan)]">
              Your takes
            </h1>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="rounded border border-[var(--pf-border-subtle)] bg-[#343342] px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[11px] font-bold uppercase text-[#d0bcff]">
                {genre}
              </span>
              <span className="rounded border border-[var(--pf-border-subtle)] bg-[#343342] px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[11px] font-bold uppercase text-[#d0bcff]">
                {bpm} BPM
              </span>
              <span className="rounded border border-[var(--pf-border-subtle)] bg-[#343342] px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[11px] font-bold uppercase text-[#d0bcff]">
                {key}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/create")}
          className="flex items-center gap-2 rounded border border-[var(--pf-border-subtle)] px-4 py-2 font-[family-name:var(--font-jetbrains)] text-[11px] font-bold uppercase tracking-wider text-[var(--pf-cyan)] hover:border-[var(--pf-cyan)] hover:bg-white/5"
        >
          <RefreshCw size={14} />
          Regenerate all
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-4 pb-28">
        {isLoading && (
          <p className="text-sm text-[var(--pf-muted)]">Loading takes…</p>
        )}
        {error && (
          <p className="text-sm text-red-300">Could not load results.</p>
        )}
        {!isLoading && data?.takes.length === 0 && (
          <div className="rounded-xl border border-[var(--pf-border)] p-10 text-center text-[var(--pf-muted)]">
            No takes yet. Generation may still be running.
          </div>
        )}

        {data?.takes.map((take) => {
          const isPlaying = playingId === take.id;
          const active = take.selected || isPlaying;
          return (
            <article
              key={take.id}
              className={`relative flex flex-col items-stretch gap-4 overflow-hidden rounded-lg border bg-[#1e1e2c] p-5 md:flex-row md:items-center ${
                active
                  ? "border-[var(--pf-cyan)] shadow-[inset_0_0_12px_rgba(0,218,243,0.15)] ring-1 ring-[var(--pf-cyan)]/50"
                  : "border-[var(--pf-border-subtle)] hover:border-[var(--pf-border)]"
              }`}
              onClick={() => patch.mutate({ takeId: take.id, selected: true })}
            >
              {active && (
                <div className="absolute bottom-0 left-0 top-0 w-[2px] animate-pulse bg-gradient-to-b from-[var(--pf-cyan)] to-[var(--pf-magenta)]" />
              )}

              <div className="flex min-w-[200px] flex-col gap-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(take.id);
                    }}
                    className={
                      active
                        ? "flex h-12 w-12 items-center justify-center rounded-full bg-[var(--pf-cyan)] text-[#00363d] shadow-[0_0_15px_rgba(0,218,243,0.4)]"
                        : "flex h-12 w-12 items-center justify-center rounded-full border border-[var(--pf-border-subtle)] bg-[#343342] text-[var(--pf-muted)] hover:text-[var(--pf-cyan)]"
                    }
                  >
                    {isPlaying ? (
                      <Pause size={22} fill="currentColor" />
                    ) : (
                      <Play size={22} fill="currentColor" />
                    )}
                  </button>
                  <div>
                    <h2 className="font-[family-name:var(--font-space-grotesk)] text-xl font-semibold text-white">
                      Take {take.index + 1}
                    </h2>
                    <p className="max-w-[140px] truncate text-sm text-[var(--pf-muted)]">
                      {take.descriptor}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 font-[family-name:var(--font-jetbrains)] text-[13px] text-[#d0bcff]">
                  <span>{bpm} BPM</span>
                  <span className="text-[var(--pf-border-subtle)]">|</span>
                  <span>{key}</span>
                </div>
              </div>

              <div className="relative min-h-[80px] flex-1 rounded border border-[var(--pf-border-subtle)]/50 bg-[#0d0d1a] px-2 py-2">
                <WaveCard id={take.id} url={take.audio_url} height={64} />
                <span className="absolute bottom-1 right-2 rounded bg-[#0d0d1a]/80 px-1 font-[family-name:var(--font-jetbrains)] text-[10px] text-[var(--pf-cyan)]">
                  {formatDuration(take.duration_s)}
                </span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    patch.mutate({
                      takeId: take.id,
                      favorited: !take.favorited,
                    });
                  }}
                  className={`rounded p-2 transition-colors ${take.favorited ? "text-[var(--pf-magenta)]" : "text-[var(--pf-muted)] hover:text-[var(--pf-magenta)]"}`}
                >
                  <Heart
                    size={18}
                    fill={take.favorited ? "currentColor" : "none"}
                  />
                </button>
                <button
                  type="button"
                  className="rounded border border-transparent p-2 text-[var(--pf-muted)] hover:border-[var(--pf-border)] hover:text-[var(--pf-cyan)]"
                  title="More variations"
                >
                  <Sparkles size={18} />
                </button>
                <Button
                  size="sm"
                  variant={active ? "primary" : "secondary"}
                  className="ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/editor/${take.id}`);
                  }}
                >
                  Open in editor
                  <ExternalLink size={14} />
                </Button>
              </div>
            </article>
          );
        })}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-[var(--pf-border-subtle)] bg-[#131320]/90 px-6 py-4 backdrop-blur-xl">
        <label className="flex items-center gap-3 text-sm text-[var(--pf-body)]">
          <span>A/B Compare</span>
          <button
            type="button"
            onClick={() => setCompare((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${compare ? "bg-[var(--pf-cyan)]" : "bg-[#343342]"}`}
            aria-pressed={compare}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${compare ? "left-5" : "left-0.5"}`}
            />
          </button>
        </label>
        <button
          type="button"
          onClick={() => router.push("/create")}
          className="flex items-center gap-2 rounded border border-[var(--pf-border)] px-4 py-2 text-sm text-[var(--pf-muted)] hover:border-red-400/50 hover:text-red-300"
        >
          <Trash2 size={14} />
          Discard all
        </button>
      </footer>
    </div>
  );
}
