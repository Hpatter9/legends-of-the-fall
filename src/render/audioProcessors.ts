// The page's audio parts, each an audiorective AudioProcessor: `CueSynth` makes the synthesised effects, `BusMixer` holds
// the buses (music, sfx, ui, ambience) and the master with its limiter, and `MusicPlayer` plays the looped tracks with
// the tower acts' colour (a low-pass ceiling, a pace and a drone for each act; a battle's music stays steady). They know nothing of the
// sim or the DOM; `sound.ts` creates them through the engine and is the page's API. Not imported by the tests.

import { AudioProcessor, type SchedulableParam } from '@audiorective/core';
import { Limiter } from '@audiorective/effects';
import type { Cue } from './soundRules';
import { CombatAudioBank, type CombatSample } from './combatAudioBank';
import { EPIC_INFO, bakeTrack, type Baked } from './musicBake';
import { SCENE_TRACKS, STEMS, stemLevels, type Stem } from './musicScore';
import { DUCK_GAIN, DUCK_HZ, OPEN_HZ, colourOf, musicColour } from './audioRules';
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
  thump(t: number, f: number, d: number, v: number, to?: number): void;
  clang(t: number, f: number, d: number, v: number): void;
  snap(t: number, v: number, f?: number): void;
  sample?(name: CombatSample, t: number, gain?: number, pitch?: number): boolean;
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
  private readonly bank = new CombatAudioBank();
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
    void this.bank.load(ctx);
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

  /** A heavy sub-bass body thump / impact drop: rapid exponential frequency swoop for hits and explosions. */
  thump(t: number, f: number, d: number, v: number, to = 28): void {
    const c = this.context;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * this.pitch, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(18, to * this.pitch), t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * this.voiceGain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + d + 0.05);
  }

  /** Inharmonic metallic ring (for steel blades, clangs, shield blocks, armor): multiple dissonant resonant partials decaying naturally. */
  clang(t: number, f: number, d: number, v: number): void {
    const ratios = [1.0, 1.48, 2.14, 2.86];
    const amps = [1.0, 0.65, 0.4, 0.25];
    ratios.forEach((r, i) => {
      this.note(t, f * r, d * (1 - i * 0.15), v * amps[i], 'sine');
    });
  }

  /** A fast, crisp acoustic snap (for bow release, bone crack, gunshot crack, whip). */
  snap(t: number, v: number, f = 3500): void {
    this.hiss(t, 0.025, f, 'highpass', v * 1.2, f * 0.4, 2.5);
    this.note(t, f * 0.4, 0.03, v * 0.6, 'triangle', f * 0.1);
  }

  /** Plays an authentic recorded combat sample from the soundbank if loaded. Returns true if played, false if not yet available. */
  sample(name: CombatSample, t: number, gain = 1, pitch = 1): boolean {
    const buf = this.bank.get(name);
    if (!buf) return false;
    const c = this.context;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = this.pitch * pitch;
    const g = c.createGain();
    const targetGain = Math.max(0.0001, gain * this.voiceGain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(targetGain, t + 0.004);
    src.connect(g).connect(this.out);
    src.start(t);
    return true;
  }
}

/* -------------------------------------------------------------- the synthesised effects */

export const SOUNDS: Record<Cue, (s: Voices, t: number) => void> = {
  // the page's own
  tap: (s, t) => {
    s.snap(t, 0.08, 2800);
    s.note(t, 1400, 0.025, 0.06, 'sine', 700);
  },
  summon: (s, t) => {
    s.clang(t, 880, 0.6, 0.16);
    s.clang(t + 0.08, 1320, 0.7, 0.14);
    s.hiss(t, 0.4, 1800, 'bandpass', 0.12, 3800);
  },
  merge: (s, t) => {
    [523, 659, 784].forEach((f, i) => s.clang(t + i * 0.1, f, 0.35, 0.16));
    s.clang(t + 0.32, 1047, 0.85, 0.22);
    s.ring(t + 0.32, 2093, 0.7, 0.08);
  },
  // (a recycled hero's gold: bright crisp coin chimes)
  coin: (s, t) => {
    s.clang(t, 2489, 0.18, 0.14);
    s.clang(t + 0.06, 3322, 0.28, 0.15);
  },
  star: (s, t) => {
    s.clang(t, 1319, 0.22, 0.16);
    s.clang(t + 0.07, 1976, 0.35, 0.16);
    s.ring(t + 0.07, 3951, 0.3, 0.06);
  },
  levelUp: (s, t) => {
    [523, 659, 784, 1047].forEach((f, i) => {
      s.note(t + i * 0.08, f, 0.2, 0.16, 'triangle');
      s.clang(t + i * 0.08, f * 1.5, 0.3, 0.08);
    });
    s.clang(t + 0.34, 1568, 0.9, 0.2);
    s.ring(t + 0.34, 3136, 0.8, 0.08);
    s.thump(t + 0.34, 130, 0.3, 0.18, 50);
  },
  boom: (s, t) => {
    if (s.sample?.('boom', t, 1.15)) return;
    s.thump(t, 85, 0.8, 0.55, 24);
    s.hiss(t, 0.65, 350, 'lowpass', 0.42, 60);
    s.scatter(t + 0.05, 0.4, 6, 0.14, 1800);
  },
  victory: (s, t) => {
    [523, 659, 784].forEach((f, i) => s.note(t + i * 0.14, f, 0.22, 0.18, 'sawtooth'));
    [523, 659, 784, 1047].forEach((f) => s.note(t + 0.45, f, 1.4, 0.12, 'triangle'));
    s.clang(t + 0.45, 2093, 1.2, 0.1);
    s.hiss(t + 0.45, 0.8, 6000, 'highpass', 0.06);
  },
  defeat: (s, t) => {
    [392, 349, 330].forEach((f, i) => s.note(t + i * 0.32, f, 0.35, 0.18, 'triangle'));
    s.note(t + 0.96, 262, 1.5, 0.18, 'triangle');
    s.thump(t + 0.96, 75, 1.6, 0.3, 24);
  },
  skill: (s, t) => {
    [523, 659, 784].forEach((f, i) => s.clang(t + i * 0.07, f, 0.22, 0.14));
    s.hiss(t, 0.2, 2200, 'bandpass', 0.1, 4800);
  },
  spell: (s, t) => {
    s.note(t, 550, 0.35, 0.16, 'sine', 1100);
    s.clang(t + 0.08, 1650, 0.35, 0.12);
    s.hiss(t, 0.25, 3000, 'highpass', 0.12, 1500);
  },
  // (the king's spells' own sounds are rendered files, `spellBank.ts`; these two only name their place in the mix, and
  // sound like a plain spell if played by name)
  kingCast: (s, t) => SOUNDS.spell(s, t),
  kingSpell: (s, t) => SOUNDS.spell(s, t),

  // blows: the swing
  swingLight: (s, t) => {
    s.hiss(t, 0.08, 2400, 'bandpass', 0.15, 5500, 3);
    s.note(t, 500, 0.06, 0.04, 'triangle', 900);
  },
  swingSword: (s, t) => {
    s.hiss(t, 0.13, 900, 'bandpass', 0.22, 3600, 2.8);
    s.note(t, 380, 0.08, 0.05, 'triangle', 750);
  },
  swingHeavy: (s, t) => {
    s.hiss(t, 0.26, 260, 'bandpass', 0.28, 1400, 2);
    s.thump(t, 85, 0.22, 0.24, 40);
  },
  swingSpear: (s, t) => {
    s.hiss(t, 0.09, 1800, 'bandpass', 0.16, 4500, 3);
    s.note(t, 750, 0.07, 0.05, 'sine', 1400);
  },
  swingFist: (s, t) => {
    s.hiss(t, 0.07, 1200, 'bandpass', 0.16, 600, 2);
    s.thump(t, 120, 0.08, 0.15, 55);
  },

  // and what it lands as
  hitLight: (s, t) => {
    if (s.sample?.('hitSword', t, 0.45, 1.25)) return;
    s.snap(t, 0.22, 3800);
    s.thump(t, 280, 0.07, 0.18, 110);
  },
  hitSword: (s, t) => {
    if (s.sample?.('hitSword', t, 0.75)) return;
    s.clang(t, 1420, 0.18, 0.2);
    s.snap(t, 0.28, 4200);
    s.thump(t, 160, 0.11, 0.26, 50);
  },
  hitHeavy: (s, t) => {
    if (s.sample?.('hitBlunt', t, 0.95, 0.85)) return;
    s.thump(t, 105, 0.32, 0.48, 26);
    s.hiss(t, 0.2, 550, 'lowpass', 0.35, 110);
    s.click(t, 0.25, 1200);
  },
  hitBone: (s, t) => {
    if (s.sample?.('hitBlunt', t, 0.7, 1.25)) return;
    s.snap(t, 0.26, 3200);
    s.clang(t, 950, 0.1, 0.16);
    s.thump(t, 240, 0.08, 0.18, 80);
  },
  hitFist: (s, t) => {
    if (s.sample?.('hitBlunt', t, 0.75, 1.1)) return;
    s.thump(t, 145, 0.16, 0.38, 45);
    s.hiss(t, 0.1, 750, 'lowpass', 0.26, 180);
  },
  hitSpear: (s, t) => {
    if (s.sample?.('hitSword', t, 0.65, 1.15)) return;
    s.snap(t, 0.25, 4500);
    s.clang(t, 1180, 0.14, 0.18);
    s.thump(t, 200, 0.1, 0.22, 60);
  },
  crit: (s, t) => {
    if (s.sample?.('crit', t, 1.1)) return;
    s.thump(t, 70, 0.48, 0.52, 22);
    s.clang(t, 2150, 0.38, 0.26);
    s.ring(t, 3400, 0.32, 0.14);
    s.hiss(t, 0.18, 5500, 'highpass', 0.25);
  },
  block: (s, t) => {
    if (s.sample?.('block', t, 0.95)) return;
    s.clang(t, 920, 0.34, 0.28);
    s.clang(t, 1540, 0.24, 0.18);
    s.snap(t, 0.26, 4500);
    s.thump(t, 170, 0.1, 0.22, 65);
  },
  miss: (s, t) => s.hiss(t, 0.14, 1200, 'bandpass', 0.1, 450, 2),

  // shots
  bow: (s, t) => {
    if (s.sample?.('bow', t, 0.85)) return;
    s.snap(t, 0.24, 3200);
    s.note(t, 290, 0.13, 0.22, 'triangle', 120);
    s.note(t, 580, 0.05, 0.08, 'sine', 240);
  },
  arrowFly: (s, t) => s.hiss(t, 0.22, 2200, 'bandpass', 0.14, 750, 3),
  arrowHit: (s, t) => {
    if (s.sample?.('arrowHit', t, 0.8)) return;
    s.snap(t, 0.28, 3600);
    s.thump(t, 230, 0.08, 0.28, 65);
  },
  gun: (s, t) => {
    s.snap(t, 0.42, 4500);
    s.thump(t, 130, 0.26, 0.48, 32);
    s.hiss(t, 0.2, 2400, 'lowpass', 0.38, 300);
  },
  shell: (s, t) => {
    s.clang(t, 4200, 0.14, 0.08);
    s.clang(t + 0.08, 3400, 0.12, 0.06);
  },
  bulletHit: (s, t) => {
    s.snap(t, 0.3, 4000);
    s.clang(t, 2900, 0.14, 0.1);
    s.thump(t, 180, 0.08, 0.22, 60);
  },
  throwBone: (s, t) => {
    s.hiss(t, 0.2, 850, 'bandpass', 0.14, 2800, 2.5);
    s.note(t, 480, 0.18, 0.05, 'square', 780);
  },
  boneClatter: (s, t) => {
    for (let i = 0; i < 5; i++) {
      const at = t + i * 0.04 + Math.random() * 0.02;
      s.snap(at, 0.12, 3200 + Math.random() * 800);
      s.clang(at, 850 + Math.random() * 400, 0.06, 0.08);
    }
  },

  // the elements
  fireWhoosh: (s, t) => {
    s.hiss(t, 0.38, 380, 'bandpass', 0.26, 1600, 2);
    s.scatter(t + 0.04, 0.28, 6, 0.08, 2800);
  },
  fireBoom: (s, t) => {
    if (s.sample?.('boom', t, 1.0)) return;
    s.thump(t, 85, 0.65, 0.58, 22);
    s.hiss(t, 0.55, 850, 'lowpass', 0.45, 120);
    s.scatter(t + 0.05, 0.35, 8, 0.15, 2600);
    s.click(t, 0.28, 1200);
  },
  frostCrack: (s, t) => {
    s.snap(t, 0.28, 4800);
    s.clang(t, 2400, 0.14, 0.14);
    s.note(t, 2100, 0.1, 0.12, 'sine', 600);
  },
  frostShatter: (s, t) => {
    for (let i = 0; i < 6; i++) s.ring(t + i * 0.022, 2600 + i * 400, 0.16, 0.055);
    s.hiss(t, 0.22, 6500, 'highpass', 0.18);
    s.snap(t, 0.25, 5200);
  },
  crackle: (s, t) => {
    s.scatter(t, 0.28, 12, 0.22, 4200);
    s.note(t, 130, 0.22, 0.09, 'sawtooth', 80);
  },
  thunder: (s, t) => {
    s.snap(t, 0.4, 5200);
    s.thump(t, 58, 1.1, 0.52, 20);
    s.hiss(t, 1.1, 380, 'lowpass', 0.42, 55);
    s.hiss(t + 0.22, 0.7, 240, 'lowpass', 0.26, 40);
  },
  holyChime: (s, t) => {
    s.clang(t, 1047, 0.8, 0.12);
    s.clang(t + 0.08, 1319, 0.8, 0.11);
    s.clang(t + 0.16, 1568, 0.9, 0.1);
    s.clang(t + 0.24, 2093, 1.1, 0.12);
    s.ring(t + 0.24, 3136, 0.9, 0.06);
  },
  shadowHum: (s, t) => {
    s.note(t, 87, 0.75, 0.16, 'sawtooth', 75);
    s.note(t, 92, 0.75, 0.14, 'sawtooth', 80);
    s.thump(t, 65, 0.75, 0.22, 35);
    s.hiss(t, 0.6, 280, 'lowpass', 0.1);
  },
  poisonHiss: (s, t) => {
    s.hiss(t, 0.45, 4800, 'highpass', 0.15, 2000, 2);
    for (let i = 0; i < 4; i++) s.note(t + 0.04 + i * 0.08, 260 + i * 65, 0.08, 0.06, 'sine', 520 + i * 65);
  },
  rustle: (s, t) => s.scatter(t, 0.32, 8, 0.12, 3400, 'bandpass'),
  windGust: (s, t) => s.hiss(t, 0.5, 450, 'bandpass', 0.2, 2200, 2),
  earthRumble: (s, t) => {
    s.thump(t, 48, 0.85, 0.42, 22);
    s.hiss(t, 0.7, 240, 'lowpass', 0.32, 70);
    s.scatter(t + 0.1, 0.5, 6, 0.1, 650, 'lowpass');
  },
  meteorFall: (s, t) => {
    s.note(t, 1800, 0.9, 0.09, 'sine', 220);
    s.hiss(t, 0.9, 350, 'bandpass', 0.15, 1600, 2);
    s.thump(t + 0.4, 90, 0.5, 0.3, 40);
  },
  arrowRain: (s, t) => {
    s.hiss(t, 0.55, 2800, 'bandpass', 0.14, 1200, 2.5);
    s.scatter(t + 0.08, 0.5, 8, 0.12, 2800, 'bandpass');
  },

  // help
  heal: (s, t) => {
    [1047, 1319, 1568, 2093].forEach((f, i) => s.clang(t + i * 0.05, f, 0.5, 0.08));
    s.hiss(t, 0.35, 3200, 'bandpass', 0.08, 6400);
  },
  shieldHum: (s, t) => {
    s.note(t, 220, 0.6, 0.14, 'sine', 247);
    s.note(t + 0.04, 330, 0.55, 0.1, 'sine', 370);
    s.clang(t, 880, 0.35, 0.12);
  },
  horn: (s, t) => {
    s.note(t, 330, 0.55, 0.14, 'sawtooth', 349);
    s.note(t, 495, 0.55, 0.09, 'sawtooth', 523);
    s.thump(t, 110, 0.4, 0.22, 60);
    s.hiss(t, 0.35, 1100, 'lowpass', 0.06);
  },
  pipes: (s, t) => [784, 988, 880, 1175].forEach((f, i) => s.note(t + i * 0.11, f, 0.2, 0.09, 'triangle')),

  // moves
  dash: (s, t) => {
    s.hiss(t, 0.2, 700, 'bandpass', 0.18, 3500, 3);
    s.thump(t, 160, 0.12, 0.2, 50);
  },
  blink: (s, t) => {
    s.note(t, 1600, 0.09, 0.1, 'sine', 350);
    s.clang(t + 0.05, 2100, 0.3, 0.1);
    s.hiss(t, 0.15, 4500, 'highpass', 0.1);
  },
  trap: (s, t) => {
    s.snap(t, 0.3, 3800);
    s.clang(t, 850, 0.25, 0.2);
    s.thump(t, 140, 0.15, 0.26, 45);
  },

  // big moments
  ultimate: (s, t) => {
    s.thump(t, 65, 1.2, 0.65, 18);
    [220, 277, 330, 440].forEach((f) => s.note(t, f, 1.0, 0.14, 'sawtooth', f * 1.5));
    s.clang(t + 0.15, 1760, 1.1, 0.16);
    s.hiss(t, 0.8, 280, 'bandpass', 0.32, 4500);
    s.hiss(t + 0.3, 1.0, 7000, 'highpass', 0.18);
    s.ring(t + 0.3, 2637, 1.0, 0.08);
  },
  riseSummon: (s, t) => {
    [220, 277, 330, 440].forEach((f, i) => s.pad(t + i * 0.12, f, 2.2, 0.07, 'triangle', 1600, f * 1.5));
    s.hiss(t, 2.2, 550, 'bandpass', 0.08, 3800, 4);
    s.thump(t + 1.2, 70, 0.9, 0.35, 30);
  },
  stingSummon: (s, t) => {
    s.thump(t, 85, 0.85, 0.5, 26);
    [392, 494, 587, 784].forEach((f) => s.pad(t, f, 1.8, 0.09, 'triangle', 2500));
    s.clang(t, 2093, 1.5, 0.14);
    s.hiss(t, 1.0, 6500, 'highpass', 0.12);
  },
  slam: (s, t) => {
    s.thump(t, 95, 0.45, 0.6, 28);
    s.snap(t, 0.35, 2200);
    s.hiss(t, 0.3, 750, 'lowpass', 0.35);
  },
  bossSkill: (s, t) => {
    s.thump(t, 65, 0.9, 0.45, 22);
    s.note(t, 72, 0.85, 0.28, 'sawtooth', 44);
    s.note(t, 76, 0.85, 0.22, 'square', 46);
    s.hiss(t, 0.75, 260, 'lowpass', 0.3, 70);
  },

  // deaths
  deathBones: (s, t) => {
    if (s.sample?.('death', t, 0.75, 1.2)) return;
    for (let i = 0; i < 8; i++) {
      const at = t + i * 0.045 + Math.random() * 0.02;
      s.snap(at, 0.14, 3000 + Math.random() * 900);
      s.clang(at, 650 + Math.random() * 600, 0.05, 0.1);
    }
    s.hiss(t, 0.35, 750, 'lowpass', 0.08);
  },
  deathBurn: (s, t) => {
    s.note(t, 130, 0.8, 0.24, 'sawtooth', 48);
    s.hiss(t, 0.85, 950, 'bandpass', 0.28, 200, 2.5);
    s.scatter(t + 0.08, 0.65, 10, 0.14, 2600);
    s.thump(t, 90, 0.4, 0.25, 35);
  },
  deathThud: (s, t) => {
    if (s.sample?.('death', t, 0.95)) return;
    s.thump(t, 75, 0.55, 0.58, 22);
    s.hiss(t, 0.4, 320, 'lowpass', 0.4, 80);
    s.note(t + 0.16, 58, 0.38, 0.28, 'sine', 26);
    s.scatter(t + 0.12, 0.35, 5, 0.09, 550, 'lowpass');
  },
  deathStone: (s, t) => {
    if (s.sample?.('death', t, 0.95, 0.85)) return;
    s.thump(t, 90, 0.4, 0.4, 30);
    s.snap(t, 0.35, 2400);
    s.hiss(t, 0.55, 850, 'lowpass', 0.3, 160);
    s.scatter(t, 0.5, 8, 0.18, 1300, 'bandpass');
  },
  deathBlood: (s, t) => {
    if (s.sample?.('death', t, 0.85, 1.05)) return;
    s.thump(t, 160, 0.35, 0.28, 45);
    s.snap(t, 0.25, 2800);
    s.hiss(t, 0.3, 550, 'lowpass', 0.18);
  },
  deathLight: (s, t) => {
    s.clang(t, 880, 0.6, 0.1);
    s.clang(t + 0.12, 660, 0.7, 0.09);
    s.note(t, 220, 0.55, 0.09, 'triangle', 95);
  },

  // the tower
  steps: (s, t) =>
    [0, 0.16, 0.33].forEach((d, i) => {
      s.thump(t + d, 110 - i * 8, 0.09, 0.18, 45);
      s.hiss(t + d, 0.07, 850 + i * 100, 'lowpass', 0.12);
      s.click(t + d, 0.04, 1800);
    }),
  twistCurse: (s, t) => {
    s.thump(t, 85, 0.9, 0.25, 30);
    s.note(t, 98, 0.9, 0.18, 'sawtooth', 65);
    s.note(t, 104, 0.9, 0.14, 'sawtooth', 68);
    s.clang(t + 0.05, 311, 0.9, 0.1);
    s.hiss(t, 0.55, 650, 'lowpass', 0.12, 200);
  },
  twistBlessing: (s, t) => {
    [784, 988, 1319, 1568].forEach((f, i) => s.clang(t + i * 0.07, f, 0.7, 0.09));
    s.clang(t + 0.28, 2349, 1.0, 0.08);
    s.hiss(t + 0.2, 0.45, 7000, 'highpass', 0.06);
  },
  sceneBoss: (s, t) => {
    s.thump(t, 55, 2.4, 0.55, 24);
    s.pad(t, 110, 2.2, 0.22, 'sawtooth', 750);
    s.pad(t, 116.5, 2.2, 0.18, 'sawtooth', 750);
    [0, 0.5, 1.0].forEach((d, i) => {
      s.thump(t + d, 85 - i * 10, 0.55, 0.5, 30);
      s.hiss(t + d, 0.35, 320, 'lowpass', 0.28);
    });
    s.clang(t + 1.0, 466, 1.8, 0.12);
  },
  sceneVictory: (s, t) => {
    [392, 523, 659, 784].forEach((f, i) => s.note(t + i * 0.16, f, 0.32, 0.18, 'sawtooth'));
    [523, 659, 784, 1047].forEach((f) => s.note(t + 0.7, f, 1.9, 0.14, 'triangle'));
    s.clang(t + 0.7, 2093, 1.8, 0.1);
    s.hiss(t + 0.7, 0.9, 6500, 'highpass', 0.06);
  },
  eliteSting: (s, t) => {
    s.thump(t, 55, 0.95, 0.45, 24);
    s.note(t, 82, 1, 0.28, 'sawtooth', 60);
    s.note(t, 123, 1, 0.18, 'sawtooth', 90);
    s.clang(t + 0.02, 440, 1.0, 0.14);
    s.hiss(t, 0.65, 320, 'bandpass', 0.18, 2600);
  },
  standBoss: (s, t) => {
    s.thump(t, 49, 1.2, 0.42, 22);
    s.note(t, 73, 1.4, 0.24, 'sawtooth', 58);
    s.note(t + 0.35, 110, 1.2, 0.22, 'sawtooth', 85);
    s.clang(t + 0.35, 330, 1.2, 0.1);
    s.hiss(t, 0.55, 280, 'lowpass', 0.18);
  },
  kingHit: (s, t) => {
    s.thump(t, 90, 0.35, 0.42, 35);
    s.clang(t + 0.01, 523, 0.45, 0.12);
  },

  // relics & menus
  setChime2: (s, t) => {
    [523, 659, 784].forEach((f, i) => s.clang(t + i * 0.09, f, 0.5, 0.14));
    s.clang(t + 0.28, 1047, 0.7, 0.18);
  },
  setChime3: (s, t) => {
    [523, 659, 784, 1047].forEach((f, i) => s.clang(t + i * 0.08, f, 0.6, 0.16));
    s.clang(t + 0.32, 1319, 0.9, 0.22);
    s.ring(t + 0.32, 2637, 0.8, 0.08);
  },
  coinRecycle: (s, t) => {
    [2093, 1760, 1568, 1319].forEach((f, i) => s.clang(t + i * 0.06, f, 0.25, 0.12));
  },
  coinClaim: (s, t) => {
    [1319, 1568, 2093, 2637, 3136].forEach((f, i) => s.clang(t + i * 0.06, f, 0.28, 0.12));
    s.ring(t + 0.3, 4186, 0.5, 0.06);
  },
  sparkle: (s, t) => {
    [2349, 3136, 2794, 3951, 3322].forEach((f, i) => s.ring(t + 0.15 + i * 0.05, f, 0.4, 0.05));
    s.hiss(t + 0.18, 0.55, 8000, 'highpass', 0.04);
  },
  autoStart: (s, t) => {
    s.snap(t, 0.12, 3200);
    s.note(t + 0.06, 880, 0.09, 0.1, 'square');
    s.note(t + 0.12, 1175, 0.14, 0.1, 'square');
  },
  autoStop: (s, t) => {
    s.note(t, 880, 0.14, 0.12, 'triangle');
    s.note(t + 0.09, 587, 0.35, 0.14, 'triangle');
  },
  autoDone: (s, t) => {
    [523, 659, 784].forEach((f, i) => s.clang(t + i * 0.09, f, 0.25, 0.12));
    [523, 784, 1047].forEach((f) => s.clang(t + 0.3, f, 0.8, 0.1));
  },
};
/* -------------------------------------------------------------- the music */

/** How loud a drone sits against the tracks (it is under them). */
const DRONE_SCALE = 0.35;
/** A synthesised track's stems are mixed as a fight at its height had them (`stemLevels`): the full band, the same all battle. */
const FULL_BAND = 1;

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
 *  crossfaded into one low-pass that closes to the tower act's ceiling, and a drone under the tracks for the tower's acts.
 *  A battle's track plays at one steady level and tone (the fight's tension no longer colours it: `musicColour`); a track
 *  can be asked for at a lower level (the victory's triumph bed). Everything leaves through `output`, to the mixer's music bus. */
export class MusicPlayer extends AudioProcessor<{ cutoff: SchedulableParam }> {
  private readonly baked = new Map<MusicId, Promise<Baked>>();
  private readonly loops = new Map<MusicId, Loop>();
  /** The tracks whose sound came from an epic file: they take no colour from the tower's act. A track with a file counts as
   *  one before it is decoded (so the act's colour never touches it while it loads); `synth` holds those that fell back. */
  private readonly epic = new Set<MusicId>();
  private readonly synth = new Set<MusicId>();
  private readonly stingBufs = new Map<StingId, Promise<AudioBuffer>>();
  /** A sting is sounding: the music waits (`current` is what it will go back to) until `stingTimer` lets it. */
  private holding = false;
  private stingTimer: ReturnType<typeof setTimeout> | null = null;
  /** The sting now sounding, so a new fight can cut it short. */
  private stingNow: { src: AudioBufferSourceNode; gain: GainNode; id: StingId } | null = null;
  /** Counts the stings asked for, so a sting's file decoded after another was asked for (or after it was stopped) stays silent. */
  private stingAsks = 0;
  private droneAct: number | null = null;
  private readonly out: GainNode;
  private readonly lowpass: BiquadFilterNode;
  private readonly droneOut: GainNode;
  private noise: AudioBuffer | null = null;
  private drone: DroneNow | null = null;
  /** Whether the music plays at all (the Music volume is not Off): when not, nothing is baked or sounding. */
  private enabled = true;
  /** The track playing (or the last that was, while the page is hushed), the level it is wanted at (1 is full) and the tower act. */
  current: MusicId | null = null;
  level = 1;
  act: number | null = null;

  /** `bake` makes a track's stems; the page's is the offline renderer, a test's can be a stand-in. */
  constructor(
    private readonly ac: BaseAudioContext,
    private readonly bake: (track: MusicId) => Promise<Baked> = bakeMusic,
    private readonly loadStingBuffer: (id: StingId) => Promise<AudioBuffer> = loadSting,
  ) {
    const out = new GainNode(ac, { gain: 1 });
    const lowpass = new BiquadFilterNode(ac, { type: 'lowpass', frequency: OPEN_HZ, Q: 0.6 });
    const droneOut = new GainNode(ac, { gain: 1 });
    super(ac, ({ param }) => ({
      params: {
        cutoff: param({ default: OPEN_HZ, bind: lowpass.frequency }),
      },
    }));
    this.out = out;
    this.lowpass = lowpass;
    this.droneOut = droneOut;
    lowpass.connect(out);
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
        else this.synth.add(track);
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

  /** Whether a track is (or, not yet decoded, will be) played from its epic file. */
  private isEpic(track: MusicId): boolean {
    return this.epic.has(track) || (!!epicOf(track) && !this.synth.has(track));
  }

  /** Whether the track now playing (or wanted) came from an epic file. */
  private get epicNow(): boolean {
    return this.current !== null && this.isEpic(this.current);
  }

  /** The tower act that colours the music: none under an epic track. */
  private get colourAct(): number | null {
    return this.epicNow ? null : this.act;
  }

  /** Bakes a track ahead of its being needed (the battle's, once the town is playing), when the music is on. */
  warm(track: MusicId): void {
    if (this.enabled) void this.stems(track).catch(() => {});
  }

  /** Decodes a sting ahead of its being needed (the victory fanfare, while a battle plays), so it rings the moment it is asked for. */
  warmSting(id: StingId): void {
    if (this.enabled) void this.stingBuffer(id).catch(() => {});
  }

  private stingBuffer(id: StingId): Promise<AudioBuffer> {
    let p = this.stingBufs.get(id);
    if (!p) {
      p = this.loadStingBuffer(id);
      p.catch(() => this.stingBufs.delete(id));
      this.stingBufs.set(id, p);
    }
    return p;
  }

  /** The loops sounding now (a track fading out among them), for the debug view. */
  get sounding(): MusicId[] {
    return [...this.loops.keys()];
  }

  /** The sting ringing now, or null (for the debug view). */
  get stingId(): StingId | null {
    return this.stingNow?.id ?? null;
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
    fade.gain.setTargetAtTime(this.level, t, FADE_S / 3);
    fade.connect(this.lowpass);
    const loop: Loop = { fade, stems: {} };
    const info = EPIC_INFO.get(baked);
    const rules = info ? 'town' : SYNTH_OF[track];
    const levels = stemLevels(rules, FULL_BAND);
    const rate = musicColour(info ? null : this.act).rate;
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
      // (a track with an intro starts before its loop window: the intro plays once)
      src.start(t, info ? info.from ?? info.loop[0] : 0);
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
   *  track is wanted it is a moment, and the old track plays on meanwhile). During a sting the new track waits for it.
   *  `level` is how loud the track sits (1 is its full level); the same track at another level glides there and plays on. */
  setTrack(track: MusicId, level = 1): void {
    if (track === this.current) {
      if (level !== this.level) {
        this.level = level;
        const loop = this.loops.get(track);
        if (loop) {
          const t = this.ac.currentTime;
          loop.fade.gain.cancelScheduledValues(t);
          loop.fade.gain.setTargetAtTime(level, t, FADE_S / 3);
        }
      }
      return;
    }
    const prev = this.current;
    this.current = track;
    this.level = level;
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

  /** Plays a sting once over the music: the loop under it fades out at once, any track asked for meanwhile waits (the hold
   *  begins now, not when the file is decoded, so a track asked for straight after the sting is the one it leads into), and the
   *  music comes back (the current track, from its top) when the sting's notes have finished, a little before its tail does. */
  sting(id: StingId, tailSeconds = 6): void {
    if (!this.enabled) return;
    this.stopSting(false);
    for (const track of [...this.loops.keys()]) this.release(track, 0.5);
    this.holding = true;
    const asked = ++this.stingAsks;
    void this.stingBuffer(id).then(
      (buf) => {
        // (another sting, or the end of this one, came first)
        if (asked !== this.stingAsks || !this.holding || !this.enabled) return;
        const ac = this.ac;
        const src = new AudioBufferSourceNode(ac, { buffer: buf });
        const g = new GainNode(ac, { gain: 1 });
        src.connect(g).connect(this.out);
        src.start(ac.currentTime + 0.03);
        const now = { src, gain: g, id };
        this.stingNow = now;
        src.onended = () => {
          g.disconnect();
          if (this.stingNow === now) this.stingNow = null;
        };
        this.stingTimer = setTimeout(() => {
          this.stingTimer = null;
          this.holding = false;
          if (this.current && this.enabled) this.play(this.current, null);
        }, Math.max(1500, (buf.duration - tailSeconds) * 1000));
      },
      () => {
        // (no sting file: the game goes on without one, and the music comes back at once)
        if (asked !== this.stingAsks || !this.holding) return;
        this.holding = false;
        if (this.current && this.enabled) this.play(this.current, null);
      },
    );
  }

  /** A fight has begun: any sting still sounding fades out and the music is let back at once. */
  stopSting(resume = true): void {
    if (this.stingTimer) clearTimeout(this.stingTimer);
    this.stingTimer = null;
    // (a sting still being decoded is let go too)
    this.stingAsks++;
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

  /** The tower act whose colour the music takes (null for none): the low-pass ceiling, the pace and the drone. */
  setAct(act: number | null): void {
    if (act === this.act) return;
    this.act = act;
    this.applyColour(false);
    this.startDrone();
  }

  /** Moves the low-pass and the stems' pace to where the act puts them (a battle's track is not moved by the fight). */
  private applyColour(snap: boolean): void {
    if (!this.current) return;
    const colour = musicColour(this.colourAct);
    const t = this.ac.currentTime;
    this.params.cutoff.setTargetAtTime(colour.cutoff, t, snap ? 0.3 : 0.6);
    const loop = this.loops.get(this.current);
    if (loop) for (const part of Object.values(loop.stems)) part.src.playbackRate.setTargetAtTime(colour.rate, t, 1);
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

  destroy(): void {
    if (this.stingTimer) clearTimeout(this.stingTimer);
    this.drone?.stop();
    for (const track of [...this.loops.keys()]) this.release(track, 0.01);
    super.destroy();
  }
}


