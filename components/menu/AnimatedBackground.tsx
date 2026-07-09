"use client";

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import SakuraPetals from "@/components/ui/SakuraPetals";

/**
 * Anime "after school at dusk" title-screen background:
 * - dusk sky gradient (indigo night → violet → pink horizon),
 * - full moon with halo, drifting clouds, twinkling stars,
 * - silhouette of a Japanese school + sakura tree + utility pole with
 *   sagging power lines (inline SVG, no external assets),
 * - falling sakura petals (canvas),
 * - mouse-driven 3D parallax across the depth layers.
 */

function SchoolSilhouette() {
  return (
    <svg
      viewBox="0 0 1440 320"
      preserveAspectRatio="xMidYMax slice"
      className="absolute bottom-0 h-[36vh] w-full"
      aria-hidden
    >
      {/* Ground */}
      <rect x="0" y="288" width="1440" height="32" fill="#0a0618" />

      {/* Sakura tree (left): trunk + blobby canopy */}
      <g fill="#0a0618">
        <path d="M96 292 L104 292 L102 236 L118 212 L112 208 L101 226 L98 200 L92 200 L94 230 L78 214 L73 219 L94 240 Z" />
        <circle cx="100" cy="176" r="46" />
        <circle cx="62" cy="196" r="34" />
        <circle cx="140" cy="196" r="36" />
        <circle cx="96" cy="150" r="30" />
      </g>
      {/* A few blossoms catching the light in the canopy */}
      <g fill="#ff8fc0" opacity="0.5">
        <circle cx="76" cy="172" r="3" />
        <circle cx="118" cy="158" r="2.6" />
        <circle cx="138" cy="188" r="2.4" />
        <circle cx="58" cy="204" r="2.2" />
      </g>

      {/* School building */}
      <g fill="#0a0618">
        <rect x="230" y="150" width="360" height="142" />
        {/* Clock tower */}
        <rect x="380" y="84" width="60" height="70" />
        <path d="M374 88 L410 58 L446 88 Z" />
        {/* Rooftop fence */}
        <rect x="230" y="144" width="360" height="8" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <rect key={i} x={238 + i * 43} y="132" width="4" height="14" />
        ))}
      </g>
      {/* Clock face */}
      <circle cx="410" cy="112" r="14" fill="#ffe9c9" opacity="0.9" />
      <line x1="410" y1="112" x2="410" y2="102" stroke="#0a0618" strokeWidth="2.5" />
      <line x1="410" y1="112" x2="417" y2="115" stroke="#0a0618" strokeWidth="2.5" />
      {/* Lit classroom windows */}
      <g fill="#ffd166">
        <rect x="252" y="170" width="22" height="16" opacity="0.85" />
        <rect x="296" y="170" width="22" height="16" opacity="0.35" />
        <rect x="384" y="170" width="22" height="16" opacity="0.7" />
        <rect x="472" y="170" width="22" height="16" opacity="0.25" />
        <rect x="252" y="216" width="22" height="16" opacity="0.3" />
        <rect x="340" y="216" width="22" height="16" opacity="0.8" />
        <rect x="428" y="216" width="22" height="16" opacity="0.4" />
        <rect x="516" y="216" width="22" height="16" opacity="0.9" />
        <rect x="296" y="258" width="22" height="16" opacity="0.5" />
        <rect x="472" y="258" width="22" height="16" opacity="0.65" />
      </g>

      {/* School gate + wall (right of building) */}
      <g fill="#0a0618">
        <rect x="590" y="252" width="240" height="40" />
        <rect x="588" y="236" width="12" height="56" />
        <rect x="820" y="236" width="12" height="56" />
      </g>

      {/* Utility pole with sagging wires (iconic anime shot) */}
      <g stroke="#0a0618" fill="#0a0618">
        <rect x="1052" y="96" width="10" height="196" />
        <rect x="1020" y="112" width="74" height="7" />
        <rect x="1030" y="140" width="54" height="6" />
        <circle cx="1026" cy="110" r="4" />
        <circle cx="1088" cy="110" r="4" />
      </g>
      <path d="M1024 114 Q 720 190 0 158" stroke="#0a0618" strokeWidth="2.5" fill="none" />
      <path d="M1090 114 Q 1280 160 1440 148" stroke="#0a0618" strokeWidth="2.5" fill="none" />
      <path d="M1032 144 Q 760 214 0 190" stroke="#0a0618" strokeWidth="2" fill="none" />

      {/* Distant rooftops (right) */}
      <g fill="#0a0618">
        <rect x="1180" y="216" width="120" height="76" />
        <path d="M1174 218 L1240 186 L1306 218 Z" />
        <rect x="1330" y="240" width="110" height="52" />
      </g>
      <rect x="1216" y="240" width="16" height="12" fill="#ffd166" opacity="0.6" />
    </svg>
  );
}

export default function AnimatedBackground() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 20 });
  const sy = useSpring(my, { stiffness: 50, damping: 20 });

  // Depth layers: further layers move less.
  const skyX = useTransform(sx, (v) => v * -10);
  const skyY = useTransform(sy, (v) => v * -7);
  const midX = useTransform(sx, (v) => v * -24);
  const midY = useTransform(sy, (v) => v * -16);
  const nearX = useTransform(sx, (v) => v * -46);
  const nearY = useTransform(sy, (v) => v * -30);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Dusk sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#120c2e] via-[#2b1a52] to-[#6d2f63]" />
      {/* Horizon glow */}
      <div className="absolute inset-x-0 bottom-0 h-[45vh] bg-gradient-to-t from-[#ff6f9c33] to-transparent" />

      {/* Far layer — stars + moon + clouds */}
      <motion.div style={{ x: skyX, y: skyY }} className="absolute -inset-[6%]">
        <SakuraPetals petalCount={0} starCount={110} />

        {/* Full moon */}
        <div className="absolute right-[14%] top-[12%]">
          <div className="absolute -inset-14 rounded-full bg-[#ffe9c9]/20 blur-3xl" />
          <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-[#fff4e0] to-[#ffd9a8] shadow-[0_0_80px_rgba(255,233,201,0.55)]">
            <div className="absolute left-6 top-9 h-5 w-5 rounded-full bg-[#f3c98b]/50" />
            <div className="absolute left-16 top-16 h-3.5 w-3.5 rounded-full bg-[#f3c98b]/40" />
            <div className="absolute left-10 top-20 h-2.5 w-2.5 rounded-full bg-[#f3c98b]/45" />
          </div>
        </div>

        {/* Drifting clouds */}
        <motion.div
          animate={{ x: [0, 60, 0] }}
          transition={{ duration: 46, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[6%] top-[22%] h-10 w-72 rounded-full bg-[#c9b7ff]/15 blur-xl"
        />
        <motion.div
          animate={{ x: [0, -80, 0] }}
          transition={{ duration: 58, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[8%] top-[34%] h-8 w-96 rounded-full bg-[#ffb7d5]/15 blur-xl"
        />
        <motion.div
          animate={{ x: [0, 40, 0] }}
          transition={{ duration: 38, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[38%] top-[10%] h-7 w-56 rounded-full bg-[#c9b7ff]/10 blur-lg"
        />
      </motion.div>

      {/* Mid layer — soft color pools + school silhouette */}
      <motion.div style={{ x: midX, y: midY }} className="absolute -inset-[4%]">
        <div className="absolute left-[16%] top-[52%] h-64 w-64 rounded-full bg-neon-pink/10 blur-[90px] animate-pulse-glow" />
        <div className="absolute right-[20%] top-[44%] h-72 w-72 rounded-full bg-neon-violet/10 blur-[100px] animate-pulse-glow [animation-delay:1.4s]" />
        <SchoolSilhouette />
      </motion.div>

      {/* Near layer — sakura petals react the most to the mouse */}
      <motion.div style={{ x: nearX, y: nearY }} className="absolute -inset-[5%]">
        <SakuraPetals petalCount={44} starCount={0} />
      </motion.div>

      {/* Vignette for contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_48%,rgba(10,6,24,0.75)_100%)]" />
    </div>
  );
}
