// Effects for the epic music: a generated hall (a stereo impulse response with its own decay in four bands), a string
// ensemble chorus, a ping-pong echo and bus EQ. All of them treat the arrays as loops, so nothing clicks at the seam.

import { SR, TAU, Biquad, Rng, circular, convolve } from './dsp.mjs';

/** A stereo impulse response for a hall: early reflections, then a noise tail that decays faster in the highs. */
export function hallIR({ seconds = 3.4, rt = [4.2, 3.4, 2.3, 1.1], predelay = 0.02, seed = 7, early = 1, dark = 1 } = {}) {
  const len = Math.min(131072 - 1, Math.round(seconds * SR));
  const out = [new Float32Array(len), new Float32Array(len)];
  const bands = [
    { type: 'lp', hz: 320 * dark, q: 0.6, g: 1.0, rt: rt[0] },
    { type: 'bp', hz: 900 * dark, q: 0.45, g: 1.0, rt: rt[1] },
    { type: 'bp', hz: 3000 * dark, q: 0.5, g: 0.85, rt: rt[2] },
    { type: 'hp', hz: 6200 * dark, q: 0.6, g: 0.5, rt: rt[3] },
  ];
  for (let ch = 0; ch < 2; ch++) {
    const rng = new Rng(seed * 31 + ch * 977);
    const pd = Math.round(predelay * SR) + ch * 23;
    for (const b of bands) {
      const f1 = new Biquad().set(b.type, b.hz, b.q);
      const f2 = new Biquad().set(b.type, b.hz, b.q);
      const k = 6.9078 / b.rt;
      for (let i = pd; i < len; i++) {
        const t = (i - pd) / SR;
        const x = f2.proc(f1.proc(rng.noise()));
        out[ch][i] += x * b.g * Math.exp(-k * t) * (1 - Math.exp(-t / 0.045));
      }
    }
    // early reflections: a handful of discrete taps
    const er = new Rng(seed * 7 + ch * 13);
    for (let n = 0; n < 14; n++) {
      const at = Math.round((0.006 + er.next() * 0.085) * SR) + pd;
      if (at < len) out[ch][at] += (er.next() < 0.5 ? -1 : 1) * (0.9 - n * 0.05) * 0.06 * early * Math.sqrt(1 / (1 + at / SR * 12)) * 12;
    }
    // fade the last 0.2 s so truncation is silent
    const fade = Math.round(0.25 * SR);
    for (let i = 0; i < fade; i++) out[ch][len - 1 - i] *= i / fade;
  }
  // normalise to unit energy so a send of 1 returns about as much as went in
  let e = 0;
  for (const c of out) for (let i = 0; i < len; i++) e += c[i] * c[i];
  const k = 1 / Math.sqrt(e / 2);
  for (const c of out) for (let i = 0; i < len; i++) c[i] *= k;
  return out;
}

/** Sends the L/R of a bus through a stereo IR (the input is the mono sum). Returns the wet pair. */
export function reverbOf(sendL, sendR, ir, wrap) {
  const n = sendL.length;
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) mono[i] = (sendL[i] + sendR[i]) * 0.5;
  return [convolve(mono, ir[0], wrap), convolve(mono, ir[1], wrap)];
}

/** A string-ensemble chorus: three modulated delays (rates rounded to whole cycles per loop), mixed under the dry signal. */
export function ensemble(L, R, loopSeconds, { depth = 0.0028, base = 0.016, mix = 0.5 } = {}) {
  const n = L.length;
  const rates = [0.43, 0.61, 0.83].map((r) => Math.max(1, Math.round(r * loopSeconds)) / loopSeconds);
  const dryL = Float32Array.from(L);
  const dryR = Float32Array.from(R);
  for (let i = 0; i < n; i++) {
    let wl = 0;
    let wr = 0;
    for (let k = 0; k < 3; k++) {
      const m = Math.sin((TAU * rates[k] * i) / SR + k * 2.1);
      const d = (base + depth * m + k * 0.003) * SR;
      const p = i - d;
      const i0 = Math.floor(p);
      const fr = p - i0;
      const a = ((i0 % n) + n) % n;
      const b = (a + 1) % n;
      const sl = dryL[a] * (1 - fr) + dryL[b] * fr;
      const sr = dryR[a] * (1 - fr) + dryR[b] * fr;
      if (k === 0) { wl += sl; wr += sr * 0.4; }
      else if (k === 1) { wl += sl * 0.4; wr += sr; }
      else { wl += sl * 0.7; wr += sr * 0.7; }
    }
    L[i] = dryL[i] * (1 - mix * 0.5) + wl * mix * 0.5;
    R[i] = dryR[i] * (1 - mix * 0.5) + wr * mix * 0.5;
  }
}

/** A ping-pong echo with a dark feedback path. */
export function pingpong(L, R, time, feedback, wet, tone = 3200) {
  const n = L.length;
  const d = Math.round(time * SR);
  const fl = new Biquad().set('lp', tone, 0.7);
  const fr = new Biquad().set('lp', tone, 0.7);
  const bufL = new Float32Array(d);
  const bufR = new Float32Array(d);
  let w = 0;
  const dryL = Float32Array.from(L);
  const dryR = Float32Array.from(R);
  for (let lap = 0; lap < 2; lap++) {
    for (let i = 0; i < n; i++) {
      const eL = bufL[w];
      const eR = bufR[w];
      // (the left input feeds the right echo and back, so the repeats bounce)
      bufL[w] = fl.proc(eR * feedback + dryL[i] * 0.7);
      bufR[w] = fr.proc(eL * feedback + dryR[i] * 0.7);
      if (lap === 1) {
        L[i] = dryL[i] + eL * wet;
        R[i] = dryR[i] + eR * wet;
      }
      w = (w + 1) % d;
    }
  }
}

/** Runs a list of EQ bands over a loop pair. Band: `{type, hz, q, g}`. */
export function eq(L, R, bands) {
  for (const arr of [L, R]) {
    for (const b of bands) {
      const f = new Biquad().set(b.type, b.hz, b.q ?? 0.7, b.g ?? 0);
      circular(arr, (two) => {
        for (let i = 0; i < two.length; i++) two[i] = f.proc(two[i]);
      });
    }
  }
}

/** Widens (>1) or narrows (<1) the sides, above `fromHz` only so the bass stays centred. */
export function widen(L, R, amount, fromHz = 250) {
  const n = L.length;
  const hp = new Biquad().set('hp', fromHz, 0.7);
  const side = new Float32Array(n);
  for (let i = 0; i < n; i++) side[i] = (L[i] - R[i]) * 0.5;
  circular(side, (two) => {
    for (let i = 0; i < two.length; i++) two[i] = hp.proc(two[i]);
  });
  for (let i = 0; i < n; i++) {
    const extra = side[i] * (amount - 1);
    L[i] += extra;
    R[i] -= extra;
  }
}
