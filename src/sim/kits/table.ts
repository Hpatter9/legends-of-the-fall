// The 45 heroes' kits (COMBAT-002, docs/notes/hero-kits.md section 6): each hero's pool, skill 1 and skill 2, with costs and strengths. Every hero's
// old skill stays (the same object as in `KITS`, so its painting, its tier skills and the foes that borrow it are untouched): as skill 1 for 43
// heroes, and as skill 2 for the Cleric and the Wanderer, who gain a new skill 1. Each hero gains one new skill. The ultimates are in `ultimates.ts`.
//
// `tune` is the balance knob (times the caster's attack while it casts); the costs are the design's, set in the tuning pass.

import type { Battle, Unit } from '../battle';
import { CHARGE_MAX, KITS, type Skill } from '../abilities';
import type { HeroKit, Slot } from '../heroKits';
import { bullRush, braceSpears, devour, flood, martyrsVow, parryStance, puppetStrings, raiseRampart, shieldBash, turningWind } from './front';
import { bloodFury, bloodPrice, boundSoul, grounding, jump, markForCoin, pilfer, rollTheBones, shift, smokeBomb, smokeNeeded, stillnessPalm, wheelAbout } from './blades';
import { fanTheHammer, pinningShot, powderKeg, siegeMode, spikeField, suppressingFire } from './shooters';
import { changeTune, charge, condemn, flaskNeeded, flaskToss, fontOfWisdom, foxGuise, guardianAngel, overload, piedPiper, rewind, smite, soulSiphon, stoneGarden, tradePlaces, treeform, wildfire } from './casters';
import { plantStandard, sicEm } from './callers';
import { REVIVE_FACES } from './revive';

/** A new skill (its charge numbers are unused: a hero's skills cost its pool). */
const sk = (name: string, text: string, castMs: number, anim: Skill['anim'], cast: Skill['cast'], key?: string): Skill => ({ name, ...(key ? { key } : {}), text, need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs, anim, cast });

/** The global strengths of a stamina skill 1 and a mana skill 1 (stamina skills come round more often, so each carries less), for a hero the
 *  table below does not name. */
export const STAM_TUNE = 0.5;
export const MANA_TUNE = 0.7;
/** Each hero's skill 1 strength (its `tune`), found by the hero sweep at level 1 (`tools/kits/tune.mjs`, `test/hero-balance.test.ts`): a skill
 *  whose worth is mostly what it does rather than what it deals (a guard, a banner, decoys, a yank) carries little attack, and keeps a longer gap. */
export const TUNE1: Readonly<Record<string, number>> = {
  knight: 0.26,
  samurai: 0.63,
  kunoichi: 0.37,
  archer: 0.69,
  wizard: 0.41,
  peasant: 0.49,
  ninjaMonk: 0.5,
  wanderer: 1.5,
  lightningMage: 0.93,
  kitsune: 1.0,
  karasu: 0.4,
  yamabushi: 0.62,
  werewolf: 0.34,
  minotaur: 0.45,
  satyr: 0.3,
  gorgon: 0.56,
  samuraiCommander: 0.22,
  paladin: 0.72,
  cleric: 3.52,
  druid: 0.77,
  barbarian: 0.65,
  ranger: 0.3,
  warlock: 0.59,
  illusionist: 0.14,
  gunslinger: 0.47,
  shambler: 0.78,
  rifleBot: 0.94,
  mercenary: 0.54,
  mummy: 1.41,
  buccaneer: 0.38,
  wolfBard: 0.44,
  beastmaster: 0.3,
  kraken: 0.19,
  lancer: 0.23,
  reaper: 0.69,
  timeWitch: 0.18,
  arcBlade: 0.39,
  dreadPirate: 0.47,
  siegeBot: 0.43,
  priestess: 1.05,
  dragoon: 0.63,
  juggernaut: 0.52,
  sage: 0.65,
  demonSwordsman: 0.66,
  tyrant: 0.97,
};

const hurtUnder = (share: number) => (b: Battle, me: Unit) => b.units.some((a) => a.alive && a.side === me.side && a.hp < a.maxHp * share && Math.abs(a.u - me.u) + Math.abs(a.v - me.v) <= 5);
const selfUnder = (share: number) => (b: Battle, me: Unit) => me.hp < me.maxHp * share && b.units.some((f) => f.alive && f.side !== me.side && Math.abs(f.u - me.u) + Math.abs(f.v - me.v) <= 2);

/** Each hero's skill 2 strength, found by the hero sweep at level 10 (stage 24, toward a team winning about 30%: a little stronger than a level-10
 *  team was with one skill), then evened out on the level-30 sweep (stage 39, `test/hero-balance-ultimates.test.ts`). */
export const TUNE2: Readonly<Record<string, number>> = {
  knight: 0.33,
  samurai: 2.16,
  kunoichi: 0.61,
  archer: 0.69,
  wizard: 2.26,
  peasant: 0.52,
  ninjaMonk: 1.0,
  wanderer: 0.31,
  lightningMage: 0.14,
  kitsune: 0.37,
  karasu: 2.69,
  yamabushi: 3.06,
  werewolf: 1.45,
  minotaur: 3.06,
  satyr: 0.14,
  gorgon: 1.11,
  samuraiCommander: 1.43,
  paladin: 0.51,
  cleric: 0.94,
  druid: 0.07,
  barbarian: 0.17,
  ranger: 0.25,
  warlock: 0.27,
  illusionist: 0.07,
  gunslinger: 3.06,
  shambler: 0.11,
  rifleBot: 0.41,
  mercenary: 3.06,
  mummy: 0.25,
  buccaneer: 1.54,
  wolfBard: 0.12,
  beastmaster: 0.12,
  kraken: 0.55,
  lancer: 0.7,
  reaper: 0.34,
  timeWitch: 0.23,
  arcBlade: 0.51,
  dreadPirate: 1.59,
  siegeBot: 2.06,
  priestess: 0.12,
  dragoon: 1.84,
  juggernaut: 2.48,
  sage: 1.13,
  demonSwordsman: 3.06,
  tyrant: 2.13,
};

/** Build the table (called once, on first use: `KITS` must be built first). */
export function HERO_TABLE(): Record<string, HeroKit> {
  const old = (kind: string) => KITS[kind].skill;
  /** A stamina hero: skill 1 its old skill. */
  const S = (kind: string, cost1: number, s2: Skill, cost2: number, role: string, more1: Partial<Slot> = {}, more2: Partial<Slot> = {}): HeroKit => ({
    pool: 'stamina',
    s1: { skill: old(kind), cost: cost1, tune: TUNE1[kind] ?? STAM_TUNE, ...more1 },
    s2: { skill: s2, cost: cost2, tune: TUNE2[kind] ?? 1, ...more2 },
    role,
  });
  /** A mana hero: skill 1 its old skill. */
  const M = (kind: string, cost1: number, s2: Skill, cost2: number, role: string, more1: Partial<Slot> = {}, more2: Partial<Slot> = {}): HeroKit => ({
    pool: 'mana',
    s1: { skill: old(kind), cost: cost1, tune: TUNE1[kind] ?? MANA_TUNE, ...more1 },
    s2: { skill: s2, cost: cost2, tune: TUNE2[kind] ?? 1, ...more2 },
    role,
  });
  return {
    knight: S('knight', 30, sk('Shield Bash', 'The strongest foe beside him is struck, stunned for 1.5s and shoved back a tile', 500, 'attack', shieldBash), 40, 'A wall of a man: draws the foes and bashes them back', { emergency: selfUnder(0.3), gap: 11000 }),
    samurai: S('samurai', 30, sk('Parry Stance', 'For 2.5s every melee blow on him is parried and answered with a cut', 400, 'defend', parryStance), 40, 'A duellist: dashes through a line, parries and answers'),
    kunoichi: S('kunoichi', 25, sk('Smoke Bomb', 'She cannot be targeted for 2s; foes in the smoke miss half their blows for 3s, and her next blow crits', 400, 'attack2', smokeBomb), 40, 'Blinks behind the weak, vanishes in smoke', {}, { emergency: smokeNeeded }),
    archer: S('archer', 30, sk('Pinning Shot', 'The farthest foe in reach is pinned for 2s and takes a quarter more from shots for 4s', 600, 'attack', pinningShot), 40, 'A sniper: volleys from the heights, pins the far ones'),
    wizard: M('wizard', 50, sk('Wildfire', 'Every burning foe erupts: its 3x3 is hurt and set alight, so fire runs through a pack', 800, 'attack', wildfire), 55, 'A pyromancer: fire that runs from foe to foe', { gap: 7000 }),
    peasant: S('peasant', 30, sk('Brace Spears', 'Pikes on the three tiles in front of him for 5s: a foe that steps on one is struck and stopped', 500, 'attack', braceSpears), 40, 'Formation militia: closes ranks and braces pikes'),
    ninjaMonk: S('ninjaMonk', 25, sk('Stillness Palm', 'Spends his Flow (a stack a blow on the same foe, up to five) in one palm, and the foe loses skill charge', 500, 'attack2', stillnessPalm), 40, 'A combo striker: builds his flow on one foe, then spends it'),
    wanderer: {
      pool: 'mana',
      s1: { skill: sk('Healing Draught', 'A healing draught (a quarter of its health) for a badly hurt friend; with none, Alchemist\'s Fire on the thickest 3x3', 500, 'attack', flaskToss, 'Flask Toss'), cost: 40, tune: TUNE1.wanderer ?? MANA_TUNE, heals: true, emergency: flaskNeeded, gap: 7000 },
      s2: { skill: old('wanderer'), cost: 60, tune: TUNE2.wanderer ?? 1, heals: true, emergency: hurtUnder(0.35), revive: REVIVE_FACES.wanderer },
      role: 'An alchemist: draughts for friends, firebrew for foes, an elixir for the fallen',
    },
    lightningMage: M('lightningMage', 45, sk('Overload', 'Every Charged foe discharges: hurt, stunned for 0.8s, and the bolt arcs to a foe beside it', 700, 'attack', overload), 55, 'A storm marker: lightning that marks, then sets the marks off', { onHit: charge }),
    kitsune: M('kitsune', 45, sk('Fox Guise', 'For 5s she takes the shape of the strongest foe in sight: its looks, reach and attack; foes pick her last', 600, 'attack', foxGuise), 60, 'A shapeshifter: charms a foe, or wears its shape', {}, { gap: 12000 }),
    karasu: S('karasu', 30, sk('Pilfer', 'Dives on the foe with the fullest skill meter, steals half its charge and any shield; friends near him gain pool', 450, 'attack', pilfer), 40, 'A thief: dives on the back line and robs it'),
    yamabushi: S('yamabushi', 30, sk('Turning Wind', 'The foes beside him are shoved back; for 4s, shots aimed at friends within 2 of him are blown back at the shooter for half', 500, 'attack', turningWind), 40, 'A reflector: wind that shoves foes and turns arrows'),
    werewolf: S('werewolf', 25, sk('Shift', 'Changes form: the Hunter (quicker, bites bleed) or the Brute (takes a quarter less, blows splash); Brute when badly hurt or crowded', 400, 'attack', shift), 40, 'A shapeshifter: a hunting wolf and a great brute'),
    minotaur: S('minotaur', 35, sk('Bull Rush', 'Every foe beside him is struck and shoved two tiles; one that hits something is stunned for 1.5s', 550, 'attack', bullRush), 45, 'A bulldozer: slams foes into walls and each other'),
    satyr: M('satyr', 40, sk('Pied Piper', 'The foes within 4 dance toward one spot ahead of him for 2s, bunched and not striking', 600, 'attack', piedPiper), 60, 'A lure: pipes that hasten friends and gather foes', { gap: 9000 }),
    gorgon: M('gorgon', 45, sk('Stone Garden', 'Every stunned or slowed foe within 5 turns to stone for 2s; one that dies as stone stays as a statue', 700, 'attack', stoneGarden), 60, 'A petrifier: stone foes that stay as statues'),
    samuraiCommander: S('samuraiCommander', 30, sk('Plant the Standard', 'Plants a standard for 10s: friends within 2 of it take a tenth less and hit a tenth harder while it stands', 600, 'attack2', plantStandard), 45, 'A banner-bearer: plants a standard that must be knocked down', { gap: 11000 }),
    paladin: M('paladin', 40, sk("Martyr's Vow", 'For 5s half of what his friends within 3 would take is his instead', 600, 'defend', martyrsVow), 60, 'A martyr: takes his friends\' wounds on himself'),
    cleric: {
      pool: 'mana',
      s1: { skill: sk('Guiding Bolt', 'A bolt of holy light at a foe in reach; her friends within 2 of it are healed by what it dealt', 500, 'attack', smite, 'Smite'), cost: 40, tune: TUNE1.cleric ?? MANA_TUNE },
      s2: { skill: old('cleric'), cost: 60, tune: TUNE2.cleric ?? 1, heals: true, emergency: hurtUnder(0.35), revive: REVIVE_FACES.cleric },
      role: 'A battle priest: her bolts heal, her prayers raise the fallen',
    },
    druid: M('druid', 50, sk('Wild Shape', 'For 6s she becomes a treant: a third more health, more defence, foes beside her must strike her; she heals 15% after', 700, 'attack2', treeform, 'Treeform'), 50, 'A shapeshifter: calls a treant, or becomes one; she can raise the fallen', {}, { gap: 12000, revive: REVIVE_FACES.druid }),
    barbarian: S('barbarian', 30, sk('Blood Fury', 'Paid in blood: for 4s his blows come 30% faster and drink an eighth, and he cannot fall below 1 health', 400, 'attack2', bloodFury), 25, 'A berserker: stronger the more he bleeds', {}, { hpCost: 0.1, gap: 14000 }),
    ranger: S('ranger', 30, sk('Spike Field', 'Caltrops on the 3x3 round the nearest foe for 6s: whoever stands in it is slowed and bleeds', 500, 'attack', spikeField), 45, 'A trapper: snares and fields of caltrops', { gap: 9000 }),
    warlock: M('warlock', 45, sk('Soul Siphon', 'Channels 2s on the weakest foe in reach, draining it; what he drains heals his most hurt friend', 2000, 'attack2', soulSiphon), 60, 'A leech: drinks his foes and feeds his friends'),
    illusionist: M('illusionist', 50, sk('Trade Places', 'The friend in most trouble swaps out to a safe tile, and a decoy takes its place', 400, 'attack2', tradePlaces), 70, 'A trickster: decoys, and friends swapped out of danger', { emergency: selfUnder(0.25), gap: 14000 }, { gap: 15000 }),
    gunslinger: S('gunslinger', 35, sk('Fan the Hammer', 'Three fast shots at the nearest foe in reach, then a long reload', 1900, 'attack', fanTheHammer), 45, 'A quick-draw: slugs through a line, or three fast shots'),
    shambler: S('shambler', 30, sk('Devour', 'Eats a body that fell near him: heals a fifth and grows a tenth bigger for the fight (three times at most)', 700, 'attack', devour), 40, 'A corpse-eater: rots his foes and eats the fallen'),
    rifleBot: S('rifleBot', 30, sk('Suppressing Fire', 'Fire on the three-wide lane with most foes: each is struck, slowed for 3s, and its skill stops charging', 700, 'attack2', suppressingFire), 45, 'A suppressor: bursts, and a lane of fire'),
    mercenary: S('mercenary', 30, sk('Mark for Coin', 'Throws a blade at the strongest foe and marks it for 10s: every hero deals a quarter more to it; if it dies marked he heals and his stamina fills', 400, 'attack2', markForCoin), 40, 'A bounty hunter: marks the strongest and is paid for it'),
    mummy: M('mummy', 40, sk('Puppet Strings', 'The hardest-hitting foe within 4 is bound for 3s: it walks to, and strikes, its own side', 600, 'attack2', puppetStrings), 60, 'A puppeteer: binds a foe and walks it into its friends'),
    buccaneer: S('buccaneer', 30, sk('Roll the Bones', 'Two dice: 2-4 a weak cut and he is slowed; 5-9 x1.6; 10-11 x2.2 and a bleed; doubles or 12 x3 and every friend hastened', 450, 'attack2', rollTheBones), 40, 'A gambler: hooks, and the dice', { gap: 10000 }),
    wolfBard: M('wolfBard', 40, sk('Change the Tune', 'Switches his standing song (Dirge weakens foes near, Anthem lifts friends near) and doubles it for 6s', 600, 'attack2', changeTune), 55, 'A songweaver: a standing song he switches'),
    beastmaster: S('beastmaster', 35, sk("Sic 'Em", 'Every wolf of his leaps at the foe he marks: struck and slowed, and the wolves hit a quarter harder for 4s; with none, one answers', 600, 'attack2', sicEm), 40, 'A summoner: calls the pack and sets it on a foe', { gap: 9000 }),
    kraken: S('kraken', 30, sk('Flood', 'The 3x3 round him turns to shallow water for 8s, and the foes in it are slowed', 600, 'attack2', flood), 45, 'A tide-caller: drags foes in and floods the ground'),
    lancer: S('lancer', 30, sk('Wheel About', 'Rides up to 3 tiles clear of the melee and gains full Momentum (his next blow +50%)', 400, 'attack', wheelAbout), 40, 'Momentum cavalry: hits harder the further he rides'),
    reaper: S('reaper', 30, sk('Bound Soul', 'The last foe that fell near him rises as a wraith on his side for 8s, at half its health and attack', 600, 'attack2', boundSoul), 40, 'A soul harvester: the foes he reaps rise for him'),
    timeWitch: M('timeWitch', 45, sk('Rewind', 'The friend that lost most in the last 4s goes back: its health, its tile, and its new ailments gone', 600, 'attack2', rewind), 60, 'A time-bender: hastes, slows, and turns a friend\'s clock back', { gap: 9000 }, { heals: true, gap: 10000 }),
    arcBlade: S('arcBlade', 30, sk('Grounding', 'Lets go what he stored (30% of the damage he takes) as a nova round him, and heals a tenth', 450, 'attack2', grounding), 40, 'A capacitor: stores the blows he takes and lets them go'),
    dreadPirate: S('dreadPirate', 35, sk('Powder Keg', 'Rolls a keg to the thickest crowd; it bursts on a 3x3 and sets off every powder barrel and keg within 2', 600, 'attack2', powderKeg), 45, 'A bomber: kegs that set off the field\'s powder barrels'),
    siegeBot: S('siegeBot', 35, sk('Siege Mode', 'Anchors for 8s: cannot walk, reaches two further, shells splash and come faster', 500, 'attack2', siegeMode), 40, 'A stance turret: anchors into siege mode'),
    priestess: M('priestess', 45, sk('Death Ward', 'The friend most at risk is warded for 4s: the first blow that would fell it leaves it at 1 health and heals it 30%', 600, 'attack2', guardianAngel, 'Guardian Angel'), 50, 'A resurrector: mends the worst hurt, wards the dying and raises the fallen', { heals: true, emergency: hurtUnder(0.35) }, { heals: true, gap: 12000, revive: REVIVE_FACES.priestess }),
    dragoon: S('dragoon', 35, sk('Jump', 'She leaps out of the fight and lands on the thickest crowd: double on her mark, and the 3x3 struck and held', 400, 'attack2', jump), 45, 'A dragoon: breathes fire and jumps'),
    juggernaut: S('juggernaut', 30, sk('Raise Rampart', 'The three tiles in front of him rise into a wall for 10s that foes must walk round; the foes beside it are struck and held', 700, 'attack2', raiseRampart), 45, 'A terrain shaper: quakes, and walls out of the ground'),
    sage: M('sage', 50, sk('Font of Wisdom', 'Every friend within 4 gains 25 mana or 15 stamina', 600, 'attack2', fontOfWisdom), 55, 'A mana battery: stars, and his friends\' pools filled', {}, { gap: 8000 }),
    demonSwordsman: S('demonSwordsman', 30, sk('Blood Price', 'Paid in blood: his next three blows deal 60% more and drink 30%', 400, 'attack2', bloodPrice), 25, 'A blood pact: pays health for power', {}, { hpCost: 0.15, gap: 8000 }),
    tyrant: M('tyrant', 45, sk('Condemn', 'Marks the toughest foe for 6s: every hero goes for it and deals 20% more; if it falls, every hero gains pool', 500, 'attack2', condemn), 60, 'A condemner: names a foe for the whole party', {}, { gap: 10000 }),
  };
}
