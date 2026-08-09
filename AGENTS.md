# Pulseforge — Agent Rules

You are building **Pulseforge**, a desktop-first web app where users generate original AI music from text prompts and analyzed reference tracks, refine results in a lightweight stem editor, and export production-ready audio. Stitch designs in `/design` are the source of truth for layout, spacing, and visual style.

## Product summary

Users describe a track in text (plus genre/BPM/key/energy/mood) and/or upload reference tracks → third-party music API → 2–8 takes → light editor (5 stems) → export WAV/MP3/stems. Projects persist in a library.

## Tech stack (do not deviate without asking)

- Next.js 15 (App Router) + TypeScript on Vercel
- Tailwind CSS + custom `/components/ui` (no CSS-in-JS)
- Zustand (player/editor) + TanStack Query (server state)
- Next.js API routes; async generation with polling
- Supabase (Postgres, Auth, Storage) — local mock store when env unset
- Tone.js (editor), wavesurfer.js (waveforms)
- Client Web Audio analysis for references (Meyda deferred)
- `MusicProvider` adapter interface — never hardcode a vendor
- ffmpeg.wasm for export (client)

## Design system

- Background `#0A0A0F`; panels `#131320` / `#1a1a28` with `#2A2A3A` borders, 12px radius
- Accents: cyan `#00E5FF`, magenta `#FF2E9A`, violet `#8B5CF6`, success `#3DFFA2`, warning `#FFB020`
- Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (tech data)
- Primary CTAs: 135° cyan→magenta gradient

## Engineering rules

- TypeScript strict; zod on API boundaries; no `any`
- Loading / empty / error states on every screen
- Audio streams from signed URLs / public sample paths — not through Next for playback
- `MockMusicProvider` for UI + tests (`MUSIC_PROVIDER=mock`)
- Log non-obvious choices in `DECISIONS.md`
- Reference audio conditioning requires rights attestation; no YouTube/streaming download
