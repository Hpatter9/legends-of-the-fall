// The measuring side of tools/audio-mix: bundled by measure.mjs and run in headless Chromium, next to out/web's audio/ and sfx/
// folders. It renders the page's own sound (the real CueSynth, MusicPlayer, SpellBank and AmbientBeds, at the buses' levels from
// `audioMix.ts` and each cue's gain from `soundRules.ts`) into OfflineAudioContexts and meters each render's loudness (ITU-R
// BS.1770: K-weighted, gated, in LUFS) and peak. Nothing here ships in the game.

// (the sim first, in the order the page loads it, so its modules' cycles settle as they do in the game)
import { DEPLOY_ROWS, standable, tileAt } from '../../src/sim/board';
import { fight, place, startBattle, stepBattle, TICK_MS } from '../../src/sim/battle';
import '../../src/sim/run';
import { BusMixer, CueSynth, MusicPlayer } from '../../src/render/audioProcessors';
import { AmbientBeds } from '../../src/render/audioBeds';
import { SpellBank } from '../../src/render/spellBank';
import { MUSIC_LEVEL, SFX_LEVEL, TRACK_GAIN, UI_LEVEL, busOf } from '../../src/render/audioMix';
import { CUES, Mixer, cuesFor, type Cue } from '../../src/render/soundRules';
import { CAST_GAIN, EFFECT_DELAY, EFFECT_GAIN, SPELL_TRIM, STAR_GAIN } from '../../src/render/spellSfx';
import { panOfEvent, type Scene } from '../../src/render/audioRules';
import { EPIC_MANIFEST } from '../../src/render/epicManifest';
import { VICTORY_BED } from '../../src/render/battleMusic';
import { SPELLS, type SpellId } from '../../src/sim/spells';
import type { MusicId, StingId } from '../../src/render/epicMusic';
void BusMixer;

const RATE = 48000;

/* ------------------------------------------------------------------ the meter */

/** One biquad, run over a channel (direct form I). */
function biquad(x: Float32Array, b: number[], a: number[]): Float32Array {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

/** The K-weighting's two stages for a sample rate (the BS.1770 shelf and high-pass, designed for any rate). */
function kStages(fs: number): [number[], number[]][] {
  const stage = (G: number, Q: number, fc: number, shelf: boolean): [number[], number[]] => {
    const A = 10 ** (G / 40), w0 = (2 * Math.PI * fc) / fs, al = Math.sin(w0) / (2 * Q), cw = Math.cos(w0), sA = Math.sqrt(A);
    let b: number[], a: number[];
    if (shelf) {
      b = [A * (A + 1 + (A - 1) * cw + 2 * sA * al), -2 * A * (A - 1 + (A + 1) * cw), A * (A + 1 + (A - 1) * cw - 2 * sA * al)];
      a = [A + 1 - (A - 1) * cw + 2 * sA * al, 2 * (A - 1 - (A + 1) * cw), A + 1 - (A - 1) * cw - 2 * sA * al];
    } else {
      b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2];
      a = [1 + al, -2 * cw, 1 - al];
    }
    return [b.map((v) => v / a[0]), a.map((v) => v / a[0])];
  };
  return [stage(3.99984385397, 0.7071752369554193, 1681.9744509555319, true), stage(0, 0.5003270373253953, 38.13547087613982, false)];
}

export interface Meter {
  /** Integrated, gated loudness (LUFS). */
  lufs: number;
  /** The loudest 400 ms (momentary max, LUFS): the measure for a short sound. */
  mMax: number;
  /** The loudest 3 s (short-term max, LUFS). */
  sMax: number;
  /** Sample peak (dBFS). */
  peak: number;
  /** The share of 10 ms windows whose peak passes the master limiter's threshold (-2 dBFS): how often it would act. */
  overLimit: number;
}

const lufsOf = (ms: number) => -0.691 + 10 * Math.log10(Math.max(1e-12, ms));

/** Meters a stereo (or mono) render. */
export function meter(chs: Float32Array[], fs = RATE): Meter {
  const k = kStages(fs);
  const w = chs.map((x) => k.reduce((y, [b, a]) => biquad(y, b, a), x));
  const n = chs[0].length;
  // (the sum of the channels' squares, prefix-summed, so any window's mean square is two lookups)
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const c of w) s += c[i] * c[i];
    pre[i + 1] = pre[i] + s;
  }
  const win = (len: number, hop: number) => {
    const out: number[] = [];
    for (let i = 0; i + len <= n; i += hop) out.push((pre[i + len] - pre[i]) / len);
    return out;
  };
  const blocks = win(Math.round(0.4 * fs), Math.round(0.1 * fs));
  const abs = blocks.filter((z) => lufsOf(z) > -70);
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const rel = lufsOf(mean(abs)) - 10;
  const gated = abs.filter((z) => lufsOf(z) > rel);
  const short = win(Math.round(3 * fs), Math.round(0.1 * fs));
  let peak = 0;
  for (const c of chs) for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(c[i]));
  const thr = 10 ** (-2 / 20), step = Math.round(0.01 * fs);
  let over = 0, all = 0;
  for (let i = 0; i < n; i += step) {
    let p = 0;
    for (const c of chs) for (let j = i; j < Math.min(n, i + step); j++) p = Math.max(p, Math.abs(c[j]));
    if (p > 1e-5) { all++; if (p > thr) over++; }
  }
  return {
    lufs: gated.length ? lufsOf(mean(gated)) : -Infinity,
    mMax: blocks.length ? lufsOf(Math.max(...blocks)) : lufsOf(pre[n] / Math.max(1, n)),
    sMax: short.length ? lufsOf(Math.max(...short)) : lufsOf(pre[n] / Math.max(1, n)),
    peak: 20 * Math.log10(Math.max(1e-9, peak)),
    overLimit: all ? over / all : 0,
  };
}

const chans = (b: AudioBuffer) => Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(ok: () => boolean, ms = 8000): Promise<boolean> {
  const t0 = performance.now();
  while (!ok()) {
    if (performance.now() - t0 > ms) return false;
    await sleep(20);
  }
  return true;
}

/** The buses as the page sets them at both sliders' 100 % (the master's limiter is left out: the meters say how often it would act). */
function buses(oc: BaseAudioContext) {
  const mk = (g: number) => {
    const n = new GainNode(oc, { gain: g });
    n.connect(oc.destination);
    return n;
  };
  const sfx = mk(SFX_LEVEL), ui = mk(UI_LEVEL), music = mk(MUSIC_LEVEL);
  const show = new GainNode(oc, { gain: 1 });
  show.connect(sfx);
  return { sfx, ui, music, show, ambience: music } as Record<'sfx' | 'ui' | 'music' | 'show' | 'ambience', GainNode>;
}

/** A CueSynth on `oc` with the recorded combat samples decoded. */
async function synthOn(oc: BaseAudioContext, bus: ReturnType<typeof buses>): Promise<CueSynth> {
  const synth = new CueSynth(oc, (n) => bus[n]);
  await until(() => !!(synth as unknown as { bank: { get(n: string): unknown } }).bank.get('death'), 5000);
  await sleep(200);
  return synth;
}

/* ------------------------------------------------------------------ what is measured */

/** A music file at its playing level (through the real MusicPlayer, its trim and the music bus); `level` is the player's own (the
 *  triumph bed's is `VICTORY_BED`). The fade-in's first seconds are left out. */
export async function music(id: MusicId, level = 1): Promise<Meter & { chs?: Float32Array[] }> {
  const e = EPIC_MANIFEST[id as keyof typeof EPIC_MANIFEST];
  const secs = Math.min(e.seconds, 100) + 3;
  const oc = new OfflineAudioContext(2, Math.round(secs * RATE), RATE);
  const bus = buses(oc);
  const p = new MusicPlayer(oc);
  p.output.connect(bus.music);
  p.setTrack(id, level);
  if (!(await until(() => p.sounding.includes(id), 20000))) throw new Error(`${id} did not start`);
  const buf = await oc.startRendering();
  const from = Math.round(3 * RATE);
  return meter(chans(buf).map((c) => c.subarray(from)));
}

/** A sting (victory, defeat) once, as `MusicPlayer.sting` plays it. */
export async function sting(id: StingId): Promise<Meter> {
  const secs = EPIC_MANIFEST[id].seconds + 1;
  const oc = new OfflineAudioContext(2, Math.round(secs * RATE), RATE);
  const bus = buses(oc);
  const p = new MusicPlayer(oc);
  p.output.connect(bus.music);
  p.sting(id);
  if (!(await until(() => p.stingId === id, 10000))) throw new Error(`${id} did not ring`);
  return meter(chans(await oc.startRendering()));
}

/** One cue, played once at its mixing gain (`CUES`), on its own bus. */
export async function cue(name: Cue): Promise<Meter> {
  const oc = new OfflineAudioContext(2, Math.round(3.2 * RATE), RATE);
  const bus = buses(oc);
  const synth = await synthOn(oc, bus);
  synth.play(name, 0.05, { gain: CUES[name].gain, pitch: 1, bus: busOf(name) });
  return meter(chans(await oc.startRendering()));
}

/** Every cue's meter. */
export async function allCues(): Promise<Record<string, Meter>> {
  const out: Record<string, Meter> = {};
  for (const name of Object.keys(CUES) as Cue[]) out[name] = await cue(name);
  return out;
}

/** A king's spell: its cast and its effect at their gains (a meteor's effect at its fall; a shower's three stars). */
export async function spells(): Promise<Record<string, Meter>> {
  const out: Record<string, Meter> = {};
  const oc0 = new OfflineAudioContext(2, RATE, RATE);
  const bank0 = new SpellBank(oc0, oc0.destination);
  await bank0.load();
  for (const id of Object.keys(SPELLS) as SpellId[]) {
    const oc = new OfflineAudioContext(2, Math.round(5 * RATE), RATE);
    const bus = buses(oc);
    const bank = new SpellBank(oc, bus.sfx);
    // (the decoded buffers are shared from the first bank: one decode for all)
    (bank as unknown as { buffers: Map<string, AudioBuffer> }).buffers = (bank0 as unknown as { buffers: Map<string, AudioBuffer> }).buffers;
    const k = SPELL_TRIM[id];
    bank.play(`cast-${id}` as never, 0.05, CAST_GAIN * k, 0);
    if (id === 'meteor') bank.play('fx-meteor', 0.3, EFFECT_GAIN * k, 0);
    else if (id === 'starfall') {
      bank.play('fx-starfall', 0.05, EFFECT_GAIN * k, 0);
      for (let i = 0; i < 5; i++) bank.play('fx-star', 0.4 + i * 0.25, STAR_GAIN * k, (i - 2) / 3);
    } else bank.play(`fx-${id}` as never, 0.05 + EFFECT_DELAY[id] / 1000, EFFECT_GAIN * k, 0);
    out[id] = meter(chans(await oc.startRendering()));
  }
  return out;
}

/** An ambience bed for a scene, 20 s, on the ambience bus (it shares the music's level). */
export async function bed(scene: Scene): Promise<Meter> {
  const oc = new OfflineAudioContext(2, Math.round(20 * RATE), RATE);
  const bus = buses(oc);
  const beds = new AmbientBeds(oc, () => 0.5);
  beds.output.connect(bus.ambience);
  beds.setScene(scene);
  const buf = await oc.startRendering();
  beds.setScene(null);
  return meter(chans(buf).map((c) => c.subarray(3 * RATE)));
}

/** The families a fight's sounds are measured in. */
export function familyOf(c: Cue): 'hits' | 'shots' | 'deaths' | 'skills' {
  if (/^death/.test(c)) return 'deaths';
  if (/^hit|^crit$|^block$|^miss$|^arrowHit$|^bulletHit$|^boneClatter$/.test(c)) return 'hits';
  if (/^swing|^bow$|^arrowFly$|^gun$|^shell$|^throwBone$/.test(c)) return 'shots';
  return 'skills';
}

/** A seeded 0-1 stream, for the mixer's pitch (so a fight measures the same every run). */
function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** A whole fight of five heroes against `band`, its sounds through the page's mixer at ×1 speed (the closing sting left out),
 *  rendered once whole and once per family. With `withMusic`, the battle track is laid under the whole for the combined mix. */
export async function fightMix(seed: number, band: string, heroes: string[], track: MusicId = 'battle'): Promise<Record<string, Meter | number | string>> {
  const b = startBattle(seed, band);
  const spots: [number, number][] = [];
  for (let v = b.board.d - DEPLOY_ROWS; v < b.board.d; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  heroes.forEach((id, i) => place(b, id, ...spots[(i * 3) % spots.length]));
  fight(b);
  const mixer = new Mixer(14, seeded(seed));
  const plan: { at: number; cue: Cue; gain: number; pitch: number; pan: number }[] = [];
  let tick = 0;
  for (; tick < 1200 && b.phase === 'fight'; tick++) {
    const now = tick * TICK_MS;
    for (const e of stepBattle(b)) {
      if (e.kind === 'end') continue;
      const qs = cuesFor(b, e);
      if (!qs.length) continue;
      const pan = panOfEvent(b, e);
      for (const q of qs) {
        const v = mixer.request(q.cue, now + (q.delay ?? 0), 1, q.gain ?? 1);
        if (v) plan.push({ at: (now + (q.delay ?? 0)) / 1000, cue: q.cue, gain: v.gain, pitch: v.pitch, pan });
      }
    }
  }
  const secs = tick * TICK_MS / 1000 + 2.5;
  const render = async (keep: (c: Cue) => boolean) => {
    const oc = new OfflineAudioContext(2, Math.round(secs * RATE), RATE);
    const bus = buses(oc);
    const synth = await synthOn(oc, bus);
    for (const p of plan) if (keep(p.cue)) synth.play(p.cue, 0.05 + p.at, { gain: p.gain, pitch: p.pitch, bus: busOf(p.cue), pan: p.pan });
    return chans(await oc.startRendering());
  };
  const all = await render(() => true);
  const out: Record<string, Meter | number | string> = { seconds: +(secs - 2.5).toFixed(1), cues: plan.length, all: meter(all) };
  for (const fam of ['hits', 'shots', 'deaths', 'skills'] as const) {
    if (!plan.some((p) => familyOf(p.cue) === fam)) continue;
    out[fam] = meter(await render((c) => familyOf(c) === fam));
  }
  // (the combined mix: the fight over the battle track, from the track's file at its playing level)
  const oc = new OfflineAudioContext(2, Math.round(secs * RATE), RATE);
  const bus = buses(oc);
  const p = new MusicPlayer(oc);
  p.output.connect(bus.music);
  p.setTrack(track);
  await until(() => p.sounding.includes(track), 20000);
  const m = chans(await oc.startRendering());
  const sum = all.map((c, i) => c.map((x, j) => x + m[i][j]));
  out.withMusic = meter(sum);
  out.musicAlone = meter(m.map((c) => c.subarray(3 * RATE)));
  return out;
}

export { VICTORY_BED };

/** The gains in force, kept with a measurement so `targets.mjs` can say what would reach the targets. */
const gains = () => ({ TRACK_GAIN, SPELL_TRIM, CUES: Object.fromEntries(Object.entries(CUES).map(([k, v]) => [k, v.gain])), MUSIC_LEVEL, SFX_LEVEL, UI_LEVEL });

(window as unknown as { __mix: unknown }).__mix = { gains, meter, music, sting, cue, allCues, spells, bed, fightMix, VICTORY_BED };
