"use client";

import { useEffect, useRef } from "react";

/**
 * Canvas layer: falling sakura petals (+ optional twinkling stars).
 * Pure canvas, no assets. Used by the main menu and page shells.
 */
export default function SakuraPetals({
  petalCount = 36,
  starCount = 0,
  className = "",
}: {
  petalCount?: number;
  starCount?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;

    const PETAL_COLORS = ["#ffb7d5", "#ff8fc0", "#ffd1e3", "#ffa3c9"];

    const petals = Array.from({ length: petalCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 3.5 + Math.random() * 5.5,
      fall: 0.03 + Math.random() * 0.045, // vertical speed (screen/s)
      swayFreq: 0.6 + Math.random() * 1.2,
      swayAmp: 12 + Math.random() * 26, // px
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 2.4,
      angle: Math.random() * Math.PI * 2,
      color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      alpha: 0.5 + Math.random() * 0.45,
    }));

    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random(),
      y: Math.random() * 0.55, // upper sky only
      r: 0.5 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.6,
    }));

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();
    let t = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      ctx.clearRect(0, 0, width, height);

      // Stars (twinkle)
      for (const s of stars) {
        const glow = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 244, 224, ${glow})`;
        ctx.fill();
      }

      // Petals
      for (const p of petals) {
        p.y += p.fall * dt;
        p.angle += p.spin * dt;
        if (p.y > 1.03) {
          p.y = -0.03;
          p.x = Math.random();
        }
        const sway = Math.sin(t * p.swayFreq + p.phase) * p.swayAmp;
        const px = p.x * width + sway;
        const py = p.y * height;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.alpha;
        // Petal: squashed ellipse with a lighter core
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.62, 0, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-p.size * 0.2, -p.size * 0.12, p.size * 0.45, p.size * 0.26, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [petalCount, starCount]);

  return (
    <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${className}`} aria-hidden />
  );
}
