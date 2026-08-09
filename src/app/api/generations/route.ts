import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createGeneration,
  debitCredits,
  getReference,
  upsertProject,
} from "@/lib/db/store";
import { getMusicProvider } from "@/lib/providers";
import {
  compileGenerationPrompt,
  referenceToPromptFragment,
} from "@/lib/references/prompt";

const bodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  projectId: z.string().optional(),
  title: z.string().optional(),
  params: z.object({
    genre: z.string(),
    bpm: z.number().min(60).max(180),
    key: z.string(),
    energy: z.number().min(0).max(100),
    durationSec: z.number().min(15).max(240),
    vocals: z.boolean(),
    lyrics: z.string().optional(),
    moodTags: z.array(z.string()),
    takeCount: z.number().min(2).max(8),
    references: z.array(
      z.object({
        analysisId: z.string(),
        mode: z.enum(["features", "audio"]),
        strength: z.number().min(0).max(100),
        aspects: z.object({
          rhythm: z.number(),
          mood: z.number(),
          instrumentation: z.number(),
        }),
        rightsAttested: z.boolean(),
      }),
    ),
  }),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = bodySchema.parse(json);
    const provider = getMusicProvider();

    for (const ref of body.params.references) {
      if (ref.mode === "audio") {
        if (!ref.rightsAttested) {
          return NextResponse.json(
            { error: "Audio conditioning requires rights attestation" },
            { status: 400 },
          );
        }
        if (!provider.capabilities.audioConditioning) {
          return NextResponse.json(
            { error: "Current provider does not support audio conditioning" },
            { status: 400 },
          );
        }
      }
    }

    debitCredits(1);

    const fragments: string[] = [];
    const providerRefs = body.params.references.map((r) => {
      const analysis = getReference(r.analysisId);
      let promptFragment = "";
      if (analysis && r.mode === "features") {
        promptFragment = referenceToPromptFragment(
          analysis,
          r.aspects,
          r.strength,
        );
        fragments.push(promptFragment);
      }
      return {
        analysisId: r.analysisId,
        mode: r.mode,
        strength: r.strength,
        audioUrl:
          r.mode === "audio" && analysis?.rights_attested
            ? analysis.audio_url
            : null,
        promptFragment,
      };
    });

    const compiled = compileGenerationPrompt(
      body.prompt,
      body.params,
      fragments,
    );

    const project = upsertProject({
      id: body.projectId,
      title:
        body.title ||
        body.prompt.slice(0, 42) ||
        `${body.params.genre} Sketch`,
      genre: body.params.genre,
      bpm: body.params.bpm,
      key: body.params.key,
    });

    const jobId = await provider.createJob({
      prompt: body.prompt,
      params: body.params,
      compiledPrompt: compiled,
      references: providerRefs,
    });

    const generation = createGeneration({
      project_id: project.id,
      prompt_text: body.prompt,
      params: body.params,
      provider: provider.id,
      provider_job_id: jobId,
    });

    return NextResponse.json({ generation, project });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create generation";
    const status = message.includes("credits") ? 402 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
