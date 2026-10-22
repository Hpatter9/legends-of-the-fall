// The armies: the stages of a run, King God Castle style. A player picks an army and fights through its waves, each
// tougher than the last, with a mid-boss around halfway and the army's boss at the end; the army's final boss falling
// unlocks the next. A lost fight ends the run and the army starts again from wave 1 (heroes keep their XP and levels,
// which is what makes the next try stronger). A beaten army can be fought again for a small share of its first-clear
// rewards. Pure rules: no Pixi, no DOM; the meta is changed only through the functions here.

import type { Boost, Stage } from './battle';
import type { Area } from './board';
import { FOES, isBoss } from './foes';
import type { Meta } from './meta';
import { starCrowns } from './stars';

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
  /** The land its waves are fought in. */
  area: Area;
  waves: readonly Wave[];
  /** The foes' hp and attack at wave 1, as a share of their stats in `foes.ts`, and the share they gain each wave after. */
  start: number;
  growth: number;
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

export const ARMIES: readonly Army[] = [
  {
    id: 'orcs',
    name: 'Orc Warband',
    blurb: 'Grunts, archers and brutes behind a warlord.',
    area: 'highlands',
    waves: waves(
      [
        wave('orcGrunt', 'orcGrunt', 'orcArcher'),
        wave('orcGrunt', 'orcGrunt', 'orcGrunt', 'orcArcher'),
        wave('orcGrunt', 'orcGrunt', 'orcArcher', 'orcBrute'),
        wave('orcGrunt', 'orcGrunt', 'orcArcher', 'orcArcher', 'orcBrute'),
        wave('orcGrunt', 'orcBrute', 'orcGrunt', 'orcArcher', 'orcBrute'),
        wave('orcGrunt', 'orcGrunt', 'orcBrute', 'orcArcher', 'orcBrute', 'orcArcher'),
      ],
      { 4: ['orcChieftain', 'orcGrunt', 'orcGrunt', 'orcArcher'], 8: ['orcWarlord', 'orcGrunt', 'orcArcher', 'orcGrunt', 'orcBrute'] },
    ),
    start: 0.5,
    growth: 0.2,
    mid: { hp: 1500, atk: 50 },
    last: { hp: 3500, atk: 85 },
    pay: 1,
    clear: 120,
  },
  {
    id: 'undead',
    name: 'Undead Legion',
    blurb: 'Skeleton warriors, spearmen and archers, led by a lich.',
    area: 'dungeon',
    waves: waves(
      [
        wave('skeleton', 'skeleton', 'boneVolley'),
        wave('skeleton', 'spearman', 'spearman', 'boneVolley'),
        wave('skeleton', 'skeleton', 'spearman', 'boneVolley'),
        wave('skeleton', 'skeleton', 'spearman', 'spearman', 'boneVolley'),
        wave('skeleton', 'spearman', 'skeleton', 'boneVolley', 'boneVolley'),
        wave('skeleton', 'skeleton', 'spearman', 'spearman', 'boneVolley', 'boneVolley'),
      ],
      { 4: ['boneCaptain', 'skeleton', 'spearman', 'boneVolley'], 8: ['lichKing', 'skeleton', 'spearman', 'spearman', 'boneVolley'] },
    ),
    start: 0.7,
    growth: 0.2,
    mid: { hp: 1800, atk: 56 },
    last: { hp: 2600, atk: 70 },
    pay: 1.5,
    clear: 200,
  },
  {
    id: 'beasts',
    name: 'Beast Packs',
    blurb: 'Black, red and white werewolves, fast and hungry.',
    area: 'snow',
    waves: waves(
      [
        wave('packBlack', 'packRed', 'packWhite'),
        wave('packBlack', 'packRed', 'packWhite', 'packBlack'),
        wave('packRed', 'packWhite', 'packBlack', 'packRed'),
        wave('packBlack', 'packRed', 'packWhite', 'packBlack', 'packRed'),
        wave('packWhite', 'packBlack', 'packRed', 'packWhite', 'packBlack'),
        wave('packBlack', 'packRed', 'packWhite', 'packBlack', 'packRed', 'packWhite'),
      ],
      { 4: ['alphaWolf', 'packBlack', 'packRed', 'packWhite'], 8: ['boarKing', 'packBlack', 'packRed', 'packWhite', 'packBlack'] },
    ),
    start: 0.85,
    growth: 0.18,
    mid: { hp: 2000, atk: 60 },
    last: { hp: 3400, atk: 80 },
    pay: 2.1,
    clear: 300,
  },
  {
    id: 'wildwood',
    name: 'The Wildwood',
    blurb: 'Satyrs pipe the grove into a frenzy; three forest lords guard it.',
    area: 'forest',
    waves: waves(
      [
        wave('groveSatyr1', 'groveSatyr2', 'groveSatyr3'),
        wave('groveSatyr1', 'groveSatyr2', 'groveSatyr3', 'groveSatyr1'),
        wave('groveSatyr2', 'groveSatyr3', 'groveSatyr1', 'groveSatyr2', 'groveSatyr3'),
        wave('groveSatyr1', 'groveSatyr2', 'groveSatyr3', 'groveSatyr1', 'groveSatyr2'),
        wave('groveSatyr3', 'groveSatyr1', 'groveSatyr2', 'groveSatyr3', 'groveSatyr1', 'groveSatyr2'),
        wave('groveSatyr1', 'groveSatyr2', 'groveSatyr3', 'groveSatyr1', 'groveSatyr2', 'groveSatyr3'),
      ],
      {
        3: ['forestBoss1', 'groveSatyr1', 'groveSatyr2', 'groveSatyr3'],
        6: ['forestBoss2', 'groveSatyr3', 'groveSatyr1', 'groveSatyr2', 'groveSatyr3'],
        9: ['forestBoss3', 'groveSatyr1', 'groveSatyr2', 'groveSatyr3', 'groveSatyr1'],
      },
    ),
    start: 0.9,
    growth: 0.17,
    mid: { hp: 2400, atk: 60 },
    last: { hp: 3000, atk: 72 },
    pay: 2.8,
    clear: 430,
  },
  {
    id: 'labyrinth',
    name: 'The Labyrinth',
    blurb: 'Minotaurs charge and gorgons turn heroes to stone.',
    area: 'dungeon',
    waves: waves(
      [
        wave('mazeMino1', 'mazeMino2', 'mazeGorgon1'),
        wave('mazeMino1', 'mazeMino3', 'mazeGorgon2', 'mazeGorgon1'),
        wave('mazeMino2', 'mazeMino3', 'mazeMino1', 'mazeGorgon3'),
        wave('mazeMino1', 'mazeMino2', 'mazeGorgon1', 'mazeGorgon2', 'mazeMino3'),
        wave('mazeMino3', 'mazeMino1', 'mazeMino2', 'mazeGorgon3', 'mazeGorgon1'),
        wave('mazeMino1', 'mazeMino2', 'mazeMino3', 'mazeGorgon1', 'mazeGorgon2', 'mazeGorgon3'),
        wave('mazeMino2', 'mazeMino3', 'mazeMino1', 'mazeMino2', 'mazeGorgon2', 'mazeGorgon3'),
      ],
      { 5: ['gorgonQueen', 'mazeMino1', 'mazeMino2', 'mazeGorgon3'], 9: ['minotaurChampion', 'mazeMino1', 'mazeGorgon1', 'mazeMino2', 'mazeGorgon2'] },
    ),
    start: 1.0,
    growth: 0.17,
    mid: { hp: 1700, atk: 46 },
    last: { hp: 2500, atk: 60 },
    pay: 3.6,
    clear: 600,
  },
  {
    id: 'ogres',
    name: 'Ogre Clans',
    blurb: 'Ogres and orc brutes, a shaman king and a horned giant.',
    area: 'highlands',
    waves: waves(
      [
        wave('clanOgre', 'clanBrute', 'clanBrute'),
        wave('clanOgre', 'clanOgre', 'clanBrute'),
        wave('clanBrute', 'clanOgre', 'clanBrute', 'clanOgre'),
        wave('clanOgre', 'clanOgre', 'clanBrute', 'clanBrute'),
        wave('clanOgre', 'clanBrute', 'clanOgre', 'clanOgre', 'clanBrute'),
        wave('clanOgre', 'clanOgre', 'clanOgre', 'clanBrute', 'clanBrute'),
        wave('clanOgre', 'clanOgre', 'clanBrute', 'clanOgre', 'clanBrute', 'clanOgre'),
        wave('clanOgre', 'clanOgre', 'clanOgre', 'clanOgre', 'clanBrute', 'clanBrute'),
      ],
      { 5: ['shamanKing', 'clanBrute', 'clanOgre', 'clanBrute'], 10: ['hornedOgre', 'clanOgre', 'clanBrute', 'clanOgre', 'clanBrute'] },
    ),
    start: 1.1,
    growth: 0.16,
    mid: { hp: 1800, atk: 48 },
    last: { hp: 2600, atk: 52 },
    pay: 4.6,
    clear: 820,
  },
  {
    id: 'infernal',
    name: 'Infernal Host',
    blurb: 'Imps and demons of the pit, a devil and a demon lord.',
    area: 'volcano',
    waves: waves(
      [
        wave('hellImp', 'hellImp', 'hellDemon'),
        wave('hellImp', 'hellImp', 'hellImp', 'hellDemon'),
        wave('hellImp', 'hellDemon', 'hellImp', 'hellDemon'),
        wave('hellImp', 'hellImp', 'hellDemon', 'hellImp', 'hellDemon'),
        wave('hellImp', 'hellImp', 'hellDemon', 'hellDemon', 'hellImp'),
        wave('hellDemon', 'hellImp', 'hellImp', 'hellDemon', 'hellImp', 'hellImp'),
        wave('hellImp', 'hellDemon', 'hellImp', 'hellDemon', 'hellImp', 'hellDemon'),
        wave('hellDemon', 'hellDemon', 'hellImp', 'hellImp', 'hellDemon', 'hellImp'),
      ],
      { 5: ['devilLeader', 'hellImp', 'hellDemon', 'hellImp'], 10: ['demonLord', 'hellImp', 'hellDemon', 'hellImp', 'hellDemon'] },
    ),
    start: 1.25,
    growth: 0.16,
    mid: { hp: 2000, atk: 50 },
    last: { hp: 2300, atk: 45 },
    pay: 5.8,
    clear: 1100,
  },
];

export const armyById = (id: string): Army | undefined => ARMIES.find((a) => a.id === id);
export const armyIndex = (id: string): number => ARMIES.findIndex((a) => a.id === id);
/** The boss that ends an army (the first foe of its last wave). */
export const bossOf = (a: Army): string => a.waves[a.waves.length - 1].foes[0];
/** The army that opens when this one falls (none after the last). */
export const nextArmy = (a: Army): Army | undefined => ARMIES[armyIndex(a.id) + 1];
/** The bosses (mid and final) of an army's waves, in order, by wave number. */
export const bossesOf = (a: Army): { wave: number; id: string }[] => a.waves.flatMap((w, i) => (w.boss ? [{ wave: i + 1, id: w.foes[0] }] : []));

/** How the foes of wave n of an army are boosted (n from 1). */
export function waveBoost(a: Army, n: number): Stage {
  const k = a.start * (1 + a.growth * (n - 1));
  const w = a.waves[n - 1];
  let boss: Boost | undefined;
  if (w?.boss) {
    const want = w.boss === 'final' ? a.last : a.mid;
    const def = FOES[w.foes[0]];
    boss = { size: w.boss === 'final' ? 1.5 : 1.3, hp: want.hp / def.hp, atk: want.atk / def.atk };
  }
  return { foes: { hp: k, atk: k }, boss, area: a.area };
}

// ---- rewards -----------------------------------------------------------------------------------------------------------

/** A replay of a beaten wave or army pays this share of what the first win did. */
export const REPLAY_SHARE = 0.15;
/** Crowns a first win of wave n pays (a boss wave a half more). */
export const waveCrowns = (a: Army, n: number): number => Math.round((10 + 2 * n) * a.pay * (a.waves[n - 1]?.boss ? 1.5 : 1));
/** The share a replay pays of an amount of crowns (at least one). */
export const replayOf = (crowns: number): number => Math.max(1, Math.round(crowns * REPLAY_SHARE));
/** Everything a first clear pays: each wave's first win and the army's clear bonus. */
export const firstClearTotal = (a: Army): number => a.waves.reduce((n, _, i) => n + waveCrowns(a, i + 1), 0) + a.clear;
/** Everything a replay of the whole army pays. */
export const replayTotal = (a: Army): number => a.waves.reduce((n, _, i) => n + replayOf(waveCrowns(a, i + 1)), 0) + replayOf(a.clear);

// ---- the meta's record of the armies -----------------------------------------------------------------------------------

export interface ArmyRecord {
  /** The furthest wave reached in any attempt. */
  best: number;
  /** The furthest wave won. */
  won: number;
  /** Times the army's last boss has fallen. */
  clears: number;
  /** The best stars won on each wave (keyed by wave number). */
  stars: Record<string, number>;
}

const blank = (): ArmyRecord => ({ best: 0, won: 0, clears: 0, stars: {} });
export const recordOf = (m: Meta, id: string): ArmyRecord => m.armies[id] ?? blank();
export const armyCleared = (m: Meta, id: string): boolean => recordOf(m, id).clears > 0;
/** An army is open when it is the first or the one before it has been beaten. */
export function armyUnlocked(m: Meta, id: string): boolean {
  const i = armyIndex(id);
  return i === 0 || (i > 0 && armyCleared(m, ARMIES[i - 1].id));
}
/** The armies beaten so far. */
export const clearedCount = (m: Meta): number => ARMIES.filter((a) => armyCleared(m, a.id)).length;
/** The stars won across an army's waves, and the most there are. */
export const armyStars = (m: Meta, a: Army): { got: number; max: number } => ({ got: Object.values(recordOf(m, a.id).stars).reduce((n, s) => n + s, 0), max: a.waves.length * 3 });
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
  /** The army this first clear opened. */
  unlocked?: Army;
}

/** Settle a fought wave in the meta: the furthest wave reached, and for a win the wave's crowns, its stars and an army's clear. */
export function settleWave(m: Meta, id: string, n: number, won: boolean, stars: number): ArmyPay {
  const a = armyById(id)!;
  const rec = (m.armies[id] ??= blank());
  rec.best = Math.max(rec.best, n);
  if (!won) return { crowns: 0, replay: false, firstClear: false };
  const replay = n <= rec.won;
  rec.won = Math.max(rec.won, n);
  let crowns = replay ? replayOf(waveCrowns(a, n)) : waveCrowns(a, n);
  // (stars pay only what they add to the wave's best: a farmed wave does not pay them twice)
  const before = rec.stars[String(n)] ?? 0;
  if (stars > before) {
    crowns += starCrowns(stars - before);
    rec.stars[String(n)] = stars;
  }
  const last = n >= a.waves.length;
  const firstClear = last && rec.clears === 0;
  if (last) {
    crowns += firstClear ? a.clear : replayOf(a.clear);
    rec.clears++;
  }
  m.crowns += crowns;
  return { crowns, replay, firstClear, unlocked: firstClear ? nextArmy(a) : undefined };
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
      out[a.id] = { best: Math.max(0, (r.best ?? 0) | 0), won: Math.max(0, (r.won ?? 0) | 0), clears: Math.max(0, (r.clears ?? 0) | 0), stars };
    }
    return out;
  }
  const beaten = Math.min(ARMIES.length, Math.max(0, Math.floor((bestStage - 1) / 5)));
  ARMIES.slice(0, beaten).forEach((a) => (out[a.id] = { best: a.waves.length, won: a.waves.length, clears: 1, stars: {} }));
  return out;
}

/** The ids of the armies a saved list names (anything else is dropped). */
export const readSeen = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string' && !!armyById(x)) : []);
/** The seen list a save from before the armies gets: every army it has already opened (nothing new to glow). */
export const seenFor = (m: Pick<Meta, 'armies'>): string[] => ARMIES.filter((_, i) => i === 0 || (m.armies[ARMIES[i - 1].id]?.clears ?? 0) > 0).map((a) => a.id);

/** The foes' ids that stand in an army's waves: all of them are in `UNITS` (used by the tests). */
export const armyFoes = (a: Army): string[] => [...new Set(a.waves.flatMap((w) => w.foes))];
export const isBossWave = (a: Army, n: number): boolean => !!a.waves[n - 1]?.boss && isBoss(a.waves[n - 1].foes[0]);
