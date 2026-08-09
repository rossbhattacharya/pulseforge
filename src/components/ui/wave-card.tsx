"use client";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/lib/store/player";

export function WaveCard({
  id,
  url,
  className,
  height = 56,
  interactive = true,
}: {
  id: string;
  url: string;
  className?: string;
  height?: number;
  interactive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const { playingId, setPlayingId, register, unregister } = usePlayerStore();

  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      height,
      waveColor: "rgba(110,110,133,0.55)",
      progressColor: "rgba(0,229,255,0.95)",
      cursorColor: "#FF2E9A",
      cursorWidth: 1,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      url,
      interact: interactive,
    });
    wsRef.current = ws;
    register(id, ws);

    ws.on("play", () => setPlayingId(id));
    ws.on("pause", () => {
      if (usePlayerStore.getState().playingId === id) setPlayingId(null);
    });
    ws.on("finish", () => setPlayingId(null));

    return () => {
      unregister(id);
      ws.destroy();
      wsRef.current = null;
    };
  }, [id, url, height, interactive, register, unregister, setPlayingId]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    if (playingId && playingId !== id && ws.isPlaying()) {
      ws.pause();
    }
  }, [playingId, id]);

  return (
    <div
      className={cn(
        "w-full rounded-lg bg-[#0A0A0F]/60 [&_wave]:drop-shadow-[0_0_6px_rgba(0,229,255,0.45)]",
        className,
      )}
      ref={containerRef}
    />
  );
}

export function MiniWaveform({ seed = 1 }: { seed?: number }) {
  const bars = Array.from({ length: 28 }, (_, i) => {
    const h = 20 + ((Math.sin(seed * 12.3 + i * 0.7) + 1) * 40);
    return Math.min(100, Math.max(12, h));
  });
  return (
    <div className="flex h-12 w-full items-end gap-[2px] pt-2 opacity-80">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-t bg-[var(--pf-cyan)] shadow-[0_0_5px_rgba(0,218,243,0.5)]"
          style={{ height: `${h}%`, opacity: 0.35 + (h / 100) * 0.65 }}
        />
      ))}
    </div>
  );
}
