/**
 * FutureStemSeparationEngine — Level 2 (not active in the demo).
 *
 * This file documents and types the planned server-side pipeline that will
 * replace the approximate local analysis with real AI stem separation
 * (e.g. Demucs / Spleeter running in a worker), behind the exact same
 * `AnalysisEngine` interface as the demo engine, so gameplay code never
 * changes.
 *
 * Planned flow:
 *
 *   1. Upload the audio file to Supabase Storage (bucket `songs`).
 *   2. Insert a `songs` row (status: "processing"), keyed by a content
 *      hash so re-uploads of the same file reuse the cached analysis.
 *   3. Trigger a server job (Supabase Edge Function → GPU worker) that:
 *        a. separates the mix into stems: vocals, drums, bass, piano,
 *           electric guitar, acoustic guitar;
 *        b. uploads each stem to Storage (`song_stems` rows);
 *        c. runs onset/pitch detection PER STEM (far more accurate than
 *           the band-pass approximation used in the demo);
 *        d. writes one `charts` row per instrument (Beatmap JSON, same
 *           schema as types/index.ts).
 *   4. The client polls (or subscribes via Supabase Realtime) until
 *      status = "ready", then downloads stems + charts.
 *
 * Gameplay benefits once live:
 *   - the "vocals on/off" option becomes a true stem mute (today it is a
 *     mid-side cancellation approximation, see playback.ts);
 *   - per-instrument volume becomes a true stem mixer;
 *   - bots can audibly "play" their own stems;
 *   - charts follow the real instrument, not a frequency band.
 *
 * See docs/ARCHITECTURE.md and lib/supabase/types.ts for the table schema.
 */

import type { AnalysisEngine } from "./demoLocalAudioEngine";

export type StemKind =
  | "vocals"
  | "drums"
  | "bass"
  | "piano"
  | "electric_guitar"
  | "acoustic_guitar";

export interface StemSeparationJob {
  songId: string;
  status: "uploading" | "queued" | "separating" | "charting" | "ready" | "error";
  /** Storage paths of produced stems, filled as the job progresses. */
  stems: Partial<Record<StemKind, string>>;
  error?: string;
}

/**
 * Placeholder implementation. Throws by design: the UI must not offer this
 * engine until the Supabase backend exists. Swap `demoLocalAudioEngine`
 * for this in `app/solo/page.tsx` when the pipeline is live.
 */
export const futureStemSeparationEngine: AnalysisEngine = {
  name: "Séparation IA (serveur)",
  isRealSeparation: true,

  async analyze(): Promise<never> {
    throw new Error(
      "FutureStemSeparationEngine is not implemented yet. " +
        "The demo uses demoLocalAudioEngine (local approximate analysis). " +
        "See docs/ARCHITECTURE.md for the integration plan."
    );
  },
};
