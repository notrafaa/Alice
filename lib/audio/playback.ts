/**
 * Gameplay audio — RECONSTRUCTION mode.
 *
 * Core design: the uploaded song does NOT auto-play. Every note the player
 * hits plays the REAL audio fragment of the song at that note's timestamp
 * (from the note to the next note of the chart). Chain your hits and the
 * song rebuilds itself, recognizably; miss and you punch a hole of silence
 * in it. No synthesized instrument sounds — every sound you hear is the
 * uploaded track itself.
 *
 * Timing is derived exclusively from `AudioContext.currentTime`, never
 * setInterval/Date.now:
 *
 *   songTime = ctx.currentTime - songStartCtxTime
 *
 * Pause/resume uses ctx.suspend()/ctx.resume(): suspending freezes
 * `currentTime`, so the game clock (and any playing fragment) freezes too.
 *
 * An optional quiet "ghost" backing track (backingVolume > 0) can play the
 * full mix underneath as a guide — off by default.
 *
 * The "vocals off" option is an approximation (mid-side cancellation which
 * removes center-panned vocals, low end mixed back in), applied to the
 * buffer the fragments are sliced from. Real stem muting arrives with the
 * FutureStemSeparationEngine.
 */

export interface PlaybackOptions {
  /** 0..1 ghost backing-track volume (0 = pure reconstruction). */
  backingVolume: number;
  /** 0..1 volume of the song fragments played on hits. */
  sliceVolume: number;
  removeVocals: boolean;
}

/** Offline render of an approximate karaoke (vocal-removed) version. */
async function renderVocalRemoved(buffer: AudioBuffer): Promise<AudioBuffer> {
  if (buffer.numberOfChannels < 2) return buffer; // mono: nothing to cancel

  const offline = new OfflineAudioContext(2, buffer.length, buffer.sampleRate);
  const source = offline.createBufferSource();
  source.buffer = buffer;

  const splitter = offline.createChannelSplitter(2);
  source.connect(splitter);

  // Side signal (L - R): cancels center-panned content (usually vocals)
  const gainL = offline.createGain();
  gainL.gain.value = 0.9;
  const gainR = offline.createGain();
  gainR.gain.value = -0.9;
  splitter.connect(gainL, 0);
  splitter.connect(gainR, 1);

  const side = offline.createGain();
  gainL.connect(side);
  gainR.connect(side);

  // Low end is usually center-panned too; bring it back with a lowpass
  const lowpass = offline.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 170;
  source.connect(lowpass);
  const lowGain = offline.createGain();
  lowGain.gain.value = 0.9;
  lowpass.connect(lowGain);

  side.connect(offline.destination);
  lowGain.connect(offline.destination);
  source.start(0);

  return offline.startRendering();
}

export class GamePlayback {
  private ctx: AudioContext;
  private sliceGain: GainNode;
  private backingGain: GainNode;
  private masterGain: GainNode;
  private buffer: AudioBuffer;
  private backingVolume: number;
  private backingSource: AudioBufferSourceNode | null = null;
  private currentSlice: { source: AudioBufferSourceNode; env: GainNode } | null = null;
  private songStartCtxTime = 0;
  private started = false;

  private constructor(ctx: AudioContext, buffer: AudioBuffer, opts: PlaybackOptions) {
    this.ctx = ctx;
    this.buffer = buffer;
    this.backingVolume = opts.backingVolume;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 22;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.62;
    compressor.connect(this.masterGain).connect(ctx.destination);

    this.sliceGain = ctx.createGain();
    this.sliceGain.gain.value = opts.sliceVolume * 0.72;
    this.sliceGain.connect(compressor);

    this.backingGain = ctx.createGain();
    this.backingGain.gain.value = opts.backingVolume * 0.55;
    this.backingGain.connect(compressor);
  }

  /**
   * Create a playback instance. Must be called from (or after) a user
   * gesture so the AudioContext is allowed to run.
   */
  static async create(buffer: AudioBuffer, opts: PlaybackOptions): Promise<GamePlayback> {
    const ctx = new AudioContext({ latencyHint: "interactive" });
    await ctx.resume();
    const finalBuffer = opts.removeVocals ? await renderVocalRemoved(buffer) : buffer;
    return new GamePlayback(ctx, finalBuffer, opts);
  }

  /**
   * Start the game clock after `leadInSec` seconds (countdown + margin).
   * The song itself does NOT start — only the optional ghost backing track
   * (if backingVolume > 0). `getSongTime()` is negative during the lead-in.
   */
  start(leadInSec: number): void {
    if (this.started) return;
    this.started = true;
    this.songStartCtxTime = this.ctx.currentTime + leadInSec;

    if (this.backingVolume > 0) {
      this.backingSource = this.ctx.createBufferSource();
      this.backingSource.buffer = this.buffer;
      this.backingSource.connect(this.backingGain);
      this.backingSource.start(this.songStartCtxTime);
    }
  }

  /** Song-relative time in seconds. Negative during the lead-in. */
  getSongTime(): number {
    return this.ctx.currentTime - this.songStartCtxTime;
  }

  get isRunning(): boolean {
    return this.ctx.state === "running";
  }

  async pause(): Promise<void> {
    if (this.ctx.state === "running") await this.ctx.suspend();
  }

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  setBackingVolume(v: number): void {
    this.backingGain.gain.value = v * 0.55;
  }

  setSliceVolume(v: number): void {
    this.sliceGain.gain.value = v * 0.72;
  }

  /**
   * Play the real audio fragment of the song for a hit note:
   * from `startSec` (the note's timestamp) until `untilSec` (the next
   * note's timestamp), with click-free micro fades. Any fragment still
   * playing is faded out first so consecutive hits chain seamlessly into
   * a continuous, recognizable song.
   */
  playSlice(startSec: number, untilSec: number): void {
    const t = this.ctx.currentTime;

    // Fade out the previous fragment quickly (avoids overlap smearing)
    if (this.currentSlice) {
      const { source, env } = this.currentSlice;
      env.gain.cancelScheduledValues(t);
      env.gain.setValueAtTime(env.gain.value, t);
      env.gain.linearRampToValueAtTime(0.0001, t + 0.035);
      try {
        source.stop(t + 0.04);
      } catch {
        /* already stopped */
      }
      this.currentSlice = null;
    }

    const offset = Math.max(0, Math.min(startSec, this.buffer.duration - 0.05));
    const dur = Math.max(0.15, Math.min(untilSec - startSec + 0.06, this.buffer.duration - offset));

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + 0.008); // 8ms fade-in
    const fadeOutStart = Math.max(t + 0.02, t + dur - 0.05);
    env.gain.setValueAtTime(1, fadeOutStart);
    env.gain.linearRampToValueAtTime(0.0001, t + dur); // 50ms fade-out

    source.connect(env).connect(this.sliceGain);
    source.start(t, offset, dur + 0.02);
    this.currentSlice = { source, env };
    source.onended = () => {
      if (this.currentSlice?.source === source) this.currentSlice = null;
    };
  }

  async dispose(): Promise<void> {
    try {
      this.backingSource?.stop();
      this.currentSlice?.source.stop();
    } catch {
      /* already stopped */
    }
    if (this.ctx.state !== "closed") await this.ctx.close();
  }
}
