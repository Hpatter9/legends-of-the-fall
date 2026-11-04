// Gear sets: the permanent equipment's bases grouped into themed sets (SEVEN-SLOT GEAR, docs/notes/gear-runes-design.md section 2):
// fourteen sets, five of seven pieces (one in every slot), four of six and five of five. A hero kind wearing two pieces of a set gets
// its small bonus, four its signature ability (the old three-piece tier, with the same ability), and the full set its set power, each
// tier keeping the ones below, as the tower's relic sets do (`relicSets.ts`). A bonus is plain stat numbers, folded into the kind's
// equipment stats like any piece's, and from the four-piece tier one of the signature abilities (`equipBases.ts`, run by `equipFx.ts`);
// the full set's power is a rule of its own (`setPowers.ts`). Only the bases count, whatever their grade. Pure rules: no Pixi, no DOM,
// no randomness.

import { ABILITIES, EQUIP_BASES, type Ability, type EquipSlot, type Main } from './equipBases';

export interface SetTier {
  /** What it gives, in a line for the page. */
  text: string;
  /** Stat numbers, as for an item's main stats (shares are 0.06 for +6%; `def` and `range` are flat). Not scaled by grade or level. */
  stats?: Main;
  /** A signature ability it switches on, and how strong (the same scale as a piece's: 0.45 at Epic to 0.7 at Mythic). */
  ability?: { id: string; s: number };
}

export interface GearSet {
  id: string;
  name: string;
  /** The frame colour of its bar on the panel. */
  colour: string;
  /** The bases in it (five to seven, one a slot). */
  pieces: readonly string[];
  two: SetTier;
  four: SetTier;
  /** The full set's tier: its set power (`setPowers.ts`), by name and id. */
  full: SetTier & { power: string; name: string };
}

/** The pieces a set's tiers need: two, four, and all of them. */
export const TIER_NEEDS = (set: GearSet): [number, number, number] => [2, 4, set.pieces.length];

export const GEAR_SETS: readonly GearSet[] = [
  { id: 'frost', name: 'Winter Court', colour: 'var(--b4)', pieces: ['frostCirclet', 'silkenRobe', 'frostbrand', 'frostMirror', 'frostBoots', 'frostSash', 'sapphireRing'],
    two: { text: '+8% skill charge', stats: { charge: 0.08 } }, four: { text: '+3% crit chance, and a crit freezes the foe', stats: { crit: 0.03 }, ability: { id: 'deepFreeze', s: 0.7 } },
    full: { name: 'Long Winter', power: 'longWinter', text: 'The first skill each fight freezes every foe within 2 tiles for 2s; a frozen foe struck by a crit shatters for 20% of its max hp (8% for a boss)' } },
  { id: 'storm', name: 'Stormcaller', colour: 'var(--p4)', pieces: ['stormHood', 'mageRobe', 'stormStaff', 'scryingOrb', 'stormBoots', 'stormGirdle', 'stormRing'],
    two: { text: '+10% skill charge', stats: { charge: 0.1 } }, four: { text: '+5% attack, and every 4th blow chains lightning', stats: { atk: 0.05 }, ability: { id: 'chainLightning', s: 0.55 } },
    full: { name: 'Eye of the Storm', power: 'eyeOfStorm', text: 'Chains leap to three more foes, each leap gives 4 skill charge, and skills charge 20% faster' } },
  { id: 'vanguard', name: 'Vanguard', colour: 'var(--s13)', pieces: ['vanguardHelm', 'plateCuirass', 'spikedMace', 'stoneIdol', 'vanguardGreaves', 'vanguardBelt', 'vanguardSignet'],
    two: { text: '+1 defence, +4% hp', stats: { def: 1, hp: 0.04 } }, four: { text: '+6% hp, and foes struck may be taunted', stats: { hp: 0.06 }, ability: { id: 'idolsGaze', s: 0.7 } },
    full: { name: 'Last Wall', power: 'lastWall', text: 'Blows aimed at an ally beside the wearer are taken by the wearer instead, at 40% less' } },
  { id: 'radiant', name: 'Radiant Order', colour: 'var(--e8)', pieces: ['radiantHalo', 'sunforgedAegis', 'runedBlade', 'healerLyre', 'radiantSandals', 'radiantCord', 'radiantAmulet'],
    two: { text: 'Mends 0.3% hp a second', stats: { regen: 0.003 } }, four: { text: '+5% hp, and an aura mends allies beside it', stats: { hp: 0.05 }, ability: { id: 'sunlightAura', s: 0.7 } },
    full: { name: 'Dawnbringer', power: 'dawnbringer', text: 'Once a fight, when an ally would fall, the wearer gives it a third of its own hp and both get a shield of 20% of max hp' } },
  { id: 'wyrm', name: 'Wyrmblood', colour: 'var(--e7)', pieces: ['wyrmHelm', 'dragonscaleMail', 'ashenSpear', 'wyrmShield', 'wyrmTalons', 'wyrmBelt', 'phoenixFeather'],
    two: { text: '+5% hp, +4% resist', stats: { hp: 0.05, resist: 0.04 } }, four: { text: '+4% attack, and the attackers burn', stats: { atk: 0.04 }, ability: { id: 'dragonsWrath', s: 0.55 } },
    full: { name: "Dragon's Heart", power: 'dragonsHeart', text: 'Below half hp the wearer turns draconic: +25% attack and a cone of fire on the foes ahead every 5s' } },
  { id: 'shadow', name: 'Nightblade', colour: 'var(--p3)', pieces: ['nightCowl', 'shadowcloak', 'vampireFang', 'nightDirk', 'nightTabi', 'relicShard'],
    two: { text: '+4% dodge', stats: { dodge: 0.04 } }, four: { text: '+4% attack speed, and blows heal', stats: { atkSpeed: 0.04 }, ability: { id: 'vampiricBite', s: 0.55 } },
    full: { name: 'Shadow Dance', power: 'shadowDance', text: 'After a kill the wearer steps unseen behind the furthest foe within 4 tiles and strikes a crit' } },
  { id: 'samurai', name: 'Shogun', colour: 'var(--r4)', pieces: ['shogunKabuto', 'lamellar', 'katana', 'warDrum', 'shogunObi', 'shogunSeal'],
    two: { text: '+4% attack, +3% hp', stats: { atk: 0.04, hp: 0.03 } }, four: { text: '+3% crit chance, and a crit makes the foe bleed', stats: { crit: 0.03 }, ability: { id: 'iaijutsu', s: 0.7 } },
    full: { name: 'Thousand Duels', power: 'thousandDuels', text: 'The wearer challenges the strongest foe it can reach and deals it 30% more' } },
  { id: 'grave', name: 'Gravewalker', colour: 'var(--g5)', pieces: ['boneArmour', 'reapersScythe', 'graveTotem', 'graveBoots', 'graveChain', 'rubyRing'],
    two: { text: '+4% attack, +4% resist', stats: { atk: 0.04, resist: 0.04 } }, four: { text: '+4% hp, and a kill heals', stats: { hp: 0.04 }, ability: { id: 'soulReaper', s: 0.7 } },
    full: { name: 'Army of the Dead', power: 'armyOfDead', text: 'A foe the wearer kills rises once as a skeleton fighting for the heroes for 8s (two at once at most)' } },
  { id: 'arcane', name: 'Scholar of Ash', colour: 'var(--b3)', pieces: ['ashMitre', 'sageVestments', 'grimoire', 'ashSlippers', 'scholarScroll', 'ashQuill'],
    two: { text: '+8% skill charge, +4% resist', stats: { charge: 0.08, resist: 0.04 } }, four: { text: '+5% skill charge, and the mind gathers charge', stats: { charge: 0.05 }, ability: { id: 'meditation', s: 0.7 } },
    full: { name: 'Echoing Word', power: 'echoingWord', text: 'Every third skill the wearer casts is cast again at half strength' } },
  { id: 'ember', name: 'Emberforged', colour: 'var(--e6)', pieces: ['emberRobe', 'dragonboneAxe', 'emberCenser', 'emberGirdle', 'emberAmulet'],
    two: { text: '+5% attack', stats: { atk: 0.05 } }, four: { text: '+4% attack, and blows set foes alight', stats: { atk: 0.04 }, ability: { id: 'dragonfire', s: 0.55 } },
    full: { name: 'Pyre Walker', power: 'pyreWalker', text: "The wearer's skills set the foes they hit burning, and burning foes take 20% more from the wearer" } },
  { id: 'hunter', name: "Hunter's Kit", colour: 'var(--g4)', pieces: ['seerSpectacles', 'rangerCloak', 'huntersBow', 'huntersQuiver', 'stalkerBoots'],
    two: { text: '+4% crit chance', stats: { crit: 0.04 } }, four: { text: 'Reach +1, and bleeding shots', stats: { range: 1 }, ability: { id: 'pinpoint', s: 0.7 } },
    full: { name: 'Wild Hunt', power: 'wildHunt', text: 'The first shot each fight marks the strongest foe; every hero deals it 20% more, and the mark passes on when it dies' } },
  { id: 'wind', name: 'Windrunner', colour: 'var(--b5)', pieces: ['windCap', 'leatherJerkin', 'bootsOfHaste', 'windSash', 'windFeather'],
    two: { text: '+6% move speed, +3% attack speed', stats: { moveSpeed: 0.06, atkSpeed: 0.03 } }, four: { text: '+3% attack speed, and haste at the start', stats: { atkSpeed: 0.03 }, ability: { id: 'sprint', s: 0.7 } },
    full: { name: 'Tailwind', power: 'tailwind', text: 'The wearer and allies beside it move 30% faster, and its first blow of a fight is a dash from up to 3 tiles away' } },
  { id: 'tide', name: 'Tidecaller', colour: 'var(--b6)', pieces: ['tideCrown', 'tideTrident', 'shellBuckler', 'tideBoots', 'tideSash'],
    two: { text: '+6% hp, +3% resist', stats: { hp: 0.06, resist: 0.03 } }, four: { text: '+4% attack, and blows slow', stats: { atk: 0.04 }, ability: { id: 'undertowThrust', s: 0.7 } },
    full: { name: 'Undertow', power: 'undertow', text: 'Blows pull the foe a tile towards the wearer; on water the wearer mends 2% hp a second' } },
  { id: 'peak', name: 'Peakwarden', colour: 'var(--s12)', pieces: ['peakHood', 'peakAxe', 'peakCrampons', 'peakRope', 'peakCharm'],
    two: { text: '+1 jump', stats: { jump: 1 } }, four: { text: '+5% hp, and every 5th blow stuns', stats: { hp: 0.05 }, ability: { id: 'avalanche', s: 0.7 } },
    full: { name: 'King of the Hill', power: 'kingOfHill', text: 'From higher ground every blow knocks the foe back a tile and stuns it for 0.5s' } },
];

export const SET_BY_ID: Readonly<Record<string, GearSet>> = Object.fromEntries(GEAR_SETS.map((s) => [s.id, s]));
/** The set a base belongs to, if any (a base is in at most one set). */
export const SET_OF_BASE: Readonly<Record<string, GearSet>> = Object.fromEntries(GEAR_SETS.flatMap((s) => s.pieces.map((p) => [p, s] as const)));

/** The slot of each piece of a set, in the order of `pieces`. */
export const slotsOf = (set: GearSet): EquipSlot[] => set.pieces.map((p) => EQUIP_BASES[p].slot);

/** How many pieces of each set these bases make (only sets with at least one). */
export function setCounts(bases: readonly string[]): Map<GearSet, number> {
  const out = new Map<GearSet, number>();
  for (const b of new Set(bases)) {
    const s = SET_OF_BASE[b];
    if (s) out.set(s, (out.get(s) ?? 0) + 1);
  }
  return out;
}

/** The tiers a count of pieces switches on (the two, the four with it, and the full set with both). */
export function activeTiers(set: GearSet, count: number): SetTier[] {
  const [, four, full] = TIER_NEEDS(set);
  return [...(count >= 2 ? [set.two] : []), ...(count >= four ? [set.four] : []), ...(count >= full ? [set.full] : [])];
}

/** The full-set powers these bases switch on (`setPowers.ts` runs them). */
export function setPowers(bases: readonly string[]): string[] {
  return [...setCounts(bases)].filter(([set, n]) => n >= set.pieces.length).map(([set]) => set.full.power);
}

export interface SetBonus {
  stats: Main;
  abilities: { id: string; name: string; s: number }[];
  /** The sets that give something, with how many pieces are worn. */
  active: { set: GearSet; count: number }[];
}

/** What wearing these bases gives: the stats and abilities of every set tier switched on. */
export function setBonus(bases: readonly string[]): SetBonus {
  const out: SetBonus = { stats: {}, abilities: [], active: [] };
  for (const [set, count] of setCounts(bases)) {
    const tiers = activeTiers(set, count);
    if (!tiers.length) continue;
    out.active.push({ set, count });
    for (const t of tiers) {
      for (const [k, v] of Object.entries(t.stats ?? {}) as [keyof Main, number][]) out.stats[k] = (out.stats[k] ?? 0) + v;
      if (t.ability) out.abilities.push({ id: t.ability.id, name: (ABILITIES[t.ability.id] as Ability).name, s: t.ability.s });
    }
  }
  return out;
}
