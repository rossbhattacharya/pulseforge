import type { MusicProvider, ProviderJobStatus, CreateJobSpec } from "./types";
import { progressToStage } from "./types";
import type { StemLane } from "@/types";

type MockJob = {
  createdAt: number;
  durationMs: number;
  takeCount: number;
  prompt: string;
};

const jobs = new Map<string, MockJob>();

const DESCRIPTORS = [
  "Dark rolling groove, sparse intro",
  "Saturated drop, euphoric pads",
  "Hypnotic percussion, warm bass",
  "Airy break, neon lead melody",
  "Warehouse kick, dusty hats",
  "Lush breakdown, soft vocals",
  "Punchy low-end, metallic FX",
  "Dreamy pads, distant vocal chops",
];

export class MockMusicProvider implements MusicProvider {
  readonly id = "mock";
  readonly capabilities = {
    audioConditioning: true,
    stems: true,
    maxRefDurationS: 180,
  };

  async createJob(spec: CreateJobSpec): Promise<string> {
    const id = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    jobs.set(id, {
      createdAt: Date.now(),
      durationMs: 20_000,
      takeCount: Math.min(8, Math.max(2, spec.params.takeCount)),
      prompt: spec.compiledPrompt || spec.prompt,
    });
    return id;
  }

  async getJobStatus(jobId: string): Promise<ProviderJobStatus> {
    const job = jobs.get(jobId);
    if (!job) {
      return {
        status: "failed",
        progress: 0,
        stage: "failed",
        takes: [],
        error: "Unknown job",
      };
    }

    const elapsed = Date.now() - job.createdAt;
    const progress = Math.min(100, Math.floor((elapsed / job.durationMs) * 100));
    const stage = progressToStage(progress);

    if (progress < 100) {
      return {
        status: progress < 5 ? "queued" : "running",
        progress,
        stage,
        takes: [],
      };
    }

    const takes = Array.from({ length: job.takeCount }, (_, i) => {
      const sampleIndex = (i % 4) + 1;
      return {
        index: i,
        audioUrl: `/samples/take-${sampleIndex}.wav`,
        durationS: 6,
        descriptor: DESCRIPTORS[i % DESCRIPTORS.length]!,
        stemUrls: {
          drums: "/samples/stems/drums.wav",
          bass: "/samples/stems/bass.wav",
          melody: "/samples/stems/melody.wav",
          pads: "/samples/stems/pads.wav",
          vocals: "/samples/stems/vocals.wav",
        } satisfies Partial<Record<StemLane, string>>,
      };
    });

    return {
      status: "succeeded",
      progress: 100,
      stage: "done",
      takes,
    };
  }

  async regenerateStem(
    _takeAudioUrl: string,
    lane: StemLane,
    instruction: string,
  ): Promise<{ audioUrl: string }> {
    void instruction;
    await new Promise((r) => setTimeout(r, 1500));
    return { audioUrl: `/samples/stems/${lane}.wav` };
  }
}
