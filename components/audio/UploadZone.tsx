"use client";

import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";

const ACCEPTED_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave"];
const ACCEPTED_EXTENSIONS = [".mp3", ".wav"];

function isAccepted(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/** Drag & drop / click upload zone for .mp3 / .wav files. */
export default function UploadZone({
  onFile,
  disabled = false,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!isAccepted(file)) {
        setError("Format non supporté. Utilise un fichier .mp3 ou .wav.");
        return;
      }
      setError(null);
      onFile(file);
    },
    [onFile]
  );

  return (
    <div>
      <motion.button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFile(e.dataTransfer.files[0]);
        }}
        whileHover={disabled ? undefined : { scale: 1.01 }}
        whileTap={disabled ? undefined : { scale: 0.99 }}
        className={`relative block w-full overflow-hidden rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-all duration-300 ${
          dragging
            ? "border-neon-blue bg-neon-blue/10 shadow-neon-blue"
            : "border-white/15 bg-white/[0.03] hover:border-neon-blue/60 hover:bg-white/[0.05]"
        } ${disabled ? "cursor-wait opacity-50" : "cursor-pointer"}`}
      >
        {/* Pulsing halo behind the icon */}
        <span className="pointer-events-none absolute left-1/2 top-14 h-32 w-32 -translate-x-1/2 rounded-full bg-neon-blue/15 blur-2xl animate-pulse-glow" />

        <motion.div
          animate={dragging ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }}
          className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-3xl"
        >
          🎵
        </motion.div>
        <p className="font-display text-lg font-bold uppercase tracking-[0.2em] text-white">
          {dragging ? "Lâche le fichier !" : "Dépose ta musique ici"}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Glisse-dépose ou clique pour choisir — <span className="text-neon-blue">.mp3</span> ou{" "}
          <span className="text-neon-blue">.wav</span>
        </p>
      </motion.button>

      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-lg border border-neon-pink/30 bg-neon-pink/10 px-4 py-2 text-sm font-semibold text-neon-pink"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
