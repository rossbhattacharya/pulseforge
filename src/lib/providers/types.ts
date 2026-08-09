import type { GenerationParams, StemLane } from "@/types";

export interface ProviderCapabilities {
  audioConditioning: boolean;
  stems: boolean;
  maxRefDurationS: number;
}

export interface ProviderTake {
  index: number;
  audioUrl: string;
  durationS: number;
  descriptor: string;
  stemUrls?: Partial<Record<StemLane, string>>;
}

export interface ProviderJobStatus {
  status: "queued" | "running" | "succeeded" | "failed";
  progress: number;
  stage: "interpreting" | "composing" | "generating" | "mastering" | "done" | "failed";
  takes: ProviderTake[];
  error?: string;
}

export interface CreateJobSpec {
  prompt: string;
  params: GenerationParams;
  compiledPrompt: string;
  references: Array<{
    analysisId: string;
    mode: "features" | "audio";
    strength: number;
    audioUrl?: string | null;
    promptFragment?: string;
  }>;
}

export interface MusicProvider {
  readonly id: string;
  readonly capabilities: ProviderCapabilities;
  createJob(spec: CreateJobSpec): Promise<string>;
  getJobStatus(jobId: string): Promise<ProviderJobStatus>;
  regenerateStem?(
    takeAudioUrl: string,
    lane: StemLane,
    instruction: string,
  ): Promise<{ audioUrl: string }>;
}

export function progressToStage(
  progress: number,
): ProviderJobStatus["stage"] {
  if (progress < 15) return "interpreting";
  if (progress < 40) return "composing";
  if (progress < 80) return "generating";
  if (progress < 100) return "mastering";
  return "done";
}
