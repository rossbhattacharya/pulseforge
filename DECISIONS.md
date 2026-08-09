# Decisions

## 2026-08-09 — Local-first mock when Supabase unset

Ship a full UI + generation pipeline against `MockMusicProvider` and an in-memory/localStorage store so the app runs without Supabase credentials. When `NEXT_PUBLIC_SUPABASE_URL` + keys are set, API routes prefer Supabase. Keeps Phase 0–5 demos unblocked.

## 2026-08-09 — Web Audio analysis instead of Meyda for v1

Meyda + Next/Turbopack bundling is brittle. Implemented lightweight client-side Web Audio analysis (RMS energy, spectral centroid heuristic, tempo estimate via autocorrelation). Documented hook points to swap Meyda later. No Python/librosa microservice until requested.

## 2026-08-09 — Provider recommendation (Phase 2 research)

**Primary:** Stability Stable Audio 3.0 — official API, first-class audio-to-audio + `strength`, commercial Community License under ~$1M rev, ~$0.26/gen.  
**Secondary (optional):** ElevenLabs Music for vocals + stem separation.  
**Reject:** Suno (no public API yet); MusicGen@Replicate (CC-BY-NC weights).  
Adapters: `MockMusicProvider` (default), `StableAudioProvider` (wired behind `MUSIC_PROVIDER=stable`). Full matrix in research notes below. Awaiting product confirmation before spending real API credits; mock remains default.

### Research snapshot

| Provider | Official API | Audio conditioning | Stems | Commercial | Notes |
|---|---|---|---|---|---|
| Suno | No (partner intake) | Product only | Product 12 stems | Paid web | Skip until official API |
| ElevenLabs Music | Yes | Style ref; inpaint often Enterprise | Yes | Paid; Enterprise for film/TV | Good secondary |
| Stable Audio 3.0 | Yes | Best a2a + strength | No | Community / Enterprise | **Primary pick** |
| MusicGen @ Replicate | Yes | Melody/continuation | No | **CC-BY-NC** | Not for commercial |

## 2026-08-09 — Editor section markers are visual-only in v1

Intro/Build/Drop/Break/Outro markers are draggable labels that define loop regions. No audio rearrangement / clip splitting yet.

## 2026-08-09 — Stem separation path

Mock provider returns bundled stem WAVs. Real Stable Audio returns stereo only — `regenerateStem` stubs until Demucs/ElevenLabs stem path is approved.
