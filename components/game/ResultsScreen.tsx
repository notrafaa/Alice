"use client";

import { motion } from "framer-motion";
import type { GameResult, Judgement } from "@/types";
import { INSTRUMENTS } from "@/lib/game/instruments";

const RANK_COLORS: Record<GameResult["rank"], string> = {
  S: "#ffd166",
  A: "#7ee8a2",
  B: "#8ab6ff",
  C: "#a78bfa",
  D: "#ff5c7a",
};

const JUDGEMENT_ROWS: { key: Judgement; label: string; color: string }[] = [
  { key: "PERFECT", label: "Perfect", color: "#ffd166" },
  { key: "GREAT", label: "Great", color: "#8ab6ff" },
  { key: "GOOD", label: "Good", color: "#a78bfa" },
  { key: "MISS", label: "Miss", color: "#ff5c7a" },
];

/** End-of-song results: rank, score, accuracy, judgement breakdown, actions. */
export default function ResultsScreen({
  result,
  onReplay,
  onChangeInstrument,
  onMenu,
}: {
  result: GameResult;
  onReplay: () => void;
  onChangeInstrument: () => void;
  onMenu: () => void;
}) {
  const rankColor = RANK_COLORS[result.rank];
  const instrument = INSTRUMENTS[result.instrument];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-abyss px-6 py-12">
      {/* Rank-tinted ambient glow over the dusk sky */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-[#130d30] via-[#241645] to-[#42204e]" />
        <div
          className="absolute left-1/2 top-1/3 h-[55vmax] w-[55vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.11] blur-[140px]"
          style={{ backgroundColor: rankColor }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <p className="text-center text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">
          {result.songTitle} · {instrument.icon} {instrument.name}
        </p>

        {/* Rank */}
        <motion.div
          initial={{ scale: 2.4, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 120, damping: 12 }}
          className="mt-6 text-center"
        >
          <span
            className="font-display text-[9rem] font-black leading-none"
            style={{ color: rankColor, textShadow: `0 0 60px ${rankColor}88` }}
          >
            {result.rank}
          </span>
        </motion.div>

        {/* Score + stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 grid grid-cols-3 gap-4 text-center"
        >
          <div className="glass-panel p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Score</p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-white">
              {result.score.toLocaleString("fr-FR")}
            </p>
          </div>
          <div className="glass-panel p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Précision
            </p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-neon-blue">
              {result.accuracy.toFixed(1)}%
            </p>
          </div>
          <div className="glass-panel p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Combo max
            </p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-neon-gold">
              ×{result.maxCombo}
            </p>
          </div>
        </motion.div>

        {/* Judgement breakdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="glass-panel mt-4 p-5"
        >
          {JUDGEMENT_ROWS.map((row, i) => {
            const count = result.counts[row.key];
            const pct = result.totalNotes > 0 ? (count / result.totalNotes) * 100 : 0;
            return (
              <div key={row.key} className="flex items-center gap-4 py-1.5">
                <span
                  className="w-20 text-xs font-bold uppercase tracking-widest"
                  style={{ color: row.color }}
                >
                  {row.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 1 + i * 0.12, duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                </div>
                <span className="w-12 text-right font-display text-sm font-bold tabular-nums text-white">
                  {count}
                </span>
              </div>
            );
          })}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <motion.button
            type="button"
            onClick={onReplay}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl bg-gradient-to-r from-neon-pink via-neon-violet to-neon-blue px-8 py-3 font-display text-sm font-black uppercase tracking-[0.2em] text-white shadow-neon-violet"
          >
            ↺ Rejouer
          </motion.button>
          <motion.button
            type="button"
            onClick={onChangeInstrument}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border border-white/15 bg-white/[0.04] px-8 py-3 font-display text-sm font-bold uppercase tracking-[0.2em] text-slate-200 hover:border-white/35"
          >
            Changer de mode
          </motion.button>
          <motion.button
            type="button"
            onClick={onMenu}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border border-white/15 bg-white/[0.04] px-8 py-3 font-display text-sm font-bold uppercase tracking-[0.2em] text-slate-200 hover:border-white/35"
          >
            Menu
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
