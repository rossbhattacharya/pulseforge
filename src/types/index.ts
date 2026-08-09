export type StemLane = "drums" | "bass" | "melody" | "pads" | "vocals";
export type ProjectStatus = "draft" | "mastered";
export type GenerationStatus = "queued" | "running" | "succeeded" | "failed";
export type InfluenceMode = "features" | "audio";
export type MasteringPreset = "streaming" | "club" | "raw";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  plan: "free" | "pro";
  credits_remaining: number;
}

export interface Project {
  id: string;
  owner: string;
  title: string;
  genre: string;
  bpm: number;
  key: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  cover_gradient?: string;
}

export interface GenerationParams {
  genre: string;
  bpm: number;
  key: string;
  energy: number;
  durationSec: number;
  vocals: boolean;
  lyrics?: string;
  moodTags: string[];
  takeCount: number;
  references: ReferenceInfluence[];
}

export interface ReferenceInfluence {
  analysisId: string;
  mode: InfluenceMode;
  strength: number;
  aspects: { rhythm: number; mood: number; instrumentation: number };
  rightsAttested: boolean;
}

export interface Generation {
  id: string;
  project_id: string;
  prompt_text: string;
  params: GenerationParams;
  provider: string;
  provider_job_id: string;
  status: GenerationStatus;
  progress: number;
  stage: GenerationStage;
  error: string | null;
  created_at: string;
}

export type GenerationStage =
  | "interpreting"
  | "composing"
  | "generating"
  | "mastering"
  | "done"
  | "failed";

export interface Take {
  id: string;
  generation_id: string;
  index: number;
  audio_url: string;
  duration_s: number;
  descriptor: string;
  selected: boolean;
  favorited: boolean;
}

export interface Stem {
  id: string;
  take_id: string;
  lane: StemLane;
  audio_url: string;
  volume: number;
  muted: boolean;
  solo: boolean;
}

export interface ReferenceAnalysis {
  id: string;
  owner: string;
  source_name: string;
  bpm: number;
  key: string;
  energy: number;
  mood_tags: string[];
  features: Record<string, unknown>;
  audio_url: string | null;
  rights_attested: boolean;
  influence_mode: InfluenceMode;
  created_at: string;
}

export interface ExportRecord {
  id: string;
  project_id: string;
  format: "wav" | "mp3" | "stems_zip";
  mastering_preset: MasteringPreset;
  file_url: string;
  created_at: string;
}

export const STEM_LANES: StemLane[] = [
  "drums",
  "bass",
  "melody",
  "pads",
  "vocals",
];

export const MOOD_TAGS = [
  "Dark",
  "Euphoric",
  "Dreamy",
  "Aggressive",
  "Funky",
  "Melancholic",
  "Uplifting",
  "Hypnotic",
  "Warm",
  "Industrial",
] as const;

export const GENRES = [
  "Techno",
  "House",
  "Drum & Bass",
  "Lo-fi",
  "Trap",
  "Ambient",
  "Afrobeats",
  "Synthwave",
  "UK Garage",
  "Melodic Techno",
] as const;

export const KEYS = [
  "C maj",
  "C min",
  "D maj",
  "D min",
  "E maj",
  "E min",
  "F maj",
  "F min",
  "G maj",
  "G min",
  "A maj",
  "A min",
  "B maj",
  "B min",
] as const;
