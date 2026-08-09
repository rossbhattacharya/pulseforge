import type { MusicProvider } from "./types";
import { MockMusicProvider } from "./mock";
import { StableAudioProvider } from "./stable-audio";

let singleton: MusicProvider | null = null;

export function getMusicProvider(): MusicProvider {
  if (singleton) return singleton;
  const name = (process.env.MUSIC_PROVIDER ?? "mock").toLowerCase();
  singleton =
    name === "stable" || name === "stable-audio"
      ? new StableAudioProvider()
      : new MockMusicProvider();
  return singleton;
}

export function resetMusicProvider() {
  singleton = null;
}

export type { MusicProvider, CreateJobSpec, ProviderJobStatus } from "./types";
