/**
 * Local audio analysis — the heart of the DemoLocalAudioEngine (Level 1).
 *
 * ⚠️ Honest disclaimer, also stated in docs/ARCHITECTURE.md:
 * This is an APPROXIMATE analysis. There is no real instrument stem
 * separation happening in the browser here. Instead we:
 *
 *   1. decode the uploaded file with the Web Audio API,
 *   2. band-pass the signal through each instrument's frequency band
 *      (OfflineAudioContext + BiquadFilter) to *bias* detection toward
 *      that instrument,
 *   3. detect transients/onsets on the band-limited energy envelope,
 *   4. spread the detected onsets across lanes with a brightness
 *      heuristic (zero-crossing rate),
 *   5. thin the notes according to the chosen difficulty.
 *
 * The result is a playable, musical-feeling beatmap — not a perfect
 * transcription. Real stem separation is designed to plug in later via
 * lib/audio/futureStemSeparationEngine.ts without touching gameplay code.
 */

import type { Beatmap, InstrumentChart, InstrumentId, Note } from "@/types";
import { INSTRUMENTS } from "@/lib/game/instruments";
import type { SoloOptions } from "@/types";

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

/** Decode an uploaded .mp3 / .wav File into an AudioBuffer. */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    // Decoding context is throwaway; playback uses its own context.
    void ctx.close();
  }
}

// ---------------------------------------------------------------------------
// Envelope / onset analysis
// ---------------------------------------------------------------------------

export interface Onset {
  /** Seconds from the start of the buffer. */
  time: number;
  /** Normalized strength 0..1. */
  strength: number;
  /** Zero-crossing rate around the onset (brightness proxy, 0..1). */
  brightness: number;
}

export interface AudioAnalysis {
  duration: number;
  sampleRate: number;
  /** Global RMS envelope (for progress visuals). */
  envelope: Float32Array;
  /** Frames per second of the envelope. */
  envelopeFps: number;
  /** Rough BPM estimate from onset autocorrelation. */
  bpm: number;
  /** Onsets detected on the full (unfiltered) mix. */
  onsets: Onset[];
}

const FRAME_SIZE = 1024;
const HOP_SIZE = 512;

/** Mix an AudioBuffer down to mono Float32Array. */
function toMono(buffer: AudioBuffer): Float32Array {
  const ch0 = buffer.getChannelData(0);
  if (buffer.numberOfChannels === 1) return ch0;
  const ch1 = buffer.getChannelData(1);
  const mono = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) mono[i] = (ch0[i] + ch1[i]) * 0.5;
  return mono;
}

/** RMS energy envelope, one value per hop. */
function computeEnvelope(samples: Float32Array): Float32Array {
  const frames = Math.max(1, Math.floor((samples.length - FRAME_SIZE) / HOP_SIZE));
  const env = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    const start = f * HOP_SIZE;
    let sum = 0;
    for (let i = 0; i < FRAME_SIZE; i++) {
      const s = samples[start + i];
      sum += s * s;
    }
    env[f] = Math.sqrt(sum / FRAME_SIZE);
  }
  return env;
}

/** RMS of a signal (strided for speed). Used for band-presence ratios. */
function rmsOf(samples: Float32Array, stride = 4): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < samples.length; i += stride) {
    sum += samples[i] * samples[i];
    count++;
  }
  return Math.sqrt(sum / Math.max(1, count));
}

/** Zero-crossing rate of one frame (0..1), a cheap brightness proxy. */
function zeroCrossingRate(samples: Float32Array, start: number): number {
  let crossings = 0;
  const end = Math.min(start + FRAME_SIZE, samples.length - 1);
  for (let i = Math.max(1, start); i < end; i++) {
    if ((samples[i - 1] < 0 && samples[i] >= 0) || (samples[i - 1] >= 0 && samples[i] < 0)) {
      crossings++;
    }
  }
  return Math.min(1, crossings / (FRAME_SIZE * 0.5));
}

/**
 * Detect onsets (transients) in a signal using positive energy flux with
 * an adaptive moving-average threshold and local peak picking.
 */
export function detectOnsets(
  samples: Float32Array,
  sampleRate: number,
  opts: { minGapSec?: number } = {}
): Onset[] {
  const envelope = computeEnvelope(samples);
  const fps = sampleRate / HOP_SIZE;
  const minGapFrames = Math.round((opts.minGapSec ?? 0.09) * fps);

  // Positive energy flux
  const flux = new Float32Array(envelope.length);
  for (let i = 1; i < envelope.length; i++) {
    flux[i] = Math.max(0, envelope[i] - envelope[i - 1]);
  }

  // Adaptive threshold: moving average over ~1s window + a margin
  const win = Math.round(fps);
  const onsets: Onset[] = [];
  let lastOnsetFrame = -minGapFrames;
  let maxFlux = 0;
  for (let i = 0; i < flux.length; i++) maxFlux = Math.max(maxFlux, flux[i]);
  if (maxFlux === 0) return onsets;

  for (let i = 2; i < flux.length - 2; i++) {
    let localSum = 0;
    let count = 0;
    for (let j = Math.max(0, i - win); j < Math.min(flux.length, i + win); j++) {
      localSum += flux[j];
      count++;
    }
    const threshold = (localSum / count) * 1.6 + maxFlux * 0.02;

    const isPeak =
      flux[i] > threshold &&
      flux[i] >= flux[i - 1] &&
      flux[i] >= flux[i + 1] &&
      i - lastOnsetFrame >= minGapFrames;

    if (isPeak) {
      lastOnsetFrame = i;
      onsets.push({
        time: (i * HOP_SIZE) / sampleRate,
        strength: Math.min(1, flux[i] / (maxFlux * 0.6)),
        brightness: zeroCrossingRate(samples, i * HOP_SIZE),
      });
    }
  }
  return onsets;
}

/** Rough BPM estimation via autocorrelation of the onset pulse train. */
function estimateBpm(onsets: Onset[], duration: number): number {
  if (onsets.length < 8 || duration <= 0) return 120;
  const fps = 50;
  const pulse = new Float32Array(Math.ceil(duration * fps));
  for (const o of onsets) {
    const idx = Math.floor(o.time * fps);
    if (idx < pulse.length) pulse[idx] += o.strength;
  }
  let bestBpm = 120;
  let bestScore = 0;
  for (let bpm = 60; bpm <= 180; bpm++) {
    const lag = Math.round((60 / bpm) * fps);
    let score = 0;
    for (let i = 0; i + lag < pulse.length; i++) score += pulse[i] * pulse[i + lag];
    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  }
  return bestBpm;
}

/** Full-mix analysis: envelope, onsets, BPM. */
export function analyzeAudioBuffer(buffer: AudioBuffer): AudioAnalysis {
  const mono = toMono(buffer);
  const envelope = computeEnvelope(mono);
  const onsets = detectOnsets(mono, buffer.sampleRate);
  return {
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
    envelope,
    envelopeFps: buffer.sampleRate / HOP_SIZE,
    bpm: estimateBpm(onsets, buffer.duration),
    onsets,
  };
}

// ---------------------------------------------------------------------------
// Band filtering (per-instrument bias)
// ---------------------------------------------------------------------------

/**
 * Render the buffer through a band-pass corresponding to an instrument's
 * frequency band, using an OfflineAudioContext (much faster than realtime).
 * Output is mono at a reduced sample rate to keep analysis fast.
 */
export async function renderInstrumentBand(
  buffer: AudioBuffer,
  band: { low: number; high: number }
): Promise<{ samples: Float32Array; sampleRate: number }> {
  const targetRate = 22050;
  const length = Math.ceil(buffer.duration * targetRate);
  const offline = new OfflineAudioContext(1, Math.max(1, length), targetRate);

  const source = offline.createBufferSource();
  source.buffer = buffer;

  const highpass = offline.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = band.low;
  highpass.Q.value = 0.9;

  const lowpass = offline.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = Math.min(band.high, targetRate / 2 - 100);
  lowpass.Q.value = 0.9;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(offline.destination);
  source.start(0);

  const rendered = await offline.startRendering();
  return { samples: rendered.getChannelData(0), sampleRate: targetRate };
}

// ---------------------------------------------------------------------------
// Chart generation
// ---------------------------------------------------------------------------

const DIFFICULTY_PARAMS: Record<
  SoloOptions["difficulty"],
  { minGapSec: number; minStrength: number }
> = {
  stars_1: { minGapSec: 0.42, minStrength: 0.3 },
  stars_2: { minGapSec: 0.24, minStrength: 0.16 },
  stars_3: { minGapSec: 0.15, minStrength: 0.08 },
  stars_4: { minGapSec: 0.09, minStrength: 0.04 },
  stars_5: { minGapSec: 0.06, minStrength: 0.02 },
  stars_6: { minGapSec: 0.05, minStrength: 0.015 },
  stars_7: { minGapSec: 0.045, minStrength: 0.012 },
  stars_8: { minGapSec: 0.04, minStrength: 0.01 },
  stars_9: { minGapSec: 0.035, minStrength: 0.008 },
  stars_10: { minGapSec: 0.03, minStrength: 0.006 },
};

/**
 * Build a playable chart for one instrument from its band-limited onsets.
 *
 * Lane assignment heuristic: onsets are sorted into lanes by brightness
 * (zero-crossing rate) quantiles, so "darker" hits land on left lanes and
 * "brighter" hits on right lanes — an approximation of pitch movement.
 * Consecutive same-lane notes that are too close get nudged to a neighbor
 * lane to avoid unpleasant jackhammers.
 *
 * @param presence band-energy ratio of this instrument in the song (0..1).
 *                 Combined with note density, it decides `available`: a
 *                 song with no bass won't offer the bass, a song with no
 *                 percussion won't offer the drums, etc.
 */
export function createInstrumentChart(
  instrument: InstrumentId,
  onsets: Onset[],
  difficulty: SoloOptions["difficulty"],
  presence: number
): InstrumentChart {
  const def = INSTRUMENTS[instrument];
  const params = DIFFICULTY_PARAMS[difficulty];

  // 1. thin by strength + minimum gap
  const kept: Onset[] = [];
  let lastTime = -Infinity;
  for (const o of onsets) {
    if (o.strength < params.minStrength) continue;
    if (o.time - lastTime < params.minGapSec) continue;
    kept.push(o);
    lastTime = o.time;
  }

  // 2. brightness quantiles → lane bins
  const sortedBrightness = kept.map((o) => o.brightness).sort((a, b) => a - b);
  const laneOf = (brightness: number): number => {
    if (sortedBrightness.length === 0) return 0;
    let rank = 0;
    while (rank < sortedBrightness.length && sortedBrightness[rank] < brightness) rank++;
    const q = rank / sortedBrightness.length;
    return Math.min(def.lanes - 1, Math.floor(q * def.lanes));
  };

  // 3. build notes, nudging fast same-lane repeats
  const notes: Note[] = [];
  let prevLane = -1;
  let prevTime = -Infinity;
  kept.forEach((o, i) => {
    let lane = laneOf(o.brightness);
    if (lane === prevLane && o.time - prevTime < 0.28) {
      lane = (lane + 1) % def.lanes;
    }
    const nextTime = kept[i + 1]?.time ?? o.time + 0.4;
    const canHold = nextTime - o.time > 0.7 && ((i + def.lanes) % 7 === 0 || o.strength > 0.78);
    const duration = canHold ? Math.min(1.45, Math.max(0.55, nextTime - o.time - 0.18)) : undefined;
    notes.push({
      id: `${instrument}-${i}`,
      time: o.time,
      lane,
      instrument,
      ...(duration ? { duration } : {}),
      hitState: "pending",
      strength: o.strength,
    });
    prevLane = lane;
    prevTime = o.time;
  });

  // 4. difficulty estimate from density (notes per second)
  const duration = notes.length > 1 ? notes[notes.length - 1].time - notes[0].time : 1;
  const nps = notes.length / Math.max(1, duration);
  const difficultyScore = Math.max(1, Math.min(10, Math.round(nps * 1.8)));

  // 5. availability: enough band energy AND enough detected notes.
  const available =
    presence >= def.minPresence && nps >= def.minNotesPerSec && notes.length >= 12;

  return {
    instrument,
    lanes: def.lanes,
    keys: def.keys,
    notes,
    difficulty: difficultyScore,
    presence: Number(presence.toFixed(3)),
    available,
  };
}

/**
 * Generate a full beatmap: one chart per instrument, each derived from
 * onsets detected in that instrument's frequency band.
 *
 * @param onProgress 0..1 progress callback (5 offline renders take a
 *                   moment on long songs).
 */
export async function generateBeatmap(
  buffer: AudioBuffer,
  meta: { songId: string; title: string },
  difficulty: SoloOptions["difficulty"],
  onProgress?: (p: number) => void
): Promise<Beatmap> {
  const analysis = analyzeAudioBuffer(buffer);
  const fullRms = rmsOf(toMono(buffer), 8);
  onProgress?.(0.15);

  const instrumentIds = Object.keys(INSTRUMENTS) as InstrumentId[];
  const charts: Beatmap["charts"] = {};

  for (let i = 0; i < instrumentIds.length; i++) {
    const id = instrumentIds[i];
    const def = INSTRUMENTS[id];
    const { samples, sampleRate } = await renderInstrumentBand(buffer, def.band);
    const onsets = detectOnsets(samples, sampleRate, {
      minGapSec: id === "keys_4" ? 0.07 : 0.11,
    });
    // Band presence: how much of the mix's energy lives in this
    // instrument's frequency band. Drives per-song availability.
    const presence = fullRms > 0 ? Math.min(1, rmsOf(samples, 4) / fullRms) : 0;
    charts[id] = createInstrumentChart(id, onsets, difficulty, presence);
    onProgress?.(0.15 + ((i + 1) / instrumentIds.length) * 0.8);
  }

  onProgress?.(1);
  return {
    songId: meta.songId,
    title: meta.title,
    duration: buffer.duration,
    bpm: analysis.bpm,
    charts,
    source: "demo-local-analysis",
    createdAt: new Date().toISOString(),
  };
}
