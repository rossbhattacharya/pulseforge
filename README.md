# Pulseforge

AI music creation studio — text + reference-inspired generation, stem editor, and export. Desktop-first dark UI matching the Stitch designs in `/design`.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- Zustand + TanStack Query
- Tone.js (editor) + wavesurfer.js (waveforms)
- Supabase-ready schema (`supabase/migrations`) with local in-memory store fallback
- `MusicProvider` adapters: **mock** (default) and **Stable Audio**

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo mode works without Supabase or API keys. Generation uses `MockMusicProvider` (~20s fake job → bundled sample WAVs).

## Environment

| Variable | Purpose |
|---|---|
| `MUSIC_PROVIDER` | `mock` (default) or `stable` |
| `STABILITY_API_KEY` | Required for Stable Audio adapter |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Optional real auth + persistence |

Apply `supabase/migrations/001_initial.sql` in your Supabase project, create storage buckets `takes`, `stems`, `exports`, `artwork`, and enable Google OAuth if desired.

## App routes

| Route | Screen |
|---|---|
| `/` | Home / dashboard |
| `/create` | Prompt + parameters + references |
| `/generating/[id]` | 4-stage progress (polls every 3s) |
| `/results/[id]` | Take picker + A/B |
| `/editor/[takeId]` | 5-lane Tone.js stem editor |
| `/library` | Project library |
| `/auth/login` · `/auth/signup` | Auth shells (Supabase-ready) |

## Provider recommendation (Phase 2)

**Primary:** Stability Stable Audio 3.0 (official API + audio-to-audio).  
**Secondary:** ElevenLabs Music for vocals/stems.  
See `DECISIONS.md` for the full research matrix.

## Scripts

```bash
npm run dev      # turbopack
npm run build
npm run start
npm run lint
npm test         # Playwright (install browsers once: npx playwright install)
```

## Design

Screenshots and exported Stitch HTML live in `/design`. Tokens and chrome follow `AGENTS.md` / `design/pulseforge/DESIGN.md`.

## License

Private / unpublished — add a license before public distribution of generated audio under your chosen provider terms.
