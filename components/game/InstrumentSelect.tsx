"use client";

import { motion } from "framer-motion";
import type { Beatmap, InstrumentId } from "@/types";
import { INSTRUMENT_LIST } from "@/lib/game/instruments";

function DifficultyDots({ level, color }: { level: number; color: string }) {
  return (
    <span className="flex gap-1" title={`${level} étoiles`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="text-sm"
          style={{ color: i <= level ? color : "rgba(255,255,255,0.16)" }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

/**
 * Layout picker: Alice is only 2K or 4K.
 */
export default function InstrumentSelect({
  beatmap,
  selected,
  onSelect,
}: {
  beatmap: Beatmap | null;
  selected: InstrumentId | null;
  onSelect: (id: InstrumentId) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {INSTRUMENT_LIST.map((inst, i) => {
        const chart = beatmap?.charts[inst.id];
        const difficulty = chart?.difficulty ?? inst.baseDifficulty;
        const isSelected = selected === inst.id;
        const unavailable = chart !== undefined && !chart.available;

        return (
          <motion.button
            key={inst.id}
            type="button"
            disabled={unavailable}
            onClick={() => !unavailable && onSelect(inst.id)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            whileHover={unavailable ? undefined : { y: -4, scale: 1.02 }}
            whileTap={unavailable ? undefined : { scale: 0.98 }}
            className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
              unavailable
                ? "cursor-not-allowed border-white/5 bg-white/[0.015] opacity-45 saturate-50"
                : isSelected
                  ? "border-white/40 bg-white/[0.08]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
            }`}
            style={isSelected ? { boxShadow: `0 0 28px ${inst.color}55` } : undefined}
          >
            {/* Accent halo */}
            <span
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
              style={{ backgroundColor: inst.color }}
            />

            <div className="flex items-start justify-between">
              <span className="text-4xl">{inst.icon}</span>
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-abyss"
                  style={{ backgroundColor: inst.color }}
                >
                  ✓
                </motion.span>
              )}
              {unavailable && (
                <span className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Trop vide
                </span>
              )}
            </div>

            <h3 className="mt-3 font-display text-lg font-bold text-white">{inst.name}</h3>
            <p className="mt-1 min-h-[2.5rem] text-xs leading-relaxed text-slate-400">
              {unavailable
                ? "L'analyse n'a pas trouvé assez de notes jouables pour ce layout."
                : inst.description}
            </p>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-1.5">
                {inst.keyLabels.map((k, keyIndex) => (
                  <kbd
                    key={`${k}-${keyIndex}`}
                    className="flex h-10 w-12 items-center justify-center rounded-lg border border-white/20 bg-abyss/60 font-display text-sm font-bold text-white shadow-[inset_0_-8px_18px_rgba(255,255,255,0.04)]"
                    style={{ borderColor: `${inst.color}66` }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {inst.lanes} pistes
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
              <DifficultyDots level={difficulty} color={inst.color} />
              <span className="text-xs text-slate-500">
                {chart ? `${chart.notes.length} notes` : "—"}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
