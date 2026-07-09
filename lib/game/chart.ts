import type { Beatmap, InstrumentChart, Note, SoloOptions } from "@/types";

/**
 * Chart utilities shared by the setup flow and the gameplay page.
 *
 * The analyzer always generates dense (10-star) charts; difficulty is
 * applied here as a cheap post-filter so the player can change it in the
 * options without re-running the (expensive) audio analysis.
 */

const DIFFICULTY_FILTER: Record<
  SoloOptions["difficulty"],
  { minGapSec: number; minStrength: number; extraSteps: number; minExtraGapSec: number }
> = {
  stars_1: { minGapSec: 0.42, minStrength: 0.3, extraSteps: 0, minExtraGapSec: 0 },
  stars_2: { minGapSec: 0.24, minStrength: 0.16, extraSteps: 0, minExtraGapSec: 0 },
  stars_3: { minGapSec: 0.15, minStrength: 0.08, extraSteps: 0, minExtraGapSec: 0 },
  stars_4: { minGapSec: 0.08, minStrength: 0.04, extraSteps: 0, minExtraGapSec: 0 },
  stars_5: { minGapSec: 0, minStrength: 0, extraSteps: 0, minExtraGapSec: 0 },
  stars_6: { minGapSec: 0, minStrength: 0, extraSteps: 1, minExtraGapSec: 0.44 },
  stars_7: { minGapSec: 0, minStrength: 0, extraSteps: 1, minExtraGapSec: 0.32 },
  stars_8: { minGapSec: 0, minStrength: 0, extraSteps: 2, minExtraGapSec: 0.46 },
  stars_9: { minGapSec: 0, minStrength: 0, extraSteps: 2, minExtraGapSec: 0.34 },
  stars_10: { minGapSec: 0, minStrength: 0, extraSteps: 3, minExtraGapSec: 0.44 },
};

/** Returns a copy of the chart thinned to the requested difficulty. */
export function applyDifficulty(
  chart: InstrumentChart,
  difficulty: SoloOptions["difficulty"]
): InstrumentChart {
  const { minGapSec, minStrength, extraSteps, minExtraGapSec } = DIFFICULTY_FILTER[difficulty];
  const notes: Note[] = [];
  let lastTime = -Infinity;
  for (const n of chart.notes) {
    if ((n.strength ?? 1) < minStrength && n.time - lastTime < minGapSec * 2) continue;
    if (n.time - lastTime < minGapSec) continue;
    notes.push({ ...n, hitState: "pending" });
    lastTime = n.time;
  }
  if (extraSteps === 0) return { ...chart, notes };

  const dense: Note[] = [];
  for (let i = 0; i < notes.length; i++) {
    const current = notes[i];
    const next = notes[i + 1];
    dense.push(current);
    if (!next) continue;

    const gap = next.time - current.time;
    if (gap < minExtraGapSec) continue;

    for (let step = 1; step <= extraSteps; step++) {
      const time = current.time + (gap * step) / (extraSteps + 1);
      if (time <= current.time + 0.08 || time >= next.time - 0.08) continue;
      dense.push({
        id: `${current.id}-extra-${step}`,
        time,
        lane: (current.lane + step + i) % chart.lanes,
        instrument: current.instrument,
        hitState: "pending",
        strength: Math.min(1, (current.strength ?? 0.7) * 0.85 + 0.12),
      });
    }
  }
  dense.sort((a, b) => a.time - b.time);
  return { ...chart, notes: dense };
}

/**
 * Serialize a beatmap to the exportable JSON interchange format
 * (documented in docs/ROBLOX_PORT_PLAN.md). Strips runtime hit state.
 */
export function exportBeatmapJson(beatmap: Beatmap): string {
  const clean: Beatmap = {
    ...beatmap,
    charts: Object.fromEntries(
      Object.entries(beatmap.charts).map(([id, chart]) => [
        id,
        {
          ...chart!,
          notes: chart!.notes.map(({ id: nid, time, lane, instrument, duration, strength }) => ({
            id: nid,
            time: Number(time.toFixed(3)),
            lane,
            instrument,
            hitState: "pending" as const,
            ...(duration !== undefined ? { duration } : {}),
            ...(strength !== undefined ? { strength: Number(strength.toFixed(2)) } : {}),
          })),
        },
      ])
    ),
  };
  return JSON.stringify(clean, null, 2);
}
