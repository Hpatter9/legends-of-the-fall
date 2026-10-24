// Plain DSP for the epic music renderer: filters, FFT convolution, a compressor and a limiter. Pure JS, no dependencies, and
// deterministic (the noise comes from a seeded stream), so every render of a track is the same.

export const SR = 32000;
export const TAU = Math.PI * 2;
export const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
export const dbToLin = (db) => 10 ** (db / 20);
export const linToDb = (x) => 20 * Math.log10(Math.max(1e-9, x));
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** A small seeded noise stream (xorshift32). */
export class Rng {
  constructor(seed = 1) {
    this.s = (seed >>> 0) || 1;
  }
  next() {
    let x = this.s;
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    this.s = x;
    return x / 4294967296;
  }
  noise() {
    return this.next() * 2 - 1;
  }
  range(a, b) {
    return a + (b - a) * this.next();
  }
}

/** An RBJ biquad. `set(type, hz, q, gainDb)`; `proc(x)` runs one sample. */
export class Biquad {
  constructor(rate = SR) {
    this.rate = rate;
    this.b0 = 1;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;
    this.z1 = 0;
    this.z2 = 0;
  }
  set(type, hz, q = 0.7071, gainDb = 0) {
    const w0 = (TAU * Math.min(hz, this.rate * 0.49)) / this.rate;
    const cs = Math.cos(w0);
    const sn = Math.sin(w0);
    const alpha = sn / (2 * q);
    const A = 10 ** (gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (type) {
      case 'lp':
        b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha;
        break;
      case 'hp':
        b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha;
        break;
      case 'bp':
        b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha;
        break;
      case 'notch':
        b0 = 1; b1 = -2 * cs; b2 = 1; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha;
        break;
      case 'peak':
        b0 = 1 + alpha * A; b1 = -2 * cs; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cs; a2 = 1 - alpha / A;
        break;
      case 'ls': {
        const sq = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 - (A - 1) * cs + sq); b1 = 2 * A * (A - 1 - (A + 1) * cs); b2 = A * (A + 1 - (A - 1) * cs - sq);
        a0 = A + 1 + (A - 1) * cs + sq; a1 = -2 * (A - 1 + (A + 1) * cs); a2 = A + 1 + (A - 1) * cs - sq;
        break;
      }
      case 'hs': {
        const sq = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 + (A - 1) * cs + sq); b1 = -2 * A * (A - 1 + (A + 1) * cs); b2 = A * (A + 1 + (A - 1) * cs - sq);
        a0 = A + 1 - (A - 1) * cs + sq; a1 = 2 * (A - 1 - (A + 1) * cs); a2 = A + 1 - (A - 1) * cs - sq;
        break;
      }
      default:
        throw new Error(`biquad ${type}`);
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  proc(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
  reset() {
    this.z1 = this.z2 = 0;
  }
}

/** Runs `fn(arr)` twice over a loop-shaped array, writing only the second lap, so a filter's state is right at the seam. */
export function circular(arr, fn) {
  const n = arr.length;
  const two = new Float32Array(n * 2);
  two.set(arr, 0);
  two.set(arr, n);
  fn(two);
  arr.set(two.subarray(n), 0);
}

/* ------------------------------------------------------------------ FFT */

const twCache = new Map();
function twiddles(n) {
  let t = twCache.get(n);
  if (!t) {
    const c = new Float64Array(n / 2);
    const s = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      c[i] = Math.cos((TAU * i) / n);
      s[i] = -Math.sin((TAU * i) / n);
    }
    t = { c, s };
    twCache.set(n, t);
  }
  return t;
}

/** In-place radix-2 FFT (`inverse` unscaled sign flip; divide by n yourself). */
export function fft(re, im, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  const { c, s } = twiddles(n);
  const sign = inverse ? -1 : 1;
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0, w = 0; k < half; k++, w += step) {
        const wr = c[w];
        const wi = s[w] * sign;
        const a = i + k;
        const b = a + half;
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
      }
    }
  }
}

/** Convolves a loop-shaped signal with an impulse response by overlap-add; the tail wraps round onto the start when `wrap`. */
export function convolve(input, ir, wrap) {
  const n = input.length;
  let P = 1;
  while (P < ir.length) P <<= 1;
  const size = P * 2;
  const hr = new Float64Array(size);
  const hi = new Float64Array(size);
  hr.set(ir);
  fft(hr, hi);
  const out = new Float32Array(n);
  const xr = new Float64Array(size);
  const xi = new Float64Array(size);
  for (let start = 0; start < n; start += P) {
    const len = Math.min(P, n - start);
    xr.fill(0);
    xi.fill(0);
    let any = false;
    for (let i = 0; i < len; i++) {
      const v = input[start + i];
      xr[i] = v;
      if (v !== 0) any = true;
    }
    if (!any) continue;
    fft(xr, xi);
    for (let i = 0; i < size; i++) {
      const a = xr[i] * hr[i] - xi[i] * hi[i];
      const b = xr[i] * hi[i] + xi[i] * hr[i];
      xr[i] = a;
      xi[i] = b;
    }
    fft(xr, xi, true);
    const outLen = len + ir.length - 1;
    for (let i = 0; i < outLen; i++) {
      let o = start + i;
      if (o >= n) {
        if (!wrap) break;
        o %= n;
      }
      out[o] += xr[i] / size;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ dynamics */

/** A stereo-linked feed-forward compressor, run twice round so a loop's seam is smooth. Settings in dB and ms. */
export function compress(L, R, { threshold = -18, ratio = 3, attack = 12, release = 140, knee = 6, makeup = 0 }) {
  const n = L.length;
  const aA = Math.exp(-1 / ((attack / 1000) * SR));
  const aR = Math.exp(-1 / ((release / 1000) * SR));
  let env = 0;
  const gain = new Float32Array(n);
  const mk = dbToLin(makeup);
  for (let lap = 0; lap < 2; lap++) {
    for (let i = 0; i < n; i++) {
      const x = Math.max(Math.abs(L[i]), Math.abs(R[i]));
      env = x > env ? aA * env + (1 - aA) * x : aR * env + (1 - aR) * x;
      const db = linToDb(env);
      const over = db - threshold;
      let red = 0;
      // (a soft knee: a quadratic ramp across the knee, then the straight line)
      if (over > -knee / 2 && over < knee / 2) red = ((1 - 1 / ratio) * (over + knee / 2) ** 2) / (2 * knee);
      else if (over >= knee / 2) red = (1 - 1 / ratio) * over;
      if (lap === 1) gain[i] = dbToLin(-red) * mk;
    }
  }
  for (let i = 0; i < n; i++) {
    L[i] *= gain[i];
    R[i] *= gain[i];
  }
}

/** A look-ahead peak limiter on a loop-shaped pair: nothing goes past `ceiling` (linear). */
export function limit(L, R, ceiling = 0.89, lookMs = 6) {
  const n = L.length;
  const la = Math.max(2, Math.round((lookMs / 1000) * SR));
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    g[i] = p > ceiling ? ceiling / p : 1;
  }
  // (the minimum over the window [i - la, i + la], found with a monotonic deque round the loop)
  const w = la * 2 + 1;
  const m = new Float32Array(n);
  const dq = new Int32Array(n + w + 4);
  let head = 0;
  let tail = 0;
  const at = (j) => g[((j % n) + n) % n];
  for (let j = -la; j < n + la; j++) {
    const v = at(j);
    while (tail > head && at(dq[tail - 1]) >= v) tail--;
    dq[tail++] = j;
    const centre = j - la;
    while (dq[head] < centre - la) head++;
    if (centre >= 0 && centre < n) m[centre] = at(dq[head]);
  }
  // (then smoothed by a box of the same length, so the gain eases in and out and never exceeds the minimum above)
  const sm = new Float32Array(n);
  let acc = 0;
  for (let j = -la; j <= la; j++) acc += m[((j % n) + n) % n];
  for (let i = 0; i < n; i++) {
    sm[i] = acc / w;
    acc += m[(i + la + 1) % n] - m[(((i - la) % n) + n) % n];
  }
  for (let i = 0; i < n; i++) {
    L[i] *= sm[i];
    R[i] *= sm[i];
  }
  // (a last soft clip for anything the box let past)
  for (let i = 0; i < n; i++) {
    if (Math.abs(L[i]) > ceiling) L[i] = Math.sign(L[i]) * ceiling;
    if (Math.abs(R[i]) > ceiling) R[i] = Math.sign(R[i]) * ceiling;
  }
}

export function rms(L, R) {
  let s = 0;
  for (let i = 0; i < L.length; i++) s += L[i] * L[i] + R[i] * R[i];
  return Math.sqrt(s / (L.length * 2));
}
