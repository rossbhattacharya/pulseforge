-- Pulseforge initial schema
-- Run in Supabase SQL editor when connecting a real project.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  plan text not null default 'free',
  credits_remaining int not null default 50
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  title text not null,
  genre text not null default 'Techno',
  bpm int not null default 120,
  key text not null default 'A min',
  status text not null default 'draft' check (status in ('draft','mastered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  prompt_text text not null,
  params jsonb not null default '{}',
  provider text not null,
  provider_job_id text,
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','failed')),
  error text,
  created_at timestamptz not null default now()
);

create table if not exists takes (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references generations(id) on delete cascade,
  index int not null,
  audio_url text not null,
  duration_s numeric not null,
  descriptor text,
  selected boolean not null default false,
  favorited boolean not null default false
);

create table if not exists stems (
  id uuid primary key default gen_random_uuid(),
  take_id uuid not null references takes(id) on delete cascade,
  lane text not null check (lane in ('drums','bass','melody','pads','vocals')),
  audio_url text not null,
  volume numeric not null default 0.85,
  muted boolean not null default false,
  solo boolean not null default false
);

create table if not exists reference_analyses (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  source_name text not null,
  bpm numeric,
  key text,
  energy numeric,
  mood_tags text[] not null default '{}',
  features jsonb not null default '{}',
  audio_url text,
  rights_attested boolean not null default false,
  influence_mode text not null default 'features'
    check (influence_mode in ('features','audio')),
  created_at timestamptz not null default now(),
  constraint audio_requires_attestation
    check (audio_url is null or rights_attested = true)
);

create table if not exists rights_attestations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  file_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  format text not null,
  mastering_preset text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table projects enable row level security;
alter table generations enable row level security;
alter table takes enable row level security;
alter table stems enable row level security;
alter table reference_analyses enable row level security;
alter table rights_attestations enable row level security;
alter table exports enable row level security;

create policy "profiles_own" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "projects_own" on projects
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

create policy "generations_own" on generations
  for all using (
    exists (select 1 from projects p where p.id = project_id and p.owner = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = project_id and p.owner = auth.uid())
  );

create policy "takes_own" on takes
  for all using (
    exists (
      select 1 from generations g
      join projects p on p.id = g.project_id
      where g.id = generation_id and p.owner = auth.uid()
    )
  );

create policy "stems_own" on stems
  for all using (
    exists (
      select 1 from takes t
      join generations g on g.id = t.generation_id
      join projects p on p.id = g.project_id
      where t.id = take_id and p.owner = auth.uid()
    )
  );

create policy "refs_own" on reference_analyses
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

create policy "attest_own" on rights_attestations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "exports_own" on exports
  for all using (
    exists (select 1 from projects p where p.id = project_id and p.owner = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = project_id and p.owner = auth.uid())
  );

-- Storage buckets (create in dashboard or via API): takes, stems, exports, artwork
