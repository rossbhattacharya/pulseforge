/**
 * In-memory + disk-backed store for provider audio bytes.
 * Served via /api/audio/[id] so playback never proxies through generation routes.
 * When Supabase Storage is configured, prefer uploading there instead.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";

const g = globalThis as typeof globalThis & {
  __pfAudioMeta?: Map<string, { contentType: string; filePath: string }>;
};

function meta() {
  if (!g.__pfAudioMeta) g.__pfAudioMeta = new Map();
  return g.__pfAudioMeta;
}

function dir() {
  const d = path.join(process.cwd(), ".data", "audio");
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

export function storeAudioBytes(
  bytes: ArrayBuffer | Uint8Array,
  contentType = "audio/mpeg",
  ext = "mp3",
): string {
  const id = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const filePath = path.join(dir(), `${id}.${ext}`);
  const buf = Buffer.from(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes);
  writeFileSync(filePath, buf);
  meta().set(id, { contentType, filePath });
  return id;
}

export function getAudioRecord(id: string) {
  const hit = meta().get(id);
  if (hit && existsSync(hit.filePath)) return hit;
  // Recover after hot reload: look for file on disk
  for (const ext of ["mp3", "wav"]) {
    const filePath = path.join(dir(), `${id}.${ext}`);
    if (existsSync(filePath)) {
      const contentType = ext === "wav" ? "audio/wav" : "audio/mpeg";
      const rec = { contentType, filePath };
      meta().set(id, rec);
      return rec;
    }
  }
  return null;
}

export function audioPublicUrl(id: string): string {
  return `/api/audio/${id}`;
}

export function readAudioFile(id: string): { bytes: Buffer; contentType: string } | null {
  const rec = getAudioRecord(id);
  if (!rec) return null;
  return { bytes: readFileSync(rec.filePath), contentType: rec.contentType };
}
