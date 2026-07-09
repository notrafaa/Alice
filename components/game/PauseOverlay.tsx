"use client";

import { motion } from "framer-motion";

/** In-game pause menu: resume / restart / quit. Music is suspended behind it. */
export default function PauseOverlay({
  onResume,
  onRestart,
  onQuit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  const items = [
    { label: "Reprendre", hint: "Échap", onClick: onResume, primary: true },
    { label: "Recommencer", hint: "", onClick: onRestart, primary: false },
    { label: "Quitter", hint: "Retour menu", onClick: onQuit, primary: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-abyss/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        className="glass-panel w-80 p-8 text-center"
      >
        <h2 className="font-display text-2xl font-black uppercase tracking-[0.3em] text-white neon-text">
          Pause
        </h2>
        <div className="mt-8 flex flex-col gap-3">
          {items.map((item) => (
            <motion.button
              key={item.label}
              type="button"
              onClick={item.onClick}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`rounded-xl px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.2em] transition-all ${
                item.primary
                  ? "bg-gradient-to-r from-neon-pink via-neon-violet to-neon-blue text-white shadow-neon-violet"
                  : "border border-white/15 bg-white/[0.04] text-slate-300 hover:border-white/35 hover:text-white"
              }`}
            >
              {item.label}
              {item.hint && (
                <span className="ml-2 text-[10px] font-medium normal-case tracking-normal text-white/50">
                  {item.hint}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
