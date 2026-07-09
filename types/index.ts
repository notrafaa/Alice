/**
 * Core domain types for EXp3rience.
 *
 * IMPORTANT — portability contract:
 * Everything in this file is engine-agnostic game data. None of it may
 * reference the DOM, Web Audio, React or any browser API. This is the layer
 * that will be reused as-is for the future Roblox port (see
 * docs/ROBLOX_PORT_PLAN.md) and serialized to Supabase (see
 * lib/supabase/types.ts).
 */

// ---------------------------------------------------------------------------
// Play layouts
// ---------------------------------------------------------------------------

export type InstrumentId =
  | "keys_2"
  | "keys_4";

export interface InstrumentDef {
  id: InstrumentId;
  /** Display name (French UI). */
  name: string;
  /** Emoji used as a lightweight icon (no external assets needed). */
  icon: string;
  /** Number of vertical lanes. */
  lanes: 2 | 4;
  /**
   * Keyboard keys, one per lane, compared against `KeyboardEvent.key`
   * lowercased. On French AZERTY the 4-lane layout is X C N , — note that
   * the last key really is the comma (the key right of N on AZERTY).
   */
  keys: string[];
  /** Labels shown inside the hit circles (uppercased keys). */
  keyLabels: string[];
  /** Accent color (hex) used for lanes / notes / UI. */
  color: string;
  /** Secondary color for gradients. */
  colorSoft: string;
  /** Frequency band used by the demo analyzer to bias onset detection. */
  band: { low: number; high: number };
  /**
   * Minimum band-energy ratio (band RMS / full-mix RMS) for the analyzer
   * to consider this instrument present in a song. Below it, the
   * instrument is greyed out for that song (approximate heuristic).
   */
  minPresence: number;
  /** Minimum detected notes per second for the instrument to be offered. */
  minNotesPerSec: number;
  /** 1 (easy) → 5 (hard). Refined per-song after analysis. */
  baseDifficulty: number;
  /** Short flavor description for the select screen. */
  description: string;
}

// ---------------------------------------------------------------------------
// Notes & charts
// ---------------------------------------------------------------------------

export type HitState = "pending" | "holding" | "hit" | "missed";

export interface Note {
  id: string;
  /** Target time in seconds, relative to the start of the song audio. */
  time: number;
  /** Lane index, 0-based, left to right. */
  lane: number;
  /** Optional hold duration in seconds (long notes — reserved for later). */
  duration?: number;
  /** Instrument this note belongs to. */
  instrument: InstrumentId;
  /** Runtime hit state. Always "pending" in serialized charts. */
  hitState: HitState;
  /** Onset strength 0..1 from the analyzer (drives visuals/difficulty). */
  strength?: number;
}

export interface InstrumentChart {
  instrument: InstrumentId;
  lanes: number;
  keys: string[];
  notes: Note[];
  /** Estimated difficulty 1..10 computed from note density. */
  difficulty: number;
  /**
   * How much this instrument's frequency band is actually present in the
   * analyzed song (0..1). Approximate — see lib/audio/analysis.ts.
   */
  presence: number;
  /**
   * False when the analyzer thinks the song does not contain this
   * instrument (weak band presence or too few notes). Unavailable
   * instruments are greyed out in the select screen.
   */
  available: boolean;
}

/**
 * Exportable beatmap format. This exact JSON shape is the interchange
 * format for the Roblox port and for Supabase storage.
 */
export interface Beatmap {
  songId: string;
  title: string;
  /** Duration in seconds. */
  duration: number;
  /** Estimated BPM (approximate, from the demo analyzer). */
  bpm?: number;
  charts: Partial<Record<InstrumentId, InstrumentChart>>;
  /** Which engine produced this beatmap. */
  source: "demo-local-analysis" | "server-stem-separation";
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Judgement & scoring
// ---------------------------------------------------------------------------

export type Judgement = "PERFECT" | "GREAT" | "GOOD" | "MISS";

/** Whether a non-perfect hit was before or after the note time. */
export type TimingDirection = "EARLY" | "LATE" | null;

export interface JudgementResult {
  judgement: Judgement;
  direction: TimingDirection;
  /** Signed offset in milliseconds (negative = early). */
  deltaMs: number;
  scoreGained: number;
}

export interface JudgementCounts {
  PERFECT: number;
  GREAT: number;
  GOOD: number;
  MISS: number;
}

export type Rank = "S" | "A" | "B" | "C" | "D";

export interface GameResult {
  score: number;
  maxCombo: number;
  /** 0..100 weighted accuracy. */
  accuracy: number;
  counts: JudgementCounts;
  totalNotes: number;
  rank: Rank;
  instrument: InstrumentId;
  songTitle: string;
}

// ---------------------------------------------------------------------------
// Session options (solo)
// ---------------------------------------------------------------------------

export type VocalsMode = "on" | "off";
export type DifficultyLevel =
  | "stars_1"
  | "stars_2"
  | "stars_3"
  | "stars_4"
  | "stars_5"
  | "stars_6"
  | "stars_7"
  | "stars_8"
  | "stars_9"
  | "stars_10";
export type GameBackground = "dusk" | "midnight" | "aurora" | "minimal" | "custom";
export type KeyPalette = "auto" | "pink" | "blue" | "green" | "gold";

export interface SoloOptions {
  /** Play alone or with simulated multiplayer rivals. */
  withBots: boolean;
  /** "off" applies an approximate vocal-removal filter to the played fragments. */
  vocals: VocalsMode;
  /**
   * 0..1 volume of the "ghost" backing track. Core design: the song does
   * NOT auto-play — the player rebuilds it hit by hit. This is an optional
   * quiet guide, 0 (silent) by default.
   */
  musicVolume: number;
  /** 0..1 volume of the real song fragments played on each hit. */
  instrumentVolume: number;
  /** Manual keyboard latency compensation in ms (added to hit times). */
  latencyOffsetMs: number;
  /** Note fall speed multiplier (0.5 slow → 2 fast). */
  noteSpeed: number;
  /** Filters the generated chart density. */
  difficulty: DifficultyLevel;
  /** Visual background used during gameplay. */
  gameBackground: GameBackground;
  /** Optional object URL for a local image used as the gameplay background. */
  customBackgroundUrl: string | null;
  /** Simple color preset for notes, lanes and hit buttons. */
  keyPalette: KeyPalette;
}

export const DEFAULT_SOLO_OPTIONS: SoloOptions = {
  withBots: false,
  vocals: "on",
  musicVolume: 0.8,
  instrumentVolume: 0,
  latencyOffsetMs: 0,
  noteSpeed: 2,
  difficulty: "stars_2",
  gameBackground: "dusk",
  customBackgroundUrl: null,
  keyPalette: "auto",
};

// ---------------------------------------------------------------------------
// Song metadata (analysis result of an uploaded file)
// ---------------------------------------------------------------------------

export interface SongMeta {
  id: string;
  title: string;
  fileName: string;
  /** Bytes. */
  fileSize: number;
  /** Seconds. */
  duration: number;
  sampleRate: number;
}

export type AnalysisPhase =
  | "idle"
  | "decoding"
  | "analyzing"
  | "building-charts"
  | "done"
  | "error";
