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
  /** The Eidolons whose bound echo is on (a whole reliquary held): the War Horn fills faster and their riders last longer. */
  echo?: string[];
}

export interface SetTier {
  /** What it gives, in a line for the page. */
  text: string;
  /** Plain numbers, folded with the relics' own. */
  fx?: RelicEffects;
  hooks?: SetHooks;
  /** The three of an Eidolon's reliquary: the bound echo (its Eidolon is the set's). */
  echo?: boolean;
}

export interface RelicSet {
  id: string;
  name: string;
  /** The frame colour of its relics' icons. */
  colour: string;
  relics: readonly string[];
  /** A Chapter of the keep's history (1 to 6); absent for an Eidolon's reliquary. */
  chapter?: number;
  /** Its line of story. */
  story?: string;
  /** An Eidolon's reliquary (RELICS-3): the Eidolon whose bound echo its three give. */
  eidolon?: string;
  two: SetTier;
  three: SetTier;
}

/** The Eidolons' relics (RELICS-3): three things each great being left in the world, found only in the Calamity. Icons: `render/items.ts`.
 *  Several rules are fight hooks (`RelicHooks`, `relicFight.ts`); the lore is for the relic card. */
const e = (id: string, name: string, lore: string, text: string, effects: Relic['effects'], more: Partial<Relic> = {}): Relic => ({ id, name, lore, text, effects, rarity: 'eidolon', ...more });
export const SET_RELICS: Record<string, Relic> = {
  // ---- Askel, the Cinderhound
  cinderCollar: e('cinderCollar', 'Cinder Collar', 'It never fitted him. He wore it anyway.', '+10% attack for every hero', { atk: 1.1, hooks: { healLess: 0.2 } }, { price: 'heroes heal 20% less' }),
  ashTooth: e('ashTooth', "Hound's Ash-Tooth", 'Lost in a fight with something larger. He won.', "a hero's kill gives it +3% attack for the rest of the fight (to +15%)", { hooks: { killAtk: { v: 0.03, max: 0.15 } } }),
  emberBrand: e('emberBrand', 'Ember Brand', 'Where Askel lay down, the ground kept the shape.', '+5% crit chance; crits leave the foe burning', { crit: 0.05, hooks: { critBurn: 0.03 } }),
  // ---- Nivra, the Rime Wyrm
  rimePearl: e('rimePearl', 'Rime Pearl', 'It forms in her throat once a century. She coughs.', 'foes that strike a hero are slowed 10% for 2 seconds', { hooks: { foeSlow: { v: 0.1, ms: 2000 } } }),
  wyrmVial: e('wyrmVial', "Wyrm's Breath Vial", 'Do not open indoors.', 'skills charge 10% faster; the first skill each fight freezes its target for a second', { charge: 1.1, hooks: { firstFreeze: 1000 } }),
  glacierStep: e('glacierStep', 'Glacier Step', 'Her tracks, kept in ice, from when she still walked.', 'heroes slip 4% of blows, 10% while they stand still', { dodge: 0.04, hooks: { stillDodge: 0.06 } }),
  // ---- Aurelan, the Lion of Dawn
  maneThread: e('maneThread', 'Mane-Gold Thread', 'One hair, and enough to sew a banner with.', '+6% hp; the first hero to drop under a quarter health heals 25% (once a fight)', { hp: 1.06, hooks: { rescue: { under: 0.25, heal: 0.25 } } }),
  dawnChart: e('dawnChart', 'The Dawn Chart', 'Where the sun rose on the day he first spoke.', "the king's mana fills 12% faster", { mana: 1.12 }),
  oathRing: e('oathRing', "Lion's Oath-Ring", 'Whoever wears it cannot lie. It is rarely worn.', 'heroes heal 3% of their health whenever a foe falls', { hooks: { killHeal: 0.03 } }),
  // ---- Voltara, the Copper Goddess
  thunderHorn: e('thunderHorn', 'Thunder Horn', "Her herald's. It only plays one note, and it is loud.", 'heroes act and walk 6% faster', { speed: 1.06 }),
  copperTorc: e('copperTorc', 'Copper Torc', 'Struck by lightning every hour, on the hour.', 'skills charge 12% faster', { charge: 1.12, hp: 0.97 }, { price: 'heroes have 3% less hp' }),
  tempestRing: e('tempestRing', 'Tempest Ring', 'Small, and humming.', '+6% crit chance; every tenth blow strikes a second foe nearby', { crit: 0.06, hooks: { echoEvery: 10 } }),
  // ---- Gorm, the Quarry Titan
  graniteHeart: e('graniteHeart', 'Granite Heart', 'It beats once a day, which is plenty.', '+10% hp for every hero', { hp: 1.1, speed: 0.97 }, { price: 'heroes act and walk 3% slower' }),
  quarryGauntlet: e('quarryGauntlet', 'Quarry Gauntlet', "He wore it to dig the keep's first foundation.", 'heroes take 6% less damage; 12% for heroes who have not moved this fight', { guard: 0.06, hooks: { stillGuard: 0.06 } }),
  mossBell: e('mossBell', 'Moss Bell', 'Rung once, it has been ringing slowly ever since.', 'heroes heal 0.4% of their health a second', { hooks: { regen: 0.004 } }),
  // ---- Vaelkhar, the Dragon King
  voidShard: e('voidShard', 'Void Shard', 'A splinter of the sky he flew through to get here.', "+6% attack; +12% against the Calamity's guardians", { atk: 1.06, hooks: { guardianAtk: 0.12 } }),
  dragonSigil: e('dragonSigil', "Dragon-King's Sigil", 'His seal, on a letter the keep never answered.', 'skills charge 10% faster; ultimates charge 10% faster too', { charge: 1.1, hooks: { ultPace: 0.1 } }),
  doomHelm: e('doomHelm', 'Doom Helm', 'Made for his rider. He has never let anyone ride him.', 'heroes take 4% less damage, and the foes wait half a second', { guard: 0.04, first: 500 }),
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
// (the Eidolons' six reliquaries, RELICS-3: three relics each, the Calamity only. Two give a small bonus in the Eidolon's element; all three
// give the bound echo: while that Eidolon answers the War Horn, the horn fills 25% faster this run and its rider lasts half as long again)
const echo = (name: string): SetTier => ({ echo: true, text: `the bound echo: while ${name} answers the War Horn, it fills 25% faster, and ${name}'s rider lasts half as long again` });
Object.assign(SETS, {
  askel: {
    id: 'askel', name: "Askel's Reliquary", colour: 'var(--e6)', eidolon: 'askel', relics: ['cinderCollar', 'ashTooth', 'emberBrand'],
    story: 'Three things the Cinderhound left where he lay.',
    two: { text: '+3% attack', fx: { atk: 1.03 } }, three: echo('Askel'),
  },
  nivra: {
    id: 'nivra', name: "Nivra's Reliquary", colour: 'var(--b4)', eidolon: 'nivra', relics: ['rimePearl', 'wyrmVial', 'glacierStep'],
    story: 'What the Rime Wyrm shed, coughed up and walked away from.',
    two: { text: 'heroes take 3% less damage', fx: { guard: 0.03 } }, three: echo('Nivra'),
  },
  aurelan: {
    id: 'aurelan', name: "Aurelan's Reliquary", colour: 'var(--e9)', eidolon: 'aurelan', relics: ['maneThread', 'dawnChart', 'oathRing'],
    story: 'The Lion of Dawn kept nothing, and the keep kept all of it.',
    two: { text: '+3% hp', fx: { hp: 1.03 } }, three: echo('Aurelan'),
  },
  voltara: {
    id: 'voltara', name: "Voltara's Reliquary", colour: 'var(--b2)', eidolon: 'voltara', relics: ['thunderHorn', 'copperTorc', 'tempestRing'],
    story: 'Struck by the Copper Goddess, and still humming.',
    two: { text: 'heroes act and walk 3% faster', fx: { speed: 1.03 } }, three: echo('Voltara'),
  },
  gorm: {
    id: 'gorm', name: "Gorm's Reliquary", colour: 'var(--g2)', eidolon: 'gorm', relics: ['graniteHeart', 'quarryGauntlet', 'mossBell'],
    story: 'The Quarry Titan built the keep and forgot to say so.',
    two: { text: '+3% hp', fx: { hp: 1.03 } }, three: echo('Gorm'),
  },
  vaelkhar: {
    id: 'vaelkhar', name: "Vaelkhar's Reliquary", colour: 'var(--p2)', eidolon: 'vaelkhar', relics: ['voidShard', 'dragonSigil', 'doomHelm'],
    story: 'The Dragon King came as a guest and left his things.',
    two: { text: 'the foes wait a third of a second at the start', fx: { first: 300 } }, three: echo('Vaelkhar'),
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
      if (tier.echo && SETS[id].eidolon) (hooks.echo ??= []).push(SETS[id].eidolon!);
    }
  }
  return { fx, hooks };
}

/** The bound echo's gifts: the horn fills this much faster, and the rider lasts this much longer. */
export const ECHO_FILL = 1.25;
export const ECHO_RIDER = 1.5;
/** Whether a run holds the whole reliquary of an Eidolon (the Unfinished Chronicle counting one more), so its bound echo is on. */
export const echoOn = (owned: readonly string[] | undefined, eidolon: string | undefined): boolean => !!eidolon && !!owned && SET_IDS.some((id) => SETS[id].eidolon === eidolon && setCount(SETS[id], owned) >= 3);
/** How much faster the War Horn fills for a run whose chosen Eidolon is `eidolon`. */
export const hornEcho = (owned: readonly string[] | undefined, eidolon: string | undefined): number => (echoOn(owned, eidolon) ? ECHO_FILL : 1);
