// The ambience beds: one quiet synthesised place-sound under the music (a campfire, a tavern, a crypt, a storm...), as an
// audiorective AudioProcessor on the mixer's ambience bus. `setScene` crossfades to the scene's bed over about 1.5 s; the old
// bed's nodes are stopped and disconnected once it has faded, so at most two beds sound (and only during a fade). A bed is a
// handful of long-lived nodes (noise through filters, held tones, slow LFOs, all described in `BEDS` in `audioRules.ts`) plus
// random one-shots (a pop of the fire, a bird, a drip, far thunder) made a few seconds apart by one timer that runs twice a
// second and creates nothing unless a shot is due. This is the renderer, so the one-shots take their luck from `Math.random`.
// Not imported by the page's DOM code; `sound.ts` creates it, and the tests build it on the fake context.

import { AudioProcessor } from '@audiorective/core';
import { BEDS, BED_FADE_S, BED_LEVEL_MAX, ShotClock, bedOf, pickShot, type BedId, type BedLayer, type BedSpec, type Scene, type ShotKind } from './audioRules';
import { DRUM_SCALE } from './holdSound';
import type { Area } from '../sim/board';

/** How often the one-shot timer looks at the clock (ms). */
const TICK_MS = 500;
/** The one-shots' level against their bed's: they are a touch on top of it, never a sound that stands out from the music. */
const SHOT_SCALE = 0.3;

/** A bed as it plays: its crossfade gain (the one thing that moves while it sounds), where its one-shots go, and how to let it go. */
interface LiveBed {
  id: BedId;
  spec: BedSpec;
  fade: GainNode;
  /** The sum of the bed's layers (and the echo): its one-shots join here. */
  bus: GainNode;
  clock: ShotClock;
  stop: () => void;
}

export class AmbientBeds extends AudioProcessor {
  private readonly out: GainNode;
  private noise: AudioBuffer | null = null;
  private current: LiveBed | null = null;
  /** The bed fading out after a change of scene. */
  private leaving: LiveBed | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  /** The scene asked for last (null for none). */
  scene: Scene | null = null;
  /** The land asked for with it, and a bed that stands in for the scene's own while it is set (an Assault's war table or hold). */
  private land: Area | null = null;
  private over: BedId | null = null;
  /** A hold's drums (HOLD-SOUND): the one-shot they beat with and their clock, while any stands. */
  private drums: { kind: ShotKind; gap: readonly [number, number]; clock: ShotClock } | null = null;
  /** The level of the one-shot being made now against a bed's own (the drums are louder). */
  private shotScale = 1;

  constructor(
    ctx: BaseAudioContext,
    private readonly rand: () => number = Math.random,
  ) {
    super(ctx, () => ({}));
    this.out = new GainNode(ctx, { gain: 1 });
  }

  get output(): AudioNode {
    return this.out;
  }

  /** The bed playing now (not counting one fading out), if any. */
  get bed(): BedId | null {
    return this.current?.id ?? null;
  }

  /** How many beds are sounding: one, or two while a crossfade settles. */
  get live(): number {
    return (this.current ? 1 : 0) + (this.leaving ? 1 : 0);
  }

  /** Crossfades to the bed for `scene` (null for silence), a field fight's by its `land`. The same bed again changes nothing. */
  setScene(scene: Scene | null, land: Area | null = null): void {
    this.scene = scene;
    this.land = land;
    this.sync();
  }

  /** A bed that takes the scene's place while it is set (the Assault: its war table, its hold), or null to give the scene its own back. */
  setOver(bed: BedId | null): void {
    this.over = bed;
    this.sync();
  }

  /** The hold's drums: they beat with `kind`, `gap` seconds apart (lowest and highest), until told otherwise; null for none. The same
   *  again changes nothing, so a beat is never hurried by being asked for twice. */
  setDrums(kind: ShotKind | null, gap: readonly [number, number] | null = null): void {
    if (!kind || !gap) {
      this.drums = null;
      return;
    }
    if (this.drums && this.drums.kind === kind && this.drums.gap[0] === gap[0] && this.drums.gap[1] === gap[1]) return;
    this.drums = { kind, gap, clock: new ShotClock(gap, this.rand, this.context.currentTime) };
  }

  /** Whether a hold's drums are beating (for the debug view and the tests). */
  get drumming(): ShotKind | null {
    return this.drums?.kind ?? null;
  }

  /** Crossfades to the bed wanted now. */
  private sync(): void {
    const id = this.over ?? (this.scene ? bedOf(this.scene, this.land) : null);
    if (id === (this.current?.id ?? null)) return;
    // (a bed still fading from the last change goes at once, so no more than two ever sound together)
    if (this.leaving) this.release(this.leaving, 0.02, 80);
    this.leaving = null;
    if (this.current) {
      this.leaving = this.current;
      this.release(this.current, BED_FADE_S / 4, (BED_FADE_S + 0.3) * 1000);
    }
    this.current = id ? this.make(BEDS[id]) : null;
    if (id && !this.timer) this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  /** Fades a bed to nothing with time constant `tc`, then stops and disconnects it `ms` later. */
  private release(bed: LiveBed, tc: number, ms: number): void {
    const t = this.context.currentTime;
    bed.fade.gain.cancelScheduledValues(t);
    bed.fade.gain.setTargetAtTime(0, t, tc);
    setTimeout(() => {
      if (this.leaving === bed) this.leaving = null;
      bed.stop();
    }, ms);
  }

  /* ------------------------------------------------------------ building a bed */

  /** Four seconds of white noise, made once and shared by every bed and shot. */
  private noiseBuffer(): AudioBuffer {
    if (!this.noise) {
      const ctx = this.context;
      const n = Math.floor(ctx.sampleRate * 4);
      this.noise = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = this.rand() * 2 - 1;
    }
    return this.noise;
  }

  private make(spec: BedSpec): LiveBed {
    const ac = this.context;
    const t = ac.currentTime;
    const all: AudioNode[] = [];
    const sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
    const gain = (v: number): GainNode => {
      const g = new GainNode(ac, { gain: v });
      all.push(g);
      return g;
    };
    const fade = gain(0);
    fade.connect(this.out);
    fade.gain.setValueAtTime(0, t);
    fade.gain.setTargetAtTime(1, t, BED_FADE_S / 4);
    const trunk = gain(Math.min(spec.level, BED_LEVEL_MAX));
    trunk.connect(fade);
    const bus = gain(1);
    bus.connect(trunk);
    // (an echoing hall: the bus feeds a delay that feeds itself a little, and the wet joins the dry)
    if (spec.echo) {
      const e = spec.echo;
      const delay = new DelayNode(ac, { delayTime: e.delay, maxDelayTime: 1 });
      all.push(delay);
      const fb = gain(e.feedback);
      const wet = gain(e.mix);
      bus.connect(delay);
      delay.connect(fb).connect(delay);
      delay.connect(wet).connect(trunk);
    }
    for (const layer of spec.layers) this.layer(layer, bus, all, sources, gain);
    // (each noise source starts somewhere else in the buffer, so two layers never carry the same hiss)
    for (const s of sources) {
      if (s instanceof AudioBufferSourceNode) s.start(t, this.rand() * 3);
      else s.start(t);
    }
    let stopped = false;
    return {
      id: spec.id,
      spec,
      fade,
      bus,
      clock: new ShotClock(spec.gap, this.rand, t),
      stop: () => {
        if (stopped) return;
        stopped = true;
        for (const s of sources) {
          try {
            s.stop();
          } catch {
            /* (already stopped) */
          }
          s.disconnect();
        }
        for (const n of all) n.disconnect();
      },
    };
  }

  /** One layer of a bed: its source, filter (swept slowly), tremolos and level, joined to `bus`. */
  private layer(l: BedLayer, bus: GainNode, all: AudioNode[], sources: (OscillatorNode | AudioBufferSourceNode)[], gain: (v: number) => GainNode): void {
    const ac = this.context;
    let head: AudioNode;
    if (l.kind === 'noise') {
      const buffer = this.noiseBuffer();
      const src = new AudioBufferSourceNode(ac, { buffer, loop: true });
      const filter = new BiquadFilterNode(ac, { type: l.filter ?? 'lowpass', frequency: l.hz, Q: l.q ?? 0.7 });
      all.push(filter);
      src.connect(filter);
      if (l.sweep) {
        const lfo = new OscillatorNode(ac, { frequency: l.sweep.hz });
        lfo.connect(gain(l.sweep.depth)).connect(filter.frequency);
        sources.push(lfo);
      }
      sources.push(src);
      head = filter;
    } else {
      const cents = l.detune ? [-l.detune, l.detune] : [0];
      const mix = gain(1 / cents.length);
      for (const c of cents) {
        const o = new OscillatorNode(ac, { type: l.wave ?? 'sine', frequency: l.hz, detune: c });
        o.connect(mix);
        sources.push(o);
      }
      head = mix;
    }
    for (const m of l.mods ?? []) {
      const g = gain(1 - m.depth / 2);
      const lfo = new OscillatorNode(ac, { frequency: m.hz });
      lfo.connect(gain(m.depth / 2)).connect(g.gain);
      sources.push(lfo);
      head.connect(g);
      head = g;
    }
    head.connect(gain(l.gain)).connect(bus);
  }

  /* ------------------------------------------------------------ the one-shots */

  /** Twice a second: if the bed's next shot is due (and the clock is running), make it. Nothing is created otherwise. */
  private tick(): void {
    const ac = this.context;
    const bed = this.current;
    if (!bed || ac.state !== 'running') return;
    const now = ac.currentTime;
    // (the hold's drums, over its air)
    if (this.drums?.clock.due(now)) {
      this.drums.clock.fired(now);
      this.shotScale = DRUM_SCALE;
      this.shot(bed, this.drums.kind, now + 0.02);
      this.shotScale = 1;
    }
    if (!bed.clock.due(now)) return;
    bed.clock.fired(now);
    this.shot(bed, pickShot(bed.spec.shots, this.rand()), now + 0.02);
  }

  /** Makes one one-shot of `kind` into the bed, from time `t`. Each is a few short-lived nodes. */
  shot(bed: Pick<LiveBed, 'bus'>, kind: ShotKind, t: number): void {
    const r = this.rand;
    const out = bed.bus;
    switch (kind) {
      // the fire crackles: a run of small bright cracks scattered over a second, now and then a bigger pop among them
      case 'pop': {
        const n = 3 + Math.floor(r() * 5);
        for (let i = 0; i < n; i++) this.burst(out, t + r() * 1.1, 0.015 + r() * 0.03, 1800 + r() * 2600, 'bandpass', 0.15 + r() * 0.2, 1.5);
        if (r() < 0.4) this.burst(out, t + r() * 0.8, 0.05, 900 + r() * 500, 'bandpass', 0.4, 1.2);
        break;
      }
      // a mug set down: two small bright rings
      case 'clink':
        this.tone(out, t, 2300 + r() * 300, 0.28, 0.14);
        this.tone(out, t, 3500 + r() * 400, 0.18, 0.07);
        this.tone(out, t + 0.1, 1950 + r() * 250, 0.22, 0.08);
        break;
      // a shimmer: two high pings
      case 'twinkle': {
        const hz = [2093, 2637, 3136, 3520];
        this.tone(out, t, hz[Math.floor(r() * hz.length)], 0.9, 0.1);
        this.tone(out, t + 0.14, hz[Math.floor(r() * hz.length)], 0.8, 0.07);
        break;
      }
      // a far bird: a few quick rising chirps, dulled by distance
      case 'bird': {
        const far = new BiquadFilterNode(this.context, { type: 'lowpass', frequency: 4200 });
        far.connect(out);
        const f0 = 2500 + r() * 900;
        const n = 2 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) this.tone(far, t + i * 0.15, f0 * (1 + i * 0.04), 0.09, 0.1, f0 * 1.3);
        break;
      }
      // a distant war drum: two soft low thumps
      case 'drum':
        this.tone(out, t, 78, 0.4, 0.5, 42);
        this.tone(out, t + 0.3, 70, 0.45, 0.35, 38);
        break;
      // a drip: a small falling ping, and its echo off the stone
      case 'drip': {
        const f = 1300 + r() * 500;
        this.tone(out, t, f, 0.12, 0.2, f * 0.65);
        this.tone(out, t + 0.34, f * 0.97, 0.12, 0.08, f * 0.63);
        break;
      }
      // far thunder: a long low roll that swells and dies
      case 'thunder':
        this.burst(out, t, 3.4, 300, 'lowpass', 0.8, 0.9, 70, 0.8);
        this.tone(out, t + 0.1, 46, 2.6, 0.3, 32);
        break;
      // a gust down the hall: a slow rise and fall of wind
      case 'gust':
        this.burst(out, t, 2.4, 380, 'bandpass', 0.5, 0.8, 1100, 0.9);
        break;
      // a frog: two or three quick low croaks, each a few fast pulses
      case 'frog': {
        const f = 170 + r() * 60;
        const n = 2 + Math.floor(r() * 2);
        for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) this.tone(out, t + i * 0.32 + k * 0.03, f * (1 - k * 0.03), 0.04, 0.3);
        break;
      }
      // a far crow: two harsh caws, dulled by distance
      case 'crow': {
        const far = new BiquadFilterNode(this.context, { type: 'lowpass', frequency: 3000 });
        far.connect(out);
        for (let i = 0; i < 2; i++) {
          this.burst(far, t + i * 0.38, 0.24, 1150 + r() * 200, 'bandpass', 0.5, 5, 900);
          this.tone(far, t + i * 0.38, 760 + r() * 60, 0.22, 0.12, 620);
        }
        break;
      }
      // a far hammer on an anvil: a bright ring of a few out-of-tune partials, struck twice
      case 'anvil':
        for (let i = 0; i < 2; i++) {
          const at = t + i * (0.42 + r() * 0.08);
          for (const [f, v] of [[1240, 0.12], [1870, 0.07], [2650, 0.05]] as const) this.tone(out, at, f * (1 + r() * 0.01), 0.8, v);
        }
        break;
      // a page turning: a soft rustle of paper, and a smaller one as it settles
      case 'page':
        this.burst(out, t, 0.22, 3500, 'bandpass', 0.35, 0.8, 2400, 0.35);
        this.burst(out, t + 0.24, 0.1, 2800, 'bandpass', 0.18, 0.9);
        break;
      // a wolf, far off: a long howl that rises, holds and falls away
      case 'howl': {
        const far = new BiquadFilterNode(this.context, { type: 'lowpass', frequency: 1800 });
        far.connect(out);
        const f = 330 + r() * 90;
        this.tone(far, t, f, 0.5, 0.16, f * 1.45);
        this.tone(far, t + 0.45, f * 1.45, 1.3, 0.2, f * 1.1);
        if (r() < 0.5) this.tone(far, t + 0.7, f * 1.2, 1.1, 0.09, f * 0.9);
        break;
      }
      // a bell tolling: a low strike and its sour overtones, ringing a long time
      case 'bell': {
        const f = 147 + r() * 8;
        for (const [k, v, d] of [[1, 0.4, 3.2], [2.02, 0.2, 2.4], [2.76, 0.12, 1.6], [5.4, 0.05, 0.8]] as const) this.tone(out, t, f * k, d, v);
        break;
      }
      // a shrine's small bell: one clear high ring, and a second a little under it
      case 'chime': {
        const f = [1047, 1175, 1397][Math.floor(r() * 3)];
        this.tone(out, t, f, 1.6, 0.14);
        this.tone(out, t, f * 2.76, 0.7, 0.05);
        this.tone(out, t + 0.5 + r() * 0.3, f * 0.75, 1.4, 0.09);
        break;
      }
      // steam let go: a hiss that opens and dies
      case 'steam':
        this.burst(out, t, 1.3, 3800, 'highpass', 0.3, 0.7, 6500, 0.15);
        break;
      // a far horn, low: a long note that swells
      case 'lowHorn':
        this.tone(out, t, 98, 1.8, 0.4, 104);
        this.tone(out, t + 0.05, 147, 1.7, 0.2, 156);
        this.burst(out, t, 1.6, 300, 'bandpass', 0.15, 2, 420, 0.5);
        break;
      // a piper's phrase: four or five soft notes of a minor scale, wandering
      case 'pipe': {
        const scale = [587, 659, 698, 784, 880];
        let k = Math.floor(r() * scale.length);
        const n = 4 + Math.floor(r() * 2);
        for (let i = 0; i < n; i++) {
          this.tone(out, t + i * 0.22, scale[k], 0.3, 0.14);
          k = Math.max(0, Math.min(scale.length - 1, k + (r() < 0.5 ? -1 : 1)));
        }
        break;
      }
      // a great taiko: one deep beat and two quick ones after it
      case 'taiko':
        for (const [at, v] of [[0, 0.7], [0.5, 0.4], [0.72, 0.5]] as const) {
          this.tone(out, t + at, 110, 0.5, v, 46);
          this.burst(out, t + at, 0.08, 600, 'bandpass', v * 0.4, 1.2);
        }
        break;
      // a steam hammer: the hiss of its lift, then the fall, iron on iron
      case 'hammer':
        this.burst(out, t, 0.4, 3000, 'highpass', 0.14, 0.7, 5000, 0.6);
        this.tone(out, t + 0.42, 95, 0.5, 0.4, 34);
        for (const [f, v] of [[820, 0.14], [1230, 0.08], [1890, 0.05]] as const) this.tone(out, t + 0.42, f * (1 + r() * 0.01), 0.6, v);
        break;
      // a fire flaring up: a roar that swells and settles, a few sparks
      case 'flare':
        this.burst(out, t, 1.6, 500, 'lowpass', 0.6, 0.8, 1400, 0.4);
        for (let i = 0; i < 4; i++) this.burst(out, t + 0.3 + r() * 0.9, 0.02 + r() * 0.03, 2000 + r() * 2400, 'bandpass', 0.2, 1.5);
        break;
    }
  }

  /** A short tone that decays, swooping to `to` if given. */
  private tone(dest: AudioNode, t: number, f: number, d: number, v: number, to?: number): void {
    const ac = this.context;
    const o = new OscillatorNode(ac, { type: 'sine', frequency: f });
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    const g = new GainNode(ac, { gain: 0.0001 });
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * SHOT_SCALE * this.shotScale, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + d + 0.05);
  }

  /** A burst of filtered noise: up quickly (or over `rise` of its length) and down again. */
  private burst(dest: AudioNode, t: number, d: number, f: number, type: BiquadFilterType, v: number, q = 1, to?: number, rise = 0.05): void {
    const ac = this.context;
    const src = new AudioBufferSourceNode(ac, { buffer: this.noiseBuffer() });
    const filter = new BiquadFilterNode(ac, { type, frequency: f, Q: q });
    if (to) filter.frequency.exponentialRampToValueAtTime(to, t + d);
    const g = new GainNode(ac, { gain: 0.0001 });
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * SHOT_SCALE * this.shotScale, t + Math.max(0.004, d * rise));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(filter).connect(g).connect(dest);
    src.start(t, this.rand() * 2);
    src.stop(t + d + 0.02);
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.leaving?.stop();
    this.current?.stop();
    this.leaving = this.current = null;
    super.destroy();
  }
}
