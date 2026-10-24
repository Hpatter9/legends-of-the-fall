// Music theory for the composer: chord symbols in a key, voice-led voicings, and a small melody notation.

const PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function pcOf(name) {
  let pc = PCS[name[0]];
  for (const c of name.slice(1)) pc += c === '#' ? 1 : c === 'b' ? -1 : 0;
  return ((pc % 12) + 12) % 12;
}
export const midiOf = (pc, oct) => 12 * (oct + 1) + pc;
export const MINOR = [0, 2, 3, 5, 7, 8, 10];
export const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** Chord symbols, as [semitones above the tonic, tones above the root]. Case follows roman-numeral habit. */
const CHORDS = {
  i: [0, [0, 3, 7]], i7: [0, [0, 3, 7, 10]], I: [0, [0, 4, 7]], Imaj7: [0, [0, 4, 7, 11]], i9: [0, [0, 3, 7, 10, 14]],
  N: [1, [0, 4, 7]], N7: [1, [0, 4, 7, 11]], bii: [1, [0, 3, 7]],
  ii: [2, [0, 3, 7]], II: [2, [0, 4, 7]], iio: [2, [0, 3, 6]], ii0: [2, [0, 3, 6, 10]], iio7: [2, [0, 3, 6, 9]],
  III: [3, [0, 4, 7]], III7: [3, [0, 4, 7, 10]], IIImaj7: [3, [0, 4, 7, 11]], iii: [4, [0, 3, 7]], IIIaug: [3, [0, 4, 8]],
  iv: [5, [0, 3, 7]], IV: [5, [0, 4, 7]], iv7: [5, [0, 3, 7, 10]], IV7: [5, [0, 4, 7, 10]],
  V: [7, [0, 4, 7]], V7: [7, [0, 4, 7, 10]], v: [7, [0, 3, 7]], v7: [7, [0, 3, 7, 10]], V7b9: [7, [0, 4, 7, 10, 13]], Vsus: [7, [0, 5, 7]], V9: [7, [0, 4, 7, 10, 14]],
  VI: [8, [0, 4, 7]], VImaj7: [8, [0, 4, 7, 11]], vi: [9, [0, 3, 7]], VII: [10, [0, 4, 7]], VII7: [10, [0, 4, 7, 10]], vii: [10, [0, 3, 7]],
  viio: [11, [0, 3, 6]], viio7: [11, [0, 3, 6, 9]], vii0: [11, [0, 3, 6, 10]],
  // secondary dominants of the III and the iv, handy in minor
  V7_III: [10, [0, 4, 7, 10]], V7_iv: [0, [0, 4, 7, 10]], V_VI: [3, [0, 4, 7]], V7_VI: [3, [0, 4, 7, 10]], V7_V: [2, [0, 4, 7, 10]],
};

/** Parses 'VI', 'iv@1' (third in the bass), 'V7_III' into a chord of absolute pitch classes for a key. */
export function chordOf(sym, tonicPc) {
  const [name, inv] = sym.split('@');
  const c = CHORDS[name];
  if (!c) throw new Error(`unknown chord ${sym}`);
  const root = (tonicPc + c[0]) % 12;
  const tones = c[1].map((iv) => (root + iv) % 12);
  const bassIdx = inv ? Number(inv) : 0;
  return { sym, root, tones, intervals: c[1], bass: tones[bassIdx], name };
}

/** Voice-leads a series of chords: each chord's `n` voices lie in [lo, hi], moving as little as possible from the last. */
export function voiceLead(chords, lo, hi, n = 4) {
  const out = [];
  let prev = null;
  for (const c of chords) {
    const cand = [];
    for (let m = lo; m <= hi; m++) if (c.tones.includes(((m % 12) + 12) % 12)) cand.push(m);
    let best = null;
    let bestCost = Infinity;
    const pick = (idx, start, cur) => {
      if (idx === n) {
        // every chord tone but possibly the fifth must be present
        const pcs = new Set(cur.map((m) => m % 12));
        const need = c.tones.filter((_, i) => !(i === 2 && c.tones.length > 3));
        if (!need.every((pc) => pcs.has(pc))) return;
        let cost = 0;
        if (prev) for (let k = 0; k < n; k++) cost += Math.abs(cur[k] - prev[k]);
        else cost = Math.abs(cur.reduce((a, b) => a + b, 0) / n - (lo + hi) / 2);
        for (let k = 1; k < n; k++) if (cur[k] - cur[k - 1] > 12) cost += 6;
        if (cur[0] % 12 !== c.bass % 12) cost += 0.5;
        if (cost < bestCost) {
          bestCost = cost;
          best = cur.slice();
        }
        return;
      }
      for (let i = start; i < cand.length; i++) {
        cur.push(cand[i]);
        pick(idx + 1, i + 1, cur);
        cur.pop();
      }
    };
    pick(0, 0, []);
    if (!best) throw new Error(`no voicing for ${c.sym} in ${lo}-${hi}`);
    out.push(best);
    prev = best;
  }
  return out;
}

/** Melody notation. A token is `[^v]*<degree 1-7>[#b]*[:beats]` or `r[:beats]` (rest), `-[:beats]` (tie: lengthen the last note).
 *  `^` and `v` move an octave; `dN` sets the default length. `|` is ignored. Lengths may be fractions (`1/3`).
 *  Returns notes `{t, d, midi}` with t from 0, in beats. `mode` is the scale, `tonic` the MIDI pitch of degree 1. */
export function parseMelody(text, tonic, scale) {
  const notes = [];
  let t = 0;
  let def = 1;
  for (const tok of text.split(/\s+/).filter((x) => x && x !== '|')) {
    if (/^d[\d./]+$/.test(tok)) {
      def = num(tok.slice(1));
      continue;
    }
    const [head, lenS] = tok.split(':');
    const d = lenS ? num(lenS) : def;
    if (head === 'r') {
      t += d;
      continue;
    }
    if (head === '-') {
      if (notes.length) notes[notes.length - 1].d += d;
      t += d;
      continue;
    }
    const m = head.match(/^([\^v]*)([1-7])([#b]*)$/);
    if (!m) throw new Error(`bad melody token '${tok}'`);
    let oct = 0;
    for (const c of m[1]) oct += c === '^' ? 1 : -1;
    let midi = tonic + scale[Number(m[2]) - 1] + oct * 12;
    for (const c of m[3]) midi += c === '#' ? 1 : -1;
    notes.push({ t, d, midi });
    t += d;
  }
  return { notes, beats: t };
}
function num(s) {
  if (s.includes('/')) {
    const [a, b] = s.split('/');
    return Number(a) / Number(b);
  }
  return Number(s);
}
