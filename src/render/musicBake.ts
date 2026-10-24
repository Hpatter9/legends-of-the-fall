// Bakes the music: each track's four stems (`musicScore.ts`) are played once through an OfflineAudioContext, faster than
// real time, into looping buffers that `MusicPlayer` then plays back. Playing a buffer costs a phone next to nothing (no
// oscillators run during play), and a buffer is not a media element, so it does not take the phone's audio focus away from
// the music app the owner is listening to. The tail of each render (echoes, cymbals, pad releases) is folded back onto the
// start of the loop so it joins without a click. The sample rate is low (the loops sit under a low-pass anyway) to keep
// the buffers small: about 7 MB for a track.

import { STEMS, SCORES, STEM_TRIM, TRACK_RMS, hzOf, loopSeconds, noiseStream, type Drum, type Hit, type Note, type Score, type Stem, type Track } from './musicScore';

/** The rate the loops are baked at (Hz); the page's own context resamples them as they play. */
export const BAKE_RATE = 24000;
/** Seconds rendered past the loop's end and folded back onto its start. */
const TAIL_S = 2.5;

/** The baked stems of a track: one looping buffer each (the drums' is null for a track with none). */
export type Baked = Record<Stem, AudioBuffer | null>;

/** What a track played from an epic file adds to its `Baked` (`epicMusic.ts`): the window of the buffer that loops, in seconds. Such a
 *  track is one stem, mixed by nothing, and is left uncoloured by the tower's acts and by the fight's tension. */
export const EPIC_INFO = new WeakMap<Baked, { loop: [number, number] }>();

/** Makes an offline context (the browser's; a test hands in something else). */
export type OfflineMaker = (channels: number, length: number, rate: number) => OfflineAudioContext;

export const browserOffline: OfflineMaker = (channels, length, rate) => new OfflineAudioContext(channels, length, rate);

/** Renders one track. `make` makes the offline contexts. Resolves with the stems, scaled so the track as a whole has the
 *  loudness `TRACK_RMS` says (with every stem at full level). */
export async function bakeTrack(track: Track, make: OfflineMaker = browserOffline): Promise<Baked> {
  const score = SCORES[track];
  const out: Baked = { pad: null, bass: null, lead: null, drums: null };
  const parts = await Promise.all(STEMS.map((stem) => (stemEmpty(score, stem) ? null : renderStem(track, score, stem, make))));
  STEMS.forEach((stem, i) => (out[stem] = parts[i]));
  for (const stem of STEMS) if (out[stem]) scale(out[stem]!, STEM_TRIM[track][stem]);
  // (the stems are about uncorrelated, so their powers add)
  let power = 0;
  for (const b of Object.values(out)) if (b) power += rms(b) ** 2;
  const k = power > 0 ? TRACK_RMS[track] / Math.sqrt(power) : 1;
  for (const b of Object.values(out)) if (b) scale(b, k);
  return out;
}

const stemEmpty = (score: Score, stem: Stem): boolean => (stem === 'drums' ? score.drums.length === 0 : score[stem].length === 0);

async function renderStem(track: Track, score: Score, stem: Stem, make: OfflineMaker): Promise<AudioBuffer> {
  const spb = 60 / score.bpm;
  const loop = Math.round(loopSeconds(score) * BAKE_RATE);
  const tail = Math.round(TAIL_S * BAKE_RATE);
  const oc = make(stem === 'pad' ? 2 : 1, loop + tail, BAKE_RATE);
  const noise = noiseBuffer(oc, track === 'town' ? 7 : track === 'battle' ? 11 : 13);
  // (the lead goes through a dotted-eighth echo)
  const lead = stem === 'lead' ? echo(oc, spb * 0.75, track === 'town' ? 0.4 : 0.3, track === 'town' ? 0.35 : 0.25) : null;
  const bus = lead ?? oc.destination;
  if (stem === 'drums') for (const h of score.drums) drum(oc, bus, noise, h, spb);
  else for (const n of score[stem]) VOICES[stem](oc, bus, n, spb, track);
  const rendered = await oc.startRendering();
  return fold(rendered, loop, oc);
}

/** The render with its tail laid onto the loop's start: the result is exactly `loop` frames. */
function fold(r: AudioBuffer, loop: number, oc: OfflineAudioContext): AudioBuffer {
  const out = oc.createBuffer(r.numberOfChannels, loop, BAKE_RATE);
  for (let c = 0; c < r.numberOfChannels; c++) {
    const src = r.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < loop; i++) dst[i] = src[i];
    for (let i = loop, j = 0; i < src.length && j < loop; i++, j++) dst[j] += src[i];
  }
  return out;
}

export function rms(b: AudioBuffer): number {
  let sum = 0;
  let n = 0;
  for (let c = 0; c < b.numberOfChannels; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
    n += d.length;
  }
  return n ? Math.sqrt(sum / n) : 0;
}

function scale(b: AudioBuffer, k: number): void {
  for (let c = 0; c < b.numberOfChannels; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] *= k;
  }
}

/** A second of noise from a fixed stream, so every bake of a track is the same. */
function noiseBuffer(oc: OfflineAudioContext, seed: number): AudioBuffer {
  const b = oc.createBuffer(1, oc.sampleRate, oc.sampleRate);
  const next = noiseStream(seed);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = next();
  return b;
}

/** A feedback echo: what goes in comes out dry and again, quieter, every `time` seconds. Returns the node to play into. */
function echo(oc: OfflineAudioContext, time: number, feedback: number, wet: number): GainNode {
  const input = new GainNode(oc, { gain: 1 });
  const delay = new DelayNode(oc, { delayTime: time, maxDelayTime: 2 });
  const fb = new GainNode(oc, { gain: feedback });
  const tone = new BiquadFilterNode(oc, { type: 'lowpass', frequency: 3200 });
  input.connect(oc.destination);
  input.connect(delay);
  delay.connect(tone).connect(fb).connect(delay);
  tone.connect(new GainNode(oc, { gain: wet })).connect(oc.destination);
  return input;
}

/** A note's loudness shape: quick attack, then down to nothing by `end`. */
function env(oc: OfflineAudioContext, t: number, attack: number, hold: number, end: number, v: number): GainNode {
  const g = new GainNode(oc, { gain: 0 });
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + attack);
  g.gain.setValueAtTime(v, t + Math.max(attack, hold));
  g.gain.linearRampToValueAtTime(0, t + end);
  return g;
}

function osc(oc: OfflineAudioContext, type: OscillatorType, hz: number, t: number, end: number, detune = 0): OscillatorNode {
  const o = new OscillatorNode(oc, { type, frequency: hz, detune });
  o.start(t);
  o.stop(end);
  return o;
}

type Voice = (oc: OfflineAudioContext, bus: AudioNode, n: Note, spb: number, track: Track) => void;

/** The pitched stems. A pad is three detuned voices spread across the stereo field under a slowly opening low-pass. */
const VOICES: Record<'pad' | 'bass' | 'lead', Voice> = {
  pad: (oc, bus, n, spb, track) => {
    const t = n.t * spb;
    const d = n.d * spb;
    const type: OscillatorType = track === 'town' ? 'triangle' : 'sawtooth';
    const lp = new BiquadFilterNode(oc, { type: 'lowpass', Q: 0.5 });
    lp.frequency.setValueAtTime(track === 'town' ? 900 : 700, t);
    lp.frequency.linearRampToValueAtTime(track === 'town' ? 1800 : 2400, t + d * 0.7);
    const g = env(oc, t, d * 0.3, d * 0.8, d + 0.4, n.v * (type === 'sawtooth' ? 0.1 : 0.2));
    lp.connect(g).connect(bus);
    [-9, 0, 9].forEach((cents, i) => {
      const o = osc(oc, type, hzOf(n.midi), t, t + d + 0.5, cents);
      const pan = new StereoPannerNode(oc, { pan: (i - 1) * 0.6 });
      o.connect(pan).connect(lp);
    });
  },
  bass: (oc, bus, n, spb, track) => {
    const t = n.t * spb;
    const d = n.d * spb;
    const hz = hzOf(n.midi);
    const lp = new BiquadFilterNode(oc, { type: 'lowpass', frequency: track === 'town' ? 500 : 900, Q: 1.2 });
    lp.frequency.setValueAtTime(track === 'town' ? 500 : 1400, t);
    lp.frequency.exponentialRampToValueAtTime(track === 'town' ? 320 : 380, t + Math.min(d, 0.3));
    const g = env(oc, t, 0.01, d * 0.5, d + 0.05, n.v * (track === 'town' ? 0.5 : 0.42));
    lp.connect(g).connect(bus);
    osc(oc, track === 'town' ? 'sine' : 'sawtooth', hz, t, t + d + 0.1).connect(lp);
    if (track !== 'town') osc(oc, 'sine', hz / 2, t, t + d + 0.1).connect(new GainNode(oc, { gain: 0.8 })).connect(g);
  },
  lead: (oc, bus, n, spb, track) => {
    const t = n.t * spb;
    const d = n.d * spb;
    const hz = hzOf(n.midi);
    if (track === 'town') {
      // (a soft plucked bell: the note and its second partial, dying away)
      const g = env(oc, t, 0.01, 0.02, d + 0.9, n.v * 0.3);
      osc(oc, 'triangle', hz, t, t + d + 1).connect(g).connect(bus);
      osc(oc, 'sine', hz * 2, t, t + d + 1).connect(new GainNode(oc, { gain: 0.35 })).connect(g);
      return;
    }
    const boss = track === 'boss';
    const lp = new BiquadFilterNode(oc, { type: 'lowpass', Q: 2 });
    lp.frequency.setValueAtTime(boss ? 4200 : 3400, t);
    lp.frequency.exponentialRampToValueAtTime(boss ? 900 : 1100, t + Math.max(d, 0.12));
    const g = env(oc, t, 0.008, d * 0.6, d + 0.08, n.v * (boss ? 0.2 : 0.17));
    lp.connect(g).connect(bus);
    osc(oc, boss ? 'sawtooth' : 'square', hz, t, t + d + 0.1, -6).connect(lp);
    osc(oc, boss ? 'sawtooth' : 'square', hz, t, t + d + 0.1, 6).connect(lp);
  },
};

/** One drum hit, built from a sweeping sine and/or filtered noise. */
function drum(oc: OfflineAudioContext, bus: AudioNode, noise: AudioBuffer, h: Hit, spb: number): void {
  const t = h.t * spb;
  const burst = (type: BiquadFilterType, hz: number, d: number, v: number, at = t) => {
    const src = new AudioBufferSourceNode(oc, { buffer: noise, loop: true });
    const f = new BiquadFilterNode(oc, { type, frequency: hz, Q: 0.8 });
    src.connect(f).connect(env(oc, at, 0.002, 0.004, d, v)).connect(bus);
    src.start(at, (h.t * 0.37) % 0.8);
    src.stop(at + d + 0.05);
  };
  const thump = (from: number, to: number, d: number, v: number) => {
    const o = new OscillatorNode(oc, { type: 'sine' });
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + d * 0.6);
    o.connect(env(oc, t, 0.002, 0.01, d, v)).connect(bus);
    o.start(t);
    o.stop(t + d + 0.05);
  };
  const shape: Record<Drum, () => void> = {
    kick: () => {
      thump(160, 48, 0.28, h.v * 0.9);
      burst('highpass', 2500, 0.015, h.v * 0.12);
    },
    snare: () => {
      burst('bandpass', 1900, 0.18, h.v * 0.35);
      thump(240, 160, 0.1, h.v * 0.25);
    },
    hat: () => burst('highpass', 7500, 0.045, h.v * 0.16),
    tom: () => thump(150 * 2 ** ((h.pitch ?? 0) / 12), 80 * 2 ** ((h.pitch ?? 0) / 12), 0.35, h.v * 0.7),
    crash: () => burst('highpass', 3800, 2.2, h.v * 0.16),
  };
  shape[h.kind]();
}
