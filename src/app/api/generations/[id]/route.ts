import { NextResponse } from "next/server";
import {
  getGeneration,
  listTakes,
  replaceTakes,
  updateGeneration,
  updateTake,
} from "@/lib/db/store";
import { getMusicProvider } from "@/lib/providers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const generation = getGeneration(id);
  if (!generation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (generation.status === "succeeded" || generation.status === "failed") {
    return NextResponse.json({
      generation,
      takes: listTakes(id),
    });
  }

  const provider = getMusicProvider();
  const status = await provider.getJobStatus(generation.provider_job_id);

  if (status.status === "failed") {
    const updated = updateGeneration(id, {
      status: "failed",
      stage: "failed",
      error: status.error ?? "Generation failed",
      progress: status.progress,
    });
    return NextResponse.json({ generation: updated, takes: [] });
  }

  if (status.status === "succeeded") {
    const takes = replaceTakes(
      id,
      status.takes.map((t) => ({
        index: t.index,
        audio_url: t.audioUrl,
        duration_s: t.durationS,
        descriptor: t.descriptor,
        stemUrls: t.stemUrls,
      })),
    );
    const updated = updateGeneration(id, {
      status: "succeeded",
      stage: "done",
      progress: 100,
      error: null,
    });
    return NextResponse.json({ generation: updated, takes });
  }

  const updated = updateGeneration(id, {
    status: status.status === "queued" ? "queued" : "running",
    stage: status.stage === "done" ? "mastering" : status.stage,
    progress: status.progress,
  });

  return NextResponse.json({ generation: updated, takes: listTakes(id) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    takeId?: string;
    selected?: boolean;
    favorited?: boolean;
  };
  if (!body.takeId) {
    return NextResponse.json({ error: "takeId required" }, { status: 400 });
  }
  if (body.selected) {
    for (const t of listTakes(id)) {
      updateTake(t.id, { selected: t.id === body.takeId });
    }
  }
  if (typeof body.favorited === "boolean") {
    updateTake(body.takeId, { favorited: body.favorited });
  }
  return NextResponse.json({ takes: listTakes(id) });
}
