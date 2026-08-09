"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Tone from "tone";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Sparkles,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid3x3,
} from "lucide-react";
import { ExportModal } from "@/components/export/export-modal";
import { useEditorStore } from "@/lib/store/editor";
import { cn, formatTimecode } from "@/lib/utils";
import type { Stem, StemLane } from "@/types";
import { STEM_LANES } from "@/types";

async function loadTake(takeId: string) {
  const res = await fetch(`/api/takes/${takeId}`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{ take: { id: string }; stems: Stem[] }>;
}

const LANE_META: Record<
  StemLane,
  { label: string; color: string; clip: string; left: string; width: string }
> = {
  drums: {
    label: "Drums",
    color: "#00E5FF",
    clip: "BEAT_MAIN_01",
    left: "19%",
    width: "30%",
  },
  bass: {
    label: "Bass",
    color: "#6E6E85",
    clip: "SUB_BASS_A",
    left: "19%",
    width: "30%",
  },
  melody: {
    label: "Melody",
    color: "#FF2E9A",
    clip: "ARP_LEAD_GEN",
    left: "22%",
    width: "20%",
  },
  pads: {
    label: "Pads",
    color: "#8B5CF6",
    clip: "ATMOS_PAD",
    left: "5%",
    width: "40%",
  },
  vocals: {
    label: "Vocals",
    color: "#FFB020",
    clip: "VOX_LEAD",
    left: "25%",
    width: "25%",
  },
};

function FakeWave({ color, seed }: { color: string; seed: number }) {
  const bars = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => {
        const h = 20 + ((Math.sin(seed * 9.1 + i * 0.55) + 1) * 40);
        return Math.min(100, Math.max(10, h));
      }),
    [seed],
  );
  return (
    <div className="flex h-10 w-full items-center justify-around px-2 opacity-80">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-sm"
          style={{ height: `${h}%`, backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function Dial({
  value,
  color,
  label,
}: {
  value: string;
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded border border-[var(--pf-border)]/50 bg-[#131320] p-3">
      <span className="text-sm text-white">{label}</span>
      <div className="flex items-center gap-2">
        <div
          className="relative h-6 w-6 rounded-full border-2"
          style={{ borderColor: `${color}55`, borderTopColor: color }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-2 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full rounded-sm"
            style={{ backgroundColor: color }}
          />
        </div>
        <span
          className="w-8 text-right font-[family-name:var(--font-jetbrains)] text-[10px]"
          style={{ color }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export default function EditorPage() {
  const { takeId } = useParams<{ takeId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [exportOpen, setExportOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [reverb, setReverb] = useState(45);
  const [filterHz, setFilterHz] = useState(1200);
  const [snap, setSnap] = useState("1/16");
  const playersRef = useRef<Partial<Record<StemLane, Tone.Player>>>({});

  const {
    playing,
    loop,
    position,
    bpm,
    zoom,
    markers,
    selectedLane,
    setTake,
    setPlaying,
    setLoop,
    setPosition,
    setZoom,
    setSelectedLane,
    moveMarker,
  } = useEditorStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["take", takeId],
    queryFn: () => loadTake(takeId),
  });

  useEffect(() => {
    setTake(takeId, 120);
    setSelectedLane("melody");
  }, [takeId, setTake, setSelectedLane]);

  useEffect(() => {
    if (!data?.stems) return;
    let cancelled = false;

    async function setup() {
      await Tone.start();
      Object.values(playersRef.current).forEach((p) => p?.dispose());
      playersRef.current = {};
      for (const stem of data!.stems) {
        const player = new Tone.Player({
          url: stem.audio_url,
          loop,
          volume: Tone.gainToDb(stem.volume),
        }).toDestination();
        player.mute = stem.muted;
        playersRef.current[stem.lane] = player;
      }
      if (cancelled) {
        Object.values(playersRef.current).forEach((p) => p?.dispose());
      }
    }
    void setup();
    return () => {
      cancelled = true;
      Object.values(playersRef.current).forEach((p) => p?.dispose());
      playersRef.current = {};
    };
  }, [data, loop]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setPosition(Tone.Transport.seconds);
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, setPosition]);

  const patch = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/takes/${takeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["take", takeId] }),
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        void togglePlay();
      }
      if (e.key.toLowerCase() === "m" && selectedLane) {
        const stem = data?.stems.find((s) => s.lane === selectedLane);
        if (stem) patch.mutate({ stemId: stem.id, muted: !stem.muted });
      }
      if (e.key.toLowerCase() === "s" && selectedLane) {
        const stem = data?.stems.find((s) => s.lane === selectedLane);
        if (stem) patch.mutate({ stemId: stem.id, solo: !stem.solo });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLane, data?.stems, playing]);

  async function togglePlay() {
    await Tone.start();
    const anySolo = data?.stems.some((s) => s.solo);
    for (const stem of data?.stems ?? []) {
      const player = playersRef.current[stem.lane];
      if (!player) continue;
      const audible = anySolo ? stem.solo : !stem.muted;
      player.mute = !audible;
      player.volume.value = Tone.gainToDb(stem.volume);
    }
    if (playing) {
      Tone.Transport.pause();
      Object.values(playersRef.current).forEach((p) => p?.stop());
      setPlaying(false);
    } else {
      Tone.Transport.bpm.value = bpm;
      Tone.Transport.start();
      Object.values(playersRef.current).forEach((p) => {
        if (p?.loaded) void p.start();
      });
      setPlaying(true);
    }
  }

  const visibleLanes = STEM_LANES.filter((l) =>
    data?.stems.some((s) => s.lane === l),
  );
  const bars = useMemo(() => Array.from({ length: 20 }, (_, i) => (i + 1) * 4), []);
  const playheadPct = Math.min(95, (position / 180) * 100 + 17);
  const selectedStem = data?.stems.find((s) => s.lane === selectedLane);
  const selectedColor = selectedLane
    ? LANE_META[selectedLane].color
    : "var(--pf-magenta)";

  return (
    <div className="-ml-16 -mt-16 flex h-screen w-[calc(100%+4rem)] flex-col overflow-hidden bg-[#0A0A0F] text-[var(--pf-body)]">
      {/* Transport header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--pf-border)] px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded text-[var(--pf-muted)] hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-white">
            Midnight Circuit v3
          </h1>
        </div>

        <div className="flex items-center gap-6 rounded-lg border border-[var(--pf-border)]/40 bg-[#131320]/80 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center text-white hover:text-[var(--pf-cyan)]"
            >
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => void togglePlay()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pf-cyan)] text-[#0A0A0F] shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-transform hover:scale-105"
            >
              {playing ? (
                <Pause size={22} fill="currentColor" />
              ) : (
                <Play size={22} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center text-white hover:text-[var(--pf-cyan)]"
            >
              <SkipForward size={18} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => setLoop(!loop)}
              className={cn(
                "ml-2 flex h-8 w-8 items-center justify-center",
                loop ? "text-[var(--pf-cyan)]" : "text-[var(--pf-muted)] hover:text-[var(--pf-cyan)]",
              )}
            >
              <Repeat size={18} />
            </button>
          </div>
          <div className="mx-2 h-6 w-px bg-[var(--pf-border)]" />
          <div className="flex items-baseline gap-2 font-[family-name:var(--font-jetbrains)]">
            <span className="text-lg text-[var(--pf-cyan)] drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
              {formatTimecode(position).padStart(6, "0")}
            </span>
            <span className="text-[10px] text-[var(--pf-muted)]">{bpm} BPM</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExportOpen(true)}
          className="rounded bg-gradient-to-r from-[var(--pf-cyan)] to-[var(--pf-magenta)] px-6 py-2 font-[family-name:var(--font-space-grotesk)] text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_10px_rgba(0,229,255,0.3)] transition-shadow hover:shadow-[0_0_20px_rgba(225,0,131,0.4)]"
        >
          Export
        </button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Track headers */}
        <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-r border-[var(--pf-border)] bg-[#0D0D14]">
          <div className="flex h-10 items-end justify-end border-b border-[var(--pf-border)] bg-[#12121a] px-2 pb-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--pf-muted)]">
              Bars
            </span>
          </div>
          {isLoading && (
            <p className="p-4 text-sm text-[var(--pf-muted)]">Loading…</p>
          )}
          {error && (
            <p className="p-4 text-sm text-red-300">Could not load stems.</p>
          )}
          {visibleLanes.map((lane) => {
            const stem = data?.stems.find((s) => s.lane === lane);
            if (!stem) return null;
            const meta = LANE_META[lane];
            const active = selectedLane === lane;
            return (
              <button
                key={lane}
                type="button"
                onClick={() => setSelectedLane(lane)}
                className={cn(
                  "relative flex h-[100px] flex-col justify-between border-b border-[var(--pf-border)] p-2 text-left transition-colors hover:bg-white/5",
                  active && "bg-white/[0.04]",
                )}
              >
                {active && (
                  <div
                    className="absolute bottom-0 left-0 top-0 w-0.5 shadow-[0_0_8px]"
                    style={{
                      backgroundColor: meta.color,
                      boxShadow: `0 0 8px ${meta.color}`,
                    }}
                  />
                )}
                <div className="flex items-center justify-between">
                  <span
                    className="font-[family-name:var(--font-jetbrains)] text-sm"
                    style={{ color: active ? meta.color : "#e8e8f0" }}
                  >
                    {meta.label}
                  </span>
                  <div className="flex gap-1">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        patch.mutate({ stemId: stem.id, muted: !stem.muted });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          patch.mutate({ stemId: stem.id, muted: !stem.muted });
                        }
                      }}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded border text-[10px] font-bold",
                        stem.muted
                          ? "border-red-400/50 bg-red-500/20 text-red-300"
                          : "border-[var(--pf-border)] text-[var(--pf-muted)] hover:bg-white/5",
                      )}
                    >
                      M
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        patch.mutate({ stemId: stem.id, solo: !stem.solo });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          patch.mutate({ stemId: stem.id, solo: !stem.solo });
                        }
                      }}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded border text-[10px] font-bold",
                        stem.solo
                          ? "border-[var(--pf-magenta)] bg-[var(--pf-magenta)]/20 text-[var(--pf-magenta)]"
                          : "border-[var(--pf-border)] text-[var(--pf-muted)] hover:bg-white/5",
                      )}
                    >
                      S
                    </span>
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full border border-[var(--pf-border)] bg-[#0A0A0F]"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(stem.volume * 100)}
                      onChange={(e) => {
                        e.stopPropagation();
                        const v = Number(e.target.value);
                        const player = playersRef.current[lane];
                        if (player) player.volume.value = Tone.gainToDb(v / 100);
                        patch.mutate({ stemId: stem.id, volume: v / 100 });
                      }}
                      className="h-full w-full cursor-pointer appearance-none bg-transparent accent-[var(--pf-cyan)]"
                    />
                  </div>
                  <span
                    className="flex h-6 w-6 items-center justify-center text-[var(--pf-muted)] hover:text-[var(--pf-magenta)]"
                    title="Regenerate stem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLane(lane);
                    }}
                  >
                    <Sparkles size={14} />
                  </span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Timeline */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-x-auto overflow-y-hidden bg-[#0F0F18]">
          <div className="sticky top-0 z-10 flex h-10 shrink-0 border-b border-[var(--pf-border)] bg-[#12121a]">
            <div
              className="relative flex h-full items-end"
              style={{
                width: `${2000 * zoom}px`,
                minWidth: "100%",
              }}
            >
              {markers.slice(0, 3).map((m, i) => (
                <div
                  key={m.id}
                  className="absolute top-0 cursor-ew-resize rounded-sm border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    left: `${(m.startBar / 80) * 100}%`,
                    borderColor:
                      i === 0
                        ? "rgba(0,229,255,0.5)"
                        : i === 1
                          ? "rgba(139,92,246,0.5)"
                          : "rgba(255,46,154,0.5)",
                    backgroundColor:
                      i === 0
                        ? "rgba(0,229,255,0.2)"
                        : i === 1
                          ? "rgba(139,92,246,0.2)"
                          : "rgba(255,46,154,0.2)",
                    color:
                      i === 0 ? "#00E5FF" : i === 1 ? "#8B5CF6" : "#FF2E9A",
                  }}
                  draggable
                  onDragEnd={(e) => {
                    const parent = e.currentTarget.parentElement;
                    if (!parent) return;
                    const rect = parent.getBoundingClientRect();
                    const x = Math.min(
                      Math.max(0, e.clientX - rect.left),
                      rect.width,
                    );
                    const startBar = Math.round((x / rect.width) * 80);
                    moveMarker(
                      m.id,
                      Math.max(0, startBar),
                      Math.min(80, startBar + (m.endBar - m.startBar)),
                    );
                  }}
                >
                  {m.label}
                </div>
              ))}
              {bars.map((b) => (
                <div
                  key={b}
                  className="flex h-1/2 flex-1 items-end border-l border-[var(--pf-border)]/30 pb-1 pl-1"
                >
                  <span className="text-[10px] uppercase text-[var(--pf-muted)]/50">
                    {b}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="pointer-events-none absolute bottom-0 top-0 z-30 w-px bg-[var(--pf-cyan)] shadow-[0_0_10px_rgba(0,229,255,0.8)]"
            style={{ left: `${playheadPct}%` }}
          >
            <div className="absolute -left-1.5 -top-1 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[var(--pf-cyan)]" />
          </div>

          <div
            className="relative flex flex-col"
            style={{
              width: `${2000 * zoom}px`,
              minWidth: "100%",
              backgroundImage:
                "linear-gradient(to right, rgba(59,73,76,0.35) 1px, transparent 1px)",
              backgroundSize: `${100 * zoom}px 100%`,
            }}
          >
            {visibleLanes.map((lane, idx) => {
              const meta = LANE_META[lane];
              const active = selectedLane === lane;
              return (
                <div
                  key={lane}
                  className={cn(
                    "relative flex h-[100px] items-center border-b border-[var(--pf-border)]/30 px-4",
                    active && "bg-white/[0.03]",
                  )}
                  onClick={() => setSelectedLane(lane)}
                >
                  {lane === "drums" && (
                    <div
                      className="absolute flex h-[70px] items-center justify-center overflow-hidden rounded border border-[var(--pf-cyan)]/40 bg-[var(--pf-cyan)]/10"
                      style={{ left: "2.5%", width: "15%" }}
                    >
                      <FakeWave color="#00E5FF" seed={1} />
                      <span className="absolute left-2 top-1 text-[9px] font-bold uppercase text-[var(--pf-cyan)]">
                        BEAT_LOOP_01
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "absolute flex h-[70px] items-center justify-center overflow-hidden rounded border",
                      active
                        ? "border-2 shadow-[0_0_15px_rgba(225,0,131,0.2)]"
                        : "",
                    )}
                    style={{
                      left: meta.left,
                      width: meta.width,
                      borderColor: `${meta.color}${active ? "" : "66"}`,
                      backgroundColor: `${meta.color}22`,
                    }}
                  >
                    {active && (
                      <div className="absolute bottom-0 right-0 top-0 w-0.5 bg-gradient-to-b from-[var(--pf-cyan)] to-[var(--pf-magenta)]" />
                    )}
                    <FakeWave color={meta.color} seed={idx + 3} />
                    <span
                      className="absolute left-2 top-1 text-[9px] font-bold uppercase"
                      style={{ color: meta.color }}
                    >
                      {meta.clip}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inspector */}
        <aside className="flex w-[320px] shrink-0 flex-col border-l border-[var(--pf-border)] bg-[#0D0D14] shadow-[-4px_0_24px_rgba(0,0,0,0.5)]">
          <div className="flex h-16 items-center border-b border-[var(--pf-border)] px-4">
            <span
              className="font-[family-name:var(--font-space-grotesk)] text-base font-semibold"
              style={{ color: selectedColor }}
            >
              Selected:{" "}
              {selectedLane ? LANE_META[selectedLane].label : "None"}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
            <div className="relative overflow-hidden rounded-lg border border-[var(--pf-magenta)]/50 bg-[#131320]/80 p-1">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--pf-magenta)]/5 to-[var(--pf-cyan)]/5" />
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                disabled={!selectedLane}
                placeholder="Describe changes... e.g., 'make this section more euphoric'"
                className="w-full resize-none rounded border border-[var(--pf-border)] bg-[#0A0A0F] p-3 text-[13px] text-white placeholder:text-[var(--pf-muted)]/50 focus:border-[var(--pf-magenta)] focus:outline-none focus:ring-1 focus:ring-[var(--pf-magenta)]"
              />
              <div className="flex justify-end px-1 pb-1 pt-2">
                <button
                  type="button"
                  disabled={
                    !selectedLane || !aiPrompt.trim() || patch.isPending
                  }
                  onClick={() =>
                    selectedLane &&
                    patch.mutate({
                      regenerate: {
                        lane: selectedLane,
                        instruction: aiPrompt,
                      },
                    })
                  }
                  className="flex items-center gap-1 rounded border border-[var(--pf-magenta)] bg-[var(--pf-magenta)]/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--pf-magenta)] transition-colors hover:bg-[var(--pf-magenta)]/10 disabled:opacity-40"
                >
                  <Sparkles size={14} />
                  Generate
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[var(--pf-muted)]">
                Track properties
              </h3>
              <div className="mb-2 flex items-center justify-between rounded border border-[var(--pf-border)]/50 bg-[#131320] p-3">
                <span className="text-sm text-white">Volume</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={
                      selectedStem
                        ? Math.round(selectedStem.volume * 100)
                        : 80
                    }
                    disabled={!selectedStem}
                    onChange={(e) => {
                      if (!selectedStem || !selectedLane) return;
                      const v = Number(e.target.value);
                      const player = playersRef.current[selectedLane];
                      if (player) player.volume.value = Tone.gainToDb(v / 100);
                      patch.mutate({
                        stemId: selectedStem.id,
                        volume: v / 100,
                      });
                    }}
                    className="h-1 w-24 accent-[var(--pf-cyan)]"
                  />
                  <span className="w-8 text-right font-[family-name:var(--font-jetbrains)] text-[10px] text-[var(--pf-cyan)]">
                    {selectedStem
                      ? (20 * Math.log10(Math.max(0.001, selectedStem.volume))).toFixed(1)
                      : "-2.4"}
                  </span>
                </div>
              </div>
              <div className="mb-2 space-y-2">
                <Dial
                  label="Reverb"
                  value={`${reverb}%`}
                  color="var(--pf-magenta)"
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={reverb}
                  onChange={(e) => setReverb(Number(e.target.value))}
                  className="w-full accent-[var(--pf-magenta)]"
                />
                <Dial
                  label="Filter (LP)"
                  value={
                    filterHz >= 1000
                      ? `${(filterHz / 1000).toFixed(1)}k`
                      : `${filterHz}`
                  }
                  color="#8B5CF6"
                />
                <input
                  type="range"
                  min={200}
                  max={8000}
                  value={filterHz}
                  onChange={(e) => setFilterHz(Number(e.target.value))}
                  className="w-full accent-[#8B5CF6]"
                />
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-2">
              {["Lead", "Arp", "Synth"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#c4b5fd]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom tools */}
      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-[var(--pf-border)] bg-[#161622] px-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-[var(--pf-muted)] hover:text-[var(--pf-cyan)]"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="text-[var(--pf-muted)] hover:text-[var(--pf-cyan)]"
          >
            <Redo2 size={16} />
          </button>
        </div>
        <div className="flex h-full items-center gap-2 border-x border-[var(--pf-border)] px-4 text-xs text-[var(--pf-muted)]">
          <Grid3x3 size={16} />
          <span>Snap:</span>
          <select
            value={snap}
            onChange={(e) => setSnap(e.target.value)}
            className="cursor-pointer border-none bg-transparent font-[family-name:var(--font-jetbrains)] text-xs text-[var(--pf-cyan)] focus:outline-none"
          >
            <option>1/16</option>
            <option>1/8</option>
            <option>1/4</option>
            <option>Bar</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-[var(--pf-muted)]">
          <button
            type="button"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/5"
          >
            <ZoomOut size={16} />
          </button>
          <input
            type="range"
            min={50}
            max={200}
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="h-1 w-24 accent-white"
          />
          <button
            type="button"
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/5"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </footer>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        takeId={takeId}
        projectId="proj_midnight"
      />
    </div>
  );
}
