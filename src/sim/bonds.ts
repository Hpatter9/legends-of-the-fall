// Hero bonds and rivalries (DEPTH-BUILD, docs/notes/depth-design.md section 4). Two heroes both placed in a won wave earn a bond point.
// At 10, 40, 120, 300 and 600 points the pair reaches bond levels 1 to 5; any pair can reach level 2 ("Comrades"), levels 3 to 5 are for
// kindred pairs, written from the heroes' stories and the duo combos. A bond gives a small reward while both stand within two tiles (the
// owner's call, Q4.1: small power to level 4, none past it). Rival pairs charge their skills 10% slower within two tiles of each other,
// and a rival who sees the other fall fights 10% harder for the rest of the wave; rivals who win ten waves together settle into a kindred
// pair at bond level 1 (Q4.3). Bonds count in the armies only (not the daily, the spire or the Calamity). A run takes a snapshot of the
// levels when it starts (`Run.bonds`), so its fights replay. Deterministic: no stream is drawn from. Pure rules: no Pixi, no DOM.

import type { Battle, Unit } from './battle';
import { ALL_HEROES } from './units';

/** The pair's key: the two kinds in alphabetical order ("knight|peasant"). */
export const bondKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

const K = (a: string, b: string) => bondKey(a, b);
/** The kindred pairs (levels 3 to 5 and scenes are theirs). */
export const KINDRED: readonly string[] = [
  // (the duo combos)
  K('knight', 'peasant'), K('samurai', 'kunoichi'), K('archer', 'lightningMage'), K('wizard', 'wanderer'), K('paladin', 'cleric'),
  K('werewolf', 'barbarian'), K('rifleBot', 'siegeBot'), K('kitsune', 'karasu'),
  // (written from the heroes' stories)
  K('knight', 'paladin'), K('archer', 'ranger'), K('ninjaMonk', 'yamabushi'), K('samurai', 'samuraiCommander'), K('cleric', 'priestess'),
  K('druid', 'satyr'), K('druid', 'wolfBard'), K('werewolf', 'wolfBard'), K('beastmaster', 'minotaur'), K('gorgon', 'minotaur'),
  K('kraken', 'buccaneer'), K('buccaneer', 'dreadPirate'), K('mummy', 'shambler'), K('reaper', 'demonSwordsman'), K('timeWitch', 'sage'),
  K('illusionist', 'wizard'), K('warlock', 'tyrant'), K('gunslinger', 'rifleBot'), K('lancer', 'dragoon'), K('juggernaut', 'siegeBot'),
  K('kunoichi', 'ninjaMonk'), K('peasant', 'ranger'), K('sage', 'priestess'), K('kitsune', 'yamabushi'), K('arcBlade', 'lightningMage'),
  K('mercenary', 'gunslinger'), K('paladin', 'lancer'), K('barbarian', 'juggernaut'), K('wanderer', 'sage'), K('beastmaster', 'ranger'),
  K('karasu', 'yamabushi'), K('druid', 'kitsune'),
];
/** The rival pairs, rivals from the start until they settle. */
export const RIVALS: readonly string[] = [
  K('samuraiCommander', 'mercenary'), K('wizard', 'warlock'), K('paladin', 'demonSwordsman'), K('priestess', 'reaper'), K('knight', 'tyrant'),
  K('ranger', 'werewolf'), K('dreadPirate', 'lancer'), K('gunslinger', 'arcBlade'), K('cleric', 'mummy'), K('timeWitch', 'illusionist'),
  K('dragoon', 'kraken'), K('samurai', 'ninjaMonk'), K('barbarian', 'minotaur'), K('satyr', 'shambler'), K('juggernaut', 'rifleBot'),
];

/** The points each bond level needs, and its name. */
export const BOND_POINTS: readonly number[] = [10, 40, 120, 300, 600];
export const BOND_NAMES: readonly string[] = ['', 'Acquainted', 'Comrades', 'Sworn', 'Shieldmates', 'Bound'];
/** Wins together that settle a rivalry. */
export const SETTLE_WINS = 10;

/** The numbers (one place to tune them). */
export const BOND = {
  RANGE: 2,
  /** Attack while within range: level 2, and level 4 in all. */
  ATK2: 0.03,
  ATK4: 0.06,
  /** Level 4: the pair's skills charge this much faster while together. */
  CHARGE4: 0.05,
  /** Level 3: once a wave, when one would fall, the other's guard takes this share of that blow. */
  COVER: 0.2,
  /** Rivals within range charge their skills this much slower; one who sees the other fall fights this much harder. */
  RIVAL_SLOW: 0.1,
  FURY: 0.1,
};

/** The slice of the save the bonds read and change (all optional; missing is no bonds). */
export interface BondMeta {
  bonds?: Record<string, number>;
  /** Rivalries settled into kindred pairs. */
  bondSettled?: string[];
  bondScenes?: string[];
}

export const isKindred = (m: BondMeta, key: string): boolean => KINDRED.includes(key) || !!m.bondSettled?.includes(key);
/** Whether a pair are rivals still (not yet settled). */
export const isRival = (m: BondMeta, key: string): boolean => RIVALS.includes(key) && !m.bondSettled?.includes(key);

/** A pair's level from its points: levels past 2 only for a kindred pair; a rival pair has none until it settles. */
export function bondLevel(points: number, kindred: boolean): number {
  let lv = 0;
  while (lv < BOND_POINTS.length && points >= BOND_POINTS[lv]) lv++;
  return kindred ? lv : Math.min(2, lv);
}
export const levelOf = (m: BondMeta, key: string): number => (isRival(m, key) ? 0 : bondLevel(m.bonds?.[key] ?? 0, isKindred(m, key)));

/** The run's snapshot (`Run.bonds`): each pair's level, -1 for rivals not yet settled. Only pairs with something to say. */
export function bondSnapshot(m: BondMeta): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of RIVALS) if (isRival(m, key)) out[key] = -1;
  for (const key of Object.keys(m.bonds ?? {})) {
    if (isRival(m, key)) continue;
    const lv = levelOf(m, key);
    if (lv > 0) out[key] = lv;
  }
  return out;
}

/** What a won wave did to the bonds: the levels risen and the rivalries settled, for the recap. */
export interface BondNote {
  ups: { key: string; from: number; to: number }[];
  settled: string[];
}

/** The hero kinds placed in a fight (each once): its heroes, not summons. */
export const placedKinds = (b: Pick<Battle, 'units'>): string[] => [...new Set(b.units.filter((u) => u.side === 'hero' && u.owner === undefined && ALL_HEROES.includes(u.def)).map((u) => u.def))];

/** A settled army wave (from `settleRun`): a win gives every pair placed together a point; a rivalry settles at ten wins together. */
export function noteBonds(m: BondMeta, b: Pick<Battle, 'units'>, won: boolean): BondNote {
  const note: BondNote = { ups: [], settled: [] };
  if (!won) return note;
  const kinds = placedKinds(b).sort();
  for (let i = 0; i < kinds.length; i++)
    for (let j = i + 1; j < kinds.length; j++) {
      const key = bondKey(kinds[i], kinds[j]);
      const before = levelOf(m, key);
      const pts = ((m.bonds ??= {})[key] = (m.bonds[key] ?? 0) + 1);
      if (isRival(m, key) && pts >= SETTLE_WINS) {
        (m.bondSettled ??= []).push(key);
        m.bonds[key] = Math.max(pts, BOND_POINTS[0]);
        note.settled.push(key);
      }
      const after = levelOf(m, key);
      if (after > before) note.ups.push({ key, from: before, to: after });
    }
  return note;
}

/** The recap's lines: "Knight and Peasant: Comrades → Sworn", "Wizard and Warlock settle their rivalry". */
export function bondLines(n: BondNote | undefined, nameOf: (kind: string) => string): string[] {
  if (!n) return [];
  const pair = (key: string) => key.split('|').map(nameOf).join(' and ');
  return [...n.settled.map((k) => `${pair(k)} settle their rivalry: kindred now`), ...n.ups.map((u) => `${pair(u.key)}: ${BOND_NAMES[u.from] || 'Strangers'} → ${BOND_NAMES[u.to]}`)];
}

/* ------------------------------------------------------------------ in the fight */

/** A pair on the board, fixed as the fight starts: its two fighters, its level (-1 rivals), and whether its cover is spent this wave. */
export interface BondPair {
  a: number;
  b: number;
  lv: number;
  covered?: boolean;
}

/** As the fight starts: the placed pairs that have a bond or a rivalry, from the run's snapshot. */
export function startBonds(b: Battle, snap: Record<string, number> | undefined): void {
  if (!snap) return;
  const heroes = b.units.filter((u) => u.side === 'hero' && u.owner === undefined && u.alive);
  const pairs: BondPair[] = [];
  for (let i = 0; i < heroes.length; i++)
    for (let j = i + 1; j < heroes.length; j++) {
      if (heroes[i].def === heroes[j].def) continue;
      const lv = snap[bondKey(heroes[i].def, heroes[j].def)];
      if (lv) pairs.push({ a: heroes[i].id, b: heroes[j].id, lv });
    }
  if (pairs.length) b.bonds = pairs;
}

const near = (x: Unit, y: Unit): boolean => Math.abs(x.u - y.u) + Math.abs(x.v - y.v) <= BOND.RANGE;

/** Each tick: each bonded or rival hero's attack and charge for where it stands now. */
export function tickBonds(b: Battle): void {
  const pairs = b.bonds;
  if (!pairs) return;
  const byId = new Map(b.units.map((u) => [u.id, u]));
  for (const p of pairs) for (const id of [p.a, p.b]) {
    const u = byId.get(id);
    if (u) (u.bondAtk = 1), (u.bondCd = 1);
  }
  for (const p of pairs) {
    const x = byId.get(p.a);
    const y = byId.get(p.b);
    if (!x?.alive || !y?.alive || !near(x, y)) continue;
    for (const u of [x, y]) {
      if (p.lv < 0) u.bondCd! *= 1 + BOND.RIVAL_SLOW;
      else {
        if (p.lv >= 2) u.bondAtk! *= 1 + (p.lv >= 4 ? BOND.ATK4 : BOND.ATK2);
        if (p.lv >= 4) u.bondCd! *= 1 - BOND.CHARGE4;
      }
    }
  }
}

/** A blow that would fell a bonded hero (level 3 and up): once a wave, the partner within range takes this share of it on its guard
 *  (never falling to it). Returns what is left of the blow. */
export function bondCover(b: Battle, to: Unit, dmg: number): number {
  const pairs = b.bonds;
  if (!pairs || dmg < to.hp) return dmg;
  for (const p of pairs) {
    if (p.lv < 3 || p.covered || (p.a !== to.id && p.b !== to.id)) continue;
    const other = b.units.find((u) => u.id === (p.a === to.id ? p.b : p.a));
    if (!other?.alive || !near(other, to)) continue;
    p.covered = true;
    const share = Math.min(Math.round(dmg * BOND.COVER), Math.max(0, other.hp - 1));
    other.hp -= share;
    return dmg - share;
  }
  return dmg;
}

/** A hero has fallen: a rival who sees it fights harder for the rest of the wave. */
export function bondFall(b: Battle, to: Unit): void {
  for (const p of b.bonds ?? []) {
    if (p.lv >= 0 || (p.a !== to.id && p.b !== to.id)) continue;
    const other = b.units.find((u) => u.id === (p.a === to.id ? p.b : p.a));
    if (other?.alive && !other.bondFury) other.bondFury = 1 + BOND.FURY;
  }
}

/** Saved bonds read back: odd values dropped. */
export function readBonds(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const [a, b] = k.split('|');
    const n = Math.floor(Number(v));
    if (a && b && a < b && ALL_HEROES.includes(a) && ALL_HEROES.includes(b) && n > 0) out[k] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

/** The pairs among these kinds that have a bond or a rivalry in the snapshot (for the deploy board's Bonds chip). */
export function placedPairs(snap: Record<string, number> | undefined, kinds: readonly string[]): { key: string; lv: number }[] {
  if (!snap) return [];
  const ks = [...new Set(kinds)].sort();
  const out: { key: string; lv: number }[] = [];
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
    const key = bondKey(ks[i], ks[j]);
    if (snap[key]) out.push({ key, lv: snap[key] });
  }
  return out;
}
/** What a pair's level does, in a few words. */
export function pairWords(lv: number): string {
  if (lv < 0) return 'rivals: skills charge 10% slower within two tiles';
  return [
    BOND_NAMES[lv],
    lv >= 4 ? '+6% attack and skills 5% quicker within two tiles' : lv >= 2 ? '+3% attack within two tiles' : 'a thread between them',
    lv >= 3 ? 'covers the other once a wave' : '',
  ].filter(Boolean).join(': ').replace(': covers', ', covers');
}

/** A hero's partners for the hero sheet: every pair with points, and its rivals, strongest first (rivals after the bonds). */
export function partnersOf(m: BondMeta, kind: string): { kind: string; points: number; lv: number; kindred: boolean; rival: boolean; next?: number }[] {
  const keys = new Set([...Object.keys(m.bonds ?? {}), ...RIVALS, ...KINDRED].filter((k) => k.split('|').includes(kind)));
  return [...keys]
    .map((key) => {
      const other = key.split('|').find((k) => k !== kind) ?? kind;
      const points = m.bonds?.[key] ?? 0;
      const kindred = isKindred(m, key);
      const lv = levelOf(m, key);
      const top = kindred ? BOND_POINTS.length : 2;
      return { kind: other, points, lv, kindred, rival: isRival(m, key), ...(lv < top ? { next: BOND_POINTS[lv] } : {}) };
    })
    .filter((p) => p.points > 0 || p.rival)
    .sort((a, b) => Number(a.rival) - Number(b.rival) || b.points - a.points || a.kind.localeCompare(b.kind));
}
