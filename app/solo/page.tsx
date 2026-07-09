"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import PageShell from "@/components/ui/PageShell";
import UploadZone from "@/components/audio/UploadZone";
import AnalysisProgress from "@/components/audio/AnalysisProgress";
import InstrumentSelect from "@/components/game/InstrumentSelect";
import SoloOptionsPanel from "@/components/game/SoloOptionsPanel";
import { demoLocalAudioEngine } from "@/lib/audio/demoLocalAudioEngine";
import { exportBeatmapJson } from "@/lib/game/chart";
import { INSTRUMENTS } from "@/lib/game/instruments";
import { useSessionStore } from "@/lib/game/store";
import type { AnalysisPhase } from "@/types";

function StepHeader({ n, title, done }: { n: number; title: string; done: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full border font-display text-sm font-bold ${
          done
            ? "border-neon-green/50 bg-neon-green/15 text-neon-green"
            : "border-neon-blue/50 bg-neon-blue/10 text-neon-blue"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <h2 className="font-display text-lg font-bold uppercase tracking-[0.2em] text-white">
        {title}
      </h2>
    </div>
  );
}

/**
 * Solo flow (steps 2→5 of the game flow):
 * upload → local analysis → 2K/4K select → options → /game.
 *
 * The analyzer always builds dense charts; the difficulty option thins
 * them at game time (lib/game/chart.ts), so changing difficulty here is
 * instant and never re-runs the analysis.
 */
export default function SoloPage() {
  const router = useRouter();
  const {
    song,
    beatmap,
    analysisPhase,
    analysisProgress,
    analysisError,
    instrument,
    options,
    setSong,
    setBeatmap,
    setAnalysis,
    setInstrument,
    setOptions,
    resetSong,
  } = useSessionStore();

  const [uploaded, setUploaded] = useState<{ name: string; size: number } | null>(
    song ? { name: song.fileName, size: song.fileSize } : null
  );

  const analyzing = analysisPhase !== "idle" && analysisPhase !== "done" && analysisPhase !== "error";
  const ready = analysisPhase === "done" && beatmap !== null;

  const handleFile = useCallback(
    async (file: File) => {
      setUploaded({ name: file.name, size: file.size });
      setAnalysis("decoding", 0.02);
      try {
        // Always analyze at max density; difficulty is a game-time filter.
        const { meta, buffer, beatmap: map } = await demoLocalAudioEngine.analyze(
          file,
          "stars_10",
          (phase, progress) => setAnalysis(phase as AnalysisPhase, progress)
        );
        setSong(meta, buffer);
        setBeatmap(map);
        setAnalysis("done", 1);
      } catch (err) {
        console.error(err);
        setAnalysis(
          "error",
          0,
          "Impossible de décoder ce fichier. Essaie un autre .mp3 ou .wav."
        );
      }
    },
    [setAnalysis, setBeatmap, setSong]
  );

  const downloadBeatmap = useCallback(() => {
    if (!beatmap) return;
    const blob = new Blob([exportBeatmapJson(beatmap)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${beatmap.songId}-beatmap.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [beatmap]);

  const canStart = ready && instrument !== null;

  return (
    <PageShell
      title="Mode Solo"
      subtitle="Uploade un morceau : Alice génère une partition 2K ou 4K. En jeu, la musique joue en continu; tes touches servent au score, aux effets visuels et à éviter une série de misses."
    >
      <div className="flex flex-col gap-10 pb-24">
        {/* Step 1 — Upload */}
        <section>
          <StepHeader n={1} title="Ta musique" done={ready} />
          {!uploaded ? (
            <UploadZone onFile={handleFile} disabled={analyzing} />
          ) : (
            <div className="flex flex-col gap-3">
              <AnalysisProgress
                song={song}
                fileName={uploaded.name}
                fileSize={uploaded.size}
                phase={analysisPhase}
                progress={analysisProgress}
                error={analysisError}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetSong();
                    setUploaded(null);
                  }}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all hover:border-white/25 hover:text-white"
                >
                  ↺ Changer de musique
                </button>
                {ready && (
                  <button
                    type="button"
                    onClick={downloadBeatmap}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all hover:border-white/25 hover:text-white"
                    title="Format d'échange documenté dans docs/ROBLOX_PORT_PLAN.md"
                  >
                    ⤓ Exporter la beatmap (JSON)
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Step 2 — Instrument */}
        <AnimatePresence>
          {ready && (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <StepHeader n={2} title="Ton mode" done={instrument !== null} />
              <InstrumentSelect
                beatmap={beatmap}
                selected={instrument}
                onSelect={setInstrument}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 3 — Options */}
        <AnimatePresence>
          {ready && instrument && (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <StepHeader n={3} title="Options" done={false} />
              <SoloOptionsPanel options={options} onChange={setOptions} />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Start bar */}
        <AnimatePresence>
          {canStart && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-abyss/80 backdrop-blur-lg"
            >
              <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {song?.title} · Alice {INSTRUMENTS[instrument!].name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Touches : {INSTRUMENTS[instrument!].keyLabels.join(" · ")}
                    {options.withBots ? " — multijoueur simulé activé" : ""}
                  </p>
                </div>
                <motion.button
                  type="button"
                  onClick={() => router.push("/game")}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-neon-pink via-neon-violet to-neon-blue px-8 py-3 font-display text-sm font-black uppercase tracking-[0.25em] text-white shadow-neon-violet transition-shadow hover:shadow-neon-pink"
                >
                  Commencer ▶
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
