"use client";

import { create } from "zustand";
import type WaveSurfer from "wavesurfer.js";

type PlayerState = {
  playingId: string | null;
  instances: Map<string, WaveSurfer>;
  setPlayingId: (id: string | null) => void;
  register: (id: string, ws: WaveSurfer) => void;
  unregister: (id: string) => void;
  toggle: (id: string) => void;
  pauseAll: () => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  playingId: null,
  instances: new Map(),
  setPlayingId: (id) => set({ playingId: id }),
  register: (id, ws) => {
    const next = new Map(get().instances);
    next.set(id, ws);
    set({ instances: next });
  },
  unregister: (id) => {
    const next = new Map(get().instances);
    next.delete(id);
    set({ instances: next });
  },
  toggle: (id) => {
    const { instances, playingId } = get();
    const ws = instances.get(id);
    if (!ws) return;
    if (playingId && playingId !== id) {
      instances.get(playingId)?.pause();
    }
    if (ws.isPlaying()) {
      ws.pause();
      set({ playingId: null });
    } else {
      void ws.play();
      set({ playingId: id });
    }
  },
  pauseAll: () => {
    const { instances } = get();
    instances.forEach((ws) => ws.pause());
    set({ playingId: null });
  },
}));
