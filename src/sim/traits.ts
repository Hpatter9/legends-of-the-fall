// Hero synergies, auto-chess style: every hero has two traits (an origin and a class). Placing different heroes of a
// trait on the board wakes the trait's perks: one at 2 of them, the next at 3 and its signature at 4 (TRAIT-PERKS,
// docs/notes/trait-perks.md). Only distinct kinds count, so two Knights are one Knight. The perks' rules are
// `traitPerks.ts`'s; the few that are an old team bonus (the wisps, the Aegis, the decoy log, the bats, the reach)
// are still fixed as the fight starts (`fight` calls `traitEffects`) and read by their hooks.
//
// Pure rules: no Pixi, no DOM, no randomness.

import { UNITS } from './units';

/** What a team's active traits give every hero on it. Each is a plain multiplier or share, absent meaning none. */
export interface TraitEffects {
  /** Multiplies attack. */
  atk?: number;
  /** Multiplies health. */
  hp?: number;
  /** Damage taken is cut by this share. */
  guard?: number;
  /** The share of blows slipped. */
  dodge?: number;
  /** Added to the chance of a crit (x1.5 when the hero has no crit of its own). */
  crit?: number;
  /** Multiplies how fast heroes act and walk. */
  speed?: number;
  /** Multiplies how fast pools refill with time. */
  charge?: number;
  /** Multiplies how fast the king's mana fills. */
  mana?: number;
  /** Shooters gain this much reach per step of height above the target. */
  reach?: number;
  /** Trickster milestone (three Tricksters): a blow that leaves a Trickster under 25% health leaves a decoy log, and it slips aside. */
  tricksterLog?: boolean;
  /** Yokai milestone (three Yokai): dodging a blow leaves a spirit wisp trap on the tile, hurting the foe that steps on it. */
  yokaiWisp?: boolean;
  /** Guardian milestone (three Guardians): an emergency Aegis shield the first time a hero drops below 30% health. */
  guardianShield?: boolean;
  /** The share of the damage a hero's blows deal that it drinks back as health (the Vampires). */
  leech?: number;
  /** Vampire milestone (five Vampires): a Vampire brought below 30% health bursts into bats, mends and slips away, once a fight. */
  vampireSwarm?: boolean;
}

export interface TraitTier {
  /** Different heroes of the trait needed. */
  need: number;
  /** The tier's perk (TRAIT-PERKS, `traitPerks.ts`): its name, which the page shows beside the count. */
  name: string;
  /** The old team bonuses a perk is made of, where one already had a hook (the Vampires' leech, the Marksmen's reach...). Most perks have
   *  none: their rules are `traitPerks.ts`'s, read from the tier reached. */
  effects: TraitEffects;
  /** The tier's line for the badge. */
  text: string;
  /** The tier's whole rule, for the trait's card. */
  rule: string;
}

export interface Trait {
  id: string;
  name: string;
  kind: 'origin' | 'class';
  /** Two or three letters for a small badge. */
  short: string;
  tiers: TraitTier[];
}

/** One tier: its need, name, badge line, rule and any old bonus it carries. */
const tier = (need: number, name: string, text: string, rule: string, effects: TraitEffects = {}): TraitTier => ({ need, name, effects, text, rule });
/** A trait with the three tiers of TRAIT-PERKS, at 2, 3 and 4 heroes (the owner's ladder). */
const trait = (id: string, name: string, kind: Trait['kind'], short: string, tiers: [TraitTier, TraitTier, TraitTier]): Trait => ({ id, name, kind, short, tiers });

// TRAIT-PERKS (the owner's ask: "I want them to really matter. be unique and give amazing and varied buffs"; docs/notes/trait-perks.md):
// every trait's three tiers, each a rule of its own (`traitPerks.ts` runs them). Each tier keeps the ones below it.
export const TRAITS: Record<string, Trait> = {
  undead: trait('undead', 'Undead', 'origin', 'Un', [
    tier(2, "Death's Door", 'Each Undead cheats death once a wave', 'The first blow each wave that would fell an Undead hero leaves it on 1 health instead, and nothing can hurt it for a second.'),
    tier(3, 'Grave Rot', 'Foes slain near the Undead burst in rot', 'A foe slain within 2 tiles of an Undead hero bursts: every foe within a tile of it is poisoned.'),
    tier(4, 'Rise from the Grave', 'Three skeletons rise to fight each wave', 'At each wave\'s start three skeletons claw up beside the Undead: a warrior, a spearman and an archer. One that falls stays down until the wave ends; then all three rise again. They never cost a life.'),
  ]),
  samurai: trait('samurai', 'Samurai', 'origin', 'Sa', [
    tier(2, 'Iaijutsu', 'First cut of each wave: a keen crit', "Each Samurai's first blow of a wave that lands is a crit (15% more)."),
    tier(3, 'Way of the Duel', 'A lone duel won quickens the Samurai', 'A Samurai that fells a foe it fought alone (no other hero beside the foe) gains a second of haste.'),
    tier(4, 'Death Poem', 'The first Samurai to fall fights on, unkillable', 'The first Samurai to fall each wave fights on at 1 health for two and a half seconds: nothing can hurt it and it deals 15% more. Then it falls, unless a heal has lifted it above a quarter of its health.'),
  ]),
  mystic: trait('mystic', 'Mystic', 'origin', 'My', [
    tier(2, 'Ley Lines', "King's spells cost a quarter less", "The king's spells cost a quarter less mana."),
    tier(3, 'Echo', "Each king's spell echoes at 30%", "Every king's spell (but those that call or raise) echoes 1.5 seconds later on the same spot at 30% of its strength."),
    tier(4, 'Conflux', 'Every fourth spell is free, and cast twice', "Every fourth king's spell of a fight is free, and lands a second time at full strength."),
  ]),
  yokai: trait('yokai', 'Yokai', 'origin', 'Yo', [
    tier(2, "Will-o'-Wisps", 'Yokai slip 8% of blows and leave wisps', 'Yokai slip 8% of blows, and a Yokai that slips one leaves a spirit wisp on its tile that hurts the foe who steps on it.', { dodge: 0.08, yokaiWisp: true }),
    tier(3, 'Foxfire Twin', 'A Yokai brought low splits in two', 'Once a wave, a Yokai brought below 40% health splits: a foxfire twin with a quarter of its health and half its attack stands beside it for 10 seconds and draws blows.', { dodge: 0.08, yokaiWisp: true }),
    tier(4, 'Night Parade', 'Each wave opens in spirit dusk', 'Each wave opens in spirit dusk for 5 seconds: the foes walk and act 15% slower, and every foe slain in the dusk leaves a wisp where it fell.', { dodge: 0.08, yokaiWisp: true }),
  ]),
  knightly: trait('knightly', 'Knightly', 'origin', 'Kn', [
    tier(2, 'Shield Wall', '10% less damage shoulder to shoulder', 'A Knightly hero with a friend on a tile beside it takes 10% less damage.'),
    tier(3, 'Oath of Protection', 'Knights take blows for the badly hurt', 'A blow on a hero below 30% health is taken instead by the nearest Knightly hero within 2 tiles (each knight once every 6 seconds).'),
    tier(4, "The Order's Standard", 'A standard is planted each wave: +15%, -10%', "At each wave's start the Order plants its standard among the party. Friends within 2 tiles of it deal 15% more, take 10% less and mend 1% of their health a second while it stands."),
  ]),
  holy: trait('holy', 'Holy', 'origin', 'Ho', [
    tier(2, 'Blessing', 'Healing is 15% stronger', 'Every heal on a hero is 15% stronger.'),
    tier(3, 'Consecrated Ground', 'Holy ground mends friends and burns foes', "At each wave's start the ground round each Holy hero is hallowed: a hero on it mends 1% of its health a second, and a foe on it is burnt by the light."),
    tier(4, 'Resurrection', 'Once a wave, the first to fall rises at once, free', 'Once a wave, the first hero to fall is raised by light at once, at a fifth of its health, and no life is spent.'),
  ]),
  wild: trait('wild', 'Wild', 'origin', 'Wi', [
    tier(2, 'Bloodscent', '+8% damage to wounded foes', 'Every hero deals 8% more to a foe below half its health.'),
    tier(3, 'Frenzy', 'Every Wild kill quickens the party, to +40%', 'Each kill by a Wild hero makes the whole party act 4% faster for the rest of the wave, up to 40%.'),
    tier(4, 'Stampede', "A stampede tramples the foes' thickest file", "3 seconds into each wave, and every 20 seconds after, a stampede thunders down the file with the most foes: each foe in it is trampled for more than the party's might and knocked back a tile."),
  ]),
  arcane: trait('arcane', 'Arcane', 'origin', 'Ar', [
    tier(2, 'Flux', "Each skill tops up a friend's pool 10%", 'When a hero casts a skill, the friend with the emptiest pool gains a tenth of a pool.'),
    tier(3, 'Spell Weave', 'Three skills in 3 s: an arcane burst', "When three skills are cast within 3 seconds, an arcane burst strikes round the third one's nearest foe for one and a half times the party's might."),
    tier(4, 'Overload', 'Ultimates start 30% fuller, refund a quarter', 'Every ultimate meter starts each wave 30% fuller, and casting an ultimate gives a quarter of the meter back.'),
  ]),
  frontier: trait('frontier', 'Frontier', 'origin', 'Fr', [
    tier(2, 'Trailblazers', 'The party moves quicker, over rough ground unslowed', 'Heroes act and walk 4% faster, are not slowed by mud, tall grass, water or snow, and are not held by the field\'s snares.'),
    tier(3, 'Ambush', "Three snares laid in the foes' path each wave", "At each wave's start three snares are laid on the tiles the foes nearest the party will step on."),
    tier(4, 'Wanted', 'The toughest foe is Wanted: +40% against it', "The wave's toughest foe is marked Wanted: heroes deal 40% more to it, and when it falls every hero gains 4 seconds of haste and mends 10%."),
  ]),
  machine: trait('machine', 'Machine', 'origin', 'Ma', [
    tier(2, 'Plating', 'Machines start each wave shielded', 'Each Machine starts each wave behind a shield of a tenth of its health.'),
    tier(3, 'Self-Destruct', 'A fallen Machine explodes', 'A Machine that falls explodes: every foe within a tile takes half as much again as its attack.'),
    tier(4, 'Sentry Network', 'Two sentry turrets deploy each wave', "At each wave's start two sentry turrets unfold beside the party: they stand, and shoot with a fifth of the party's might. Rebuilt each wave; they never cost a life."),
  ]),
  royal: trait('royal', 'Royal', 'origin', 'Ro', [
    tier(2, 'The Crown', 'The strongest is crowned: +10%', 'The hero with the most attack wears the crown: 10% more attack and health. When it falls, the crown passes to the strongest standing.'),
    tier(3, 'Tribute', "The crown's kills mend the party", "Each kill by the crowned hero mends every hero 4% of its health."),
    tier(4, "Regicide's Price", "The crown's fall stuns all; the heir's ult fills", "When a crowned hero falls, every foe is stunned for a second and a half and the heir who takes the crown has its ultimate filled."),
  ]),
  pirate: trait('pirate', 'Pirate', 'origin', 'Pi', [
    tier(2, 'Plunder', 'Pirate kills drop extra gold', "Each foe a Pirate slays drops a gold piece for the run."),
    tier(3, 'Sea Legs', 'The party walks water; the tide slows the foes', "The party walks water as dry ground, and Pirates take 20% less on it. At each wave's start the tide floods three tiles under the foes' front."),
    tier(4, 'Broadside', 'Every 12 s a broadside rakes the foes', "5 seconds into each wave, and every 12 seconds after, a ghost ship's broadside rakes the three files with the most foes in their middle: each foe in them takes twice the party's might and burns."),
  ]),
  vampire: trait('vampire', 'Vampire', 'origin', 'Vm', [
    tier(2, 'Thirst', 'Vampires drink 8% of what they deal', 'A Vampire drinks back 8% of the damage it deals.'),
    tier(3, 'Swarm', 'A Vampire brought low bursts into bats', 'Once a wave, a Vampire brought below 30% health bursts into bats, mends 15% and comes together away from the foes.', { vampireSwarm: true }),
    tier(4, 'Blood Thralls', 'The first two foes slain rise as your thralls', 'The first two foes slain each wave rise as blood thralls with a third of their health and half their bite, and fight for the party until the wave ends. Bosses and nemeses do not rise.', { vampireSwarm: true }),
  ]),
  guardian: trait('guardian', 'Guardian', 'class', 'Gu', [
    tier(2, 'Challenge', 'Foes beside a Guardian must strike it', 'A foe beside a Guardian must strike a Guardian, and the Guardians take 7% less damage.'),
    tier(3, 'Aegis', 'An Aegis covers each hero once a wave', 'The first time each hero drops below 30% health in a wave, an Aegis shield of 15% of its health covers it for 5 seconds.', { guardianShield: true }),
    tier(4, 'Bastion', 'Guardians side by side turn back blows', 'A Guardian with another Guardian beside it turns 8% of each blow back on whoever struck it.', { guardianShield: true }),
  ]),
  blade: trait('blade', 'Blade', 'class', 'Bl', [
    tier(2, 'Bleeding Edge', 'Blade crits make foes bleed', "A Blade's crit makes its target bleed for a third of the blow again over 3 seconds."),
    tier(3, 'Riposte', 'Blades riposte when struck', 'A Blade struck in melee strikes straight back for 40% of its attack (once a second).'),
    tier(4, 'Thousand Cuts', 'Every fifth blow cuts all around', 'Every fifth blow of a Blade is a whirling cut that strikes every foe round it at full damage.'),
  ]),
  marksman: trait('marksman', 'Marksman', 'class', 'Mk', [
    tier(2, 'High Ground', 'Shots from the heights reach further and hit harder', 'Shooters reach half a tile further for each step of height above their target, and their shots deal 6% more for each step.', { reach: 0.5 }),
    tier(3, 'Pinning Shot', 'Every fourth shot pins', "Every fourth shot of a Marksman pins its target where it stands for a second.", { reach: 0.5 }),
    tier(4, 'Volley', 'Every 12 s the Marksmen loose as one', 'Every 12 seconds every Marksman looses at once at the foe nearest the party, each shot a crit.', { reach: 0.5 }),
  ]),
  caster: trait('caster', 'Caster', 'class', 'Ca', [
    tier(2, 'Surge', 'Caster skills refund part of their pool', "Each skill a Caster casts gives back 8% of its pool."),
    tier(3, 'Lingering Magic', 'Caster skills leave their mark on the ground', "A Caster's skill leaves its magic on the ground under two of the foes it struck (or those nearest it) for 4 seconds: a burn, a shock, a curse or a bleed, by the Caster."),
    tier(4, 'Overcast', 'Every fifth Caster skill casts twice', 'Every fifth skill the Casters cast (counted together) goes off twice.'),
  ]),
  warden: trait('warden', 'Warden', 'class', 'Wa', [
    tier(2, 'Watchful', 'Heroes beside a Warden take 5% less', 'A hero on a tile beside a Warden takes 5% less damage.'),
    tier(3, 'Sanctuary', 'Heroes behind a Warden take 5% less', 'A hero with a Warden standing in front of it in the same file takes 5% less damage.'),
    tier(4, 'Warding Circle', 'At half health, the Wardens raise circles', "Once a wave, when the party's health falls below half, every Warden raises a warding circle round it for 6 seconds: heroes in it take a quarter less damage."),
  ]),
  trickster: trait('trickster', 'Trickster', 'class', 'Tr', [
    tier(2, 'Sleight', 'The first blow on each Trickster misses', 'The first blow each wave aimed at each Trickster misses.'),
    tier(3, 'Decoy Log', 'A Trickster brought low leaves a decoy', 'Once a wave, a Trickster brought below 25% health leaves a decoy log where it stood and slips aside.', { tricksterLog: true }),
    tier(4, 'Hall of Mirrors', 'Each Trickster casts a mirror image each wave', "At each wave's start each Trickster casts a mirror image beside it for 8 seconds, with a fifth of its health and half its attack. A foe that breaks an image is dazed for a second.", { tricksterLog: true }),
  ]),
  beast: trait('beast', 'Beast', 'class', 'Be', [
    tier(2, 'Pack Instinct', 'Beasts hit harder with friends near', 'A Beast deals 6% more for each friend within 2 tiles, up to 24%.'),
    tier(3, 'Primal Roar', 'Each wave the Beasts roar foes away', 'Each wave, the first time the foes close on a Beast, it roars: the foes within 2 tiles flee for 2 seconds.'),
    tier(4, 'Apex', 'Kills send the Beasts into a frenzy', 'A Beast that kills goes into a frenzy for 5 seconds: 40% faster, and each of its blows mends it 5% of its health. Another kill starts the 5 seconds again.'),
  ]),
  gunner: trait('gunner', 'Gunner', 'class', 'Gn', [
    tier(2, 'Powder', 'Gunner shots splash', "A Gunner's shot splashes a quarter of its damage onto the foes beside its target."),
    tier(3, 'Powder Kegs', 'Powder kegs among the foes each wave', "At each wave's start three powder kegs are rolled among the foes' front. A Gunner's shot beside one sets it off; otherwise they go off by themselves after 8 seconds."),
    tier(4, 'Bombardment', "Every 12 s, shells fall on the foes' back rows", "Every 12 seconds the Gunners call down four shells on the four foes farthest back: each bursts on the tiles round it for most of the party's might."),
  ]),
  assassin: trait('assassin', 'Assassin', 'class', 'As', [
    tier(2, 'Backstab', 'Blows from behind deal 30% more', 'A blow from behind a foe deals 30% more.'),
    tier(3, 'Execute', 'Assassins finish foes below 10%', "An Assassin's blow on a foe below 10% of its health (a boss below 6%) kills it outright."),
    tier(4, 'Shadow Step', 'Kills step Assassins through the shadows', "At each wave's start and after each kill, an Assassin steps through the shadows to the tile behind the weakest foe within 3 tiles (any on the field at a wave's start), and its next blow is a crit."),
  ]),
  support: trait('support', 'Support', 'class', 'Su', [
    tier(2, 'Field Medic', 'The most hurt hero is always mending', 'Every 2 seconds the hero lowest in health mends 2.5% of its health.'),
    tier(3, 'Battle Hymn', 'Every 12 s a hymn: haste, guard, then might', 'Every 12 seconds the Supports sing to the whole party for 4 seconds, in turn a hymn of haste, of guard (15% less damage) and of might (a tenth more).'),
    tier(4, 'Rallying Cry', "A friend's fall rallies the rest; lives raise in 3 s", 'When a hero falls, every other hero mends 6% and gains 5 seconds of haste, and a life raises the fallen hero after 3 seconds instead of 5.'),
  ]),
  vanguard: trait('vanguard', 'Vanguard', 'class', 'Va', [
    tier(2, 'Spearhead', "Vanguards surge at each wave's start", 'Vanguards act and walk 15% faster for the first 8 seconds of each wave.'),
    tier(3, 'Breakthrough', "Each foe's first Vanguard blow staggers it", "A Vanguard's first blow on each foe staggers it for most of a second."),
    tier(4, 'Onslaught', 'Each wave the Vanguards leap into the foes', '2 seconds into each wave the Vanguards leap into the foes\' line together, each landing for most of its attack on the tiles round it and stunning those foes for a moment.'),
  ]),
  arcanist: trait('arcanist', 'Arcanist', 'class', 'Ac', [
    tier(2, 'Runic Study', "King's spells 15% stronger", "The king's spells hit and heal 15% harder."),
    tier(3, 'Spell Sling', "King's spells make Arcanists cast", "When the king casts a spell, each Arcanist's pool gains a tenth and it is ready to cast at once."),
    tier(4, 'Chronal Anchor', 'Once a wave, time turns back 4 s for the party', "Once a wave, when the party's health first falls below a fifth, time turns back 4 seconds for every hero: its place returns to where it was and its health toward what it was (a tenth of its health at most), and a hero fallen in those 4 seconds stands again without spending a life."),
  ]),
  bulwark: trait('bulwark', 'Bulwark', 'class', 'Bw', [
    tier(2, 'Steadfast', 'Bulwarks cannot be moved or held long', 'Bulwarks cannot be knocked back, and no stun holds them longer than a second.'),
    tier(3, 'Earthworks', 'Bulwarks raise walls before them each wave', "At each wave's start each Bulwark raises a stone wall two tiles in front of it, which blocks the foes' walk and shots for 12 seconds."),
    tier(4, 'Immovable', 'Bulwarks standing firm shelter their neighbours', 'A Bulwark that has not moved for 2 seconds takes 15% less damage, and every hero beside it takes 5% less.'),
  ]),
};

/** TRAIT-PERKS' switch (a tool's and the recorded fights' tests'): off, the traits are what they were before the perks (`LEGACY_TIERS`: the
 *  old small team bonuses, the old milestones at their old counts, the daily's featured bonus counted twice) and no perk wakes; `only`
 *  keeps one trait's perks (`tools/trait-perks/measure.ts`). On is the game. */
export const TRAIT_PERKS: { on: boolean; only?: string } = { on: true };

/** The traits' tiers before TRAIT-PERKS, as they were on main (0.604.0): what a fight with the perks switched off gives. */
export const LEGACY_TIERS: Record<string, { need: number; effects: TraitEffects }[]> = {
  samurai: [{ need: 2, effects: { atk: 1.01 } }, { need: 4, effects: { atk: 1.1 } }],
  mystic: [{ need: 2, effects: { mana: 1.3 } }, { need: 4, effects: { mana: 1.6 } }],
  yokai: [{ need: 2, effects: { dodge: 0.06 } }, { need: 3, effects: { dodge: 0.06, yokaiWisp: true } }],
  knightly: [{ need: 2, effects: { hp: 1.05 } }],
  guardian: [{ need: 2, effects: { guard: 0.05 } }, { need: 3, effects: { guard: 0.05, guardianShield: true } }],
  blade: [{ need: 2, effects: { crit: 0.1 } }],
  marksman: [{ need: 2, effects: { reach: 0.5 } }],
  caster: [{ need: 2, effects: { charge: 1.3 } }, { need: 4, effects: { charge: 1.5 } }],
  holy: [{ need: 2, effects: { hp: 1.08 } }],
  wild: [{ need: 2, effects: { atk: 1.05 } }, { need: 4, effects: { atk: 1.12 } }],
  arcane: [{ need: 2, effects: { charge: 1.15 } }, { need: 4, effects: { charge: 1.3 } }],
  frontier: [{ need: 2, effects: { crit: 0.06 } }, { need: 4, effects: { crit: 0.14 } }],
  warden: [{ need: 2, effects: { guard: 0.04 } }, { need: 4, effects: { guard: 0.1 } }],
  trickster: [{ need: 2, effects: { speed: 1.05 } }, { need: 3, effects: { speed: 1.05, tricksterLog: true } }],
  beast: [{ need: 2, effects: { atk: 1.03 } }, { need: 4, effects: { atk: 1.08 } }],
  undead: [{ need: 2, effects: { hp: 1.06 } }, { need: 4, effects: { hp: 1.14 } }],
  machine: [{ need: 2, effects: { atk: 1.03 } }, { need: 4, effects: { atk: 1.1, guard: 0.03 } }],
  royal: [{ need: 2, effects: { atk: 1.02, hp: 1.03 } }, { need: 4, effects: { atk: 1.06, hp: 1.06 } }],
  pirate: [{ need: 2, effects: { crit: 0.05, dodge: 0.03 } }],
  gunner: [{ need: 2, effects: { atk: 1.04 } }],
  assassin: [{ need: 2, effects: { crit: 0.08 } }, { need: 4, effects: { crit: 0.16, speed: 1.03 } }],
  support: [{ need: 2, effects: { hp: 1.04, charge: 1.1 } }],
  vanguard: [{ need: 2, effects: { speed: 1.04 } }, { need: 4, effects: { speed: 1.08, atk: 1.03 } }],
  arcanist: [{ need: 2, effects: { mana: 1.15, charge: 1.1 } }],
  bulwark: [{ need: 2, effects: { guard: 0.04, hp: 1.03 } }],
  vampire: [{ need: 2, effects: { leech: 0.06 } }, { need: 4, effects: { leech: 0.12, atk: 1.06 } }, { need: 5, effects: { leech: 0.15, atk: 1.1, vampireSwarm: true } }],
};

/** Each hero's origin and class. Every trait has two to four heroes. */
export const HERO_TRAITS: Record<string, readonly [string, string]> = {
  vael: ['royal', 'guardian'], astrax: ['arcane', 'arcanist'], ilyra: ['holy', 'support'], orrun: ['wild', 'guardian'], nyxara: ['arcane', 'arcanist'],
  samurai: ['samurai', 'blade'],
  kunoichi: ['samurai', 'trickster'],
  archer: ['samurai', 'marksman'],
  ninjaMonk: ['samurai', 'blade'],
  peasant: ['knightly', 'guardian'],
  knight: ['knightly', 'guardian'],
  wizard: ['mystic', 'caster'],
  lightningMage: ['mystic', 'marksman'],
  wanderer: ['mystic', 'caster'],
  kitsune: ['yokai', 'trickster'],
  karasu: ['yokai', 'trickster'],
  yamabushi: ['yokai', 'guardian'],
  paladin: ['holy', 'guardian'],
  werewolf: ['wild', 'beast'],
  minotaur: ['knightly', 'beast'],
  satyr: ['arcane', 'beast'],
  gorgon: ['yokai', 'beast'],
  samuraiCommander: ['knightly', 'blade'],
  cleric: ['holy', 'warden'],
  druid: ['wild', 'warden'],
  barbarian: ['wild', 'blade'],
  ranger: ['frontier', 'marksman'],
  gunslinger: ['frontier', 'marksman'],
  warlock: ['arcane', 'caster'],
  illusionist: ['arcane', 'trickster'],
  shambler: ['undead', 'warden'],
  rifleBot: ['machine', 'gunner'],
  mercenary: ['frontier', 'assassin'],
  mummy: ['undead', 'warden'],
  buccaneer: ['pirate', 'assassin'],
  wolfBard: ['wild', 'support'],
  beastmaster: ['frontier', 'support'],
  kraken: ['pirate', 'bulwark'],
  lancer: ['royal', 'vanguard'],
  reaper: ['undead', 'assassin'],
  timeWitch: ['arcane', 'arcanist'],
  arcBlade: ['machine', 'assassin'],
  dreadPirate: ['undead', 'vanguard'],
  siegeBot: ['machine', 'gunner'],
  priestess: ['holy', 'support'],
  dragoon: ['royal', 'vanguard'],
  juggernaut: ['machine', 'bulwark'],
  sage: ['mystic', 'arcanist'],
  demonSwordsman: ['royal', 'vanguard'],
  tyrant: ['royal', 'caster'],
  vampireLord: ['vampire', 'blade'],
  hemomancer: ['vampire', 'caster'],
  nightstalker: ['vampire', 'assassin'],
  bloodGargoyle: ['vampire', 'bulwark'],
  dhampir: ['vampire', 'gunner'],
  warDrummer: ['samurai', 'support'],
  geomancer: ['mystic', 'bulwark'],
  bellWarden: ['yokai', 'bulwark'],
  falconer: ['wild', 'marksman'],
  banneret: ['knightly', 'warden'],
  astralSphinx: ['arcane', 'beast'],
  mirageDancer: ['frontier', 'trickster'],
  plagueDoctor: ['undead', 'arcanist'],
  bombardier: ['machine', 'gunner'],
  astrologer: ['royal', 'arcanist'],
  inquisitor: ['holy', 'arcanist'],
  seraph: ['holy', 'guardian'],
  corsairSurgeon: ['pirate', 'support'],
  harpooner: ['pirate', 'gunner'],
  seaReaver: ['pirate', 'vanguard'],
};

/** The traits still to join the roster: the Vampire origin, whose five heroes have their kits but wait for their battle sheets
 *  (docs/notes/twenty-heroes.md). A fight reads them like any other trait; the page's lists and the roster's rules (every trait two to
 *  four heroes) do not, until the five join `ALL_HEROES` and the trait moves into `TRAITS`. */
export const COMING_TRAITS: Record<string, Trait> = {
};

/** The waiting heroes' origin and class (as `HERO_TRAITS`), until they join the roster. */
export const COMING_HERO_TRAITS: Record<string, readonly [string, string]> = {
};

/** A trait by id, the coming ones included. */
export const traitById = (id: string): Trait | undefined => TRAITS[id] ?? COMING_TRAITS[id];

export const traitsOf = (kind: string): readonly string[] => HERO_TRAITS[kind] ?? COMING_HERO_TRAITS[kind] ?? [];

/** The heroes (by kind) that carry a trait. */
export const membersOf = (trait: string): string[] => Object.keys(HERO_TRAITS).filter((k) => HERO_TRAITS[k].includes(trait));

export interface TraitCount {
  trait: Trait;
  /** Different hero kinds placed with the trait. */
  count: number;
  /** The tier reached (-1 for none). */
  tier: number;
  /** The count the next tier needs, or the last tier's when all are reached. */
  goal: number;
  active: boolean;
}

/** The traits of the placed hero kinds (duplicates count once), those with any hero placed, the active ones first. `featured` is the
 *  daily's featured trait, which counts one hero more than it has (TRAIT-PERKS: in place of its old doubled bonus). */
export function countTraits(kinds: Iterable<string>, featured?: string): TraitCount[] {
  const seen = new Set(kinds);
  const out: TraitCount[] = [];
  for (const trait of [...Object.values(TRAITS), ...Object.values(COMING_TRAITS)]) {
    const had = [...seen].filter((k) => traitsOf(k).includes(trait.id)).length;
    const count = had && trait.id === featured ? had + 1 : had;
    if (!count) continue;
    let tier = -1;
    trait.tiers.forEach((t, i) => {
      if (count >= t.need) tier = i;
    });
    const goal = trait.tiers[Math.min(trait.tiers.length - 1, tier + 1)].need;
    out.push({ trait, count, tier, goal, active: tier >= 0 });
  }
  return out.sort((a, b) => Number(b.active) - Number(a.active) || b.count / b.goal - a.count / a.goal);
}

/** The team bonus of the placed hero kinds: every active trait's reached tier, combined. */
export function traitEffects(kinds: Iterable<string>, featured?: string): TraitEffects {
  const fx: TraitEffects = {};
  const mult = (k: 'atk' | 'hp' | 'speed' | 'charge' | 'mana', v: number) => (fx[k] = (fx[k] ?? 1) * v);
  const add = (k: 'guard' | 'dodge' | 'crit' | 'reach' | 'leech', v: number) => (fx[k] = (fx[k] ?? 0) + v);
  for (const e of TRAIT_PERKS.on ? reachedEffects(kinds, featured) : legacyEffects(kinds)) {
    for (const k of ['atk', 'hp', 'speed', 'charge', 'mana'] as const) if (e[k]) mult(k, e[k]!);
    for (const k of ['guard', 'dodge', 'crit', 'reach', 'leech'] as const) if (e[k]) add(k, e[k]!);
    if (e.tricksterLog) fx.tricksterLog = true;
    if (e.yokaiWisp) fx.yokaiWisp = true;
    if (e.guardianShield) fx.guardianShield = true;
    if (e.vampireSwarm) fx.vampireSwarm = true;
  }
  return fx;
}

/** The effects of each trait's reached tier. */
const reachedEffects = (kinds: Iterable<string>, featured?: string): TraitEffects[] =>
  countTraits(kinds, featured).filter((c) => c.active).map((c) => c.trait.tiers[c.tier].effects);

/** The old bonuses (`LEGACY_TIERS`), with the daily's featured trait's counted twice as it was. */
function legacyEffects(kinds: Iterable<string>): TraitEffects[] {
  const seen = new Set(kinds);
  const out: TraitEffects[] = [];
  for (const [id, tiers] of Object.entries(LEGACY_TIERS)) {
    const n = [...seen].filter((k) => traitsOf(k).includes(id)).length;
    let reached: TraitEffects | undefined;
    for (const t of tiers) if (n >= t.need) reached = t.effects;
    if (reached) out.push(reached);
  }
  return out;
}

/** The old featured bonus: the featured trait's reached legacy tier once more (it counted twice), for a fight with the perks off. */
export function legacyFeatured(trait: string, kinds: Iterable<string>): TraitEffects[] {
  const n = [...new Set(kinds)].filter((k) => traitsOf(k).includes(trait)).length;
  let reached: TraitEffects | undefined;
  for (const t of LEGACY_TIERS[trait] ?? []) if (n >= t.need) reached = t.effects;
  return reached ? [reached] : [];
}

/** The kinds of the heroes now placed in a fight, for the functions above. */
export const kindsOf = (units: readonly { side: string; def: string }[]): string[] => units.filter((u) => u.side === 'hero' && UNITS[u.def]).map((u) => u.def);

/** The tier a trait stands at, for the page: the count it reached it with and what it gives (null while no tier is reached). */
export function activeTier(c: TraitCount): { need: number; text: string } | null {
  return c.tier >= 0 ? c.trait.tiers[c.tier] : null;
}

/** What a trait still wants: "1 more for +10% attack", or null when its last tier is reached. */
export function nextTierLine(c: TraitCount): string | null {
  const next = c.trait.tiers[c.tier + 1];
  if (!next) return null;
  const more = next.need - c.count;
  return `${more} more ${more === 1 ? 'hero' : 'heroes'} for ${next.text}`;
}

/** The traits closest to waking a tier (or a higher one): the single line the deploy strip leads with. */
export function closestTrait(counts: readonly TraitCount[]): TraitCount | null {
  let best: TraitCount | null = null;
  let bestLeft = Infinity;
  for (const c of counts) {
    const next = c.trait.tiers[c.tier + 1];
    if (!next) continue;
    const left = next.need - c.count;
    if (left < bestLeft) {
      best = c;
      bestLeft = left;
    }
  }
  return best;
}
