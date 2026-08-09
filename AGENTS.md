# Pulseforge — Agent Rules

You are building **Pulseforge**, a desktop-first web app where users generate original AI music from text prompts and analyzed reference tracks, refine results in a lightweight stem editor, and export production-ready audio. Screenshots and exported markup live in `/design`. Match those designs closely — they are the source of truth for layout, spacing, and visual style.

## Product summary

Users describe a track in text (plus genre/BPM/key/energy/mood controls) and/or upload reference tracks that inspire generation — via extracted musical features or, where supported, direct audio conditioning → third-party music API → 2–8 takes → light editor (5 stem lanes: Drums, Bass, Melody, Pads, Vocals; mute/solo/volume, trim, section markers, AI regenerate-stem) → export WAV/MP3/stems with mastering presets and metadata. Projects persist in a library.

## Tech stack (do not deviate without asking)

- **Framework:** Next.js 15 (App Router) + TypeScript, deployed on Vercel
- **Styling:** Tailwind CSS + shadcn/ui primitives, customized to the Pulseforge design system. No CSS-in-JS
- **State:** Zustand (player, editor); TanStack Query (server state)
- **Backend:** Next.js API routes / server actions; async generation with status polling
- **Database + Auth + Storage:** Supabase (Postgres, Auth email + Google OAuth, Storage buckets: `takes`, `stems`, `exports`, `artwork`)
- **Audio:** Tone.js (editor), wavesurfer.js (waveforms elsewhere)
- **Analysis:** client-side Meyda + custom BPM/key detection; ask before adding librosa microservice
- **Music generation:** `MusicProvider` adapter only — never hardcode a vendor
- **Export:** ffmpeg.wasm client-side; server ffmpeg only if client too slow for stems ZIP

## Design system

- Background `#0A0A0F`; panels `#131320` with 1px `#2A2A3A` borders, radius 12px; hero glow `#14101F`
- Accents: cyan `#00E5FF`, magenta `#FF2E9A`, violet `#8B5CF6`, success `#3DFFA2`, warning `#FFB020`
- Primary CTAs: 135° cyan→magenta gradient with soft glow
- Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (BPM/key/timecodes)
- Body `#C8C8D8`, muted `#6E6E85`, headings white
- Waveforms: glowing cyan/magenta gradients on dark panels
- UI kit: Button, Panel, Chip, Slider, Readout, WaveCard in `/components/ui`

## Data model (Supabase)

`profiles`, `projects`, `generations`, `takes`, `stems`, `reference_analyses`, `exports` — RLS scoped to owner. `reference_analyses.audio_url` only when `rights_attested` is true.

## Generation pipeline

1. Client submits → create `generations` row (`queued`), debit credits, `MusicProvider.createJob()`
2. Adapter: `createJob`, `getJobStatus`, `regenerateStem` (or Demucs — ask first); `capabilities`; `references[]` with features|audio modes
3. Poll `GET /api/generations/[id]` every 3s; on success store audio + create takes
4. Map progress to: Interpreting → Composing → Generating → Mastering
5. Provider pick requires confirmation after web research (see Phase 2 / `DECISIONS.md`)

## Reference-track rules (non-negotiable)

- Feature guidance (default) vs audio conditioning (rights attestation required)
- No YouTube/streaming audio download
- Outputs must be original — never cover/clone/extend
- Create copy: "Your references guide the vibe — every generation is a new, original composition."

## Engineering rules

- TypeScript strict; zod on every API boundary; no `any`
- Loading / empty / error states on every screen
- Audio playback via signed URLs — not through Next.js
- Playwright smoke tests; `MockMusicProvider` for UI/tests
- Log non-obvious choices in `DECISIONS.md`
- Do not scaffold outside the current phase; ask before adding dependencies
