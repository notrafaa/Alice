"use client";

import { create } from "zustand";
import type {
  AnalysisPhase,
  Beatmap,
  GameResult,
  InstrumentId,
  SoloOptions,
  SongMeta,
} from "@/types";
import { DEFAULT_SOLO_OPTIONS } from "@/types";

/**
 * Global session store (Zustand).
 *
 * Holds the state that must survive client-side navigation between
 * /solo (upload + setup) and /game (gameplay): the decoded audio buffer,
 * the generated beatmap, the chosen instrument and the solo options.
 *
 * The AudioBuffer is intentionally kept here (in memory, non-serialized) —
 * it never leaves the browser in the current demo. When the
 * FutureStemSeparationEngine lands, songs/charts will instead be referenced
 * by Supabase ids (see lib/supabase/types.ts) and re-fetched on demand.
 */
interface SessionState {
  // --- song / analysis -----------------------------------------------------
  song: SongMeta | null;
  audioBuffer: AudioBuffer | null;
  beatmap: Beatmap | null;
  analysisPhase: AnalysisPhase;
  analysisProgress: number; // 0..1
  analysisError: string | null;

  // --- setup ---------------------------------------------------------------
  instrument: InstrumentId | null;
  options: SoloOptions;

  // --- results -------------------------------------------------------------
  lastResult: GameResult | null;

  // --- actions -------------------------------------------------------------
  setSong: (song: SongMeta, buffer: AudioBuffer) => void;
  setBeatmap: (beatmap: Beatmap) => void;
  setAnalysis: (phase: AnalysisPhase, progress?: number, error?: string) => void;
  setInstrument: (instrument: InstrumentId) => void;
  setOptions: (patch: Partial<SoloOptions>) => void;
  setResult: (result: GameResult) => void;
  resetSong: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  song: null,
  audioBuffer: null,
  beatmap: null,
  analysisPhase: "idle",
  analysisProgress: 0,
  analysisError: null,

  instrument: null,
  options: { ...DEFAULT_SOLO_OPTIONS },

  lastResult: null,

  setSong: (song, buffer) =>
    set({ song, audioBuffer: buffer, beatmap: null, lastResult: null }),
  setBeatmap: (beatmap) => set({ beatmap }),
  setAnalysis: (phase, progress = 0, error) =>
    set({
      analysisPhase: phase,
      analysisProgress: progress,
      analysisError: error ?? null,
    }),
  setInstrument: (instrument) => set({ instrument }),
  setOptions: (patch) =>
    set((state) => ({ options: { ...state.options, ...patch } })),
  setResult: (result) => set({ lastResult: result }),
  resetSong: () =>
    set({
      song: null,
      audioBuffer: null,
      beatmap: null,
      analysisPhase: "idle",
      analysisProgress: 0,
      analysisError: null,
      instrument: null,
      lastResult: null,
    }),
}));
