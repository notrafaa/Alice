"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { DifficultyLevel, SoloOptions } from "@/types";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <div className="flex items-center gap-3 sm:w-64">{children}</div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
  labels = ["OFF", "ON"],
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  labels?: [string, string] | string[];
}) {
  return (
    <div className="flex w-full gap-1 rounded-lg border border-white/10 bg-abyss/50 p-1">
      {[false, true].map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all ${
            value === v
              ? "bg-neon-blue/20 text-neon-blue shadow-neon-blue"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {labels[v ? 1 : 0]}
        </button>
      ))}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex w-full gap-1 rounded-lg border border-white/10 bg-abyss/50 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
            value === opt.value
              ? "bg-neon-violet/25 text-white"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const BACKGROUNDS: { value: NonNullable<SoloOptions["gameBackground"]>; label: string }[] = [
  { value: "dusk", label: "Rose" },
  { value: "midnight", label: "Nuit" },
  { value: "aurora", label: "Neon" },
  { value: "minimal", label: "Simple" },
  { value: "custom", label: "Image" },
];

const PALETTES: { value: NonNullable<SoloOptions["keyPalette"]>; label: string; color: string }[] = [
  { value: "auto", label: "Auto", color: "linear-gradient(135deg,#ff5c8a,#8ab6ff)" },
  { value: "pink", label: "Rose", color: "#ff5c8a" },
  { value: "blue", label: "Bleu", color: "#8ab6ff" },
  { value: "green", label: "Vert", color: "#7ee8a2" },
  { value: "gold", label: "Or", color: "#ffd166" },
];

function PalettePicker({
  value,
  onChange,
}: {
  value: SoloOptions["keyPalette"];
  onChange: (v: SoloOptions["keyPalette"]) => void;
}) {
  return (
    <div className="flex w-full gap-2">
      {PALETTES.map((palette) => (
        <button
          key={palette.value}
          type="button"
          onClick={() => onChange(palette.value)}
          className={`flex h-10 flex-1 items-center justify-center rounded-lg border text-[10px] font-black uppercase tracking-[0.12em] transition-all ${
            value === palette.value
              ? "border-white/45 text-white shadow-neon-violet"
              : "border-white/10 text-slate-500 hover:border-white/25 hover:text-slate-300"
          }`}
          style={{ background: palette.color }}
          title={palette.label}
        >
          {palette.value === "auto" ? "A" : ""}
        </button>
      ))}
    </div>
  );
}

const DIFFICULTIES: { value: DifficultyLevel; label: string }[] = [
  { value: "stars_1", label: "1" },
  { value: "stars_2", label: "2" },
  { value: "stars_3", label: "3" },
  { value: "stars_4", label: "4" },
  { value: "stars_5", label: "5" },
  { value: "stars_6", label: "6" },
  { value: "stars_7", label: "7" },
  { value: "stars_8", label: "8" },
  { value: "stars_9", label: "9" },
  { value: "stars_10", label: "10" },
];

function DifficultyPicker({
  value,
  onChange,
}: {
  value: DifficultyLevel;
  onChange: (v: DifficultyLevel) => void;
}) {
  return (
    <div className="grid w-full grid-cols-5 gap-1.5">
      {DIFFICULTIES.map((difficulty) => {
        const selected = value === difficulty.value;
        const level = Number(difficulty.label);
        return (
          <button
            key={difficulty.value}
            type="button"
            onClick={() => onChange(difficulty.value)}
            className={`h-10 rounded-lg border font-display text-sm font-black transition-all ${
              selected
                ? "border-neon-gold/70 bg-neon-gold/20 text-white shadow-neon-violet"
                : level >= 8
                  ? "border-neon-pink/25 bg-neon-pink/[0.07] text-neon-pink hover:border-neon-pink/50"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/25 hover:text-white"
            }`}
            title={`${difficulty.label} etoiles`}
          >
            {difficulty.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Pre-game options panel (step 5 of the solo flow).
 * Every option maps 1:1 to SoloOptions in types/index.ts.
 */
export default function SoloOptionsPanel({
  options,
  onChange,
}: {
  options: SoloOptions;
  onChange: (patch: Partial<SoloOptions>) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel px-6 py-2"
    >
      <Row label="Mode" hint="Course locale avec des rivaux simulés au score visible">
        <Toggle
          value={options.withBots}
          onChange={(v) => onChange({ withBots: v })}
          labels={["Solo", "Multijoueur"]}
        />
      </Row>

      <Row label="Difficulté" hint="2 étoiles = normal rapide">
        <DifficultyPicker
          value={options.difficulty}
          onChange={(v) => onChange({ difficulty: v })}
        />
      </Row>

      <Row label="Fond de partie" hint="Change seulement le background pendant le gameplay">
        <div className="flex w-full flex-col gap-2">
          <Segmented
            value={options.gameBackground ?? "dusk"}
            options={BACKGROUNDS}
            onChange={(v) => onChange({ gameBackground: v })}
          />
          <label className="flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 transition-all hover:border-white/25 hover:text-white">
            Choisir PNG/JPG
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                onChange({ gameBackground: "custom", customBackgroundUrl: url });
              }}
            />
          </label>
        </div>
      </Row>

      <Row label="Couleur des touches" hint="Un clic, toutes les notes suivent">
        <PalettePicker
          value={options.keyPalette ?? "auto"}
          onChange={(v) => onChange({ keyPalette: v })}
        />
      </Row>

      <div className="py-4">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-300 transition-all hover:border-white/25 hover:text-white"
        >
          {advancedOpen ? "Fermer le mode avancé" : "Ouvrir le mode avancé"}
        </button>
      </div>

      {advancedOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden border-t border-white/10"
        >
      <Row label="Volume musique" hint="La musique joue en continu et ne dépend jamais des touches">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={options.musicVolume}
          onChange={(e) => onChange({ musicVolume: Number(e.target.value) })}
        />
        <span className="w-10 text-right text-xs font-bold text-slate-300">
          {Math.round(options.musicVolume * 100)}%
        </span>
      </Row>

      <Row label="Latence clavier" hint="Compense le retard de ton clavier/écran">
        <input
          type="range"
          min={-100}
          max={100}
          step={5}
          value={options.latencyOffsetMs}
          onChange={(e) => onChange({ latencyOffsetMs: Number(e.target.value) })}
        />
        <span className="w-14 text-right text-xs font-bold text-slate-300">
          {options.latencyOffsetMs > 0 ? "+" : ""}
          {options.latencyOffsetMs} ms
        </span>
      </Row>

      <Row label="Vitesse des notes" hint="×2 est le rythme normal d'Alice">
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={options.noteSpeed}
          onChange={(e) => onChange({ noteSpeed: Number(e.target.value) })}
        />
        <span className="w-10 text-right text-xs font-bold text-slate-300">
          ×{options.noteSpeed.toFixed(1)}
        </span>
      </Row>
        </motion.div>
      )}
    </motion.div>
  );
}
