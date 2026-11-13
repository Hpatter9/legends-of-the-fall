// Runes, the run's only gear (SEVEN-SLOT GEAR batch 4, docs/notes/gear-runes-design.md section 7; the owner's ask: "simple; they merge to
// level up ... call them runes. Each hero can have only 3 runes active in a run; they can be removed to merge"). A rune is a carved stone
// of a kind (Ember attack, Bulwark defence and hp, Arcana skill power, Gale speed, Hawk crits, Wellspring mending, Warding resist, and the
// wild Keystone) and a level, I to V. A hero kind sets up to three in its sockets for the run (`RuneState.worn`, by kind, so a hero merged
// or recycled keeps its runes); the rest wait in the bag (eight at most). Two runes of one level merge into one of the next level, of the
// kind of the rune dropped onto; a Keystone lifts any rune a level. Runes are set, taken off and merged between waves only, and are gone at
// the run's end: they are the run's, not the save's.
//
// FEWER-RUNES (the owner: "There are too many runes. I want fewer to show up, but make them far more powerful"): about a third as many
// reach the player (a won wave gives one only on the first, every fourth wave and the last, `waveGivesRune`; the Calamity's fight finds are kept one
// time in three, `runGear.ts` `keepsFind`), each about four times as strong as before, and every rune carries its kind's signature, a
// small ability of its own that grows with its level (`RUNE_SIGNATURE`); level V adds the flourish (`docs/notes/fewer-runes.md`).
//
// Every source that handed out a run's gear hands out runes instead (`runGear.ts` `findGear`): it draws from its own stream exactly what
// it drew before, and the rune's kind from a side stream (`RUNE_SALT`), so events, relics and foes play out the same.
//
// Pure rules: no Pixi, no DOM; every roll comes from a stream of the run's seed.

import { CAPS, callingOf, emptyStats, type EquipStats } from './equipment';
import { mixSeed, Rng } from './rng';
import { UNITS } from './units';

export type RuneKind = 'ember' | 'bulwark' | 'arcana' | 'gale' | 'hawk' | 'wellspring' | 'warding' | 'keystone';
export type RuneLv = 1 | 2 | 3 | 4 | 5;
export interface Rune {
  /** Never reused in a run. */
  id: number;
  kind: RuneKind;
  lv: RuneLv;
}
/** A run's runes: the bag (not worn), what each hero kind wears (up to three), and the next id. */
export interface RuneState {
  bag: Rune[];
  worn: Record<string, Rune[]>;
  next: number;
}

/** The side stream a rune's kind comes from: `mixSeed(run.seed, RUNE_SALT, stage, source, n)`. */
export const RUNE_SALT = 0x52a4e;
/** A won wave's own rune is source 20 (the finds' sources are 1 to 12). */
export const WAVE_SOURCE = 20;
/** Sockets a hero has; no gear, relic or talent changes it. */
export const SOCKETS = 3;
/** Runes the bag holds. */
export const BAG_MAX = 8;
/** A rune broken for room in a full bag pays this much gold. */
export const BREAK_GOLD = 5;
/** One rune in this many is a Keystone (FEWER-RUNES: it was one in fifteen, when runes were thrice as many). */
export const KEYSTONE_ONE_IN = 10;
/** A won wave gives a rune when its number is a multiple of this, and on the run's last wave (FEWER-RUNES: it was every wave). */
export const RUNE_EVERY = 4;
/** A rune's strength by level, as a multiple of level I (index 0 unused). */
export const RUNE_LEVEL: readonly number[] = [0, 1, 2, 3.5, 5.5, 8];
/** One knob for every rune's numbers (`RUNE_STATS` are level I's at 1). Batch 8's balance set it at 0.7 on the old, small numbers;
 *  FEWER-RUNES wrote the new numbers into `RUNE_STATS` and measured this against every mode (docs/notes/fewer-runes.md). */
export const RUNE_SCALE = { k: 1 };
/** The kinds a rune can be (the Keystone only from the side stream's 1 in 15). */
export const RUNE_KINDS: readonly RuneKind[] = ['ember', 'bulwark', 'arcana', 'gale', 'hawk', 'wellspring', 'warding'];
export const RUNE_NAMES: Readonly<Record<RuneKind, string>> = {
  ember: 'Ember', bulwark: 'Bulwark', arcana: 'Arcana', gale: 'Gale', hawk: 'Hawk', wellspring: 'Wellspring', warding: 'Warding', keystone: 'Keystone',
};
/** What each kind gives at level I (shares are 0.15 for +15%; `def` flat; `pow` lifts the skills, as a talent's does). FEWER-RUNES: about
 *  four times the old numbers (Ember I was +2.8% attack, Bulwark I +0.7 defence and +3.5% hp, Hawk I +3.2% crit). */
export const RUNE_STATS: Readonly<Record<RuneKind, Partial<Record<'atk' | 'hp' | 'def' | 'atkSpeed' | 'moveSpeed' | 'crit' | 'regen' | 'resist' | 'pow', number>>>> = {
  ember: { atk: 0.14 },
  bulwark: { def: 3, hp: 0.14 },
  arcana: { pow: 0.15 },
  gale: { atkSpeed: 0.1, moveSpeed: 0.1 },
  hawk: { crit: 0.12 },
  wellspring: { regen: 0.008 },
  warding: { resist: 0.15 },
  keystone: {},
};
/** FEWER-RUNES: every rune's signature, a small ability the gear already knows (`equipBases.ts`), its strength by the rune's level
 *  (`SIGNATURE_S`); a hero wearing two of a kind has the stronger one. `text` is what it does, in the page's words. */
export const RUNE_SIGNATURE: Readonly<Partial<Record<RuneKind, { id: string; name: string; text: string }>>> = {
  ember: { id: 'emberBurst', name: 'Ember: kindling', text: 'a kill bursts in flame on the foes beside it' },
  bulwark: { id: 'parryBlow', name: 'Bulwark: brace', text: 'every fourth blow taken, it braces' },
  arcana: { id: 'inkWell', name: 'Arcana: gather', text: 'every fifth blow gathers skill charge' },
  gale: { id: 'quickWind', name: 'Gale: tailwind', text: 'a kill brings a burst of haste' },
  hawk: { id: 'keenEye', name: 'Hawk: talon', text: 'a crit makes the foe bleed' },
  wellspring: { id: 'mendingKnot', name: 'Wellspring: spring', text: 'mends once when badly hurt' },
  warding: { id: 'mirrorFlash', name: 'Warding: mirror', text: 'may turn a blow back on its striker' },
};
/** A signature's strength by the rune's level (index 0 unused): small at I, as a found piece's at V. */
export const SIGNATURE_S: readonly number[] = [0, 0.5, 0.65, 0.8, 0.9, 1];
/** The strength of the level V flourish (FEWER-RUNES: it was 0.7). */
export const FLOURISH_S = 1;
/** The flourish a level V rune adds on top of its signature: a signature ability the gear already knows (`equipBases.ts`), at `FLOURISH_S`. */
export const RUNE_FLOURISH: Readonly<Partial<Record<RuneKind, { id: string; name: string }>>> = {
  ember: { id: 'dragonfire', name: 'Ember V: blows burn' },
  bulwark: { id: 'scaledWard', name: 'Bulwark V: a ward at the start' },
  arcana: { id: 'meditation', name: 'Arcana V: the mind gathers charge' },
  gale: { id: 'sprint', name: 'Gale V: haste at the start' },
  hawk: { id: 'luckyStrike', name: 'Hawk V: a crit feeds the skill' },
  wellspring: { id: 'verdantMending', name: 'Wellspring V: mends every second' },
  warding: { id: 'wardingChime', name: 'Warding V: shrugs off an ailment' },
};

export const newRunes = (): RuneState => ({ bag: [], worn: {}, next: 1 });
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
/** "Ember rune II". */
export const runeName = (r: Pick<Rune, 'kind' | 'lv'>): string => `${RUNE_NAMES[r.kind]} rune ${ROMAN[r.lv]}`;
/** What a rune gives, in words ("+8% attack"). */
export function runeText(r: Pick<Rune, 'kind' | 'lv'>): string {
  if (r.kind === 'keystone') return 'merged onto any rune, lifts it a level';
  const k = RUNE_LEVEL[r.lv] * RUNE_SCALE.k;
  const pct = (v: number) => `${Math.round(v * k * 1000) / 10}%`;
  // (a stat past the gear's cap is told at the cap, as the fight has it: Wellspring V's mending, a high Hawk's crits)
  const s = Object.fromEntries(Object.entries(RUNE_STATS[r.kind]).map(([key, v]) => [key, Math.min(v, (CAPS[key as keyof typeof CAPS] ?? Infinity) / k)])) as (typeof RUNE_STATS)[RuneKind];
  const words: string[] = [];
  if (s.atk) words.push(`+${pct(s.atk)} attack`);
  if (s.def) words.push(`+${Math.round(s.def * k * 10) / 10} defence`);
  if (s.hp) words.push(`+${pct(s.hp)} hp`);
  if (s.pow) words.push(`+${pct(s.pow)} skill power`);
  if (s.atkSpeed) words.push(`+${pct(s.atkSpeed)} attack speed`);
  if (s.moveSpeed) words.push(`+${pct(s.moveSpeed)} move speed`);
  if (s.crit) words.push(`+${pct(s.crit)} crit chance`);
  if (s.regen) words.push(`mends ${pct(s.regen)} hp a second`);
  if (s.resist) words.push(`+${pct(s.resist)} resist`);
  if (RUNE_SIGNATURE[r.kind]) words.push(RUNE_SIGNATURE[r.kind]!.text);
  if (r.lv === 5 && RUNE_FLOURISH[r.kind]) words.push(RUNE_FLOURISH[r.kind]!.name.split(': ')[1]);
  return words.join(', ');
}

// ---- getting runes ----

/** A rune from its side stream: one in ten a Keystone, else one of the seven kinds. Given the run's next id. */
export function rollRune(state: RuneState, seed: number, stage: number, source: number, n: number, lv: number): Rune {
  const rng = new Rng(mixSeed(seed, RUNE_SALT, stage, source, n));
  const kind: RuneKind = rng.int(1, KEYSTONE_ONE_IN) === 1 ? 'keystone' : RUNE_KINDS[rng.int(0, RUNE_KINDS.length - 1)];
  const r: Rune = { id: state.next++, kind, lv: Math.max(1, Math.min(5, Math.floor(lv))) as RuneLv };
  if (RUNE_TALLY.on) RUNE_TALLY.made.set(r.id, source);
  return r;
}

/** For the measuring tools only (`tools/fewer-runes/count.ts`): with `on`, where each rune made came from and the runes the bag took, by
 *  source. Off in the game; it changes nothing. */
export const RUNE_TALLY = { on: false, made: new Map<number, number>(), got: [] as { source: number; lv: number }[] };

/** Whether a won wave gives a rune (FEWER-RUNES): the first (RUNE-WAVE-ONE, the owner's yes: a run's heroes have a rune from wave 2),
 *  every `RUNE_EVERY`th wave, and the last (`waves`, the run's count; 0 when it has none). */
export const waveGivesRune = (stage: number, waves: number): boolean => stage === 1 || stage % RUNE_EVERY === 0 || (waves > 0 && stage >= waves);

/** Put a rune in the bag. A full bag merges it at once with a twin there if one is; else the lowest rune in the bag is broken for
 *  `BREAK_GOLD` (returned in `broke`, the gold for the caller to pay). */
export function addRune(state: RuneState, r: Rune): { merged?: Rune; broke?: Rune } {
  if (RUNE_TALLY.on) RUNE_TALLY.got.push({ source: RUNE_TALLY.made.get(r.id) ?? 0, lv: r.lv });
  if (state.bag.length < BAG_MAX) {
    state.bag.push(r);
    return {};
  }
  const twin = state.bag.find((x) => areTwins(r, x));
  if (twin) {
    const made = fuse(r, twin);
    state.bag[state.bag.indexOf(twin)] = made;
    return { merged: made };
  }
  const low = [...state.bag].sort((a, b) => a.lv - b.lv || a.id - b.id)[0];
  if (low.lv <= r.lv) {
    state.bag[state.bag.indexOf(low)] = r;
    return { broke: low };
  }
  return { broke: r };
}

// ---- merging ----

/** Whether two runes merge (FEWER-RUNES: runes are rarer, so any two of a level may): two runes of one level below V, of any kinds; or a
 *  Keystone and a rune of any level below V (not two Keystones). */
export function canMerge(a: Rune, b: Rune): boolean {
  if (a.id === b.id) return false;
  if (a.kind === 'keystone' && b.kind === 'keystone') return false;
  if (a.kind === 'keystone' || b.kind === 'keystone') return (a.kind === 'keystone' ? b : a).lv < 5;
  return a.lv === b.lv && a.lv < 5;
}
/** Whether two runes are twins, the merges Merge all, Auto and a full bag make, and the page rims: of one kind and level, or a Keystone and
 *  a rune. A merge of two kinds is the player's own choice. */
export function areTwins(a: Rune, b: Rune): boolean {
  return canMerge(a, b) && (a.kind === b.kind || a.kind === 'keystone' || b.kind === 'keystone');
}
/** The rune two make: the next level of the rune that is not the Keystone, of the kind of the one dropped onto (or the other, when that
 *  was the Keystone); it keeps the id of the one dropped onto. */
const fuse = (dropped: Rune, onto: Rune): Rune => {
  const rune = onto.kind === 'keystone' ? dropped : onto;
  return { id: onto.id, kind: rune.kind, lv: (rune.lv + 1) as RuneLv };
};

/** Where a rune is: in the bag, or on a hero kind. */
export function whereRune(state: RuneState, id: number): { kind?: string; rune: Rune } | undefined {
  const inBag = state.bag.find((x) => x.id === id);
  if (inBag) return { rune: inBag };
  for (const [kind, list] of Object.entries(state.worn)) {
    const r = list.find((x) => x.id === id);
    if (r) return { kind, rune: r };
  }
  return undefined;
}
const pull = (state: RuneState, id: number): void => {
  state.bag = state.bag.filter((x) => x.id !== id);
  for (const k of Object.keys(state.worn)) {
    state.worn[k] = state.worn[k].filter((x) => x.id !== id);
    if (!state.worn[k].length) delete state.worn[k];
  }
};
/** Merge rune `dropped` onto rune `onto`: the new rune takes the place `onto` was in (a Keystone made into a rune on a hero stays there; a
 *  Keystone itself never sits in a socket, so a merge onto one is in the bag). Returns it, or null (nothing changes) when they do not merge. */
export function mergeRunes(state: RuneState, dropped: number, onto: number): Rune | null {
  const a = whereRune(state, dropped);
  const b = whereRune(state, onto);
  if (!a || !b || !canMerge(a.rune, b.rune)) return null;
  const made = fuse(a.rune, b.rune);
  pull(state, dropped);
  if (b.kind) state.worn[b.kind] = (state.worn[b.kind] ?? []).map((x) => (x.id === onto ? made : x));
  else state.bag = state.bag.map((x) => (x.id === onto ? made : x));
  return made;
}

/** Every rune of the run, worn or not. */
export const allRunes = (state: RuneState): Rune[] => [...state.bag, ...Object.values(state.worn).flat()];
/** The ids of the runes that have a twin somewhere (another of their kind and level, or a Keystone): the page rims them. */
export function twinIds(state: RuneState): Set<number> {
  const all = allRunes(state);
  return new Set(all.filter((r) => all.some((o) => areTwins(r, o))).map((r) => r.id));
}
/** How many merges are ready (pairs, the highest first, each rune in one pair). */
export function mergesReady(state: RuneState): number {
  const copy: RuneState = JSON.parse(JSON.stringify(state));
  return mergeAll(copy).length;
}
/** Merge every pair of twins, highest level first, Keystones last (each onto the highest rune), the result kept where the more used one was
 *  (on a hero over in the bag). Two runes of different kinds are never merged here: that is the player's choice. Returns the runes made. */
export function mergeAll(state: RuneState): Rune[] {
  const made: Rune[] = [];
  for (;;) {
    const all = allRunes(state).sort((a, b) => b.lv - a.lv || Number(a.kind === 'keystone') - Number(b.kind === 'keystone') || a.id - b.id);
    let pair: [Rune, Rune] | undefined;
    for (const a of all) {
      if (a.kind === 'keystone') continue;
      const twin = all.find((b) => b.kind === a.kind && areTwins(a, b)) ?? all.find((b) => b.kind === 'keystone' && areTwins(a, b));
      if (twin) {
        pair = [a, twin];
        break;
      }
    }
    if (!pair) return made;
    // (onto the one a hero wears, so the result stays on it)
    const [x, y] = pair;
    const onto = y.kind !== 'keystone' && whereRune(state, y.id)?.kind && !whereRune(state, x.id)?.kind ? y : x;
    const r = mergeRunes(state, onto === x ? y.id : x.id, onto.id);
    if (!r) return made;
    made.push(r);
  }
}

// ---- sockets ----

/** Set a rune on a hero kind (from the bag, or from another hero): a full set of sockets gives up `swap` (or its first) to the bag. False
 *  when the rune is not the run's or is a Keystone (never worn). */
export function setRune(state: RuneState, kind: string, id: number, swap?: number): boolean {
  const at = whereRune(state, id);
  if (!at || at.rune.kind === 'keystone' || at.kind === kind) return false;
  const mine = state.worn[kind] ?? [];
  if (mine.length >= SOCKETS) {
    const out = mine.find((x) => x.id === swap) ?? mine[0];
    takeOffRune(state, kind, out.id);
  }
  pull(state, id);
  (state.worn[kind] ??= []).push(at.rune);
  return true;
}
/** Take a rune off a hero, into the bag (free). */
export function takeOffRune(state: RuneState, kind: string, id: number): boolean {
  const r = state.worn[kind]?.find((x) => x.id === id);
  if (!r) return false;
  pull(state, id);
  state.bag.push(r);
  return true;
}

// ---- strength ----

/** What a hero's worn runes give in a fight, as equipment stats (Arcana's skill power as a talent's `pow`), or undefined when none. */
export function runeStats(worn: readonly Rune[] | undefined): EquipStats | undefined {
  if (!worn?.length) return undefined;
  const out = emptyStats();
  let pow = 0;
  for (const r of worn) {
    const k = RUNE_LEVEL[r.lv] * RUNE_SCALE.k;
    for (const [stat, v] of Object.entries(RUNE_STATS[r.kind]) as [string, number][]) {
      if (stat === 'pow') pow += v * k;
      else (out as unknown as Record<string, number>)[stat] += v * k;
    }
    // (the kind's signature, the strongest of a kind the hero wears; and level V's flourish)
    const sig = RUNE_SIGNATURE[r.kind];
    const had = sig && out.abilities.find((a) => a.id === sig.id);
    if (sig && !had) out.abilities.push({ id: sig.id, name: sig.name, s: SIGNATURE_S[r.lv] });
    else if (had) had.s = Math.max(had.s, SIGNATURE_S[r.lv]);
    const f = r.lv === 5 ? RUNE_FLOURISH[r.kind] : undefined;
    if (f && !out.abilities.some((a) => a.id === f.id)) out.abilities.push({ id: f.id, name: f.name, s: FLOURISH_S });
  }
  if (pow) out.tal = { pow };
  return out;
}

// ---- Auto ----

type Role = 'front' | 'shooter' | 'caster' | 'healer';
/** A hero's role for the runes: a healer (its role says so), a shooter or caster (its shots), else a front-liner. */
export function runeRole(kind: string): Role {
  const def = UNITS[kind];
  if (def && /heal|mend/i.test(def.role ?? '')) return 'healer';
  const c = callingOf(kind);
  return c === 'shooter' ? 'shooter' : c === 'caster' ? 'caster' : 'front';
}
/** How much each role wants each kind. */
export const RUNE_ROLE: Readonly<Record<Role, Readonly<Record<Exclude<RuneKind, 'keystone'>, number>>>> = {
  front: { bulwark: 1.2, ember: 1, warding: 0.9, wellspring: 0.7, gale: 0.6, hawk: 0.6, arcana: 0.4 },
  shooter: { hawk: 1.2, gale: 1.1, ember: 1, arcana: 0.5, warding: 0.5, wellspring: 0.5, bulwark: 0.4 },
  caster: { arcana: 1.2, hawk: 0.9, ember: 0.7, gale: 0.6, warding: 0.6, wellspring: 0.5, bulwark: 0.4 },
  healer: { arcana: 1.1, wellspring: 1.1, warding: 0.8, bulwark: 0.6, gale: 0.5, hawk: 0.4, ember: 0.3 },
};
const rate = (kind: string, r: Rune): number => (r.kind === 'keystone' ? 0 : RUNE_ROLE[runeRole(kind)][r.kind] * RUNE_LEVEL[r.lv]);

/** Auto runes (the button, auto-replay before every wave, and the balance bot): merge everything that merges, then hand the runes out, the
 *  best first, to the heroes named (the strongest first), three a hero, each to the hero that wants it most; a rune stays on its hero
 *  unless the new place rates it a tenth higher. Heroes not named keep theirs. Returns how many runes changed hands. */
export function autoRunes(state: RuneState, kinds: readonly string[]): number {
  const list = [...new Set(kinds)];
  const before = new Map(list.flatMap((k) => (state.worn[k] ?? []).map((r) => [r.id, k] as const)));
  for (const k of list) for (const r of [...(state.worn[k] ?? [])]) takeOffRune(state, k, r.id);
  mergeAll(state);
  const pool = state.bag.filter((r) => r.kind !== 'keystone').sort((a, b) => b.lv - a.lv || a.id - b.id);
  let changed = 0;
  for (const r of pool) {
    const open = list.filter((k) => (state.worn[k]?.length ?? 0) < SOCKETS);
    if (!open.length) break;
    const best = open.reduce((p, k) => (rate(k, r) > rate(p, r) + 1e-9 ? k : p), open[0]);
    const was = before.get(r.id);
    const to = was && open.includes(was) && rate(best, r) < rate(was, r) * 1.1 ? was : best;
    setRune(state, to, r.id);
    if (to !== was) changed++;
  }
  return changed;
}

/** Saved runes that are sane: known kinds and levels, unique ids, at most three a hero; anything else is dropped. Undefined when none. */
export function readRunes(raw: unknown): RuneState | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<RuneState>;
  const seen = new Set<number>();
  const ok = (x: unknown): x is Rune => {
    const y = x as Rune;
    if (!y || typeof y.id !== 'number' || seen.has(y.id) || !(y.kind in RUNE_NAMES) || ![1, 2, 3, 4, 5].includes(y.lv)) return false;
    seen.add(y.id);
    return true;
  };
  const bag = Array.isArray(r.bag) ? r.bag.filter(ok) : [];
  const worn: Record<string, Rune[]> = {};
  for (const [k, list] of Object.entries(r.worn ?? {})) if (Array.isArray(list)) {
    const l = list.filter(ok).filter((x) => x.kind !== 'keystone').slice(0, SOCKETS);
    if (l.length) worn[k] = l;
  }
  const next = Math.max(typeof r.next === 'number' ? r.next : 1, ...[...bag, ...Object.values(worn).flat()].map((x) => x.id + 1), 1);
  return { bag, worn, next };
}

// ---- the page's helpers (SEVEN-SLOT GEAR batch 5: the rune tray and the bench's sockets read these; pure) ----

/** A hero's three sockets for the page: the rune in each (or none), and whether it has a twin somewhere. */
export function socketsOf(state: RuneState, kind: string): { rune?: Rune; twin: boolean }[] {
  const twins = twinIds(state);
  const worn = state.worn[kind] ?? [];
  return Array.from({ length: SOCKETS }, (_, i) => ({ rune: worn[i], twin: !!worn[i] && twins.has(worn[i].id) }));
}
/** What a hero's worn runes give, in a line ("+4% attack, +2.5% hp"); empty when none. */
export function runeTotals(worn: readonly Rune[] | undefined): string {
  const s = runeStats(worn);
  if (!s) return '';
  // (at the gear's caps, as the fight has them)
  for (const [key, cap] of Object.entries(CAPS)) (s as unknown as Record<string, number>)[key] = Math.min(cap!, (s as unknown as Record<string, number>)[key]);
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
  const out: string[] = [];
  if (s.atk) out.push(`+${pct(s.atk)} attack`);
  if (s.hp) out.push(`+${pct(s.hp)} hp`);
  if (s.def) out.push(`+${Math.round(s.def * 10) / 10} defence`);
  if (s.tal?.pow) out.push(`+${pct(s.tal.pow)} skill power`);
  if (s.atkSpeed) out.push(`+${pct(s.atkSpeed)} attack speed`);
  if (s.moveSpeed) out.push(`+${pct(s.moveSpeed)} move speed`);
  if (s.crit) out.push(`+${pct(s.crit)} crit chance`);
  if (s.regen) out.push(`mends ${pct(s.regen)} hp/s`);
  if (s.resist) out.push(`+${pct(s.resist)} resist`);
  // (FEWER-RUNES: the signatures and flourishes it carries, by their short names)
  for (const a of s.abilities) out.push(a.name.split(': ')[1] ?? a.name);
  return out.join(', ');
}
/** Where a rune can go, for the page to light up: the heroes it can be set on (a Keystone on none), the bag (when it is worn), the runes
 *  it merges with when dragged (any of its level, or any with a Keystone), and its twins (what a tap merges with). */
export function runeTargets(state: RuneState, id: number, kinds: readonly string[]): { heroes: string[]; bag: boolean; merge: number[]; twins: number[] } {
  const at = whereRune(state, id);
  if (!at) return { heroes: [], bag: false, merge: [], twins: [] };
  return {
    heroes: at.rune.kind === 'keystone' ? [] : kinds.filter((k) => k !== at.kind),
    bag: !!at.kind,
    merge: allRunes(state).filter((o) => canMerge(at.rune, o)).map((o) => o.id),
    twins: allRunes(state).filter((o) => areTwins(at.rune, o)).map((o) => o.id),
  };
}
/** Do what a tap on a target means: onto a rune, merge (or swap onto a hero's socket when they do not merge); onto a hero, set it (a full
 *  set gives up `swap`); onto the bag, take it off. Returns what happened, or null when nothing could. A tap merges twins only; `anyKind`
 *  (the bench's drag) merges any two of a level too (FEWER-RUNES). */
export function dropRune(state: RuneState, id: number, to: { rune?: number; kind?: string; bag?: boolean; anyKind?: boolean }): 'merged' | 'set' | 'off' | null {
  if (to.rune !== undefined) {
    const a = whereRune(state, id)?.rune;
    const b = whereRune(state, to.rune)?.rune;
    if (a && b && (to.anyKind || areTwins(a, b)) && mergeRunes(state, id, to.rune)) return 'merged';
    const onto = whereRune(state, to.rune);
    if (onto?.kind && setRune(state, onto.kind, id, to.rune)) return 'set';
    return null;
  }
  if (to.kind) return setRune(state, to.kind, id) ? 'set' : null;
  if (to.bag) {
    const at = whereRune(state, id);
    return at?.kind && takeOffRune(state, at.kind, id) ? 'off' : null;
  }
  return null;
}
/** A rune's colour on the page (until its painted stone: docs/notes/gear-art-todo.md). */
export const RUNE_COLOUR: Readonly<Record<RuneKind, string>> = {
  ember: '#d9503b', bulwark: '#8f969e', arcana: '#9b6bd6', gale: '#5fbf6a', hawk: '#e0b545', wellspring: '#4f9fe0', warding: '#e9e4d8', keystone: '#1d1d22',
};
