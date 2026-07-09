"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/menu/Logo";
import SakuraPetals from "@/components/ui/SakuraPetals";

/**
 * Shared shell for secondary pages (/solo, /settings, /credits):
 * dusk-sky ambient background with light sakura petals, top bar with
 * logo + back link, animated content container.
 */
export default function PageShell({
  title,
  subtitle,
  children,
  backHref = "/",
  backLabel = "Menu",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-[#130d30] via-[#251747] to-[#4a2454]" />
        <div className="absolute inset-x-0 bottom-0 h-[38vh] bg-gradient-to-t from-[#ff6f9c22] to-transparent" />
        <div className="absolute left-[-10%] top-[-15%] h-[50vmax] w-[50vmax] rounded-full bg-neon-violet/10 blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[45vmax] w-[45vmax] rounded-full bg-neon-pink/[0.08] blur-[140px]" />
        <SakuraPetals petalCount={18} starCount={50} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(10,6,24,0.65)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-8">
        <header className="mb-10 flex items-center justify-between">
          <Logo compact />
          <Link
            href={backHref}
            className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold uppercase tracking-widest text-slate-300 transition-all hover:border-white/25 hover:text-white"
          >
            <span className="transition-transform group-hover:-translate-x-1">‹</span>
            {backLabel}
          </Link>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1 className="font-display text-3xl font-black uppercase tracking-[0.15em] text-white neon-text md:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-base text-slate-400">{subtitle}</p>
          )}
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
