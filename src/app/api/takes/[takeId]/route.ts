import { NextResponse } from "next/server";
import {
  getTake,
  listStems,
  updateStem,
} from "@/lib/db/store";
import { getMusicProvider } from "@/lib/providers";
import { z } from "zod";
import type { StemLane } from "@/types";

type Ctx = { params: Promise<{ takeId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { takeId } = await ctx.params;
  const take = getTake(takeId);
  if (!take) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ take, stems: listStems(takeId) });
}

const patchSchema = z.object({
  stemId: z.string().optional(),
  volume: z.number().optional(),
  muted: z.boolean().optional(),
  solo: z.boolean().optional(),
  regenerate: z
    .object({
      lane: z.enum(["drums", "bass", "melody", "pads", "vocals"]),
      instruction: z.string(),
    })
    .optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { takeId } = await ctx.params;
  const take = getTake(takeId);
  if (!take) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = patchSchema.parse(await req.json());

  if (body.regenerate) {
    const provider = getMusicProvider();
    if (!provider.regenerateStem) {
      return NextResponse.json(
        { error: "Provider does not support stem regenerate" },
        { status: 400 },
      );
    }
    const result = await provider.regenerateStem(
      take.audio_url,
      body.regenerate.lane as StemLane,
      body.regenerate.instruction,
    );
    const stem = listStems(takeId).find((s) => s.lane === body.regenerate!.lane);
    if (stem) updateStem(stem.id, { audio_url: result.audioUrl });
    return NextResponse.json({ take, stems: listStems(takeId) });
  }

  if (body.stemId) {
    updateStem(body.stemId, {
      volume: body.volume,
      muted: body.muted,
      solo: body.solo,
    });
  }

  return NextResponse.json({ take, stems: listStems(takeId) });
}
