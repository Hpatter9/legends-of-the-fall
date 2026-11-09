// The garrison (phase 1, `docs/notes/assault-1.md`; the design's section 4): 200 defenders as posts, not waves. 180 stand at their posts
// as the assault opens and 20 come as reinforcements while a war drum beats. Every post's leader's place is filled from the army's members of
// the Dark Council by rank, mightiest first (lieutenants the outer posts, captains the gates and the throne); a place the Council cannot fill
// takes a nameless officer (an Orc Chieftain, a Bone Captain) at the officer's strength. The warchief, if one sits, holds the throne himself (Q1); if not, the hold's own
// lord, the army's last boss.
//
// Strength: every defender takes the army's Legendary tier (`TIERS[3]`, its `tierStart`) at the wave-8 multiplier, then `ASSAULT.foeShare`
// of it, the main dial of the mode. The officers and the lord take the boss walls (`mid`, `last`) and their nemesis multipliers, as in a
// run. Pure rules: no Pixi, no DOM.

import { addUnit, makeNemesis, type Battle, type Boost, type Unit } from '../battle';
import { canStep, DIRS, standable, type At } from '../board';
import { armyById, bossOf, waveBoost } from '../armies';
import { nemesisBand, type NemSnap } from '../nemesis';
import { PHASE_AT } from '../bossPhases';
import { mixSeed, Rng } from '../rng';
import { TIER_PROFICIENCY } from '../stats';
import { UNITS } from '../units';
import type { FieldGroup, FieldState } from './field';
import { occPut } from './field';
import type { PostDef } from './blueprint';
import type { AssaultInput, HoldState, PostState } from './holdTypes';
import { GRAVE_WRAITH, WAR_WOLF } from './troops';

/** The mode's dials (the balance tool tunes them, `npm run balance -- --assault orcs`). */
export const ASSAULT = {
  /** The garrison's rank and file: this share of a wave foe's hp and attack (the design's first guess was 0.55; the balance tool set 0.155,
   *  docs/notes/assault-1.md: Auto wins about half at the Orcs' Legendary level, Tactical about nine in ten). */
  foeShare: 0.155,
  /** The officers and the lord: their wall times the garrison's share times this (an officer stands out from its band by its wall). */
  officerShare: 1,
  /** The tier and the wave the garrison stands at (Legendary, wave 8). */
  tier: 3,
  wave: 8,
} as const;

/** Each hold's mark: the hero level a player has when they win that army's tenth star (the Legendary star), when its hold opens, and so
 *  the level its share is measured at (the director's ask, docs/notes/assault-4.md "The holds' marks"). The Legendary Orcs are tuned at level
 *  55 (`armies.ts`, the joint rebalance: 86% of single tries there), and every army's tiers are the same multipliers on its own curve, set so
 *  its Normal takes two to four tries at its own level (`Army.level`, docs/notes/difficulty.md); so the level each army's Legendary star
 *  needs moves with that army's level: 55 + (`Army.level` - 1), capped at the level cap, 100. */
export const HOLD_MARK: Readonly<Record<string, number>> = { orcs: 55, undead: 62, beasts: 69, wildwood: 76, labyrinth: 89, ogres: 99, infernal: 100, yokai: 100, golems: 100 };

/** Each hold's own share (`ASSAULT.foeShare`'s part, by army): set so the bot does about as well at each hold's mark (`HOLD_MARK`) as at the
 *  others, by the balance tool (docs/notes/assault-4.md). */
export const HOLD_SHARE: Readonly<Record<string, number>> = { orcs: ASSAULT.foeShare, undead: 0.1175, beasts: 0.14, wildwood: 0.095, labyrinth: 0.125, ogres: 0.095, infernal: 0.075, yokai: 0.07, golems: 0.0775 };
/** The share a hold's garrison stands at: a tool's own, else the hold's. */
/** Phase 5: the Last Hold's garrison stands at this share of its hold's own, by army, against the whole Council's weight on its walls
 *  (`lastHold.ts`; tuned by `npm run balance -- --assault <army> --last`). The Council's members are elites and escorts with plainer kits
 *  than a hold's own nameless officers (an Ogre Shaman King, a Devil Leader), so at some holds they weaken it and at others strengthen it. */
export const LAST_SHARE: Readonly<Record<string, number>> = { orcs: 0.95, undead: 1.12, beasts: 0.8, wildwood: 0.97, labyrinth: 0.88, ogres: 1.45, infernal: 1.25, yokai: 0.91, golems: 0.9 };
export const shareOf = (input: Pick<AssaultInput, 'army' | 'foeShare' | 'last'>): number => input.foeShare ?? (HOLD_SHARE[input.army] ?? ASSAULT.foeShare) * (input.last ? LAST_SHARE[input.army] ?? 1 : 1);

/** The salt of the garrison's own small draws (which grunt stands where), a side stream of the assault's seed. */
export const GARRISON_SALT = 0x6a7715;

/** The roster's letters, by army: its rank and file (G), its archers (A), its heavies (B) and the pens' fast pack (W). */
export const KINDS: Readonly<Record<string, Record<string, string>>> = {
  orcs: { G: 'orcGrunt', A: 'orcArcher', B: 'orcBrute', W: WAR_WOLF.id },
  undead: { G: 'skeleton', A: 'boneVolley', B: 'spearman', W: GRAVE_WRAITH.id },
  // (the Beast Packs draw no bows: the Den's archers' places are held by the Red Werewolves, who hunt the shooters; its pens loose the
  //  war-wolves, as Bloodtusk Hold's do)
  beasts: { G: 'packBlack', A: 'packRed', B: 'packWhite', W: WAR_WOLF.id },
  // (nor do the Wildwood's satyrs: the snare-layers, who hunt the shooters, hold its archers' places; the revellers who heal their friends
  //  are its heavies; its pens loose wolves, as its Wood Raider's band runs with them)
  wildwood: { G: 'groveSatyr1', A: 'groveSatyr3', B: 'groveSatyr2', W: WAR_WOLF.id },
  // (the Labyrinth's gorgons shoot: its archers; the bellowing minotaurs who guard their friends are its heavies; its pens loose hounds)
  labyrinth: { G: 'mazeMino1', A: 'mazeGorgon1', B: 'mazeMino3', W: WAR_WOLF.id },
  // (the Ogre Clans draw no bows: their orc brutes charge from the archers' places as from any post, the ogres are their heavies, and their
  //  pens loose wargs)
  ogres: { G: 'clanBrute', A: 'clanBrute', B: 'clanOgre', W: WAR_WOLF.id },
  // (nor does the Infernal Host: its imps hold the archers' places and charge from them, its flying demons are its heavies, and its pits
  //  loose hellhounds)
  infernal: { G: 'hellImp', A: 'hellImp', B: 'hellDemon', W: WAR_WOLF.id },
  // (the Yokai's fox witches curse from afar: its archers; the tengu monks are its heavies; its pens loose the crow tengu, who fly)
  yokai: { G: 'yokaiFox', A: 'yokaiWitch', B: 'yokaiMonk', W: 'yokaiCrow' },
  // (the Golem Forge draws no bows: its crystal golems hold the archers' places and stride down from them, its iron golems are its heavies,
  //  and its bays loose the magma golems)
  golems: { G: 'stoneGolem', A: 'crystalGolem', B: 'ironGolem', W: 'magmaGolem' },
};
/** The Orcs' roster's letters (the first hold's, kept for the tools). */
export const KIND = KINDS.orcs;
/** An officer's place the Council cannot fill takes this nameless officer, by army. */
export const OFFICER: Readonly<Record<string, string>> = { orcs: 'orcChieftain', undead: 'boneCaptain', beasts: 'alphaWolf', wildwood: 'forestBoss1', labyrinth: 'gorgonQueen', ogres: 'shamanKing', infernal: 'devilLeader', yokai: 'nineTails', golems: 'sapphireColossus' };
/** The order the Council's ranks take the posts' leaders' places (4.2). */
export const LIEUTENANT_POSTS = ['bridge', 'drumW', 'drumE', 'drumS', 'westTower', 'eastTower'] as const;
export const CAPTAIN_POSTS = ['southGate', 'ironGate', 'throne', 'throne'] as const;

/** The garrison's boosts: the rank and file's, and an officer's or lord's for a base kind on a wall. */
export function garrisonBoosts(army: string, share: number = ASSAULT.foeShare, tier: number = ASSAULT.tier): { foes: Boost; wall: (base: string, which: 'mid' | 'last') => Boost } {
  const a = armyById(army)!;
  const st = waveBoost(a, ASSAULT.wave, tier);
  const f = st.foes ?? {};
  const prof = TIER_PROFICIENCY[tier];
  const foes: Boost = { hp: (f.hp ?? 1) * share, atk: (f.atk ?? 1) * share, ...(f.speed ? { speed: f.speed } : {}), prof };
  const wall = (base: string, which: 'mid' | 'last'): Boost => {
    const def = UNITS[base];
    const want = which === 'mid' ? a.mid : a.last;
    const k = ASSAULT.officerShare * share;
    return { hp: (f.hp ?? 1) * (want.hp / def.hp) * k, atk: (f.atk ?? 1) * (want.atk / def.atk) * k, size: which === 'mid' ? 1.25 : 1.5 };
  };
  return { foes, wall };
}

/** Who takes each officer's place: post id (with a second throne place as `throne:1`) -> the member. The mightiest lieutenants take the
 *  outer posts in order, the mightiest captains the gates and the throne; boss-born members by their rank as the rest. The warchief is not
 *  placed here: he holds the throne as its lord. */
export function councilPlaces(council: readonly NemSnap[], chief?: NemSnap): Record<string, NemSnap> {
  const out: Record<string, NemSnap> = {};
  const byMight = (a: NemSnap, b: NemSnap) => b.might - a.might || a.id - b.id;
  const here = council.filter((n) => n.id !== chief?.id);
  const lts = here.filter((n) => n.rank === 'lieutenant').sort(byMight);
  const caps = here.filter((n) => n.rank === 'captain').sort(byMight);
  LIEUTENANT_POSTS.forEach((p, i) => {
    if (lts[i]) out[p] = lts[i];
  });
  CAPTAIN_POSTS.forEach((p, i) => {
    if (caps[i]) out[i === 3 ? 'throne:1' : p] = caps[i];
  });
  return out;
}

/** The lord of the hold: the warchief if one sits; else a member born the army's last boss; else that boss, nameless. */
export function lordOf(army: string, council: readonly NemSnap[], chief?: NemSnap): { base: string; snap?: NemSnap } {
  if (chief) return { base: chief.base, snap: chief };
  const last = bossOf(armyById(army)!);
  const born = council.find((n) => n.boss && n.base === last);
  return born ? { base: born.base, snap: born } : { base: last };
}

/** The nearest standable, free tile to a spot, keeping to its level (within two steps of its height) where it can, by rings of steps in a
 *  fixed order. */
export function freeNear(b: Battle, f: FieldState, at: At, level = true): At {
  const w = b.board.w;
  const home = b.board.tiles[at.v * w + at.u];
  for (const strict of level ? [true, false] : [false]) {
    for (let r = 0; r < 14; r++)
      for (let du = -r; du <= r; du++)
        for (const dv of r - Math.abs(du) === 0 ? [0] : [-(r - Math.abs(du)), r - Math.abs(du)]) {
          const u = at.u + du;
          const v = at.v + dv;
          if (u < 0 || v < 0 || u >= w || v >= b.board.d) continue;
          const t = b.board.tiles[v * w + u];
          if (!standable(t) || t.ground === 'deep' || f.occ[v * w + u] >= 0) continue;
          if (strict && Math.abs(t.h - home.h) > 2) continue;
          // (a tile cut off from its neighbours, a perch's crown with no way down, is not a place to stand a soldier)
          if (!DIRS.some(([a, c]) => {
            const n = b.board.tiles[(v + c) * w + u + a];
            return n && canStep(t, n, 4) !== null;
          })) continue;
          return { u, v };
        }
  }
  return at;
}

/** Add one fighter of the field: a unit of the battle, on the grid, with what the field knows of it. */
export function addFieldUnit(b: Battle, f: FieldState, defId: string, at: At, boost: Boost, group: number, slot: number, sheet?: string): Unit {
  const unit = addUnit(b, defId, at.u, at.v, boost);
  f.byId[unit.id] = unit;
  const def = UNITS[defId];
  f.info[unit.id] = { def, sheet: sheet ?? def.sheet, role: slot === 0 ? 'leader' : 'soldier', group, slot };
  occPut(f, unit);
  return unit;
}

/** Stand the garrison at its posts (asleep, `posted`), the Council's members in their leaders' places and the lord on the throne. */
export function buildGarrison(b: Battle, f: FieldState, h: HoldState, input: AssaultInput): void {
  const bp = h.bp;
  const { foes, wall } = garrisonBoosts(input.army, shareOf(input), input.tier ?? ASSAULT.tier);
  b.foeBoost = foes;
  if (foes.speed && foes.speed !== 1) b.foeSpeed = foes.speed;
  const council = input.council ?? [];
  const places = councilPlaces(council, input.warchief);
  const lord = lordOf(input.army, council, input.warchief);
  // (phase 5: at the Last Hold the members no officer's place takes stand at the throne beside the lord, in the rank and file's places)
  const spares = input.last ? sparesOf(bp.posts, council, places, lord.snap) : [];
  // (the garrison's own stream: nothing here draws from the fight's)
  const rng = new Rng(mixSeed(input.seed, GARRISON_SALT));
  for (const def of bp.posts) {
    const g: FieldGroup = { id: f.groups.length, side: 'foe', name: def.name, leader: 0, members: [], home: { ...def.at }, awake: false, route: [], heading: 1 };
    f.groups.push(g);
    const post: PostState = { def, group: g.id, mood: 'posted', mark: { ...def.at }, muster: 0, loopAt: def.loop ? 1 : undefined };
    const letters = def.roster.replace(/ /g, '').split('');
    // (the officers first, so the leader is the post's first member; the rank and file in an order drawn from the garrison's stream)
    const officers = letters.filter((c) => c === 'L' || c === 'C' || c === 'K');
    const rank = letters.filter((c) => !(c === 'L' || c === 'C' || c === 'K'));
    for (let i = rank.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [rank[i], rank[j]] = [rank[j], rank[i]];
    }
    let captains = 0;
    // (the spares take the throne's first places of the rank and file, after the draw, so the stream is as in any hold)
    const guard = def.id === 'throne' ? spares.slice(0, rank.length) : [];
    for (const [i, c] of [...officers, ...rank].entries()) {
      const spare = guard[i - officers.length];
      const at = freeNear(b, f, g.home);
      const slot = g.members.length;
      let unit: Unit;
      if (c === 'K') {
        unit = addFieldUnit(b, f, lord.base, at, { ...wall(lord.base, 'last'), ...(lord.snap ? {} : { phase: PHASE_AT }) }, g.id, slot);
        if (lord.snap) {
          const place = placeOf(lord.snap, input.tier);
          if (place) makeNemesis(unit, place);
          post.council = lord.snap.id;
        }
        h.lord = unit.id;
      } else if (spare) {
        unit = addFieldUnit(b, f, spare.base, at, wall(spare.base, 'mid'), g.id, slot);
        const place = placeOf(spare, input.tier);
        if (place) makeNemesis(unit, place);
      } else if (c === 'L' || c === 'C') {
        const key = c === 'C' && def.id === 'throne' ? (captains++ === 0 ? 'throne' : 'throne:1') : def.id;
        const snap = places[key];
        const base = snap?.base ?? OFFICER[input.army] ?? 'orcChieftain';
        unit = addFieldUnit(b, f, base, at, wall(base, 'mid'), g.id, slot);
        if (snap) {
          const place = placeOf(snap, input.tier);
          if (place) makeNemesis(unit, place);
          if (slot === 0) post.council = snap.id;
        }
      } else {
        // (an officer's place the roster has none for: the watchtowers take a lieutenant if the Council has one to spare)
        const snap = slot === 0 && !officers.length ? places[def.id] : undefined;
        unit = snap ? addFieldUnit(b, f, snap.base, at, wall(snap.base, 'mid'), g.id, slot) : addFieldUnit(b, f, (KINDS[input.army] ?? KIND)[c], at, foes, g.id, slot);
        if (snap) {
          const place = placeOf(snap, input.tier);
          if (place) makeNemesis(unit, place);
          post.council = snap.id;
        }
      }
      if (slot === 0) g.leader = unit.id;
      g.members.push(unit.id);
      h.garrison.push(unit.id);
    }
    post.muster = g.members.length;
    h.posts.push(post);
  }
}

/** The members no officer's place in the hold takes (phase 5's Last Hold: they stand at the throne), mightiest first: not the lord, not one
 *  `councilPlaces` put at a post the hold has an officer's place for. */
export function sparesOf(posts: readonly PostDef[], council: readonly NemSnap[], places: Readonly<Record<string, NemSnap>>, lord?: NemSnap): NemSnap[] {
  const keys = new Set<string>();
  for (const p of posts) {
    const n = p.roster.replace(/[^LC]/g, '').length;
    if (p.id === 'throne') ['throne', 'throne:1'].slice(0, n).forEach((k) => keys.add(k));
    else keys.add(p.id);
  }
  const placed = new Set(Object.entries(places).filter(([k]) => keys.has(k)).map(([, s]) => s.id));
  if (lord) placed.add(lord.id);
  return council.filter((s) => !placed.has(s.id) && s.rank !== 'warchief').sort((a, b) => b.might - a.might || a.id - b.id);
}

/** A member's nemesis place (its traits, its hp and attack on its wall): `nemesisBand`'s own, for a band of one. */
function placeOf(s: NemSnap, tier: number = ASSAULT.tier): ReturnType<typeof nemesisBand>['place'][number] | undefined {
  return nemesisBand({ members: [s], waves: { '1': [s.id] } }, 1, [s.base], tier).place[0];
}

/** Whether a post is all archers (it keeps to its perch, its wall or its bank and shoots from there). */
/** A post of shooters only: its roster all archers, and the army's archers shoot. They keep to their perch, their wall or their bank. The
 *  Beast Packs draw no bows: the Howling Den's archers' places are held by Red Werewolves, who hunt from them as any post does. */
/** Whether a hold draws no bows: its army's archers do not shoot (the Howling Den, Elder Root). */
export const bowless = (army: string): boolean => (UNITS[(KINDS[army] ?? KIND).A]?.range ?? 1) <= 1;
export const archersOnly = (p: PostDef, army = 'orcs'): boolean => /^[A ]+$/.test(p.roster) && (UNITS[(KINDS[army] ?? KIND).A]?.range ?? 1) > 1;

/** The garrison's boosts for a hold under assault: its army, its share and its tier (Legendary, or Mythic for the Warband regrouped). */
export const holdBoosts = (h: { input: AssaultInput }): ReturnType<typeof garrisonBoosts> => garrisonBoosts(h.input.army, shareOf(h.input), h.input.tier ?? ASSAULT.tier);
