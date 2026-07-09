"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/** Game logo — sakura sun disc + 音 kanji, pure CSS/typography. */
export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-block select-none">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="flex items-center gap-3"
      >
        <div className="relative flex h-11 w-11 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-neon-pink to-[#ff4d88] opacity-90 blur-[5px] transition-opacity group-hover:opacity-100" />
          <span className="relative flex h-full w-full items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-[#ff6fa5] to-[#e84a7f] font-display text-xl font-black text-white">
            音
          </span>
        </div>
        {!compact && (
          <div className="leading-none">
            <div className="font-display text-xl font-black tracking-[0.14em] text-white neon-text-pink">
              ALICE
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.4em] text-neon-pink/90">
              リズムリンク
            </div>
          </div>
        )}
      </motion.div>
    </Link>
  );
}
