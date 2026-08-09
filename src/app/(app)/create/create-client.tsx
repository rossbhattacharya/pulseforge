"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { Slider } from "@/components/ui/slider";
import { Readout } from "@/components/ui/readout";
import { analyzeAudioFile } from "@/lib/references/analyze";
import { GENRES, KEYS, MOOD_TAGS, type InfluenceMode } from "@/types";

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
  file?: File;
  fileHash?: string;
};

export default function CreateClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [prompt, setPrompt] = useState(params.get("prompt") ?? "");
  const [genre, setGenre] = useState(params.get("genre") ?? "Melodic Techno");
  const [bpm, setBpm] = useState(124);
  const [key, setKey] = useState("A min");
  const [energy, setEnergy] = useState(72);
  const [durationSec, setDurationSec] = useState(60);
  const [vocals, setVocals] = useState(false);
  const [lyrics, setLyrics] = useState("");
  const [moodTags, setMoodTags] = useState<string[]>(["Dark", "Euphoric"]);
  const [takeCount, setTakeCount] = useState(4);
  const [refs, setRefs] = useState<LocalRef[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedApplied, setSeedApplied] = useState(false);
  const [creditHint, setCreditHint] = useState<string | null>(null);

  const { data: providerInfo } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const res = await fetch("/api/providers");
      return res.json() as Promise<{
        mode: string;
        providerId: string;
        capabilities: {
          audioConditioning: boolean;
          stems: boolean;
          maxRefDurationS: number;
        };
        keys: { stability: boolean; elevenlabs: boolean };
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
        },
      ];
    });
    setSeedApplied(true);
  }, [params, data, seedApplied]);

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
            key,
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
    onSuccess: (data) => {
      router.push(`/generating/${data.generation.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  useEffect(() => {
    const hasAudio = refs.some((r) => r.mode === "audio" && r.rightsAttested);
    const per = hasAudio ? 2 : 1;
    setCreditHint(
      `${per * takeCount} credits (${per}/take${hasAudio ? ", audio conditioning" : ""})`,
    );
  }, [refs, takeCount]);

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
        "Audio conditioning requires MUSIC_PROVIDER=split (or stable) and STABILITY_API_KEY.",
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
        r.analysisId === ref.analysisId
          ? { ...r, rightsAttested: true }
          : r,
      ),
    );
  }

  async function onUpload(file: File) {
    setAnalyzing(true);
    setError(null);
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
      setRefs((prev) => [
        ...prev,
        {
          analysisId: ref.id,
          name: ref.source_name,
          mode: "features",
          strength: 60,
          aspects: { rhythm: 70, mood: 70, instrumentation: 60 },
          rightsAttested: false,
          bpm: ref.bpm,
          key: ref.key,
          mood_tags: ref.mood_tags,
          file,
          fileHash,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-28">
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-white">
            Create
          </h1>
          <p className="mt-1 text-sm text-[var(--pf-muted)]">
            Your references guide the vibe — every generation is a new, original
            composition.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <Panel className="p-5">
              <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--pf-muted)]">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="input-glow w-full resize-none rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F] p-4 text-sm text-white placeholder:text-[var(--pf-muted)] focus:outline-none"
                placeholder="dreamy melodic techno, rolling bassline, late-night warehouse energy…"
              />
            </Panel>

            <Panel className="space-y-5 p-5">
              <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-white">
                Sound parameters
              </h2>
              <div>
                <label className="mb-2 block text-xs text-[var(--pf-muted)]">
                  Genre
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g) => (
                    <Chip
                      key={g}
                      selected={genre === g}
                      onClick={() => setGenre(g)}
                    >
                      {g}
                    </Chip>
                  ))}
                </div>
              </div>
              <Slider label="BPM" value={bpm} min={60} max={180} onChange={setBpm} />
              <div>
                <label className="mb-2 block text-xs text-[var(--pf-muted)]">
                  Key
                </label>
                <div className="flex flex-wrap gap-2">
                  {KEYS.map((k) => (
                    <Chip key={k} selected={key === k} onClick={() => setKey(k)}>
                      {k}
                    </Chip>
                  ))}
                </div>
              </div>
              <Slider
                label="Energy"
                value={energy}
                min={0}
                max={100}
                onChange={setEnergy}
              />
              <Slider
                label="Duration (sec)"
                value={durationSec}
                min={30}
                max={180}
                step={15}
                onChange={setDurationSec}
              />
              <div className="flex items-center justify-between rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F] px-4 py-3">
                <div>
                  <p className="text-sm text-white">Vocals</p>
                  <p className="text-xs text-[var(--pf-muted)]">
                    Optional lyrics direction
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVocals((v) => !v)}
                  className={`h-7 w-12 rounded-full transition-colors ${vocals ? "bg-[var(--pf-magenta)]" : "bg-[var(--pf-border)]"}`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition-transform ${vocals ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
              {vocals && (
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F] p-3 text-sm"
                  placeholder="Lyric themes / phrases…"
                />
              )}
            </Panel>

            <Panel className="p-5">
              <h2 className="mb-3 font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-white">
                Mood
              </h2>
              <div className="flex flex-wrap gap-2">
                {MOOD_TAGS.map((tag) => {
                  const selected = moodTags.includes(tag);
                  return (
                    <Chip
                      key={tag}
                      selected={selected}
                      glow={selected}
                      onClick={() =>
                        setMoodTags((prev) =>
                          selected
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag],
                        )
                      }
                    >
                      {tag}
                    </Chip>
                  );
                })}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel className="p-5">
              <h2 className="mb-2 font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-white">
                References
              </h2>
              <p className="mb-4 text-xs text-[var(--pf-muted)]">
                Feature guidance works with any upload. Audio conditioning
                requires rights attestation
                {audioConditioningEnabled
                  ? " and routes to Stable Audio."
                  : " (enable MUSIC_PROVIDER=split + STABILITY_API_KEY)."}
                {" "}Provider: {providerInfo?.providerId ?? "…"} ({providerInfo?.mode ?? "…"})
              </p>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--pf-border)] bg-[#0A0A0F] px-6 py-10 transition-colors hover:border-[var(--pf-cyan)]/50">
                <Upload className="mb-3 text-[var(--pf-cyan)]" size={28} />
                <span className="text-sm text-white">
                  {analyzing ? "Analyzing…" : "Drop audio to analyze"}
                </span>
                <span className="mt-1 text-xs text-[var(--pf-muted)]">
                  WAV / MP3 / AIFF — no YouTube or streaming links
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onUpload(f);
                  }}
                />
              </label>

              <div className="mt-4 space-y-4">
                {refs.map((ref) => (
                  <Panel key={ref.analysisId} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{ref.name}</p>
                        <Readout className="text-[var(--pf-muted)]">
                          {ref.bpm} BPM · {ref.key}
                        </Readout>
                      </div>
                      <button
                        className="text-xs text-[var(--pf-muted)] hover:text-red-300"
                        onClick={() =>
                          setRefs((prev) =>
                            prev.filter((r) => r.analysisId !== ref.analysisId),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Chip
                        selected={ref.mode === "features"}
                        onClick={() =>
                          setRefs((prev) =>
                            prev.map((r) =>
                              r.analysisId === ref.analysisId
                                ? { ...r, mode: "features" }
                                : r,
                            ),
                          )
                        }
                      >
                        Feature guidance
                      </Chip>
                      <Chip
                        selected={ref.mode === "audio"}
                        onClick={() => {
                          if (!ref.rightsAttested || !audioConditioningEnabled)
                            return;
                          setRefs((prev) =>
                            prev.map((r) =>
                              r.analysisId === ref.analysisId
                                ? { ...r, mode: "audio" }
                                : r,
                            ),
                          );
                        }}
                        className={
                          !ref.rightsAttested || !audioConditioningEnabled
                            ? "opacity-40"
                            : undefined
                        }
                      >
                        Audio conditioning
                      </Chip>
                    </div>
                    <label className="flex items-start gap-2 text-xs text-[var(--pf-body)]">
                      <input
                        type="checkbox"
                        checked={ref.rightsAttested}
                        onChange={(e) => {
                          void attestAndStore(ref, e.target.checked);
                        }}
                        className="mt-0.5"
                      />
                      <span className="flex gap-1.5">
                        <ShieldCheck
                          size={14}
                          className="shrink-0 text-[var(--pf-success)]"
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
                    <Slider
                      label="Rhythm"
                      value={ref.aspects.rhythm}
                      onChange={(v) =>
                        setRefs((prev) =>
                          prev.map((r) =>
                            r.analysisId === ref.analysisId
                              ? {
                                  ...r,
                                  aspects: { ...r.aspects, rhythm: v },
                                }
                              : r,
                          ),
                        )
                      }
                    />
                    <Slider
                      label="Mood"
                      value={ref.aspects.mood}
                      onChange={(v) =>
                        setRefs((prev) =>
                          prev.map((r) =>
                            r.analysisId === ref.analysisId
                              ? { ...r, aspects: { ...r.aspects, mood: v } }
                              : r,
                          ),
                        )
                      }
                    />
                    <Slider
                      label="Instrumentation"
                      value={ref.aspects.instrumentation}
                      onChange={(v) =>
                        setRefs((prev) =>
                          prev.map((r) =>
                            r.analysisId === ref.analysisId
                              ? {
                                  ...r,
                                  aspects: {
                                    ...r.aspects,
                                    instrumentation: v,
                                  },
                                }
                              : r,
                          ),
                        )
                      }
                    />
                  </Panel>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-16 right-0 z-30 flex items-center justify-between border-t border-[var(--pf-border)] bg-[var(--pf-surface)]/95 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-wider text-[var(--pf-muted)]">
            Takes
          </span>
          {[2, 4, 6, 8].map((n) => (
            <Chip key={n} selected={takeCount === n} onClick={() => setTakeCount(n)}>
              {n}
            </Chip>
          ))}
          {creditHint && (
            <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[var(--pf-cyan)]">
              {creditHint}
            </span>
          )}
          {error && <span className="text-sm text-red-300">{error}</span>}
        </div>
        <Button
          size="lg"
          disabled={!prompt.trim() || generate.isPending}
          onClick={() => generate.mutate()}
          className="min-w-[180px]"
        >
          {generate.isPending ? "Queuing…" : "Generate"}
        </Button>
      </div>
    </div>
  );
}
