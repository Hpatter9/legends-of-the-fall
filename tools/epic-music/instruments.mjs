// The instruments: each voice renders one note into a pair of scratch arrays and mixes it into a bus (wrapping round the
// loop's end, so a ring-out lands on the loop's start). Everything here is built to avoid the bare-oscillator sound:
// detuned and spread voices, filters that move with the note's envelope, vibrato that arrives late, noise at the attack,
// partial banks with their own decays, and distortion run at twice the rate so it does not alias.

import { SR, TAU, mtof, Biquad, Rng, clamp } from './dsp.mjs';

const MAXV = SR * 24;
const SL = new Float32Array(MAXV);
const SRR = new Float32Array(MAXV);
const ENV = new Float32Array(MAXV);
const TMP = new Float32Array(MAXV);
export const rng = new Rng(12345);

export class Bus {
  constructor(n, wrap) {
    this.n = n;
    this.wrap = wrap;
    this.L = new Float32Array(n);
    this.R = new Float32Array(n);
  }
  /** Mixes the scratch pair into the bus from time `t` (seconds), with a gain and a constant-power pan (-1 to 1). */
  mix(t, len, gain = 1, pan = 0, l = SL, r = SRR) {
    const start = Math.round(t * SR);
    const p = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4;
    const gl = Math.cos(p) * gain * Math.SQRT2;
    const gr = Math.sin(p) * gain * Math.SQRT2;
    const n = this.n;
    for (let i = 0; i < len; i++) {
      let o = start + i;
      if (o >= n) {
        if (!this.wrap) break;
        o %= n;
      }
      this.L[o] += l[i] * gl;
      this.R[o] += r[i] * gr;
    }
  }
}

const lenFor = (dur, rTau) => Math.min(MAXV, Math.ceil((dur + rTau * 6) * SR));

/** An envelope into ENV: linear attack, exponential fall to `sus`, then an exponential release after `dur`. */
function fillEnv(len, dur, a, dTau, sus, rTau) {
  const aF = Math.max(1, a * SR);
  const durF = dur * SR;
  const dk = Math.exp(-1 / (dTau * SR));
  const rk = Math.exp(-1 / (rTau * SR));
  let dec = 1;
  let last = 0;
  for (let i = 0; i < len; i++) {
    if (i < durF) {
      if (i < aF) last = i / aF;
      else {
        dec *= dk;
        last = sus + (1 - sus) * dec;
      }
    } else last *= rk;
    ENV[i] = last;
  }
}

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
function pulse(ph, dt, w) {
  // (a pulse of width w from two saws)
  const p2 = (ph + 1 - w) % 1;
  return saw(ph, dt) - saw(p2, dt);
}
const cents = (c) => 2 ** (c / 1200);

/** A viewer of partial banks: sums decaying sinusoids into TMP by phasor rotation (cheap, no sin per sample). */
function bank(len, parts) {
  TMP.fill(0, 0, len);
  for (const p of parts) {
    const w = (TAU * p.f) / SR;
    if (p.f > SR * 0.46) continue;
    const cr = Math.cos(w);
    const ci = Math.sin(w);
    // (every partial starts from zero, so a struck note begins without a click)
    let x = 1;
    let y = 0;
    let a = p.amp;
    const k = Math.exp(-1 / (p.tau * SR));
    const stop = Math.min(len, Math.ceil(p.tau * SR * 9));
    for (let i = 0; i < stop; i++) {
      TMP[i] += a * y;
      const nx = x * cr - y * ci;
      y = x * ci + y * cr;
      x = nx;
      a *= k;
      if ((i & 1023) === 1023) {
        const m = 1 / Math.hypot(x, y);
        x *= m;
        y *= m;
      }
    }
  }
}

/** Shapes TMP by a gate: after `dur` it falls away with time constant `rTau`. */
function gate(len, dur, rTau) {
  const durF = Math.round(dur * SR);
  const rk = Math.exp(-1 / (rTau * SR));
  let g = 1;
  for (let i = durF; i < len; i++) {
    g *= rk;
    TMP[i] *= g;
  }
}

/** A burst of noise through a band, into TMP (added). */
function noiseBurst(len, type, hz, q, amp, tau, delaySamples = 0) {
  const f = new Biquad().set(type, hz, q);
  let a = amp;
  const k = Math.exp(-1 / (tau * SR));
  const n = Math.min(len - delaySamples, Math.ceil(tau * SR * 8));
  for (let i = 0; i < n; i++) {
    TMP[i + delaySamples] += f.proc(rng.noise()) * a;
    a *= k;
  }
}

/* ------------------------------------------------------------------ strings, choir, brass */

/** A string section's note: spread, detuned saws under a moving low-pass, with vibrato that comes in late. */
export function strings(bus, t, dur, midi, vel, o = {}) {
  const a = o.a ?? 0.4;
  const r = o.r ?? 0.45;
  const stac = o.stac ?? false;
  fillEnv(lenFor(dur, r), dur, a, o.dTau ?? 100, o.sus ?? 1, r);
  const len = lenFor(dur, r);
  const nv = o.voices ?? 6;
  const f = mtof(midi) * (o.tune ?? 1);
  const spread = o.spread ?? 16;
  const ph = new Float64Array(nv);
  const gl = new Float64Array(nv);
  const gr = new Float64Array(nv);
  const det = new Float64Array(nv);
  for (let k = 0; k < nv; k++) {
    ph[k] = rng.next();
    const u = nv > 1 ? (k / (nv - 1)) * 2 - 1 : 0;
    det[k] = cents(u * spread + rng.range(-2, 2));
    const pan = u * (o.width ?? 0.8);
    gl[k] = Math.cos(((pan + 1) * Math.PI) / 4);
    gr[k] = Math.sin(((pan + 1) * Math.PI) / 4);
  }
  const lpL = new Biquad();
  const lpR = new Biquad();
  const cut0 = o.cut ?? 1300 + 3600 * vel;
  const vr = 5 + rng.range(-0.4, 0.4);
  const vd = o.vib ?? 6;
  const vph = rng.next() * TAU;
  const g = (o.gain ?? 1) * 0.22;
  for (let i = 0; i < len; i++) {
    if ((i & 31) === 0) {
      const e = ENV[i];
      const fc = stac ? cut0 * (0.35 + 0.65 * Math.min(1, e * 1.6)) : cut0 * (0.3 + 0.7 * Math.min(1, e));
      lpL.set('lp', Math.min(fc, 12000), 0.8);
      lpR.b0 = lpL.b0; lpR.b1 = lpL.b1; lpR.b2 = lpL.b2; lpR.a1 = lpL.a1; lpR.a2 = lpL.a2;
    }
    const tt = i / SR;
    const vib = 1 + vd * 0.000578 * Math.min(1, Math.max(0, tt - 0.25) / 0.7) * Math.sin(TAU * vr * tt + vph);
    let l = 0;
    let rr = 0;
    for (let k = 0; k < nv; k++) {
      const dt = (f * det[k] * vib) / SR;
      ph[k] += dt;
      if (ph[k] >= 1) ph[k] -= 1;
      const s = saw(ph[k], dt);
      l += s * gl[k];
      rr += s * gr[k];
    }
    const e = ENV[i] * g;
    SL[i] = lpL.proc(l) * e;
    SRR[i] = lpR.proc(rr) * e;
  }
  bus.mix(t, len, 1, o.pan ?? 0);
}

const VOWELS = {
  ah: { f: [800, 1150, 2850, 3800], g: [1, 0.55, 0.22, 0.1], q: [9, 12, 14, 16] },
  oh: { f: [500, 850, 2700, 3500], g: [1, 0.45, 0.15, 0.06], q: [9, 11, 14, 16] },
  oo: { f: [330, 700, 2600, 3400], g: [1, 0.3, 0.1, 0.04], q: [8, 10, 14, 16] },
};

/** A choir "aah": a spread of vibrato saws through a bank of formant filters, with breath and a slow swell. */
export function choir(bus, t, dur, midi, vel, o = {}) {
  const a = o.a ?? 0.6;
  const r = o.r ?? 0.7;
  const len = lenFor(dur, r);
  fillEnv(len, dur, a, 100, 1, r);
  const vow = VOWELS[o.vowel ?? 'ah'];
  const f0 = mtof(midi);
  const lift = f0 > 520 ? f0 * 1.05 - vow.f[0] : 0;
  const nv = 3;
  const banks = [0, 1].map(() => vow.f.map((hz, j) => new Biquad().set('bp', Math.min(hz + (j === 0 ? Math.max(0, lift) : 0), 5200), vow.q[j])));
  const src = new Biquad().set('lp', 2800, 0.6);
  const srcR = new Biquad().set('lp', 2800, 0.6);
  const ph = [0, 1, 2].map(() => rng.next());
  const vph = [0, 1, 2].map(() => rng.next() * TAU);
  const det = [cents(-9), 1, cents(9)];
  const g = (o.gain ?? 1) * 0.5;
  const sw = rng.next() * TAU;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    const vibAmt = 0.000578 * 13 * Math.min(1, Math.max(0, tt - 0.3) / 0.8);
    let l = 0;
    let rr = 0;
    for (let k = 0; k < nv; k++) {
      const vib = 1 + vibAmt * Math.sin(TAU * (5.3 + k * 0.17) * tt + vph[k]) + 0.0004 * rng.noise();
      const dt = (f0 * det[k] * vib) / SR;
      ph[k] += dt;
      if (ph[k] >= 1) ph[k] -= 1;
      const s = saw(ph[k], dt);
      if (k < 2) l += s;
      if (k > 0) rr += s;
    }
    const br = rng.noise() * 0.04;
    const sl = src.proc(l * 0.5 + br);
    const sr = srcR.proc(rr * 0.5 + br);
    let ol = 0;
    let or = 0;
    for (let j = 0; j < 4; j++) {
      ol += banks[0][j].proc(sl) * vow.g[j];
      or += banks[1][j].proc(sr) * vow.g[j];
    }
    const e = ENV[i] * g * (1 + 0.08 * Math.sin(TAU * 0.21 * tt + sw)) * (0.5 + vel * 0.7);
    SL[i] = ol * e;
    SRR[i] = or * e;
  }
  bus.mix(t, len, 1, o.pan ?? 0);
}

/** A brass note: two detuned saws and a square under a low-pass that blooms on the attack (the "blat"), a touch of drive. */
export function brass(bus, t, dur, midi, vel, o = {}) {
  const a = o.a ?? 0.045;
  const r = o.r ?? 0.14;
  const len = lenFor(dur, r);
  fillEnv(len, dur, a, o.dTau ?? 0.35, o.sus ?? 0.8, r);
  const f = mtof(midi);
  const bloom = o.bloom ?? 0.09;
  const top = o.cut ?? 1300 + 4200 * vel;
  const ph = [rng.next(), rng.next(), rng.next()];
  const det = [cents(-7), cents(7), 1];
  const lp = new Biquad();
  const lp2 = new Biquad();
  const vph = rng.next() * TAU;
  const g = (o.gain ?? 1) * 0.3;
  const vibD = o.vib ?? 0;
  const pre = 1.6 + vel * 1.2;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    if ((i & 31) === 0) {
      const fc = top * (0.18 + 0.82 * (1 - Math.exp(-tt / bloom))) * (0.6 + 0.4 * Math.min(1, ENV[i] * 1.2));
      lp.set('lp', Math.min(fc, 10000), 1.1);
      lp2.b0 = lp.b0; lp2.b1 = lp.b1; lp2.b2 = lp.b2; lp2.a1 = lp.a1; lp2.a2 = lp.a2;
    }
    const vib = 1 + vibD * 0.000578 * Math.min(1, Math.max(0, tt - 0.35) / 0.5) * Math.sin(TAU * 5.4 * tt + vph);
    let s = 0;
    for (let k = 0; k < 3; k++) {
      const dt = (f * det[k] * vib) / SR;
      ph[k] += dt;
      if (ph[k] >= 1) ph[k] -= 1;
      s += k < 2 ? saw(ph[k], dt) : pulse(ph[k], dt, 0.4) * 0.5;
    }
    const y = Math.tanh(lp2.proc(lp.proc(s * 0.4)) * pre) * ENV[i] * g;
    SL[i] = y;
    SRR[i] = y;
  }
  bus.mix(t, len, 1, o.pan ?? 0);
}

/* ------------------------------------------------------------------ organ, harpsichord, piano, music box, bells */

const REG = {
  full: [[0.5, 0.55], [1, 1], [2, 0.75], [3, 0.55], [4, 0.45], [5, 0.3], [6, 0.26], [8, 0.2], [10, 0.12], [12, 0.09]],
  diapason: [[1, 1], [2, 0.6], [3, 0.3], [4, 0.2], [6, 0.08]],
  flute: [[1, 1], [2, 0.22], [3, 0.07], [4, 0.12]],
  pedal: [[0.5, 0.5], [1, 1], [2, 0.5], [3, 0.2], [4, 0.1]],
  reed: [[1, 1], [2, 0.9], [3, 0.8], [4, 0.7], [5, 0.55], [6, 0.5], [7, 0.4], [8, 0.35], [9, 0.25], [10, 0.2]],
};

/** A pipe organ note: a stop's harmonics (phasors) in two slightly different tunings left and right, a tremulant, and the chiff. */
export function organ(bus, t, dur, midi, vel, o = {}) {
  const reg = REG[o.reg ?? 'full'];
  const a = o.a ?? 0.035;
  const r = o.r ?? 0.2;
  const len = lenFor(dur, r);
  fillEnv(len, dur, a, 100, 1, r);
  const f = mtof(midi);
  const tremHz = o.trem ?? 5.2;
  const tremD = o.tremDepth ?? 0.05;
  const parts = [];
  for (const [ratio, w] of reg) {
    const hz = f * ratio;
    if (hz > SR * 0.45) continue;
    for (const side of [0, 1]) {
      const w0 = (TAU * hz * (side ? 1.0009 : 0.9992)) / SR;
      parts.push({ cr: Math.cos(w0), ci: Math.sin(w0), x: Math.cos(rng.next() * TAU), y: Math.sin(rng.next() * TAU), w: w * (ratio > 4 ? 1 - (f * ratio) / 11000 : 1), side });
    }
  }
  const g = (o.gain ?? 1) * 0.1 * (0.6 + vel * 0.6);
  const tph = rng.next() * TAU;
  for (let i = 0; i < len; i++) {
    let l = 0;
    let rr = 0;
    for (const p of parts) {
      const nx = p.x * p.cr - p.y * p.ci;
      p.y = p.x * p.ci + p.y * p.cr;
      p.x = nx;
      if (p.side) rr += p.y * p.w;
      else l += p.y * p.w;
    }
    if ((i & 2047) === 2047) for (const p of parts) {
      const m = 1 / Math.hypot(p.x, p.y);
      p.x *= m;
      p.y *= m;
    }
    const trem = 1 + tremD * Math.sin(TAU * tremHz * (i / SR) + tph);
    const e = ENV[i] * g * trem;
    SL[i] = (l * 0.85 + rr * 0.3) * e;
    SRR[i] = (rr * 0.85 + l * 0.3) * e;
  }
  // the chiff: a quick breath of noise round the 3rd harmonic as the pipe speaks
  TMP.fill(0, 0, len);
  noiseBurst(len, 'bp', Math.min(f * 3, 6000), 1.4, 0.35 * g * 4, 0.03);
  for (let i = 0; i < Math.min(len, 2000); i++) {
    SL[i] += TMP[i];
    SRR[i] += TMP[i];
  }
  bus.mix(t, len, 1, o.pan ?? 0);
}

/** A harpsichord note: plucked partials with a pluck-position comb, each decaying at its own rate, and the jack's click. */
export function harpsichord(bus, t, dur, midi, vel, o = {}) {
  const f = mtof(midi);
  const tau0 = (o.ring ?? 1.5) * clamp((f / 262) ** -0.35, 0.5, 1.8);
  const len = Math.min(MAXV, Math.ceil((Math.max(dur, 0.1) + tau0 * 4) * SR));
  const parts = [];
  const pluck = o.pluck ?? 0.13;
  for (let n = 1; n <= 24; n++) {
    const hz = f * n * (1 + 0.00004 * n * n);
    if (hz > 11000) break;
    const comb = Math.abs(Math.sin(Math.PI * n * pluck));
    const amp = (comb * n ** -0.45) / 1.2;
    parts.push({ f: hz, amp: amp * (0.45 + vel * 0.55), tau: tau0 / (1 + 0.28 * n), ph: rng.next() * TAU });
  }
  // (the 4' register: an octave above, quieter, for brightness)
  if (o.octave !== false)
    for (let n = 1; n <= 8; n++) parts.push({ f: f * 2 * n, amp: (0.28 * n ** -0.6 * (0.45 + vel * 0.55)) * Math.abs(Math.sin(Math.PI * n * pluck)), tau: (tau0 * 0.7) / (1 + 0.3 * n), ph: rng.next() * TAU });
  bank(len, parts);
  gate(len, Math.max(dur, 0.08), o.damp ?? 0.09);
  noiseBurst(len, 'bp', 3200, 1.1, 0.12, 0.004);
  noiseBurst(len, 'lp', 900, 0.7, 0.08, 0.012);
  const g = (o.gain ?? 1) * 0.5;
  for (let i = 0; i < len; i++) {
    SL[i] = TMP[i] * g;
    SRR[i] = TMP[i] * g;
  }
  bus.mix(t, len, 1, o.pan ?? 0);
}

/** A piano note: inharmonic partials, a pair of slightly different strings, a velocity-dependent hammer, and the pedal. */
export function piano(bus, t, dur, midi, vel, o = {}) {
  const f = mtof(midi);
  const tau0 = clamp(7 * (f / 130) ** -0.75, 0.7, 11) * (o.ring ?? 1);
  const rel = o.pedal ? 0.9 : 0.1 + clamp(0.5 - f / 4000, 0, 0.4);
  const len = Math.min(MAXV, Math.ceil((dur + rel * 5 + 0.5) * SR));
  const B = 0.00008 * (f / 100) ** 1.4;
  const bright = 700 + vel * 3800;
  const mk = (detune, pan) => {
    const parts = [];
    for (let n = 1; n <= 28; n++) {
      const hz = f * n * Math.sqrt(1 + B * n * n) * cents(detune);
      if (hz > 12000) break;
      const hammer = 1 / Math.sqrt(1 + (hz / bright) ** 3);
      const strike = Math.abs(Math.sin(Math.PI * n * 0.115)) * 0.6 + 0.4;
      parts.push({ f: hz, amp: (hammer * strike) / n ** 0.85, tau: tau0 / (1 + 0.55 * (n - 1) ** 1.1), ph: rng.next() * TAU });
    }
    bank(len, parts);
    gate(len, dur, rel);
    return pan;
  };
  const strings2 = f > 130;
  const tmpL = new Float32Array(len);
  mk(strings2 ? -0.9 : 0, 0);
  tmpL.set(TMP.subarray(0, len));
  mk(strings2 ? 0.9 : 0.3, 0);
  const g = (o.gain ?? 1) * 0.5 * (0.35 + vel * 0.9);
  for (let i = 0; i < len; i++) {
    SL[i] = (tmpL[i] * 0.8 + TMP[i] * 0.4) * g;
    SRR[i] = (TMP[i] * 0.8 + tmpL[i] * 0.4) * g;
  }
  // the hammer's thump
  TMP.fill(0, 0, len);
  noiseBurst(len, 'lp', 600 + vel * 1200, 0.8, 0.5 * vel, 0.012);
  for (let i = 0; i < Math.min(len, 1500); i++) {
    SL[i] += TMP[i] * g;
    SRR[i] += TMP[i] * g;
  }
  bus.mix(t, len, 1, o.pan ?? clamp((midi - 60) / 50, -0.5, 0.5));
}

/** A music-box tine: a bright fundamental with a couple of upper partials, the comb's click, and a long, glassy ring. */
export function musicbox(bus, t, dur, midi, vel, o = {}) {
  const f = mtof(midi);
  const ring = o.ring ?? 2.4;
  const len = Math.min(MAXV, Math.ceil((ring * 3 + 0.2) * SR));
  const parts = [
    { f, amp: 1, tau: ring, ph: 0 },
    { f: f * 2.0, amp: 0.38, tau: ring * 0.45, ph: 1 },
    { f: f * 3.02, amp: 0.16, tau: ring * 0.22, ph: 2 },
    { f: f * 5.4, amp: 0.08 * vel, tau: ring * 0.1, ph: 0.5 },
    { f: f * 1.003, amp: 0.4, tau: ring * 0.9, ph: 3 },
  ];
  bank(len, parts);
  noiseBurst(len, 'hp', 5000, 0.8, 0.07, 0.003);
  const g = (o.gain ?? 1) * 0.28 * (0.4 + vel * 0.8);
  for (let i = 0; i < len; i++) {
    SL[i] = TMP[i] * g;
    SRR[i] = TMP[i] * g;
  }
  bus.mix(t, len, 1, o.pan ?? clamp((midi - 78) / 24, -0.4, 0.4));
}

/** A church bell: hum, prime, a minor-third tierce and the upper partials, each with its own long decay. */
export function bell(bus, t, dur, midi, vel, o = {}) {
  const f = mtof(midi);
  const ring = o.ring ?? 5;
  const len = Math.min(MAXV, Math.ceil(ring * 2.6 * SR));
  const R = [
    [0.5, 0.55, 1.2], [1, 1, 1], [1.19, 0.7, 0.8], [1.5, 0.45, 0.62], [2, 0.55, 0.5], [2.5, 0.28, 0.36], [3.1, 0.2, 0.28], [4.2, 0.12, 0.2], [5.4, 0.07, 0.12],
  ];
  bank(len, R.map(([r, a, d], i) => ({ f: f * r * (1 + (i % 2 ? 0.0006 : -0.0004)), amp: a, tau: ring * d, ph: rng.next() * TAU })));
  noiseBurst(len, 'bp', 2400, 1.2, 0.2, 0.01);
  const g = (o.gain ?? 1) * 0.22 * (0.4 + vel * 0.8);
  for (let i = 0; i < len; i++) {
    SL[i] = TMP[i] * g;
    SRR[i] = TMP[i] * g;
  }
  bus.mix(t, len, 1, o.pan ?? 0);
}

/* ------------------------------------------------------------------ guitars and bass */

const HALF = (() => {
  // a 31-tap windowed-sinc half-band-ish low-pass for taking the oversampled signal back down
  const n = 31;
  const h = new Float64Array(n);
  const fc = 0.23;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x = i - (n - 1) / 2;
    const s = x === 0 ? 2 * fc : Math.sin(TAU * fc * x) / (Math.PI * x);
    const w = 0.5 - 0.5 * Math.cos((TAU * i) / (n - 1));
    h[i] = s * w;
    sum += h[i];
  }
  for (let i = 0; i < n; i++) h[i] /= sum;
  return h;
})();

function down2(x2, len, out) {
  const n = HALF.length;
  const c = (n - 1) / 2;
  for (let i = 0; i < len; i++) {
    let s = 0;
    const base = 2 * i - c;
    for (let k = 0; k < n; k++) {
      const j = base + k;
      if (j >= 0 && j < x2.length) s += x2[j] * HALF[k];
    }
    out[i] = s;
  }
}

const X2 = new Float32Array(MAXV * 2 > 4000000 ? 4000000 : MAXV * 2);

/** A distorted lead-guitar note: a saw/pulse mix pre-filtered, driven hard in an oversampled stage, then a cabinet. Slides in,
 *  and the vibrato arrives late. */
export function guitarLead(bus, t, dur, midi, vel, o = {}) {
  const r = o.r ?? 0.12;
  const len = Math.min(Math.floor(X2.length / 2), lenFor(dur, r));
  fillEnv(len, dur, 0.006, o.dTau ?? 2.5, 0.75, r);
  const rate = SR * 2;
  const f = mtof(midi);
  const slide = o.slide ?? 0;
  const pre = new Biquad(rate).set('peak', 1500, 0.9, 7);
  const pre2 = new Biquad(rate).set('hp', 140, 0.7);
  const cab1 = new Biquad(rate).set('lp', 4200, 0.75);
  const cab2 = new Biquad(rate).set('lp', 5600, 0.6);
  const cabP = new Biquad(rate).set('peak', 2300, 1.1, 4);
  const cabLo = new Biquad(rate).set('hp', 95, 0.7);
  const drive = o.drive ?? 9 + vel * 5;
  const vph = rng.next() * TAU;
  let ph = rng.next();
  let ph2 = rng.next();
  let fb = 0;
  const bias = 0.18;
  const tb = Math.tanh(bias);
  for (let j = 0; j < len * 2; j++) {
    const tt = j / rate;
    const vib = 1 + 0.000578 * (o.vib ?? 18) * Math.min(1, Math.max(0, tt - 0.28) / 0.5) * Math.sin(TAU * 5.6 * tt + vph);
    const sl = slide ? 2 ** (-(slide * Math.exp(-tt / 0.035)) / 12) : 1;
    const dt = (f * vib * sl) / rate;
    ph += dt;
    if (ph >= 1) ph -= 1;
    ph2 += dt * 1.0035;
    if (ph2 >= 1) ph2 -= 1;
    const e = ENV[j >> 1];
    let x = saw(ph, dt) * 0.55 + saw(ph2, dt) * 0.3 + pulse(ph, dt, 0.35) * 0.18;
    x = pre2.proc(pre.proc(x)) * (0.5 + e * 0.9);
    // (feedback sustain: a little of the output fed back brightens a held note)
    x += fb * 0.12 * Math.min(1, tt / 0.6);
    let y = Math.tanh(x * drive + bias) - tb;
    fb = y;
    y = cabLo.proc(cabP.proc(cab2.proc(cab1.proc(y))));
    X2[j] = y * e * 0.55;
  }
  down2(X2, len, SL);
  const g = o.gain ?? 1;
  for (let i = 0; i < len; i++) {
    SL[i] *= g;
    SRR[i] = SL[i];
  }
  bus.mix(t, len, 1, o.pan ?? 0);
}

/** A rhythm-guitar power chord (root, fifth, octave), double-tracked hard left and right: palm-muted (short, dark) or open. */
export function guitarChord(bus, t, dur, midi, vel, o = {}) {
  const muted = o.mute ?? true;
  const r = muted ? 0.05 : o.r ?? 0.25;
  const noteDur = muted ? Math.min(dur, 0.2) : dur;
  const len = Math.min(Math.floor(X2.length / 2), lenFor(noteDur, r));
  const rate = SR * 2;
  const tones = o.tones ?? [0, 7, 12];
  for (const side of [-1, 1]) {
    const dly = rng.range(0, 0.012);
    fillEnv(len, noteDur, 0.004, muted ? 0.08 : 1.4, muted ? 0 : 0.7, r);
    const detune = cents(side * rng.range(2, 6));
    const lpPre = new Biquad(rate).set('lp', muted ? 1800 : 3600, 0.7);
    const hp = new Biquad(rate).set('hp', 110, 0.7);
    const cab1 = new Biquad(rate).set('lp', 3800, 0.8);
    const cab2 = new Biquad(rate).set('lp', 5200, 0.6);
    const mid = new Biquad(rate).set('peak', 750, 0.9, 4);
    const lo = new Biquad(rate).set('ls', 180, 0.7, 3);
    const phs = tones.map(() => rng.next());
    const drive = (o.drive ?? 14) + vel * 6;
    const fcs = tones.map((s) => (mtof(midi + s) * detune) / rate);
    for (let j = 0; j < len * 2; j++) {
      const e = ENV[j >> 1];
      let x = 0;
      for (let k = 0; k < tones.length; k++) {
        phs[k] += fcs[k];
        if (phs[k] >= 1) phs[k] -= 1;
        x += saw(phs[k], fcs[k]) * (k === 1 ? 0.8 : 1);
      }
      x = hp.proc(lpPre.proc(x * 0.4));
      let y = Math.tanh(x * drive);
      y = lo.proc(mid.proc(cab2.proc(cab1.proc(y))));
      X2[j] = y * e * 0.4;
    }
    down2(X2, len, TMP);
    const shift = Math.round(dly * SR);
    const arr = new Float32Array(len);
    for (let i = 0; i < len - shift; i++) arr[i + shift] = TMP[i] * (o.gain ?? 1);
    bus.mix(t, len, 0.8, side * 0.85, arr, arr);
  }
}

/** A bass-synth note: saw and square an octave down under a plucked low-pass, lightly driven. */
export function bassSynth(bus, t, dur, midi, vel, o = {}) {
  const r = o.r ?? 0.06;
  const len = lenFor(dur, r);
  fillEnv(len, dur, 0.004, o.dTau ?? 0.5, o.sus ?? 0.8, r);
  const f = mtof(midi);
  const lp = new Biquad();
  const lp2 = new Biquad();
  let ph = rng.next();
  let ph2 = rng.next();
  let ph3 = rng.next();
  const top = o.cut ?? 700 + vel * 1500;
  const low = o.low ?? 160;
  const drive = o.drive ?? 1.8;
  const g = (o.gain ?? 1) * 0.5;
  for (let i = 0; i < len; i++) {
    const tt = i / SR;
    if ((i & 15) === 0) {
      const fc = low + (top - low) * Math.exp(-tt / (o.pluck ?? 0.09));
      lp.set('lp', fc, 1.2);
      lp2.b0 = lp.b0; lp2.b1 = lp.b1; lp2.b2 = lp.b2; lp2.a1 = lp.a1; lp2.a2 = lp.a2;
    }
    const dt = f / SR;
    ph += dt; if (ph >= 1) ph -= 1;
    ph2 += dt * 1.004; if (ph2 >= 1) ph2 -= 1;
    ph3 += dt * 0.5; if (ph3 >= 1) ph3 -= 1;
    const s = saw(ph, dt) * 0.55 + saw(ph2, dt) * 0.35 + (ph3 < 0.5 ? 0.6 : -0.6) + Math.sin(TAU * ph3) * 0.8;
    const y = Math.tanh(lp2.proc(lp.proc(s * 0.5)) * drive) * ENV[i] * g;
    SL[i] = y;
    SRR[i] = y;
  }
  bus.mix(t, len, 1, o.pan ?? 0);
}

/** A bowed low note (cellos and basses): a few detuned saws under a slow low-pass. */
export function cello(bus, t, dur, midi, vel, o = {}) {
  strings(bus, t, dur, midi, vel, { voices: 4, spread: 10, cut: o.cut ?? 700 + 1500 * vel, a: o.a ?? 0.25, r: o.r ?? 0.3, width: 0.3, vib: 5, ...o });
}

/* ------------------------------------------------------------------ percussion */

const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];

function metal(len, lo, tau, amp, mul = 1) {
  const phs = METAL.map(() => rng.next());
  const hp = new Biquad().set('hp', lo, 0.8);
  const hp2 = new Biquad().set('hp', lo, 0.8);
  let a = amp;
  const k = Math.exp(-1 / (tau * SR));
  const n = Math.min(len, Math.ceil(tau * SR * 8));
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < METAL.length; j++) {
      phs[j] += (METAL[j] * 5.1 * mul) / SR;
      if (phs[j] >= 1) phs[j] -= 1;
      s += phs[j] < 0.5 ? 1 : -1;
    }
    TMP[i] += hp2.proc(hp.proc(s * 0.16 + rng.noise() * 0.5)) * a;
    a *= k;
  }
}

function tone(len, f0, f1, sweepTau, amp, tau, extra = 0) {
  let ph = 0;
  let a = amp;
  const k = Math.exp(-1 / (tau * SR));
  const n = Math.min(len, Math.ceil(tau * SR * 8));
  for (let i = 0; i < n; i++) {
    const f = f1 + (f0 - f1) * Math.exp(-(i / SR) / sweepTau);
    ph += (TAU * f) / SR;
    TMP[i] += Math.sin(ph + extra * Math.sin(ph * 0.5)) * a;
    a *= k;
  }
}

function emit(bus, t, len, g, pan = 0) {
  for (let i = 0; i < len; i++) {
    SL[i] = TMP[i] * g;
    SRR[i] = TMP[i] * g;
  }
  bus.mix(t, len, 1, pan);
}

const KIT = {
  kick: (len, v) => {
    tone(len, 170, 46, 0.03, 1, 0.17, 0.4);
    noiseBurst(len, 'hp', 2800, 0.7, 0.28, 0.004);
    noiseBurst(len, 'lp', 160, 0.8, 0.35, 0.03);
    for (let i = 0; i < len; i++) TMP[i] = Math.tanh(TMP[i] * 1.6) * 0.75;
  },
  snare: (len, v) => {
    noiseBurst(len, 'bp', 2400, 0.55, 0.9, 0.12);
    noiseBurst(len, 'hp', 5200, 0.7, 0.35, 0.22);
    tone(len, 230, 175, 0.02, 0.6, 0.07);
    tone(len, 330, 330, 1, 0.2, 0.04);
  },
  rim: (len) => {
    tone(len, 480, 420, 0.01, 0.5, 0.012);
    noiseBurst(len, 'bp', 1900, 1.3, 0.7, 0.012);
  },
  hat: (len) => metal(len, 7000, 0.03, 0.8),
  openhat: (len) => metal(len, 6500, 0.25, 0.7),
  ride: (len) => {
    metal(len, 5200, 0.7, 0.45, 0.72);
    tone(len, 3400, 3400, 1, 0.06, 0.4);
  },
  crash: (len) => {
    metal(len, 3000, 1.3, 0.8, 0.8);
    noiseBurst(len, 'hp', 3500, 0.7, 0.3, 0.9);
  },
  tom1: (len) => {
    tone(len, 330, 200, 0.05, 0.9, 0.2);
    noiseBurst(len, 'bp', 1500, 1.2, 0.25, 0.012);
  },
  tom2: (len) => {
    tone(len, 240, 140, 0.05, 0.95, 0.26);
    noiseBurst(len, 'bp', 1200, 1.2, 0.25, 0.012);
  },
  tom3: (len) => {
    tone(len, 170, 98, 0.06, 1, 0.34);
    noiseBurst(len, 'bp', 900, 1.2, 0.3, 0.015);
  },
  taiko: (len) => {
    tone(len, 150, 62, 0.07, 1, 0.55, 0.3);
    tone(len, 94, 94, 1, 0.45, 0.35);
    noiseBurst(len, 'bp', 700, 0.8, 0.5, 0.03);
    noiseBurst(len, 'bp', 3000, 1, 0.14, 0.006);
  },
  taikoRim: (len) => {
    noiseBurst(len, 'bp', 2100, 1.4, 0.9, 0.02);
    tone(len, 700, 520, 0.01, 0.4, 0.02);
  },
  gong: (len) => {
    for (const [r, a, d] of [[1, 1, 3.4], [1.47, 0.6, 3], [2.09, 0.5, 2.4], [2.56, 0.35, 2], [3.4, 0.2, 1.4]]) tone(len, 118 * r, 118 * r, 1, a * 0.5, d);
    noiseBurst(len, 'bp', 1600, 0.6, 0.3, 0.6);
  },
};
const KIT_LEN = { kick: 0.5, snare: 0.5, rim: 0.12, hat: 0.2, openhat: 1.2, ride: 3, crash: 5, tom1: 0.7, tom2: 0.8, tom3: 1, taiko: 1.6, taikoRim: 0.2, gong: 12 };

export function drum(bus, t, kind, vel, o = {}) {
  const len = Math.ceil((KIT_LEN[kind] ?? 1) * SR);
  TMP.fill(0, 0, len);
  KIT[kind](len, vel);
  emit(bus, t, len, (o.gain ?? 1) * 0.5 * (0.35 + 0.8 * vel), o.pan ?? 0);
}

/** A cymbal swell: filtered noise rising over `dur` seconds, cut off by its crash. */
export function swell(bus, t, dur, vel, o = {}) {
  const len = Math.ceil((dur + 0.5) * SR);
  const hp = new Biquad().set('hp', 3800, 0.7);
  const bp = new Biquad().set('bp', 7500, 0.5);
  for (let i = 0; i < len; i++) {
    const x = Math.min(1, i / (dur * SR));
    const e = x * x * (i / SR < dur ? 1 : Math.exp(-(i / SR - dur) / 0.04));
    const n = rng.noise();
    TMP[i] = (hp.proc(n) + bp.proc(n) * 0.6) * e;
  }
  emit(bus, t, len, (o.gain ?? 1) * 0.28 * (0.4 + vel), o.pan ?? 0);
}

/** A timpani stroke tuned to `midi`: a membrane's inharmonic modes, a pitch drop on the hit, and the stick. */
export function timpani(bus, t, dur, midi, vel, o = {}) {
  const f = mtof(midi);
  const ring = (o.ring ?? 1.5) * clamp((f / 80) ** -0.3, 0.6, 1.2);
  const len = Math.ceil((ring * 3 + 0.2) * SR);
  TMP.fill(0, 0, len);
  const modes = [[1, 1, 1], [1.5, 0.55, 0.7], [1.99, 0.4, 0.5], [2.44, 0.25, 0.36], [2.97, 0.16, 0.26]];
  for (const [r, a, d] of modes) tone(len, f * r * 1.32, f * r, 0.05, a, ring * d);
  noiseBurst(len, 'lp', 520, 0.8, 0.5 * vel, 0.035);
  noiseBurst(len, 'bp', 2200, 1, 0.12 * vel, 0.004);
  emit(bus, t, len, (o.gain ?? 1) * 0.55 * (0.3 + vel * 0.9), o.pan ?? 0);
}
