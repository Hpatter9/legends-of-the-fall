// The armies: the stages of a run, King God Castle style. A player picks an army and fights through its 15 waves, each
// tougher than the last, with a mid-boss around halfway (or boss waves at thirds, in the Wildwood) and the army's boss at the end; the army's final boss falling
// unlocks the next. A lost fight ends the run and the army starts again from wave 1 (heroes keep their XP and levels,
// which is what makes the next try stronger). A beaten army can be fought again for a small share of its first-clear
// rewards. Pure rules: no Pixi, no DOM; the meta is changed only through the functions here.

import type { Boost, Stage } from './battle';
import type { Area } from './board';
import { FOES, isBoss } from './foes';
import { PHASE_AT } from './bossPhases';
import type { Meta } from './meta';
import { mixSeed } from './rng';
import { starCrowns } from './stars';
import { ARMY_STARS, MILESTONES, tierOf, TIERS } from './tiers';

export interface Wave {
  /** The foes by their ids in `UNITS`; the first of a boss wave is its boss. */
  foes: readonly string[];
  /** Set on a wave that has a boss: a mid-boss or the army's last. */
  boss?: 'mid' | 'final';
}

export interface BossStats {
  hp: number;
  atk: number;
}

export interface Army {
  id: string;
  name: string;
  /** One line for the army's card. */
  blurb: string;
  /** The hero level Normal is meant for: about 2 to 4 tries with a party at this level, one try about ten levels above, and out of reach of a level-1 party (`docs/notes/difficulty.md`). From the Labyrinth on it is measured with the talents that level opens (ARMY-PACE, `docs/notes/army-pace.md`). */
  level: number;
  /** The land of its first wave (and its card's backdrop); `lands` is every land its waves are fought in. */
  area: Area;
  /** One or two lands that an attempt is fought on (one of them, for all its waves), each fitting its troops; missing is `area` alone (the daily's). */
  lands?: readonly Area[];
  waves: readonly Wave[];
  /** The foes' hp and attack at wave 1, as a share of their stats in `foes.ts`, and the share they gain each wave after. */
  start: number;
  growth: number;
  /** The `start` the harder tiers scale from (they were tuned on it, so Normal's curve of levels can move without moving them). */
  tierStart?: number;
  /** The `growth` the harder tiers use (likewise: Normal's curve is flatter from the second army on, so a level-1 party cannot grind through it on the XP of its lost tries). */
  tierGrowth?: number;
  /**
   * The harder tiers' foes (hp and attack) times this, by tier (index 1 Hard to 4 Mythic; missing is 1). A late army's Normal is now steep
   * (ARMY-PACE, `docs/notes/army-pace.md`), so its Hard, Elite and Legendary are lifted to stay above it, each above the one before; Mythic is left as it was tuned.
   */
  tierLift?: readonly number[];
  /**
   * The Normal `start` a run's XP is paid at (missing is `start` itself). XP follows the damage the heroes deal, so a late army made tougher in
   * ARMY-PACE would pay more XP for the same run and speed up the whole level pace; its runs pay as they did at its old strength (`armyXpShare`).
   */
  xpStart?: number;
  /** The hp and attack a boss has at wave 1's strength (the wave's multiplier then applies, as to every foe): the army's mid-bosses, and its last. These set the walls of the campaign, whatever the boss's own stats in `foes.ts`. */
  mid: BossStats;
  last: BossStats;
  /** Crowns a first win of each wave pays are `(10 + 2 x wave) x pay` (a boss wave a half more). */
  pay: number;
  /** Crowns for the army's first clear (on top of its waves). */
  clear: number;
}

const wave = (...foes: string[]): Wave => ({ foes });

/** An army's waves: the field waves, then bosses where `bosses` names them (wave number -> the boss band), the last one final. */
function waves(field: readonly Wave[], bosses: Record<number, string[]>): Wave[] {
  const n = field.length + Object.keys(bosses).length;
  const out: Wave[] = [];
  let f = 0;
  for (let i = 1; i <= n; i++) out.push(bosses[i] ? { foes: bosses[i], boss: i === n ? 'final' : 'mid' } : field[f++]);
  return out;
}

/** Every army fights this many waves (the run's length, so merges and evolutions have room). */
export const ARMY_WAVES = 15;

/**
 * `count` field waves that ramp up from three foes to six: wave j takes its foes in turn from the army's troop `pattern`, starting two
 * places further along each wave, so the mix shifts from wave to wave while every wave is made of the army's own troops.
 */
function ramp(pattern: readonly string[], count: number): Wave[] {
  return Array.from({ length: count }, (_, j) => {
    const size = Math.min(6, 3 + Math.floor((j * 4) / count));
    return wave(...Array.from({ length: size }, (_, k) => pattern[(2 * j + k) % pattern.length]));
  });
}

export const ARMIES: readonly Army[] = [
  {
    id: 'orcs',
    level: 1,
    name: 'Orc Warband',
    blurb: 'Grunts, archers and brutes behind a warlord.',
    area: 'warcamp',
    lands: ['warcamp', 'highlands'],
    waves: waves(ramp(['orcGrunt', 'orcGrunt', 'orcArcher', 'orcBrute', 'orcGrunt', 'orcArcher', 'orcBrute', 'orcGrunt'], 13), { 8: ['orcChieftain', 'orcGrunt', 'orcGrunt', 'orcArcher'], 15: ['orcWarlord', 'orcGrunt', 'orcArcher', 'orcGrunt', 'orcBrute', 'orcBrute'] }),
    start: 0.58, // (SPELLS-RETUNE: 0.39 measured by a bot that never cast the king's spells, raised so a player whose Auto casts them takes as many tries, `docs/notes/spells-retune.md`; was 0.5 until WORLD-ROAD retuned it on the army road)
    xpStart: 0.39,
    tierStart: 0.5,
    growth: 0.176,
    mid: { hp: 1500, atk: 50 },
    last: { hp: 2630, atk: 74 },
    pay: 0.52,
    clear: 120,
  },
  {
    id: 'undead',
    level: 8,
    name: 'Undead Legion',
    blurb: 'Skeleton warriors, spearmen and archers, led by a lich.',
    area: 'graveyard',
    lands: ['graveyard', 'dungeon'],
    waves: waves(ramp(['skeleton', 'skeleton', 'boneVolley', 'spearman', 'skeleton', 'spearman', 'boneVolley', 'spearman'], 13), { 8: ['boneCaptain', 'skeleton', 'spearman', 'boneVolley'], 15: ['lichKing', 'skeleton', 'spearman', 'spearman', 'boneVolley', 'boneVolley'] }),
    start: 1.7, // (SPELLS-RETUNE: 1.48 measured by a bot that never cast the king's spells; raised so a level-1 party whose Auto casts them still cannot grind through it, `docs/notes/spells-retune.md`; was 1.52 until WORLD-ROAD retuned it on the army road)
    xpStart: 1.48,
    tierStart: 0.7,
    growth: 0.05,
    tierGrowth: 0.17,
    mid: { hp: 1800, atk: 56 },
    last: { hp: 2080, atk: 63 },
    pay: 0.78,
    clear: 200,
  },
  {
    id: 'beasts',
    level: 15,
    name: 'Beast Packs',
    blurb: 'Black, red and white werewolves, fast and hungry.',
    area: 'plains',
    lands: ['plains', 'autumn'],
    waves: waves(ramp(['packBlack', 'packRed', 'packWhite', 'packBlack', 'packRed', 'packWhite', 'packBlack'], 13), { 8: ['alphaWolf', 'packBlack', 'packRed', 'packWhite'], 15: ['boarKing', 'packBlack', 'packRed', 'packWhite', 'packBlack', 'packWhite'] }),
    start: 2.17, // (SPELLS-RETUNE: 1.66 measured by a bot that never cast the king's spells, `docs/notes/spells-retune.md`)
    xpStart: 1.66,
    tierStart: 0.85,
    growth: 0.05,
    tierGrowth: 0.15,
    mid: { hp: 2000, atk: 60 },
    last: { hp: 2750, atk: 72 },
    pay: 1.1,
    clear: 300,
  },
  {
    id: 'wildwood',
    level: 22,
    name: 'The Wildwood',
    blurb: 'Satyrs pipe the grove into a frenzy; three forest lords guard it.',
    area: 'forest',
    lands: ['forest', 'swamp'],
    waves: waves(ramp(['groveSatyr1', 'groveSatyr2', 'groveSatyr3', 'groveSatyr1', 'groveSatyr2'], 12), {
        5: ['forestBoss1', 'groveSatyr1', 'groveSatyr2', 'groveSatyr3'],
        10: ['forestBoss2', 'groveSatyr3', 'groveSatyr1', 'groveSatyr2', 'groveSatyr3'],
        15: ['forestBoss3', 'groveSatyr1', 'groveSatyr2', 'groveSatyr3', 'groveSatyr1', 'groveSatyr2'],
      }),
    start: 2.52, // (SPELLS-RETUNE: 2.01 measured by a bot that never cast the king's spells, `docs/notes/spells-retune.md`; was 1.86 until WORLD-ROAD retuned it on the army road)
    xpStart: 2.01,
    tierStart: 1.15,
    growth: 0.05,
    tierGrowth: 0.136,
    mid: { hp: 2400, atk: 60 },
    last: { hp: 2330, atk: 64 },
    pay: 1.72,
    clear: 430,
  },
  {
    id: 'labyrinth',
    level: 35,
    name: 'The Labyrinth',
    blurb: 'Minotaurs charge and gorgons turn heroes to stone.',
    area: 'temple',
    lands: ['temple', 'ruins'],
    waves: waves(ramp(['mazeMino1', 'mazeMino2', 'mazeGorgon1', 'mazeMino3', 'mazeGorgon2', 'mazeMino1', 'mazeGorgon3', 'mazeMino2'], 13), { 8: ['gorgonQueen', 'mazeMino1', 'mazeMino2', 'mazeGorgon3'], 15: ['minotaurChampion', 'mazeMino1', 'mazeGorgon1', 'mazeMino2', 'mazeGorgon2', 'mazeMino3'] }),
    start: 7, // (SPELLS-RETUNE: 4.85 measured by a bot that never cast the king's spells, `docs/notes/spells-retune.md`, its `xpStart` 2.25 raised with it so a run pays what it did; was 2.25: ARMY-PACE, the late armies steeper, `docs/notes/army-pace.md`; 3.05 until ULT-CHARGE answered the ultimates' full strength, `docs/notes/ult-charge.md`)
    xpStart: 3.25,
    tierStart: 1.38,
    growth: 0.05,
    tierGrowth: 0.128,
    tierLift: [1, 1.86, 2.34, 0.83, 0.98], // (SPELLS-RETUNE: Hard 1.6 to 1.86, so it stays over the tougher Normal, `docs/notes/spells-retune.md`; ULT-CHARGE: Hard and Elite lifted, Legendary and Mythic eased under the tiers' own rise, for the full-strength ultimates; `docs/notes/ult-charge.md`)
    mid: { hp: 1700, atk: 46 },
    last: { hp: 2420, atk: 61 },
    pay: 2.21,
    clear: 600,
  },
  {
    id: 'ogres',
    level: 45,
    name: 'Ogre Clans',
    blurb: 'Ogres and orc brutes, a shaman king and a horned giant.',
    area: 'highlands',
    lands: ['highlands', 'snow'],
    waves: waves(ramp(['clanOgre', 'clanBrute', 'clanBrute', 'clanOgre', 'clanOgre', 'clanBrute', 'clanOgre'], 13), { 8: ['shamanKing', 'clanBrute', 'clanOgre', 'clanBrute'], 15: ['hornedOgre', 'clanOgre', 'clanBrute', 'clanOgre', 'clanBrute', 'clanOgre'] }),
    // (11.4 since the skills overhaul's batch 3, docs/notes/skills-1.md: with the tier skills gone a merged party took 4.5 tries at SPELLS-RETUNE's
    // 12.2 (`node tools/spells-retune/run.mjs cell ogres:45:0:tp`); 2.3 at 11.4, SPELLS-RETUNE's figure)
    start: 11.4, // (SPELLS-RETUNE: 12.2; 9.3 measured by a bot that never cast the king's spells, `docs/notes/spells-retune.md`, its `xpStart` 2.8 raised with it so a run pays what it did; was 2.8: ARMY-PACE, the late armies steeper, `docs/notes/army-pace.md`; 4.1 until ULT-CHARGE answered the ultimates' full strength, `docs/notes/ult-charge.md`)
    xpStart: 3.67,
    tierStart: 1.55,
    growth: 0.05,
    tierGrowth: 0.124,
    tierLift: [1, 3.18, 2.57, 0.83, 0.92], // (ULT-CHARGE: Hard and Elite lifted, Legendary and Mythic eased under the tiers' own rise, for the full-strength ultimates; `docs/notes/ult-charge.md`)
    mid: { hp: 1800, atk: 48 },
    last: { hp: 2200, atk: 48 },
    pay: 3.23,
    clear: 820,
  },
  {
    id: 'infernal',
    level: 58,
    name: 'Infernal Host',
    blurb: 'Imps and demons of the pit, a devil and a demon lord.',
    area: 'volcano',
    lands: ['volcano', 'desert'],
    waves: waves(ramp(['hellImp', 'hellImp', 'hellDemon', 'hellImp', 'hellDemon', 'hellImp', 'hellDemon'], 13), { 8: ['devilLeader', 'hellImp', 'hellDemon', 'hellImp'], 15: ['demonLord', 'hellImp', 'hellDemon', 'hellImp', 'hellDemon', 'hellImp'] }),
    // (15.4 since the skills overhaul's batch 3, docs/notes/skills-1.md: with the tier skills gone a merged party took 11.7 tries at SPELLS-RETUNE's
    // 16.2 (`node tools/spells-retune/run.mjs cell infernal:55:0:tph`); 4.4 at 15.4, SPELLS-RETUNE's figure)
    start: 15.4, // (SPELLS-RETUNE: 16.2; 14.9 put it back where main's spell-less bot had it; the owner then asked for LATE-RETUNE's figure again, about 5 tries at level 55 with hearts, measured casting; 12.5 measured by a bot that never cast the king's spells, `docs/notes/spells-retune.md`, its `xpStart` 3.01 raised with it so a run pays what it did; LATE-RETUNE, hearts: 10.2 measured for a player whose run ends at the first lost wave, raised so the order holds for a player who burns hearts, `docs/notes/late-retune.md`; 9.4 until two of a kind merged, MERGE-TWO, and made the late game easy, `docs/notes/late-retune.md`; was 3.01: ARMY-PACE, the late armies steeper, `docs/notes/army-pace.md`; 5.67 until ULT-CHARGE answered the ultimates' full strength, `docs/notes/ult-charge.md`; 10 until STATUS-FX's ailments, whose boss rules and fire-proof imps made it harder)
    xpStart: 3.9,
    tierStart: 1.64,
    growth: 0.05,
    tierGrowth: 0.13,
    tierLift: [1, 3.59, 2.75, 0.8, 0.95], // (SPELLS-RETUNE: 3.27, 2.51, 0.76, raised just enough that each tier stays 3% over the one below the tougher Normal, `docs/notes/spells-retune.md`; ONE-OF-EACH: Mythic 0.87 to 0.95, so a level-100 squad of one of each takes about four tries again, `docs/notes/one-of-each.md`; LATE-RETUNE, hearts: Hard 2.97 and Elite 2.38, raised so each tier stays over the tougher Normal; before that, ULT-CHARGE: Hard and Elite lifted, Legendary and Mythic eased under the tiers' own rise, for the full-strength ultimates; `docs/notes/ult-charge.md`)
    mid: { hp: 2000, atk: 50 },
    last: { hp: 1840, atk: 41 },
    pay: 4.1,
    clear: 1100,
  },
  {
    id: 'yokai',
    level: 65,
    name: 'Yokai Night Parade',
    blurb: 'Fox spirits, crows and tengu monks of the night parade, led by a nine-tailed fox and the Oni King.',
    area: 'shrine',
    lands: ['shrine', 'forest'],
    waves: waves(ramp(['yokaiFox', 'yokaiCrow', 'yokaiMonk', 'yokaiWitch', 'yokaiSeer', 'yokaiFox', 'yokaiMonk', 'yokaiCrow', 'yokaiWitch'], 13), { 8: ['nineTails', 'yokaiFox', 'yokaiWitch', 'yokaiCrow'], 15: ['oniKing', 'yokaiMonk', 'yokaiWitch', 'yokaiSeer', 'yokaiFox', 'yokaiCrow'] }),
    // (15.4 since the skills overhaul's batch 3, docs/notes/skills-1.md: with the tier skills gone a merged party took 14.4 tries at SPELLS-RETUNE's
    // 18.3 (`node tools/spells-retune/run.mjs cell yokai:65:0:tph`); 3.0 at 15.45 (just over the Infernal Host's 15.4, so each army starts tougher than the one before), SPELLS-RETUNE's figure)
    start: 15.45, // (SPELLS-RETUNE: 18.3; 15 put it back where main's spell-less bot had it; the owner then asked for LATE-RETUNE's figure again, about 10 tries at level 65 with hearts, measured casting; 14.2 measured by a bot that never cast the king's spells, `docs/notes/spells-retune.md`, its `xpStart` 3.38 raised with it so a run pays what it did; LATE-RETUNE, hearts: 12.8 measured for a player whose run ends at the first lost wave, raised so the order holds for a player who burns hearts; 12.5 until two of a kind merged, MERGE-TWO, and its bosses stronger, `docs/notes/late-retune.md`; it stays under the Golem Forge's; was 3.38: ARMY-PACE, the late armies steeper, `docs/notes/army-pace.md`; 7 until ULT-CHARGE answered the ultimates' full strength, `docs/notes/ult-charge.md`)
    xpStart: 4.36,
    tierStart: 1.55,
    growth: 0.05,
    tierGrowth: 0.127,
    tierLift: [1, 4.35, 3.34, 0.96, 0.79], // (SPELLS-RETUNE: 3.99, 3.06, 0.88, raised just enough that each tier stays 3% over the one below the tougher Normal, `docs/notes/spells-retune.md`; ONE-OF-EACH: Mythic 0.72 to 0.78, so a level-100 squad of one of each takes about four tries again, `docs/notes/one-of-each.md`; LATE-RETUNE, hearts: 3.57, 2.81, 0.81, 0.68, raised so each tier stays over the tougher Normal; before that 3.45, 2.76, 0.79, 0.67, raised a little with Normal's `start` so the harder tiers keep their step over it; before that, ULT-CHARGE: Hard and Elite lifted, Legendary and Mythic eased under the tiers' own rise, for the full-strength ultimates; `docs/notes/ult-charge.md`)
    mid: { hp: 2600, atk: 58 }, // (LATE-RETUNE: 2200 and 52, `docs/notes/late-retune.md`)
    last: { hp: 3000, atk: 57 }, // (LATE-RETUNE: 2500 and 50)
    pay: 5.11,
    clear: 1450,
  },
  {
    id: 'golems',
    level: 74,
    name: 'Golem Forge',
    blurb: 'Stone, iron, crystal and magma golems, a sapphire colossus and the Forge Titan.',
    area: 'forge',
    lands: ['forge', 'crystal'],
    waves: waves(ramp(['stoneGolem', 'ironGolem', 'crystalGolem', 'magmaGolem', 'stoneGolem', 'ironGolem', 'magmaGolem'], 13), { 8: ['sapphireColossus', 'stoneGolem', 'crystalGolem', 'ironGolem'], 15: ['forgeTitan', 'ironGolem', 'magmaGolem', 'crystalGolem', 'stoneGolem', 'magmaGolem'] }),
    // (17.7 since the skills overhaul's batch 3, docs/notes/skills-1.md: with the tier skills gone a merged party took 8.5 tries at SPELLS-RETUNE's
    // 19.8 (`node tools/spells-retune/run.mjs cell golems:74:0:tp, 24 saves`); about 2.8 at 17.7, SPELLS-RETUNE's figure)
    start: 17.7, // (SPELLS-RETUNE: 19.8; 16.8 put it back where main's spell-less bot had it; the owner then asked for LATE-RETUNE's figure again, about 8 tries at level 65 with hearts, measured casting (19.8, not more: the strong party of `test/army-pace.test.ts` must still clear it at level 80); 14.6 measured by a bot that never cast the king's spells, `docs/notes/spells-retune.md`, its `xpStart` 3.63 raised with it so a run pays what it did; its bosses' fixed strength makes it move less with `start` than the others; LATE-RETUNE, hearts: 13.7 measured for a player whose run ends at the first lost wave, raised so the order holds for a player who burns hearts; 12.7 until two of a kind merged, MERGE-TWO, `docs/notes/late-retune.md`; was 3.63: ARMY-PACE, the late armies steeper, `docs/notes/army-pace.md`; 7.1 until ULT-CHARGE answered the ultimates' full strength, `docs/notes/ult-charge.md`)
    xpStart: 4.92,
    tierStart: 1.7,
    growth: 0.05,
    tierGrowth: 0.124,
    tierLift: [1, 4.36, 3.34, 0.96, 0.79], // (SPELLS-RETUNE: 3.8, 2.92, 0.84, 0.73, raised just enough that each tier stays 3% over the one below the tougher Normal, `docs/notes/spells-retune.md`; LATE-RETUNE, hearts: 3.49, 2.69, 0.78, raised so each tier stays over the tougher Normal; before that 3.3, 2.5, 0.74, raised to stay over the tougher Normal; before that, ULT-CHARGE: Hard and Elite lifted, Legendary and Mythic eased under the tiers' own rise, for the full-strength ultimates; `docs/notes/ult-charge.md`)
    mid: { hp: 1800, atk: 56 },
    last: { hp: 2040, atk: 55 },
    pay: 6.26,
    clear: 1800,
  },
];

/** The land an attempt at an army is fought on, every wave of it (the army is one long battle, so its map does not change): one of the army's lands, picked once by the attempt's seed. */
export const landOf = (a: Army, seed: number): Area => {
  const lands = a.lands ?? [a.area];
  return lands[mixSeed(seed, 0x1a4d) % lands.length];
};
/** Every land an army's attempts may be fought in (each attempt takes one). */
export const landsOf = (a: Army): readonly Area[] => a.lands ?? [a.area];

export const armyById = (id: string): Army | undefined => ARMIES.find((a) => a.id === id);
export const armyIndex = (id: string): number => ARMIES.findIndex((a) => a.id === id);
/** The boss that ends an army (the first foe of its last wave). */
export const bossOf = (a: Army): string => a.waves[a.waves.length - 1].foes[0];
/** The army that opens when this one falls (none after the last). */
export const nextArmy = (a: Army): Army | undefined => ARMIES[armyIndex(a.id) + 1];
/** The bosses (mid and final) of an army's waves, in order, by wave number. */
export const bossesOf = (a: Army): { wave: number; id: string }[] => a.waves.flatMap((w, i) => (w.boss ? [{ wave: i + 1, id: w.foes[0] }] : []));

/** How the foes of wave n of an army are boosted (n from 1), on a difficulty tier (Normal by default): hp, attack and speed. */
export function waveBoost(a: Army, n: number, tier = 0): Stage {
  const t = tierOf(tier);
  const k = (tier > 0 ? a.tierStart ?? a.start : a.start) * (1 + (tier > 0 ? a.tierGrowth ?? a.growth : a.growth) * (n - 1));
  const w = a.waves[n - 1];
  let boss: Boost | undefined;
  if (w?.boss) {
    const want = w.boss === 'final' ? a.last : a.mid;
    const def = FOES[w.foes[0]];
    boss = { size: w.boss === 'final' ? 1.5 : 1.3, hp: want.hp / def.hp, atk: want.atk / def.atk, ...(w.boss === 'final' ? { phase: t.phaseAt ?? PHASE_AT, ...(t.surge ? { surge: t.surge } : {}) } : {}) };
  }
  const lift = (tier > 0 ? a.tierLift?.[tier] ?? 1 : 1) * (t.answer ?? 1);
  return { foes: { hp: k * t.hp * lift, atk: k * t.atk * lift, ...(t.speed !== 1 ? { speed: t.speed } : {}) }, boss, area: a.area };
}

/**
 * The share of a fight's XP a run of an army pays on a tier (ARMY-PACE): its foes' added toughness taken back out, so a late army made steeper
 * pays what it did before, and the level pace (`npm run level-pace`) stays where it was; the same for a tier's `answer` to the ultimates (ULT-CHARGE).
 * 1 for every army that was not changed, on a tier without an answer.
 */
export const armyXpShare = (a: Army, tier = 0): number => (tier > 0 ? 1 / ((a.tierLift?.[tier] ?? 1) * (tierOf(tier).answer ?? 1)) : (a.xpStart ?? a.start) / a.start);

/** The foes of wave n on a tier: the wave's own band, then the tier's escorts, copies of the wave's escorts in turn (a boss is never copied, so a boss with no escorts stays alone). */
export function waveFoes(a: Army, n: number, tier = 0): readonly string[] {
  const w = a.waves[n - 1];
  const extra = tierOf(tier).extra ?? 0;
  if (!w || !extra) return w?.foes ?? [];
  const pool = w.boss ? w.foes.slice(1) : w.foes;
  return pool.length ? [...w.foes, ...Array.from({ length: extra }, (_, i) => pool[i % pool.length])] : w.foes;
}

// ---- rewards -----------------------------------------------------------------------------------------------------------

/** A replay of a beaten wave or army pays this share of what the first win did. */
export const REPLAY_SHARE = 0.15;
/** Crowns a first win of wave n pays (a boss wave a half more). */
export const waveCrowns = (a: Army, n: number): number => Math.round((10 + 2 * n) * a.pay * (a.waves[n - 1]?.boss ? 1.5 : 1));
/** The share a replay pays of an amount of crowns (at least one). */
export const replayOf = (crowns: number): number => Math.max(1, Math.round(crowns * REPLAY_SHARE));
/** Crowns on a tier: the tier's pay on top of an amount (Normal pays as it was). */
export const tierCrowns = (crowns: number, tier: number): number => Math.round(crowns * tierOf(tier).pay);
/** Everything a first clear of a tier pays: each wave's first win and the army's clear bonus. */
export const firstClearTotal = (a: Army, tier = 0): number => a.waves.reduce((n, _, i) => n + tierCrowns(waveCrowns(a, i + 1), tier), 0) + tierCrowns(a.clear, tier);
/** Everything a replay of the whole army pays on a tier. */
export const replayTotal = (a: Army, tier = 0): number => a.waves.reduce((n, _, i) => n + replayOf(tierCrowns(waveCrowns(a, i + 1), tier)), 0) + replayOf(tierCrowns(a.clear, tier));

// ---- the meta's record of the armies -----------------------------------------------------------------------------------

export interface ArmyRecord {
  /** The army's length (in waves) that `best`, `won` and `hard` count in. Missing is a save from when the army was shorter (`OLD_WAVES`). */
  waves?: number;
  /** The furthest wave reached in any attempt. */
  best: number;
  /** The furthest wave won. */
  won: number;
  /** Times the army's last boss has fallen. */
  clears: number;
  /** The best stars won on each wave (keyed by wave number). */
  stars: Record<string, number>;
  /** The army-run star conditions met on each tier, as a bitmask (keyed by tier number; see `armyStars.ts`). Missing is none. */
  met?: Record<string, number>;
  /** The waves won and clears of the harder tiers (Normal's are `won` and `clears` above). */
  hard?: Record<string, { won: number; clears: number }>;
  /** The chest milestones given (3, 5, 10 stars); each is given once, into the meta's stash (`armyStars.ts`). */
  chests?: number[];
  /** The tiers the army has been cleared on, as a bitmask (bit per tier): each one's first clear pays a chest once (`armyStars.ts`). */
  first?: number;
}

const blank = (): ArmyRecord => ({ waves: ARMY_WAVES, best: 0, won: 0, clears: 0, stars: {} });
export const recordOf = (m: Meta, id: string): ArmyRecord => m.armies[id] ?? blank();
export const armyCleared = (m: Meta, id: string): boolean => recordOf(m, id).clears > 0;
/**
 * The army stars (all tiers, all armies) each army opens at: the first is open from the start, the rest two stars further on each. A player
 * who clears each Normal army with its clear star and one more (as today's pace) is never held back; the harder tiers' stars count too.
 */
export const ARMY_NEED: readonly number[] = ARMIES.map((_, i) => 2 * i);
/** The stars an army opens at. */
export const armyNeed = (id: string): number => ARMY_NEED[Math.max(0, armyIndex(id))];
/** Every star won over all the armies. */
export const totalStars = (m: Meta): number => ARMIES.reduce((n, a) => n + armyStars(m, a).got, 0);
/** The army before this one, which must be beaten (its Normal tier cleared) before this one opens; none for the first. */
export const armyBefore = (id: string): Army | null => {
  const i = armyIndex(id);
  return i > 0 ? ARMIES[i - 1] : null;
};
/** An army is open when the army before it has been beaten and the stars won so far reach its number, or a save already had it
 *  open (`Meta.opened`, set once for a save from before the stars). Stars alone never skip an army: the owner's rule, so a player
 *  cannot farm the first army's tiers past an unbeaten one. */
export function armyUnlocked(m: Meta, id: string): boolean {
  const i = armyIndex(id);
  if (i === 0) return true;
  if (i < 0) return false;
  if (m.opened?.includes(id)) return true;
  return armyCleared(m, ARMIES[i - 1].id) && totalStars(m) >= ARMY_NEED[i];
}
/** The armies beaten so far. */
export const clearedCount = (m: Meta): number => ARMIES.filter((a) => armyCleared(m, a.id)).length;
const bits = (n: number): number => {
  let c = 0;
  for (let x = n | 0; x; x &= x - 1) c++;
  return c;
};
/** The conditions a tier has met (a bitmask) and the stars that makes. */
export const metOf = (rec: ArmyRecord, tier: number): number => (rec.met?.[String(tier)] ?? 0) & ((1 << tierOf(tier).stars) - 1);
export const tierStars = (rec: ArmyRecord, tier: number): number => bits(metOf(rec, tier));
/** The stars an army has won over its four tiers, and the most there are (10). */
export const armyStars = (m: Meta, a: Army): { got: number; max: number } => ({ got: TIERS.reduce((n, _, i) => n + tierStars(recordOf(m, a.id), i), 0), max: ARMY_STARS });
/** Whether a tier is open to fight: Normal with the army, the harder ones once the stars before them are all won. */
export const tierOpen = (m: Meta, a: Army, tier: number): boolean => armyUnlocked(m, a.id) && armyStars(m, a).got >= tierOf(tier).need;
/** An unlocked army whose unlock the player has not looked at yet (its card glows). */
export const armyIsNew = (m: Meta, id: string): boolean => armyIndex(id) > 0 && armyUnlocked(m, id) && !m.armySeen.includes(id);
/** The player has seen these armies' cards. */
export function markSeen(m: Meta): boolean {
  const fresh = ARMIES.filter((a) => armyIsNew(m, a.id)).map((a) => a.id);
  m.armySeen.push(...fresh);
  return fresh.length > 0;
}

export interface ArmyPay {
  /** Crowns paid for this fight (the wave, its stars, and the clear bonus on the last boss). */
  crowns: number;
  /** The wave had been won before (so it paid only a share). */
  replay: boolean;
  /** This win beat the army's last boss for the first time. */
  firstClear: boolean;
  /** The army this fight's stars opened (set by the page once the run's stars are settled). */
  unlocked?: Army;
}

/** Settle a fought wave in the meta: the furthest wave reached, and for a win the wave's crowns, its stars and an army's clear. */
export function settleWave(m: Meta, id: string, n: number, won: boolean, stars: number, tier = 0): ArmyPay {
  const a = armyById(id)!;
  const rec = (m.armies[id] ??= blank());
  rec.best = Math.max(rec.best, n);
  if (!won) return { crowns: 0, replay: false, firstClear: false };
  // (a harder tier keeps its own waves won and clears; its crowns are the tier's pay on the same amounts)
  const mine: { won: number; clears: number } = tier ? ((rec.hard ??= {})[String(tier)] ??= { won: 0, clears: 0 }) : rec;
  const replay = n <= mine.won;
  mine.won = Math.max(mine.won, n);
  let crowns = tierCrowns(waveCrowns(a, n), tier);
  if (replay) crowns = replayOf(crowns);
  // (stars pay only what they add to the wave's best: a farmed wave does not pay them twice)
  const before = rec.stars[String(n)] ?? 0;
  if (stars > before) {
    crowns += starCrowns(stars - before);
    rec.stars[String(n)] = stars;
  }
  const last = n >= a.waves.length;
  const firstClear = last && mine.clears === 0;
  if (last) {
    crowns += firstClear ? tierCrowns(a.clear, tier) : replayOf(tierCrowns(a.clear, tier));
    mine.clears++;
  }
  m.crowns += crowns;
  // (the stars open the next army, and they are settled after the wave: the page asks `armyUnlocked` again then)
  return { crowns, replay, firstClear };
}

/** How many waves each army had before all of them were made 15: a saved record without `waves` counts in these. */
export const OLD_WAVES: Readonly<Record<string, number>> = { orcs: 8, undead: 8, beasts: 8, wildwood: 9, labyrinth: 9, ogres: 10, infernal: 10, yokai: 10, golems: 10 };

/** A wave count of an old record mapped onto the army's new length: the share of the way it had come, up to `cap` (an army already cleared has every wave won). */
const mapWave = (n: number, old: number, now: number, cap: number): number => Math.min(cap, n >= old ? now : Math.floor((n * now) / old));

/** Carry a record from the army's old length to its new one: the best and won waves, the harder tiers' won waves. Stars, chests and the conditions met are untouched. */
function mapLength(rec: ArmyRecord, a: Army): void {
  const old = OLD_WAVES[a.id] ?? a.waves.length;
  if (rec.waves === a.waves.length || old === a.waves.length) {
    rec.waves = a.waves.length;
    return;
  }
  const now = a.waves.length;
  // (a wave won is never the last unless the army was cleared)
  rec.best = rec.clears > 0 ? now : mapWave(rec.best, old, now, now);
  rec.won = rec.clears > 0 ? now : mapWave(rec.won, old, now, now - 1);
  for (const h of Object.values(rec.hard ?? {})) h.won = h.clears > 0 ? now : mapWave(h.won, old, now, now - 1);
  rec.waves = a.waves.length;
}

/**
 * A save from before the armies has its furthest stage mapped onto them: five stages to an army, so a save that won
 * the first boss (stage 5) has cleared the Orc Warband, and so on up the list. Nothing else changes.
 */
export function migrateArmies(raw: unknown, bestStage: number): Record<string, ArmyRecord> {
  const out: Record<string, ArmyRecord> = {};
  if (raw && typeof raw === 'object') {
    for (const a of ARMIES) {
      const r = (raw as Record<string, Partial<ArmyRecord> | undefined>)[a.id];
      if (!r || typeof r !== 'object') continue;
      const stars: Record<string, number> = {};
      if (r.stars && typeof r.stars === 'object') for (const [k, s] of Object.entries(r.stars)) if (/^[1-9]\d*$/.test(k) && typeof s === 'number' && s >= 1) stars[k] = Math.min(3, s | 0);
      const rec: ArmyRecord = { best: Math.max(0, (r.best ?? 0) | 0), won: Math.max(0, (r.won ?? 0) | 0), clears: Math.max(0, (r.clears ?? 0) | 0), stars };
      readTiers(rec, r);
      if (typeof r.waves === 'number') rec.waves = r.waves | 0;
      mapLength(rec, a);
      // (a save from before the 10 stars: an army already beaten has its Normal clear star, and the old stars of its last wave say more)
      if (!r.met && rec.clears > 0) rec.met = { '0': oldStarMask(rec, a) };
      out[a.id] = rec;
    }
    return out;
  }
  const beaten = Math.min(ARMIES.length, Math.max(0, Math.floor((bestStage - 1) / 5)));
  ARMIES.slice(0, beaten).forEach((a) => (out[a.id] = { waves: a.waves.length, best: a.waves.length, won: a.waves.length, clears: 1, stars: {}, met: { '0': 1 }, first: 1 }));
  return out;
}

/** The Normal conditions an old record implies: the clear, and (if the last wave, as it was then, earned all three old stars) no hero lost in the final fight. */
const oldStarMask = (rec: ArmyRecord, a: Army): number => 1 | (rec.stars[String(OLD_WAVES[a.id] ?? a.waves.length)] === 3 ? 2 : 0);

/** Read the 10-star fields of a saved record: only what makes sense is kept. */
function readTiers(rec: ArmyRecord, r: Partial<ArmyRecord>): void {
  if (r.met && typeof r.met === 'object') {
    const met: Record<string, number> = {};
    TIERS.forEach((t, i) => {
      const v = (r.met as Record<string, unknown>)[String(i)];
      const mask = typeof v === 'number' ? (v | 0) & ((1 << t.stars) - 1) : 0;
      if (mask) met[String(i)] = mask;
    });
    rec.met = met;
  }
  if (r.hard && typeof r.hard === 'object') {
    const hard: Record<string, { won: number; clears: number }> = {};
    for (let i = 1; i < TIERS.length; i++) {
      const h = (r.hard as Record<string, { won?: unknown; clears?: unknown } | undefined>)[String(i)];
      if (h && typeof h === 'object') hard[String(i)] = { won: Math.max(0, Number(h.won) | 0), clears: Math.max(0, Number(h.clears) | 0) };
    }
    rec.hard = hard;
  }
  const milestones = (v: unknown): number[] => (Array.isArray(v) ? MILESTONES.filter((n) => v.includes(n)) : []);
  if (r.chests) rec.chests = milestones(r.chests);
  // (a save from before the first-clear chests: the tiers already cleared count as paid, so nothing is given back-dated)
  if (typeof r.first === 'number') rec.first = (r.first | 0) & ((1 << TIERS.length) - 1);
  else {
    let mask = rec.clears > 0 ? 1 : 0;
    TIERS.forEach((_, i) => {
      if (i > 0 && (rec.hard?.[String(i)]?.clears ?? 0) > 0) mask |= 1 << i;
    });
    if (mask) rec.first = mask;
  }
}

/** The ids of the armies a saved list names (anything else is dropped). */
export const readSeen = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string' && !!armyById(x)) : []);
/** The seen list a save from before the armies gets: every army it has already opened (nothing new to glow). */
export const seenFor = (m: Pick<Meta, 'armies'>): string[] => ARMIES.filter((_, i) => i === 0 || (m.armies[ARMIES[i - 1].id]?.clears ?? 0) > 0).map((a) => a.id);

/** The foes' ids that stand in an army's waves: all of them are in `UNITS` (used by the tests). */
export const armyFoes = (a: Army): string[] => [...new Set(a.waves.flatMap((w) => w.foes))];
export const isBossWave = (a: Army, n: number): boolean => !!a.waves[n - 1]?.boss && isBoss(a.waves[n - 1].foes[0]);
