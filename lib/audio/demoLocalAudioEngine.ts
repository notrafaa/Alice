/**
 * DemoLocalAudioEngine — Level 1 (current demo).
 *
 * Orchestrates the whole "upload → playable beatmap" pipeline entirely in
 * the browser, with zero server dependency:
 *
 *   File (.mp3/.wav)
 *     → decodeAudioFile        (Web Audio decode)
 *     → analyzeAudioBuffer     (envelope, onsets, BPM)
 *     → renderInstrumentBand   (per-instrument band-pass bias)
 *     → detectOnsets           (transient detection per band)
 *     → createInstrumentChart  (lane spreading + difficulty thinning)
 *     → generateBeatmap        (final exportable Beatmap JSON)
 *
 * This is intentionally approximate — see lib/audio/analysis.ts for the
 * honest limitations, and lib/audio/futureStemSeparationEngine.ts for the
 * Level 2 architecture (real AI stem separation on the server) that will
 * replace this engine behind the same interface.
 */

import type { Beatmap, SoloOptions, SongMeta } from "@/types";
import { decodeAudioFile, generateBeatmap } from "./analysis";

export interface AnalysisEngine {
  /** Human-readable engine name (shown in the analysis UI). */
  readonly name: string;
  /** True if the produced charts come from real stem separation. */
  readonly isRealSeparation: boolean;
  analyze(
    file: File,
    difficulty: SoloOptions["difficulty"],
    onProgress?: (phase: string, progress: number) => void
  ): Promise<{ meta: SongMeta; buffer: AudioBuffer; beatmap: Beatmap }>;
}

function makeSongId(file: File): string {
  // Stable-ish id from name + size; the future engine will hash the file
  // content so a re-uploaded song can reuse its cached Supabase analysis.
  const slug = file.name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48);
  return `${slug}-${file.size}`;
}

export const demoLocalAudioEngine: AnalysisEngine = {
  name: "Analyse locale (démo)",
  isRealSeparation: false,

  async analyze(file, difficulty, onProgress) {
    onProgress?.("decoding", 0.05);
    const buffer = await decodeAudioFile(file);

    const meta: SongMeta = {
      id: makeSongId(file),
      title: file.name.replace(/\.[^.]+$/, ""),
      fileName: file.name,
      fileSize: file.size,
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
    };

    onProgress?.("analyzing", 0.15);
    const beatmap = await generateBeatmap(
      buffer,
      { songId: meta.id, title: meta.title },
      difficulty,
      (p) => onProgress?.(p < 1 ? "analyzing" : "building-charts", 0.15 + p * 0.85)
    );

    return { meta, buffer, beatmap };
  },
};
