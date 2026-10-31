// The 45 heroes' kits (COMBAT-002, docs/notes/hero-kits.md section 6): each hero's pool, skill 1 and skill 2, with costs and strengths. Every hero's
// old skill stays (the same object as in `KITS`, so its painting, its tier skills and the foes that borrow it are untouched): as skill 1 for 43
// heroes, and as skill 2 for the Cleric and the Wanderer, who gain a new skill 1. Each hero gains one new skill. The ultimates are in `ultimates.ts`.
//
// `tune` is the balance knob (times the caster's attack while it casts); the costs are the design's, set in the tuning pass.

import type { Battle, Unit } from '../battle';
import { CHARGE_MAX, KITS, type Skill } from '../abilities';
import type { HeroKit, Slot } from '../heroKits';
import type { SkillClass } from '../skillRules';
import { bullRush, devour, parryStance, puppetStrings } from './front';
import { bloodFury, bloodPrice, boundSoul, grounding, jump, markForCoin, pilfer, rollTheBones, shift, smokeBomb, smokeNeeded, stillnessPalm, wheelAbout } from './blades';
import { fanTheHammer, pinningShot, powderKeg, siegeMode, spikeField, suppressingFire } from './shooters';
import { changeTune, charge, flaskNeeded, flaskToss, guardianAngel, piedPiper, rewind, smite, soulSiphon, stoneGarden, treeform } from './casters';
import { fontOfMagic, stormSurge, transposition, wallOfFire } from './mages';
import { alterSelf, tidalWave, windWall } from './monsters';
import { plantStandard, sicEm } from './callers';
import { REVIVE_FACES } from './revive';
import { auraOfProtection, bane, shieldRush, spearWall, tunnelStrike } from './tanks';

/** A new skill (its charge numbers are unused: a hero's skills cost its pool). */
const sk = (name: string, text: string, castMs: number, anim: Skill['anim'], cast: Skill['cast'], key?: string): Skill => ({ name, ...(key ? { key } : {}), text, need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs, anim, cast });

/** The global strengths of a stamina skill 1 and a mana skill 1 (stamina skills come round more often, so each carries less), for a hero the
 *  table below does not name. */
export const STAM_TUNE = 0.5;
export const MANA_TUNE = 0.7;
/** Each hero's skill 1 strength (its `tune`), found by the hero sweep at level 1 (`tools/kits/tune.mjs`, `test/hero-balance.test.ts`): a skill
 *  whose worth is mostly what it does rather than what it deals (a guard, a banner, decoys, a yank) carries little attack, and keeps a longer gap. */
export const TUNE1: Readonly<Record<string, number>> = {
  knight: 0.172,
  samurai: 0.671,
  kunoichi: 0.285,
  archer: 0.77,
  wizard: 0.211,
  peasant: 0.565,
  ninjaMonk: 0.533,
  wanderer: 1.059,
  lightningMage: 0.406, // (RPG-SPELLS batch 6: 0.93 before; she stood +5.9 at level 10)
  kitsune: 0.586,
  karasu: 0.24, // (RPG-SPELLS batch 7: 0.4 before; striking from behind made Swoop +4 at level 1)
  yamabushi: 0.431,
  werewolf: 0.787,
  minotaur: 0.438, // (RPG-SPELLS batch 7: 0.45 before; he was -5.7 at level 10 on main)
  satyr: 0.096,
  gorgon: 0.343,
  samuraiCommander: 0.061,
  paladin: 0.578,
  cleric: 2.784,
  druid: 0.629,
  barbarian: 0.463,
  ranger: 0.138,
  warlock: 0.368, // (RPG-SPELLS batch 6: 0.59 before; Eldritch Blast's shove made him +3.3 at level 1)
  illusionist: 0.096,
  gunslinger: 0.366,
  shambler: 2.087, // (RPG-SPELLS batch 7: Contagion's rot; 0.78 was Rotting Touch's)
  rifleBot: 0.708,
  mercenary: 0.595,
  mummy: 0.59,
  buccaneer: 0.486,
  wolfBard: 0.272,
  beastmaster: 0.077,
  kraken: 0.078,
  lancer: 0.14,
  reaper: 0.467,
  timeWitch: 0.054,
  arcBlade: 0.153,
  dreadPirate: 0.53,
  siegeBot: 0.163,
  priestess: 0.792,
  dragoon: 0.553,
  juggernaut: 0.847, // (RPG-SPELLS batch 3: Seismic Slam, 0.52 as Earthquake)
  sage: 0.538,
  demonSwordsman: 0.631,
  tyrant: 0.932,
};

const hurtUnder = (share: number) => (b: Battle, me: Unit) => b.units.some((a) => a.alive && a.side === me.side && a.hp < a.maxHp * share && Math.abs(a.u - me.u) + Math.abs(a.v - me.v) <= 5);
const selfUnder = (share: number) => (b: Battle, me: Unit) => me.hp < me.maxHp * share && b.units.some((f) => f.alive && f.side !== me.side && Math.abs(f.u - me.u) + Math.abs(f.v - me.v) <= 2);

/** Each hero's skill 2 strength, found by the hero sweep at level 10 (stage 24, toward a team winning about 30%: a little stronger than a level-10
 *  team was with one skill), then evened out on the level-30 sweep (stage 39, `test/hero-balance-ultimates.test.ts`). */
export const TUNE2: Readonly<Record<string, number>> = {
  knight: 0.75,
  samurai: 2.71,
  kunoichi: 0.237,
  archer: 0.073,
  wizard: 4.744, // (RPG-SPELLS batch 6: the Wall of Fire's burn; 2.26 was Wildfire's eruption)
  peasant: 0.281,
  ninjaMonk: 1.72,
  wanderer: 0.106,
  lightningMage: 0.072,
  kitsune: 0.052,
  karasu: 1.678,
  yamabushi: 3.501,
  werewolf: 0.885,
  minotaur: 3.132,
  satyr: 0.066,
  gorgon: 1.638,
  samuraiCommander: 1.109,
  paladin: 0.315,
  cleric: 0.592,
  druid: 0.066,
  barbarian: 0.097,
  ranger: 0.052,
  warlock: 0.068,
  illusionist: 0.073,
  gunslinger: 0.895,
  shambler: 0.057,
  rifleBot: 0.125,
  mercenary: 0.887, // (RPG-SPELLS batch 4: 3.06 before; Hunter's Mark was the weakest skill 2 at level 10)
  mummy: 0.067,
  buccaneer: 1.006,
  wolfBard: 0.13,
  beastmaster: 0.058,
  kraken: 0.343,
  lancer: 0.69,
  reaper: 0.097,
  timeWitch: 0.058,
  arcBlade: 0.209,
  dreadPirate: 0.721,
  siegeBot: 6.232,
  priestess: 0.061,
  dragoon: 0.687,
  juggernaut: 2.123,
  sage: 0.962, // (RPG-SPELLS batch 6: Font of Magic's flow; at 0.8 it gives about the 25 mana Font of Wisdom gave at once; 1.13 before)
  demonSwordsman: 1.382,
  tyrant: 0.866,
};

/** Each hero's skill 1 and skill 2 class (the skills overhaul, docs/notes/skills-overhaul-design.md section 3; `skillRules.ts`): the class sets the
 *  range its cost, cooldown and cast time sit in, and how the AI weighs it. */
export const CLASSES: Readonly<Record<string, readonly [SkillClass, SkillClass]>> = {
  knight: ['utility', 'heavy'],
  paladin: ['strike', 'utility'],
  peasant: ['utility', 'heavy'],
  juggernaut: ['strike', 'heavy'],
  samurai: ['strike', 'guard'],
  kunoichi: ['strike', 'guard'],
  ninjaMonk: ['strike', 'heavy'],
  barbarian: ['strike', 'utility'],
  mercenary: ['strike', 'utility'],
  lancer: ['strike', 'guard'],
  arcBlade: ['strike', 'heavy'],
  demonSwordsman: ['strike', 'utility'],
  buccaneer: ['strike', 'heavy'],
  dragoon: ['strike', 'heavy'],
  archer: ['strike', 'heavy'],
  ranger: ['strike', 'heavy'],
  gunslinger: ['strike', 'heavy'],
  rifleBot: ['strike', 'heavy'],
  siegeBot: ['strike', 'utility'],
  dreadPirate: ['strike', 'heavy'],
  wizard: ['strike', 'heavy'],
  lightningMage: ['strike', 'heavy'],
  warlock: ['strike', 'heavy'],
  sage: ['strike', 'utility'],
  timeWitch: ['utility', 'guard'],
  illusionist: ['guard', 'utility'],
  cleric: ['strike', 'utility'],
  priestess: ['strike', 'guard'],
  wanderer: ['strike', 'utility'],
  druid: ['utility', 'utility'],
  samuraiCommander: ['utility', 'utility'],
  wolfBard: ['strike', 'utility'],
  tyrant: ['strike', 'heavy'],
  beastmaster: ['utility', 'strike'],
  reaper: ['strike', 'utility'],
  kitsune: ['utility', 'utility'],
  karasu: ['strike', 'utility'],
  yamabushi: ['strike', 'utility'],
  werewolf: ['strike', 'utility'],
  minotaur: ['strike', 'heavy'],
  satyr: ['utility', 'heavy'],
  gorgon: ['strike', 'heavy'],
  shambler: ['utility', 'guard'],
  mummy: ['strike', 'heavy'],
  kraken: ['strike', 'heavy'],
};

/** Each hero's skill 1 and skill 2 cost and cooldown (ms), in their classes' ranges (the skills overhaul's section 3, batch 2): [cost 1, cooldown 1,
 *  cost 2, cooldown 2]. Cheap, quick things are held back by their cooldown, big ones by their cost. */
export const COSTS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  knight: [20, 14000, 28, 12000],
  paladin: [36, 6000, 48, 16000],
  peasant: [22, 12000, 32, 11000],
  juggernaut: [26, 7000, 36, 12000],
  samurai: [24, 6000, 20, 12000],
  kunoichi: [22, 6000, 18, 16000],
  ninjaMonk: [22, 6000, 32, 10000],
  barbarian: [24, 6000, 18, 16000],
  mercenary: [24, 7000, 26, 14000],
  lancer: [24, 7000, 16, 12000],
  arcBlade: [24, 7000, 30, 10000],
  demonSwordsman: [24, 6000, 16, 12000],
  buccaneer: [24, 9000, 30, 10000],
  dragoon: [26, 7000, 36, 13000],
  archer: [24, 6000, 34, 12000],
  ranger: [26, 9000, 36, 14000],
  gunslinger: [26, 6000, 32, 11000],
  rifleBot: [22, 5000, 32, 11000],
  siegeBot: [26, 7000, 26, 18000],
  dreadPirate: [26, 7000, 34, 12000],
  wizard: [38, 7000, 48, 12000],
  lightningMage: [36, 6000, 44, 10000],
  warlock: [36, 6000, 50, 14000],
  sage: [38, 7000, 42, 18000],
  timeWitch: [46, 16000, 42, 14000],
  illusionist: [44, 20000, 42, 18000],
  cleric: [32, 6000, 46, 14000],
  priestess: [36, 6000, 44, 16000],
  wanderer: [32, 7000, 46, 15000],
  druid: [50, 20000, 48, 20000],
  samuraiCommander: [28, 18000, 28, 20000],
  wolfBard: [38, 8000, 38, 14000],
  tyrant: [36, 7000, 46, 12000],
  beastmaster: [28, 18000, 28, 9000],
  reaper: [24, 6000, 24, 16000],
  kitsune: [44, 16000, 50, 20000],
  karasu: [22, 6000, 22, 12000],
  yamabushi: [22, 6000, 24, 14000],
  werewolf: [20, 6000, 22, 16000],
  minotaur: [26, 7000, 32, 10000],
  satyr: [38, 18000, 50, 14000],
  gorgon: [36, 7000, 46, 12000],
  shambler: [24, 14000, 20, 18000],
  mummy: [32, 7000, 50, 14000],
  kraken: [22, 6000, 34, 11000],
};

/** Build the table (called once, on first use: `KITS` must be built first). */
export function HERO_TABLE(): Record<string, HeroKit> {
  const old = (kind: string) => KITS[kind].skill;
  /** A kit's slots, with `s1` and `s2` the same objects as the first two. */
  const slots = (s1: Slot, s2: Slot) => ({ slots: [s1, s2], s1, s2 });
  /** A stamina hero: skill 1 its old skill. */
  const S = (kind: string, s2: Skill, role: string, more1: Partial<Slot> = {}, more2: Partial<Slot> = {}): HeroKit => ({
    pool: 'stamina',
    ...slots({ skill: old(kind), cls: CLASSES[kind][0], cost: COSTS[kind][0], tune: TUNE1[kind] ?? STAM_TUNE, cd: COSTS[kind][1], ...more1 }, { skill: s2, cls: CLASSES[kind][1], cost: COSTS[kind][2], tune: TUNE2[kind] ?? 1, cd: COSTS[kind][3], ...more2 }),
    role,
  });
  /** A mana hero: skill 1 its old skill. */
  const M = (kind: string, s2: Skill, role: string, more1: Partial<Slot> = {}, more2: Partial<Slot> = {}): HeroKit => ({
    pool: 'mana',
    ...slots({ skill: old(kind), cls: CLASSES[kind][0], cost: COSTS[kind][0], tune: TUNE1[kind] ?? MANA_TUNE, cd: COSTS[kind][1], ...more1 }, { skill: s2, cls: CLASSES[kind][1], cost: COSTS[kind][2], tune: TUNE2[kind] ?? 1, cd: COSTS[kind][3], ...more2 }),
    role,
  });
  return {
    knight: S('knight', sk('Shield Rush', 'Charges up to 3 tiles in a line at a foe, bashes it (stunned 1s) and drives it 2 tiles back; a slam into a wall or a fighter hurts it again', 500, 'attack', shieldRush), 'A wall of a man: draws the foes and drives them back', { emergency: selfUnder(0.3) }, {}),
    samurai: S('samurai', sk('Riposte', 'For 2.5s every melee blow on him is parried and answered with a cut', 400, 'defend', parryStance, 'Parry Stance'), 'A duellist: dashes through a line, parries and answers'),
    kunoichi: S('kunoichi', sk('Smoke Bomb', 'She cannot be targeted for 2s; foes in the smoke miss half their blows for 3s, her next blow crits, and she blinks clear to the safest tile within 3', 400, 'attack2', smokeBomb), 'Blinks behind the weak, vanishes in smoke', {}, { emergency: smokeNeeded }),
    archer: S('archer', sk('Aimed Shot', 'With a foe beside her she first leaps 2 tiles back, to higher ground if she can; then the farthest foe in reach is pinned for 2s and takes a quarter more from shots for 4s', 600, 'attack', pinningShot, 'Pinning Shot'), 'A sniper: volleys from the heights, pins the far ones'),
    wizard: M('wizard', sk('Wall of Fire', 'A wall of fire 4 tiles long across the lane the most foes are walking, for 6s: a foe in it or crossing it burns', 800, 'attack', wallOfFire, 'Wildfire'), 'A pyromancer: fire that runs from foe to foe', {}),
    peasant: S('peasant', sk('Spear Wall', 'A line of sharpened stakes, 3 tiles across his front, for 6s: foes cannot walk through it, and one beside a stake is pricked and bleeds', 500, 'attack', spearWall), 'Formation militia: closes ranks behind a wall of stakes', {}, {}),
    ninjaMonk: S('ninjaMonk', sk('Quivering Palm', 'Spends his Flow (a stack a blow on the same foe, up to five) in one palm, and the foe loses skill charge; with nobody in reach he leaps up to 4 tiles to the foe with the fullest meter', 500, 'attack2', stillnessPalm, 'Stillness Palm'), 'A combo striker: builds his flow on one foe, then spends it'),
    wanderer: {
      pool: 'mana',
      ...slots(
        { skill: sk('Healing Draught', 'A healing draught (a quarter of its health) for a badly hurt friend; with none, Alchemist\'s Fire on the thickest 3x3', 500, 'attack', flaskToss, 'Flask Toss'), cls: CLASSES.wanderer[0], cost: COSTS.wanderer[0], tune: TUNE1.wanderer ?? MANA_TUNE, heals: true, emergency: flaskNeeded, cd: COSTS.wanderer[1] },
        { skill: old('wanderer'), cls: CLASSES.wanderer[1], cost: COSTS.wanderer[2], tune: TUNE2.wanderer ?? 1, heals: true, emergency: hurtUnder(0.35), revive: REVIVE_FACES.wanderer, cd: COSTS.wanderer[3] },
      ),
      role: 'An alchemist: draughts for friends, firebrew for foes, an elixir for the fallen',
    },
    lightningMage: M('lightningMage', sk('Storm Surge', 'With a foe beside her she first blinks to the safest tile within 3; then every Charged foe discharges: hurt, stunned for 0.8s, and the bolt arcs to a foe beside it', 700, 'attack', stormSurge, 'Overload'), 'A storm marker: lightning that marks, then sets the marks off', { onHit: charge }),
    kitsune: M('kitsune', sk('Alter Self', 'She blinks in fox-fire beside the strongest foe in sight and takes its shape for 5s: its looks, reach and attack; foes pick her last', 600, 'attack', alterSelf, 'Fox Guise'), 'A shapeshifter: charms a foe, or wears its shape', {}, {}),
    karasu: S('karasu', sk('Pilfer', 'Dives on the foe with the fullest skill meter, steals half its charge and any shield, and silences it for 1.5s; friends near him gain pool', 450, 'attack', pilfer), 'A thief: dives on the back line and robs it'),
    yamabushi: S('yamabushi', sk('Wind Wall', 'A wall of wind 3 tiles long in front of the friends a shooter is aiming at, for 4s: shots through it fly back at the shooter for half', 500, 'attack', windWall, 'Turning Wind'), 'A reflector: wind that shoves foes and turns arrows'),
    werewolf: S('werewolf', sk('Shapechange', 'Changes form: the Hunter (quicker, bites bleed) or the Brute (takes a quarter less, blows splash); Brute when badly hurt or crowded', 400, 'attack', shift, 'Shift'), 'A shapeshifter: a hunting wolf and a great brute'),
    minotaur: S('minotaur', sk('Bull Rush', 'Every foe beside him is struck and shoved two tiles; one that hits something is stunned for 1.5s', 550, 'attack', bullRush), 'A bulldozer: slams foes into walls and each other'),
    satyr: M('satyr', sk('Irresistible Dance', 'The foes within 4 dance towards one spot ahead of him for 2s, bunched and not striking', 600, 'attack', piedPiper, 'Pied Piper'), 'A lure: pipes that hasten friends and gather foes', {}),
    gorgon: M('gorgon', sk('Flesh to Stone', 'Every stunned or slowed foe within 5 turns to stone for 2s; one that dies as stone stays as a statue', 700, 'attack', stoneGarden, 'Stone Garden'), 'A petrifier: stone foes that stay as statues'),
    samuraiCommander: S('samuraiCommander', sk('Plant the Standard', 'Plants a standard for 10s: friends within 2 of it take a tenth less and hit a tenth harder while it stands', 600, 'attack2', plantStandard), 'A banner-bearer: plants a standard that must be knocked down', {}),
    paladin: M('paladin', sk('Aura of Protection', 'For 8s the allies within 3 of him take 30% less, heal 1% of their health a second, and each shrugs off the next ailment', 600, 'defend', auraOfProtection), 'A holy shield: smites the wicked and guards his friends', {}, {}),
    cleric: {
      pool: 'mana',
      ...slots(
        { skill: sk('Guiding Bolt', 'A bolt of holy light at a foe in reach; her friends within 2 of it are healed by what it dealt', 500, 'attack', smite, 'Smite'), cls: CLASSES.cleric[0], cost: COSTS.cleric[0], tune: TUNE1.cleric ?? MANA_TUNE, cd: COSTS.cleric[1] },
        { skill: old('cleric'), cls: CLASSES.cleric[1], cost: COSTS.cleric[2], tune: TUNE2.cleric ?? 1, heals: true, emergency: hurtUnder(0.35), revive: REVIVE_FACES.cleric, cd: COSTS.cleric[3] },
      ),
      role: 'A battle priest: her bolts heal, her prayers raise the fallen',
    },
    druid: M('druid', sk('Wild Shape', 'For 6s she becomes a treant: a third more health, more defence, foes beside her must strike her; she heals 15% after', 700, 'attack2', treeform, 'Treeform'), 'A shapeshifter: calls a treant, or becomes one; she can raise the fallen', {}, { revive: REVIVE_FACES.druid }),
    barbarian: S('barbarian', sk('Rage', 'Paid in blood: for 4s his blows come 30% faster and drink an eighth, and he cannot fall below 1 health', 400, 'attack2', bloodFury, 'Blood Fury'), 'A berserker: stronger the more he bleeds', {}, { hpCost: 0.1 }),
    ranger: S('ranger', sk('Spike Growth', 'Caltrops on the 3x3 round the nearest foe for 6s: whoever stands in it is slowed and bleeds', 500, 'attack', spikeField, 'Spike Field'), 'A trapper: snares and fields of caltrops', {}),
    warlock: M('warlock', sk('Drain Life', 'Channels 2s on the weakest foe in reach, draining it; what he drains heals his most hurt friend', 2000, 'attack2', soulSiphon, 'Soul Siphon'), 'A leech: drinks his foes and feeds his friends'),
    illusionist: M('illusionist', sk('Transposition', 'She and the friend in most trouble within 5 change places, and a decoy springs up beside the friend; the foes that were striking the friend now face her (she slips a quarter of blows)', 400, 'attack2', transposition, 'Trade Places'), 'A trickster: decoys, and friends swapped out of danger', { emergency: selfUnder(0.25) }, {}),
    gunslinger: S('gunslinger', sk('Fan the Hammer', 'With a foe within 2 she first rolls clear; then three fast shots at the nearest foe in reach, and a long reload', 1900, 'attack', fanTheHammer), 'A quick-draw: slugs through a line, or three fast shots'),
    shambler: S('shambler', sk('Devour', 'Eats a body that fell near him: heals a fifth and grows a tenth bigger for the fight (three times at most)', 700, 'attack', devour), 'A corpse-eater: rots his foes and eats the fallen'),
    rifleBot: S('rifleBot', sk('Suppressing Fire', 'Fire on the three-wide lane with most foes: each is struck, slowed for 3s, and its skill stops charging', 700, 'attack2', suppressingFire), 'A suppressor: bursts, and a lane of fire'),
    mercenary: S('mercenary', sk('Hunter\'s Mark', 'Throws a blade at the strongest foe and marks it for 10s: every hero deals a quarter more to it; if it dies marked he heals and his stamina fills', 400, 'attack2', markForCoin, 'Mark for Coin'), 'A bounty hunter: marks the strongest and is paid for it'),
    mummy: M('mummy', sk('Dominate Monster', 'The hardest-hitting foe within 4 is bound for 3s: it walks to, and strikes, its own side', 600, 'attack2', puppetStrings, 'Puppet Strings'), 'A puppeteer: binds a foe and walks it into its friends'),
    buccaneer: S('buccaneer', sk('Loaded Dice', 'Two dice: 2-4 a weak cut and he is slowed; 5-9 x1.6; 10-11 x2.2 and a bleed; doubles or 12 x3 and every friend hastened', 450, 'attack2', rollTheBones, 'Roll the Bones'), 'A gambler: hooks, and the dice', {}),
    wolfBard: M('wolfBard', sk('Bardic Inspiration', 'Switches his standing song (Dirge weakens foes near, Anthem lifts friends near) and doubles it for 6s', 600, 'attack2', changeTune, 'Change the Tune'), 'A songweaver: a standing song he switches'),
    beastmaster: S('beastmaster', sk('Pack Tactics', 'Every wolf of his leaps at the foe he marks: struck and slowed, and the wolves hit a quarter harder for 4s; with none, one answers', 600, 'attack2', sicEm, "Sic 'Em"), 'A summoner: calls the pack and sets it on a foe', {}),
    kraken: S('kraken', sk('Tidal Wave', 'A wave rolls from him down the three-wide lane with most foes, hurting each and shoving it 2 tiles; where it breaks it freezes into a Wall of Ice 3 tiles across, for 6s', 600, 'attack2', tidalWave, 'Flood'), 'A tide-caller: drags foes in and floods the ground'),
    lancer: S('lancer', sk('Disengage', 'Rides up to 3 tiles clear of the melee and gains full Momentum (his next blow +50%)', 400, 'attack', wheelAbout, 'Wheel About'), 'Momentum cavalry: hits harder the further he rides'),
    reaper: S('reaper', sk('Animate Dead', 'The last foe that fell near him rises as a wraith on his side for 8s, at half its health and attack', 600, 'attack2', boundSoul, 'Bound Soul'), 'A soul harvester: the foes he reaps rise for him'),
    timeWitch: M('timeWitch', sk('Rewind', 'The friend that lost most in the last 4s goes back: its health, its tile, and its new ailments gone', 600, 'attack2', rewind), 'A time-bender: hastes, slows, and turns a friend\'s clock back', {}, { heals: true }),
    arcBlade: S('arcBlade', sk('Thunderwave', 'Lets go what he stored (30% of the damage he takes) as a wave round him, heals a tenth, and shoves the foes within 2 two tiles back', 450, 'attack2', grounding, 'Grounding'), 'A capacitor: stores the blows he takes and lets them go'),
    dreadPirate: S('dreadPirate', sk('Powder Keg', 'Rolls a keg to the thickest crowd; it bursts on a 3x3 and sets off every powder barrel and keg within 2; the blast throws its 3x3 a tile outward, 2 at its heart', 600, 'attack2', powderKeg), 'A bomber: kegs that set off the field\'s powder barrels'),
    siegeBot: S('siegeBot', sk('Siege Mode', 'Anchors for 8s: cannot walk, reaches two further, shells splash and come faster', 500, 'attack2', siegeMode), 'A stance turret: anchors into siege mode'),
    priestess: M('priestess', sk('Death Ward', 'The friend most at risk is warded for 4s: the first blow that would fell it leaves it at 1 health and heals it 30%', 600, 'attack2', guardianAngel, 'Guardian Angel'), 'A resurrector: mends the worst hurt, wards the dying and raises the fallen', { heals: true, emergency: hurtUnder(0.35) }, { heals: true, revive: REVIVE_FACES.priestess }),
    dragoon: S('dragoon', sk('Dragon Dive', 'She leaps out of the fight and lands on the thickest crowd: double on her mark, and the 3x3 struck, held and thrown a tile outward', 400, 'attack2', jump, 'Jump'), 'A dragoon: breathes fire and jumps'),
    juggernaut: S('juggernaut', sk('Tunnel Strike', 'Drills into the ground and comes up under the foe within 6 with most foes round it: it is struck hard and thrown 2 tiles, and the foes beside it are struck and shoved', 700, 'attack2', tunnelStrike), 'A siege engine: slams foes into the air and tunnels under them', {}, {}),
    sage: M('sage', sk('Font of Magic', 'A font of magic rises on his tile for 8s: friends within 3 of it gain 4 mana or 2 stamina a second', 600, 'attack2', fontOfMagic, 'Font of Wisdom'), 'A mana battery: stars, and his friends\' pools filled', {}, {}),
    demonSwordsman: S('demonSwordsman', sk('Blood Pact', 'Paid in blood: his next three blows deal 60% more and drink 30%', 400, 'attack2', bloodPrice, 'Blood Price'), 'A blood pact: pays health for power', {}, { hpCost: 0.1 }),
    tyrant: M('tyrant', sk('Bane', 'Iron chains drag the toughest foe within 6 up to 3 tiles towards him and mark it for 6s: every hero goes for it and deals 20% more (if it falls, every hero gains pool); the two foes nearest it are weakened', 500, 'attack2', bane, 'Condemn'), 'A condemner: names a foe for the whole party', {}, {}),
  };
}
