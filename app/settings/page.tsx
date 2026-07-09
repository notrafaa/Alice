"use client";

import PageShell from "@/components/ui/PageShell";
import SoloOptionsPanel from "@/components/game/SoloOptionsPanel";
import { INSTRUMENT_LIST } from "@/lib/game/instruments";
import { useSessionStore } from "@/lib/game/store";

/**
 * /settings — edits the same session options used by the solo flow
 * (they are shared via the Zustand store, so a change here applies to the
 * next game). Also documents the AZERTY key mapping per layout.
 */
export default function SettingsPage() {
  const { options, setOptions } = useSessionStore();

  return (
    <PageShell
      title="Paramètres"
      subtitle="Ces réglages s'appliquent à ta prochaine partie. Ils sont aussi modifiables dans le flow solo."
    >
      <div className="flex flex-col gap-10 pb-16">
        <SoloOptionsPanel options={options} onChange={setOptions} />

        <section>
          <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-[0.2em] text-white">
            Touches (clavier AZERTY)
          </h2>
          <div className="glass-panel divide-y divide-white/5 px-6">
            {INSTRUMENT_LIST.map((inst) => (
              <div key={inst.id} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{inst.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{inst.name}</p>
                    <p className="text-xs text-slate-500">{inst.lanes} pistes</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {inst.keyLabels.map((k) => (
                    <kbd
                      key={k}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border bg-abyss/60 font-display text-sm font-bold text-white"
                      style={{ borderColor: `${inst.color}66` }}
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Sur AZERTY, la 4e touche du mode 4K est bien la{" "}
            <span className="text-slate-300">virgule ( , )</span> — la touche à droite de N.
            Le remapping personnalisé arrivera avec les profils joueurs (Supabase).
          </p>
        </section>
      </div>
    </PageShell>
  );
}
