"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);
  const [hidden, setHidden] = useState(true);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const smoothX = useSpring(x, { stiffness: 520, damping: 38, mass: 0.35 });
  const smoothY = useSpring(y, { stiffness: 520, damping: 38, mass: 0.35 });

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setEnabled(canHover);
    if (!canHover) return;

    const onMove = (event: MouseEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      setHidden(false);
    };
    const onLeave = () => setHidden(true);
    const onOver = (event: MouseEvent) => {
      const target = event.target;
      setActive(
        target instanceof Element &&
          Boolean(target.closest("a, button, input, textarea, select, [role='button']"))
      );
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mouseover", onOver);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseover", onOver);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-5 w-5 rounded-full border border-white/80 mix-blend-screen"
        style={{ x: smoothX, y: smoothY }}
        animate={{
          opacity: hidden ? 0 : 1,
          scale: active ? 2.35 : 1,
          translateX: "-50%",
          translateY: "-50%",
        }}
        transition={{ type: "spring", stiffness: 360, damping: 24 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-2 w-2 rounded-full bg-neon-pink shadow-[0_0_18px_rgba(255,92,138,0.9)]"
        style={{ x, y }}
        animate={{
          opacity: hidden ? 0 : active ? 0.45 : 1,
          scale: active ? 0.75 : 1,
          translateX: "-50%",
          translateY: "-50%",
        }}
        transition={{ duration: 0.12 }}
      />
    </>
  );
}
