import type { MusicProvider, CreateJobSpec, ProviderJobStatus } from "./types";
import { progressToStage } from "./types";
import { withRetry, HttpError } from "./retry";
import { storeAudioBytes, audioPublicUrl } from "./audio-store";
import type { StemLane } from "@/types";

type Job = {
  createdAt: number;
  takeCount: number;
  tasks: Array<Promise<{ index: number; audioUrl: string; durationS: number }>>;
  completed: Array<{ index: number; audioUrl: string; durationS: number }>;
  error?: string;
};

const jobs = new Map<string, Job>();

export class ElevenLabsMusicProvider implements MusicProvider {
  readonly id = "elevenlabs-music";
  readonly capabilities = {
    audioConditioning: false, // style-ref / inpaint often Enterprise — feature mode only for v1
    stems: true,
    maxRefDurationS: 30,
  };

  async createJob(spec: CreateJobSpec): Promise<string> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const localId = `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const takeCount = Math.min(8, Math.max(1, spec.params.takeCount));

    if (!apiKey) {
      jobs.set(localId, {
        createdAt: Date.now(),
        takeCount,
        tasks: [],
        completed: [],
        error: "ELEVENLABS_API_KEY is not configured",
      });
      return localId;
    }

    const lengthMs = Math.min(
      600_000,
      Math.max(3_000, (spec.params.durationSec || 60) * 1000),
    );

    const tasks = Array.from({ length: takeCount }, (_, index) =>
      withRetry(() =>
        this.composeOne({
          apiKey,
          prompt: spec.compiledPrompt,
          lengthMs,
          instrumental: !spec.params.vocals,
          index,
        }),
      ),
    );

    jobs.set(localId, {
      createdAt: Date.now(),
      takeCount,
      tasks,
      completed: [],
    });

    // Kick off settlement without blocking createJob
    void Promise.allSettled(tasks).then((results) => {
      const job = jobs.get(localId);
      if (!job) return;
      for (const r of results) {
        if (r.status === "fulfilled") {
          job.completed.push(r.value);
        } else {
          job.error =
            r.reason instanceof Error
              ? r.reason.message
              : "ElevenLabs compose failed";
        }
      }
    });

    return localId;
  }

  private async composeOne(args: {
    apiKey: string;
    prompt: string;
    lengthMs: number;
    instrumental: boolean;
    index: number;
  }): Promise<{ index: number; audioUrl: string; durationS: number }> {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128",
      {
        method: "POST",
        headers: {
          "xi-api-key": args.apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          prompt: args.prompt.slice(0, 4000),
          music_length_ms: args.lengthMs,
          model_id: "music_v2",
          force_instrumental: args.instrumental,
        }),
      },
    );

    if (!res.ok) {
      throw new HttpError(res.status, await res.text());
    }

    const bytes = await res.arrayBuffer();
    const audioId = storeAudioBytes(bytes, "audio/mpeg", "mp3");
    return {
      index: args.index,
      audioUrl: audioPublicUrl(audioId),
      durationS: args.lengthMs / 1000,
    };
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
    if (job.error && job.completed.length === 0) {
      return {
        status: "failed",
        progress: 0,
        stage: "failed",
        takes: [],
        error: job.error,
      };
    }

    const progress =
      job.completed.length >= job.takeCount
        ? 100
        : Math.min(
            95,
            Math.floor((job.completed.length / job.takeCount) * 100) ||
              Math.min(50, Math.floor((Date.now() - job.createdAt) / 400)),
          );

    if (job.completed.length >= job.takeCount) {
      return {
        status: "succeeded",
        progress: 100,
        stage: "done",
        takes: job.completed
          .sort((a, b) => a.index - b.index)
          .map((t) => ({
            index: t.index,
            audioUrl: t.audioUrl,
            durationS: t.durationS,
            descriptor: "ElevenLabs Music take",
          })),
      };
    }

    return {
      status: "running",
      progress,
      stage: progressToStage(progress),
      takes: [],
    };
  }

  /**
   * Lane-specific regenerate: recompose a short instrumental focused on the lane.
   * Full stem ZIP unpack from /v1/music/stem-separation deferred (needs JSZip — ask first).
   */
  async regenerateStem(
    _takeAudioUrl: string,
    lane: StemLane,
    instruction: string,
  ): Promise<{ audioUrl: string }> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

    const result = await withRetry(() =>
      this.composeOne({
        apiKey,
        prompt: `Solo ${lane} stem only, no other instruments. ${instruction}. Clean isolated ${lane} performance.`,
        lengthMs: 15_000,
        instrumental: true,
        index: 0,
      }),
    );
    return { audioUrl: result.audioUrl };
  }
}
