"use client";

import { motion } from "framer-motion";
import type { AnalysisPhase, SongMeta } from "@/types";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1024)} Ko`;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PHASE_LABELS: Record<AnalysisPhase, string> = {
  idle: "En attente",
  decoding: "Décodage audio…",
  analyzing: "Détection des pics et enchainements…",
  "building-charts": "Génération des partitions 2K / 4K…",
  done: "Analyse terminée",
  error: "Erreur d'analyse",
};

/**
 * Post-upload card: file info (name, duration, size) + analysis state.
 * Mentions honestly that the demo analysis is approximate.
 */
export default function AnalysisProgress({
  song,
  fileName,
  fileSize,
  phase,
  progress,
  error,
}: {
  song: SongMeta | null;
  fileName: string;
  fileSize: number;
  phase: AnalysisPhase;
  progress: number;
  error: string | null;
}) {
  const isDone = phase === "done";
  const isError = phase === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6"
    >
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-white">{fileName}</p>
          <p className="mt-1 text-sm text-slate-400">
            {song ? `${formatDuration(song.duration)} · ` : ""}
            {formatBytes(fileSize)}
            {song ? ` · ${Math.round(song.sampleRate / 1000)} kHz` : ""}
          </p>
        </div>
        <div
          className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${
            isDone
              ? "border-neon-green/40 bg-neon-green/10 text-neon-green"
              : isError
                ? "border-neon-pink/40 bg-neon-pink/10 text-neon-pink"
                : "border-neon-blue/40 bg-neon-blue/10 text-neon-blue"
          }`}
        >
          {isDone ? "✓ Prêt" : isError ? "✗ Erreur" : "Analyse…"}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>{error ?? PHASE_LABELS[phase]}</span>
          <span className="font-semibold text-slate-300">{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className={`h-full rounded-full ${
              isError
                ? "bg-neon-pink"
                : "bg-gradient-to-r from-neon-blue via-neon-violet to-neon-pink"
            }`}
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ ease: "easeOut", duration: 0.3 }}
          />
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Démo : l&apos;analyse est locale et approximative. Alice détecte les pics du morceau
        puis fabrique des enchainements 2K / 4K jouables.
      </p>
    </motion.div>
  );
}
