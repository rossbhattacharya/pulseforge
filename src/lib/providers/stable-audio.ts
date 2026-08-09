import type { MusicProvider, CreateJobSpec, ProviderJobStatus } from "./types";
import { progressToStage } from "./types";

/**
 * Stability Stable Audio 3.0 adapter.
 * Requires STABILITY_API_KEY. Falls back to error if unset.
 * Docs: https://platform.stability.ai/docs/api-reference/
 */
export class StableAudioProvider implements MusicProvider {
  readonly id = "stable-audio";
  readonly capabilities = {
    audioConditioning: true,
    stems: false,
    maxRefDurationS: 190,
  };

  private jobs = new Map<
    string,
    { stabilityId?: string; createdAt: number; error?: string; audioUrl?: string }
  >();

  async createJob(spec: CreateJobSpec): Promise<string> {
    const apiKey = process.env.STABILITY_API_KEY;
    const localId = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (!apiKey) {
      this.jobs.set(localId, {
        createdAt: Date.now(),
        error: "STABILITY_API_KEY is not configured",
      });
      return localId;
    }

    const audioRef = spec.references.find((r) => r.mode === "audio" && r.audioUrl);
    const endpoint = audioRef
      ? "https://api.stability.ai/v2beta/audio/stable-audio-2/audio-to-audio"
      : "https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio";

    try {
      const form = new FormData();
      form.append("prompt", spec.compiledPrompt.slice(0, 10000));
      form.append("output_format", "mp3");
      form.append("duration", String(Math.min(190, spec.params.durationSec || 60)));

      if (audioRef?.audioUrl && audioRef.strength != null) {
        const strength = Math.max(0.01, Math.min(1, audioRef.strength / 100));
        form.append("strength", String(strength));
        // Fetch reference audio and attach — server-side only
        const res = await fetch(audioRef.audioUrl);
        const blob = await res.blob();
        form.append("audio", blob, "reference.wav");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        body: form,
      });

      if (!response.ok) {
        const text = await response.text();
        this.jobs.set(localId, {
          createdAt: Date.now(),
          error: `Stability API ${response.status}: ${text.slice(0, 300)}`,
        });
        return localId;
      }

      // Some Stability audio endpoints return binary; others return JSON with id.
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("audio") || contentType.includes("octet-stream")) {
        // For demo: we can't persist binary without storage; mark succeeded with error note
        this.jobs.set(localId, {
          createdAt: Date.now(),
          error:
            "Binary audio returned — configure Supabase Storage to persist Stability outputs",
        });
        return localId;
      }

      const json = (await response.json()) as { id?: string };
      this.jobs.set(localId, {
        createdAt: Date.now(),
        stabilityId: json.id,
      });
      return localId;
    } catch (e) {
      this.jobs.set(localId, {
        createdAt: Date.now(),
        error: e instanceof Error ? e.message : "Stability request failed",
      });
      return localId;
    }
  }

  async getJobStatus(jobId: string): Promise<ProviderJobStatus> {
    const job = this.jobs.get(jobId);
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

    const elapsed = Date.now() - job.createdAt;
    const progress = Math.min(99, Math.floor(elapsed / 300));
    return {
      status: "running",
      progress,
      stage: progressToStage(progress),
      takes: [],
    };
  }
}
