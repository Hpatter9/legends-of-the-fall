// The page's audio parts, each an audiorective AudioProcessor: `CueSynth` makes the synthesised effects, `BusMixer` holds
// the buses (music, sfx, ui, ambience) and the master with its limiter, and `MusicPlayer` plays the looped tracks with
// their adaptive colour (a tension low-pass, a rumble swell, a drone for each tower act). They know nothing of the
// sim or the DOM; `sound.ts` creates them through the engine and is the page's API. Not imported by the tests.

import { AudioProcessor, type SchedulableParam } from '@audiorective/core';
import { Limiter } from '@audiorective/effects';
import type { Cue } from './soundRules';
import { EPIC_INFO, bakeTrack, type Baked } from './musicBake';
import { CALM_TRACKS, SCENE_TRACKS, STEMS, stemLevels, type Stem, type Track } from './musicScore';
import { DUCK_GAIN, DUCK_HZ, OPEN_HZ, colourOf, cutoffOf, percActive, percLevel, rateOf, swellOf } from './audioRules';
import { SYNTH_OF, epicOf, loadEpic, loadSting, type MusicId, type StingId } from './epicMusic';

/** The longest a crossfade takes to settle (seconds). */
export const FADE_S = 1.2;

/* -------------------------------------------------------------- the buses */

/** The names of the buses a sound can be sent to. `show` is the summoning show's, inside `sfx`. */
export type BusName = 'music' | 'sfx' | 'ui' | 'ambience' | 'show';

type BusParams = Record<'music' | 'sfx' | 'ui' | 'ambience' | 'show' | 'master', SchedulableParam>;

/** The mixer: four buses (music, sfx, ui, ambience) and the summoning show's inside sfx, meeting at a master that runs
 *  through a limiter so a big fight never clips. Music and ambience pass a ducker: a gain dip and a low-pass that close
 *  smoothly under menus, cards and the show. The limiter is a worklet; until it has loaded (or if the browser has no
 *  AudioWorklet) a native compressor does its job, so the master never goes silent. */
export class BusMixer extends AudioProcessor<BusParams & { duck: SchedulableParam; duckHz: SchedulableParam }> {
  private readonly buses: Record<BusName, GainNode>;
  private readonly master: GainNode;
  private readonly fallback: DynamicsCompressorNode;
  private readonly limiter: Limiter | null;
  /** Whether the limiter has taken over from the native compressor. */
  limited = false;

  constructor(ctx: BaseAudioContext) {
    const mk = () => new GainNode(ctx, { gain: 1 });
    const buses = { music: mk(), sfx: mk(), ui: mk(), ambience: mk(), show: mk() };
    const master = mk();
    // (the bed, music and ambience together, passes one ducker: a low-pass and a gain moved together)
    const bed = mk();
    const duckLp = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: OPEN_HZ, Q: 0.5 });
    const duckGain = mk();
    const fallback = new DynamicsCompressorNode(ctx, { threshold: -10, knee: 8, ratio: 12, attack: 0.003, release: 0.15 });
    super(ctx, ({ param }) => ({
      params: {
        music: param({ default: 1, bind: buses.music.gain }),
        sfx: param({ default: 1, bind: buses.sfx.gain }),
        ui: param({ default: 1, bind: buses.ui.gain }),
        ambience: param({ default: 1, bind: buses.ambience.gain }),
        show: param({ default: 1, bind: buses.show.gain }),
        master: param({ default: 1, bind: master.gain }),
        duck: param({ default: 1, bind: duckGain.gain }),
        duckHz: param({ default: OPEN_HZ, bind: duckLp.frequency }),
      },
    }));
    this.buses = buses;
    this.master = master;
    this.fallback = fallback;
    buses.show.connect(buses.sfx);
    buses.sfx.connect(master);
    buses.ui.connect(master);
    buses.music.connect(bed);
    buses.ambience.connect(bed);
    bed.connect(duckLp).connect(duckGain).connect(master);
    master.connect(fallback).connect(ctx.destination);
    // (the limiter, if the browser can load its worklet)
    let limiter: Limiter | null = null;
    try {
      limiter = new Limiter(ctx, { threshold: -2, release: 0.12, lookahead: 0.005 });
    } catch {
      limiter = null;
    }
    this.limiter = limiter;
    limiter?.ready.then(
      () => this.takeOver(),
      () => {
        /* (no worklet here: the native compressor stays) */
      },
    );
  }

  /** The limiter has loaded: the master now goes through it instead of the native compressor. */
  private takeOver(): void {
    const limiter = this.limiter;
    if (!limiter || this.limited || !limiter.cells.isReady.value) return;
    this.master.disconnect(this.fallback);
    this.fallback.disconnect();
    this.master.connect(limiter.input);
    limiter.output.connect(this.context.destination);
    this.limited = true;
  }

  get output(): AudioNode {
    return this.master;
  }

  /** The node a source plays into for this bus. */
  bus(name: BusName): GainNode {
    return this.buses[name];
  }

  /** Dips the music and ambience under something in front (menu, card, show), or lifts them again: a gain of `DUCK_GAIN`
   *  and a low-pass of `DUCK_HZ`, glided to over about a quarter of a second. */
  setDuck(on: boolean): void {
    const t = this.context.currentTime;
    const gain = on ? DUCK_GAIN : 1;
    const hz = on ? DUCK_HZ : OPEN_HZ;
    const tc = on ? 0.09 : 0.18;
    for (const p of [this.params.duck, this.params.duckHz]) p.cancelAndHoldAtTime(t);
    this.params.duck.setTargetAtTime(gain, t, tc);
    this.params.duckHz.setTargetAtTime(hz, t, tc);
  }

  /** A short fade of one bus to `level` (a hush for the show, a volume from the settings). */
  setLevel(name: keyof BusParams, level: number, tc = 0.05): void {
    this.params[name].setTargetAtTime(level, this.context.currentTime, tc);
  }

  destroy(): void {
    this.limiter?.destroy();
    super.destroy();
  }
}

/* -------------------------------------------------------------- the cue synth */

/** What a synthesised sound can use to make itself (the cue table below is written against this). */
export interface Voices {
  note(t: number, f: number, d: number, v: number, type?: OscillatorType, to?: number): void;
  pad(t: number, f: number, d: number, v: number, type?: OscillatorType, bright?: number, to?: number): void;
  hiss(t: number, d: number, f: number, type: BiquadFilterType, v: number, to?: number, q?: number): void;
  ring(t: number, f: number, d: number, v: number): void;
  click(t: number, v: number, f?: number): void;
  scatter(t: number, d: number, n: number, v: number, f: number, type?: BiquadFilterType): void;
}

/** What `CueSynth.play` needs to make a sound: how loud and how high, which bus, and where in the stereo field. */
export interface PlayOpts {
  gain: number;
  pitch: number;
  bus: BusName;
  /** -1 (left) to 1 (right); 0 or missing is centre and costs no extra node. */
  pan?: number;
}

/** The synthesised effects: tones, pads and noise bursts made from oscillators and one shared buffer of noise. Each cue is
 *  a handful of short-lived nodes (as it always was); a panned cue adds one stereo panner in front of its bus. */
export class CueSynth extends AudioProcessor implements Voices {
  private readonly noise: AudioBuffer;
  /** Where the sound being made now is sent, and its pitch and level (set by `play` around the cue's code). */
  private out: AudioNode;
  private pitch = 1;
  private voiceGain = 1;
  /** The shared room: tonal cues send a share of themselves here (a small convolution reverb, quiet and short). */
  private readonly send: GainNode;

  constructor(
    ctx: BaseAudioContext,
    private readonly bus: (name: BusName) => AudioNode,
  ) {
    super(ctx, () => ({}));
    // (one second of white noise, shared by the bursts)
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.out = bus('sfx');
    // (the room: 0.8 s of decaying noise, darkened by a low-pass, made once)
    const len = Math.floor(ctx.sampleRate * 0.8);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    const room = new ConvolverNode(ctx, { buffer: ir });
    const tone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 4500 });
    const wet = new GainNode(ctx, { gain: 0.5 });
    this.send = new GainNode(ctx, { gain: 1 });
    this.send.connect(room).connect(tone).connect(wet).connect(bus('sfx'));
  }

  get output(): undefined {
    return undefined;
  }

  /** Makes `name` to start at context time `t`. */
  play(name: Cue, t: number, o: PlayOpts): void {
    this.pitch = o.pitch;
    this.voiceGain = o.gain;
    let dest = this.bus(o.bus);
    if (o.pan) {
      const p = new StereoPannerNode(this.context, { pan: o.pan });
      p.connect(dest);
      dest = p;
    }
    this.out = dest;
    SOUNDS[name](this, t);
    this.out = this.bus('sfx');
    this.pitch = 1;
    this.voiceGain = 1;
  }

  /** A tone that swoops from `f` to `to` (if given) over `d` seconds, then dies away. */
  note(t: number, f: number, d: number, v: number, type: OscillatorType = 'triangle', to?: number): void {
    const c = this.context;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f * this.pitch, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to * this.pitch, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * this.voiceGain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + d + 0.05);
    // (a longer tone gets a second voice a few cents off, for body, and a share in the room)
    if (d >= 0.15 && f > 150) {
      const o2 = c.createOscillator();
      o2.type = type;
      o2.detune.value = 7;
      o2.frequency.setValueAtTime(f * this.pitch, t);
      if (to) o2.frequency.exponentialRampToValueAtTime(to * this.pitch, t + d);
      o2.connect(new GainNode(c, { gain: 0.5 })).connect(g);
      o2.start(t);
      o2.stop(t + d + 0.05);
      g.connect(this.wet(0.22));
    }
  }

  /** A level into the room for the sound being made now. */
  private wet(level: number): AudioNode {
    const g = new GainNode(this.context, { gain: level });
    g.connect(this.send);
    return g;
  }

  /** A held, slowly swelling voice (a choir-like pad when `type` is soft): two slightly detuned oscillators through a low-pass filter. */
  pad(t: number, f: number, d: number, v: number, type: OscillatorType = 'triangle', bright = 1800, to?: number): void {
    const c = this.context;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(bright, t);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * this.voiceGain, t + d * 0.65);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    filter.connect(g).connect(this.out);
    g.connect(this.wet(0.35));
    for (const det of [0.996, 1.004]) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f * this.pitch * det, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to * this.pitch * det, t + d);
      o.connect(filter);
      o.start(t);
      o.stop(t + d + 0.05);
    }
  }

  /** A burst of filtered noise for `d` seconds, its filter at `f` (sweeping to `to` if given). */
  hiss(t: number, d: number, f: number, type: BiquadFilterType, v: number, to?: number, q = 1.5): void {
    const c = this.context;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = this.pitch;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(f * this.pitch, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(to * this.pitch, t + d);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * this.voiceGain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(filter).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + d + 0.02);
  }

  /** A bell-like ring: a tone and its overtones, ringing out. */
  ring(t: number, f: number, d: number, v: number): void {
    this.note(t, f, d, v, 'sine');
    this.note(t, f * 2.76, d * 0.5, v * 0.35, 'sine');
    this.note(t, f * 5.4, d * 0.25, v * 0.12, 'sine');
  }

  /** A tick of noise (a click, a crack of a bone). */
  click(t: number, v: number, f = 3000): void {
    this.hiss(t, 0.02, f, 'highpass', v);
  }

  /** `n` short clicks scattered over `d` seconds (crackling, clattering, rustling). */
  scatter(t: number, d: number, n: number, v: number, f: number, type: BiquadFilterType = 'highpass'): void {
    for (let i = 0; i < n; i++) this.hiss(t + Math.random() * d, 0.03 + Math.random() * 0.03, f * (0.6 + Math.random() * 0.8), type, v * (0.5 + Math.random() * 0.5));
  }
}

/* -------------------------------------------------------------- the synthesised effects */

export const SOUNDS: Record<Cue, (s: Voices, t: number) => void> = {
  // the page's own
  tap: (s, t) => s.note(t, 1400, 0.03, 0.07, 'sine'),
  summon: (s, t) => {
    s.note(t, 880, 0.5, 0.14, 'sine');
    s.note(t + 0.06, 1320, 0.45, 0.08, 'sine');
  },
  merge: (s, t) => {
    [523, 659, 784].forEach((f, i) => s.note(t + i * 0.12, f, 0.2, 0.14));
    s.note(t + 0.36, 1047, 0.6, 0.16);
  },
  // (a recycled hero's gold: two bright coin pings)
  coin: (s, t) => {
    s.note(t, 1568, 0.08, 0.12, 'triangle');
    s.note(t + 0.07, 2093, 0.3, 0.12, 'triangle');
  },
  star: (s, t) => {
    s.note(t, 988, 0.12, 0.14, 'triangle');
    s.note(t + 0.07, 1319, 0.2, 0.14, 'triangle');
  },
  levelUp: (s, t) => [659, 784, 988, 1319].forEach((f, i) => s.note(t + i * 0.09, f, i < 3 ? 0.14 : 0.5, 0.15, 'triangle')),
  boom: (s, t) => {
    s.note(t, 70, 0.9, 0.45, 'sine', 30);
    s.hiss(t, 0.5, 200, 'lowpass', 0.3);
  },
  // (a trumpet-ish fanfare, then a held chord; and a sinking line with a low drone)
  victory: (s, t) => {
    [523, 659, 784].forEach((f, i) => s.note(t + i * 0.14, f, 0.2, 0.16, 'sawtooth'));
    [523, 659, 784, 1047].forEach((f) => s.note(t + 0.45, f, 1.3, 0.1, 'triangle'));
    s.ring(t + 0.45, 2093, 1.2, 0.05);
    s.hiss(t + 0.45, 0.8, 6000, 'highpass', 0.05);
  },
  defeat: (s, t) => {
    [392, 349, 330].forEach((f, i) => s.note(t + i * 0.32, f, 0.34, 0.16, 'triangle'));
    s.note(t + 0.96, 262, 1.4, 0.16, 'triangle');
    s.note(t + 0.96, 65, 1.6, 0.22, 'sine');
  },
  skill: (s, t) => [523, 659, 784].forEach((f, i) => s.note(t + i * 0.08, f, 0.16, 0.13)),
  spell: (s, t) => {
    s.note(t, 660, 0.3, 0.13, 'sine', 990);
    s.note(t + 0.1, 1320, 0.25, 0.06, 'sine');
  },

  // blows: the swing
  swingLight: (s, t) => s.hiss(t, 0.09, 3000, 'bandpass', 0.1, 6500),
  swingSword: (s, t) => s.hiss(t, 0.14, 1200, 'bandpass', 0.14, 4200),
  swingHeavy: (s, t) => {
    s.hiss(t, 0.28, 300, 'bandpass', 0.2, 1200);
    s.note(t, 95, 0.2, 0.12, 'sine', 60);
  },
  swingSpear: (s, t) => {
    s.hiss(t, 0.08, 2000, 'highpass', 0.1);
    s.note(t, 900, 0.07, 0.04, 'sine', 1500);
  },
  swingFist: (s, t) => s.hiss(t, 0.06, 1800, 'bandpass', 0.09, 900),
  // and what it lands as
  hitLight: (s, t) => {
    s.hiss(t, 0.04, 3500, 'highpass', 0.2);
    s.note(t, 700, 0.08, 0.1, 'triangle', 400);
  },
  hitSword: (s, t) => {
    s.hiss(t, 0.05, 2500, 'highpass', 0.22);
    s.ring(t, 1700, 0.12, 0.05);
    s.note(t, 320, 0.1, 0.14, 'triangle', 200);
  },
  hitHeavy: (s, t) => {
    s.note(t, 120, 0.25, 0.34, 'sine', 45);
    s.hiss(t, 0.18, 700, 'lowpass', 0.25);
    s.click(t, 0.18, 1500);
  },
  hitBone: (s, t) => {
    s.note(t, 820, 0.04, 0.1, 'square', 500);
    s.note(t + 0.035, 560, 0.05, 0.08, 'square', 380);
    s.hiss(t, 0.06, 2800, 'highpass', 0.14);
  },
  hitFist: (s, t) => {
    s.note(t, 160, 0.14, 0.3, 'sine', 70);
    s.hiss(t, 0.08, 900, 'lowpass', 0.2);
  },
  hitSpear: (s, t) => {
    s.hiss(t, 0.06, 3000, 'highpass', 0.2);
    s.note(t, 420, 0.1, 0.13, 'triangle', 190);
  },
  // a crit lands heavier: a low boom under the hit and a bright ring over it
  crit: (s, t) => {
    s.note(t, 80, 0.4, 0.34, 'sine', 32);
    s.ring(t, 2300, 0.28, 0.07);
    s.hiss(t, 0.14, 4500, 'highpass', 0.16);
  },
  // a shield taking a blow: a clang
  block: (s, t) => {
    s.ring(t, 1250, 0.3, 0.12);
    s.ring(t, 1880, 0.2, 0.06);
    s.hiss(t, 0.05, 3500, 'highpass', 0.2);
    s.note(t, 240, 0.08, 0.14, 'triangle', 160);
  },
  // a blow that missed: a soft whiff
  miss: (s, t) => s.hiss(t, 0.13, 1500, 'bandpass', 0.07, 600),

  // shots
  bow: (s, t) => {
    s.note(t, 330, 0.14, 0.16, 'triangle', 150);
    s.note(t, 660, 0.06, 0.05, 'sine', 300);
    s.click(t, 0.1, 2000);
  },
  arrowFly: (s, t) => s.hiss(t, 0.2, 2600, 'bandpass', 0.1, 900),
  arrowHit: (s, t) => {
    s.note(t, 210, 0.07, 0.17, 'sine', 90);
    s.click(t, 0.12, 2200);
  },
  gun: (s, t) => {
    s.hiss(t, 0.14, 3200, 'lowpass', 0.38, 400);
    s.note(t, 150, 0.16, 0.32, 'sine', 40);
    s.click(t, 0.25, 1200);
  },
  // the spent shell tinkling on the ground
  shell: (s, t) => {
    s.ring(t, 4200, 0.12, 0.05);
    s.ring(t + 0.07, 3300, 0.1, 0.035);
  },
  bulletHit: (s, t) => {
    s.ring(t, 3100, 0.12, 0.05);
    s.click(t, 0.15, 2500);
  },
  // a bone spun at the foe: a whirring swish
  throwBone: (s, t) => {
    s.hiss(t, 0.2, 900, 'bandpass', 0.11, 2600);
    s.note(t, 500, 0.18, 0.04, 'square', 800);
  },
  boneClatter: (s, t) => {
    for (let i = 0; i < 4; i++) {
      const at = t + i * 0.045 + Math.random() * 0.02;
      s.note(at, 700 + Math.random() * 500, 0.035, 0.08, 'square', 400);
      s.click(at, 0.1, 2500);
    }
  },

  // the elements
  fireWhoosh: (s, t) => {
    s.hiss(t, 0.38, 350, 'bandpass', 0.22, 1300);
    s.scatter(t + 0.05, 0.25, 4, 0.06, 2500);
  },
  fireBoom: (s, t) => {
    s.note(t, 95, 0.5, 0.4, 'sine', 32);
    s.hiss(t, 0.45, 1000, 'lowpass', 0.3, 180);
    s.click(t, 0.2, 1200);
  },
  frostCrack: (s, t) => {
    s.click(t, 0.2, 4000);
    s.note(t, 2300, 0.09, 0.1, 'sine', 700);
    s.hiss(t, 0.12, 5000, 'highpass', 0.1);
  },
  frostShatter: (s, t) => {
    for (let i = 0; i < 5; i++) s.ring(t + i * 0.025 + Math.random() * 0.02, 2800 + Math.random() * 2600, 0.12, 0.045);
    s.hiss(t, 0.2, 6000, 'highpass', 0.14);
  },
  crackle: (s, t) => {
    s.scatter(t, 0.25, 9, 0.17, 3500);
    s.note(t, 140, 0.2, 0.07, 'sawtooth', 90);
  },
  thunder: (s, t) => {
    s.hiss(t, 0.9, 450, 'lowpass', 0.3, 70);
    s.note(t, 58, 0.8, 0.3, 'sine', 32);
    s.hiss(t + 0.25, 0.5, 300, 'lowpass', 0.14, 60);
  },
  holyChime: (s, t) => {
    s.ring(t, 1319, 0.7, 0.07);
    s.ring(t + 0.09, 1760, 0.7, 0.06);
    s.ring(t + 0.18, 2349, 0.8, 0.05);
  },
  // a low shadowy hum, two voices slightly apart so it beats
  shadowHum: (s, t) => {
    s.note(t, 98, 0.65, 0.12, 'sawtooth', 87);
    s.note(t, 103, 0.65, 0.09, 'sawtooth', 90);
    s.hiss(t, 0.5, 300, 'lowpass', 0.07);
  },
  poisonHiss: (s, t) => {
    s.hiss(t, 0.4, 4500, 'highpass', 0.12, 2200);
    for (let i = 0; i < 3; i++) s.note(t + 0.05 + i * 0.09, 280 + i * 70, 0.07, 0.05, 'sine', 560 + i * 70);
  },
  rustle: (s, t) => s.scatter(t, 0.3, 6, 0.1, 3200, 'bandpass'),
  windGust: (s, t) => s.hiss(t, 0.45, 500, 'bandpass', 0.16, 2400),
  earthRumble: (s, t) => {
    s.note(t, 52, 0.7, 0.3, 'sine', 30);
    s.hiss(t, 0.6, 260, 'lowpass', 0.25, 90);
    s.scatter(t + 0.1, 0.4, 4, 0.08, 700, 'lowpass');
  },
  // the meteor falling: a whistle that drops in pitch, with a rising rush under it
  meteorFall: (s, t) => {
    s.note(t, 1900, 0.85, 0.07, 'sine', 260);
    s.hiss(t, 0.85, 400, 'bandpass', 0.1, 1800);
  },
  arrowRain: (s, t) => {
    s.hiss(t, 0.5, 3000, 'bandpass', 0.1, 1400);
    s.scatter(t + 0.1, 0.5, 4, 0.08, 2600, 'bandpass');
  },

  // help
  heal: (s, t) => [1047, 1319, 1568, 2093].forEach((f, i) => s.ring(t + i * 0.05, f, 0.35, 0.04)),
  shieldHum: (s, t) => {
    s.note(t, 220, 0.55, 0.1, 'sine', 247);
    s.note(t + 0.04, 330, 0.5, 0.07, 'sine', 370);
  },
  horn: (s, t) => {
    s.note(t, 330, 0.5, 0.1, 'sawtooth', 349);
    s.note(t, 495, 0.5, 0.06, 'sawtooth', 523);
    s.hiss(t, 0.3, 1200, 'lowpass', 0.04);
  },
  pipes: (s, t) => [784, 988, 880, 1175].forEach((f, i) => s.note(t + i * 0.11, f, 0.18, 0.07, 'triangle')),

  // moves
  dash: (s, t) => s.hiss(t, 0.22, 800, 'bandpass', 0.14, 3200),
  blink: (s, t) => {
    s.note(t, 1500, 0.09, 0.08, 'sine', 380);
    s.ring(t + 0.06, 1900, 0.2, 0.05);
  },
  trap: (s, t) => {
    s.note(t, 520, 0.05, 0.14, 'square', 300);
    s.ring(t, 1500, 0.2, 0.06);
    s.click(t, 0.18, 2000);
  },

  // a big sting for an ultimate: a deep hit, a rising chord, a rush and a cymbal wash
  ultimate: (s, t) => {
    s.note(t, 60, 1, 0.42, 'sine', 30);
    [220, 277, 330].forEach((f) => s.note(t, f, 0.9, 0.09, 'sawtooth', f * 1.5));
    s.hiss(t, 0.7, 200, 'bandpass', 0.2, 3500);
    s.hiss(t + 0.35, 0.9, 6500, 'highpass', 0.12);
    s.ring(t + 0.35, 1760, 0.9, 0.06);
  },
  // the summoning hall: a choir-like swell as the circle charges, and the stinger as it flares
  riseSummon: (s, t) => {
    [220, 277, 330, 440].forEach((f, i) => s.pad(t + i * 0.12, f, 2.2, 0.05, 'triangle', 1500, f * 1.5));
    s.hiss(t, 2.2, 600, 'bandpass', 0.05, 3500, 4);
  },
  stingSummon: (s, t) => {
    s.note(t, 80, 0.7, 0.3, 'sine', 36);
    [392, 494, 587, 784].forEach((f) => s.pad(t, f, 1.6, 0.07, 'triangle', 2400));
    s.ring(t, 2093, 1.4, 0.06);
    s.hiss(t, 0.9, 6500, 'highpass', 0.08);
  },
  // a ribbon slamming in
  slam: (s, t) => {
    s.note(t, 100, 0.35, 0.4, 'sine', 40);
    s.hiss(t, 0.25, 900, 'lowpass', 0.22);
  },
  // a boss's skill: a low growl and rumble
  bossSkill: (s, t) => {
    s.note(t, 72, 0.8, 0.22, 'sawtooth', 48);
    s.note(t, 76, 0.8, 0.16, 'square', 50);
    s.hiss(t, 0.7, 250, 'lowpass', 0.22, 80);
  },

  // deaths, each in its own voice
  deathBones: (s, t) => {
    for (let i = 0; i < 7; i++) {
      const at = t + i * 0.05 + Math.random() * 0.03;
      s.note(at, 600 + Math.random() * 700, 0.04, 0.075, 'square', 350);
      s.click(at, 0.09, 2200);
    }
    s.hiss(t, 0.3, 800, 'lowpass', 0.05);
  },
  // a demon burning away: a roar that cracks as it dies
  deathBurn: (s, t) => {
    s.note(t, 130, 0.7, 0.18, 'sawtooth', 55);
    s.hiss(t, 0.8, 900, 'bandpass', 0.2, 250, 2.5);
    s.scatter(t + 0.1, 0.6, 8, 0.09, 2500);
  },
  // an ogre falling: a heavy thud, then the ground settling
  deathThud: (s, t) => {
    s.note(t, 78, 0.5, 0.45, 'sine', 28);
    s.hiss(t, 0.35, 350, 'lowpass', 0.3, 100);
    s.note(t + 0.17, 62, 0.35, 0.22, 'sine', 30);
    s.scatter(t + 0.12, 0.3, 4, 0.06, 600, 'lowpass');
  },
  deathStone: (s, t) => {
    s.hiss(t, 0.5, 900, 'lowpass', 0.22, 200);
    s.scatter(t, 0.45, 7, 0.14, 1400, 'bandpass');
    s.note(t, 100, 0.3, 0.16, 'sine', 45);
  },
  deathBlood: (s, t) => {
    s.note(t, 220, 0.45, 0.14, 'triangle', 60);
    s.hiss(t, 0.28, 600, 'lowpass', 0.12);
  },
  // a hero falling: a soft sinking chime
  deathLight: (s, t) => {
    s.ring(t, 880, 0.5, 0.07);
    s.ring(t + 0.12, 660, 0.6, 0.06);
    s.note(t, 220, 0.5, 0.07, 'triangle', 110);
  },

  // the tower: three soft footfalls up the stairs, stone and dust
  steps: (s, t) =>
    [0, 0.16, 0.33].forEach((d, i) => {
      s.note(t + d, 120 - i * 8, 0.08, 0.1, 'sine', 70);
      s.hiss(t + d, 0.06, 900 + i * 120, 'lowpass', 0.09);
      s.click(t + d, 0.03, 1800);
    }),
  // a curse: a sinking, beating low tone under a dull knell and a dry rasp
  twistCurse: (s, t) => {
    s.note(t, 98, 0.9, 0.14, 'sawtooth', 70);
    s.note(t, 104, 0.9, 0.1, 'sawtooth', 74);
    s.ring(t + 0.05, 311, 0.8, 0.06);
    s.hiss(t, 0.5, 700, 'lowpass', 0.08, 220);
  },
  // a blessing: a bright rising run into a ringing top
  twistBlessing: (s, t) => {
    [784, 988, 1319, 1568].forEach((f, i) => s.ring(t + i * 0.07, f, 0.6, 0.06));
    s.ring(t + 0.28, 2349, 0.9, 0.04);
    s.hiss(t + 0.2, 0.4, 7000, 'highpass', 0.04);
  },
  // an elite stirs: a low brassy fifth, a clang and a rising rush
  // a boss arrives: a low drone and a falling, dissonant pair under three slow hits
  sceneBoss: (s, t) => {
    s.note(t, 55, 2.4, 0.4, 'sawtooth', 40);
    s.pad(t, 110, 2.2, 0.16, 'sawtooth', 700);
    s.pad(t, 116.5, 2.2, 0.12, 'sawtooth', 700);
    [0, 0.5, 1.0].forEach((d, i) => {
      s.note(t + d, 90 - i * 12, 0.5, 0.4, 'sine', 40);
      s.hiss(t + d, 0.3, 300, 'lowpass', 0.22);
    });
    s.ring(t + 1.0, 466, 1.6, 0.06);
  },
  // a victory: a rising fanfare of triangles into a held, bright chord
  sceneVictory: (s, t) => {
    [392, 523, 659, 784].forEach((f, i) => s.note(t + i * 0.16, f, 0.3, 0.14, 'sawtooth'));
    [523, 659, 784, 1047].forEach((f) => s.note(t + 0.7, f, 1.8, 0.1, 'triangle'));
    s.ring(t + 0.7, 2093, 1.6, 0.05);
    s.hiss(t + 0.7, 0.9, 6500, 'highpass', 0.04);
  },
  eliteSting: (s, t) => {
    s.note(t, 82, 1, 0.22, 'sawtooth', 65);
    s.note(t, 123, 1, 0.12, 'sawtooth', 98);
    s.ring(t + 0.02, 440, 0.9, 0.08);
    s.note(t, 55, 0.9, 0.3, 'sine', 32);
    s.hiss(t, 0.6, 300, 'bandpass', 0.12, 2400);
  },
  // a relic set: a two-piece's open chord, and a three-piece's fuller one with a rising run and a shimmer
  setChime2: (s, t) => {
    [523, 784, 1047].forEach((f) => s.ring(t, f, 1, 0.07));
    s.pad(t, 262, 1, 0.04, 'triangle', 1600);
  },
  setChime3: (s, t) => {
    [523, 659, 784, 1047].forEach((f, i) => s.note(t + i * 0.09, f, 0.22, 0.12, 'sawtooth'));
    [523, 659, 784, 1047].forEach((f) => s.pad(t + 0.36, f, 1.5, 0.07, 'triangle', 2600));
    s.ring(t + 0.36, 2093, 1.4, 0.06);
    s.ring(t + 0.36, 3136, 1.2, 0.04);
    s.note(t + 0.36, 131, 1.3, 0.16, 'sine');
    s.hiss(t + 0.4, 0.9, 6500, 'highpass', 0.07);
  },

  // the menus: a recycle's coins tumble down, a claim's climb up with a ring
  coinRecycle: (s, t) => [2093, 1760, 1568].forEach((f, i) => s.note(t + i * 0.06, f, 0.14, 0.1, 'triangle')),
  coinClaim: (s, t) => {
    [1319, 1568, 2093].forEach((f, i) => s.note(t + i * 0.07, f, 0.16, 0.11, 'triangle'));
    s.ring(t + 0.21, 3136, 0.45, 0.05);
    s.hiss(t + 0.2, 0.3, 7500, 'highpass', 0.03);
  },
  // a lucky hire: sparkles scattered high over the merge's chime
  sparkle: (s, t) => {
    [2349, 3136, 2794, 3951, 3322].forEach((f, i) => s.ring(t + 0.18 + i * 0.06, f, 0.35, 0.035));
    s.hiss(t + 0.2, 0.5, 8000, 'highpass', 0.03);
  },
  // an auto-replay: a quick pair of ticks as it starts; a falling pair when it is stopped; a small resolving chord when it is done
  autoStart: (s, t) => {
    s.click(t, 0.08, 2600);
    s.note(t + 0.07, 880, 0.08, 0.08, 'square');
    s.note(t + 0.14, 1175, 0.12, 0.08, 'square');
  },
  autoStop: (s, t) => {
    s.note(t, 880, 0.12, 0.09, 'triangle');
    s.note(t + 0.1, 587, 0.3, 0.1, 'triangle');
  },
  autoDone: (s, t) => {
    [523, 659, 784].forEach((f, i) => s.note(t + i * 0.1, f, 0.18, 0.1, 'triangle'));
    [523, 784, 1047].forEach((f) => s.ring(t + 0.34, f, 0.7, 0.05));
  },
};
/* -------------------------------------------------------------- the music */

/** How loud a drone sits against the tracks (it is under them), and the rumble layer at its fullest. */
const DRONE_SCALE = 0.35;
const RUMBLE_SCALE = 0.12;
/** The rumble's breathing: a slow swell of this share of its level, this many times a second (not a beat, so no track can clash). */
const RUMBLE_SWELL = { depth: 0.6, hz: 0.18 };

/** One act's drone as it plays: its fade gain (the one thing that changes while it sounds) and how to let it go. */
interface DroneNow {
  fade: GainNode;
  stop: () => void;
}

/** A track as it plays: a looping source and a level for each stem, all started at the same instant so they stay in step,
 *  behind one fade for the whole track. */
interface Loop {
  fade: GainNode;
  stems: Partial<Record<Stem, { src: AudioBufferSourceNode; gain: GainNode }>>;
}

/** A track's sound: its epic file (`epicMusic.ts`) if it can be played, else the old synthesised one baked in the page. */
export async function bakeMusic(id: MusicId): Promise<Baked> {
  if (epicOf(id)) {
    try {
      return await loadEpic(id);
    } catch {
      /* (no file, or a browser that cannot decode it: the synth plays instead) */
    }
  }
  return bakeTrack(SYNTH_OF[id]);
}

/** The most tracks kept decoded or baked at once (the one playing, the one fading out and one waiting). */
const KEEP_BAKED = 3;

/** The music: three baked tracks (`musicBake.ts`; played as buffers, so no media element takes the phone's audio focus)
 *  crossfaded into one low-pass that opens with the fight's tension and closes to the tower act's ceiling, with each track's
 *  stems (pad, bass, lead, drums) mixed by the tension, a swell, a quiet synthesised rumble that fades in when the fight
 *  runs hot, and a drone under the tracks for the tower's acts. Everything leaves through `output`, to the mixer's music bus. */
export class MusicPlayer extends AudioProcessor<{ cutoff: SchedulableParam; swell: SchedulableParam; perc: SchedulableParam }> {
  private readonly baked = new Map<MusicId, Promise<Baked>>();
  private readonly loops = new Map<MusicId, Loop>();
  /** The tracks whose sound came from an epic file: they take no colour from the fight's tension or the tower's act. */
  private readonly epic = new Set<MusicId>();
  private readonly stingBufs = new Map<StingId, Promise<AudioBuffer>>();
  /** A sting is sounding: the music waits (`current` is what it will go back to) until `stingTimer` lets it. */
  private holding = false;
  private stingTimer: ReturnType<typeof setTimeout> | null = null;
  /** The sting now sounding, so a new fight can cut it short. */
  private stingNow: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private droneAct: number | null = null;
  private readonly out: GainNode;
  private readonly lowpass: BiquadFilterNode;
  private readonly percOut: GainNode;
  private readonly droneOut: GainNode;
  private noise: AudioBuffer | null = null;
  private drone: DroneNow | null = null;
  private rumble: { stop: () => void } | null = null;
  private rumbleStopping = false;
  /** Whether the music plays at all (the Music volume is not Off): when not, nothing is baked or sounding. */
  private enabled = true;
  /** The track playing (or the last that was, while the page is hushed), the fight's tension and the tower act. */
  current: MusicId | null = null;
  tension = 0;
  act: number | null = null;

  /** `bake` makes a track's stems; the page's is the offline renderer, a test's can be a stand-in. */
  constructor(
    private readonly ac: BaseAudioContext,
    private readonly bake: (track: MusicId) => Promise<Baked> = bakeMusic,
    private readonly loadStingBuffer: (id: StingId) => Promise<AudioBuffer> = loadSting,
  ) {
    const out = new GainNode(ac, { gain: 1 });
    const lowpass = new BiquadFilterNode(ac, { type: 'lowpass', frequency: OPEN_HZ, Q: 0.6 });
    const swell = new GainNode(ac, { gain: 1 });
    const percOut = new GainNode(ac, { gain: 0 });
    const droneOut = new GainNode(ac, { gain: 1 });
    super(ac, ({ param }) => ({
      params: {
        cutoff: param({ default: OPEN_HZ, bind: lowpass.frequency }),
        swell: param({ default: 1, bind: swell.gain }),
        perc: param({ default: 0, bind: percOut.gain }),
      },
    }));
    this.out = out;
    this.lowpass = lowpass;
    this.percOut = percOut;
    this.droneOut = droneOut;
    lowpass.connect(swell).connect(out);
    percOut.connect(out);
    droneOut.connect(out);
  }

  get output(): AudioNode {
    return this.out;
  }

  /** A track's stems, baked the first time they are asked for (and kept: about 7 MB a track). */
  private stems(track: MusicId): Promise<Baked> {
    let p = this.baked.get(track);
    if (!p) {
      p = this.bake(track);
      // (a bake that fails is forgotten, so the next ask tries again)
      p.catch(() => this.baked.delete(track));
      p.then((b) => {
        if (EPIC_INFO.has(b)) this.epic.add(track);
      }, () => {});
      this.baked.set(track, p);
    }
    return p;
  }

  /** Lets go of the oldest decoded tracks beyond `KEEP_BAKED`, never the ones playing, wanted or fading. */
  private trimBaked(): void {
    for (const id of [...this.baked.keys()]) {
      if (this.baked.size <= KEEP_BAKED) break;
      if (id !== this.current && !this.loops.has(id)) this.baked.delete(id);
    }
  }

  /** Whether the track now playing (or wanted) came from an epic file. */
  private get epicNow(): boolean {
    return this.current !== null && this.epic.has(this.current);
  }

  /** The synth track whose rules (calm or fighting) colour the current track: an epic one is calm and takes no act. */
  private get rules(): Track {
    return this.current && !this.epic.has(this.current) ? SYNTH_OF[this.current] : 'town';
  }

  /** The tower act that colours the music: none under an epic track. */
  private get colourAct(): number | null {
    return this.epicNow ? null : this.act;
  }

  /** Bakes a track ahead of its being needed (the battle's, once the town is playing), when the music is on. */
  warm(track: MusicId): void {
    if (this.enabled) void this.stems(track).catch(() => {});
  }

  /** Turns the music on or off (the Music volume at Off): off lets every loop go; on starts the current track again. */
  setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    if (!on) {
      for (const track of [...this.loops.keys()]) this.release(track, 0.15);
      return;
    }
    const track = this.current;
    this.current = null;
    if (track) this.setTrack(track);
  }

  /** Starts a track's stems together on a new loop, fading in from nothing (null if it is already sounding). */
  private begin(track: MusicId, baked: Baked): void {
    if (this.loops.has(track)) return;
    const ac = this.ac;
    const t = ac.currentTime + 0.05;
    const fade = new GainNode(ac, { gain: 0 });
    fade.gain.setValueAtTime(0, t);
    fade.gain.setTargetAtTime(1, t, FADE_S / 3);
    fade.connect(this.lowpass);
    const loop: Loop = { fade, stems: {} };
    const info = EPIC_INFO.get(baked);
    const rules = info ? 'town' : SYNTH_OF[track];
    const levels = stemLevels(rules, this.tension);
    const rate = rateOf(rules, this.tension, info ? null : this.act);
    for (const stem of STEMS) {
      const buffer = baked[stem];
      if (!buffer) continue;
      const gain = new GainNode(ac, { gain: levels[stem] });
      const src = new AudioBufferSourceNode(ac, { buffer, loop: true, playbackRate: rate });
      // (an epic file loops a window of itself: see `LOOP_START`)
      if (info) {
        src.loopStart = info.loop[0];
        src.loopEnd = info.loop[1];
      }
      src.connect(gain).connect(fade);
      src.start(t);
      loop.stems[stem] = { src, gain };
    }
    this.loops.set(track, loop);
  }

  /** Fades a loop out over the crossfade and lets its sources go. */
  private release(track: MusicId, seconds = FADE_S): void {
    const loop = this.loops.get(track);
    if (!loop) return;
    this.loops.delete(track);
    const t = this.ac.currentTime;
    loop.fade.gain.cancelScheduledValues(t);
    loop.fade.gain.setTargetAtTime(0, t, seconds / 3);
    setTimeout(() => {
      for (const { src } of Object.values(loop.stems)) {
        try {
          src.stop();
        } catch {
          /* (already stopped) */
        }
        src.disconnect();
      }
      loop.fade.disconnect();
    }, seconds * 1000 * 1.6);
  }

  /** Fades the old track out and the new one in, and starts the new one from the top (once it is baked: the first time a
   *  track is wanted it is a moment, and the old track plays on meanwhile). During a sting the new track waits for it. */
  setTrack(track: MusicId): void {
    if (track === this.current) return;
    const prev = this.current;
    this.current = track;
    this.applyColour(true);
    this.startDrone();
    if (!this.enabled || this.holding) return;
    this.play(track, prev);
  }

  private play(track: MusicId, prev: MusicId | null): void {
    void this.stems(track).then(
      (baked) => {
        // (the wanted track may have changed while it baked)
        if (this.current !== track || !this.enabled || this.holding) return;
        if (prev && prev !== track) this.release(prev);
        // (a scene's track is kept only while it plays: the many short scores would otherwise pile up in memory)
        for (const t of SCENE_TRACKS) if (t !== track && t !== prev) this.baked.delete(t);
        this.trimBaked();
        this.begin(track, baked);
        this.applyColour(true);
        this.startDrone();
      },
      () => {
        /* (no offline rendering here: the game plays on in silence) */
      },
    );
  }

  /** Plays a sting once over the music: the loop under it fades out, any track asked for meanwhile waits, and the music
   *  comes back (the current track, from its top) when the sting's notes have finished, a little before its tail does. */
  sting(id: StingId, tailSeconds = 6): void {
    if (!this.enabled) return;
    let p = this.stingBufs.get(id);
    if (!p) {
      p = this.loadStingBuffer(id);
      p.catch(() => this.stingBufs.delete(id));
      this.stingBufs.set(id, p);
    }
    void p.then(
      (buf) => {
        if (!this.enabled) return;
        const ac = this.ac;
        for (const track of [...this.loops.keys()]) this.release(track, 0.5);
        this.holding = true;
        this.stopSting(false);
        const src = new AudioBufferSourceNode(ac, { buffer: buf });
        const g = new GainNode(ac, { gain: 1 });
        src.connect(g).connect(this.out);
        src.start(ac.currentTime + 0.03);
        const now = { src, gain: g };
        this.stingNow = now;
        src.onended = () => {
          g.disconnect();
          if (this.stingNow === now) this.stingNow = null;
        };
        this.holding = true;
        this.stingTimer = setTimeout(() => {
          this.stingTimer = null;
          this.holding = false;
          if (this.current && this.enabled) this.play(this.current, null);
        }, Math.max(1500, (buf.duration - tailSeconds) * 1000));
      },
      () => {
        /* (no sting file: the game goes on without one) */
      },
    );
  }

  /** A fight has begun: any sting still sounding fades out and the music is let back at once. */
  stopSting(resume = true): void {
    if (this.stingTimer) clearTimeout(this.stingTimer);
    this.stingTimer = null;
    const now = this.stingNow;
    this.stingNow = null;
    if (now) {
      const t = this.ac.currentTime;
      now.gain.gain.cancelScheduledValues(t);
      now.gain.gain.setTargetAtTime(0, t, 0.15);
      setTimeout(() => {
        try {
          now.src.stop();
        } catch {
          /* (already stopped) */
        }
      }, 800);
    }
    if (this.holding) {
      this.holding = false;
      if (resume && this.current && this.enabled) this.play(this.current, null);
    }
  }

  /** The fight's tension (0 to 1). */
  setTension(tension: number): void {
    this.tension = tension;
    this.applyColour(false);
  }

  /** The tower act whose colour the music takes (null for none): the low-pass ceiling, the pace and the drone. */
  setAct(act: number | null): void {
    if (act === this.act) return;
    this.act = act;
    this.applyColour(false);
    this.startDrone();
  }

  /** Moves the low-pass, the swell, the stem levels, the pace and the rumble to where the track, tension and act put them. */
  private applyColour(snap: boolean): void {
    const track = this.current;
    if (!track) return;
    const rules = this.rules;
    const act = this.colourAct;
    const t = this.ac.currentTime;
    const tc = snap ? 0.3 : 0.6;
    this.params.cutoff.setTargetAtTime(cutoffOf(rules, this.tension, act), t, tc);
    this.params.swell.setTargetAtTime(swellOf(rules, this.tension), t, tc);
    const hot = CALM_TRACKS.has(rules) ? 0 : this.tension;
    this.params.perc.setTargetAtTime(percLevel(hot) * RUMBLE_SCALE, t, 0.8);
    const loop = this.loops.get(track);
    if (loop) {
      const levels = stemLevels(rules, this.tension);
      const rate = rateOf(rules, this.tension, act);
      for (const [stem, part] of Object.entries(loop.stems)) {
        part.gain.gain.setTargetAtTime(levels[stem as Stem], t, tc);
        part.src.playbackRate.setTargetAtTime(rate, t, 1);
      }
    }
    if (percActive(hot)) this.startRumble();
    else if (this.rumble) this.stopRumbleSoon();
  }

  /** The page is out of sight. The caller suspends the context, which holds every loop where it is, so there is nothing to do. */
  hush(): void {}

  /** The page is back: the caller resumes the context and the loops carry on. */
  wake(): void {}

  /* ------------------------------------------------------------ the drone */

  /** Starts the current act's drone (fading in over the old one's fade-out), or just lets the old one go for no act. */
  private startDrone(): void {
    // (nothing changes when the act the drone is for has not: an epic track has no drone)
    if (this.colourAct === this.droneAct && (this.drone || this.colourAct === null)) return;
    this.droneAct = this.colourAct;
    const old = this.drone;
    this.drone = null;
    if (old) {
      const t = this.ac.currentTime;
      old.fade.gain.cancelScheduledValues(t);
      old.fade.gain.setTargetAtTime(0, t, FADE_S / 3);
      setTimeout(old.stop, FADE_S * 1000 * 1.5);
    }
    const colour = colourOf(this.colourAct);
    if (colour) this.drone = this.makeDrone(colour.drone);
  }

  private makeDrone(spec: NonNullable<ReturnType<typeof colourOf>>['drone']): DroneNow {
    const ac = this.ac;
    const t = ac.currentTime;
    const fade = new GainNode(ac, { gain: 0 });
    fade.gain.setTargetAtTime(spec.level * DRONE_SCALE, t, FADE_S / 3);
    fade.connect(this.droneOut);
    // (the voices swell and fall together under one slow tremolo)
    const swell = new GainNode(ac, { gain: 1 - spec.swell.depth / 2 });
    const lfo = new OscillatorNode(ac, { frequency: spec.swell.hz });
    const lfoDepth = new GainNode(ac, { gain: spec.swell.depth / 2 });
    lfo.connect(lfoDepth).connect(swell.gain);
    const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: spec.hz, Q: 0.7 });
    lp.connect(swell).connect(fade);
    const nodes: (OscillatorNode | AudioBufferSourceNode)[] = [lfo];
    for (const v of spec.voices) {
      for (const cents of v.detune ? [-v.detune, v.detune] : [0]) {
        const o = new OscillatorNode(ac, { type: v.type, frequency: v.hz, detune: cents });
        o.connect(new GainNode(ac, { gain: v.gain / (v.detune ? 2 : 1) })).connect(lp);
        nodes.push(o);
      }
    }
    if (spec.wind) {
      const w = spec.wind;
      const src = new AudioBufferSourceNode(ac, { buffer: this.noiseBuffer(), loop: true });
      const band = new BiquadFilterNode(ac, { type: 'bandpass', frequency: w.hz, Q: w.q });
      const sweepLfo = new OscillatorNode(ac, { frequency: w.sweepHz });
      sweepLfo.connect(new GainNode(ac, { gain: w.sweep })).connect(band.frequency);
      src.connect(band).connect(new GainNode(ac, { gain: w.gain })).connect(swell);
      nodes.push(src, sweepLfo);
    }
    for (const n of nodes) n.start(t);
    return {
      fade,
      stop: () => {
        for (const n of nodes) {
          try {
            n.stop();
          } catch {
            /* (already stopped) */
          }
        }
        fade.disconnect();
      },
    };
  }

  /** Two seconds of white noise, made once (for the wind). */
  private noiseBuffer(): AudioBuffer {
    if (!this.noise) {
      const n = this.ac.sampleRate * 2;
      this.noise = this.ac.createBuffer(1, n, this.ac.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  /* ------------------------------------------------------------ the rumble layer */

  /** Starts the rumble that swells under a hot fight: low, unpitched noise breathing slowly. It is a handful of long-lived
   *  nodes (no hits to schedule, so it cannot fall out of step with a track) and is let go once it has faded out. */
  private startRumble(): void {
    if (this.rumble) return;
    const ac = this.ac;
    const src = new AudioBufferSourceNode(ac, { buffer: this.noiseBuffer(), loop: true });
    const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 150, Q: 0.7 });
    const breath = new GainNode(ac, { gain: 1 - RUMBLE_SWELL.depth / 2 });
    const lfo = new OscillatorNode(ac, { frequency: RUMBLE_SWELL.hz });
    lfo.connect(new GainNode(ac, { gain: RUMBLE_SWELL.depth / 2 })).connect(breath.gain);
    src.connect(lp).connect(breath).connect(this.percOut);
    src.start();
    lfo.start();
    this.rumble = {
      stop: () => {
        for (const n of [src, lfo]) {
          try {
            n.stop();
          } catch {
            /* (already stopped) */
          }
        }
        breath.disconnect();
      },
    };
  }

  /** Lets the rumble go once its layer has faded out (the fade is about a second and a half). */
  private stopRumbleSoon(): void {
    if (this.rumbleStopping) return;
    this.rumbleStopping = true;
    setTimeout(() => {
      this.rumbleStopping = false;
      if (this.rumble && !percActive(CALM_TRACKS.has(this.rules) ? 0 : this.tension)) {
        this.rumble.stop();
        this.rumble = null;
      }
    }, 1800);
  }

  destroy(): void {
    if (this.stingTimer) clearTimeout(this.stingTimer);
    this.rumble?.stop();
    this.drone?.stop();
    for (const track of [...this.loops.keys()]) this.release(track, 0.01);
    super.destroy();
  }
}


