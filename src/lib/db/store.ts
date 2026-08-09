import type {
  ExportRecord,
  Generation,
  GenerationParams,
  Profile,
  Project,
  ReferenceAnalysis,
  Stem,
  Take,
} from "@/types";
import { STEM_LANES } from "@/types";

const g = globalThis as typeof globalThis & {
  __pulseforgeStore?: PulseStore;
};

type PulseStore = {
  profile: Profile;
  projects: Project[];
  generations: Generation[];
  takes: Take[];
  stems: Stem[];
  references: ReferenceAnalysis[];
  exports: ExportRecord[];
  attestations: Array<{
    userId: string;
    fileHash: string;
    timestamp: string;
  }>;
};

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function seed(): PulseStore {
  const owner = "local-user";
  const now = new Date().toISOString();
  const projects: Project[] = [
    {
      id: "proj_midnight",
      owner,
      title: "Midnight Circuit v3",
      genre: "Melodic Techno",
      bpm: 124,
      key: "A min",
      status: "draft",
      created_at: now,
      updated_at: now,
      cover_gradient: "from-cyan-500 to-fuchsia-600",
    },
    {
      id: "proj_neon",
      owner,
      title: "Neon Drift",
      genre: "Synthwave",
      bpm: 110,
      key: "C min",
      status: "draft",
      created_at: now,
      updated_at: now,
      cover_gradient: "from-violet-500 to-cyan-400",
    },
    {
      id: "proj_urban",
      owner,
      title: "Urban Pulse Bass",
      genre: "UK Garage",
      bpm: 135,
      key: "F min",
      status: "draft",
      created_at: now,
      updated_at: now,
      cover_gradient: "from-fuchsia-500 to-amber-400",
    },
  ];

  const references: ReferenceAnalysis[] = [
    {
      id: "ref_warehouse",
      owner,
      source_name: "Warehouse 3AM",
      bpm: 128,
      key: "F# min",
      energy: 0.85,
      mood_tags: ["High Energy", "Dark"],
      features: {
        groove: "rolling 16th-note bassline",
        instrumentation: "kick, hats, acid bass, sparse pads",
      },
      audio_url: null,
      rights_attested: false,
      influence_mode: "features",
      created_at: now,
    },
    {
      id: "ref_brass",
      owner,
      source_name: "Analog Brass Pad",
      bpm: 100,
      key: "D maj",
      energy: 0.45,
      mood_tags: ["Lush", "Warm"],
      features: {
        groove: "slow pad swells",
        instrumentation: "analog brass, soft keys",
      },
      audio_url: null,
      rights_attested: false,
      influence_mode: "features",
      created_at: now,
    },
    {
      id: "ref_808",
      owner,
      source_name: "Distorted 808s",
      bpm: 140,
      key: "C min",
      energy: 0.9,
      mood_tags: ["Aggressive"],
      features: {
        groove: "trap hi-hat rolls",
        instrumentation: "distorted 808, crisp snares",
      },
      audio_url: null,
      rights_attested: false,
      influence_mode: "features",
      created_at: now,
    },
  ];

  return {
    profile: {
      id: owner,
      display_name: "Producer",
      avatar_url: null,
      plan: "pro",
      credits_remaining: 47,
    },
    projects,
    generations: [],
    takes: [],
    stems: [],
    references,
    exports: [],
    attestations: [],
  };
}

export function getStore(): PulseStore {
  if (!g.__pulseforgeStore) g.__pulseforgeStore = seed();
  return g.__pulseforgeStore;
}

export function getProfile() {
  return getStore().profile;
}

export function debitCredits(amount: number) {
  const store = getStore();
  if (store.profile.credits_remaining < amount) {
    throw new Error("Insufficient credits");
  }
  store.profile.credits_remaining -= amount;
  return store.profile.credits_remaining;
}

export function listProjects() {
  return [...getStore().projects].sort(
    (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at),
  );
}

export function getProject(id: string) {
  return getStore().projects.find((p) => p.id === id) ?? null;
}

export function upsertProject(
  input: Partial<Project> & Pick<Project, "title" | "genre" | "bpm" | "key">,
) {
  const store = getStore();
  const now = new Date().toISOString();
  if (input.id) {
    const idx = store.projects.findIndex((p) => p.id === input.id);
    if (idx >= 0) {
      store.projects[idx] = {
        ...store.projects[idx]!,
        ...input,
        updated_at: now,
      };
      return store.projects[idx]!;
    }
  }
  const project: Project = {
    id: uid("proj"),
    owner: store.profile.id,
    title: input.title,
    genre: input.genre,
    bpm: input.bpm,
    key: input.key,
    status: input.status ?? "draft",
    created_at: now,
    updated_at: now,
    cover_gradient: input.cover_gradient,
  };
  store.projects.unshift(project);
  return project;
}

export function deleteProjects(ids: string[]) {
  const store = getStore();
  store.projects = store.projects.filter((p) => !ids.includes(p.id));
}

export function duplicateProject(id: string) {
  const existing = getProject(id);
  if (!existing) return null;
  return upsertProject({
    title: `${existing.title} (copy)`,
    genre: existing.genre,
    bpm: existing.bpm,
    key: existing.key,
    cover_gradient: existing.cover_gradient,
  });
}

export function createGeneration(input: {
  project_id: string;
  prompt_text: string;
  params: GenerationParams;
  provider: string;
  provider_job_id: string;
}) {
  const store = getStore();
  const gen: Generation = {
    id: uid("gen"),
    project_id: input.project_id,
    prompt_text: input.prompt_text,
    params: input.params,
    provider: input.provider,
    provider_job_id: input.provider_job_id,
    status: "queued",
    progress: 0,
    stage: "interpreting",
    error: null,
    created_at: new Date().toISOString(),
  };
  store.generations.unshift(gen);
  return gen;
}

export function getGeneration(id: string) {
  return getStore().generations.find((g) => g.id === id) ?? null;
}

export function updateGeneration(id: string, patch: Partial<Generation>) {
  const store = getStore();
  const idx = store.generations.findIndex((g) => g.id === id);
  if (idx < 0) return null;
  store.generations[idx] = { ...store.generations[idx]!, ...patch };
  return store.generations[idx]!;
}

export function listTakes(generationId: string) {
  return getStore()
    .takes.filter((t) => t.generation_id === generationId)
    .sort((a, b) => a.index - b.index);
}

export function getTake(id: string) {
  return getStore().takes.find((t) => t.id === id) ?? null;
}

export function replaceTakes(
  generationId: string,
  takes: Array<{
    index: number;
    audio_url: string;
    duration_s: number;
    descriptor: string;
    stemUrls?: Partial<Record<(typeof STEM_LANES)[number], string>>;
  }>,
) {
  const store = getStore();
  store.takes = store.takes.filter((t) => t.generation_id !== generationId);
  store.stems = store.stems.filter(
    (s) => !store.takes.some((t) => t.id === s.take_id),
  );

  const created: Take[] = [];
  for (const t of takes) {
    const take: Take = {
      id: uid("take"),
      generation_id: generationId,
      index: t.index,
      audio_url: t.audio_url,
      duration_s: t.duration_s,
      descriptor: t.descriptor,
      selected: t.index === 0,
      favorited: false,
    };
    store.takes.push(take);
    created.push(take);
    for (const lane of STEM_LANES) {
      const url = t.stemUrls?.[lane] ?? `/samples/stems/${lane}.wav`;
      store.stems.push({
        id: uid("stem"),
        take_id: take.id,
        lane,
        audio_url: url,
        volume: 0.85,
        muted: false,
        solo: false,
      });
    }
  }
  return created;
}

export function updateTake(id: string, patch: Partial<Take>) {
  const store = getStore();
  const idx = store.takes.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  store.takes[idx] = { ...store.takes[idx]!, ...patch };
  return store.takes[idx]!;
}

export function listStems(takeId: string) {
  return getStore().stems.filter((s) => s.take_id === takeId);
}

export function updateStem(id: string, patch: Partial<Stem>) {
  const store = getStore();
  const idx = store.stems.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  store.stems[idx] = { ...store.stems[idx]!, ...patch };
  return store.stems[idx]!;
}

export function listReferences() {
  return [...getStore().references].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
}

export function getReference(id: string) {
  return getStore().references.find((r) => r.id === id) ?? null;
}

export function addReference(
  input: Omit<ReferenceAnalysis, "id" | "owner" | "created_at">,
) {
  const store = getStore();
  const ref: ReferenceAnalysis = {
    ...input,
    id: uid("ref"),
    owner: store.profile.id,
    created_at: new Date().toISOString(),
  };
  store.references.unshift(ref);
  return ref;
}

export function logAttestation(fileHash: string) {
  const store = getStore();
  store.attestations.push({
    userId: store.profile.id,
    fileHash,
    timestamp: new Date().toISOString(),
  });
}

export function addExport(input: Omit<ExportRecord, "id" | "created_at">) {
  const store = getStore();
  const record: ExportRecord = {
    ...input,
    id: uid("exp"),
    created_at: new Date().toISOString(),
  };
  store.exports.unshift(record);
  return record;
}

export function recentGenerations(limit = 8) {
  return getStore()
    .generations.filter((g) => g.status === "succeeded")
    .slice(0, limit);
}
