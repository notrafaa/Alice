import type {
  GameResult,
  InstrumentId,
  Judgement,
  JudgementCounts,
  JudgementResult,
  Rank,
} from "@/types";

/**
 * Timing windows (milliseconds, symmetric around the note time).
 * A press further than GOOD from any pending note is ignored (no punish),
 * a note that scrolls past `MISS_AFTER_MS` late becomes a MISS.
 *
 * These constants are engine-agnostic and are the reference values for the
 * Roblox port (docs/ROBLOX_PORT_PLAN.md).
 */
export const TIMING_WINDOWS_MS = {
  PERFECT: 70,
  GREAT: 130,
  GOOD: 210,
} as const;

/** A pending note older than this (ms) is judged MISS. */
export const MISS_AFTER_MS = 260;

export const JUDGEMENT_SCORES: Record<Judgement, number> = {
  PERFECT: 100,
  GREAT: 70,
  GOOD: 40,
  MISS: 0,
};

/** Accuracy weight of each judgement (PERFECT = 100%). */
export const JUDGEMENT_ACCURACY_WEIGHT: Record<Judgement, number> = {
  PERFECT: 1,
  GREAT: 0.7,
  GOOD: 0.4,
  MISS: 0,
};

/** Combo bonus: +1% score per combo step, capped at +50%. */
export function comboMultiplier(combo: number): number {
  return 1 + Math.min(combo, 50) * 0.01;
}

/**
 * Judge a key press against a note.
 * @param deltaMs signed press offset in ms (press time - note time;
 *                negative = early, positive = late).
 * @param combo   current combo BEFORE this hit.
 * @returns a JudgementResult, or null if the press is outside every
 *          window (the press should then be ignored).
 */
export function judgeHit(deltaMs: number, combo: number): JudgementResult | null {
  const abs = Math.abs(deltaMs);
  let judgement: Judgement;
  if (abs <= TIMING_WINDOWS_MS.PERFECT) judgement = "PERFECT";
  else if (abs <= TIMING_WINDOWS_MS.GREAT) judgement = "GREAT";
  else if (abs <= TIMING_WINDOWS_MS.GOOD) judgement = "GOOD";
  else return null;

  const direction =
    judgement === "PERFECT" ? null : deltaMs < 0 ? "EARLY" : "LATE";

  return {
    judgement,
    direction,
    deltaMs,
    scoreGained: Math.round(JUDGEMENT_SCORES[judgement] * comboMultiplier(combo)),
  };
}

export function computeAccuracy(counts: JudgementCounts): number {
  const total = counts.PERFECT + counts.GREAT + counts.GOOD + counts.MISS;
  if (total === 0) return 100;
  const weighted =
    counts.PERFECT * JUDGEMENT_ACCURACY_WEIGHT.PERFECT +
    counts.GREAT * JUDGEMENT_ACCURACY_WEIGHT.GREAT +
    counts.GOOD * JUDGEMENT_ACCURACY_WEIGHT.GOOD;
  return (weighted / total) * 100;
}

export function computeRank(accuracy: number): Rank {
  if (accuracy >= 95) return "S";
  if (accuracy >= 88) return "A";
  if (accuracy >= 75) return "B";
  if (accuracy >= 60) return "C";
  return "D";
}

export function buildResult(params: {
  score: number;
  maxCombo: number;
  counts: JudgementCounts;
  totalNotes: number;
  instrument: InstrumentId;
  songTitle: string;
}): GameResult {
  const accuracy = computeAccuracy(params.counts);
  return {
    ...params,
    accuracy,
    rank: computeRank(accuracy),
  };
}

export const EMPTY_COUNTS: JudgementCounts = {
  PERFECT: 0,
  GREAT: 0,
  GOOD: 0,
  MISS: 0,
};
