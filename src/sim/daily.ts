// The daily challenge's shape: a fixed run of ten waves that ends in the boss of the day. The boss and its troops come from one
// of the first armies, chosen from the date alone (a side stream of the date's seed), so every player meets the same day; the
// waves are the army's own field waves thinned to eight, a mid-boss at wave 5, and the boss at wave 10. The run is an `Army`
// in shape (`dailyArmy`), so the waves, the boss intro, the long map and the wave boosts are the armies' own code; the strength
// is the daily's own (`DAILY_START`, the same for every boss, so a day is only as hard as its boss's kit). Pure rules: no Pixi,
// no DOM.

import { ARMIES, bossOf, type Army } from './armies';
import { dailyArea } from './dailySeed';
import { Rng, mixSeed } from './rng';
import { UNITS } from './units';
import { dailyTheme, SWARM_MAX, type DailyTheme } from './dailyThemes';

/** The daily is this many waves, the last of them the boss of the day, with a mid-boss at `DAILY_MID`. */
export const DAILY_WAVES = 10;
export const DAILY_MID = 5;

/** The foes' hp and attack at wave 1, as a share of their stats in `foes.ts`, and the share they gain each wave after (the same for every day). */
// (0.565 since ONE-OF-EACH: a squad of five different heroes cleared a fresh save's daily 79% of the time at 0.55; 71% now, `docs/notes/one-of-each.md`)
export const DAILY_START = 0.76; // (SPELLS-RETUNE: 0.565 measured by a bot that never cast the king's spells; with Auto casting them a fresh save cleared every date, `docs/notes/spells-retune.md`)
export const DAILY_GROWTH = 0.155;
/** The hp and attack a mid-boss and the boss of the day have at wave 1's strength (the wave's multiplier then applies). */
export const DAILY_MID_STATS = { hp: 1500, atk: 46 };
export const DAILY_LAST_STATS = { hp: 1700, atk: 48 };

/** Each host army's boss is eased or hardened by this share of the common stats, so a day is about as hard as any other (a lich's kit is the harshest of them, a satyr lord's the mildest; set by `npm run daily-rate`). */
export const BOSS_SCALE: Readonly<Record<string, number>> = { orcs: 1, undead: 0.8, beasts: 1, wildwood: 1, labyrinth: 1, ogres: 1.12 };

/** The armies a day's boss may come from: the early ones, whose bosses suit a squad of the starting five. */
export const DAILY_ARMIES: readonly string[] = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres'];

/** The army whose troops and boss a date's daily uses. */
export function dailyHost(date: number, theme: DailyTheme | null = dailyTheme(date)): Army {
  // (a themed day's host is the theme's: DAILY-BUILDS, `dailyThemes.ts`)
  if (theme) return ARMIES.find((a) => a.id === theme.host)!;
  const id = DAILY_ARMIES[new Rng(mixSeed(date, 0xb055)).int(0, DAILY_ARMIES.length - 1)];
  return ARMIES.find((a) => a.id === id)!;
}

const cache = new Map<string, Army>();

/** A date's daily as an army: ten waves, the host army's field waves thinned to eight, its mid-boss at wave 5 and its last boss at wave 10. */
export function dailyArmy(date: number, theme: DailyTheme | null = dailyTheme(date)): Army {
  // (a run of a themed date begun before the themes passes null: the old daily, `runTheme`)
  const key = `${date}:${theme?.id ?? ''}`;
  let a = cache.get(key);
  if (a) return a;
  const host = dailyHost(date, theme);
  const field = host.waves.filter((w) => !w.boss);
  const pick = (i: number) => field[Math.round((i * (field.length - 1)) / 7)];
  const mid = host.waves.find((w) => w.boss === 'mid')!;
  const last = host.waves[host.waves.length - 1];
  const swarm = !!theme?.swarm;
  // (a theme's own ease or hardening of its bosses)
  const ease = theme?.boss ?? 1;
  const waves = Array.from({ length: DAILY_WAVES }, (_, k) => {
    const n = k + 1;
    if (n === DAILY_WAVES) return { foes: last.foes, boss: 'final' as const };
    if (n === DAILY_MID) return { foes: mid.foes, boss: 'mid' as const };
    const foes = pick(n < DAILY_MID ? n - 1 : n - 2).foes;
    // (a swarm day doubles each field wave's foes, to `SWARM_MAX`; their hp is cut in `startStage`)
    return { foes: swarm ? [...foes, ...foes].slice(0, Math.max(foes.length, SWARM_MAX)) : foes };
  });
  a = {
    id: `daily${date}`,
    name: `Daily: ${UNITS[bossOf(host)].name}`,
    blurb: `Ten waves ending in the ${UNITS[bossOf(host)].name}.`,
    level: 1,
    area: dailyArea(date, theme),
    waves,
    start: DAILY_START,
    growth: DAILY_GROWTH,
    mid: { hp: Math.round(DAILY_MID_STATS.hp * ease), atk: Math.round(DAILY_MID_STATS.atk * ease) },
    last: { hp: Math.round(DAILY_LAST_STATS.hp * BOSS_SCALE[host.id] * ease), atk: Math.round(DAILY_LAST_STATS.atk * BOSS_SCALE[host.id] * ease) },
    pay: 0,
    clear: 0,
  };
  if (cache.size > 16) cache.clear();
  cache.set(key, a);
  return a;
}

/** The boss of the day: its unit id and its name. */
export const dailyBoss = (date: number): string => bossOf(dailyArmy(date));
export const dailyBossName = (date: number): string => UNITS[dailyBoss(date)].name;

/** The seed a date's daily chest is rolled from (a side stream of the save's seed and the date). */
export const dailyChestSeed = (seed: number, date: number): number => mixSeed(seed, 0xda17c, date);

/** Crowns a first win of wave n pays in the daily (the same on every day; a lost run keeps what its cleared waves paid). */
export const dailyWaveCrowns = (n: number): number => 6 + 2 * n;
/** The crowns the first `n` waves of a daily pay in all (what a run that fell after clearing `n` keeps). */
export const dailyCrowns = (n: number): number => Array.from({ length: n }, (_, i) => dailyWaveCrowns(i + 1)).reduce((a, b) => a + b, 0);
