"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import type { MasteringPreset } from "@/types";

export function ExportModal({
  open,
  onClose,
  takeId,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  takeId: string;
  projectId: string;
}) {
  const [format, setFormat] = useState<"wav" | "mp3" | "stems_zip">("wav");
  const [preset, setPreset] = useState<MasteringPreset>("streaming");
  const [title, setTitle] = useState("Midnight Circuit");
  const [artist, setArtist] = useState("Pulseforge");
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

      // Canvas gradient cover art
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
        ctx.fillStyle = "rgba(10,10,15,0.35)";
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText(title.slice(0, 24), 32, 64);
      }

      const sourceUrl = json.source.mixUrl as string;
      if (format === "stems_zip") {
        // Download first stem as stand-in; full ZIP needs ffmpeg.wasm worker
        const first = json.source.stems[0]?.url ?? sourceUrl;
        window.open(first, "_blank");
        setMessage(
          "Stem URLs ready. Full ZIP packaging via ffmpeg.wasm can be enabled once @ffmpeg/ffmpeg is added for production builds.",
        );
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
      <Panel className="w-full max-w-lg bg-[var(--pf-panel)]/90 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-white">
            Export
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--pf-muted)] hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mb-4 space-y-3">
          <label className="block text-xs text-[var(--pf-muted)]">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-glow w-full rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F] px-3 py-2 text-sm"
          />
          <label className="block text-xs text-[var(--pf-muted)]">Artist</label>
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="input-glow w-full rounded-lg border border-[var(--pf-border)] bg-[#0A0A0F] px-3 py-2 text-sm"
          />
        </div>

        <p className="mb-2 text-xs uppercase tracking-wider text-[var(--pf-muted)]">
          Format
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["wav", "WAV 24-bit"],
              ["mp3", "MP3 320"],
              ["stems_zip", "Stems ZIP"],
            ] as const
          ).map(([id, label]) => (
            <Chip key={id} selected={format === id} onClick={() => setFormat(id)}>
              {label}
            </Chip>
          ))}
        </div>

        <p className="mb-2 text-xs uppercase tracking-wider text-[var(--pf-muted)]">
          Mastering
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["streaming", "−14 LUFS"],
              ["club", "−8 LUFS"],
              ["raw", "Raw"],
            ] as const
          ).map(([id, label]) => (
            <Chip
              key={id}
              selected={preset === id}
              onClick={() => setPreset(id)}
            >
              {label}
            </Chip>
          ))}
        </div>

        <div className="mb-4 h-28 rounded-xl bg-[linear-gradient(135deg,#00E5FF,#FF2E9A)] p-[1px]">
          <div className="flex h-full items-end rounded-[11px] bg-[#0A0A0F]/70 p-4">
            <div>
              <p className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-white">
                {title}
              </p>
              <p className="text-xs text-[var(--pf-body)]">{artist}</p>
            </div>
          </div>
        </div>

        <p className="mb-4 text-xs text-[var(--pf-muted)]">
          Rights notice: outputs are original Pulseforge generations. You are
          responsible for compliance with your music provider&apos;s commercial
          terms.
        </p>

        {message && (
          <p className="mb-3 text-xs text-[var(--pf-cyan)]">{message}</p>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" disabled={busy} onClick={() => void exportTrack()}>
            {busy ? "Exporting…" : "Download"}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(
                `${window.location.origin}/editor/${takeId}`,
              );
              setMessage("Share link copied.");
            }}
          >
            Copy link
          </Button>
        </div>
      </Panel>
    </div>
  );
}
