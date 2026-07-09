import type { InstrumentDef, InstrumentId } from "@/types";

/** The only playable layouts: no instruments, just 2K or 4K. */
export const INSTRUMENTS: Record<InstrumentId, InstrumentDef> = {
  keys_2: {
    id: "keys_2",
    name: "2K",
    icon: "2K",
    lanes: 2,
    keys: ["f", "j"],
    keyLabels: ["F", "J"],
    color: "#ff5c8a",
    colorSoft: "#ffa3c0",
    band: { low: 60, high: 6000 },
    minPresence: 0,
    minNotesPerSec: 0.25,
    baseDifficulty: 2,
    description: "Deux grosses touches, beaucoup de flow, parfait pour entrer dans Alice.",
  },
  keys_4: {
    id: "keys_4",
    name: "4K",
    icon: "4K",
    lanes: 4,
    keys: ["x", "c", "n", ","],
    keyLabels: ["X", "C", "N", ","],
    color: "#8ab6ff",
    colorSoft: "#c5daff",
    band: { low: 40, high: 8000 },
    minPresence: 0,
    minNotesPerSec: 0.45,
    baseDifficulty: 3,
    description: "Quatre touches, plus d'enchainements, plus de longues tenues.",
  },
};

export const INSTRUMENT_LIST: InstrumentDef[] = [
  INSTRUMENTS.keys_2,
  INSTRUMENTS.keys_4,
];

/** Maps a `KeyboardEvent.key` (lowercased) to a lane index, or -1. */
export function keyToLane(instrument: InstrumentDef, key: string): number {
  return instrument.keys.indexOf(key.toLowerCase());
}
