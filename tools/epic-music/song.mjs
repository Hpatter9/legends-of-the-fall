// A song: a tempo, a key, a chord grid and layers of notes placed on it; then the mix (buses, sends, the hall) and the master.

import { SR, Rng, Biquad, compress, limit, rms, linToDb } from './dsp.mjs';
import { Bus, strings, choir, brass, organ, harpsichord, piano, musicbox, bell, guitarLead, guitarChord, bassSynth, cello, drum, swell, timpani, synthLead, flute, pluck, slapBass, anvil, rng as voiceRng } from './instruments.mjs';
import { hallIR, reverbOf, ensemble, pingpong, eq, widen } from './fx.mjs';
import { pcOf, midiOf, MINOR, MAJOR, DORIAN, PHRYGIAN, chordOf, voiceLead, parseMelody } from './theory.mjs';

/** The instruments: which bus each sits on and how a note is played. */
const INST = {
  strings: { bus: 'strings', fn: strings, jit: 0.012 },
  stac: { bus: 'stac', fn: (b, t, d, m, v, o) => strings(b, t, Math.max(0.05, d), m, v, { a: 0.006, dTau: 0.06, sus: 0, r: 0.1, voices: 4, spread: 11, vib: 0, stac: true, cut: 2400 + 3600 * v, ...o }), jit: 0.004 },
  pizz: { bus: 'stac', fn: (b, t, d, m, v, o) => harpsichord(b, t, 0.05, m, v * 0.8, { ring: 0.35, octave: false, pluck: 0.3, ...o }), jit: 0.004 },
  cello: { bus: 'strings', fn: cello, jit: 0.012 },
  organ: { bus: 'organ', fn: organ, jit: 0.002 },
  harpsi: { bus: 'harpsi', fn: harpsichord, jit: 0.004 },
  choir: { bus: 'choir', fn: choir, jit: 0.02 },
  brass: { bus: 'brass', fn: brass, jit: 0.008 },
  horn: { bus: 'brass', fn: (b, t, d, m, v, o) => brass(b, t, d, m, v, { a: 0.1, bloom: 0.18, sus: 0.9, dTau: 1, vib: 14, cut: 900 + 2600 * v, r: 0.25, ...o }), jit: 0.01 },
  guitar: { bus: 'guitar', fn: guitarLead, jit: 0 },
  chug: { bus: 'chug', fn: guitarChord, jit: 0 },
  bass: { bus: 'bass', fn: bassSynth, jit: 0 },
  piano: { bus: 'keys', fn: piano, jit: 0.006 },
  mbox: { bus: 'keys', fn: musicbox, jit: 0.004 },
  bell: { bus: 'bells', fn: bell, jit: 0 },
  timp: { bus: 'timp', fn: (b, t, d, m, v, o) => timpani(b, t, d, m, v, o), jit: 0.003 },
  // (the JRPG band's voices: docs/notes/music-theme.md)
  lead: { bus: 'lead', fn: synthLead, jit: 0 },
  sqlead: { bus: 'lead', fn: (b, t, d, m, v, o) => synthLead(b, t, d, m, v, { square: true, detune: 5, cut: 2200 + 3000 * v, ...o }), jit: 0 },
  flute: { bus: 'flute', fn: flute, jit: 0.004 },
  shaku: { bus: 'flute', fn: (b, t, d, m, v, o) => flute(b, t, d, m, v, { breathy: 0.32, vib: 9, bend: 1, a: 0.08, ...o }), jit: 0.006 },
  fiddle: { bus: 'fiddle', fn: (b, t, d, m, v, o) => strings(b, t, d, m, v, { voices: 2, spread: 5, width: 0.25, vib: 15, a: 0.025, r: 0.12, cut: 3800 + 3000 * v, gain: 2.2, ...o }), jit: 0.003 },
  violins: { bus: 'strings', fn: (b, t, d, m, v, o) => strings(b, t, d, m, v, { a: 0.05, r: 0.2, vib: 10, cut: 2600 + 3800 * v, gain: 1.3, ...o }), jit: 0.006 },
  koto: { bus: 'koto', fn: (b, t, d, m, v, o) => pluck(b, t, d, m, v, { ring: 1.3, bright: 0.75, pos: 0.12, body: 520, ...o }), jit: 0.002 },
  harp: { bus: 'koto', fn: (b, t, d, m, v, o) => pluck(b, t, d, m, v, { ring: 2.2, bright: 0.35, pos: 0.3, body: 300, ...o }), jit: 0.003 },
  tuba: { bus: 'brass', fn: (b, t, d, m, v, o) => brass(b, t, d, m, v, { a: 0.03, cut: 520 + 1100 * v, sus: 0.85, bloom: 0.05, gain: 1.5, ...o }), jit: 0.004 },
  trumpet: { bus: 'brass', fn: (b, t, d, m, v, o) => brass(b, t, d, m, v, { a: 0.02, cut: 2200 + 5200 * v, bloom: 0.05, vib: 10, sus: 0.85, ...o }), jit: 0.003 },
  slap: { bus: 'bass', fn: slapBass, jit: 0 },
  synth: { bus: 'synth', fn: (b, t, d, m, v, o) => synthLead(b, t, d, m, v, { square: true, a: 0.002, dTau: 0.12, sus: 0.2, vib: 0, cut: 1800 + 4200 * v, ...o }), jit: 0 },
  anvil: { bus: 'metal', fn: anvil, jit: 0.001 },
};

/** Default bus settings. `gain` is the dry level, `hall` and `room` the sends. */
const BUSES = {
  strings: { gain: 0.95, hall: 0.34, room: 0, ens: true, eq: [{ type: 'hp', hz: 80 }, { type: 'peak', hz: 2800, q: 0.8, g: 1.5 }] },
  stac: { gain: 0.75, hall: 0.22, room: 0.05, eq: [{ type: 'hp', hz: 150 }, { type: 'peak', hz: 3500, q: 0.8, g: 1 }] },
  organ: { gain: 0.9, hall: 0.5, room: 0, eq: [{ type: 'hp', hz: 40 }, { type: 'peak', hz: 1200, q: 0.7, g: 1 }] },
  harpsi: { gain: 0.8, hall: 0.3, room: 0.1, eq: [{ type: 'hp', hz: 120 }, { type: 'peak', hz: 900, q: 1, g: 2 }] },
  choir: { gain: 0.85, hall: 0.65, room: 0, eq: [{ type: 'hp', hz: 140 }, { type: 'peak', hz: 1000, q: 0.8, g: 1.5 }] },
  brass: { gain: 0.85, hall: 0.4, room: 0.05, eq: [{ type: 'hp', hz: 120 }] },
  guitar: { gain: 0.7, hall: 0.2, room: 0.1, echo: { time: 0.375, feedback: 0.36, wet: 0.24 }, eq: [{ type: 'hp', hz: 120 }] },
  chug: { gain: 0.65, hall: 0.05, room: 0.1, eq: [{ type: 'hp', hz: 70 }] },
  bass: { gain: 0.8, hall: 0.02, room: 0, eq: [{ type: 'hp', hz: 32 }, { type: 'peak', hz: 900, q: 0.9, g: 2 }] },
  keys: { gain: 0.9, hall: 0.4, room: 0.04, eq: [{ type: 'hp', hz: 60 }] },
  bells: { gain: 0.8, hall: 0.55, room: 0, eq: [{ type: 'hp', hz: 120 }] },
  drums: { gain: 0.95, hall: 0.1, room: 0.28, comp: { threshold: -16, ratio: 3, attack: 6, release: 90 }, eq: [{ type: 'hp', hz: 35 }] },
  timp: { gain: 1, hall: 0.45, room: 0.1, eq: [{ type: 'hp', hz: 30 }] },
  lead: { gain: 0.62, hall: 0.24, room: 0.05, ens: 0.35, echo: { beats: 0.75, feedback: 0.3, wet: 0.2 }, eq: [{ type: 'hp', hz: 180 }, { type: 'peak', hz: 2600, q: 0.8, g: 1.5 }] },
  flute: { gain: 0.9, hall: 0.4, room: 0.04, eq: [{ type: 'hp', hz: 220 }] },
  fiddle: { gain: 0.8, hall: 0.3, room: 0.06, eq: [{ type: 'hp', hz: 190 }, { type: 'peak', hz: 480, q: 1.2, g: 2.5 }, { type: 'peak', hz: 2900, q: 1.1, g: 3 }, { type: 'lp', hz: 7500 }] },
  koto: { gain: 0.9, hall: 0.32, room: 0.08, eq: [{ type: 'hp', hz: 140 }, { type: 'peak', hz: 3000, q: 1, g: 2 }] },
  synth: { gain: 0.5, hall: 0.18, room: 0.05, ens: 0.45, echo: { beats: 0.375, feedback: 0.25, wet: 0.18 }, eq: [{ type: 'hp', hz: 200 }] },
  metal: { gain: 0.7, hall: 0.28, room: 0.12, eq: [{ type: 'hp', hz: 300 }] },
};

const DRUMS = new Set(['kick', 'snare', 'rim', 'hat', 'openhat', 'ride', 'crash', 'tom1', 'tom2', 'tom3', 'taiko', 'taikoRim', 'gong']);
/** Drum grooves: one bar of sixteenths per drum. X accent, x hit, o ghost. */
export const GROOVES = {
  rock: { kick: 'X.......x.x.....', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.' },
  rock16: { kick: 'X.....x.x.x.....', snare: '....X..o....X..o', hat: 'xoxoxoxoxoxoxoxo' },
  drive: { kick: 'X.xxx.x.X.xxx.x.', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.xo', open: '..............x.' },
  gallop: { kick: 'X.xxX.xxX.xxX.xx', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.' },
  halftime: { kick: 'X.......x.x.....', snare: '........X.......', hat: 'x.x.x.x.x.x.x.x.' },
  march: { kick: 'X...x...X...x...', snare: '..x...x...x...x.', hat: '' },
  dance: { kick: 'X...X...X...X...', snare: '....X.......X...', hat: '..x...x...x...x.', open: '..x...x...x...x.' },
  ride8: { kick: 'X.......x.x.....', snare: '....X.......X...', ride: 'x.x.x.x.x.x.x.x.' },
  pulse: { kick: 'X.......X.......', snare: '', hat: '' },
  none: {},
};
const VEL = { X: 1, x: 0.78, o: 0.42 };

export class Song {
  constructor(o) {
    Object.assign(this, { beatsPerBar: 4, loop: true, mode: 'min', target: 0.16, tail: 4, hallSeconds: 3.4, hallRt: [4.2, 3.4, 2.3, 1.1], seed: 1, mix: {}, ...o });
    this.tonicPc = pcOf(this.key);
    this.scale = o.scale ?? { maj: MAJOR, dor: DORIAN, phr: PHRYGIAN }[this.mode] ?? MINOR;
    this.spb = 60 / this.bpm;
    this.beats = this.bars * this.beatsPerBar;
    this.loopSeconds = this.beats * this.spb;
    // (`intro`: bars at the start that play once; the loop then runs from their end. The song's last bars must be the same
    //  music as the intro, so the loop's join hears what came before the intro's end. See render.mjs and music-theme.md.)
    this.introSeconds = (this.intro ?? 0) * this.beatsPerBar * this.spb;
    this.events = [];
    this.grid = []; // chord segments {t, d, chord}
    this.rng = new Rng(this.seed * 977 + 5);
    this.melodies = [];
  }

  /** The chord grid from `bar`: one token per bar; `a+b` splits a bar evenly; `x*2` repeats the token. */
  prog(bar, text) {
    let b = bar;
    for (const tok of text.split(/\s+/).filter(Boolean)) {
      const [body, rep] = tok.split('*');
      const parts = body.split('+');
      for (let r = 0; r < (rep ? Number(rep) : 1); r++) {
        const d = this.beatsPerBar / parts.length;
        parts.forEach((sym, i) => this.grid.push({ t: b * this.beatsPerBar + i * d, d, chord: chordOf(sym, this.tonicPc, this.scale), sym }));
        b++;
      }
    }
    return b;
  }
  segs(fromBar, toBar) {
    const a = fromBar * this.beatsPerBar;
    const z = toBar * this.beatsPerBar;
    return this.grid.filter((g) => g.t >= a && g.t < z);
  }
  chordAt(beat) {
    const g = this.grid.find((s) => beat >= s.t && beat < s.t + s.d - 1e-9);
    if (!g) throw new Error(`${this.id}: no chord at beat ${beat}`);
    return g.chord;
  }
  add(inst, t, d, midi, vel = 0.8, o = {}) {
    this.events.push({ inst, t, d, midi, vel, o });
  }

  /** Sustained chord tones, voice-led within [lo, hi] (MIDI). `merge` ties equal neighbours. */
  pad(inst, from, to, { lo = 55, hi = 76, n = 4, vel = 0.7, merge = true, o = {}, arpeggio = 0 } = {}) {
    const segs = this.segs(from, to);
    const voicings = voiceLead(segs.map((s) => s.chord), lo, hi, n);
    let i = 0;
    while (i < segs.length) {
      let j = i;
      let d = segs[i].d;
      while (merge && j + 1 < segs.length && segs[j + 1].sym === segs[i].sym && segs[j + 1].t === segs[j].t + segs[j].d) {
        j++;
        d += segs[j].d;
      }
      voicings[i].forEach((m, k) => this.add(inst, segs[i].t + k * arpeggio, d - k * arpeggio, m, vel * (k === 0 ? 1 : 0.92), o));
      i = j + 1;
    }
  }

  /** Arpeggios: `pat` characters are indices into the chord's tones climbing from `base` (0-9, a-f), '.' a rest, one per `step` beats. */
  arp(inst, from, to, { pat, base = 57, step = 0.25, len = 0.8, vel = 0.7, accent = 0.18, o = {}, span = 3 } = {}) {
    for (const s of this.segs(from, to)) {
      const tones = [];
      for (let oct = 0; oct < span + 1; oct++) for (const iv of s.chord.intervals) tones.push(midiOfAbove(s.chord.root, base) + oct * 12 + iv);
      tones.sort((a, b) => a - b);
      const count = Math.round(s.d / step);
      for (let k = 0; k < count; k++) {
        const ch = pat[k % pat.length];
        if (ch === '.') continue;
        const idx = parseInt(ch, 16);
        const strong = k % 4 === 0;
        this.add(inst, s.t + k * step, step * len, tones[Math.min(idx, tones.length - 1)], Math.min(1, vel + (strong ? accent : 0)), o);
      }
    }
  }

  /** A bass line: one pattern char per `step` beats. r root, 5 fifth, o octave, 3 third, 7 seventh, b chord bass, R accented root, . rest, - hold. */
  bassline(inst, from, to, { pat, base = 36, step = 0.25, len = 0.85, vel = 0.8, o = {} } = {}) {
    for (const s of this.segs(from, to)) {
      const root = midiOfAbove(s.chord.root, base);
      const bassPc = midiOfAbove(s.chord.bass, base);
      const count = Math.round(s.d / step);
      let last = null;
      for (let k = 0; k < count; k++) {
        const c = pat[k % pat.length];
        if (c === '.') {
          last = null;
          continue;
        }
        if (c === '-') {
          if (last) last.d += step;
          continue;
        }
        const iv = s.chord.intervals;
        const m = c === 'r' || c === 'R' ? root : c === '5' ? root + 7 : c === 'o' ? root + 12 : c === '3' ? root + iv[1] : c === '7' ? root + (iv[3] ?? 10) : c === 'b' ? bassPc : c === 'h' ? root + 24 : root;
        const ev = { inst, t: s.t + k * step, d: step * len, midi: m, vel: Math.min(1, vel * (c === 'R' ? 1.12 : 1)), o };
        this.events.push(ev);
        last = ev;
      }
    }
  }

  /** Chord hits: the voice-led chord struck where `pat` (one char per `step` beats) has an x (short) or X (accent). */
  stab(inst, from, to, { pat = 'X...', step = 0.5, lo = 55, hi = 79, n = 4, vel = 0.8, len = 0.4, o = {} } = {}) {
    const segs = this.segs(from, to);
    const voicings = voiceLead(segs.map((g) => g.chord), lo, hi, n);
    segs.forEach((g, i) => {
      const count = Math.round(g.d / step);
      for (let k = 0; k < count; k++) {
        const c = pat[k % pat.length];
        if (c === '.') continue;
        for (const m of voicings[i]) this.add(inst, g.t + k * step, step * len * (c === 'X' ? 1.4 : 1), m, vel * (c === 'X' ? 1.08 : 0.9), o);
      }
    });
  }

  /** A written melody, from bar `bar` (a bar number, fractions allowed). `oct` is the octave of degree 1. */
  mel(inst, bar, text, { oct = 4, vel = 0.8, art = 0.95, o = {}, tr = 0, accent = 0.08, snap = null, glide = 0 } = {}) {
    const tonic = midiOf(this.tonicPc, oct) + tr;
    const { notes, beats } = parseMelody(text, tonic, this.scale);
    // (`snap`: semitones above the tonic that the tune is moved onto, keeping its direction: the yokai's pentatonic)
    if (snap) {
      let prevIn = null;
      let prevOut = null;
      for (const n of notes) {
        const rel = (((n.midi - tonic) % 12) + 12) % 12;
        if (!snap.includes(rel)) {
          const up = prevIn === null || n.midi >= prevIn;
          let m = n.midi;
          for (let k = 1; k < 12; k++) {
            const c = n.midi + (up ? k : -k);
            if (snap.includes((((c - tonic) % 12) + 12) % 12)) { m = c; break; }
          }
          // (never let the snap turn a step into a repeated note when the other way keeps it moving)
          if (m === prevOut) for (let k = 1; k < 12; k++) {
            const c = n.midi + (up ? -k : k);
            if (snap.includes((((c - tonic) % 12) + 12) % 12)) { m = c; break; }
          }
          prevIn = n.midi;
          n.midi = m;
        } else prevIn = n.midi;
        prevOut = n.midi;
      }
    }
    // (`glide`: a lead slides up into each note that leaps, as a synth lead or a guitar does)
    if (glide) notes.forEach((n, i) => {
      if (i && Math.abs(n.midi - notes[i - 1].midi) >= 3) n.o = { glide, slide: glide };
    });
    const t0 = bar * this.beatsPerBar;
    for (const n of notes) this.add(inst, t0 + n.t, n.d * art, n.midi, Math.min(1, vel + (n.t % 1 === 0 ? accent : 0)), n.o ? { ...o, ...n.o } : o);
    this.melodies.push({ inst, from: t0, notes: notes.map((n) => ({ ...n, t: n.t + t0 })) });
    return bar + beats / this.beatsPerBar;
  }

  /** A counter-melody drawn from the chords: on each `rhythm` slot (beats, repeating every bar) the chord tone nearest the last
   *  note in [lo, hi], stepping to the next one up or down on the off-slots so the line keeps moving, like a horn's inner line. */
  line(inst, from, to, { lo = 55, hi = 72, rhythm = [2, 1.5, 0.5], vel = 0.6, o = {}, art = 0.92, dir = 1 } = {}) {
    let prev = Math.round((lo + hi) / 2);
    let d = dir;
    for (let bar = from; bar < to; bar++) {
      let t = bar * this.beatsPerBar;
      rhythm.forEach((len, k) => {
        const ch = this.chordAt(t);
        const cands = [];
        for (let m = lo; m <= hi; m++) if (ch.tones.includes(((m % 12) + 12) % 12)) cands.push(m);
        let best = cands.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a), cands[0]);
        if (k > 0 && best === prev) {
          const i = cands.indexOf(best) + d;
          if (i < 0 || i >= cands.length) d = -d;
          best = cands[Math.max(0, Math.min(cands.length - 1, cands.indexOf(best) + d))];
        }
        this.add(inst, t, len * art, best, vel * (k === 0 ? 1 : 0.9), o);
        prev = best;
        t += len;
      });
    }
  }

  /** Drums over the bars, from a groove (see GROOVES), optionally with fills on the listed bars (the last beat) and crashes on bars. */
  kit(from, to, { groove = 'rock', fills = [], crash = [], vel = 1, pan = 0, tomFill = 'tom', skip = [], map = {} } = {}) {
    const g = typeof groove === 'string' ? GROOVES[groove] : groove;
    for (let bar = from; bar < to; bar++) {
      const t0 = bar * this.beatsPerBar;
      const filling = fills.includes(bar);
      for (const [name, pat] of Object.entries(g)) {
        const named = name === 'open' ? 'openhat' : name;
        // (`map` swaps a kit piece for another: a war drum for the kick, an anvil for the snare, a clank for the hat)
        const kind = map[named] ?? named;
        for (let k = 0; k < pat.length; k++) {
          const c = pat[k];
          if (c === '.' || skip.includes(kind)) continue;
          if (filling && k >= 12 && (named === 'snare' || named === 'hat' || named === 'openhat' || named === 'ride')) continue;
          this.add('drum', t0 + k * 0.25, 0, kind, VEL[c] * vel, { pan: named === 'hat' ? 0.25 : named === 'ride' ? 0.3 : 0 });
        }
      }
      if (filling) this.fill(bar, tomFill, vel);
      if (crash.includes(bar)) {
        this.add('drum', t0, 0, 'crash', 0.95 * vel, { pan: -0.2 });
        if (!g.kick) this.add('drum', t0, 0, 'kick', 0.9 * vel);
      }
    }
  }
  /** A fill on the last beat of `bar`. */
  fill(bar, type = 'tom', vel = 1) {
    const t0 = bar * this.beatsPerBar + 3;
    if (type === 'tom') {
      ['tom1', 'tom1', 'tom2', 'tom2', 'tom3', 'tom3', 'tom3', 'tom3'].forEach((k, i) => this.add('drum', t0 + i * 0.125, 0, k, (0.7 + i * 0.04) * vel, { pan: -0.3 + i * 0.09 }));
    } else if (type === 'snare') {
      for (let i = 0; i < 8; i++) this.add('drum', t0 + i * 0.125, 0, 'snare', (0.4 + i * 0.07) * vel);
    } else if (type === 'snare2') {
      for (let i = 0; i < 8; i++) this.add('drum', t0 + i * 0.125, 0, 'snare2', (0.45 + i * 0.07) * vel);
    } else if (type === 'war') {
      ['wardrum', 'wardrum', 'tom2', 'tom2', 'tom3', 'tom3', 'wardrum', 'wardrum'].forEach((k, i) => this.add('drum', t0 + i * 0.125, 0, k, (0.75 + i * 0.03) * vel, { pan: -0.25 + i * 0.07 }));
    } else if (type === 'taiko') {
      [0, 0.5, 0.75].forEach((o, i) => this.add('drum', t0 + o, 0, 'taiko', (0.8 + i * 0.1) * vel));
    }
  }
  /** One drum hit at `beat`. */
  hit(kind, beat, vel = 0.8, o = {}) {
    this.add('drum', beat, 0, kind, vel, o);
  }
  /** Tuned timpani on the chord roots (sixteenth-grid char per `step`): r root, 5 fifth, R accented root, . rest. */
  timp(from, to, { pat = 'R...............', step = 0.25, vel = 0.85, base = 38, o = {} } = {}) {
    for (const s of this.segs(from, to)) {
      let root = midiOfAbove(s.chord.root, base);
      if (root > base + 12) root -= 12;
      const count = Math.round(s.d / step);
      for (let k = 0; k < count; k++) {
        const c = pat[k % pat.length];
        if (c === '.') continue;
        this.add('timp', s.t + k * step, 0.5, c === '5' ? root + 7 : root, Math.min(1, vel * (c === 'R' ? 1.1 : 1)), o);
      }
    }
  }
  /** A roll on one pitch: `count` strokes across `dur` beats, rising (or falling) in strength. */
  roll(inst, beat, dur, midi, v0, v1, count = 12, o = {}) {
    for (let i = 0; i < count; i++) {
      const v = v0 + ((v1 - v0) * i) / Math.max(1, count - 1);
      if (inst === 'drum') this.add('drum', beat + (dur * i) / count, 0, midi, v, o);
      else this.add(inst, beat + (dur * i) / count, 0.2, midi, v, o);
    }
  }
  /** A cymbal swell ending on `beat` (it starts `beats` before). */
  swellTo(beat, beats = 4, vel = 0.8) {
    this.add('swell', beat - beats, beats * this.spb, 0, vel, {});
    this.add('drum', beat, 0, 'crash', 0.9, {});
  }

  /** How the melody sits on the chords: a list of on-beat notes that are not chord tones, for checking by eye. */
  review() {
    const out = [];
    let on = 0;
    let tones = 0;
    for (const m of this.melodies) {
      for (const n of m.notes) {
        if (n.t % 1 !== 0) continue;
        const ch = this.grid.find((s) => n.t >= s.t && n.t < s.t + s.d - 1e-9);
        if (!ch) continue;
        on++;
        if (ch.chord.tones.includes(((n.midi % 12) + 12) % 12)) tones++;
        else if (n.d >= 1) out.push(`${m.inst}@${(n.t / this.beatsPerBar).toFixed(2)} bar: ${noteName(n.midi)} over ${ch.sym}`);
      }
    }
    return { share: on ? tones / on : 1, odd: out };
  }

  /** Renders the song to a stereo pair. Returns `{L, R, N}`. */
  render(opts = {}) {
    const N = Math.round((this.loop ? this.loopSeconds : this.loopSeconds + this.tail) * SR);
    const wrap = this.loop;
    const buses = {};
    const cfg = {};
    for (const [name, base] of Object.entries(BUSES)) {
      cfg[name] = { ...base, ...(this.mix[name] ?? {}) };
    }
    const bus = (n) => (buses[n] ??= new Bus(N, wrap));
    voiceRng.s = (this.seed * 2654435761) >>> 0 || 1;
    const jr = new Rng(this.seed + 99);
    const events = [...this.events].sort((a, b) => a.t - b.t);
    for (const e of events) {
      const t = e.t * this.spb;
      const vel = Math.min(1, Math.max(0.05, e.vel * (1 + jr.range(-0.05, 0.05))));
      if (e.inst === 'drum') {
        drum(bus('drums'), t + jr.range(-0.002, 0.002), e.midi, vel, { ...e.o, gain: (this.mix.drumGain ?? 1) });
        continue;
      }
      if (e.inst === 'swell') {
        swell(bus('drums'), t, e.d, vel, {});
        continue;
      }
      const inst = INST[e.inst];
      if (!inst) throw new Error(`no instrument ${e.inst}`);
      const j = inst.jit ? jr.range(-inst.jit, inst.jit) : 0;
      inst.fn(bus(inst.bus), Math.max(0, t + j), e.d * this.spb, e.midi, vel, e.o);
    }
    // each bus: effects, eq, level, then the sends
    const dry = { L: new Float32Array(N), R: new Float32Array(N) };
    const hallS = { L: new Float32Array(N), R: new Float32Array(N) };
    const roomS = { L: new Float32Array(N), R: new Float32Array(N) };
    for (const [name, b] of Object.entries(buses)) {
      const c = cfg[name];
      if (c.ens) ensemble(b.L, b.R, N / SR, { mix: c.ens === true ? 0.55 : c.ens });
      if (c.echo) pingpong(b.L, b.R, (c.echo.beats ? c.echo.beats * this.spb : c.echo.time), c.echo.feedback, c.echo.wet);
      if (c.eq) eq(b.L, b.R, c.eq);
      if (c.comp) compress(b.L, b.R, c.comp);
      const g = c.gain * (this.mix.levels?.[name] ?? 1);
      for (let i = 0; i < N; i++) {
        const l = b.L[i] * g;
        const r = b.R[i] * g;
        dry.L[i] += l;
        dry.R[i] += r;
        if (c.hall) {
          hallS.L[i] += l * c.hall;
          hallS.R[i] += r * c.hall;
        }
        if (c.room) {
          roomS.L[i] += l * c.room;
          roomS.R[i] += r * c.room;
        }
      }
    }
    const hallIr = hallIR({ seconds: this.hallSeconds, rt: this.hallRt, seed: this.seed + 3, dark: this.hallDark ?? 1 });
    const roomIr = hallIR({ seconds: 0.9, rt: [1.0, 0.8, 0.55, 0.3], seed: this.seed + 5, predelay: 0.006, early: 1.6 });
    const hall = reverbOf(hallS.L, hallS.R, hallIr, wrap);
    const room = reverbOf(roomS.L, roomS.R, roomIr, wrap);
    const wetHall = this.mix.hallLevel ?? 0.7;
    const wetRoom = this.mix.roomLevel ?? 0.6;
    const L = new Float32Array(N);
    const R = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      L[i] = dry.L[i] + hall[0][i] * wetHall + room[0][i] * wetRoom;
      R[i] = dry.R[i] + hall[1][i] * wetHall + room[1][i] * wetRoom;
    }
    this.masterOut(L, R);
    return { L, R, N };
  }

  /** The master: tone, glue compression, a width lift, then loudness and a look-ahead limiter. */
  masterOut(L, R) {
    eq(L, R, [
      { type: 'hp', hz: 30, q: 0.7 },
      { type: 'ls', hz: 110, q: 0.7, g: -1 },
      { type: 'peak', hz: 190, q: 0.7, g: -3.5 },
      { type: 'peak', hz: 90, q: 0.8, g: -1.5 },
      { type: 'peak', hz: 2800, q: 0.7, g: 2 },
      { type: 'hs', hz: 6500, q: 0.7, g: 2.5 },
      ...(this.mix.masterEq ?? []),
    ]);
    widen(L, R, this.mix.width ?? 1.18);
    compress(L, R, { threshold: -22, ratio: 2.2, attack: 28, release: 220, knee: 8, makeup: 0 });
    compress(L, R, { threshold: -13, ratio: 4, attack: 4, release: 90, knee: 4, makeup: 0 });
    const ceiling = 0.891;
    for (let pass = 0; pass < 4; pass++) {
      const k = this.target / rms(L, R);
      for (let i = 0; i < L.length; i++) {
        L[i] *= k;
        R[i] *= k;
      }
      limit(L, R, ceiling, 5);
    }
  }
}

/** The MIDI pitch of pitch class `pc` at or above `base`. */
export function midiOfAbove(pc, base) {
  let m = base - (((base % 12) + 12) % 12) + pc;
  if (m < base) m += 12;
  return m;
}
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
export const noteName = (m) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

export function stats(L, R) {
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const r = rms(L, R);
  // (the energy in octave bands, in dB under the total, to see the balance at a glance)
  const bands = [];
  for (let hz = 62.5; hz < 9000; hz *= 2) {
    const a = new Biquad().set('hp', hz, 0.7);
    const b = new Biquad().set('lp', hz * 2, 0.7);
    let e = 0;
    for (let i = 0; i < L.length; i += 2) {
      const x = b.proc(a.proc(L[i] + R[i]));
      e += x * x;
    }
    bands.push(Math.round(linToDb(Math.sqrt(e / (L.length / 2)) / (2 * r))));
  }
  return { rmsDb: linToDb(r).toFixed(1), peakDb: linToDb(peak).toFixed(1), crest: (linToDb(peak) - linToDb(r)).toFixed(1), bands: bands.join(' ') };
}
