// CC0-SOUNDS: the recorded cues, loaded and played. Every file (`sfx/cues/<file>.opus`, listed in `cueSampleManifest.ts` and cached by
// the service worker for offline play) is fetched and decoded once, on the first tap, and played from a buffer through a gain (its own
// level times the mixer's) and, when panned, a stereo panner, into the same bus as the synth would use: the effects, the page's ui or the
// summoning show's, so the Effects volume, the mute and `hushSummon` treat it the same. A file that will not load or decode (an old
// Safari has no Opus) is simply missing; a cue with none of its files decoded is not played here, and `sound.ts` makes its synth instead.

import type { BusName } from './audioProcessors';
import { CUE_SAMPLES, SAMPLE_DIR, SAMPLE_FILES, TakePicker, sampleRate } from './cueSamples';
import type { Cue } from './soundRules';

export class CueBank {
  private readonly buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private readonly picker = new TakePicker();

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly bus: (name: BusName) => AudioNode,
    private readonly base = SAMPLE_DIR,
  ) {}

  /** Fetches and decodes every file (once; later calls return the same promise). Never rejects. */
  load(): Promise<void> {
    this.loading ??= Promise.all(
      SAMPLE_FILES.map(async (file) => {
        try {
          const res = await fetch(`${this.base}${file}.opus`);
          if (!res.ok) return;
          this.buffers.set(file, await this.ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          /* (left out: the cue's other takes, or its synth, play) */
        }
      }),
    ).then(() => undefined);
    return this.loading;
  }

  /** How many files are decoded (for `__audioDebug`). */
  get decoded(): number {
    return this.buffers.size;
  }

  /** Whether `cue` has a decoded take to play. */
  has(cue: Cue): boolean {
    return (CUE_SAMPLES[cue] ?? []).some((f) => this.buffers.has(f.file));
  }

  /** Plays one of `cue`'s takes at context time `t` on `bus`: `gain` the mixer's level, `pitch` its random pitch, `pan` -1 to 1. The
   *  file played, or null if none of its takes is decoded (the synth then plays). */
  play(cue: Cue, t: number, o: { gain: number; pitch: number; bus: BusName; pan?: number }): string | null {
    const takes = (CUE_SAMPLES[cue] ?? []).filter((f) => this.buffers.has(f.file));
    if (!takes.length) return null;
    const f = takes[this.picker.next(cue, takes.length)];
    const src = new AudioBufferSourceNode(this.ctx, { buffer: this.buffers.get(f.file), playbackRate: sampleRate(o.pitch) });
    const g = new GainNode(this.ctx, { gain: o.gain * f.gain });
    src.connect(g);
    const p = o.pan ? new StereoPannerNode(this.ctx, { pan: o.pan }) : null;
    if (p) g.connect(p).connect(this.bus(o.bus));
    else g.connect(this.bus(o.bus));
    src.start(t);
    // (let go of the nodes once it has rung out)
    src.onended = () => {
      g.disconnect();
      p?.disconnect();
    };
    return f.file;
  }
}
