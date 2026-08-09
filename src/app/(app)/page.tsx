"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play, Plus, Sparkles, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { MiniWaveform } from "@/components/ui/wave-card";
import { GENRES } from "@/types";
import { useState } from "react";

async function loadHome() {
  const res = await fetch("/api/projects");
  if (!res.ok) throw new Error("Failed to load");
  return res.json() as Promise<{
    projects: Array<{
      id: string;
      title: string;
      genre: string;
      bpm: number;
      key: string;
    }>;
    references: Array<{
      id: string;
      source_name: string;
      bpm: number;
      key: string;
      mood_tags: string[];
    }>;
  }>;
}

const RECENT = [
  { label: "Ambient", duration: "1:04", seed: 5 },
  { label: "Techno", duration: "0:12", seed: 6 },
  { label: "Lo-fi", duration: "2:18", seed: 7 },
  { label: "FX", duration: "0:45", seed: 8 },
];

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ["home"],
    queryFn: loadHome,
  });
  const [prompt, setPrompt] = useState("");
  const [playing, setPlaying] = useState<string | null>("proj_midnight");

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-24">
        <section className="hero-glow relative flex flex-col items-center border-b border-[var(--pf-border)]/50 px-8 pb-10 pt-12">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(52,51,66,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(52,51,66,0.2)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />
          <div className="relative z-10 w-full max-w-3xl">
            <h1 className="mb-6 text-center font-[family-name:var(--font-space-grotesk)] text-[32px] font-bold tracking-tight text-white">
              Generate your next sound.
            </h1>
            <div className="glow-hover relative rounded-xl border border-[var(--pf-border)] bg-[#0A0A0F] p-1 shadow-lg transition-all">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex flex-1 items-center">
                  <Sparkles
                    className="absolute left-4 text-[var(--pf-cyan)]/70"
                    size={18}
                  />
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="h-14 w-full bg-transparent py-4 pl-12 pr-4 text-sm text-white placeholder:text-[var(--pf-muted)] focus:outline-none"
                    placeholder="Describe a track... e.g. 'dreamy melodic techno, 122 BPM, rolling bassline'"
                  />
                </div>
                <Button
                  className="m-0.5 h-14 min-w-[140px]"
                  onClick={() =>
                    router.push(
                      `/create?prompt=${encodeURIComponent(prompt || "")}`,
                    )
                  }
                >
                  <Zap size={18} />
                  Generate
                </Button>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="mr-2 font-[family-name:var(--font-jetbrains)] text-[11px] font-bold uppercase tracking-wider text-[var(--pf-muted)] opacity-60">
                Quick start:
              </span>
              {GENRES.slice(0, 7).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    router.push(`/create?genre=${encodeURIComponent(g)}`)
                  }
                  className="rounded-full border border-[var(--pf-border)] bg-[var(--pf-panel)] px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-[12px] text-[#d0bcff] transition-colors hover:border-[#d0bcff] hover:bg-[#d0bcff]/10"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-8 pb-6 pt-10">
          <h2 className="mb-6 flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-white">
            <span className="h-6 w-1.5 rounded-full bg-[var(--pf-cyan)] shadow-[0_0_8px_rgba(0,218,243,0.6)]" />
            Continue working
          </h2>
          {isLoading && (
            <p className="text-sm text-[var(--pf-muted)]">Loading projects…</p>
          )}
          {error && (
            <p className="text-sm text-red-300">Could not load projects.</p>
          )}
          {!isLoading && data?.projects.length === 0 && (
            <Panel className="p-8 text-center">
              <p className="mb-4 text-[var(--pf-muted)]">No projects yet.</p>
              <Button onClick={() => router.push("/create")}>Start creating</Button>
            </Panel>
          )}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {data?.projects.slice(0, 3).map((p, i) => (
              <Link key={p.id} href="/library">
                <Panel
                  active={playing === p.id}
                  className="cursor-pointer p-4 transition-colors hover:border-[var(--pf-cyan)]/50"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="mb-1 text-base font-bold text-white">
                        {p.title}
                      </h3>
                      <p className="font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-wider text-[var(--pf-muted)]">
                        {p.genre} · {p.bpm} BPM · {p.key}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setPlaying(playing === p.id ? null : p.id);
                      }}
                      className={
                        playing === p.id
                          ? "flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pf-cyan)] text-[#00363d] shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                          : "flex h-8 w-8 items-center justify-center rounded-full border border-[var(--pf-border)] text-white"
                      }
                    >
                      {playing === p.id ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                  </div>
                  <MiniWaveform seed={i + 1} />
                </Panel>
              </Link>
            ))}
          </div>
        </section>

        <section className="px-8 pb-10 pt-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-white">
              <span className="h-6 w-1.5 rounded-full bg-[var(--pf-magenta)] shadow-[0_0_8px_rgba(255,46,154,0.6)]" />
              Recent generations
            </h2>
            <Link
              href="/library"
              className="flex items-center gap-1 text-sm text-[var(--pf-cyan)] hover:underline"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {RECENT.map((item) => (
              <Panel
                key={item.label}
                className="group cursor-pointer p-3 hover:border-[var(--pf-cyan)]/40"
                onClick={() => router.push("/create")}
              >
                <div className="relative mb-3 flex aspect-square items-center justify-center rounded-lg bg-[#0A0A0F]">
                  <MiniWaveform seed={item.seed} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pf-cyan)] text-[#00363d] shadow-[0_0_15px_rgba(0,229,255,0.5)]">
                      <Play size={18} fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{item.label}</span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[var(--pf-muted)]">
                    {item.duration}
                  </span>
                </div>
              </Panel>
            ))}
          </div>
        </section>
      </div>

      <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-[var(--pf-border)] bg-[var(--pf-surface)] p-5 lg:block">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-white">
            Inspiration Bank
          </h2>
          <button
            type="button"
            onClick={() => router.push("/create")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--pf-border)] text-[var(--pf-cyan)] hover:bg-[var(--pf-cyan)]/10"
          >
            <Plus size={16} />
          </button>
        </div>
        <p className="mb-4 text-xs text-[var(--pf-muted)]">
          Saved seeds and reference tracks
        </p>
        <div className="space-y-4">
          {data?.references.map((ref) => (
            <Panel key={ref.id} className="p-4">
              <h3 className="mb-2 font-semibold text-white">{ref.source_name}</h3>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className="rounded border border-[var(--pf-border)] px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[var(--pf-muted)]">
                  {ref.bpm} BPM
                </span>
                <span className="rounded border border-[var(--pf-border)] px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[var(--pf-muted)]">
                  {ref.key}
                </span>
                {ref.mood_tags.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="rounded border border-[var(--pf-violet)]/40 px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[var(--pf-violet)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() =>
                  router.push(`/create?seed=${encodeURIComponent(ref.id)}`)
                }
              >
                Use as seed
              </Button>
            </Panel>
          ))}
        </div>
      </aside>
    </div>
  );
}
