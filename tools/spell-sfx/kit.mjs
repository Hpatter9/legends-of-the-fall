// The sound-design kit for the king's spells: a stereo buffer (`Sfx`) and the layers each spell is built from (swept tones,
// swept noise, crackles, bell pings, thumps, voices through formants), with a room and a finishing limiter. It borrows the
// filters, the hall and a few instruments (choir, brass, bells, drums) from tools/epic-music/. Deterministic: every random
// choice comes from the sound's own seeded stream, so a render is the same every time.

import { SR, TAU, mtof, Biquad, Rng, convolve, limit } from '../epic-music/dsp.mjs';
import { hallIR } from '../epic-music/fx.mjs';
import { Bus, choir, brass, bell, timpani, drum, swell } from '../epic-music/instruments.mjs';

export { SR, mtof, choir, brass, bell, timpani, drum, swell };

/** One sound being made: `seconds` long (the tail is trimmed when it is finished), stereo. */
export class Sfx {
  constructor(seconds, seed) {
    this.n = Math.ceil(seconds * SR);
    this.bus = new Bus(this.n, false);
    this.rng = new Rng(seed);
  }
  get L() {
    return this.bus.L;
  }
  get R() {
    return this.bus.R;
  }
  /** Adds one sample at index `i`, panned (-1 left to 1 right, constant power). */
  put(i, x, pan) {
    if (i < 0 || i >= this.n) return;
    const p = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
    this.bus.L[i] += x * Math.cos(p) * Math.SQRT2;
    this.bus.R[i] += x * Math.sin(p) * Math.SQRT2;
  }
}

/** An envelope at `tt` seconds: a rise over `a` (curved by `ap`), held for `hold`, then falling with time constant `tau`; and a
 *  short fade at `len` so nothing ends on a click. */
function envAt(tt, len, a, hold, tau, ap = 1) {
  let e = tt < a ? (tt / a) ** ap : Math.exp(-Math.max(0, tt - a - hold) / tau);
  const fade = Math.min(0.03, len * 0.2);
  if (tt > len - fade) e *= Math.max(0, (len - tt) / fade);
  return e;
}

/** From `a` to `b` as `k` goes 0 to 1, on a log scale (for frequencies). */
const logLerp = (a, b, k) => a * (b / a) ** k;

/** A band-limited saw (polyBLEP) at phase `ph` in 0..1 with step `dt`. */
function saw(ph, dt) {
  let v = 2 * ph - 1;
  if (ph < dt) {
    const t = ph / dt;
    v -= t + t - t * t - 1;
  } else if (ph > 1 - dt) {
    const t = (ph - 1) / dt;
    v -= t * t + t + t + 1;
  }
  return v;
}

/** A tone from `f` to `f1` over its length (`glide`: the share of the length the glide takes; `curve` 'exp' eases out), of a
 *  waveform (`sine`, `tri`, `saw`, `square`), in voices a few cents apart (`detune`), with vibrato, a low-pass that can sweep, a
 *  drive, and a pan that can travel. */
export function tone(s, t, dur, o) {
  const len = Math.ceil(dur * SR);
  const start = Math.round(t * SR);
  const f0 = o.f;
  const f1 = o.f1 ?? o.f;
  const glide = o.glide ?? 1;
  const type = o.type ?? 'sine';
  const det = (o.detune ?? [0]).map((c) => 2 ** (c / 1200));
  const ph = det.map(() => s.rng.next());
  if (type === 'sine') ph.fill(0);
  const lp = o.lp ? new Biquad() : null;
  const amp = (o.amp ?? 0.3) / Math.sqrt(det.length);
  const vibD = (o.vib ?? 0) * 0.000578;
  const vibR = o.vibRate ?? 5.5;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const k = Math.min(1, tt / (dur * glide));
    const kk = o.curve === 'exp' ? 1 - (1 - k) ** 3 : o.curve === 'in' ? k * k : k;
    const vib = 1 + vibD * Math.min(1, tt / 0.15) * Math.sin(TAU * vibR * tt);
    const f = logLerp(f0, f1, kk) * vib * (o.wobble ? 1 + o.wobble * Math.sin(TAU * 3.1 * tt) : 1);
    if (lp && (i & 31) === 0) lp.set('lp', Math.min(14000, logLerp(o.lp, o.lpTo ?? o.lp, Math.min(1, tt / dur))), o.q ?? 0.9);
    let x = 0;
    for (let v = 0; v < det.length; v++) {
      const dt = (f * det[v]) / SR;
      ph[v] += dt;
      if (ph[v] >= 1) ph[v] -= 1;
      if (type === 'sine') x += Math.sin(TAU * ph[v]);
      else if (type === 'tri') x += 1 - 4 * Math.abs(ph[v] - 0.5);
      else if (type === 'saw') x += saw(ph[v], dt);
      else x += saw(ph[v], dt) - saw((ph[v] + 0.5) % 1, dt);
    }
    if (lp) x = lp.proc(x);
    if (o.drive) x = Math.tanh(x * o.drive) / Math.tanh(o.drive);
    const e = envAt(tt, dur, o.a ?? 0.005, o.hold ?? 0, o.tau ?? dur / 3, o.ap ?? 1);
    const pan = o.panTo === undefined ? o.pan ?? 0 : (o.pan ?? 0) + (o.panTo - (o.pan ?? 0)) * (tt / dur);
    s.put(start + i, x * e * amp, pan);
  }
}

/** Noise through a filter that sweeps from `hz` to `hz1` (`lp`, `hp` or `bp`), shaped by an envelope; `am` a flutter (rate, depth);
 *  `grain` a rough random amplitude (0 to 1) for gravel, fire and grinding. */
export function noise(s, t, dur, o) {
  const len = Math.ceil(dur * SR);
  const start = Math.round(t * SR);
  const f = new Biquad();
  const f2 = new Biquad();
  const amp = o.amp ?? 0.3;
  let g = 1;
  let gNext = 1;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    if ((i & 15) === 0) {
      const k = Math.min(1, tt / (dur * (o.glide ?? 1)));
      const kk = o.curve === 'exp' ? 1 - (1 - k) ** 3 : o.curve === 'in' ? k * k : k;
      const hz = logLerp(o.hz, o.hz1 ?? o.hz, kk);
      f.set(o.type ?? 'bp', hz, o.q ?? 1);
      f2.b0 = f.b0; f2.b1 = f.b1; f2.b2 = f.b2; f2.a1 = f.a1; f2.a2 = f.a2;
    }
    if (o.grain && (i & 127) === 0) gNext = 1 - o.grain * s.rng.next();
    g += (gNext - g) * 0.01;
    let x = s.rng.noise();
    x = o.steep ? f2.proc(f.proc(x)) : f.proc(x);
    const am = o.am ? 1 - o.am[1] * (0.5 + 0.5 * Math.sin(TAU * o.am[0] * tt)) : 1;
    const e = envAt(tt, dur, o.a ?? 0.005, o.hold ?? 0, o.tau ?? dur / 3, o.ap ?? 1);
    const pan = o.panTo === undefined ? o.pan ?? 0 : (o.pan ?? 0) + (o.panTo - (o.pan ?? 0)) * (tt / dur);
    s.put(start + i, x * e * am * g * amp, pan);
  }
}

/** `n` short bursts of filtered noise scattered over `dur` (crackling fire, ice, sparks, gravel): `shape` 'decay' bunches them
 *  at the start, 'rise' at the end, 'flat' evenly. Each is `ms` long about `hz` (spread an octave), panned within `spread`. */
export function clicks(s, t, dur, n, o) {
  for (let k = 0; k < n; k++) {
    let u = s.rng.next();
    if (o.shape === 'decay') u = u * u;
    else if (o.shape === 'rise') u = Math.sqrt(u);
    const at = t + u * dur;
    const hz = o.hz * 2 ** (s.rng.next() * 1.4 - 0.7);
    const ms = (o.ms ?? 6) * (0.5 + s.rng.next());
    const level = (o.amp ?? 0.2) * (0.35 + 0.65 * s.rng.next()) * (o.shape === 'decay' ? 1 - u * 0.6 : 1);
    const len = Math.ceil((ms / 1000) * SR);
    const f = new Biquad().set(o.type ?? 'bp', hz, o.q ?? 2);
    const pan = (o.pan ?? 0) + (s.rng.next() * 2 - 1) * (o.spread ?? 0.5);
    const i0 = Math.round(at * SR);
    for (let i = 0; i < len * 4; i++) {
      const e = i < len ? 1 - i / len : 0;
      s.put(i0 + i, f.proc(s.rng.noise() * e) * level, pan);
    }
  }
}

/** A bell-like ping (a sine and a few overtones, `ratios` inharmonic for glass, `[1, 2, 3]` for a chime), dying with `tau`. */
export function ping(s, t, f, o = {}) {
  const tau = o.tau ?? 0.4;
  const ratios = o.ratios ?? [1, 2.76, 5.4];
  const amps = o.amps ?? [1, 0.3, 0.1];
  const len = Math.ceil(tau * 6 * SR);
  const i0 = Math.round(t * SR);
  const amp = o.amp ?? 0.15;
  for (let r = 0; r < ratios.length; r++) {
    const w = (TAU * f * ratios[r]) / SR;
    if (f * ratios[r] > SR * 0.45) continue;
    const k = Math.exp(-1 / (tau * SR * (1 - r * 0.2)));
    let a = amps[r] * amp;
    for (let i = 0; i < len; i++) {
      const att = i < 64 ? i / 64 : 1;
      s.put(i0 + i, Math.sin(w * i) * a * att, o.pan ?? 0);
      a *= k;
    }
  }
}

/** `n` pings from `notes` (midi) scattered over `dur` (`order` 'up' or 'down' runs them as a glissando), each panned at random. */
export function sparkle(s, t, dur, n, notes, o = {}) {
  for (let k = 0; k < n; k++) {
    const u = o.order ? k / Math.max(1, n - 1) : s.rng.next();
    const idx = o.order === 'up' ? k % notes.length : o.order === 'down' ? notes.length - 1 - (k % notes.length) : Math.floor(s.rng.next() * notes.length);
    const at = t + u * dur + (o.order ? s.rng.next() * 0.01 : 0);
    const fade = o.fade ? 1 - u * 0.7 : 1;
    ping(s, at, mtof(notes[idx]) * (1 + (s.rng.next() - 0.5) * (o.detune ?? 0.004)), { tau: o.tau ?? 0.3, amp: (o.amp ?? 0.08) * fade * (0.6 + 0.4 * s.rng.next()), ratios: o.ratios, amps: o.amps, pan: (s.rng.next() * 2 - 1) * (o.spread ?? 0.7) });
  }
}

/** A body blow: a sine dropping from `f0` to `f1`, driven a little, for booms, drums and slams. */
export function thump(s, t, o) {
  const tau = o.tau ?? 0.25;
  const len = Math.ceil(tau * 6 * SR);
  const i0 = Math.round(t * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const f = o.f1 + (o.f0 - o.f1) * Math.exp(-tt / (o.drop ?? 0.04));
    ph += (TAU * f) / SR;
    const e = (i < 48 ? i / 48 : 1) * Math.exp(-tt / tau);
    s.put(i0 + i, Math.tanh(Math.sin(ph) * (o.drive ?? 1.5)) * e * (o.amp ?? 0.6), o.pan ?? 0);
  }
}

const VOWELS = {
  ah: [[800, 1], [1150, 0.5], [2900, 0.25], [3900, 0.1]],
  oh: [[500, 1], [850, 0.45], [2700, 0.15], [3500, 0.06]],
  oo: [[320, 1], [720, 0.3], [2600, 0.1], [3400, 0.04]],
  eh: [[530, 1], [1850, 0.5], [2500, 0.25], [3500, 0.1]],
  ss: [[4200, 1], [6500, 0.7], [8500, 0.4], [2500, 0.2]],
  hh: [[900, 0.8], [1700, 1], [2700, 0.6], [3800, 0.3]],
};

/** A voice: a buzz (or breath, `breath` 0 to 1) whose pitch follows `pitch(k)` (Hz, k 0 to 1 over the length), through the
 *  formants of a vowel morphing from `vowel` to `vowel1`. Shouts, howls, growls and whispers. */
export function voice(s, t, dur, o) {
  const len = Math.ceil(dur * SR);
  const i0 = Math.round(t * SR);
  const v0 = VOWELS[o.vowel ?? 'ah'];
  const v1 = VOWELS[o.vowel1 ?? o.vowel ?? 'ah'];
  const bank = v0.map(() => new Biquad());
  const q = o.q ?? 8;
  let ph = 0;
  const breath = o.breath ?? 0.05;
  const vibD = (o.vib ?? 0) * 0.000578;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const k = tt / dur;
    if ((i & 31) === 0) for (let j = 0; j < bank.length; j++) bank[j].set('bp', logLerp(v0[j][0], v1[j][0], k) * (o.shift ?? 1), q);
    const f = o.pitch(k) * (1 + vibD * Math.sin(TAU * (o.vibRate ?? 5.2) * tt)) * (1 + (o.rough ?? 0) * s.rng.noise() * 0.02);
    ph += f / SR;
    if (ph >= 1) ph -= 1;
    const src = saw(ph, f / SR) * (1 - breath) + s.rng.noise() * breath * 1.6;
    let x = 0;
    for (let j = 0; j < bank.length; j++) x += bank[j].proc(src) * (v0[j][1] + (v1[j][1] - v0[j][1]) * k);
    const e = envAt(tt, dur, o.a ?? 0.04, o.hold ?? 0, o.tau ?? dur / 2, o.ap ?? 1);
    const am = o.growl ? 1 - o.growl * (0.5 + 0.5 * Math.sin(TAU * 27 * tt + 3 * Math.sin(TAU * 7 * tt))) : 1;
    s.put(i0 + i, x * e * am * (o.amp ?? 0.4), o.pan ?? 0);
  }
}

/** The room: the sound's mono sum through a short generated hall, mixed back in at `mix`. */
export function room(s, mix, { seconds = 1.6, rt = [1.8, 1.5, 1.0, 0.5], predelay = 0.015, dark = 1 } = {}) {
  const ir = hallIR({ seconds, rt, predelay, seed: 11, early: 0.6, dark });
  const mono = new Float32Array(s.n);
  for (let i = 0; i < s.n; i++) mono[i] = (s.L[i] + s.R[i]) * 0.5;
  const wl = convolve(mono, ir[0], false);
  const wr = convolve(mono, ir[1], false);
  for (let i = 0; i < s.n; i++) {
    s.L[i] += wl[i] * mix;
    s.R[i] += wr[i] * mix;
  }
}

/** A stereo echo: `time` s apart, each repeat `fb` of the last, alternating sides, darkened. */
export function echo(s, time, fb, wet) {
  const d = Math.round(time * SR);
  const lpL = new Biquad().set('lp', 3500, 0.7);
  const lpR = new Biquad().set('lp', 3500, 0.7);
  const bl = new Float32Array(s.n);
  const br = new Float32Array(s.n);
  for (let i = d; i < s.n; i++) {
    bl[i] = lpL.proc(s.R[i - d] + br[i - d] * fb);
    br[i] = lpR.proc(s.L[i - d] + bl[i - d] * fb);
  }
  for (let i = 0; i < s.n; i++) {
    s.L[i] += bl[i] * wet;
    s.R[i] += br[i] * wet;
  }
}

/** Finishes a sound: set by its loudness (the loudest tenth of a second at `loudDb` RMS, so a crack's spike does not set the
 *  level of the whole), its peaks held under -1 dBFS by a look-ahead limiter, and its tail trimmed where it falls below
 *  -50 dBFS (with a short fade). Returns the length in samples. */
export function finish(s, loudDb = -10) {
  const win = Math.round(0.1 * SR);
  let loud = 0;
  for (let w = 0; w + win <= s.n; w += win >> 1) {
    let e = 0;
    for (let i = w; i < w + win; i++) e += s.L[i] * s.L[i] + s.R[i] * s.R[i];
    loud = Math.max(loud, Math.sqrt(e / (win * 2)));
  }
  if (loud === 0) return s.n;
  const g = 10 ** (loudDb / 20) / loud;
  for (let i = 0; i < s.n; i++) {
    s.L[i] *= g;
    s.R[i] *= g;
  }
  limit(s.L, s.R, 10 ** (-1 / 20), 4);
  let end = s.n;
  const floor = 10 ** (-50 / 20);
  while (end > 1 && Math.abs(s.L[end - 1]) < floor && Math.abs(s.R[end - 1]) < floor) end--;
  end = Math.min(s.n, end + Math.round(0.02 * SR));
  const fade = Math.round(0.04 * SR);
  for (let i = Math.max(0, end - fade); i < end; i++) {
    const f = (end - i) / fade;
    s.L[i] *= f;
    s.R[i] *= f;
  }
  return end;
}

/** A 16-bit stereo WAV of the first `n` samples. */
export function wav(s, n) {
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s.L[i] * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s.R[i] * 32767))), 46 + i * 4);
  }
  return buf;
}
