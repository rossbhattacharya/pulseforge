import type { MusicProvider } from "./types";
import { MockMusicProvider } from "./mock";
import { StableAudioProvider } from "./stable-audio";
import { ElevenLabsMusicProvider } from "./elevenlabs";
import { SplitMusicProvider } from "./split";

let singleton: MusicProvider | null = null;

export function getMusicProvider(): MusicProvider {
  if (singleton) return singleton;
  const name = (process.env.MUSIC_PROVIDER ?? "mock").toLowerCase();

  switch (name) {
    case "stable":
    case "stable-audio":
      singleton = new StableAudioProvider();
      break;
    case "elevenlabs":
    case "eleven":
      singleton = new ElevenLabsMusicProvider();
      break;
    case "split":
    case "dual":
      singleton = new SplitMusicProvider();
      break;
    case "mock":
    default:
      singleton = new MockMusicProvider();
      break;
  }
  return singleton;
}

export function resetMusicProvider() {
  singleton = null;
}

export function getProviderMode(): string {
  return (process.env.MUSIC_PROVIDER ?? "mock").toLowerCase();
}

export type { MusicProvider, CreateJobSpec, ProviderJobStatus } from "./types";
export { creditCostForSpec } from "./split";
