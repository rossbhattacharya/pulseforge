"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Upload,
  ShieldCheck,
  Sparkles,
  FileText,
  SlidersHorizontal,
  Mic,
  SmilePlus,
  Atom,
  X,
  Zap,
  Timer,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MiniWaveform } from "@/components/ui/wave-card";
import { analyzeAudioFile } from "@/lib/references/analyze";
import { GENRES, KEYS, type InfluenceMode } from "@/types";

const MOOD_DNA = [
  "Dark",
  "Euphoric",
  "Aggressive",
  "Melancholic",
  "Groovy",
  "Atmospheric",
] as const;

const DURATIONS = [
  { label: "30s", sec: 30 },
  { label: "1m", sec: 60 },
  { label: "2m", sec: 120 },
  { label: "3m+", sec: 180 },
] as const;

type LocalRef = {
  analysisId: string;
  name: string;
  mode: InfluenceMode;
  strength: number;
  aspects: { rhythm: number; mood: number; instrumentation: number };
  rightsAttested: boolean;
  bpm: number;
  key: string;
  mood_tags: string[];
  status: "analyzing" | "analyzed";
  file?: File;
  fileHash?: string;
};

function energyLabel(v: number) {
  if (v >= 75) return "Peak";
  if (v >= 45) return "Drive";
  return "Chill";
}

function estimateRender(takeCount: number, durationSec: number) {
  const sec = Math.round(18 + takeCount * 8 + durationSec * 0.15);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `~ ${m}m ${s.toString().padStart(2, "0")}s` : `~ ${s}s`;
}

export default function CreateClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [prompt, setPrompt] = useState(params.get("prompt") ?? "");
  const [genre, setGenre] = useState(params.get("genre") ?? "Techno");
  const [bpm, setBpm] = useState(128);
  const [key, setKey] = useState("Auto-detect");
  const [energy, setEnergy] = useState(85);
  const [durationSec, setDurationSec] = useState(120);
  const [vocals, setVocals] = useState(true);
  const [lyrics, setLyrics] = useState(
    "Ethereal female vocal chops, heavily delayed, in key.",
  );
  const [moodTags, setMoodTags] = useState<string[]>(["Dark", "Aggressive"]);
  const [takeCount, setTakeCount] = useState(4);
  const [refs, setRefs] = useState<LocalRef[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedApplied, setSeedApplied] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  const { data: providerInfo } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const res = await fetch("/api/providers");
      return res.json() as Promise<{
        mode: string;
        providerId: string;
        capabilities: { audioConditioning: boolean };
      }>;
    },
  });
  const audioConditioningEnabled =
    providerInfo?.capabilities.audioConditioning ?? false;

  const { data } = useQuery({
    queryKey: ["refs"],
    queryFn: async () => {
      const res = await fetch("/api/projects?references=1");
      return res.json() as Promise<{
        references: Array<{
          id: string;
          source_name: string;
          bpm: number;
          key: string;
          mood_tags: string[];
        }>;
      }>;
    },
  });

  useEffect(() => {
    const seedId = params.get("seed");
    if (!seedId || !data?.references || seedApplied) return;
    const seed = data.references.find((r) => r.id === seedId);
    if (!seed) return;
    setRefs((prev) => {
      if (prev.some((r) => r.analysisId === seed.id)) return prev;
      return [
        ...prev,
        {
          analysisId: seed.id,
          name: seed.source_name,
          mode: "features",
          strength: 65,
          aspects: { rhythm: 70, mood: 80, instrumentation: 55 },
          rightsAttested: false,
          bpm: seed.bpm,
          key: seed.key,
          mood_tags: seed.mood_tags,
          status: "analyzed",
        },
      ];
    });
    setSeedApplied(true);
  }, [params, data, seedApplied]);

  const creditHint = useMemo(() => {
    const hasAudio = refs.some((r) => r.mode === "audio" && r.rightsAttested);
    const per = hasAudio ? 2 : 1;
    return `${per * takeCount} credits`;
  }, [refs, takeCount]);

  const generate = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          params: {
            genre,
            bpm,
            key: key === "Auto-detect" ? "A min" : key,
            energy,
            durationSec,
            vocals,
            lyrics: vocals ? lyrics : undefined,
            moodTags,
            takeCount,
            references: refs.map((r) => ({
              analysisId: r.analysisId,
              mode: r.mode,
              strength: r.strength,
              aspects: r.aspects,
              rightsAttested: r.rightsAttested,
            })),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      return json as { generation: { id: string } };
    },
    onSuccess: (data) => router.push(`/generating/${data.generation.id}`),
    onError: (e: Error) => setError(e.message),
  });

  function enhancePrompt() {
    setEnhancing(true);
    window.setTimeout(() => {
      const extras = [
        `${bpm} BPM`,
        key === "Auto-detect" ? "key auto-detected from references" : key,
        `${energyLabel(energy).toLowerCase()} energy`,
        moodTags.length ? `${moodTags.join("/")} mood` : "",
        vocals ? `vocals: ${lyrics.slice(0, 80)}` : "instrumental only",
        "original composition, not a cover or remix",
      ]
        .filter(Boolean)
        .join("; ");
      setPrompt((p) => {
        const base = p.trim() || `A ${genre.toLowerCase()} track`;
        if (base.includes("original composition")) return base.slice(0, 500);
        return `${base}. ${extras}`.slice(0, 500);
      });
      setEnhancing(false);
    }, 450);
  }

  async function attestAndStore(ref: LocalRef, checked: boolean) {
    if (!checked) {
      setRefs((prev) =>
        prev.map((r) =>
          r.analysisId === ref.analysisId
            ? { ...r, rightsAttested: false, mode: "features" as const }
            : r,
        ),
      );
      return;
    }
    if (!ref.file) {
      setError("Re-upload the reference to enable audio conditioning.");
      return;
    }
    if (!audioConditioningEnabled) {
      setError(
        "Audio conditioning requires MUSIC_PROVIDER=split and STABILITY_API_KEY.",
      );
      return;
    }
    const form = new FormData();
    form.append("file", ref.file);
    form.append("analysisId", ref.analysisId);
    form.append("rightsAttested", "true");
    if (ref.fileHash) form.append("fileHash", ref.fileHash);
    const res = await fetch("/api/references", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to store attested reference");
      return;
    }
    setRefs((prev) =>
      prev.map((r) =>
        r.analysisId === ref.analysisId ? { ...r, rightsAttested: true } : r,
      ),
    );
  }

  async function onUpload(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      setError("Max file size is 20MB.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    const tempId = `temp_${Date.now()}`;
    setRefs((prev) => [
      {
        analysisId: tempId,
        name: file.name,
        mode: "features",
        strength: 60,
        aspects: { rhythm: 80, mood: 40, instrumentation: 60 },
        rightsAttested: false,
        bpm: 0,
        key: "…",
        mood_tags: [],
        status: "analyzing",
        file,
      },
      ...prev,
    ]);
    try {
      const analysis = await analyzeAudioFile(file);
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        await file.arrayBuffer(),
      );
      const fileHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reference",
          data: {
            source_name: file.name,
            bpm: analysis.bpm,
            key: analysis.key,
            energy: analysis.energy,
            mood_tags: analysis.mood_tags,
            features: analysis.features,
            audio_url: null,
            rights_attested: false,
            influence_mode: "features",
            file_hash: fileHash,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analyze failed");
      const ref = json.reference as {
        id: string;
        source_name: string;
        bpm: number;
        key: string;
        mood_tags: string[];
      };
      setRefs((prev) =>
        prev.map((r) =>
          r.analysisId === tempId
            ? {
                ...r,
                analysisId: ref.id,
                name: ref.source_name,
                bpm: ref.bpm,
                key: ref.key,
                mood_tags: ref.mood_tags,
                status: "analyzed",
                file,
                fileHash,
              }
            : r,
        ),
      );
    } catch (e) {
      setRefs((prev) => prev.filter((r) => r.analysisId !== tempId));
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex-1 overflow-y-auto px-4 pb-36 pt-5 md:px-5">
        <p className="mb-4 text-center text-xs text-[var(--pf-muted)] lg:text-left">
          Your references guide the vibe — every generation is a new, original
          composition.
        </p>

        <div className="mx-auto grid max-w-[1600px] grid-cols-1 items-start gap-4 lg:grid-cols-12">
          {/* Left 7/12 */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            <div className="flex items-end justify-between border-b border-[var(--pf-border-subtle)] pb-2">
              <h2 className="flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-white">
                <FileText size={22} className="text-[var(--pf-cyan)]" />
                Describe your track
              </h2>
              <button
                type="button"
                onClick={enhancePrompt}
                disabled={enhancing}
                className="generative-glow flex items-center gap-2 rounded border border-[var(--pf-magenta)] bg-[var(--pf-magenta)]/5 px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-[11px] font-bold uppercase tracking-wider text-[var(--pf-magenta)] transition-colors hover:bg-[var(--pf-magenta)]/10"
              >
                <Sparkles size={14} className={enhancing ? "animate-spin" : ""} />
                Enhance prompt with AI
              </button>
            </div>

            <div className="relative">
              <textarea
                value={prompt}
                maxLength={500}
                onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
                rows={6}
                className="h-40 w-full resize-none rounded-lg border border-[var(--pf-border-subtle)] bg-[#0d0d1a] p-4 text-sm text-white placeholder:text-[var(--pf-muted)]/50 focus:border-[var(--pf-cyan)] focus:outline-none focus:shadow-[0_0_8px_rgba(0,218,243,0.3)]"
                placeholder="E.g., A driving cyberpunk techno track with heavy distorted basslines, ethereal vocal chops, and a climactic drop at 1:30. Needs to feel massive and dark."
              />
              <span className="absolute bottom-4 right-4 font-[family-name:var(--font-jetbrains)] text-xs text-[var(--pf-muted)]">
                {prompt.length}/500
              </span>
            </div>

            <div className="flex flex-col gap-6 rounded-xl border border-[var(--pf-border-subtle)] bg-[#1e1e2c] p-5">
              <h3 className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[11px] font-bold uppercase tracking-widest text-[var(--pf-muted)]">
                <SlidersHorizontal size={16} />
                Sound Parameters
              </h3>

              <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-[var(--pf-muted)]">
                    Primary Genre
                  </label>
                  <div className="relative">
                    <select
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full appearance-none rounded border border-[var(--pf-border-subtle)] bg-[#0d0d1a] px-3 py-2 text-sm text-white focus:border-[var(--pf-cyan)] focus:outline-none"
                    >
                      {GENRES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--pf-muted)]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-[var(--pf-muted)]">
                    Musical Key (Optional)
                  </label>
                  <div className="relative">
                    <select
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      className="w-full appearance-none rounded border border-[var(--pf-border-subtle)] bg-[#0d0d1a] px-3 py-2 text-sm text-white focus:border-[var(--pf-cyan)] focus:outline-none"
                    >
                      <option value="Auto-detect">Auto-detect</option>
                      {KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--pf-muted)]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <div className="flex items-end justify-between">
                    <label className="text-xs text-[var(--pf-muted)]">
                      Tempo (BPM)
                    </label>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[13px] text-[var(--pf-cyan)]">
                      {bpm}
                    </span>
                  </div>
                  <Slider value={bpm} min={60} max={180} onChange={setBpm} />
                  <div className="flex justify-between font-[family-name:var(--font-jetbrains)] text-[10px] text-[var(--pf-muted)]/50">
                    <span>60</span>
                    <span>120</span>
                    <span>180</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label className="text-xs text-[var(--pf-muted)]">Duration</label>
                  <div className="flex h-9 overflow-hidden rounded-lg border border-[var(--pf-border-subtle)] bg-[#0d0d1a]">
                    {DURATIONS.map((d, i) => (
                      <button
                        key={d.label}
                        type="button"
                        onClick={() => setDurationSec(d.sec)}
                        className={`flex-1 font-[family-name:var(--font-jetbrains)] text-[11px] font-bold uppercase tracking-wider transition-colors ${
                          i < DURATIONS.length - 1
                            ? "border-r border-[var(--pf-border-subtle)]"
                            : ""
                        } ${
                          durationSec === d.sec
                            ? "bg-[var(--pf-cyan)]/10 text-[var(--pf-cyan)] shadow-[inset_0_-2px_0_#00e5ff]"
                            : "text-[var(--pf-muted)] hover:bg-white/5"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-2 sm:col-span-2">
                  <div className="flex items-end justify-between">
                    <label className="text-xs text-[var(--pf-muted)]">
                      Energy Level
                    </label>
                    <span className="text-xs text-[var(--pf-magenta)]">
                      {energyLabel(energy)}
                    </span>
                  </div>
                  <div className="relative h-6">
                    <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[linear-gradient(to_right,#00daf3,#e10083)]" />
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={energy}
                      onChange={(e) => setEnergy(Number(e.target.value))}
                      className="relative z-10 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-widest text-[var(--pf-muted)]/50">
                    <span>Chill</span>
                    <span>Peak</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4 rounded-xl border border-[var(--pf-border-subtle)] bg-[#1e1e2c] p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[11px] font-bold uppercase tracking-wider text-[var(--pf-muted)]">
                    <Mic size={16} />
                    Vocals
                  </span>
                  <button
                    type="button"
                    onClick={() => setVocals((v) => !v)}
                    className={`relative h-5 w-10 rounded-full transition-colors ${vocals ? "bg-[var(--pf-cyan)]" : "bg-[#343342]"}`}
                    aria-pressed={vocals}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${vocals ? "left-5" : "left-0.5"}`}
                    />
                  </button>
                </div>
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  disabled={!vocals}
                  rows={3}
                  className="h-20 w-full resize-none rounded border border-[var(--pf-border-subtle)] bg-[#0d0d1a] p-3 text-[13px] text-white placeholder:text-[var(--pf-muted)]/50 focus:border-[var(--pf-cyan)] focus:outline-none disabled:opacity-40"
                  placeholder="Describe vocal style…"
                />
              </div>

              <div className="flex flex-col gap-4 rounded-xl border border-[var(--pf-border-subtle)] bg-[#1e1e2c] p-4">
                <span className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[11px] font-bold uppercase tracking-wider text-[var(--pf-muted)]">
                  <SmilePlus size={16} />
                  Mood DNA
                </span>
                <div className="flex flex-wrap gap-2">
                  {MOOD_DNA.map((tag) => {
                    const selected = moodTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setMoodTags((prev) =>
                            selected
                              ? prev.filter((t) => t !== tag)
                              : [...prev, tag],
                          )
                        }
                        className={`cursor-pointer rounded border px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[11px] transition-colors ${
                          selected
                            ? "border-[var(--pf-cyan)] bg-[var(--pf-cyan)]/10 text-[var(--pf-cyan)] shadow-[0_0_8px_rgba(0,218,243,0.2)]"
                            : "border-[var(--pf-border-subtle)] bg-[#1a1a28] text-[#d0bcff] hover:border-[#d0bcff]"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="self-center text-[var(--pf-muted)] hover:text-white"
                    title="More moods"
                    onClick={() =>
                      setMoodTags((prev) =>
                        prev.includes("Hypnotic")
                          ? prev
                          : [...prev, "Hypnotic"],
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5/12 Inspiration */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            <div className="border-b border-[var(--pf-border-subtle)] pb-2">
              <h2 className="flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold text-white">
                <Atom size={22} className="text-[#d0bcff]" />
                Inspiration
              </h2>
            </div>

            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--pf-border-subtle)] bg-[#1a1a28]/50 p-8 text-center transition-all hover:border-[var(--pf-cyan)]/50 hover:bg-[#1a1a28]">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#343342] transition-colors group-hover:bg-[var(--pf-cyan)]/10 group-hover:text-[var(--pf-cyan)]">
                <Upload size={22} />
              </div>
              <span className="text-sm text-white">
                {analyzing ? "Analyzing…" : "Drag & drop reference tracks"}
              </span>
              <span className="mt-1 text-xs text-[var(--pf-muted)]">
                MP3, WAV, FLAC (Max 20MB) — no YouTube/streaming links
              </span>
              <input
                type="file"
                accept="audio/*,.flac"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUpload(f);
                }}
              />
            </label>

            <div className="flex flex-col gap-4">
              {refs.map((ref) => (
                <div
                  key={ref.analysisId}
                  className="relative flex flex-col overflow-hidden rounded-lg border border-[var(--pf-border-subtle)] bg-[#1e1e2c]"
                >
                  <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-gradient-to-b from-[var(--pf-cyan)] to-[var(--pf-magenta)] shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
                  <div className="flex flex-col gap-4 p-4 pl-5">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-[family-name:var(--font-jetbrains)] text-[13px] text-white">
                          {ref.name}
                        </p>
                        <p
                          className={`text-xs ${ref.status === "analyzing" ? "text-[var(--pf-cyan)]" : "text-[var(--pf-muted)]"}`}
                        >
                          {ref.status === "analyzing"
                            ? "Analyzing DNA…"
                            : "Analyzed"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-[var(--pf-muted)] hover:text-red-300"
                        onClick={() =>
                          setRefs((prev) =>
                            prev.filter((r) => r.analysisId !== ref.analysisId),
                          )
                        }
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 rounded border border-[var(--pf-border-subtle)]/50 bg-[#0d0d1a] p-2">
                      <div className="min-w-0 flex-1">
                        <MiniWaveform seed={ref.bpm || 3} />
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <span className="rounded bg-[#343342] px-1.5 py-0.5 text-right font-[family-name:var(--font-jetbrains)] text-[9px] text-[var(--pf-muted)]">
                          {ref.status === "analyzing" ? "--" : ref.bpm} BPM
                        </span>
                        <span className="rounded bg-[#343342] px-1.5 py-0.5 text-right font-[family-name:var(--font-jetbrains)] text-[9px] text-[var(--pf-muted)]">
                          {ref.status === "analyzing" ? "Unk" : ref.key}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {(
                        [
                          ["Rhythm", "rhythm"],
                          ["Mood", "mood"],
                          ["Inst", "instrumentation"],
                        ] as const
                      ).map(([label, keyName]) => (
                        <div key={keyName} className="flex flex-col gap-1">
                          <span className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase text-[var(--pf-muted)]">
                            {label}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={ref.aspects[keyName]}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setRefs((prev) =>
                                prev.map((r) =>
                                  r.analysisId === ref.analysisId
                                    ? {
                                        ...r,
                                        aspects: { ...r.aspects, [keyName]: v },
                                      }
                                    : r,
                                ),
                              );
                            }}
                            className="h-1 w-full cursor-pointer appearance-none rounded bg-[#0d0d1a] accent-[#00e5ff]"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setRefs((prev) =>
                            prev.map((r) =>
                              r.analysisId === ref.analysisId
                                ? { ...r, mode: "features" }
                                : r,
                            ),
                          )
                        }
                        className={`rounded border px-2 py-1 text-[10px] ${ref.mode === "features" ? "border-[var(--pf-cyan)] text-[var(--pf-cyan)]" : "border-[var(--pf-border)] text-[var(--pf-muted)]"}`}
                      >
                        Feature guidance
                      </button>
                      <button
                        type="button"
                        disabled={
                          !ref.rightsAttested || !audioConditioningEnabled
                        }
                        onClick={() =>
                          setRefs((prev) =>
                            prev.map((r) =>
                              r.analysisId === ref.analysisId
                                ? { ...r, mode: "audio" }
                                : r,
                            ),
                          )
                        }
                        className={`rounded border px-2 py-1 text-[10px] disabled:opacity-40 ${ref.mode === "audio" ? "border-[var(--pf-magenta)] text-[var(--pf-magenta)]" : "border-[var(--pf-border)] text-[var(--pf-muted)]"}`}
                      >
                        Audio conditioning
                      </button>
                    </div>

                    <label className="flex items-start gap-2 text-[11px] text-[var(--pf-body)]">
                      <input
                        type="checkbox"
                        checked={ref.rightsAttested}
                        onChange={(e) =>
                          void attestAndStore(ref, e.target.checked)
                        }
                        className="mt-0.5"
                      />
                      <span className="flex gap-1.5">
                        <ShieldCheck
                          size={12}
                          className="mt-0.5 shrink-0 text-[var(--pf-success)]"
                        />
                        I own this recording or have the rights to use it (my own
                        demos, purchased samples, licensed or royalty-free music).
                      </span>
                    </label>

                    <Slider
                      label="Influence strength"
                      value={ref.strength}
                      onChange={(v) =>
                        setRefs((prev) =>
                          prev.map((r) =>
                            r.analysisId === ref.analysisId
                              ? { ...r, strength: v }
                              : r,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-16 right-0 z-40 flex items-center justify-between border-t border-[var(--pf-border-subtle)] bg-[#131320]/80 px-4 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] backdrop-blur-[20px] md:px-5">
        <div className="flex items-center gap-6">
          <div className="hidden flex-col sm:flex">
            <span className="text-[11px] uppercase tracking-widest text-[var(--pf-muted)]">
              Est. Render
            </span>
            <span className="flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[13px] text-white">
              <Timer size={14} className="text-[#d0bcff]" />
              {estimateRender(takeCount, durationSec)}
            </span>
          </div>
          <div className="hidden h-8 w-px bg-[var(--pf-border-subtle)] sm:block" />
          <div className="flex flex-col">
            <span className="mb-1 text-[11px] uppercase tracking-widest text-[var(--pf-muted)]">
              Output Takes
            </span>
            <div className="flex overflow-hidden rounded border border-[var(--pf-border-subtle)] bg-[#0d0d1a]">
              {[1, 2, 4].map((n, i) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTakeCount(n)}
                  className={`px-3 py-1 font-[family-name:var(--font-jetbrains)] text-[12px] transition-colors ${
                    i < 2 ? "border-r border-[var(--pf-border-subtle)]" : ""
                  } ${
                    takeCount === n
                      ? "bg-[var(--pf-cyan)]/20 text-[var(--pf-cyan)] shadow-[inset_0_-2px_0_#00e5ff]"
                      : "text-[var(--pf-muted)] hover:bg-white/5"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <span className="hidden font-[family-name:var(--font-jetbrains)] text-xs text-[var(--pf-cyan)] md:inline">
            {creditHint}
          </span>
          {error && <span className="max-w-xs text-sm text-red-300">{error}</span>}
        </div>

        <Button
          size="lg"
          disabled={!prompt.trim() || generate.isPending}
          onClick={() => generate.mutate()}
          className="h-12 px-8 text-[18px] shadow-[0_0_20px_rgba(225,0,131,0.3)]"
        >
          <Zap size={18} />
          {generate.isPending ? "Queuing…" : "Generate Track"}
        </Button>
      </div>
    </div>
  );
}
