"use client";

import { useState } from "react";
import {
  X,
  FileAudio,
  AudioWaveform,
  Info,
  Check,
  Share2,
  Link2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MasteringPreset } from "@/types";

export function ExportModal({
  open,
  onClose,
  takeId,
  projectId,
  defaultTitle = "Midnight Circuit v3",
}: {
  open: boolean;
  onClose: () => void;
  takeId: string;
  projectId: string;
  defaultTitle?: string;
}) {
  const [format, setFormat] = useState<"wav" | "mp3" | "stems_zip">("wav");
  const [preset, setPreset] = useState<MasteringPreset>("club");
  const [title, setTitle] = useState(defaultTitle);
  const [artist, setArtist] = useState("Pulseforge Producer");
  const [genre, setGenre] = useState("Cyber-Synth");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  async function exportTrack() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          takeId,
          format,
          masteringPreset: preset,
          title,
          artist,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Export failed");

      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, "#00E5FF");
        grad.addColorStop(1, "#FF2E9A");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = "rgba(10,10,15,0.4)";
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText(title.slice(0, 24), 32, 64);
      }

      const sourceUrl = json.source.mixUrl as string;
      if (format === "stems_zip") {
        const first = json.source.stems[0]?.url ?? sourceUrl;
        window.open(first, "_blank");
        setMessage("Stem URLs ready. Full ZIP packaging via ffmpeg.wasm next.");
      } else {
        const a = document.createElement("a");
        a.href = sourceUrl;
        a.download = `${title}.${format === "mp3" ? "mp3" : "wav"}`;
        a.click();
        setMessage(json.notice as string);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[20px]">
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[var(--pf-border)] bg-[#131320]">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[var(--pf-cyan)] to-[var(--pf-magenta)]" />

        <div className="flex items-start justify-between p-6 pb-4">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-white">
            Export{" "}
            <span className="bg-gradient-to-r from-[var(--pf-cyan)] to-[var(--pf-magenta)] bg-clip-text text-transparent">
              &apos;{title}&apos;
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--pf-muted)] hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 px-6 pb-6">
          <section>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--pf-muted)]">
              <FileAudio size={14} /> Format
            </p>
            <div className="flex overflow-hidden rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F]">
              {(
                [
                  ["wav", "WAV (48kHz / 24bit)"],
                  ["mp3", "MP3 (320kbps)"],
                  ["stems_zip", "STEMS (Multi-track)"],
                ] as const
              ).map(([id, label], i) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormat(id)}
                  className={`flex-1 px-2 py-2.5 text-center text-[11px] transition-colors ${
                    i < 2 ? "border-r border-[var(--pf-border)]" : ""
                  } ${
                    format === id
                      ? "bg-[#1e1e2c] text-[var(--pf-cyan)] shadow-[inset_0_-2px_0_#00e5ff]"
                      : "text-[var(--pf-muted)] hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--pf-muted)]">
              <AudioWaveform size={14} /> Mastering profile
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["streaming", "Streaming", "−14 LUFS"],
                  ["club", "Club", "−8 LUFS"],
                  ["raw", "Raw", "No Limiter"],
                ] as const
              ).map(([id, label, sub]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreset(id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    preset === id
                      ? "border-transparent bg-[#0A0A0F] shadow-[0_0_0_1px_#00e5ff,0_0_12px_rgba(255,46,154,0.25)]"
                      : "border-[var(--pf-border)] bg-[#0A0A0F] hover:border-[var(--pf-cyan)]/40"
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-[11px] text-[var(--pf-muted)]">
                    {sub}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--pf-muted)]">
              <Info size={14} /> Metadata & artwork
            </p>
            <div className="flex gap-4">
              <div className="h-24 w-24 shrink-0 rounded-lg bg-[linear-gradient(135deg,#00E5FF33,#FF2E9A33)] ring-1 ring-[var(--pf-border)]" />
              <div className="flex-1 space-y-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-glow w-full rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F] px-3 py-2 text-sm"
                  placeholder="Track title"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="input-glow w-full rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F] px-3 py-2 text-sm"
                    placeholder="Artist"
                  />
                  <input
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="input-glow w-full rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F] px-3 py-2 text-sm"
                    placeholder="Genre"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-start gap-2 rounded-lg border border-[var(--pf-cyan)]/30 bg-[var(--pf-cyan)]/10 px-3 py-3 text-xs text-[var(--pf-cyan)]">
            <Check size={14} className="mt-0.5 shrink-0" />
            100% original AI-generated audio. You retain full ownership of this
            export for commercial use.
          </div>

          {message && (
            <p className="text-xs text-[var(--pf-body)]">{message}</p>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--pf-border)] text-[var(--pf-muted)] hover:text-white"
                title="Share"
              >
                <Share2 size={16} />
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--pf-border)] text-[var(--pf-muted)] hover:text-white"
                title="Copy link"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}/editor/${takeId}`,
                  );
                  setMessage("Share link copied.");
                }}
              >
                <Link2 size={16} />
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => void exportTrack()}>
                <Download size={16} />
                {busy ? "Exporting…" : "Export track"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
