import type {
  MusicProvider,
  CreateJobSpec,
  ProviderJobStatus,
  ProviderCapabilities,
} from "./types";
import { StableAudioProvider } from "./stable-audio";
import { ElevenLabsMusicProvider } from "./elevenlabs";
import type { StemLane } from "@/types";

/**
 * Confirmed Pulseforge split:
 * - Audio-conditioning jobs → Stable Audio 3.0
 * - Text / feature-guidance jobs → ElevenLabs Music
 * - Stem regenerate → ElevenLabs
 */
export class SplitMusicProvider implements MusicProvider {
  readonly id = "split";
  readonly capabilities: ProviderCapabilities = {
    audioConditioning: true,
    stems: true,
    maxRefDurationS: 380,
  };

  private stable = new StableAudioProvider();
  private eleven = new ElevenLabsMusicProvider();
  private routes = new Map<string, { provider: MusicProvider; remoteId: string }>();

  async createJob(spec: CreateJobSpec): Promise<string> {
    const needsAudio = spec.references.some(
      (r) => r.mode === "audio" && r.audioUrl,
    );
    const provider = needsAudio ? this.stable : this.eleven;
    const remoteId = await provider.createJob(spec);
    const localId = `split_${provider.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.routes.set(localId, { provider, remoteId });
    return localId;
  }

  async getJobStatus(jobId: string): Promise<ProviderJobStatus> {
    const route = this.routes.get(jobId);
    if (!route) {
      return {
        status: "failed",
        progress: 0,
        stage: "failed",
        takes: [],
        error: "Unknown split job",
      };
    }
    const status = await route.provider.getJobStatus(route.remoteId);
    return status;
  }

  async regenerateStem(
    takeAudioUrl: string,
    lane: StemLane,
    instruction: string,
  ): Promise<{ audioUrl: string }> {
    if (!this.eleven.regenerateStem) {
      throw new Error("ElevenLabs stem regenerate unavailable");
    }
    return this.eleven.regenerateStem(takeAudioUrl, lane, instruction);
  }
}

export function creditCostForSpec(spec: {
  takeCount: number;
  hasAudioConditioning: boolean;
}): number {
  const perTake = spec.hasAudioConditioning ? 2 : 1;
  return Math.max(1, spec.takeCount) * perTake;
}
