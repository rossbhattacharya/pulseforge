import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addReference,
  getReference,
  logAttestation,
  getStore,
} from "@/lib/db/store";
import { storeAudioBytes, audioPublicUrl } from "@/lib/providers/audio-store";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const analysisId = String(form.get("analysisId") ?? "");
    const rightsAttested = String(form.get("rightsAttested") ?? "") === "true";
    const fileHash = String(form.get("fileHash") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (!rightsAttested) {
      return NextResponse.json(
        { error: "Storing reference audio requires rights attestation" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const ext = file.name.toLowerCase().endsWith(".wav") ? "wav" : "mp3";
    const content =
      ext === "wav" ? "audio/wav" : file.type || "audio/mpeg";
    const audioId = storeAudioBytes(bytes, content, ext);
    const audioUrl = audioPublicUrl(audioId);

    if (fileHash) logAttestation(fileHash);

    if (analysisId) {
      const store = getStore();
      const idx = store.references.findIndex((r) => r.id === analysisId);
      if (idx >= 0) {
        store.references[idx] = {
          ...store.references[idx]!,
          audio_url: audioUrl,
          rights_attested: true,
          influence_mode: "audio",
        };
        return NextResponse.json({ reference: store.references[idx] });
      }
    }

    const reference = addReference({
      source_name: file.name,
      bpm: Number(form.get("bpm") ?? 120),
      key: String(form.get("key") ?? "A min"),
      energy: Number(form.get("energy") ?? 0.5),
      mood_tags: String(form.get("mood_tags") ?? "")
        .split(",")
        .filter(Boolean),
      features: {},
      audio_url: audioUrl,
      rights_attested: true,
      influence_mode: "audio",
    });
    return NextResponse.json({ reference });
  }

  const body = z
    .object({
      analysisId: z.string(),
      rightsAttested: z.boolean(),
      influenceMode: z.enum(["features", "audio"]).optional(),
    })
    .parse(await req.json());

  const ref = getReference(body.analysisId);
  if (!ref) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (body.influenceMode === "audio" && !body.rightsAttested) {
    return NextResponse.json(
      { error: "Audio mode requires attestation" },
      { status: 400 },
    );
  }

  const store = getStore();
  const idx = store.references.findIndex((r) => r.id === body.analysisId);
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  store.references[idx] = {
    ...store.references[idx]!,
    rights_attested: body.rightsAttested,
    influence_mode: body.rightsAttested
      ? (body.influenceMode ?? store.references[idx]!.influence_mode)
      : "features",
    audio_url: body.rightsAttested
      ? store.references[idx]!.audio_url
      : null,
  };
  return NextResponse.json({ reference: store.references[idx] });
}
