"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, LayoutGrid, List, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { Slider } from "@/components/ui/slider";
import { MiniWaveform } from "@/components/ui/wave-card";
import { GENRES, KEYS } from "@/types";

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

export default function LibraryPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["library"],
    queryFn: load,
  });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [bpmMin, setBpmMin] = useState(60);
  const [bpmMax, setBpmMax] = useState(180);
  const [keyFilter, setKeyFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return (data?.projects ?? []).filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (genre && p.genre !== genre) return false;
      if (keyFilter && p.key !== keyFilter) return false;
      if (p.bpm < bpmMin || p.bpm > bpmMax) return false;
      return true;
    });
  }, [data, search, genre, keyFilter, bpmMin, bpmMax]);

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

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-[var(--pf-border)] p-4">
        <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-white">
          Filters
        </h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="input-glow mb-4 w-full rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F] px-3 py-2 text-sm"
        />
        <p className="mb-2 text-xs uppercase tracking-wider text-[var(--pf-muted)]">
          Genre
        </p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Chip selected={!genre} onClick={() => setGenre(null)}>
            All
          </Chip>
          {GENRES.slice(0, 8).map((g) => (
            <Chip key={g} selected={genre === g} onClick={() => setGenre(g)}>
              {g}
            </Chip>
          ))}
        </div>
        <Slider label="BPM min" value={bpmMin} min={60} max={bpmMax} onChange={setBpmMin} />
        <Slider label="BPM max" value={bpmMax} min={bpmMin} max={180} onChange={setBpmMax} />
        <p className="mb-2 mt-4 text-xs uppercase tracking-wider text-[var(--pf-muted)]">
          Key
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Chip selected={!keyFilter} onClick={() => setKeyFilter(null)}>
            All
          </Chip>
          {KEYS.slice(0, 8).map((k) => (
            <Chip
              key={k}
              selected={keyFilter === k}
              onClick={() => setKeyFilter(k)}
            >
              {k}
            </Chip>
          ))}
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-white">
            Library
          </h1>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant={view === "grid" ? "primary" : "secondary"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={16} />
            </Button>
            <Button
              size="icon"
              variant={view === "list" ? "primary" : "secondary"}
              onClick={() => setView("list")}
            >
              <List size={16} />
            </Button>
            <Button onClick={() => (window.location.href = "/create")}>
              New track
            </Button>
          </div>
        </div>

        {isLoading && (
          <p className="text-sm text-[var(--pf-muted)]">Loading library…</p>
        )}
        {error && (
          <p className="text-sm text-red-300">Could not load library.</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <Panel className="p-10 text-center text-[var(--pf-muted)]">
            No projects match these filters.
          </Panel>
        )}

        <div
          className={
            view === "grid"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "space-y-2"
          }
        >
          {filtered.map((p, i) => {
            const isSelected = selected.includes(p.id);
            return (
              <Panel
                key={p.id}
                active={isSelected}
                className="group cursor-pointer p-4 hover:border-[var(--pf-cyan)]/40"
                onClick={() =>
                  setSelected((prev) =>
                    isSelected
                      ? prev.filter((id) => id !== p.id)
                      : [...prev, p.id],
                  )
                }
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white">{p.title}</h3>
                    <p className="font-[family-name:var(--font-jetbrains)] text-[11px] text-[var(--pf-muted)]">
                      {p.genre} · {p.bpm} BPM · {p.key}
                    </p>
                  </div>
                  <Link
                    href="/create"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-[var(--pf-cyan)] opacity-0 group-hover:opacity-100"
                  >
                    Open
                  </Link>
                </div>
                {view === "grid" && <MiniWaveform seed={i + 2} />}
              </Panel>
            );
          })}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[var(--pf-border)] bg-[var(--pf-panel)]/95 px-4 py-3 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[var(--pf-cyan)]">
            {selected.length} selected
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              selected.forEach((id) =>
                action.mutate({ action: "duplicate", id }),
              )
            }
          >
            <Copy size={14} />
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => action.mutate({ action: "delete", ids: selected })}
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
