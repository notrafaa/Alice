"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Beatmap,
  GameResult,
  InstrumentId,
  Judgement,
  JudgementCounts,
  Note,
  SoloOptions,
  SongMeta,
  TimingDirection,
} from "@/types";
import { GamePlayback } from "@/lib/audio/playback";
import { applyDifficulty } from "@/lib/game/chart";
import { INSTRUMENTS, keyToLane } from "@/lib/game/instruments";
import {
  buildResult,
  EMPTY_COUNTS,
  judgeHit,
  MISS_AFTER_MS,
  TIMING_WINDOWS_MS,
} from "@/lib/game/judging";
import PauseOverlay from "./PauseOverlay";
import ResultsScreen from "./ResultsScreen";

/**
 * Gameplay screen — RECONSTRUCTION mode.
 *
 * The song does not auto-play: each hit note plays the real audio fragment
 * of the uploaded track (from that note to the next one). Chained hits
 * rebuild the song audibly; misses punch holes of silence in it.
 *
 * Rendering strategy:
 * - falling notes / lanes / hit effects: <canvas> redrawn every
 *   requestAnimationFrame (smooth at any note density);
 * - HUD (score, combo, judgement popups, progress): DOM + Framer Motion,
 *   updated only when values change.
 *
 * All timing derives from GamePlayback.getSongTime(), which is backed by
 * AudioContext.currentTime — never from setInterval. Pausing suspends the
 * AudioContext, which freezes the clock and therefore the whole scene.
 */

type Phase = "ready" | "countdown" | "playing" | "paused" | "lost" | "finished";

/** Seconds of silence before the music starts (countdown + margin). */
const LEAD_IN_SEC = 5;
/** Note travel time from spawn to hit line at speed ×1. */
const BASE_TRAVEL_SEC = 1.9;

interface HitEffect {
  lane: number;
  at: number; // songTime of the hit
  judgement: Judgement;
  big?: boolean;
}

interface JudgementPopup {
  id: number;
  judgement: Judgement;
  direction: TimingDirection;
  deltaMs: number;
}

/** Max fragment length: a lonely note still plays a musical phrase. */
const MAX_SLICE_SEC = 6;

const JUDGEMENT_COLORS: Record<Judgement, string> = {
  PERFECT: "#ffd166",
  GREAT: "#8ab6ff",
  GOOD: "#a78bfa",
  MISS: "#ff5c7a",
};

const ENERGY_MAX = 100;
const MISTAKE_GRACE_COUNT = 5;
const LOST_MISS_STREAK = 10;
const MISS_ENERGY_COST = 12;
const MISS_SCORE_COST = 140;

const KEY_PALETTES = {
  pink: { color: "#ff5c8a", soft: "#ffa3c0" },
  blue: { color: "#8ab6ff", soft: "#c5daff" },
  green: { color: "#7ee8a2", soft: "#bcf3d1" },
  gold: { color: "#ffd166", soft: "#ffe6ad" },
} as const;

const GAME_BACKGROUNDS = {
  dusk: {
    sky: "bg-gradient-to-b from-[#110b2a] via-[#1b1140] to-[#331b4e]",
    floor: "from-[#ff6f9c1a]",
    glow: "#ff5c8a",
  },
  midnight: {
    sky: "bg-gradient-to-b from-[#050814] via-[#0b1734] to-[#15112d]",
    floor: "from-[#8ab6ff24]",
    glow: "#8ab6ff",
  },
  aurora: {
    sky: "bg-gradient-to-b from-[#06141a] via-[#132a38] to-[#2b1642]",
    floor: "from-[#7ee8a224]",
    glow: "#7ee8a2",
  },
  minimal: {
    sky: "bg-gradient-to-b from-[#08080d] via-[#11111a] to-[#171725]",
    floor: "from-[#ffffff12]",
    glow: "#ffffff",
  },
} as const;

export default function GameScreen({
  song,
  audioBuffer,
  beatmap,
  instrumentId,
  options,
  onResult,
  onReplay,
}: {
  song: SongMeta;
  audioBuffer: AudioBuffer;
  beatmap: Beatmap;
  instrumentId: InstrumentId;
  options: SoloOptions;
  onResult: (result: GameResult) => void;
  onReplay: () => void;
}) {
  const router = useRouter();
  const instrument = INSTRUMENTS[instrumentId];
  const palette =
    options.keyPalette && options.keyPalette !== "auto"
      ? KEY_PALETTES[options.keyPalette]
      : { color: instrument.color, soft: instrument.colorSoft };
  const gameBackground =
    options.gameBackground === "custom" ? GAME_BACKGROUNDS.dusk : GAME_BACKGROUNDS[options.gameBackground ?? "dusk"];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playbackRef = useRef<GamePlayback | null>(null);

  // --- mutable game state (refs: read/written inside the rAF loop) --------
  const notesRef = useRef<Note[]>([]);
  // sliceUntilRef[i] = timestamp the fragment of note i plays until
  // (the next note's time) — precomputed so hits chain gaplessly.
  const sliceUntilRef = useRef<number[]>([]);
  const searchFromRef = useRef(0); // index of the oldest possibly-pending note
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const countsRef = useRef<JudgementCounts>({ ...EMPTY_COUNTS });
  const effectsRef = useRef<HitEffect[]>([]);
  const laneFlashRef = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("ready");
  const popupIdRef = useRef(0);
  const botScoresRef = useRef<Record<string, number>>({});
  const botCursorsRef = useRef<Record<string, number>>({});
  const energyRef = useRef(ENERGY_MAX);
  const mistakeStreakRef = useRef(0);
  const activeHoldsRef = useRef<Record<number, Note>>({});

  // --- React state (HUD only) ----------------------------------------------
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [popup, setPopup] = useState<JudgementPopup | null>(null);
  const [countdownLabel, setCountdownLabel] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [botScores, setBotScores] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GameResult | null>(null);
  const [energy, setEnergy] = useState(ENERGY_MAX);
  const [missStreak, setMissStreak] = useState(0);
  const [lostReason, setLostReason] = useState("Alice a perdu le fil.");

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const applyEnergy = useCallback(
    (next: number, reason = "Alice a perdu le fil.") => {
      const clamped = Math.max(0, Math.min(ENERGY_MAX, next));
      energyRef.current = clamped;
      setEnergy(clamped);
      if (mistakeStreakRef.current >= LOST_MISS_STREAK && phaseRef.current !== "lost") {
        setLostReason(reason);
        setPhaseBoth("lost");
      }
    },
    [setPhaseBoth]
  );

  const punish = useCallback(
    (amount: number, reason?: string, misses = 1) => {
      mistakeStreakRef.current += misses;
      setMissStreak(mistakeStreakRef.current);
      comboRef.current = 0;
      setCombo(0);

      if (mistakeStreakRef.current < MISTAKE_GRACE_COUNT) return;

      scoreRef.current = Math.max(0, scoreRef.current - MISS_SCORE_COST * misses);
      setScore(scoreRef.current);
      applyEnergy(energyRef.current - amount, reason);
    },
    [applyEnergy]
  );

  // Charts of the other instruments, for simulated bots.
  const botInstruments = options.withBots
    ? (Object.keys(beatmap.charts) as InstrumentId[]).filter((id) => id !== instrumentId)
    : [];

  // -------------------------------------------------------------------------
  // Start (requires a user gesture for the AudioContext)
  // -------------------------------------------------------------------------
  const start = useCallback(async () => {
    if (phaseRef.current !== "ready") return;

    const chart = beatmap.charts[instrumentId];
    if (!chart) return;
    const notes = applyDifficulty(chart, options.difficulty).notes;
    notesRef.current = notes;
    // Each note's fragment plays until the next note (capped), so a full
    // combo reconstructs the song continuously.
    sliceUntilRef.current = notes.map((n, i) =>
      Math.min(notes[i + 1]?.time ?? song.duration, n.time + MAX_SLICE_SEC, song.duration)
    );
    searchFromRef.current = 0;
    laneFlashRef.current = new Array(instrument.lanes).fill(-Infinity);
    activeHoldsRef.current = {};
    mistakeStreakRef.current = 0;
    setMissStreak(0);
    energyRef.current = ENERGY_MAX;
    setEnergy(ENERGY_MAX);

    const playback = await GamePlayback.create(audioBuffer, {
      backingVolume: options.musicVolume,
      sliceVolume: options.instrumentVolume,
      removeVocals: options.vocals === "off",
    });
    playbackRef.current = playback;
    playback.start(LEAD_IN_SEC);
    setPhaseBoth("countdown");
  }, [audioBuffer, beatmap, instrument.lanes, instrumentId, options, setPhaseBoth, song.duration]);

  // -------------------------------------------------------------------------
  // Finish
  // -------------------------------------------------------------------------
  const finish = useCallback(() => {
    const res = buildResult({
      score: scoreRef.current,
      maxCombo: maxComboRef.current,
      counts: { ...countsRef.current },
      totalNotes: notesRef.current.length,
      instrument: instrumentId,
      songTitle: song.title,
    });
    setResult(res);
    onResult(res);
    setPhaseBoth("finished");
    void playbackRef.current?.dispose();
    playbackRef.current = null;
  }, [instrumentId, onResult, setPhaseBoth, song.title]);

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.key === "Escape") {
        if (phaseRef.current === "playing") {
          void playbackRef.current?.pause();
          setPhaseBoth("paused");
        } else if (phaseRef.current === "paused") {
          void playbackRef.current?.resume();
          setPhaseBoth("playing");
        }
        return;
      }

      if (phaseRef.current === "ready" && (e.key === " " || e.key === "Enter")) {
        void start();
        return;
      }
      if (phaseRef.current !== "playing" && phaseRef.current !== "countdown") return;

      const lane = keyToLane(instrument, e.key);
      if (lane < 0) return;

      const playback = playbackRef.current;
      if (!playback) return;

      const songTime = playback.getSongTime() - options.latencyOffsetMs / 1000;
      laneFlashRef.current[lane] = playback.getSongTime();

      // Find the closest pending note in this lane within the GOOD window.
      const notes = notesRef.current;
      let best: Note | null = null;
      let bestAbs = Infinity;
      for (let i = searchFromRef.current; i < notes.length; i++) {
        const n = notes[i];
        if (n.time - songTime > TIMING_WINDOWS_MS.GOOD / 1000 + 0.05) break;
        if (n.hitState !== "pending" || n.lane !== lane) continue;
        const abs = Math.abs(n.time - songTime);
        if (abs < bestAbs) {
          bestAbs = abs;
          best = n;
        }
      }
      if (!best) {
        return;
      }

      const deltaMs = (songTime - best.time) * 1000;
      const judged = judgeHit(deltaMs, comboRef.current);
      if (!judged) return;

      best.hitState = best.duration ? "holding" : "hit";
      mistakeStreakRef.current = 0;
      setMissStreak(0);
      scoreRef.current += judged.scoreGained;
      comboRef.current += 1;
      maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
      countsRef.current[judged.judgement] += 1;

      effectsRef.current.push({
        lane,
        at: playback.getSongTime(),
        judgement: judged.judgement,
        big: Boolean(best.duration),
      });
      if (best.duration) activeHoldsRef.current[lane] = best;

      setScore(scoreRef.current);
      setCombo(comboRef.current);
      setAccuracy(computeLiveAccuracy(countsRef.current));
      setPopup({
        id: ++popupIdRef.current,
        judgement: judged.judgement,
        direction: judged.direction,
        deltaMs: judged.deltaMs,
      });
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing" && phaseRef.current !== "countdown") return;
      const lane = keyToLane(instrument, e.key);
      if (lane < 0) return;
      const hold = activeHoldsRef.current[lane];
      const playback = playbackRef.current;
      if (!hold || !playback || !hold.duration) return;
      delete activeHoldsRef.current[lane];
      const heldFor = playback.getSongTime() - hold.time;
      if (heldFor < hold.duration * 0.72) {
        hold.hitState = "missed";
        countsRef.current.MISS += 1;
        setAccuracy(computeLiveAccuracy(countsRef.current));
        setPopup({
          id: ++popupIdRef.current,
          judgement: "MISS",
          direction: null,
          deltaMs: 0,
        });
        punish(MISS_ENERGY_COST, "Une note longue a ete relachee trop tot.");
      } else {
        hold.hitState = "hit";
        mistakeStreakRef.current = 0;
        setMissStreak(0);
        scoreRef.current += 80;
        comboRef.current += 1;
        maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
        setScore(scoreRef.current);
        setCombo(comboRef.current);
        effectsRef.current.push({
          lane,
          at: playback.getSongTime(),
          judgement: "PERFECT",
          big: true,
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [instrument, options.latencyOffsetMs, punish, setPhaseBoth, start]);

  // -------------------------------------------------------------------------
  // Game loop: canvas rendering + miss detection + countdown + bots
  // -------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastCountdown: string | null = null;
    let lastHudUpdate = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);

      const playback = playbackRef.current;
      const p = phaseRef.current;

      // Canvas sizing (DPR aware)
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const lanes = instrument.lanes;
      const laneWidth = Math.min(150, (w * 0.86) / lanes);
      const fieldWidth = laneWidth * lanes;
      const left = (w - fieldWidth) / 2;
      const hitY = h - 110;
      const spawnY = -40;
      const noteRadius = Math.min(42, laneWidth * 0.42);
      const travelSec = BASE_TRAVEL_SEC / options.noteSpeed;

      const songTime = playback ? playback.getSongTime() : -LEAD_IN_SEC;

      // --- lanes ---------------------------------------------------------
      for (let l = 0; l <= lanes; l++) {
        const x = left + l * laneWidth;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.75, "rgba(255,255,255,0.10)");
        grad.addColorStop(1, "rgba(255,255,255,0.16)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Lane flash on key press
      for (let l = 0; l < lanes; l++) {
        const since = songTime - laneFlashRef.current[l];
        if (since >= 0 && since < 0.18) {
          const alpha = 0.14 * (1 - since / 0.18);
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, "rgba(255,255,255,0)");
          grad.addColorStop(1, `${palette.color}${Math.round(alpha * 255)
            .toString(16)
            .padStart(2, "0")}`);
          ctx.fillStyle = grad;
          ctx.fillRect(left + l * laneWidth, 0, laneWidth, h);
        }
      }

      // --- hit circles -----------------------------------------------------
      for (let l = 0; l < lanes; l++) {
        const cx = left + (l + 0.5) * laneWidth;
        const since = songTime - laneFlashRef.current[l];
        const pressed = since >= 0 && since < 0.15;

        const hitPadW = laneWidth * 0.72;
        const hitPadH = noteRadius * 1.75;
        const padX = cx - hitPadW / 2;
        const padY = hitY - hitPadH / 2;
        ctx.beginPath();
        roundedRect(ctx, padX, padY, hitPadW, hitPadH, 16);
        ctx.strokeStyle = pressed ? palette.color : "rgba(255,255,255,0.35)";
        ctx.lineWidth = pressed ? 5 : 2.5;
        if (pressed) {
          ctx.shadowColor = palette.color;
          ctx.shadowBlur = 34;
        }
        ctx.stroke();
        ctx.fillStyle = pressed ? `${palette.color}30` : "rgba(255,255,255,0.035)";
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = pressed ? palette.color : "rgba(255,255,255,0.5)";
        ctx.font = `700 ${Math.round(noteRadius * 0.72)}px var(--font-display), sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(instrument.keyLabels[l], cx, hitY + 1);
      }

      // --- countdown state machine ----------------------------------------
      if (p === "countdown" && playback) {
        let label: string | null;
        if (songTime < -3) label = "READY";
        else if (songTime < -2) label = "3";
        else if (songTime < -1) label = "2";
        else if (songTime < -0.05) label = "1";
        else label = "GO";
        if (label !== lastCountdown) {
          lastCountdown = label;
          setCountdownLabel(label);
        }
        if (songTime >= 0.6) {
          setCountdownLabel(null);
          phaseRef.current = "playing";
          setPhase("playing");
        }
      }

      if (playback && (p === "playing" || p === "countdown" || p === "paused")) {
        const notes = notesRef.current;

        // --- miss detection + search window lower bound -------------------
        if (p !== "paused") {
          for (const [laneKey, hold] of Object.entries(activeHoldsRef.current)) {
            if (hold.duration && hold.hitState === "holding" && songTime >= hold.time + hold.duration) {
              hold.hitState = "hit";
              delete activeHoldsRef.current[Number(laneKey)];
              mistakeStreakRef.current = 0;
              setMissStreak(0);
              scoreRef.current += 80;
              comboRef.current += 1;
              maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
              setScore(scoreRef.current);
              setCombo(comboRef.current);
              effectsRef.current.push({
                lane: hold.lane,
                at: playback.getSongTime(),
                judgement: "PERFECT",
                big: true,
              });
            }
          }

          let missedCount = 0;
          for (let i = searchFromRef.current; i < notes.length; i++) {
            const n = notes[i];
            if (n.time - songTime > travelSec + 0.5) break;
            if (n.hitState === "pending" && songTime - n.time > MISS_AFTER_MS / 1000) {
              n.hitState = "missed";
              countsRef.current.MISS += 1;
              missedCount += 1;
            }
          }
          while (
            searchFromRef.current < notes.length &&
            notes[searchFromRef.current].hitState !== "pending"
          ) {
            searchFromRef.current++;
          }
          if (missedCount > 0) {
            punish(MISS_ENERGY_COST * missedCount, "Alice a perdu le rythme.", missedCount);
            setAccuracy(computeLiveAccuracy(countsRef.current));
            setPopup({
              id: ++popupIdRef.current,
              judgement: "MISS",
              direction: null,
              deltaMs: 0,
            });
          }
        }

        // --- falling notes -------------------------------------------------
        for (let i = 0; i < notes.length; i++) {
          const n = notes[i];
          const dt = n.time - songTime;
          if (dt > travelSec) break; // notes sorted: everything after is higher
          if (n.hitState === "hit") continue;
          const prog = 1 - dt / travelSec;
          if (prog < 0 || prog > 1.12) continue;

          const cx = left + (n.lane + 0.5) * laneWidth;
          const cy = spawnY + prog * (hitY - spawnY);
          const r = noteRadius * (0.85 + 0.3 * (n.strength ?? 0.5));
          const missed = n.hitState === "missed";
          const holdH = n.duration ? Math.max(r * 2.2, (n.duration / travelSec) * (hitY - spawnY)) : 0;

          // Approach glow when close to the hit line
          const closeness = Math.max(0, 1 - Math.abs(dt) / 0.25);
          if (n.duration) {
            const railW = r * 1.25;
            const headW = r * 2.55;
            const railGrad = ctx.createLinearGradient(cx, cy - holdH, cx, cy + r);
            const holding = n.hitState === "holding";
            railGrad.addColorStop(0, missed ? "rgba(71,85,105,0.18)" : `${palette.color}${holding ? "44" : "22"}`);
            railGrad.addColorStop(0.72, missed ? "rgba(100,116,139,0.25)" : `${palette.soft}${holding ? "aa" : "66"}`);
            railGrad.addColorStop(1, missed ? "rgba(71,85,105,0.32)" : palette.color);

            ctx.beginPath();
            roundedRect(ctx, cx - railW / 2, cy - holdH, railW, holdH + r * 0.45, railW / 2);
            ctx.fillStyle = railGrad;
            if (!missed && (closeness > 0 || holding)) {
              ctx.shadowColor = palette.color;
              ctx.shadowBlur = holding ? 34 : 24 * closeness;
            }
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.beginPath();
            roundedRect(ctx, cx - headW / 2, cy - r * 0.82, headW, r * 1.64, r * 0.55);
            const headGrad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
            headGrad.addColorStop(0, missed ? "rgba(148,163,184,0.35)" : "#ffffff");
            headGrad.addColorStop(0.4, missed ? "rgba(100,116,139,0.35)" : palette.soft);
            headGrad.addColorStop(1, missed ? "rgba(71,85,105,0.28)" : palette.color);
            ctx.fillStyle = headGrad;
            ctx.fill();
            ctx.strokeStyle = missed ? "rgba(148,163,184,0.4)" : holding ? "#ffffff" : "rgba(255,255,255,0.9)";
            ctx.lineWidth = holding ? 4 : 2.5;
            ctx.stroke();
          } else {
            ctx.beginPath();
            roundedRect(ctx, cx - r * 1.2, cy - r * 0.72, r * 2.4, r * 1.44, r * 0.55);
            const grad = ctx.createLinearGradient(cx, cy - holdH, cx, cy + r);
            if (missed) {
              grad.addColorStop(0, "rgba(148,163,184,0.35)");
              grad.addColorStop(1, "rgba(71,85,105,0.25)");
            } else {
              grad.addColorStop(0, "#ffffff");
              grad.addColorStop(0.35, palette.soft);
              grad.addColorStop(1, palette.color);
            }
            ctx.fillStyle = grad;
            if (!missed && closeness > 0) {
              ctx.shadowColor = palette.color;
              ctx.shadowBlur = 26 * closeness;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = missed ? "rgba(148,163,184,0.4)" : "rgba(255,255,255,0.85)";
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
        }

        // --- hit effects (expanding shockwave rings) ----------------------
        const effects = effectsRef.current;
        for (let i = effects.length - 1; i >= 0; i--) {
          const fx = effects[i];
          const age = songTime - fx.at;
          if (age > 0.45 || age < 0) {
            effects.splice(i, 1);
            continue;
          }
          const cx = left + (fx.lane + 0.5) * laneWidth;
          const t01 = age / 0.45;
          const color = JUDGEMENT_COLORS[fx.judgement];
          ctx.beginPath();
          ctx.arc(cx, hitY, noteRadius + 8 + t01 * (fx.big ? 86 : 54), 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = (1 - t01) * 0.8;
          ctx.lineWidth = (fx.big ? 5 : 3.5) * (1 - t01) + 0.5;
          ctx.shadowColor = color;
          ctx.shadowBlur = 18 * (1 - t01);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }

        // --- bots (simulated) + progress, throttled to ~4 Hz --------------
        if (p === "playing" && now - lastHudUpdate > 250) {
          lastHudUpdate = now;
          setProgress(Math.max(0, Math.min(1, songTime / song.duration)));

          if (botInstruments.length > 0) {
            for (const botId of botInstruments) {
              const chart = beatmap.charts[botId];
              if (!chart) continue;
              let cursor = botCursorsRef.current[botId] ?? 0;
              let botScore = botScoresRef.current[botId] ?? 0;
              while (cursor < chart.notes.length && chart.notes[cursor].time < songTime) {
                // Deterministic pseudo-random ~92% hit rate per bot note.
                const hit = ((cursor * 2654435761) >>> 8) % 100 < 92;
                if (hit) botScore += 90;
                cursor++;
              }
              botCursorsRef.current[botId] = cursor;
              botScoresRef.current[botId] = botScore;
            }
            setBotScores({ ...botScoresRef.current });
          }

          // --- end of song -------------------------------------------------
          if (songTime > song.duration + 0.8) {
            finish();
          }
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrument, options.noteSpeed, options.keyPalette, song.duration, finish, palette.color, palette.soft]);

  // Dispose audio on unmount
  useEffect(() => {
    return () => {
      void playbackRef.current?.dispose();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (phase === "finished" && result) {
    return (
      <ResultsScreen
        result={result}
        onReplay={onReplay}
        onChangeInstrument={() => router.push("/solo")}
        onMenu={() => router.push("/")}
      />
    );
  }

  if (phase === "lost") {
    return (
      <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-abyss px-6">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-b from-[#080512] via-[#22102e] to-[#4a1428]"
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.4, 0.6], opacity: [0, 0.55, 0] }}
              transition={{ duration: 1.5, delay: i * 0.16, repeat: Infinity, repeatDelay: 0.5 }}
              className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ff5c7a]/50"
            />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.82, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          className="relative z-10 max-w-xl text-center"
        >
          <motion.p
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="text-sm font-black uppercase tracking-[0.5em] text-[#ff9ab1]"
          >
            Connexion perdue
          </motion.p>
          <h2 className="mt-4 font-display text-6xl font-black uppercase text-white neon-text">
            Perdu
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            {lostReason} La musique continue, mais la serie de misses est trop longue.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <motion.button
              type="button"
              onClick={onReplay}
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.92 }}
              className="satisfying-button rounded-xl bg-gradient-to-r from-neon-pink via-neon-violet to-neon-blue px-9 py-4 font-display text-sm font-black uppercase tracking-[0.22em] text-white shadow-neon-violet"
            >
              Rejouer
            </motion.button>
            <motion.button
              type="button"
              onClick={() => router.push("/solo")}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.93 }}
              className="satisfying-button rounded-xl border border-white/15 bg-white/[0.05] px-9 py-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-slate-200"
            >
              Reglages
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-abyss">
      {/* Ambient background — night classroom vibe */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className={`absolute inset-0 ${gameBackground.sky}`} />
        {options.gameBackground === "custom" && options.customBackgroundUrl && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-75"
              style={{ backgroundImage: `url(${options.customBackgroundUrl})` }}
            />
            <div className="absolute inset-0 bg-abyss/35" />
          </>
        )}
        <div className={`absolute inset-x-0 bottom-0 h-[30vh] bg-gradient-to-t ${gameBackground.floor} to-transparent`} />
        <div
          className="absolute left-1/2 top-1/3 h-[60vmax] w-[60vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08] blur-[140px]"
          style={{ backgroundColor: gameBackground.glow }}
        />
        {missStreak >= MISTAKE_GRACE_COUNT && (
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(255,42,95,0.55)_100%)]"
            animate={{ opacity: Math.min(0.62, (missStreak - MISTAKE_GRACE_COUNT + 1) * 0.12) }}
          />
        )}
      </div>

      {/* Canvas playfield */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* HUD top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-6 py-4">
        <div className="glass-panel px-5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Score</p>
          <p className="font-display text-3xl font-black tabular-nums text-white neon-text">
            {score.toLocaleString("fr-FR")}
          </p>
        </div>

        <div className="glass-panel flex items-center gap-6 px-5 py-3">
          <div className="w-28">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Stabilité
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                animate={{ width: `${energy}%` }}
                className="h-full rounded-full bg-gradient-to-r from-[#ff5c7a] via-neon-gold to-neon-green"
              />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Précision
            </p>
            <p className="font-display text-xl font-bold tabular-nums text-neon-blue">
              {accuracy.toFixed(1)}%
            </p>
          </div>
          <div className="min-w-[70px] text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Combo
            </p>
            <AnimatePresence mode="popLayout">
              <motion.p
                key={combo}
                initial={{ scale: combo > 0 ? 1.5 : 1, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`font-display text-xl font-black tabular-nums ${
                  combo >= 20 ? "text-neon-gold" : combo > 0 ? "text-white" : "text-slate-600"
                }`}
              >
                ×{combo}
              </motion.p>
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={() => {
              if (phaseRef.current === "playing") {
                void playbackRef.current?.pause();
                setPhaseBoth("paused");
              }
            }}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-white/40 hover:text-white"
            title="Pause (Échap)"
          >
            ⏸
          </button>
        </div>
      </div>

      {/* Bot indicators */}
      {botInstruments.length > 0 && phase !== "ready" && (
        <div className="absolute left-6 top-28 z-10 flex flex-col gap-2">
          {botInstruments.map((id) => (
            <div
              key={id}
              className="glass-panel flex items-center gap-2 px-3 py-1.5 text-xs"
            >
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="h-1.5 w-1.5 rounded-full bg-neon-green"
              />
              <span>{INSTRUMENTS[id].icon}</span>
              <span className="font-semibold text-slate-400">BOT</span>
              <span className="tabular-nums text-slate-300">
                {(botScores[id] ?? 0).toLocaleString("fr-FR")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Judgement popup */}
      <div className="pointer-events-none absolute inset-x-0 top-[38%] z-10 flex justify-center">
        <AnimatePresence mode="popLayout">
          {popup && phase !== "ready" && (
            <motion.div
              key={popup.id}
              initial={{ opacity: 0, scale: 1.6, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.18 }}
              className="text-center"
            >
              <p
                className="font-display text-4xl font-black uppercase tracking-[0.2em]"
                style={{
                  color: JUDGEMENT_COLORS[popup.judgement],
                  textShadow: `0 0 24px ${JUDGEMENT_COLORS[popup.judgement]}`,
                }}
              >
                {popup.judgement}
              </p>
              {popup.direction && (
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.35em] text-slate-400">
                  {popup.direction === "EARLY" ? "◂ Early" : "Late ▸"} ·{" "}
                  {Math.abs(Math.round(popup.deltaMs))} ms
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-neon-pink via-neon-violet to-neon-blue transition-[width] duration-300 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Ready overlay */}
      <AnimatePresence>
        {phase === "ready" && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-abyss/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-neon-blue">
                {song.title}
              </p>
              <h2 className="mt-3 font-display text-4xl font-black text-white neon-text">
                Alice {instrument.name}
              </h2>
              <div className="mt-8 flex justify-center gap-3">
                {instrument.keyLabels.map((k) => (
                  <kbd
                    key={k}
                    className="flex h-14 w-14 items-center justify-center rounded-xl border-2 bg-abyss/60 font-display text-xl font-bold text-white"
                    style={{ borderColor: palette.color, boxShadow: `0 0 18px ${palette.color}44` }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
              <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-slate-300">
                La musique joue en continu. Les touches ne changent pas le son :
                elles servent seulement à tenir le rythme et éviter une série de misses.
              </p>
              <motion.button
                type="button"
                onClick={() => void start()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="mt-8 rounded-xl bg-gradient-to-r from-neon-pink via-neon-violet to-neon-blue px-10 py-4 font-display text-base font-black uppercase tracking-[0.25em] text-white shadow-neon-violet"
              >
                Prêt ▶
              </motion.button>
              <p className="mt-4 text-xs uppercase tracking-widest text-slate-600">
                ou appuie sur Entrée · Échap = pause
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown overlay */}
      <AnimatePresence mode="popLayout">
        {phase === "countdown" && countdownLabel && (
          <motion.div
            key={countdownLabel}
            initial={{ opacity: 0, scale: 2.2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <p
              className={`font-display font-black uppercase neon-text ${
                countdownLabel === "READY"
                  ? "text-4xl tracking-[0.4em] text-neon-blue"
                  : countdownLabel === "GO"
                    ? "text-8xl tracking-[0.2em] text-neon-green"
                    : "text-9xl text-white"
              }`}
            >
              {countdownLabel}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause overlay */}
      <AnimatePresence>
        {phase === "paused" && (
          <PauseOverlay
            onResume={() => {
              void playbackRef.current?.resume();
              setPhaseBoth("playing");
            }}
            onRestart={onReplay}
            onQuit={() => router.push("/")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function computeLiveAccuracy(counts: JudgementCounts): number {
  const total = counts.PERFECT + counts.GREAT + counts.GOOD + counts.MISS;
  if (total === 0) return 100;
  return ((counts.PERFECT + counts.GREAT * 0.7 + counts.GOOD * 0.4) / total) * 100;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}
