import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addExport,
  getTake,
  listStems,
  getGeneration,
  getProject,
} from "@/lib/db/store";

const schema = z.object({
  projectId: z.string(),
  takeId: z.string(),
  format: z.enum(["wav", "mp3", "stems_zip"]),
  masteringPreset: z.enum(["streaming", "club", "raw"]),
  title: z.string().optional(),
  artist: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const take = getTake(body.takeId);
    if (!take) {
      return NextResponse.json({ error: "Take not found" }, { status: 404 });
    }
    const generation = getGeneration(take.generation_id);
    const project = generation ? getProject(generation.project_id) : null;

    // Client handles ffmpeg.wasm conversion; server records the export metadata
    // and returns source URLs for download packaging.
    const stems = listStems(body.takeId);
    const record = addExport({
      project_id: body.projectId || project?.id || "unknown",
      format: body.format,
      mastering_preset: body.masteringPreset,
      file_url: take.audio_url,
    });

    return NextResponse.json({
      export: record,
      source: {
        mixUrl: take.audio_url,
        stems: stems.map((s) => ({ lane: s.lane, url: s.audio_url })),
        meta: {
          title: body.title || project?.title || "Pulseforge Track",
          artist: body.artist || "Pulseforge",
          bpm: project?.bpm,
          key: project?.key,
          genre: project?.genre,
        },
      },
      notice:
        "You own this original Pulseforge generation subject to your plan and the music provider's terms.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Export failed" },
      { status: 400 },
    );
  }
}
