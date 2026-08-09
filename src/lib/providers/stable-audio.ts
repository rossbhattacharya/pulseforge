import type { MusicProvider, CreateJobSpec, ProviderJobStatus } from "./types";
import { progressToStage } from "./types";
import { withRetry, HttpError } from "./retry";
import { storeAudioBytes, audioPublicUrl } from "./audio-store";
import type { StemLane } from "@/types";

type Job = {
  createdAt: number;
  stabilityIds: string[];
  takeCount: number;
  completed: Array<{ index: number; audioUrl: string; durationS: number }>;
  error?: string;
  mode: "text" | "audio";
};

const jobs = new Map<string, Job>();

function mapInfluenceToApiStrength(uiStrength: number): number {
  // Stability: 0 = identical to input, 1 = ignore input.
  // Our UI strength = how strongly the reference should influence output.
  const s = Math.max(0, Math.min(100, uiStrength));
  return Math.max(0.05, Math.min(1, 1 - s / 100));
}

function resolveAudioUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3000";
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export class StableAudioProvider implements MusicProvider {
  readonly id = "stable-audio";
  readonly capabilities = {
    audioConditioning: true,
    stems: false,
    maxRefDurationS: 380,
  };

  async createJob(spec: CreateJobSpec): Promise<string> {
    const apiKey = process.env.STABILITY_API_KEY;
    const localId = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const takeCount = Math.min(8, Math.max(1, spec.params.takeCount));

    if (!apiKey) {
      jobs.set(localId, {
        createdAt: Date.now(),
        stabilityIds: [],
        takeCount,
        completed: [],
        error: "STABILITY_API_KEY is not configured",
        mode: "text",
      });
      return localId;
    }

    const audioRef = spec.references.find((r) => r.mode === "audio" && r.audioUrl);
    const mode = audioRef ? "audio" : "text";
    const endpoint =
      mode === "audio"
        ? "https://api.stability.ai/v2beta/audio/stable-audio/audio-to-audio"
        : "https://api.stability.ai/v2beta/audio/stable-audio/text-to-audio";

    try {
      const stabilityIds: string[] = [];
      for (let i = 0; i < takeCount; i++) {
        const id = await withRetry(() =>
          this.startGeneration({
            apiKey,
            endpoint,
            spec,
            audioRef,
            seedOffset: i,
          }),
        );
        stabilityIds.push(id);
      }
      jobs.set(localId, {
        createdAt: Date.now(),
        stabilityIds,
        takeCount,
        completed: [],
        mode,
      });
      return localId;
    } catch (e) {
      jobs.set(localId, {
        createdAt: Date.now(),
        stabilityIds: [],
        takeCount,
        completed: [],
        error: e instanceof Error ? e.message : "Stability request failed",
        mode,
      });
      return localId;
    }
  }

  private async startGeneration(args: {
    apiKey: string;
    endpoint: string;
    spec: CreateJobSpec;
    audioRef?: CreateJobSpec["references"][number];
    seedOffset: number;
  }): Promise<string> {
    const form = new FormData();
    form.append("prompt", args.spec.compiledPrompt.slice(0, 10000));
    form.append("output_format", "mp3");
    form.append(
      "duration",
      String(Math.min(380, Math.max(6, args.spec.params.durationSec || 60))),
    );
    form.append("model", "stable-audio-3");
    form.append("seed", String((Date.now() + args.seedOffset) % 4294967294));

    if (args.audioRef?.audioUrl) {
      form.append(
        "strength",
        String(mapInfluenceToApiStrength(args.audioRef.strength)),
      );
      const audioUrl = resolveAudioUrl(args.audioRef.audioUrl);
      const res = await fetch(audioUrl);
      if (!res.ok) {
        throw new HttpError(res.status, `Failed to fetch reference audio`);
      }
      const blob = await res.blob();
      form.append("audio", blob, "reference.wav");
    }

    const response = await fetch(args.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        Accept: "application/json",
        "stability-client-id": "pulseforge",
        "stability-client-version": "0.1.0",
      },
      body: form,
    });

    if (response.status !== 202) {
      const text = await response.text();
      throw new HttpError(response.status, text);
    }

    const json = (await response.json()) as { id: string };
    return json.id;
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
    if (job.error) {
      return {
        status: "failed",
        progress: 0,
        stage: "failed",
        takes: [],
        error: job.error,
      };
    }

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return {
        status: "failed",
        progress: 0,
        stage: "failed",
        takes: [],
        error: "STABILITY_API_KEY missing",
      };
    }

    for (let i = 0; i < job.stabilityIds.length; i++) {
      if (job.completed.some((c) => c.index === i)) continue;
      const sid = job.stabilityIds[i]!;
      try {
        const result = await withRetry(
          async () => {
            const res = await fetch(
              `https://api.stability.ai/v2beta/audio/results/${sid}`,
              {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  Accept: "audio/*",
                },
              },
            );
            if (res.status === 202) return { pending: true as const };
            if (!res.ok) {
              throw new HttpError(res.status, await res.text());
            }
            const bytes = await res.arrayBuffer();
            return { pending: false as const, bytes };
          },
          { retries: 2, baseMs: 500 },
        );

        if (!result.pending) {
          const audioId = storeAudioBytes(result.bytes, "audio/mpeg", "mp3");
          job.completed.push({
            index: i,
            audioUrl: audioPublicUrl(audioId),
            durationS: 60,
          });
        }
      } catch (e) {
        job.error = e instanceof Error ? e.message : "Poll failed";
        break;
      }
    }

    if (job.error) {
      return {
        status: "failed",
        progress: Math.floor(
          (job.completed.length / job.takeCount) * 100,
        ),
        stage: "failed",
        takes: [],
        error: job.error,
      };
    }

    const progress = Math.min(
      99,
      Math.floor((job.completed.length / job.takeCount) * 100) ||
        Math.min(40, Math.floor((Date.now() - job.createdAt) / 500)),
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
            descriptor:
              job.mode === "audio"
                ? "Stable Audio conditioned take (original)"
                : "Stable Audio text take",
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

  async regenerateStem(
    _takeAudioUrl: string,
    lane: StemLane,
    instruction: string,
  ): Promise<{ audioUrl: string }> {
    void lane;
    void instruction;
    throw new Error(
      "Stable Audio has no native stems. Use ElevenLabs stem separation or approve Demucs.",
    );
  }
}
