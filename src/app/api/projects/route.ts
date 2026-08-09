import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addReference,
  deleteProjects,
  duplicateProject,
  getProfile,
  listProjects,
  listReferences,
  logAttestation,
} from "@/lib/db/store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("profile")) {
    return NextResponse.json({ profile: getProfile() });
  }
  if (url.searchParams.get("references")) {
    return NextResponse.json({ references: listReferences() });
  }
  return NextResponse.json({
    projects: listProjects(),
    profile: getProfile(),
    references: listReferences(),
  });
}

const refSchema = z.object({
  source_name: z.string(),
  bpm: z.number(),
  key: z.string(),
  energy: z.number(),
  mood_tags: z.array(z.string()),
  features: z.record(z.string(), z.unknown()),
  audio_url: z.string().nullable(),
  rights_attested: z.boolean(),
  influence_mode: z.enum(["features", "audio"]),
  file_hash: z.string().optional(),
});

export async function POST(req: Request) {
  const json = await req.json();
  if (json.action === "duplicate") {
    const project = duplicateProject(json.id as string);
    return NextResponse.json({ project });
  }
  if (json.action === "delete") {
    deleteProjects(json.ids as string[]);
    return NextResponse.json({ ok: true });
  }
  if (json.action === "reference") {
    const data = refSchema.parse(json.data);
    if (data.influence_mode === "audio" && !data.rights_attested) {
      return NextResponse.json(
        { error: "Audio mode requires attestation" },
        { status: 400 },
      );
    }
    if (!data.rights_attested) {
      data.audio_url = null;
      data.influence_mode = "features";
    }
    if (data.rights_attested && data.file_hash) {
      logAttestation(data.file_hash);
    }
    const reference = addReference(data);
    return NextResponse.json({ reference });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
