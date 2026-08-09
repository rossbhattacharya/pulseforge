import type { ReferenceAnalysis, ReferenceInfluence } from "@/types";

export function referenceToPromptFragment(
  analysis: Pick<
    ReferenceAnalysis,
    "bpm" | "key" | "energy" | "mood_tags" | "features" | "source_name"
  >,
  aspects: ReferenceInfluence["aspects"],
  strength: number,
): string {
  const parts: string[] = [];
  const weight = Math.round(strength);

  if (aspects.rhythm > 40) {
    parts.push(`${analysis.bpm} BPM`);
    const groove = String(analysis.features.groove ?? "driving groove");
    if (aspects.rhythm > 70) parts.push(groove);
  }

  if (aspects.mood > 40) {
    parts.push(`${analysis.key}`);
    const energyLabel =
      analysis.energy > 0.7
        ? "high-energy"
        : analysis.energy > 0.4
          ? "mid-energy"
          : "low-energy restrained";
    parts.push(energyLabel);
    if (analysis.mood_tags.length) {
      const take = analysis.mood_tags.slice(0, aspects.mood > 70 ? 4 : 2);
      parts.push(`${take.join(", ")} mood`);
    }
  }

  if (aspects.instrumentation > 40) {
    const instruments = String(
      analysis.features.instrumentation ?? "modern electronic instrumentation",
    );
    parts.push(instruments);
  }

  const core = parts.filter(Boolean).join(", ");
  if (!core) return "";

  return `Inspired by reference "${analysis.source_name}" (influence ${weight}%): ${core}. Create a new original composition — do not copy or extend the reference.`;
}

export function compileGenerationPrompt(
  userPrompt: string,
  params: {
    genre: string;
    bpm: number;
    key: string;
    energy: number;
    vocals: boolean;
    lyrics?: string;
    moodTags: string[];
  },
  referenceFragments: string[],
): string {
  const chunks = [
    userPrompt.trim(),
    `Genre: ${params.genre}. Tempo: ${params.bpm} BPM. Key: ${params.key}. Energy: ${Math.round(params.energy)}/100.`,
    params.moodTags.length ? `Mood: ${params.moodTags.join(", ")}.` : "",
    params.vocals
      ? `Include vocals.${params.lyrics ? ` Lyrics direction: ${params.lyrics}` : ""}`
      : "Instrumental only — no lead vocals.",
    ...referenceFragments,
    "Output must be an original composition.",
  ];
  return chunks.filter(Boolean).join(" ");
}
