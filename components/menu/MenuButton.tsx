"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

interface MenuButtonProps {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  /** Japanese caption shown on the right edge of the button. */
  jp?: string;
  sublabel?: string;
  disabled?: boolean;
  badge?: string;
  accent?: "pink" | "blue" | "violet" | "neutral";
  index?: number;
}

const ACCENTS = {
  pink: {
    glow: "group-hover:shadow-neon-pink",
    bar: "bg-neon-pink",
    text: "group-hover:text-neon-pink",
  },
  blue: {
    glow: "group-hover:shadow-neon-blue",
    bar: "bg-neon-blue",
    text: "group-hover:text-neon-blue",
  },
  violet: {
    glow: "group-hover:shadow-neon-violet",
    bar: "bg-neon-violet",
    text: "group-hover:text-neon-violet",
  },
  neutral: {
    glow: "group-hover:shadow-neon-blue",
    bar: "bg-slate-400",
    text: "group-hover:text-white",
  },
} as const;

/**
 * Main-menu entry: animated slide-in, hover glow + accent bar sweep,
 * disabled variant with a "BIENTÔT" style badge.
 */
export default function MenuButton({
  href,
  onClick,
  icon,
  label,
  jp,
  sublabel,
  disabled = false,
  badge,
  accent = "blue",
  index = 0,
}: MenuButtonProps) {
  const a = ACCENTS[accent];

  const inner = (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.08, ease: "easeOut" }}
      whileHover={disabled ? undefined : { x: 6, scale: 1.015 }}
      whileTap={disabled ? undefined : { scale: 0.965, y: 2 }}
      className={`satisfying-button group relative grid min-h-[72px] w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 overflow-hidden rounded-xl border px-5 py-4 transition-all duration-300 ${
        disabled
          ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-55"
          : `border-white/10 bg-white/[0.04] backdrop-blur-sm hover:border-white/25 hover:bg-white/[0.07] ${a.glow}`
      }`}
    >
      {/* Accent bar (left) */}
      <span
        className={`absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 transition-transform duration-300 ${a.bar} ${
          disabled ? "" : "group-hover:scale-y-100"
        }`}
      />
      {/* Shimmer sweep on hover */}
      {!disabled && (
        <span className="shimmer-border pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:animate-shimmer group-hover:opacity-100" />
      )}

      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] font-display text-lg font-black text-white shadow-[inset_0_-10px_20px_rgba(255,255,255,0.05)]" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 text-left">
        <span
          className={`block whitespace-nowrap font-display text-base font-black uppercase tracking-[0.16em] text-slate-100 transition-colors sm:text-lg ${
            disabled ? "text-slate-500" : a.text
          }`}
        >
          {label}
        </span>
        {sublabel && (
          <span className="mt-0.5 block max-w-full truncate text-xs font-semibold leading-snug tracking-wide text-slate-400">
            {sublabel}
          </span>
        )}
      </span>

      <span className="flex min-w-8 items-center justify-end">
        {badge ? (
          <span className="rounded-md border border-neon-gold/40 bg-neon-gold/10 px-1.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-neon-gold">
            {badge}
          </span>
        ) : (
          <span className="text-2xl text-slate-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white">
            ›
          </span>
        )}
      </span>
    </motion.div>
  );

  if (disabled || !href) {
    return (
      <button type="button" disabled={disabled} onClick={onClick} className="block w-full">
        {inner}
      </button>
    );
  }
  return (
    <Link href={href} className="block w-full">
      {inner}
    </Link>
  );
}
