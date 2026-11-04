// Runes, the run's only gear (SEVEN-SLOT GEAR batch 4, docs/notes/gear-runes-design.md section 7; the owner's ask: "simple; they merge to
// level up ... call them runes. Each hero can have only 3 runes active in a run; they can be removed to merge"). A rune is a carved stone
// of a kind (Ember attack, Bulwark defence and hp, Arcana skill power, Gale speed, Hawk crits, Wellspring mending, Warding resist, and the
// wild Keystone) and a level, I to V. A hero kind sets up to three in its sockets for the run (`RuneState.worn`, by kind, so a hero merged
// or recycled keeps its runes); the rest wait in the bag (eight at most). Two of one kind and level, or one and a Keystone of that level,
// merge into one of the next level, wherever they are. Runes are set, taken off and merged between waves only, and are gone at the run's
// end: they are the run's, not the save's.
//
// Every source that handed out a run's gear hands out runes instead (`runGear.ts` `findGear`): it draws from its own stream exactly what
// it drew before, and the rune's kind from a side stream (`RUNE_SALT`), so events, relics and foes play out the same. A won wave of an
// army, the daily or a quest battle adds one rune of its own (`waveRune`).
//
// Pure rules: no Pixi, no DOM; every roll comes from a stream of the run's seed.

import { callingOf, emptyStats, type EquipStats } from './equipment';
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
/** One rune in this many is a Keystone. */
export const KEYSTONE_ONE_IN = 15;
/** A rune's strength by level, as a multiple of level I (index 0 unused). */
export const RUNE_LEVEL: readonly number[] = [0, 1, 2, 3.5, 5.5, 8];
/** One knob for every rune's numbers. Batch 8's balance set it at 0.7 alongside the seven slots' SLOT_SCALE, the Beast Packs' start and the
 *  daily's start, measured against every mode (docs/notes/gear-build.md, "Batch 8"). */
export const RUNE_SCALE = { k: 0.7 };
/** The kinds a rune can be (the Keystone only from the side stream's 1 in 15). */
export const RUNE_KINDS: readonly RuneKind[] = ['ember', 'bulwark', 'arcana', 'gale', 'hawk', 'wellspring', 'warding'];
export const RUNE_NAMES: Readonly<Record<RuneKind, string>> = {
  ember: 'Ember', bulwark: 'Bulwark', arcana: 'Arcana', gale: 'Gale', hawk: 'Hawk', wellspring: 'Wellspring', warding: 'Warding', keystone: 'Keystone',
};
/** What each kind gives at level I (shares are 0.04 for +4%; `def` flat; `pow` lifts the skills, as a talent's does). */
export const RUNE_STATS: Readonly<Record<RuneKind, Partial<Record<'atk' | 'hp' | 'def' | 'atkSpeed' | 'moveSpeed' | 'crit' | 'regen' | 'resist' | 'pow', number>>>> = {
  ember: { atk: 0.04 },
  bulwark: { def: 1, hp: 0.05 },
  arcana: { pow: 0.05 },
  gale: { atkSpeed: 0.04, moveSpeed: 0.04 },
  hawk: { crit: 0.045 },
  wellspring: { regen: 0.003 },
  warding: { resist: 0.05 },
  keystone: {},
};
/** The flourish a level V rune adds: a signature ability the gear already knows (`equipBases.ts`), at strength 0.7. */
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
  if (r.kind === 'keystone') return 'merges as a twin of any rune of its level';
  const k = RUNE_LEVEL[r.lv] * RUNE_SCALE.k;
  const pct = (v: number) => `${Math.round(v * k * 1000) / 10}%`;
  const s = RUNE_STATS[r.kind];
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
  if (r.lv === 5 && RUNE_FLOURISH[r.kind]) words.push(RUNE_FLOURISH[r.kind]!.name.split(': ')[1]);
  return words.join(', ');
}

// ---- getting runes ----

/** A rune from its side stream: one in fifteen a Keystone, else one of the seven kinds. Given the run's next id. */
export function rollRune(state: RuneState, seed: number, stage: number, source: number, n: number, lv: number): Rune {
  const rng = new Rng(mixSeed(seed, RUNE_SALT, stage, source, n));
  const kind: RuneKind = rng.int(1, KEYSTONE_ONE_IN) === 1 ? 'keystone' : RUNE_KINDS[rng.int(0, RUNE_KINDS.length - 1)];
  return { id: state.next++, kind, lv: Math.max(1, Math.min(5, Math.floor(lv))) as RuneLv };
}

/** Put a rune in the bag. A full bag merges it at once with a twin there if one is; else the lowest rune in the bag is broken for
 *  `BREAK_GOLD` (returned in `broke`, the gold for the caller to pay). */
export function addRune(state: RuneState, r: Rune): { merged?: Rune; broke?: Rune } {
  if (state.bag.length < BAG_MAX) {
    state.bag.push(r);
    return {};
  }
  const twin = state.bag.find((x) => canMerge(r, x));
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

/** Whether two runes merge: of one level below V, and of one kind (not two Keystones' alone) or one of them a Keystone. */
export function canMerge(a: Rune, b: Rune): boolean {
  if (a.id === b.id || a.lv !== b.lv || a.lv >= 5) return false;
  if (a.kind === 'keystone' && b.kind === 'keystone') return false;
  return a.kind === b.kind || a.kind === 'keystone' || b.kind === 'keystone';
}
/** The rune two make: the next level, of the kind that is not the Keystone; it keeps the id of the one dropped onto. */
const fuse = (dropped: Rune, onto: Rune): Rune => ({ id: onto.id, kind: onto.kind === 'keystone' ? dropped.kind : onto.kind, lv: (onto.lv + 1) as RuneLv });

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
/** The ids of the runes that have a twin somewhere (another of their kind and level, or a Keystone of their level): the page rims them. */
export function twinIds(state: RuneState): Set<number> {
  const all = allRunes(state);
  return new Set(all.filter((r) => all.some((o) => canMerge(r, o))).map((r) => r.id));
}
/** How many merges are ready (pairs, the highest first, each rune in one pair). */
export function mergesReady(state: RuneState): number {
  const copy: RuneState = JSON.parse(JSON.stringify(state));
  return mergeAll(copy).length;
}
/** Merge every pair that merges, highest level first, Keystones last, the result kept where the more used one was (on a hero over in the
 *  bag). Returns the runes made. */
export function mergeAll(state: RuneState): Rune[] {
  const made: Rune[] = [];
  for (;;) {
    const all = allRunes(state).sort((a, b) => b.lv - a.lv || Number(a.kind === 'keystone') - Number(b.kind === 'keystone') || a.id - b.id);
    let pair: [Rune, Rune] | undefined;
    for (const a of all) {
      if (a.kind === 'keystone') continue;
      const twin = all.find((b) => b.kind === a.kind && canMerge(a, b)) ?? all.find((b) => b.kind === 'keystone' && canMerge(a, b));
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
    const f = r.lv === 5 ? RUNE_FLOURISH[r.kind] : undefined;
    if (f && !out.abilities.some((a) => a.id === f.id)) out.abilities.push({ id: f.id, name: f.name, s: 0.7 });
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
  return out.join(', ');
}
/** Where a tapped rune can go, for the page to light up: the heroes it can be set on (a Keystone on none), the bag (when it is worn), and
 *  the runes it merges with. */
export function runeTargets(state: RuneState, id: number, kinds: readonly string[]): { heroes: string[]; bag: boolean; merge: number[] } {
  const at = whereRune(state, id);
  if (!at) return { heroes: [], bag: false, merge: [] };
  return {
    heroes: at.rune.kind === 'keystone' ? [] : kinds.filter((k) => k !== at.kind),
    bag: !!at.kind,
    merge: allRunes(state).filter((o) => canMerge(at.rune, o)).map((o) => o.id),
  };
}
/** Do what a tap on a target means: onto a rune, merge (or swap onto a hero's socket when they do not merge); onto a hero, set it (a full
 *  set gives up `swap`); onto the bag, take it off. Returns what happened, or null when nothing could. */
export function dropRune(state: RuneState, id: number, to: { rune?: number; kind?: string; bag?: boolean }): 'merged' | 'set' | 'off' | null {
  if (to.rune !== undefined) {
    if (mergeRunes(state, id, to.rune)) return 'merged';
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
