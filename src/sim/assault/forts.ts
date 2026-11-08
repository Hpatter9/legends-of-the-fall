// The hold's structures (phase 1, `docs/notes/assault-1.md`; the design's 5.1): the palisade's segments, the gates and the war drums. A
// structure stands on its tiles (solid until broken), with its hp and its defence. It is struck only by the Assault order, or by a hero with
// nothing else in reach: never picked by a fighter's own mind. A blow on it has every rider off: no lifesteal, no ailment, no XP, no mana,
// no crit. Shieldguard and Gunners strike it a quarter harder, a hero of the Bulwark class or a bullet shot half again. Broken, a gate's tiles
// open to floor and a palisade segment's to a rubble ramp up from the ditch; the sector graph is rebuilt for the tiles it touched, and the
// page is told (a breach). A drum broken is silenced.
//
// Structures are not units of the battle (so no kit can shove a gate or poison a drum); a powder barrel beside one still blasts it.

import { atkOf, defOf, strikeDef, type Battle, type BattleEvent, type Unit } from '../battle';
import { BLOW_SCALE } from '../blow';
import { traitsOf } from '../traits';
import { rebuildSectors } from './sectors';
import { openFort, type FortSpec } from './fieldMap';
import type { FortKind } from './blueprint';
import type { FortState, HoldState } from './holdTypes';
import { kindOfUnit, rankOf, TRICKS, ELITE_TRICK } from './troops';
import { garrisonBoosts, holdBoosts, ASSAULT } from './garrison';

/** Each structure's hp (before the garrison's toughness) and defence (5.1). */
export const FORT_STATS: Readonly<Record<FortKind, { hp: number; def: number; name: string }>> = {
  palisade: { hp: 1600, def: 6, name: 'Palisade segment' },
  sallyPort: { hp: 2400, def: 8, name: 'Sally port' },
  southGate: { hp: 5000, def: 10, name: 'Gate' },
  northGate: { hp: 3000, def: 8, name: 'Gate' },
  ironGate: { hp: 9000, def: 14, name: 'Gate' },
  drum: { hp: 1500, def: 4, name: 'War drum' },
};
/** A barrel's blast on a structure within a tile (5.2), before the garrison's toughness. */
export const BARREL_FORT = 2000;
/** The windup before a blow on a structure lands. */
const FORT_WINDUP = 350;

/** The hold's structures as the assault opens, at the garrison's toughness (its hp multiplier, so a gate stands as long as its keepers). */
export function makeForts(specs: readonly FortSpec[], army: string, share: number = ASSAULT.foeShare, tier: number = ASSAULT.tier): FortState[] {
  const k = garrisonBoosts(army, share, tier).foes.hp ?? 1;
  return specs.map((spec) => {
    const st = FORT_STATS[spec.kind];
    const hp = Math.round(st.hp * k);
    return { spec, hp, maxHp: hp, def: st.def, broken: false };
  });
}

/** Whether a fort is a wall's (the palisade's segments, its gates): striking one sounds the great horn. */
export const isWall = (kind: FortKind): boolean => kind !== 'drum';

/** How hard a fighter's blow on a structure lands: its attack less the structure's defence, with the siege riders (5.1). */
export function fortBlow(b: Battle, me: Unit, f: FortState): number {
  const def = strikeDef(b, me);
  const kind = kindOfUnit(me.def);
  let mult = 1;
  if (kind === 'shieldguard' || kind === 'gunners') {
    const elite = b.field?.hold && rankOf(soldierMarks(b.field.hold, me.id)).rank === 'elite';
    mult *= 1 + (TRICKS.siege - 1) * (elite ? ELITE_TRICK : 1);
  } else if (!kind && me.side === 'hero' && (traitsOf(me.def).includes('bulwark') || def.shot === 'bullet')) mult *= 1.5;
  return Math.max(1, Math.round(Math.max(1, atkOf(me) - f.def) * BLOW_SCALE * mult));
}

const soldierMarks = (h: HoldState, id: number): number => {
  for (const p of h.platoons) for (const s of p.soldiers) if (s.id === id) return s.marks;
  return 0;
};

/** Whether `me` can strike the structure from where it stands: a melee fighter beside one of its tiles and within its jump of it; a
 *  shooter within its reach. */
export function canStrikeFort(b: Battle, me: Unit, f: FortState): boolean {
  if (f.broken || f.open) return false;
  const w = b.board.w;
  const def = strikeDef(b, me);
  const h = b.board.tiles[me.v * w + me.u].h;
  for (const i of f.spec.tiles) {
    const u = i % w;
    const v = Math.floor(i / w);
    const d = Math.abs(u - me.u) + Math.abs(v - me.v);
    if (def.shot ? d <= def.range : d <= Math.max(1, def.range) && Math.abs(b.board.tiles[i].h - h) <= Math.max(def.jump, 2)) return true;
  }
  return false;
}

/** Swing at a structure: the swing is seen now, and the blow lands after its windup (`landFortHits`). */
export function strikeFort(b: Battle, h: HoldState, me: Unit, fort: number, out: BattleEvent[]): void {
  const f = h.forts[fort];
  const def = defOf(me);
  const w = b.board.w;
  const t = f.spec.tiles[0];
  const way = Math.abs((t % w) - me.u) >= Math.abs(Math.floor(t / w) - me.v) ? ((t % w) > me.u ? 0 : 2) : Math.floor(t / w) > me.v ? 1 : 3;
  me.facing = way;
  me.swing = { at: b.t, ms: Math.min(def.atkMs, 600), to: -1 };
  me.busyUntil = b.t + def.atkMs;
  h.hits.push({ at: b.t + FORT_WINDUP, by: me.id, fort, dmg: fortBlow(b, me, f) });
  out.push({ kind: 'swing', by: me.id, to: -1 });
}

/** The blows on the structures that land now. */
export function landFortHits(b: Battle, h: HoldState, out: BattleEvent[]): void {
  if (!h.hits.length) return;
  const keep: typeof h.hits = [];
  for (const x of h.hits) {
    if (x.at > b.t) {
      keep.push(x);
      continue;
    }
    hitFort(b, h, x.fort, x.dmg, x.by, out);
  }
  h.hits = keep;
}

/** A structure takes a blow (or a barrel's blast): it may sound the horn, and at 0 it breaks. */
export function hitFort(b: Battle, h: HoldState, fort: number, dmg: number, by: number, out: BattleEvent[]): void {
  const f = h.forts[fort];
  if (f.broken || f.open) return;
  f.hp = Math.max(0, f.hp - dmg);
  f.struckAt = b.t;
  h.events.push({ kind: 'fortHit', fort: f.spec.id, dmg, by });
  if (isWall(f.spec.kind) && !h.horn) sound(h);
  if (f.hp <= 0) {
    breakFort(b, h, fort, out);
    if (by > 0) h.fortKills[by] = (h.fortKills[by] ?? 0) + 1;
  }
}

/** The great horn (4.5): the palisade's posts sound it when a gate or segment is first struck. The mind empties the barracks, opens the
 *  sally ports and spreads the bank's archers on its next second. */
export function sound(h: HoldState): void {
  h.horn = true;
  h.events.push({ kind: 'horn' });
}

/** Break a structure: its tiles change, the sector graph is rebuilt for them, and the page is told. */
export function breakFort(b: Battle, h: HoldState, fort: number, _out?: BattleEvent[]): void {
  const f = h.forts[fort];
  if (f.broken) return;
  f.broken = true;
  f.hp = 0;
  if (f.spec.kind === 'drum') {
    h.events.push({ kind: 'silenced', fort: f.spec.id });
    return;
  }
  const changed = openFort(b.board, f.spec);
  const fs = b.field!;
  rebuildSectors(fs.sectors, b.board, changed);
  fs.stats.rebuilds++;
  h.events.push({ kind: 'breach', fort: f.spec.id, tiles: changed });
}

/** A sally port opened from inside on the horn: its tiles stand open (the orcs sally out, and ours may rush in while it is). */
export function openPort(b: Battle, h: HoldState, fort: number): void {
  const f = h.forts[fort];
  if (f.broken || f.open) return;
  f.open = true;
  const changed = openFort(b.board, f.spec);
  rebuildSectors(b.field!.sectors, b.board, changed);
  b.field!.stats.rebuilds++;
  h.events.push({ kind: 'open', fort: f.spec.id, tiles: changed });
}

/** A barrel gone off at tile `i`: each structure within a tile takes its blast. */
export function barrelOnForts(b: Battle, h: HoldState, i: number, out: BattleEvent[]): void {
  const w = b.board.w;
  const u = i % w;
  const v = Math.floor(i / w);
  const k = holdBoosts(h).foes.hp ?? 1;
  h.forts.forEach((f, n) => {
    if (f.broken || f.open) return;
    if (f.spec.tiles.some((j) => Math.max(Math.abs((j % w) - u), Math.abs(Math.floor(j / w) - v)) <= 1)) hitFort(b, h, n, Math.round(BARREL_FORT * k), 0, out);
  });
}

/** The structures still standing that a war drum is (the drums beating). */
export const drumsBeating = (h: HoldState): FortState[] => h.forts.filter((f) => f.spec.kind === 'drum' && !f.broken);
