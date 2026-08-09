"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Check, GitCompare } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { WaveCard } from "@/components/ui/wave-card";
import { Readout } from "@/components/ui/readout";
import { formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/lib/store/player";

async function load(id: string) {
  const res = await fetch(`/api/generations/${id}`);
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<{
    generation: { id: string; prompt_text: string; status: string };
    takes: Array<{
      id: string;
      index: number;
      audio_url: string;
      duration_s: number;
      descriptor: string;
      selected: boolean;
      favorited: boolean;
    }>;
  }>;
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [compare, setCompare] = useState(false);
  const toggle = usePlayerStore((s) => s.toggle);

  const { data, isLoading, error } = useQuery({
    queryKey: ["results", id],
    queryFn: () => load(id),
  });

  const patch = useMutation({
    mutationFn: async (body: {
      takeId: string;
      selected?: boolean;
      favorited?: boolean;
    }) => {
      const res = await fetch(`/api/generations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["results", id] }),
  });

  const selected = data?.takes.find((t) => t.selected) ?? data?.takes[0];

  return (
    <div className="px-6 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-white">
            Takes
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--pf-muted)]">
            {data?.generation.prompt_text}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={compare ? "primary" : "secondary"}
            onClick={() => setCompare((v) => !v)}
          >
            <GitCompare size={16} />
            A/B
          </Button>
          <Button
            disabled={!selected}
            onClick={() => selected && router.push(`/editor/${selected.id}`)}
          >
            Open in editor
          </Button>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-[var(--pf-muted)]">Loading takes…</p>
      )}
      {error && (
        <p className="text-sm text-red-300">Could not load results.</p>
      )}
      {!isLoading && data?.takes.length === 0 && (
        <Panel className="p-10 text-center text-[var(--pf-muted)]">
          No takes yet. Generation may still be running.
        </Panel>
      )}

      <div
        className={
          compare
            ? "grid grid-cols-1 gap-4 md:grid-cols-2"
            : "space-y-4"
        }
      >
        {data?.takes.map((take) => (
          <Panel
            key={take.id}
            active={take.selected}
            className="p-4 transition-colors"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-white">
                  Take {take.index + 1}
                </p>
                <p className="text-sm text-[var(--pf-muted)]">{take.descriptor}</p>
              </div>
              <div className="flex items-center gap-2">
                <Readout className="text-[var(--pf-muted)]">
                  {formatDuration(take.duration_s)}
                </Readout>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    patch.mutate({
                      takeId: take.id,
                      favorited: !take.favorited,
                    })
                  }
                >
                  <Heart
                    size={16}
                    className={take.favorited ? "fill-[var(--pf-magenta)] text-[var(--pf-magenta)]" : ""}
                  />
                </Button>
                <Button
                  size="sm"
                  variant={take.selected ? "primary" : "secondary"}
                  onClick={() =>
                    patch.mutate({ takeId: take.id, selected: true })
                  }
                >
                  <Check size={14} />
                  Select
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggle(take.id)}>
                  Play
                </Button>
              </div>
            </div>
            <WaveCard id={take.id} url={take.audio_url} height={64} />
          </Panel>
        ))}
      </div>
    </div>
  );
}
