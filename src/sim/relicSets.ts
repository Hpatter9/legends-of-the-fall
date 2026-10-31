// Relic sets: the keep's own relics grouped into its six Chapters (RELICS-2: The Founding, The Long Winter, The Burning, The Night Watch,
// The Hunt, The Treasury), and the Calamity's five sets. Owning two of a set gives a small bonus and three a strong one (the three keeps
// the two's); the Unfinished Chronicle counts one more for each set begun. A bonus is either plain numbers, folded into the relics' effects like any relic's, or a small
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
  /** A Chapter of the keep's history (1 to 6), and its line of story; absent for the Calamity's sets. */
  chapter?: number;
  story?: string;
  two: SetTier;
  three: SetTier;
}

/** The relics the Calamity's sets add (the keep's own relics, the Chapters' pieces, are in `relics.ts`). Icons: `render/items.ts`. */
export const SET_RELICS: Record<string, Relic> = {
  // (the Calamity's sets: every piece is its own, so a set is begun, not finished, by the keep's relics)
  thunderHorn: { id: 'thunderHorn', name: 'Thunder Horn', text: 'heroes act and walk 5% faster', rarity: 'common', effects: { speed: 1.05 } },
  cloudTreads: { id: 'cloudTreads', name: 'Cloud Treads', text: 'heroes slip 4% of blows', rarity: 'common', effects: { dodge: 0.04 } },
  thunderPendant: { id: 'thunderPendant', name: 'Thunder Pendant', text: 'skills charge 10% faster', rarity: 'common', effects: { charge: 1.1 } },
  tempestRing: { id: 'tempestRing', name: 'Tempest Ring', text: '+5% crit chance for every hero', rarity: 'common', effects: { crit: 0.05 } },
  graniteHeart: { id: 'graniteHeart', name: 'Granite Heart', text: '+7% hp for every hero', rarity: 'common', effects: { hp: 1.07 } },
  mossAmulet: { id: 'mossAmulet', name: 'Moss Amulet', text: '+4% hp for every hero, and they take 2% less damage', rarity: 'common', effects: { hp: 1.04, guard: 0.02 } },
  stoneGauntlet: { id: 'stoneGauntlet', name: 'Stone Gauntlet', text: 'heroes take 5% less damage', rarity: 'common', effects: { guard: 0.05 } },
  earthenBell: { id: 'earthenBell', name: 'Earthen Bell', text: '+5% hp for every hero', rarity: 'common', effects: { hp: 1.05 } },
  bloodVial: { id: 'bloodVial', name: 'Blood Vial', text: '+6% attack for every hero', rarity: 'common', effects: { atk: 1.06 } },
  bloodstoneRing: { id: 'bloodstoneRing', name: 'Bloodstone Ring', text: '+5% crit chance for every hero', rarity: 'common', effects: { crit: 0.05 } },
  reaverHelm: { id: 'reaverHelm', name: 'Reaver Helm', text: '+5% attack for every hero', rarity: 'common', effects: { atk: 1.05 } },
  rubyLocket: { id: 'rubyLocket', name: 'Ruby Locket', text: '+4% attack and +3% crit chance for every hero', rarity: 'common', effects: { atk: 1.04, crit: 0.03 } },
  starChart: { id: 'starChart', name: 'Star Chart', text: "the king's mana fills 12% faster", rarity: 'common', effects: { mana: 1.12 } },
  cometShard: { id: 'cometShard', name: 'Comet Shard', text: 'skills charge 10% faster', rarity: 'common', effects: { charge: 1.1 } },
  moonLantern: { id: 'moonLantern', name: 'Moon Lantern', text: 'shooters reach further from high ground', rarity: 'common', effects: { reach: 0.2 } },
  astralCirclet: { id: 'astralCirclet', name: 'Astral Circlet', text: "the king's mana fills 8% faster, and skills charge 6% faster", rarity: 'common', effects: { mana: 1.08, charge: 1.06 } },
  riftShard: { id: 'riftShard', name: 'Rift Shard', text: '+6% attack for every hero', rarity: 'common', effects: { atk: 1.06 } },
  voidSigil: { id: 'voidSigil', name: 'Void Sigil', text: 'skills charge 10% faster', rarity: 'common', effects: { charge: 1.1 } },
  doomHelm: { id: 'doomHelm', name: 'Doom Helm', text: 'heroes take 4% less damage, and the foes wait half a second', rarity: 'common', effects: { guard: 0.04, first: 500 } },
  lastLight: { id: 'lastLight', name: 'Last Light', text: '+5% hp for every hero, and the foes wait half a second', rarity: 'common', effects: { hp: 1.05, first: 500 } },
};

/** The six Chapters of the keep's history: each four of the keep's own relics, in the order the page lists them. The two and three bonuses are
 *  the old tower sets' (they were tuned); the Treasury's are the old Fortune set's. */
export const SETS: Record<string, RelicSet> = {
  holy: {
    id: 'holy', name: 'The Founding', colour: 'var(--e8)', chapter: 1,
    story: 'Before the walls there was a hill, a banner and nine stubborn people.',
    relics: ['banner', 'scholarScroll', 'holyChalice', 'saintMedal'],
    two: { text: '+2% hp', fx: { hp: 1.02 } },
    three: { text: 'heroes heal 0.5% of their hp a second', hooks: { regen: 0.005 } },
  },
  frost: {
    id: 'frost', name: 'The Long Winter', colour: 'var(--b4)', chapter: 2,
    story: 'The winter the gate froze shut, and the keep lived on what was in the cellar and what came over the wall.',
    relics: ['ironShield', 'hourglass', 'frostSapphire', 'winterCloak'],
    two: { text: 'heroes take 2% less damage', fx: { guard: 0.02 } },
    three: { text: 'the first blow on each foe chills it', hooks: { chill: 1000 } },
  },
  fire: {
    id: 'fire', name: 'The Burning', colour: 'var(--e6)', chapter: 3,
    story: 'The night the Infernal Host reached the inner hall, and the hall was the thing that burned.',
    relics: ['phoenix', 'warDrum', 'emberRuby', 'dragonScale'],
    two: { text: '+2% crit chance', fx: { crit: 0.02 } },
    three: { text: "heroes' blows set foes burning", hooks: { burn: 0.03 } },
  },
  shadow: {
    id: 'shadow', name: 'The Night Watch', colour: 'var(--p4)', chapter: 4,
    story: 'The years the Yokai walked the walls after dark, and the watch learned to walk quieter.',
    relics: ['featherCharm', 'hawkEye', 'shadowCloak', 'viperFang'],
    two: { text: 'heroes slip 2% of blows', fx: { dodge: 0.02 } },
    three: { text: "+2% crit chance, and heroes' crits make foes bleed", fx: { crit: 0.02 }, hooks: { bleed: 0.02 } },
  },
  beast: {
    id: 'beast', name: 'The Hunt', colour: 'var(--g4)', chapter: 5,
    story: 'When the Beast Packs came down from the hills every autumn, and the keep went out to meet them.',
    relics: ['whetstone', 'swiftBoots', 'wolfFang', 'beastHarness'],
    two: { text: 'heroes act and walk 2% faster', fx: { speed: 1.02 } },
    three: { text: '+2% attack and 1% faster still', fx: { atk: 1.02, speed: 1.01 } },
  },
  fortune: {
    id: 'fortune', name: 'The Treasury', colour: 'var(--e9)', chapter: 6,
    story: "What the keep kept when it could, and what it pawned when it couldn't.",
    relics: ['luckyCoin', 'gildedIngot', 'jewelCrown', 'spyglass'],
    two: { text: '+6 gold for every win', fx: { gold: 6 } },
    three: { text: '+10 gold for every win, and +3% hp', fx: { gold: 10, hp: 1.03 } },
  },
};
// (the Calamity's five sets: each one a theme, its two pieces a small bonus and its three a strong one; the sixth, Fortune, is now the
// Treasury chapter above)
Object.assign(SETS, {
  storm: {
    id: 'storm', name: 'Storm', colour: 'var(--b2)',
    relics: ['thunderHorn', 'cloudTreads', 'thunderPendant', 'tempestRing'],
    two: { text: 'heroes act and walk 3% faster', fx: { speed: 1.03 } },
    three: { text: 'skills charge 15% faster, and +3% crit chance', fx: { charge: 1.15, crit: 0.03 } },
  },
  earth: {
    id: 'earth', name: 'Earth', colour: 'var(--g2)',
    relics: ['graniteHeart', 'mossAmulet', 'stoneGauntlet', 'earthenBell'],
    two: { text: '+3% hp', fx: { hp: 1.03 } },
    three: { text: 'heroes take 4% less damage, and +4% hp', fx: { guard: 0.04, hp: 1.04 } },
  },
  blood: {
    id: 'blood', name: 'Blood', colour: 'var(--r4)',
    relics: ['bloodVial', 'bloodstoneRing', 'reaverHelm', 'rubyLocket'],
    two: { text: '+3% attack', fx: { atk: 1.03 } },
    three: { text: '+4% attack and +4% crit chance', fx: { atk: 1.04, crit: 0.04 } },
  },
  star: {
    id: 'star', name: 'Star', colour: 'var(--b6)',
    relics: ['starChart', 'cometShard', 'moonLantern', 'astralCirclet'],
    two: { text: "the king's mana fills 8% faster", fx: { mana: 1.08 } },
    three: { text: "skills charge 12% faster, and the king's mana 10%", fx: { charge: 1.12, mana: 1.1 } },
  },
  rift: {
    id: 'rift', name: 'Rift', colour: 'var(--p2)',
    relics: ['riftShard', 'voidSigil', 'doomHelm', 'lastLight'],
    two: { text: 'the foes wait a third of a second at the start', fx: { first: 300 } },
    three: { text: 'the foes wait half a second more, and +3% attack', fx: { first: 500, atk: 1.03 } },
  },
} satisfies Record<string, RelicSet>);
export const SET_IDS = Object.keys(SETS);

/** The set a relic belongs to, if any. */
export const setOf = (relicId: string): RelicSet | undefined => SET_IDS.map((id) => SETS[id]).find((s) => s.relics.includes(relicId));

/** How many of a set's relics a run holds, as its bonuses count them: the Unfinished Chronicle (a Storied relic) counts one more for a set begun. */
export const setCount = (set: RelicSet, owned: readonly string[] = []): number => {
  const n = set.relics.filter((r) => owned.includes(r)).length;
  return n && owned.includes('unfinishedChronicle') ? Math.min(set.relics.length, n + 1) : n;
};
/** The chapters of the keep, in order. */
export const CHAPTER_IDS = Object.keys(SETS).filter((id) => SETS[id].chapter).sort((a, b) => SETS[a].chapter! - SETS[b].chapter!);

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
        for (const k of ['guard', 'dodge', 'crit', 'reach', 'first', 'gold'] as const) if (f[k]) fx[k] = (fx[k] ?? 0) + f[k]!;
      }
      Object.assign(hooks, tier.hooks);
    }
  }
  return { fx, hooks };
}
