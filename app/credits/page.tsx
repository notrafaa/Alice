"use client";

import { motion } from "framer-motion";
import PageShell from "@/components/ui/PageShell";

/** Mock credits data for the demo. */
const CREDITS: { section: string; entries: { role: string; name: string }[] }[] = [
  {
    section: "Game Design",
    entries: [
      { role: "Direction créative", name: "notrafaa" },
      { role: "Gameplay & rythme", name: "notrafaa" },
    ],
  },
  {
    section: "Développement",
    entries: [
      { role: "Moteur de jeu web", name: "Next.js · TypeScript · Canvas" },
      { role: "Analyse audio", name: "Web Audio API — DemoLocalAudioEngine" },
      { role: "Animations", name: "Framer Motion" },
    ],
  },
  {
    section: "À venir",
    entries: [
      { role: "Analyse audio avancée", name: "FutureStemSeparationEngine" },
      { role: "Rooms multijoueur temps réel", name: "Supabase Realtime" },
      { role: "Portage", name: "Roblox Edition" },
    ],
  },
  {
    section: "Remerciements",
    entries: [
      { role: "Inspiration", name: "Piano Tiles, osu!mania, Guitar Hero" },
      { role: "Code", name: "Claude Fable 5 et ChatGPT 5.5" },
      { role: "Toi", name: "Pour avoir uploadé ta musique 🎧" },
    ],
  },
];

export default function CreditsPage() {
  return (
    <PageShell title="Crédits" subtitle="Les forces derrière Alice.">
      <div className="mx-auto max-w-2xl pb-16">
        {CREDITS.map((block, bi) => (
          <motion.section
            key={block.section}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + bi * 0.15, duration: 0.5 }}
            className="mb-10"
          >
            <h2 className="mb-4 text-center font-display text-sm font-black uppercase tracking-[0.5em] text-neon-blue">
              {block.section}
            </h2>
            <div className="glass-panel divide-y divide-white/5 px-6">
              {block.entries.map((entry) => (
                <div
                  key={entry.role}
                  className="flex items-center justify-between gap-6 py-3.5"
                >
                  <span className="text-sm text-slate-500">{entry.role}</span>
                  <span className="text-right text-sm font-semibold text-slate-200">
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        ))}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-xs uppercase tracking-[0.4em] text-slate-600"
        >
          Alice — Demo 2026
        </motion.p>
      </div>
    </PageShell>
  );
}
