"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Tone from "tone";
import {
  Play,
  Pause,
  Repeat,
  Download,
  Mic2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Slider } from "@/components/ui/slider";
import { Readout } from "@/components/ui/readout";
import { ExportModal } from "@/components/export/export-modal";
import { useEditorStore } from "@/lib/store/editor";
import { formatTimecode } from "@/lib/utils";
import type { Stem, StemLane } from "@/types";
import { STEM_LANES } from "@/types";

async function loadTake(takeId: string) {
  const res = await fetch(`/api/takes/${takeId}`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{ take: { id: string }; stems: Stem[] }>;
}

const LANE_COLOR: Record<StemLane, string> = {
  drums: "#FF2E9A",
  bass: "#00E5FF",
  melody: "#8B5CF6",
  pads: "#3DFFA2",
  vocals: "#FFB020",
};

export default function EditorPage() {
  const { takeId } = useParams<{ takeId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [exportOpen, setExportOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const playersRef = useRef<Partial<Record<StemLane, Tone.Player>>>({});
  const startedRef = useRef(false);

  const {
    playing,
    loop,
    position,
    bpm,
    zoom,
    markers,
    selectedLane,
    trimStart,
    trimEnd,
    setTake,
    setPlaying,
    setLoop,
    setPosition,
    setZoom,
    setSelectedLane,
    setTrim,
    moveMarker,
  } = useEditorStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["take", takeId],
    queryFn: () => loadTake(takeId),
  });

  useEffect(() => {
    setTake(takeId, 124);
  }, [takeId, setTake]);

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
      startedRef.current = true;
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
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

  const bars = useMemo(() => Array.from({ length: 16 }, (_, i) => i), []);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b border-[var(--pf-border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <Button size="icon" onClick={() => void togglePlay()}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <Button
            size="icon"
            variant={loop ? "primary" : "secondary"}
            onClick={() => setLoop(!loop)}
          >
            <Repeat size={16} />
          </Button>
          <Readout className="text-[var(--pf-cyan)]">
            {formatTimecode(position)}
          </Readout>
          <Readout className="text-[var(--pf-muted)]">{bpm} BPM</Readout>
        </div>
        <div className="flex items-center gap-3">
          <Slider
            className="w-40"
            label="Zoom"
            value={Math.round(zoom * 100)}
            min={50}
            max={200}
            onChange={(v) => setZoom(v / 100)}
          />
          <Button variant="secondary" onClick={() => router.push("/library")}>
            Library
          </Button>
          <Button onClick={() => setExportOpen(true)}>
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex-1 overflow-auto p-4">
          {isLoading && (
            <p className="text-sm text-[var(--pf-muted)]">Loading stems…</p>
          )}
          {error && (
            <p className="text-sm text-red-300">Could not load editor.</p>
          )}

          <div
            className="mb-2 flex gap-1 font-[family-name:var(--font-jetbrains)] text-[10px] text-[var(--pf-muted)]"
            style={{ transform: `scaleX(${zoom})`, transformOrigin: "left" }}
          >
            {bars.map((b) => (
              <div
                key={b}
                className="h-6 w-16 border-l border-[var(--pf-border)] pl-1"
              >
                {b + 1}
              </div>
            ))}
          </div>

          <div
            className="relative mb-4 h-8 rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F]"
            style={{ transform: `scaleX(${zoom})`, transformOrigin: "left" }}
          >
            {markers.map((m) => (
              <div
                key={m.id}
                className="absolute top-0 flex h-full cursor-ew-resize items-center justify-center border border-[var(--pf-violet)]/40 bg-[var(--pf-violet)]/20 text-[10px] text-[#d0bcff]"
                style={{
                  left: `${(m.startBar / 16) * 100}%`,
                  width: `${((m.endBar - m.startBar) / 16) * 100}%`,
                }}
                draggable
                onDragEnd={(e) => {
                  const rect = (
                    e.currentTarget.parentElement as HTMLElement
                  ).getBoundingClientRect();
                  const x = Math.min(
                    Math.max(0, e.clientX - rect.left),
                    rect.width,
                  );
                  const startBar = Math.round((x / rect.width) * 16);
                  moveMarker(
                    m.id,
                    Math.max(0, startBar),
                    Math.min(16, startBar + (m.endBar - m.startBar)),
                  );
                }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="mb-3 flex items-center gap-3 text-xs text-[var(--pf-muted)]">
            <span>Trim</span>
            <input
              type="number"
              min={0}
              max={trimEnd - 1}
              value={trimStart}
              onChange={(e) => setTrim(Number(e.target.value), trimEnd)}
              className="w-16 rounded border border-[var(--pf-border)] bg-[#0A0A0F] px-2 py-1 font-[family-name:var(--font-jetbrains)]"
            />
            <span>→</span>
            <input
              type="number"
              min={trimStart + 1}
              max={16}
              value={trimEnd}
              onChange={(e) => setTrim(trimStart, Number(e.target.value))}
              className="w-16 rounded border border-[var(--pf-border)] bg-[#0A0A0F] px-2 py-1 font-[family-name:var(--font-jetbrains)]"
            />
            <span>(snap to bar — visual loop region)</span>
          </div>

          <div className="space-y-2">
            {STEM_LANES.map((lane) => {
              const stem = data?.stems.find((s) => s.lane === lane);
              if (!stem) return null;
              return (
                <Panel
                  key={lane}
                  active={selectedLane === lane}
                  className="flex items-center gap-3 p-3"
                  onClick={() => setSelectedLane(lane)}
                >
                  <div className="w-20">
                    <p className="text-sm capitalize text-white">{lane}</p>
                  </div>
                  <button
                    className={`rounded px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[10px] ${stem.muted ? "bg-red-500/20 text-red-300" : "border border-[var(--pf-border)] text-[var(--pf-muted)]"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      patch.mutate({ stemId: stem.id, muted: !stem.muted });
                    }}
                  >
                    M
                  </button>
                  <button
                    className={`rounded px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[10px] ${stem.solo ? "bg-[var(--pf-cyan)]/20 text-[var(--pf-cyan)]" : "border border-[var(--pf-border)] text-[var(--pf-muted)]"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      patch.mutate({ stemId: stem.id, solo: !stem.solo });
                    }}
                  >
                    S
                  </button>
                  <div
                    className="h-10 flex-1 rounded"
                    style={{
                      background: `linear-gradient(90deg, ${LANE_COLOR[lane]}55, transparent)`,
                    }}
                  />
                  <div className="w-32" onClick={(e) => e.stopPropagation()}>
                    <Slider
                      value={Math.round(stem.volume * 100)}
                      onChange={(v) => {
                        const player = playersRef.current[lane];
                        if (player) player.volume.value = Tone.gainToDb(v / 100);
                        patch.mutate({ stemId: stem.id, volume: v / 100 });
                      }}
                    />
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>

        <aside className="w-80 shrink-0 overflow-y-auto border-l border-[var(--pf-border)] p-4">
          <h2 className="mb-4 font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-white">
            {selectedLane ? `${selectedLane} lane` : "Selection"}
          </h2>
          <Panel className="mb-4 space-y-3 p-4">
            <p className="text-xs text-[var(--pf-muted)]">
              Tone.js effects (live)
            </p>
            <Slider label="Reverb send (UI)" value={20} onChange={() => {}} />
            <Slider label="Filter" value={70} onChange={() => {}} />
          </Panel>
          <Panel className="p-4">
            <div className="mb-2 flex items-center gap-2 text-[var(--pf-magenta)]">
              <Mic2 size={16} />
              <span className="text-sm font-semibold">AI regenerate stem</span>
            </div>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              className="mb-3 w-full rounded-lg border border-[var(--pf-magenta)]/40 bg-[#0A0A0F] p-3 text-sm"
              placeholder="Make the bass darker and more rolling…"
              disabled={!selectedLane}
            />
            <Button
              variant="ai"
              className="w-full"
              disabled={!selectedLane || !aiPrompt.trim() || patch.isPending}
              onClick={() =>
                selectedLane &&
                patch.mutate({
                  regenerate: {
                    lane: selectedLane,
                    instruction: aiPrompt,
                  },
                })
              }
            >
              Regenerate
            </Button>
          </Panel>
        </aside>
      </div>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        takeId={takeId}
        projectId="proj_midnight"
      />
    </div>
  );
}
