"use client";

import { create } from "zustand";
import type { StemLane } from "@/types";

export type SectionMarker = {
  id: string;
  label: "Intro" | "Build" | "Drop" | "Break" | "Outro";
  startBar: number;
  endBar: number;
};

type EditorState = {
  takeId: string | null;
  playing: boolean;
  loop: boolean;
  position: number;
  bpm: number;
  zoom: number;
  trimStart: number;
  trimEnd: number;
  markers: SectionMarker[];
  selectedLane: StemLane | null;
  setTake: (id: string, bpm: number) => void;
  setPlaying: (v: boolean) => void;
  setLoop: (v: boolean) => void;
  setPosition: (v: number) => void;
  setZoom: (v: number) => void;
  setTrim: (start: number, end: number) => void;
  setSelectedLane: (lane: StemLane | null) => void;
  moveMarker: (id: string, startBar: number, endBar: number) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  takeId: null,
  playing: false,
  loop: false,
  position: 0,
  bpm: 124,
  zoom: 1,
  trimStart: 0,
  trimEnd: 16,
  markers: [
    { id: "m1", label: "Intro", startBar: 0, endBar: 4 },
    { id: "m2", label: "Build", startBar: 4, endBar: 8 },
    { id: "m3", label: "Drop", startBar: 8, endBar: 12 },
    { id: "m4", label: "Break", startBar: 12, endBar: 14 },
    { id: "m5", label: "Outro", startBar: 14, endBar: 16 },
  ],
  selectedLane: null,
  setTake: (id, bpm) => set({ takeId: id, bpm, position: 0, playing: false }),
  setPlaying: (v) => set({ playing: v }),
  setLoop: (v) => set({ loop: v }),
  setPosition: (v) => set({ position: v }),
  setZoom: (v) => set({ zoom: v }),
  setTrim: (start, end) => set({ trimStart: start, trimEnd: end }),
  setSelectedLane: (lane) => set({ selectedLane: lane }),
  moveMarker: (id, startBar, endBar) =>
    set((s) => ({
      markers: s.markers.map((m) =>
        m.id === id ? { ...m, startBar, endBar } : m,
      ),
    })),
}));
