// Bosses you learn (DEPTH-BUILD, docs/notes/depth-design.md section 7): every boss with signature attacks has one weakness, a rule of the
// fight that is always there whether the player knows it or not (the owner's call, Q7.1), used through what the player controls: who is
// placed, where, and when the king's spells fall. The weaknesses are made of four rule shapes:
//   - breakWindup: a stun or freeze landed while a great attack is marked breaks it: the attack is lost and the boss is dazed;
//   - cracks:      blows from heroes of one calling crack its guard: after so many it takes more harm for the rest of the fight;
//   - shelter:     heroes standing in one kind of place (behind it, in water, high above it, in tall grass) are untouched by its great attacks;
//   - sapped:      while it suffers one ailment its great attacks land at half strength.
// A use is noted in `Battle.exploited` (the boss's fighter id, the page's "Weakness!" and the Hunter's marks read it). The weakness is
// learnt by losing to the boss and by the codex (`noteWeakness`), and a win with it used earns a mark per tier. Deterministic: no stream is
// drawn from. Pure rules: no Pixi, no DOM.

import type { Battle, BattleEvent, Unit } from './battle';
import type { BossWarning } from './bossAttacks';
import { readsKind } from './bookData';
import { hasAil } from './ailments';
import { FOES } from './foes';
import { CAL_BOSS_FOES } from './calamityBosses';

/** The switch (tools and tests turn it off to measure the fights without the weaknesses). */
export const WEAK = { on: true };

export type Calling = 'martial' | 'arcane' | 'devout' | 'wild';
/** The four callings, from the kinds of book a hero reads (`READS`). */
export const CALLING_OF_BOOK = { manual: 'martial', grimoire: 'arcane', hymnal: 'devout', bestiary: 'wild' } as const;
export const callingOf = (kind: string): Calling | undefined => {
  const k = readsKind(kind);
  return k ? CALLING_OF_BOOK[k] : undefined;
};

export type WeakRule =
  | { kind: 'breakWindup'; dazeMs: number }
  | { kind: 'cracks'; calling: Calling; blows: number; cut: number }
  | { kind: 'shelter'; where: 'behind' | 'water' | 'high' | 'grass' }
  | { kind: 'sapped'; ailment: 'burn' | 'chill' | 'poison' | 'bleed' };

const daze = (dazeMs = 2000): WeakRule => ({ kind: 'breakWindup', dazeMs });
const cracks = (calling: Calling, blows: number, cut: number): WeakRule => ({ kind: 'cracks', calling, blows, cut });
const shelter = (where: 'behind' | 'water' | 'high' | 'grass'): WeakRule => ({ kind: 'shelter', where });
const sapped = (ailment: 'burn' | 'chill' | 'poison' | 'bleed'): WeakRule => ({ kind: 'sapped', ailment });

/** Each boss's one weakness (Q7.3: one per boss), by fighter id: the 25 bosses with signature attacks. */
export const WEAKNESS: Readonly<Record<string, WeakRule>> = {
  orcChieftain: daze(),
  orcWarlord: daze(),
  boneCaptain: cracks('devout', 3, 0.2),
  lichKing: cracks('devout', 3, 0.25),
  alphaWolf: shelter('high'),
  boarKing: shelter('behind'),
  forestBoss1: sapped('burn'),
  forestBoss2: shelter('grass'),
  forestBoss3: cracks('arcane', 4, 0.2),
  gorgonQueen: shelter('behind'),
  minotaurChampion: daze(),
  shamanKing: cracks('devout', 3, 0.2),
  hornedOgre: sapped('chill'),
  devilLeader: shelter('water'),
  demonLord: shelter('water'),
  nineTails: cracks('wild', 4, 0.2),
  oniKing: daze(),
  sapphireColossus: sapped('burn'),
  forgeTitan: sapped('chill'),
  calBoss1: shelter('water'),
  calBoss2: sapped('burn'),
  calBoss3: cracks('devout', 3, 0.2),
  calBoss4: daze(),
  calBoss5: sapped('chill'),
  calBoss6: cracks('martial', 8, 0.15),
};

export const weaknessOf = (id: string): WeakRule | undefined => (WEAK.on ? WEAKNESS[id] : undefined);
export const bossName = (id: string): string => FOES[id]?.name ?? CAL_BOSS_FOES[id]?.name ?? id;

const CALLING_WORDS: Record<Calling, { a: string; heroes: string }> = {
  martial: { a: 'steel', heroes: 'martial heroes (those who read manuals)' },
  arcane: { a: 'the arcane', heroes: 'arcane heroes (those who read grimoires)' },
  devout: { a: 'the light', heroes: 'devout heroes (those who read hymnals)' },
  wild: { a: 'the wild', heroes: 'wild heroes (those who read bestiaries)' },
};
const AIL_WORDS: Record<'burn' | 'chill' | 'poison' | 'bleed', { hint: string; on: string }> = {
  burn: { hint: 'fears the flame', on: 'burns' },
  chill: { hint: 'slows in the cold', on: 'is chilled' },
  poison: { hint: 'sickens easily', on: 'is poisoned' },
  bleed: { hint: 'cannot bear an open wound', on: 'bleeds' },
};
const PLACE_WORDS: Record<'behind' | 'water' | 'high' | 'grass', [string, string, string]> = {
  behind: ['never looks over its shoulder', 'Its great attacks reach only what is before it.', 'stand behind it (on the side it faces away from)'],
  water: ['hates to get its feet wet', 'Water dulls its great attacks.', 'stand in shallow or deep water'],
  high: ['cannot reach what stands above it', 'Height is safety from its great attacks.', 'stand two or more steps higher than it'],
  grass: ['hunts by sight', 'Tall grass hides you from its great attacks.', 'stand in tall grass'],
};

/** The three clues of a boss's weakness, each clearer; the third is the full rule. */
export function cluesOf(id: string): [string, string, string] {
  const r = WEAKNESS[id];
  const n = bossName(id);
  if (!r) return ['', '', ''];
  switch (r.kind) {
    case 'breakWindup':
      return [`The ${n} leaves itself open when it gathers.`, 'A blow that stops it mid-swing would cost it dear.', `Stun or freeze the ${n} while its great attack is marked: the attack is lost, and it is dazed ${r.dazeMs / 1000} s.`];
    case 'cracks':
      return [`Something about the ${n} fears ${CALLING_WORDS[r.calling].a}.`, `Blows from ${CALLING_WORDS[r.calling].heroes} chip at its guard.`, `After ${r.blows} blows from ${CALLING_WORDS[r.calling].heroes} its guard cracks: it takes ${Math.round(r.cut * 100)}% more harm for the rest of the fight.`];
    case 'shelter': {
      const [a, b, c] = PLACE_WORDS[r.where];
      return [`The ${n} ${a}.`, b, `Heroes who ${c} are untouched by the ${n}'s great attacks.`];
    }
    case 'sapped':
      return [`The ${n} ${AIL_WORDS[r.ailment].hint}.`, `A ${n} that ${AIL_WORDS[r.ailment].on} is a weaker one.`, `While the ${n} ${AIL_WORDS[r.ailment].on}, its great attacks land at half strength.`];
  }
}

/** A use of a weakness: noted once per boss in the fight's record, with an event for the page's "Weakness!" each time. */
export function exploit(b: Battle, boss: Unit, out: BattleEvent[]): void {
  (b.exploited ??= {})[boss.def] = ((b.exploited[boss.def] ?? 0) + 1);
  out.push({ kind: 'weakness', by: boss.id, def: boss.def });
}

/* ------------------------------------------------------------------ the hooks (called from battle.ts and bossAttacks.ts) */

/** Each tick, before the signatures land: a windup broken by a stun or freeze laid since it began is lost, and its boss dazed. */
export function tickWeakness(b: Battle, out: BattleEvent[]): void {
  const list = b.warnings;
  if (!list?.length) return;
  for (const w of [...list]) {
    const me = b.units.find((x) => x.id === w.by);
    if (!me || !me.alive) continue;
    const r = weaknessOf(me.def);
    if (r?.kind !== 'breakWindup') continue;
    const stun = me.stunUntil ?? 0;
    if (!(stun > b.t && stun > (w.stun0 ?? 0))) continue;
    list.splice(list.indexOf(w), 1);
    out.push({ kind: 'bossSig', phase: 'fizzle', by: me.id, n: w.n, key: w.key, name: '', el: 'earth', tiles: w.tiles, ms: 0, rage: w.rage });
    me.stunUntil = Math.max(stun, b.t + r.dazeMs);
    me.busyUntil = Math.max(me.busyUntil, me.stunUntil);
    exploit(b, me, out);
  }
  if (!list.length) delete b.warnings;
}

/** Noted as a windup begins: the boss's stun so far, so a later one is known to have broken it. */
export const markWindup = (w: BossWarning, me: Unit): void => {
  if (weaknessOf(me.def)?.kind === 'breakWindup') w.stun0 = me.stunUntil ?? 0;
};

/** A blow on a boss with a `cracks` weakness: counted when it comes from a hero of the calling; once cracked, every blow lands harder. */
export function weakHurt(b: Battle, by: Unit, to: Unit, dmg: number, dot: boolean, out: BattleEvent[]): number {
  if (to.side !== 'foe') return dmg;
  const r = weaknessOf(to.def);
  if (r?.kind !== 'cracks') return dmg;
  const st = ((b.weakState ??= {})[to.id] ??= { blows: 0 });
  if (!dot && st.blows < r.blows) {
    const hero = by.owner !== undefined ? b.units.find((x) => x.id === by.owner) ?? by : by;
    if (hero.side === 'hero' && callingOf(hero.def) === r.calling && ++st.blows >= r.blows) exploit(b, to, out);
  }
  return st.blows >= r.blows ? Math.max(1, Math.round(dmg * (1 + r.cut))) : dmg;
}

/** The ground a hero stands on, for a shelter. */
function sheltered(b: Battle, me: Unit, x: Unit, where: 'behind' | 'water' | 'high' | 'grass'): boolean {
  const t = b.board.tiles[x.v * b.board.w + x.u];
  const mine = b.board.tiles[me.v * b.board.w + me.u];
  if (!t) return false;
  if (where === 'water') return t.ground === 'water' || t.ground === 'deep';
  if (where === 'grass') return t.ground === 'tall';
  if (where === 'high') return !!mine && t.h >= mine.h + 2;
  // (behind: on the far side of the line through the boss, across the way it faces)
  const du = x.u - me.u;
  const dv = x.v - me.v;
  const ahead = [du, dv, -du, -dv][me.facing];
  return ahead < 0;
}

/** A boss's great attack about to strike a hero: whether the hero is spared by its shelter (noted as a use). */
export function spared(b: Battle, me: Unit, x: Unit, out: BattleEvent[]): boolean {
  const r = weaknessOf(me.def);
  if (r?.kind !== 'shelter' || !sheltered(b, me, x, r.where)) return false;
  exploit(b, me, out);
  return true;
}

/** What a boss's great attack is multiplied by for its weakness: half while it suffers its ailment (noted as a use). */
export function sapShare(b: Battle, me: Unit, out: BattleEvent[]): number {
  const r = weaknessOf(me.def);
  if (r?.kind !== 'sapped' || !hasAil(me, r.ailment, b.t)) return 1;
  exploit(b, me, out);
  return 0.5;
}

/* ------------------------------------------------------------------ learning it, and the Hunter's marks (kept in the save) */

/** What the player knows of one boss's weakness, and the marks won (`Meta.weak`; missing is unknown). */
export interface WeakRecord {
  /** Clues found, 0 to 3 (the third is the full rule). */
  clues: number;
  /** The tiers (0 Normal to 4 Mythic) a Hunter's mark was won on. */
  marks: number[];
  /** The boss's escorts felled on boards where it stood (one clue at `ESCORT_CLUE`). */
  escorts?: number;
}

/** Escorts felled for the codex's second clue. */
export const ESCORT_CLUE = 50;
/** The crowns a first Hunter's mark pays, by tier (the trophy drop; the economy design's table takes this over when it lands). */
export const MARK_CROWNS: readonly number[] = [40, 60, 90, 130, 180];
export const MARK_TIERS = 5;

/** A record read from a save: missing or odd values become none. */
export function readWeak(raw: unknown): Record<string, WeakRecord> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, WeakRecord> = {};
  for (const [id, r] of Object.entries(raw as Record<string, Partial<WeakRecord>>)) {
    if (!WEAKNESS[id] || !r || typeof r !== 'object') continue;
    const clues = Math.max(0, Math.min(3, Math.floor(Number(r.clues)) || 0));
    const marks = Array.isArray(r.marks) ? [...new Set(r.marks.map((t) => Math.floor(Number(t))).filter((t) => t >= 0 && t < MARK_TIERS))].sort() : [];
    const escorts = Math.max(0, Math.floor(Number(r.escorts)) || 0);
    out[id] = { clues, marks, ...(escorts ? { escorts } : {}) };
  }
  return Object.keys(out).length ? out : undefined;
}

/** What a settled fight taught: the clues found and the marks won, for the page's recap. */
export interface WeakNote {
  clues: { boss: string; clues: number }[];
  marks: { boss: string; tier: number; crowns: number; trophy: boolean }[];
}

/**
 * Note a settled fight (beside `noteFoes`): each boss with a weakness that stood on the board is met (one clue), its fallen escorts count
 * towards the second, and a loss to it (the fight lost with it still standing) writes one more clue, up to three. A win with its weakness
 * used earns its Hunter's mark for the tier, once, and the first mark of a tier pays the trophy drop's crowns. Reads only the battle and
 * the save: the same fight always notes the same.
 */
export function noteWeakness(m: { crowns: number; weak?: Record<string, WeakRecord> }, b: Pick<Battle, 'units' | 'exploited'>, won: boolean, tier: number): WeakNote {
  const note: WeakNote = { clues: [], marks: [] };
  if (!WEAK.on) return note;
  const bosses = b.units.filter((u) => u.side === 'foe' && WEAKNESS[u.def] && !u.owner);
  if (!bosses.length) return note;
  const fallen = b.units.filter((u) => u.side === 'foe' && !u.alive && !WEAKNESS[u.def]).length;
  for (const id of new Set(bosses.map((u) => u.def))) {
    const rec = ((m.weak ??= {})[id] ??= { clues: 0, marks: [] });
    const before = rec.clues;
    rec.escorts = (rec.escorts ?? 0) + fallen;
    let clues = Math.max(rec.clues, 1);
    if (rec.escorts >= ESCORT_CLUE) clues = Math.max(clues, 2);
    if (!won && bosses.some((u) => u.def === id && u.alive)) clues = Math.max(clues, before + 1);
    rec.clues = Math.min(3, clues);
    if (rec.clues > before) note.clues.push({ boss: id, clues: rec.clues });
    const t = Math.max(0, Math.min(MARK_TIERS - 1, tier));
    if (won && (b.exploited?.[id] ?? 0) > 0 && !rec.marks.includes(t)) {
      rec.marks = [...rec.marks, t].sort();
      const crowns = MARK_CROWNS[t];
      m.crowns += crowns;
      note.marks.push({ boss: id, tier: t, crowns, trophy: rec.marks.length === MARK_TIERS });
    }
  }
  return note;
}

/** The lines the codex shows for a boss: each clue written or still dark (null), and whether the full rule is known. With the Library's
 *  Archive (`archive`) any clue found is written in full at once. */
export function knownClues(id: string, rec: WeakRecord | undefined, archive = false): { lines: (string | null)[]; full: boolean } {
  const all = cluesOf(id);
  const n = rec?.clues ?? 0;
  if (archive && n > 0) return { lines: [all[0], all[1], all[2]], full: true };
  return { lines: all.map((c, i) => (i < n ? c : null)), full: n >= 3 };
}

/** The share of all Hunter's marks won (for the codex's milestone: 25 / 50 / 75 / 100%). */
export function marksShare(weak: Record<string, WeakRecord> | undefined): { got: number; of: number } {
  const of = Object.keys(WEAKNESS).length * MARK_TIERS;
  const got = Object.values(weak ?? {}).reduce((n, r) => n + r.marks.length, 0);
  return { got, of };
}

const TIER_NAMES = ['Normal', 'Hard', 'Elite', 'Legendary', 'Mythic'];
/** The page's lines for what a fight taught: "New clue · Lich King's weakness (2 of 3)", "Hunter's mark · Lich King · Hard · +60 crowns". */
export function weakLines(n: WeakNote | undefined): string[] {
  if (!n) return [];
  return [
    ...n.clues.map((c) => `New clue · the ${bossName(c.boss)}'s weakness (${c.clues} of 3): read it in the Codex`),
    ...n.marks.map((k) => `Hunter's mark · ${bossName(k.boss)} · ${TIER_NAMES[k.tier]} · +${k.crowns} crowns${k.trophy ? ' · all five: its trophy is on the wall' : ''}`),
  ];
}
