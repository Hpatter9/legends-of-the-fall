// Relic sets: the tower's relics grouped into five themed sets. Owning two of a set gives a small bonus and three a strong one
// (the three keeps the two's). A bonus is either plain numbers, folded into the relics' effects like any relic's, or a small
// hook the fight reads (`SetHooks`: burning blows, a first-hit chill, healing, bleeding crits). A run with no set pieces has no
// bonus, so it plays exactly as before. Pure rules: no Pixi, no DOM, no randomness.

import type { Relic, RelicEffects } from './relics';

/** What the fight reads from a set (carried on `Stage.relics.set`). Shares are of the hero's attack or health. */
export interface SetHooks {
  /** Heroes' blows set the foe burning: each tick is this share of the hero's attack. */
  burn?: number;
  /** The first blow a hero lands on each foe slows it for this many ms. */
  chill?: number;
  /** Every hero heals this share of its health each second. */
  regen?: number;
  /** A hero's crit makes the foe bleed: each tick is this share of the hero's attack. */
  bleed?: number;
}

export interface SetTier {
  /** What it gives, in a line for the page. */
  text: string;
  /** Plain numbers, folded with the relics' own. */
  fx?: RelicEffects;
  hooks?: SetHooks;
}

export interface RelicSet {
  id: string;
  name: string;
  /** The frame colour of its relics' icons. */
  colour: string;
  relics: readonly string[];
  two: SetTier;
  three: SetTier;
}

/** The relics the sets add (the rest of each set's pieces are the older relics, in `relics.ts`). Icons: `render/items.ts`. */
export const SET_RELICS: Record<string, Relic> = {
  emberRuby: { id: 'emberRuby', name: 'Ember Ruby', text: '+6% attack for every hero', effects: { atk: 1.06 } },
  dragonScale: { id: 'dragonScale', name: 'Dragon Scale', text: 'heroes take 4% less damage', effects: { guard: 0.04 } },
  frostSapphire: { id: 'frostSapphire', name: 'Frost Sapphire', text: 'skills charge 12% faster', effects: { charge: 1.12 } },
  winterCloak: { id: 'winterCloak', name: 'Winter Cloak', text: '+6% hp for every hero', effects: { hp: 1.06 } },
  holyChalice: { id: 'holyChalice', name: 'Holy Chalice', text: "the king's mana fills 15% faster", effects: { mana: 1.15 } },
  saintMedal: { id: 'saintMedal', name: "Saint's Medal", text: '+5% hp for every hero', effects: { hp: 1.05 } },
  shadowCloak: { id: 'shadowCloak', name: 'Shadow Cloak', text: 'heroes slip 5% of blows', effects: { dodge: 0.05 } },
  viperFang: { id: 'viperFang', name: 'Viper Fang', text: '+6% crit chance for every hero', effects: { crit: 0.06 } },
  wolfFang: { id: 'wolfFang', name: 'Wolf Fang', text: '+5% attack for every hero', effects: { atk: 1.05 } },
  beastHarness: { id: 'beastHarness', name: 'Beast Harness', text: 'heroes act and walk 5% faster', effects: { speed: 1.05 } },
};

export const SETS: Record<string, RelicSet> = {
  fire: {
    id: 'fire', name: 'Fire', colour: '#e8683a',
    relics: ['phoenix', 'warDrum', 'emberRuby', 'dragonScale'],
    two: { text: '+2% crit chance', fx: { crit: 0.02 } },
    three: { text: "heroes' blows set foes burning", hooks: { burn: 0.03 } },
  },
  frost: {
    id: 'frost', name: 'Frost', colour: '#6fc3f0',
    relics: ['ironShield', 'hourglass', 'frostSapphire', 'winterCloak'],
    two: { text: 'heroes take 2% less damage', fx: { guard: 0.02 } },
    three: { text: 'the first blow on each foe chills it', hooks: { chill: 1000 } },
  },
  holy: {
    id: 'holy', name: 'Holy', colour: '#f4d35e',
    relics: ['banner', 'scholarScroll', 'holyChalice', 'saintMedal'],
    two: { text: '+2% hp', fx: { hp: 1.02 } },
    three: { text: 'heroes heal 0.5% of their hp a second', hooks: { regen: 0.005 } },
  },
  shadow: {
    id: 'shadow', name: 'Shadow', colour: '#a77be0',
    relics: ['featherCharm', 'hawkEye', 'shadowCloak', 'viperFang'],
    two: { text: 'heroes slip 2% of blows', fx: { dodge: 0.02 } },
    three: { text: "+2% crit chance, and heroes' crits make foes bleed", fx: { crit: 0.02 }, hooks: { bleed: 0.02 } },
  },
  beast: {
    id: 'beast', name: 'Beast', colour: '#7bc96f',
    relics: ['whetstone', 'swiftBoots', 'wolfFang', 'beastHarness'],
    two: { text: 'heroes act and walk 2% faster', fx: { speed: 1.02 } },
    three: { text: '+2% attack and 1% faster still', fx: { atk: 1.02, speed: 1.01 } },
  },
};
export const SET_IDS = Object.keys(SETS);

/** The set a relic belongs to, if any. */
export const setOf = (relicId: string): RelicSet | undefined => SET_IDS.map((id) => SETS[id]).find((s) => s.relics.includes(relicId));

/** How many of a set's relics a run holds. */
export const setCount = (set: RelicSet, owned: readonly string[] = []): number => set.relics.filter((r) => owned.includes(r)).length;

/** The tiers of a set that a count has switched on (the two, then the three). */
export const tiersOn = (set: RelicSet, count: number): SetTier[] => [...(count >= 2 ? [set.two] : []), ...(count >= 3 ? [set.three] : [])];

/** What a run's sets give: plain numbers to fold with the relics', and the fight's hooks (each absent when no set is switched on). */
export function setBonus(owned: readonly string[] = []): { fx: RelicEffects; hooks: SetHooks } {
  const fx: RelicEffects = {};
  const hooks: SetHooks = {};
  const have = [...new Set(owned)];
  for (const id of SET_IDS) {
    for (const tier of tiersOn(SETS[id], setCount(SETS[id], have))) {
      const f = tier.fx;
      if (f) {
        for (const k of ['atk', 'hp', 'speed', 'charge', 'mana'] as const) if (f[k]) fx[k] = (fx[k] ?? 1) * f[k]!;
        for (const k of ['guard', 'dodge', 'crit'] as const) if (f[k]) fx[k] = (fx[k] ?? 0) + f[k]!;
      }
      Object.assign(hooks, tier.hooks);
    }
  }
  return { fx, hooks };
}
