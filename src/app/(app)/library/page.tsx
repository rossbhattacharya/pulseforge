"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutGrid,
  List,
  Trash2,
  Download,
  Pencil,
  Play,
  X,
  Gauge,
  Music2,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { KEYS } from "@/types";

const FILTER_GENRES = [
  "Synthwave",
  "Melodic Techno",
  "Ambient",
  "UK Garage",
  "Techno",
  "House",
] as const;

async function load() {
  const res = await fetch("/api/projects");
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{
    projects: Array<{
      id: string;
      title: string;
      genre: string;
      bpm: number;
      key: string;
      updated_at: string;
    }>;
  }>;
}

function coverGradient(seed: number) {
  const hues = [
    "from-cyan-500/40 via-fuchsia-600/30 to-[#0A0A0F]",
    "from-violet-600/40 via-cyan-500/20 to-[#0A0A0F]",
    "from-fuchsia-700/40 via-indigo-800/30 to-[#0A0A0F]",
    "from-teal-600/30 via-purple-700/25 to-[#0A0A0F]",
  ];
  return hues[seed % hues.length];
}

export default function LibraryPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["library"],
    queryFn: load,
  });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [genres, setGenres] = useState<string[]>([
    "Synthwave",
    "Melodic Techno",
  ]);
  const [bpmMin] = useState(90);
  const [bpmMax, setBpmMax] = useState(140);
  const [keyFilter, setKeyFilter] = useState("");
  const [status, setStatus] = useState<"all" | "drafts" | "mastered">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const projects = useMemo(() => {
    return (data?.projects ?? []).map((p, i) => ({
      ...p,
      duration_s: 180 + i * 37,
      mastered: i % 2 === 0,
    }));
  }, [data]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (genres.length > 0 && !genres.includes(p.genre)) return false;
      if (keyFilter && p.key !== keyFilter) return false;
      if (p.bpm < bpmMin || p.bpm > bpmMax) return false;
      if (status === "drafts" && p.mastered) return false;
      if (status === "mastered" && !p.mastered) return false;
      return true;
    });
  }, [projects, search, genres, keyFilter, bpmMin, bpmMax, status]);

  const action = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Action failed");
      return res.json();
    },
    onSuccess: () => {
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["library"] });
    },
  });

  function toggleGenre(g: string) {
    setGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  }

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Filters */}
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-[var(--pf-border)] bg-[#0A0A0F] p-5">
        <div className="mb-8">
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[var(--pf-muted)]">
            Genre
          </h3>
          <div className="flex flex-col gap-2">
            {FILTER_GENRES.map((g) => (
              <label
                key={g}
                className="group flex cursor-pointer items-center gap-3"
              >
                <input
                  type="checkbox"
                  checked={genres.includes(g)}
                  onChange={() => toggleGenre(g)}
                  className="h-4 w-4 rounded-sm border-[var(--pf-border)] bg-[#131320] text-[var(--pf-cyan)] accent-[var(--pf-cyan)]"
                />
                <span className="text-sm text-white group-hover:text-[var(--pf-cyan)]">
                  {g}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--pf-muted)]">
              BPM range
            </h3>
            <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[var(--pf-cyan)]">
              {bpmMin} – {bpmMax}
            </span>
          </div>
          <input
            type="range"
            min={60}
            max={200}
            value={bpmMax}
            onChange={(e) => setBpmMax(Number(e.target.value))}
            className="w-full accent-[var(--pf-cyan)]"
          />
        </div>

        <div className="mb-8">
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[var(--pf-muted)]">
            Key signature
          </h3>
          <select
            value={keyFilter}
            onChange={(e) => setKeyFilter(e.target.value)}
            className="w-full appearance-none rounded border border-[var(--pf-border)] bg-[#131320] px-3 py-2 text-sm text-white focus:border-[var(--pf-cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--pf-cyan)]"
          >
            <option value="">Any key</option>
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[var(--pf-muted)]">
            Status
          </h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["drafts", "Drafts"],
                ["mastered", "Mastered"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatus(id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  status === id
                    ? "border-[var(--pf-cyan)] bg-[var(--pf-cyan)]/10 text-[var(--pf-cyan)]"
                    : "border-[var(--pf-border)] text-[var(--pf-muted)] hover:border-[var(--pf-cyan)] hover:text-[var(--pf-cyan)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title…"
            className="input-glow w-full rounded-md border border-[var(--pf-border)] bg-[#0A0A0F] px-3 py-2 text-sm"
          />
        </div>
      </aside>

      {/* Grid */}
      <main className="relative flex-1 overflow-y-auto p-6 pb-32">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="mb-2 font-[family-name:var(--font-space-grotesk)] text-4xl font-bold text-white">
              Library
            </h1>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className="flex items-center gap-1 rounded border border-[var(--pf-border)] bg-[#1a1a28] px-2 py-1 text-xs text-[var(--pf-muted)] hover:text-red-300"
                >
                  {g}
                  <X size={14} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--pf-border)] bg-[#131320] p-1">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "rounded p-1",
                view === "grid"
                  ? "bg-[#1e1e2c] text-[var(--pf-cyan)] shadow-sm"
                  : "text-[var(--pf-muted)] hover:text-white",
              )}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "rounded p-1",
                view === "list"
                  ? "bg-[#1e1e2c] text-[var(--pf-cyan)] shadow-sm"
                  : "text-[var(--pf-muted)] hover:text-white",
              )}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {isLoading && (
          <p className="text-sm text-[var(--pf-muted)]">Loading library…</p>
        )}
        {error && (
          <p className="text-sm text-red-300">Could not load library.</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-lg border border-[var(--pf-border)] p-10 text-center text-[var(--pf-muted)]">
            No projects match these filters.{" "}
            <button
              type="button"
              className="text-[var(--pf-cyan)]"
              onClick={() => {
                setGenres([]);
                setKeyFilter("");
                setStatus("all");
                setSearch("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        <div
          className={
            view === "grid"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "flex flex-col gap-2"
          }
        >
          {filtered.map((p, i) => {
            const isSelected = selected.includes(p.id);
            if (view === "list") {
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-4 rounded-lg border bg-[#131320] px-4 py-3 transition-all",
                    isSelected
                      ? "border-[var(--pf-cyan)]/50 shadow-[0_0_12px_rgba(0,218,243,0.15)]"
                      : "border-[var(--pf-border)] hover:border-[var(--pf-cyan)]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(p.id)}
                    className="accent-[var(--pf-cyan)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{p.title}</p>
                    <p className="font-[family-name:var(--font-jetbrains)] text-[11px] text-[var(--pf-muted)]">
                      {p.genre} · {p.bpm} BPM · {p.key}
                    </p>
                  </div>
                  <Link
                    href="/create"
                    className="text-xs text-[var(--pf-cyan)] hover:underline"
                  >
                    Open
                  </Link>
                </div>
              );
            }

            return (
              <div
                key={p.id}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-lg border bg-[#131320] transition-all",
                  isSelected
                    ? "border-[var(--pf-cyan)]/50 shadow-[0_0_12px_rgba(0,218,243,0.15)]"
                    : "border-[var(--pf-border)] hover:border-[var(--pf-cyan)] hover:shadow-[0_0_12px_rgba(0,218,243,0.15)]",
                )}
              >
                {isSelected && (
                  <div className="absolute bottom-0 left-0 top-0 z-10 w-0.5 bg-gradient-to-b from-[var(--pf-cyan)] to-[var(--pf-magenta)]" />
                )}
                <div className="relative h-32 w-full overflow-hidden border-b border-[var(--pf-border)] bg-[#0A0A0F]">
                  <div
                    className={cn(
                      "h-full w-full bg-gradient-to-br opacity-80 transition-transform duration-500 group-hover:scale-105",
                      coverGradient(i),
                    )}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#0A0A0F_90%)]" />
                  <div className="absolute left-3 top-2 z-20">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(p.id)}
                      className={cn(
                        "h-4 w-4 rounded-sm accent-[var(--pf-cyan)]",
                        !isSelected && "opacity-0 group-hover:opacity-100",
                      )}
                    />
                  </div>
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0A0F]/60 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                    <Link
                      href="/create"
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--pf-cyan)] to-[var(--pf-magenta)] text-[#0A0A0F] shadow-[0_0_15px_rgba(0,218,243,0.6)] transition-transform hover:scale-105"
                    >
                      <Play size={28} fill="currentColor" className="ml-0.5" />
                    </Link>
                  </div>
                </div>
                <div className="relative flex flex-col gap-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="truncate pr-2 font-[family-name:var(--font-space-grotesk)] text-base text-white">
                      {p.title}
                    </h4>
                    <span className="shrink-0 rounded border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c4b5fd]">
                      {p.genre.split(" ")[0]}
                    </span>
                  </div>
                  <div className="mt-1 flex items-end justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[11px] text-[var(--pf-muted)]">
                        <Gauge size={14} /> {p.bpm} BPM
                      </div>
                      <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[11px] text-[var(--pf-muted)]">
                        <Music2 size={14} /> {p.key}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-[family-name:var(--font-jetbrains)] text-[11px] text-[var(--pf-muted)]">
                        {formatDuration(p.duration_s)}
                      </span>
                      {p.mastered ? (
                        <span className="flex items-center gap-1 text-[10px] text-[var(--pf-cyan)]">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--pf-cyan)]" />
                          Mastered
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--pf-muted)]">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 flex translate-y-full items-center justify-between border-t border-[var(--pf-border)] bg-[#131320] p-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                    <Link
                      href="/create"
                      className="p-1 text-[var(--pf-muted)] hover:text-[var(--pf-cyan)]"
                    >
                      <Pencil size={18} />
                    </Link>
                    <button
                      type="button"
                      className="p-1 text-[var(--pf-muted)] hover:text-[var(--pf-cyan)]"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        action.mutate({ action: "delete", ids: [p.id] })
                      }
                      className="p-1 text-[var(--pf-muted)] hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {selected.length > 0 && (
        <div className="fixed bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full border border-[var(--pf-border)] bg-[#1a1a28]/95 px-4 py-2.5 shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--pf-cyan)]/20 px-2 font-[family-name:var(--font-jetbrains)] text-xs text-[var(--pf-cyan)]">
            {selected.length} selected
          </span>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white hover:bg-white/5"
          >
            <Download size={16} />
            Export
          </button>
          <button
            type="button"
            onClick={() => action.mutate({ action: "delete", ids: selected })}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10"
          >
            <Trash2 size={16} />
            Delete
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="ml-1 text-[var(--pf-muted)] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      )}

      </div>
  );
}
