"use client";

import type { InfluenceMode } from "@/types";

export interface ClientAnalysisResult {
  bpm: number;
  key: string;
  energy: number;
  mood_tags: string[];
  features: {
    groove: string;
    instrumentation: string;
    spectralCentroid: number;
    rms: number;
  };
  durationS: number;
}

const KEYS = [
  "C maj",
  "C min",
  "D maj",
  "D min",
  "E maj",
  "E min",
  "F maj",
  "F min",
  "G maj",
  "G min",
  "A maj",
  "A min",
  "B maj",
  "B min",
];

function estimateBpm(channelData: Float32Array, sampleRate: number): number {
  const window = Math.min(channelData.length, sampleRate * 10);
  const step = 512;
  const energies: number[] = [];
  for (let i = 0; i + step < window; i += step) {
    let sum = 0;
    for (let j = 0; j < step; j++) sum += Math.abs(channelData[i + j]!);
    energies.push(sum / step);
  }
  if (energies.length < 8) return 120;

  let bestLag = 0;
  let bestCorr = -Infinity;
  const minLag = Math.floor((60 / 180) * (sampleRate / step));
  const maxLag = Math.floor((60 / 70) * (sampleRate / step));
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < energies.length - lag; i++) {
      corr += energies[i]! * energies[i + lag]!;
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  if (!bestLag) return 120;
  const bpm = Math.round((60 * sampleRate) / (bestLag * step));
  return Math.min(180, Math.max(70, bpm));
}

export async function analyzeAudioFile(
  file: File,
): Promise<ClientAnalysisResult> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channel = audio.getChannelData(0);
    let sumSq = 0;
    let centroidNum = 0;
    let centroidDen = 0;
    const len = Math.min(channel.length, audio.sampleRate * 30);
    for (let i = 0; i < len; i++) {
      const v = channel[i]!;
      sumSq += v * v;
      const mag = Math.abs(v);
      centroidNum += mag * (i % 1024);
      centroidDen += mag;
    }
    const rms = Math.sqrt(sumSq / len);
    const energy = Math.min(1, rms * 4);
    const bpm = estimateBpm(channel, audio.sampleRate);
    const spectralCentroid = centroidDen ? centroidNum / centroidDen : 0;
    const key = KEYS[Math.floor(spectralCentroid) % KEYS.length]!;

    const mood_tags: string[] = [];
    if (energy > 0.65) mood_tags.push("Aggressive", "High Energy");
    else if (energy > 0.4) mood_tags.push("Driving");
    else mood_tags.push("Dreamy", "Atmospheric");
    if (bpm >= 140) mood_tags.push("Fast");
    else if (bpm <= 95) mood_tags.push("Chill");

    return {
      bpm,
      key,
      energy,
      mood_tags: [...new Set(mood_tags)].slice(0, 4),
      features: {
        groove: bpm > 125 ? "rolling 16th-note pulse" : "steady four-on-the-floor",
        instrumentation: "electronic drums, bass, synths",
        spectralCentroid,
        rms,
      },
      durationS: audio.duration,
    };
  } finally {
    await ctx.close();
  }
}

export function defaultInfluenceMode(
  rightsAttested: boolean,
  providerSupportsAudio: boolean,
): InfluenceMode {
  return rightsAttested && providerSupportsAudio ? "audio" : "features";
}
