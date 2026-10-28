// Awakening materials (AWAKEN-MATS, a proposal: phase A). Each class trait (`traitsOf(kind)[1]`) has a rift ore of its
// own, in its aura's colour (`render/auraStyles.ts`); awakening a hero asks for ores of its class on top of the shards
// (`awakenRules.ts`). Ores come from the Calamity: each map's boss pays some of a class drawn from the heroes who fought
// it, a mini-boss a couple of any class, and a full clear a Rift Cache the player opens on any hero's awakening panel.
//
// Not yet wired into the game: the numbers and names here are the proposal (`docs/notes/awaken-mats.md`), read by the
// pace model (`tools/unlockPace.ts --awaken`) and the mock-ups. Pure rules: no Pixi, no DOM; the draws come from side
// streams of the run's seed, so no existing fight or reward rolls differently.

import { mixSeed, Rng } from './rng';
import { traitsOf } from './traits';

export interface Ore {
  /** The class trait it awakens. */
  trait: string;
  name: string;
  /** One wry line for the panel and the codex. */
  line: string;
  /** The class's aura colour (`auraStyles.ts`), which the icon is tinted to. */
  colour: number;
  /** The icon's file in `src/art/ui/ore/` (a pack icon tinted to the colour). */
  icon: string;
}

const o = (trait: string, name: string, colour: number, line: string): Ore => ({ trait, name, colour, line, icon: `ore-${trait}.png` });

/** Every class's ore. */
export const ORES: Readonly<Record<string, Ore>> = {
  guardian: o('guardian', 'Oathgold', 0xffd24a, 'Melted down from promises kept. There is not a great deal of it.'),
  bulwark: o('bulwark', 'Bastion Bronze', 0xf0b860, 'Scraped off a wall that refused to fall. The wall is still sulking.'),
  blade: o('blade', 'Whetblood Ore', 0xe0304a, 'Sharpens anything it touches, including tempers.'),
  marksman: o('marksman', 'Windglass', 0xdbe8f4, 'Splinters of a gust that never missed. Handle by the edges.'),
  gunner: o('gunner', 'Saltpetre Cake', 0xf2d35a, 'Smells of burnt eyebrows. Keep away from candles, and from Siege Bot.'),
  caster: o('caster', 'Hexquartz', 0xb06cff, 'Hums in a key that wizards find soothing and cats do not.'),
  arcanist: o('arcanist', 'Starseed', 0x7a86ff, 'Pebbles of night sky. Each one remembers a different tomorrow.'),
  support: o('support', 'Hearthsalt', 0xfff0b8, 'Warm to the touch, and tastes faintly of soup.'),
  beast: o('beast', 'Fang Amber', 0xff6a2a, 'Something with teeth is asleep inside. Do not knock.'),
  assassin: o('assassin', 'Nightglass', 0x6a46a8, 'Hard to find, harder to see, and someone has always just pocketed it.'),
  trickster: o('trickster', 'Moonmilk Pearls', 0xc6d2ff, 'Count them twice; the answer will differ.'),
  warden: o('warden', 'Mossjade', 0x6cd060, 'Grows back if you chip it, which the jewellers find rude.'),
  vanguard: o('vanguard', 'Charge Cinders', 0xffa040, 'Still warm from the last time someone ran at a wall.'),
};
export const ORE_TRAITS: readonly string[] = Object.keys(ORES);

/** The ore a hero kind's awakening asks for (its class trait's), or undefined for a kind without a class. */
export const oreOf = (kind: string): Ore | undefined => ORES[traitsOf(kind)[1] ?? ''];

/** Ores of its class each awakening step asks for (I, II), besides the shards `AWAKEN_COSTS` uses. */
export const AWAKEN_ORES: readonly number[] = [10, 20];

/** Ores a calamity's map boss pays when it falls (maps 1 to 6), of one class drawn from the heroes who fought it. */
export const BOSS_ORES: readonly number[] = [2, 2, 3, 3, 4, 4];
/** Ores a mini-boss (a detour's too) pays, of any class. */
export const ELITE_ORES = 2;
/** Ores a Rift Cache gives when opened, all of the class of the hero whose panel it is opened on. A full clear pays one. */
export const CACHE_ORES = 8;
/** Every ore a calamity pays grows by this share for each ascension level (as the crowns grow by a fifth). */
export const ORE_ASC = 0.1;
/** The count `n` at an ascension level (never less than `n`). */
export const ascOres = (n: number, level: number): number => Math.max(n, Math.round(n * (1 + ORE_ASC * Math.max(0, level))));

/** A drop of ores. */
export interface OreDrop { trait: string; n: number }

/** The ores a map's boss pays: a class drawn from the heroes who fought it (`kinds`, one entry a hero, so a class with more
 *  heroes in the party comes up more often), from the run's own side stream. */
export function bossOres(seed: number, map: number, level: number, kinds: readonly string[]): OreDrop {
  const pool = kinds.map((k) => traitsOf(k)[1]).filter((t): t is string => !!t && !!ORES[t]);
  const rng = new Rng(mixSeed(seed, 0x0e5b, map));
  const trait = pool.length ? pool[rng.int(0, pool.length - 1)] : ORE_TRAITS[rng.int(0, ORE_TRAITS.length - 1)];
  return { trait, n: ascOres(BOSS_ORES[Math.max(0, Math.min(BOSS_ORES.length - 1, map - 1))], level) };
}

/** The ores a mini-boss pays: two of any class (`which` tells the run's mini-bosses apart). */
export function eliteOres(seed: number, map: number, which: number, level: number): OreDrop {
  const rng = new Rng(mixSeed(seed, 0x0e5e, map, which));
  return { trait: ORE_TRAITS[rng.int(0, ORE_TRAITS.length - 1)], n: ascOres(ELITE_ORES, level) };
}

/** The ores a Rift Cache gives at an ascension level. */
export const cacheOres = (level: number): number => ascOres(CACHE_ORES, level);
