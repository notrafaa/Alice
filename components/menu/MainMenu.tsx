"use client";

import { motion } from "framer-motion";
import Logo from "./Logo";
import MenuButton from "./MenuButton";

/**
 * Title screen, anime-opening style: logo above a vertical menu on the
 * left, hero copy over a rising sakura sun on the right, vertical
 * Japanese caption on the edge.
 */
export default function MainMenu() {
  return (
    <div className="relative z-10 flex min-h-screen">
      {/* Left column — logo + vertical menu */}
      <aside className="flex w-full max-w-sm flex-col justify-between px-8 py-10 md:px-12">
        <Logo />

        <nav className="flex flex-col gap-3">
          <MenuButton
            index={0}
            href="/solo"
            icon="▶"
            label="Jouer"
            jp="プレイ"
            sublabel="Lance une partie rapide"
            accent="pink"
          />
          <MenuButton
            index={1}
            href="/solo"
            icon="🎧"
            label="Solo"
            jp="ソロ"
            sublabel="Reconstruis ta musique"
            accent="blue"
          />
          <MenuButton
            index={2}
            icon="VS"
            label="Duel"
            jp="マルチ"
            sublabel="Verrouillé"
            disabled
            badge="Lock"
            accent="violet"
          />
          <MenuButton
            index={3}
            href="/settings"
            icon="⚙"
            label="Paramètres"
            jp="設定"
            sublabel="Audio, latence, vitesse"
            accent="neutral"
          />
          <MenuButton
            index={4}
            href="/credits"
            icon="✦"
            label="Crédits"
            jp="クレジット"
            sublabel="L'équipe derrière le son"
            accent="neutral"
          />
        </nav>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-xs tracking-widest text-slate-500"
        >
          ALICE v0.3 — 放課後ビルド
        </motion.p>
      </aside>

      {/* Right — hero over a sakura sun */}
      <main className="hidden flex-1 items-center justify-center px-12 md:flex">
        <div className="floating-copy relative grid w-[min(34rem,100%)] justify-items-center text-center">
          {/* Rising sun disc behind the title (anime poster motif) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 1.1, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-[#ff6fa5] via-[#e84a7f] to-[#a73468] opacity-45 blur-[2px] shadow-[0_0_120px_rgba(255,111,165,0.4)]"
            aria-hidden
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mb-4 text-center text-sm font-bold uppercase tracking-[0.5em] text-[#ffd1e3]"
          >
            放課後、音楽の時間。
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, x: 24, y: 24 }}
            animate={{ opacity: 1, x: 24, y: 0 }}
            transition={{ delay: 0.55, duration: 0.8 }}
            className="w-full justify-self-center text-center font-display text-6xl font-black leading-tight tracking-tight text-white lg:text-7xl"
            style={{ textShadow: "0 4px 32px rgba(20,10,40,0.8), 0 0 18px rgba(255,111,165,0.35)" }}
          >
            音を、
            <br />
            <span className="bg-gradient-to-r from-[#ffd1e3] via-white to-[#c9b7ff] bg-clip-text text-transparent">
              取り戻せ。
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.8 }}
            className="mt-6 w-full text-center text-lg leading-relaxed text-[#e8ddf5]"
          >
            Ta musique joue en continu. Choisis 2K ou 4K, tiens les longues notes et{" "}
            <span className="font-bold text-white">garde le rythme</span>{" "}
            sans laisser les misses s&apos;enchaîner.
          </motion.p>

          {/* Decorative input ribbon */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 1 }}
            className="mt-12 flex w-full items-end justify-center gap-3"
            aria-hidden
          >
            {["F", "J", "X", "C", "N", ","].map((key, i) => (
              <motion.span
                key={key}
                animate={{ y: [0, -18, 0], scale: [1, 1.12, 1] }}
                transition={{
                  duration: 1.35,
                  repeat: Infinity,
                  delay: i * 0.12,
                  ease: "easeInOut",
                }}
                className="flex h-12 w-14 items-center justify-center rounded-xl border border-white/25 bg-white/[0.08] font-display text-sm font-black text-white shadow-[0_0_26px_rgba(255,111,165,0.25),inset_0_-10px_18px_rgba(255,255,255,0.05)] backdrop-blur"
              >
                {key}
              </motion.span>
            ))}
          </motion.div>
        </div>

        {/* Vertical Japanese caption on the right edge */}
        <motion.p
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 0.55, x: 0 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="jp-vertical absolute right-8 top-1/2 hidden -translate-y-1/2 font-display text-sm font-bold text-[#ffd1e3] lg:block"
          aria-hidden
        >
          アリス・リズムゲーム
        </motion.p>
      </main>
    </div>
  );
}
