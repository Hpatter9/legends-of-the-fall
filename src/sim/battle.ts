// One fight, King God Castle style: the heroes are placed on the near rows while the foes wait on the far ones, then
// both sides fight on their own in real time. Time moves in fixed ticks (`TICK_MS`), so the same board and the same
// placing always play out the same. Each fighter, when free, strikes the weakest foe it can reach from where it
// stands, or else walks one tile toward the nearest it can get at. High ground and blows from the side or behind hit
// harder, and shooters reach further from high ground (Chronos's `blowMult` and `shotReach`).
//
// Pure rules: no Pixi, no DOM. The renderer reads the battle and the events each tick returns.

import type { Rift } from './rift';
import { startRift, tickRift } from './riftBattle';
import { tickHazards } from './hazards';
import { BARREL_BLAST, boardOk, CLIMB_COST, COALS_BURN, COALS_STAND, D, DEPLOY_ROWS, DROP_EXTRA, GROUND_COST, LAVA_BURN, LAVA_STAND, makeBoard, SHRINE_HEAL, sightClear, standable, TALL_DODGE, tileAt, type Area, type At, type Board, type HazardKind, type Tile } from './board';
import { cloneBoard } from './chain';
import { weatherOf } from './weather';
import type { LayoutId } from './layouts';
import { twistBoard, type TwistFx } from './twists';
import { featuredExtra } from './dailyThemes';
import { firstStep, walkFrom } from './path';
import { mixSeed, Rng } from './rng';
import { standDecide } from './standAi';
import { duchessDue, joinDuchess, type DuchessWish } from './duchessFight';
import { FOE_BANDS, isBoss } from './foes';
import { arenaSpots } from './arenaDeploy';
import { killXp } from './levels';
import { enterPhase, PHASE2 } from './bossPhases';
import { dangerFor, dodgeStep, sigHp, tickSignatures, trySignature, type BossWarning, type SigElement, type SigState } from './bossAttacks';
import { ailCtx, AILMENT_SWITCH, fleeTile, groundSecond, groundStep, isFeared, shatterOf, tagged, type Ailment, type AilmentKey } from './ailments';
import { afterBlow, CHARGE_MAX, echoSkill, mendUnit, spawnSpiritWisp, undying, farOf, finishOf, frenzyOf, landArea, onKill, pierceOf, preyOf, onStrike, rageOf, rollCrit, sureFooted, tickStatus, tryCast, type Dot, type Kit, type Hot, type Trap, type Zone } from './abilities';
import { fillMana, freshSpells, settleFalls, speedOf, type SpellId, type SpellState } from './spells';
import type { SetHooks } from './relicSets';
import { kindsOf, traitsOf, traitEffects, type TraitEffects } from './traits';
import { fxHurt, fxKill, fxRevive, fxStart, hidden } from './equipFx';
import { mergeEffects } from './relics';
import { applyTierMods } from './tierSkills';
import { landCombo, startCombo, tickCombo, type ComboState } from './combos';
import { startDuoCombos, type DuoState } from './duoCombos';
import type { EquipStats } from './equipment';
import { heroKitOf, startPool, startUlt, ultOnDamage, type KitState } from './heroKits';
import { applyOrders, type LogEntry, type Order } from './orders';
import { tickEidolon, type EidolonFight } from './eidolons';
import { settleJump } from './kits/blades';
import { settleKeg } from './kits/shooters';
import { kitBlow, kitDeath, kitDef, kitDefence, kitQuick, kitSpare, kitStill, realHero, type KitFx, type TerrainFx } from './kits/effects';
import { SPLASH_SHARE, UNITS, type Shot, type Side, type UnitDef } from './units';
import { blastThrows, type Throws } from './kits/ranged';
import { airborne, erupt, shotWall, tickToolkit, WALL, type Aura, type Burrowing, type Wall, type WallKind } from './toolkit';

export const TICK_MS = 100;
/** The chance a walker who steps onto ice slides a tile further. */
export const ICE_SLIDE = 0.5;
/** The usual board gained two rows between the armies (a gap of 5 where 3 was); everyone's steps take this share of their time on it, so the two sides still meet about as soon as they did. */
export const USUAL_WALK = 0.75;
/** How many tiles fog takes off every shooter's range. */
export const FOG_RANGE = 1;
/** A fight still going after this long is lost (the foes held). */
export const TIME_LIMIT_MS = 120_000;
/** How long a fighter with nothing it can do waits before looking again. */
export const WAIT_MS = 300;

export interface Cabbage {
  u: number;
  v: number;
  healPercent: number;
}

export type Phase = 'deploy' | 'fight' | 'won' | 'lost';

export interface Unit {
  id: number;
  def: string;
  side: Side;
  u: number;
  v: number;
  hp: number;
  maxHp: number;
  /** 0 = +u, 1 = +v, 2 = -u, 3 = -v. */
  facing: number;
  alive: boolean;
  /** Free to act again from this time. */
  busyUntil: number;
  /** The step being walked: the tile it left, and when and for how long. */
  step?: { u: number; v: number; h: number; at: number; ms: number; arc?: number };
  /** The blow being swung, from when and for how long. */
  swing?: { at: number; ms: number; to: number };
  hurtAt?: number;
  /** Skill charge, 0 to `CHARGE_MAX` (heroes only). */
  charge: number;
  /** An ultimate's charge, 0 to `CHARGE_MAX` (only the heroes with an ultimate fill it). */
  charge2?: number;
  /** How fast this hero's ultimate meter fills, as a multiple (absent is x1): the Last Stand's heroes take `ULT_FILL.STAND`. */
  ultPace?: number;
  /** The skill being cast, from when and for how long. */
  cast?: { at: number; ms: number; anim: 'attack' | 'attack2' | 'defend' };
  /** Takes half damage until then (Shield Wall). */
  guardUntil?: number;
  /** Must go for this fighter until then (Shield Wall's draw). */
  taunt?: { to: number; until: number };
  /** Bleeding or burning: the old single damage over time. Only an old caller (or a test) sets it now; the ailment model folds it into `ail`
   *  when it next reads the fighter (`ailments.ts`). */
  dot?: Dot & { by: number; next: number; until: number };
  /** Its ailments (STATUS-FX, `ailments.ts`): burning, poisoned, frozen, bleeding, chilled, shocked, stunned, weakened, cursed, silenced, feared. */
  ail?: Ailment[];
  /** A boss's hard-control ladder (`ailments.ts`): how many in the window, when the last ends, and until when it is immune. */
  cc?: { n: number; end: number; immune?: number };
  /** No new ailment takes hold until then (a cleanse's ward). */
  wardUntil?: number;
  /** When its recent frost chills landed (three close together freeze it). */
  frost?: number[];
  /** Hasted (the king's spell) until then. */
  hasteUntil?: number;
  /** Soaks this much damage until then (the king's Shield). */
  shield?: { hp: number; until: number };
  /** Stunned, held or frozen until then (only the look reads it; `busyUntil` is what holds the fighter). */
  stunUntil?: number;
  /** Fighters a skill has called up so far this fight (a Lich King raises only so many). */
  raised?: number;
  /** Slowed (Frost Nova) until then. */
  slowUntil?: number;
  /** A frost set's first-blow chill has been dealt to it. */
  chilled?: boolean;
  /** Attack raised (Rally) until then. */
  rallyUntil?: number;
  /** Attack cut (Hex) until then (reverted when it fades). */
  weakUntil?: number;
  /** Takes extra from every blow until then (Deep Freeze). */
  brittleUntil?: number;
  /** Charmed (Kitsune) until then: fights its own side. */
  charmUntil?: number;
  /** Quickened by its kills (Werewolf): how many stack, and until when. */
  frenzy?: { n: number; until: number };
  /** Its attack raised by a war banner (Samurai Commander) until then. */
  banner?: { until: number };
  /** Healing over time (the Cleric's blessing). */
  hot?: Hot;
  /** The next time a healer's passive mends an ally. */
  mendAt?: number;
  /** The next time a bard's tune charges a friend. */
  tuneAt?: number;
  /** Its attack raised by a demon form until then (reverted when it fades). */
  form?: { until: number };
  /** Its once-a-fight rising from death has been spent. */
  undyingUsed?: boolean;
  diedAt?: number;
  /** Multiplies the kind's attack (grade, stage); absent is x1. */
  power?: number;
  /** Which of the player's roster this hero is, so two of a kind can fight side by side. */
  tag?: number;
  /** How much bigger than its kind it is drawn (a boss); absent is x1. */
  size?: number;
  /** A hero's grade above the first (2 or 3); absent is 1. Only the look reads it. */
  grade?: number;
  /** The level the hero fights at; absent is 1. An ultimate with an `unlock` level waits for it. */
  level?: number;
  /** The steps a hero has awakened (1 or 2); absent is none. Only the look reads it (the passive runs through `equip`). */
  awaken?: number;
  /** What the hero's permanent equipment adds (`equipment.ts`); absent when it wears none. */
  eq?: EquipStats;
  /** The share of its hp the hero starts the fight with (a wound carried over from the last floor of the tower); absent is whole. */
  carry?: number;
  /** The equipment abilities' counters and spent once-a-fight triggers (`equipFx.ts`). */
  fx?: Record<string, number>;
  /** Cannot be targeted until then (a Shadowcloak). */
  hideUntil?: number;
  /** What this fighter did, for its XP (`levels.ts`): damage dealt, healing done, kills made, and the XP its kills are worth. */
  dealt?: number;
  healed?: number;
  kills?: number;
  slain?: number;
  /** For a fighter a skill called up (a decoy, a treant, an imp), the unit id of the one that called it: what it does counts for its caller. */
  owner?: number;
  /** All healing it receives is multiplied by this (a holy-ground twist); absent is x1. */
  healMult?: number;
  /** A boss that changes form (`bossPhases.ts`): the share of its health it does so at, and whether it has. */
  phase?: { at: number; done: boolean; surge?: number };
  /** The kit it fights with after changing form (instead of its kind's). */
  kit?: Kit;
  /** The player's tap on this hero's portrait has queued its ultimate (the time it was applied, `orders.ts`): it fires the first time the hero is free, or lapses after `ORDER_WAIT_MS`. */
  ultOrder?: number;
  /** A hero kit's pool bookkeeping (`heroKits.ts`): when each skill was last cast, focus, winded. */
  ks?: KitState;
  /** What the hero kits leave on a fighter (`kits/effects.ts`): parries, marks, forms, stances. */
  kx?: KitFx;
  /** A sheet the fighter is drawn with instead of its own for a while (a form, a guise, a wraith's borrowed shape). Only the look reads it. */
  look?: string;
  /** A fighter a skill called up for a while: it fades at this time. */
  expires?: number;
  /** A hero of the Last Stand: the tile it guards, how far (in tiles) it may stray from it, and whether it is a tank that goes for the foes heading for the king (`standAi.ts`). */
  post?: { u: number; v: number; leash: number; tank: boolean };
  /** Electrified arrows active until then (Archer + Lightning Mage duo). */
  electrifiedUntil?: number;
  /** Trickster substitution log spent once per fight. */
  tricksterLogUsed?: boolean;
  /** Guardian emergency aegis shield spent once per fight. */
  guardianShieldUsed?: boolean;
  /** The movement toolkit (`toolkit/`, RPG-SPELLS): in the air after a launch until then (melee cannot reach it); underground while it
   *  burrows (it cannot act, be targeted or be struck, and its tile is free); an aura's guard (a share less damage taken) and attack lift. */
  air?: number;
  under?: Burrowing;
  auraGuard?: { share: number; until: number };
  auraAtk?: { mult: number; until: number };
}

/** What the Last Stand adds to a battle (`stand.ts`, `standAi.ts`): the king's unit, where he stands, and the flow fields the foes walk by. Absent in every other fight. */
export interface StandMode {
  king: number;
  at: At;
  /** The cost to reach the king from every tile, for each jump a fighter has (made when first asked for). */
  fields: Record<number, number[]>;
  /** The wave is down to its last few foes (`HUNT_AT` in `stand.ts`): the heroes leave their posts to hunt them down, and walk back after. */
  hunt?: boolean;
  /** Idle heroes gone to help where the fighting is, once a wave's foes are all in (`standHelp.ts`): a helper's id to the foe it goes for. */
  help?: Record<number, number>;
  /** An act's last foes have broken off and run for the breaches (`stand.ts`, STAND-RETREAT): they strike nobody and make for the edge. */
  flee?: boolean;
}

export interface Pending {
  at: number;
  kind: 'release' | 'land' | 'rain' | 'meteor' | 'echo' | 'combo' | 'keg' | 'jump' | 'erupt';
  /** A salvo that sets off the powder barrels where it lands (the Dread Pirate's Ghost Fleet). */
  barrels?: boolean;
  by: number;
  to: number;
  dmg: number;
  heavy: boolean;
  /** A blow that crit. */
  crit?: boolean;
  /** Where a volley or meteor falls. */
  u?: number;
  v?: number;
  /** How many tiles wider than a 3x3 a volley or judgement falls (a tier skill's reach; none for most). */
  r?: number;
  /** What the blast throws when it lands (RPG-SPELLS batch 5: the Siege Bot's shells; `kits/ranged.ts`). */
  throws?: Throws;
}

/** What hurt: a blow, a skill's strike, or burning or bleeding. */
export type HitSrc = 'blow' | 'skill' | 'dot';

export type BattleEvent =
  | { kind: 'swing'; by: number; to: number }
  | { kind: 'shot'; by: number; to: number; shot: Shot; ms: number }
  | { kind: 'hit'; by: number; to: number; dmg: number; heavy: boolean; splash: boolean; killed: boolean; src: HitSrc; high?: boolean; ail?: AilmentKey | 'shatter'; /** The Eidolon's strike (`eidolons.ts`; `by` is 0). */ eidolon?: true }
  /** An Eidolon answers the War Horn (`eidolons.ts`): its strike begins (`call`) and has struck, the rider laid (`done`). */
  | { kind: 'eidolon'; id: string; phase: 'call' | 'done' }
  /** An ailment shrugged off (resisted, a boss's ladder, a ward): the page shows "Immune". */
  | { kind: 'immune'; to: number; what: AilmentKey }
  /** A frozen fighter's ice shattered under a heavy blow (the extra hit follows, tagged `shatter`). */
  | { kind: 'shatter'; to: number }
  /** A skill is cast: `name` is the skill's fixed key (`keyOf`), what the page looks its look and sound up by; the words it shows are `skillShown`. */
  | { kind: 'skill'; by: number; name: string; ms: number }
  | { kind: 'dash'; by: number; from: At; to: At }
  | { kind: 'blink'; by: number; from: At; to: At }
  | { kind: 'area'; by: number; id: 'volley' | 'meteor'; u: number; v: number; ms: number; r?: number }
  | { kind: 'arc'; from: number; to: number; ail?: 'shock' }
  | { kind: 'zone'; u: number; v: number; ms: number; what?: 'spikes' }
  | { kind: 'trap'; u: number; v: number; ms: number }
  | { kind: 'dodge'; to: number }
  /** A powder barrel goes off at this tile (the barrel is gone after). */
  | { kind: 'boom'; u: number; v: number }
  | { kind: 'spell'; id: SpellId; u: number; v: number }
  /** A spell touches this fighter (the renderer plays the spell's sheet on it). */
  | { kind: 'spellfx'; id: SpellId; to: number }
  | { kind: 'heal'; to: number; amount: number; by?: number }
  /** A kill quickens the fighter's blows (Werewolf); `n` stacks now. */
  | { kind: 'frenzy'; by: number; n: number }
  /** A stare stiffens a foe (Gorgon). */
  | { kind: 'gaze'; by: number; to: number }
  /** A song hastens the allies near the singer (Satyr), for `ms`. */
  | { kind: 'song'; by: number; ms: number }
  /** A war banner goes up (Samurai Commander), for `ms`. */
  | { kind: 'banner'; by: number; ms: number }
  | { kind: 'haste'; to: number; ms: number }
  /** A ring of force goes out from a fighter (a tier skill's rider, a combo's blast), `reach` tiles wide. */
  | { kind: 'burst'; by: number; reach: number; tone: 'tier' | 'combo' }
  /** A combo's five begin their move (`combos.ts`): it lands `landMs` later. */
  | { kind: 'comboCast'; id: string; name: string; ms: number; landMs: number; by: number[] }
  /** The combo's move lands. */
  | { kind: 'comboLand'; id: string }
  /** A duo combo triggers between complementary heroes (`duoCombos.ts`). */
  | { kind: 'duoCombo'; id: string; name: string; heroA: number; heroB: number; title: string; harmonic: boolean; banner: string }
  /** Trickster substitution decoy log. */
  | { kind: 'decoyLog'; by: number; from: At; to: At }
  /** Yokai spirit wisp trap placed upon dodging. */
  | { kind: 'wisp'; by: number; u: number; v: number; ms: number }
  /** A hero is promoted (merged up to `grade`): the page plays it (`promote` in the page's fx). */
  | { kind: 'promote'; to: number; grade: number }
  /** A boss changes form (`bossPhases.ts`): the fight is held for `ms` while the page plays it. */
  | { kind: 'phase'; by: number; phase: 2; line: string; ms: number }
  /** The player's tap queued a hero's ultimate (`orderUltimate`), or the order lapsed unfired (the meter stays full). */
  | { kind: 'ultQueued'; by: number }
  /** Duchess the goat has wandered on to fight for the heroes (`duchessFight.ts`). */
  | { kind: 'duchess'; by: number }
  | { kind: 'ultLapse'; by: number }
  /** A fighter is drawn with another sheet (a form, a guise), or its own again (null). */
  | { kind: 'look'; by: number; sheet: string | null }
  /** Timed terrain from a kit is laid on a tile for `ms` (0: it is gone again). */
  | { kind: 'terrain'; u: number; v: number; what: TerrainFx['kind'] | WallKind; ms: number; side?: Side }
  /** The movement toolkit (RPG-SPELLS): a fighter shoved or dragged along `path` (its landing last); thrown in an arc from `from` to
   *  `land` (`peak` in levels); slammed into something; fallen `levels`; an ice wall shattered; a burrower going down (with its tunnel's
   *  `path`) or coming up; two fighters swapped; an aura raised (`at` null: round its caster). */
  | { kind: 'shove'; to: number; path: At[]; ms: number; how: 'shove' | 'drag' | 'launch' }
  | { kind: 'launch'; to: number; from: At; land: At; ms: number; peak: number }
  | { kind: 'slam'; to: number; at: At; what: 'wall' | 'unit' | 'edge' | 'barrel' | 'cliff' }
  | { kind: 'fall'; to: number; levels: number }
  | { kind: 'wallBreak'; u: number; v: number }
  | { kind: 'burrow'; by: number; phase: 'down' | 'up'; u: number; v: number; ms: number; path: At[] }
  | { kind: 'swap'; a: number; b: number }
  | { kind: 'aura'; by: number; at: At | null; reach: number; what: string; ms: number }
  /** A healer raised a fallen hero (RPG-SPELLS batch 2): the page plays its getting up. */
  | { kind: 'revive'; by: number; to: number; hp: number }
  /** A fighter a skill called up fades away (a wraith, a standard). */
  | { kind: 'fade'; to: number }
  /** A kit marks a fighter (a bounty, a condemnation, a charge, a pin, a stance) for `ms`. */
  | { kind: 'mark'; to: number; by: number; what: string; ms: number }
  /** The land acts (`hazards.ts`): a strike is told (`tell`, `ms` before it comes) or goes off, a spring wells up, the current carries walkers (`tiles` where they now stand). `id` is the hazard's place in the board's list. */
  | { kind: 'hazard'; id: number; what: HazardKind; phase: 'tell' | 'go'; tiles: number[]; ms: number }
  /** A boss's signature attack (BOSS-BIG, `bossAttacks.ts`): its windup begins with its tiles marked for `ms` (`warn`), it lands (`land`; the
   *  hits follow), or it fizzles, its boss fallen first. `n` ties the three together. */
  | { kind: 'bossSig'; phase: 'warn' | 'land' | 'fizzle'; by: number; n: number; key: string; name: string; el: SigElement; tiles: number[]; ms: number; rage: boolean }
  | { kind: 'end'; won: boolean };

export interface Battle {
  rift?: Rift;
  riftBoss?: boolean;
  /** GUARDIAN-PULSE: the corrupted guardian's own unit id, fixed as the fight starts; its Calamity pulse comes from it alone (`riftBattle.ts`). */
  riftGuardian?: number;
  seed: number;
  board: Board;
  units: Unit[];
  phase: Phase;
  /** Time into the fight (ms). */
  t: number;
  /** A heart grants more time when a fight has timed out, without rewinding its clock. */
  timeLimit?: number;
  /** The fight's own random stream (its state). */
  rng: number;
  pending: Pending[];
  /** The skills' own random stream (its state). */
  skillRng: number;
  /** Burning ground. */
  zones: Zone[];
  /** Snares laid by rangers (none until one is laid). */
  traps?: Trap[];
  /** Cabbages kicked onto tiles by Duchess's Lucky Bleat. */
  cabbages?: Cabbage[];
  nextId: number;
  /** The king's mana, spell cooldowns and meteors falling. */
  spells: SpellState;
  /** The castle's boost for every hero placed. */
  heroBoost?: Boost;
  /** How much faster every hero walks (the castle's Stable); 1 when unset. */
  heroMove?: number;
  /** The boost the foes of this fight were made with (the fighters a foe calls up take it too). */
  foeBoost?: Boost;
  /** The foes' speed multiplier (a harder army tier). */
  foeSpeed?: number;
  /** The team bonus of the placed heroes' traits, fixed when the fight starts. */
  traits?: TraitEffects;
  /** The run's relics, beyond hp and attack (in the heroes' boost): a team bonus, how long the foes wait, a revive. */
  relics?: { team: TraitEffects; first?: number; revive?: boolean; set?: SetHooks };
  /** Whether the relic's revive has been spent this fight. */
  revived?: boolean;
  /** The floor's twist (`twists.ts`), when it has one. */
  twist?: TwistFx;
  /** A themed daily's featured trait (`Stage.featured`). */
  featured?: string;
  /** Time still to hold the fight for a boss changing form (ms); nothing moves while it runs down. */
  pause?: number;
  /** Every hero's healing is multiplied by this (a calamity ascension). */
  heroHeal?: number;
  /** The five-hero combo this fight has, when the placed heroes make one (`combos.ts`). */
  combo?: ComboState;
  /** Active duo-combos tracked this fight (`duoCombos.ts`). */
  duoCombos?: DuoState[];
  /** Set only in the Last Stand: the heroes guard posts, the foes go for the king, and the fight ends with his fall. */
  stand?: StandMode;
  /** How long a step takes, as a share of its usual time: the usual board is bigger than the old one, so a stride is quicker (`USUAL_WALK`); a Calamity's board has its own balance and keeps 1. */
  walk?: number;
  /** The tiles (by index) where a powder barrel still stands. */
  barrels?: number[];
  /** Whether the board has ground that acts each second (a shrine, lava). */
  groundFx?: boolean;
  /** How many tiles the weather takes off every shooter's range (fog; `weatherOf(board)`). */
  fog?: number;
  /** Whether the heroes' ultimates fire on their own (`heroKits.ts`): unset means yes, so every headless fight (tests, the balance tools, the bots) fires them; the page sets it from the player's Auto switch (and on for auto-replay). */
  autoUlt?: boolean;
  /** The player's orders waiting for the next tick (`orders.ts`), and every order applied so far, with the king's spells: with the seed and the placing, a fight replays from it. */
  orders?: Order[];
  log?: LogEntry[];
  /** What the hero kits keep for the whole fight (set when the fight starts with a hero kit on the field): which auras are about, the bodies waiting to rise. */
  kits?: { standards?: boolean; songs?: boolean; vows?: boolean; rewind?: boolean; raise?: { by: number; foe: number }[] };
  /** Timed terrain the kits laid (a flood, a rampart, a statue), put back when it runs out. */
  terrain?: TerrainFx[];
  /** The healers' revives this wave (RPG-SPELLS batch 2, `kits/revive.ts`): the heroes raised so far (each at most once a wave, by a revive
   *  or Mass Resurrection), and how many skill revives have been cast (at most two). */
  risen?: number[];
  revives?: number;
  /** The movement toolkit's walls and auras (`toolkit/walls.ts`, `toolkit/auras.ts`; RPG-SPELLS): none until a skill raises one. */
  walls?: Wall[];
  auras?: Aura[];
  /** Duchess the goat joins this fight as it begins (`duchessFight.ts`): set when the fight is made; unset in almost every fight. */
  duchess?: true;
  /** BOSS-BIG (`bossAttacks.ts`): the bosses' signature attacks winding up (their tiles marked), each boss's own clock for them, and how
   *  many have begun this fight. None until a boss with one acts. */
  warnings?: BossWarning[];
  sigs?: Record<number, SigState>;
  sigN?: number;
  /** EIDOLONS: the Eidolon this fight may call when the War Horn is full, and its call once made (`eidolons.ts`). Unset in almost every fight. */
  eidolon?: EidolonFight;
}

export const defOf = (u: Unit): UnitDef => UNITS[u.def];
/** A fighter's attack: its kind's, times its own multiplier. */
export const atkOf = (u: Unit): number => UNITS[u.def].atk * (u.power ?? 1) * rageOf(u);
/** A fighter's defence: its kind's, plus what its equipment adds. */
export const defenceOf = (u: Unit): number => UNITS[u.def].def + (u.eq?.def ?? 0) + (u.kx?.tree ? kitDefence(u) : 0);
/** Per-fighter stat multipliers: hp and attack, and how much bigger it is drawn. */
export interface Boost {
  hp?: number;
  atk?: number;
  size?: number;
  /** A hero's grade (1 to 3), for how it is drawn. */
  grade?: number;
  /** The level the hero fights at (a kind's lasting level, or the spire's and Calamity's in-run level): it unlocks the hero's ultimate (`abilities.ts`). Unset is level 1. */
  level?: number;
  /** A hero's awakened steps (1 or 2), for how it is drawn. */
  awaken?: number;
  /** The hero's permanent equipment (`equipment.ts`): hp and attack go into its stats, the rest are read by the fight's hooks. */
  equip?: EquipStats;
  /** How much faster the foes act and walk (a harder army tier); only the foes' boost reads it. */
  speed?: number;
  /** Skill charge carried over from the run's last wave (and an ultimate's charge). */
  charge?: number;
  charge2?: number;
  /** The share of its hp a hero starts the fight with (the endless tower's wounds carry over); whole when unset. */
  carry?: number;
  /** A boss that changes form at this share of its health (`bossPhases.ts`); none when unset. */
  phase?: number;
  /** A boss's second form hits this much harder again (a harder army tier). */
  surge?: number;
  /** A boss starts the fight behind a shield of this share of its health. */
  shield?: number;
}
/** Boosts for a fight's foes: all of them by `foes`, and the first one more by `boss` (a boss stage). */
export interface Stage {
  rift?: Rift;
  riftBoss?: boolean;
  foes?: Boost;
  boss?: Boost;
  /** Every hero's boost (the castle's), multiplied into the hero's own; and how fast the king's mana fills. */
  heroes?: Boost;
  mana?: number;
  /** How much faster every hero walks (the castle's Stable); steps only, not swings. */
  move?: number;
  /** The relics' hooks (`relics.ts`), read when the fight starts. */
  relics?: { team: TraitEffects; first?: number; revive?: boolean; set?: SetHooks };
  /** The land the fight is on (`areaFor` in run.ts); the highlands when unset. */
  area?: Area;
  /** The board's size in tiles, for a board made from the seed (a calamity's fights are on a bigger one); the usual `W` x `D` when unset. */
  size?: { w: number; d: number };
  /** The board to fight on, ready made (an army's section of its long map, `chain.ts`); the seed's own when unset. It is copied. */
  board?: Board;
  /** The floor's twist (the tower's, `twists.ts`); none when unset. */
  twist?: TwistFx;
  /** Every hero's healing is multiplied by this (a calamity ascension). */
  heal?: number;
  /** Whether Duchess the goat may join (`duchessFight.ts`): rolled on the seed, always, or never (the default, so a fight made outside a run never has her). */
  duchess?: DuchessWish;
  /** A layout to lay the land in (`layouts.ts`), instead of the seed's own pick; ignored when `board` is given. */
  layout?: LayoutId;
  /** A themed daily's featured trait: its woken bonus counts double (`dailyThemes.ts`). */
  featured?: string;
}
export const apart = (a: At, b: At) => Math.abs(a.u - b.u) + Math.abs(a.v - b.v);
export const tileOf = (b: Battle, a: At) => tileAt(b.board, a.u, a.v)!;
export const unitAt = (b: Battle, u: number, v: number): Unit | undefined => b.units.find((x) => x.alive && x.u === u && x.v === v && !x.under);
/** Whether a tile is on the heroes' rows. */
export const isDeployTile = (v: number, depth = D) => v >= depth - DEPLOY_ROWS;

/** The way from one tile toward another, as a facing (the longer axis; along v when even). */
export function wayTo(a: At, b: At): number {
  const du = b.u - a.u;
  const dv = b.v - a.v;
  if (Math.abs(du) > Math.abs(dv)) return du > 0 ? 0 : 2;
  return dv > 0 ? 1 : 3;
}

/** What each level of height is worth to a blow: +15% a level above the target, -15% a level below (to three either way). */
export const HEIGHT_BLOW = 0.15;
/** A defender on higher ground also guards a little: this much less damage per level above the attacker (to three). */
export const HIGH_GUARD = 0.03;
/** How many extra tiles of reach a shooter gets per level above its target (a hero's own `heightReach` replaces it). */
export const HIGH_REACH = 0.9;

/** A blow's multiplier from height and angle: +15% a level above (to three), and from behind x1.5, the side x1.25. */
export function blowMult(hFrom: number, hTo: number, way: number, toFacing: number): number {
  const angle = way === toFacing ? 1.5 : (way + 2) % 4 === toFacing ? 1 : 1.25;
  return angle * (1 + HEIGHT_BLOW * Math.max(-3, Math.min(3, hFrom - hTo)));
}

/** What a defender's footing takes off a blow: 3% a level it stands above the attacker (to three). */
export const guardMult = (hFrom: number, hTo: number): number => 1 - HIGH_GUARD * Math.max(0, Math.min(3, hTo - hFrom));

/** How far a shooter reaches: its range, and more from high ground. */
export const shotReach = (range: number, hFrom: number, hTo: number, perStep = HIGH_REACH) => range + Math.floor(Math.max(0, hFrom - hTo) * perStep);

/** Whether a fighter of kind `def` standing at `from` can strike a foe at `to`. A blade reaches up as far as the fighter
 *  jumps, and down as far as it could drop. */
export function canStrike(board: Board, def: UnitDef, from: At, to: At): boolean {
  const d = apart(from, to);
  if (d < 1) return false;
  const hf = tileAt(board, from.u, from.v)!.h;
  const ht = tileAt(board, to.u, to.v)!.h;
  if (def.shot) return d <= shotReach(def.range, hf, ht, def.heightReach) && sightClear(board, from, to);
  return d <= def.range && ht - hf <= def.jump && hf - ht <= def.jump + DROP_EXTRA;
}

/** A fresh fight on the seed's board: the foes of `band` (a band's name in `FOE_BANDS`, or the foes' ids themselves) in their rows, no heroes placed yet. */
export function startBattle(seed: number, band: string | readonly string[] = 'skeletons', stage: Stage = {}): Battle {
  const board = stage.board ? cloneBoard(stage.board) : makeBoard(seed, stage.area, stage.size?.w, stage.size?.d, stage.layout);
  const tw = stage.twist;
  if (tw) twistBoard(board, tw, seed);
  const b: Battle = { seed, board, units: [], phase: 'deploy', t: 0, rng: mixSeed(seed, 0xf167), pending: [], skillRng: mixSeed(seed, 0x5c111), zones: [], nextId: 1, spells: freshSpells(tw?.mana ? (stage.mana ?? 1) * tw.mana : stage.mana) };
  if (tw) b.twist = tw;
  noteTerrain(b);
  if (!stage.size) b.walk = USUAL_WALK;
  // (a foggy fight: every shooter sees a tile less far; the weather is data of the board, `weather.ts`)
  if (weatherOf(board) === 'fog') b.fog = FOG_RANGE;
  if (stage.heroes) b.heroBoost = stage.heroes;
  if (tw?.heroAtk) b.heroBoost = { ...b.heroBoost, atk: (b.heroBoost?.atk ?? 1) * tw.heroAtk };
  // (the foes' boost with the twist's share in it)
  const foes: Boost | undefined = tw?.foeAtk || tw?.foeHp ? { ...stage.foes, hp: (stage.foes?.hp ?? 1) * (tw.foeHp ?? 1), atk: (stage.foes?.atk ?? 1) * (tw.foeAtk ?? 1) } : stage.foes;
  if (stage.move && stage.move !== 1) b.heroMove = stage.move;
  if (foes) b.foeBoost = foes;
  if (stage.foes?.speed && stage.foes.speed !== 1) b.foeSpeed = stage.foes.speed;
  if (stage.relics) b.relics = stage.relics;
  if (stage.featured) b.featured = stage.featured;
  if (stage.rift) { b.rift = { ...stage.rift }; b.riftBoss = stage.riftBoss; }
  if (stage.heal && stage.heal !== 1) b.heroHeal = stage.heal;
  // the foes: fighters in the front row (v = DEPLOY_ROWS - 1), shooters at the back, by a side stream of the seed; each takes the
  // higher ground its row offers, and a shooter will take a perch in a row nearer the front for it
  const rng = new Rng(mixSeed(seed, 0xf0e5));
  // (an army's boss arena: the boss starts in its middle and its band round it, `arenaDeploy.ts`; the usual rows when nothing fits)
  const ids = typeof band === 'string' ? FOE_BANDS[band] : band;
  const mid = board.arenaMid && isBoss(ids[0] ?? '') ? board.arenaMid : null;
  let bossAt: At | null = null;
  ids.forEach((id, n) => {
    const def = UNITS[id];
    const boss = n === 0 ? stage.boss : undefined;
    const boost = () => ({ hp: (foes?.hp ?? 1) * (boss?.hp ?? 1), atk: (foes?.atk ?? 1) * (boss?.atk ?? 1), size: boss?.size, phase: boss?.phase, surge: boss?.surge, shield: boss?.shield });
    if (mid) {
      const near = arenaSpots(board, (u, v) => !!unitAt(b, u, v), mid, !!def.shot, n === 0 ? null : bossAt);
      if (near.length) {
        const at = rng.pick(near);
        if (n === 0) bossAt = at;
        addUnit(b, id, at.u, at.v, boost());
        return;
      }
    }
    const rows = def.shot ? [0, 1, 2] : [DEPLOY_ROWS - 1, DEPLOY_ROWS - 2, 0];
    const spots: { u: number; v: number; score: number }[] = [];
    for (const v of rows) {
      for (let u = 0; u < board.w; u++) {
        const t = tileAt(board, u, v);
        if (!standable(t) || unitAt(b, u, v)) continue;
        // (a shooter weighs a level of height over a row; a fighter keeps to its front row, and takes its highest tile)
        spots.push({ u, v, score: def.shot ? t.h * 1.3 + [3, 1.5, 0][v] : (rows.length - rows.indexOf(v)) * 10 + t.h });
      }
      if (!def.shot && spots.length) break;
    }
    if (!spots.length) return;
    const top = Math.max(...spots.map((x) => x.score));
    const at = rng.pick(spots.filter((x) => x.score === top));
    if (n === 0) bossAt = at;
    addUnit(b, id, at.u, at.v, boost());
  });
  if (tw?.ambush) ambush(b);
  if (stage.duchess && duchessDue(seed, stage.duchess)) b.duchess = true;
  return b;
}

/** Note what the board holds that acts during the fight: the powder barrels standing, and ground that acts each second (a shrine, lava). Called when a fight starts; a test that changes the board's tiles calls it again. */
export function noteTerrain(b: Battle): void {
  const barrels: number[] = [];
  b.board.tiles.forEach((t, i) => t.barrel && barrels.push(i));
  if (barrels.length) b.barrels = barrels;
  else delete b.barrels;
  // (with the ailments on, standing still on ice chills, once a second: STATUS-FX)
  if (b.board.tiles.some((t) => t.ground === 'shrine' || t.ground === 'lava' || t.ground === 'coals' || (AILMENT_SWITCH.on && t.ground === 'ice'))) b.groundFx = true;
  else delete b.groundFx;
}

/** An ambush: the band's last plain fighter (not the leader) stands among the heroes' back row instead. */
function ambush(b: Battle): void {
  const foes = b.units.filter((x) => x.side === 'foe');
  const who = [...foes.slice(1)].reverse().find((x) => !UNITS[x.def].shot) ?? foes[foes.length - 1];
  if (!who || foes.length < 2) return;
  const free: number[] = [];
  for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, b.board.d - 1)) && !unitAt(b, u, b.board.d - 1)) free.push(u);
  if (!free.length) return;
  who.u = free[new Rng(mixSeed(b.seed, 0xa3b5)).int(0, free.length - 1)];
  who.v = b.board.d - 1;
  who.facing = 3;
}

export function addUnit(b: Battle, defId: string, u: number, v: number, boost: Boost = {}, tag?: number): Unit {
  const def = UNITS[defId];
  const castle = def.side === 'hero' ? b.heroBoost : undefined;
  const eq = def.side === 'hero' ? boost.equip : undefined;
  // (a boss with signature attacks has a little less health, BOSS-BIG's re-tune: `sigHp`)
  const hp = Math.round(def.hp * (boost.hp ?? 1) * (castle?.hp ?? 1) * (1 + (eq?.hp ?? 0)) * (def.side === 'foe' ? sigHp(defId) : 1));
  const unit: Unit = { id: b.nextId++, def: defId, side: def.side, u, v, hp, maxHp: hp, facing: def.side === 'hero' ? 3 : 1, alive: true, busyUntil: 0, charge: 0 };
  const power = (boost.atk ?? 1) * (castle?.atk ?? 1) * (1 + (eq?.atk ?? 0));
  if (power !== 1) unit.power = power;
  if (eq) unit.eq = eq;
  if (def.side === 'hero' && boost.carry !== undefined && boost.carry < 1) {
    unit.carry = Math.max(0.01, boost.carry);
    unit.hp = Math.max(1, Math.round(hp * unit.carry));
  }
  const heal = (b.twist?.heal ?? 1) * (def.side === 'hero' ? b.heroHeal ?? 1 : 1);
  if (heal !== 1) unit.healMult = heal;
  if (boost.phase && PHASE2[defId]) unit.phase = { at: boost.phase, done: false, ...(boost.surge ? { surge: boost.surge } : {}) };
  if (boost.shield) unit.shield = { hp: Math.round(hp * boost.shield), until: 1e9 };
  if (boost.size && boost.size !== 1) unit.size = boost.size;
  if (boost.grade && boost.grade > 1) {
    unit.grade = boost.grade;
    // (a hero merged up casts its tier skill: `tierSkills.ts`)
    if (def.side === 'hero') applyTierMods(unit, boost.grade);
  }
  if (boost.level && boost.level > 1) unit.level = boost.level;
  if (boost.awaken) unit.awaken = boost.awaken;
  if (tag !== undefined) unit.tag = tag;
  // (a hero's skill keeps the charge it built up in the run's last wave)
  if (boost.charge) unit.charge = Math.min(CHARGE_MAX, boost.charge);
  if (boost.charge2) unit.charge2 = Math.min(CHARGE_MAX, boost.charge2);
  // (a hero with a kit starts with its pool: stamina full, mana a part, or what it carried from the run's last wave)
  if (def.side === 'hero' && !def.summon && heroKitOf(unit)) startPool(unit, boost.charge);
  b.units.push(unit);
  return unit;
}

/** Why a hero may not be put on a tile, or null when it may: the fight has begun (`phase`), it is not a hero (`side`), the tile is off
 *  the heroes' rows or not ground (`tile`), another stands there (`taken`), or another of its kind is on the field already (`twin`:
 *  ONE-OF-EACH, `docs/notes/one-of-each.md`). */
export type PlaceBlock = 'phase' | 'side' | 'tile' | 'taken' | 'twin';
export function placeBlock(b: Battle, defId: string, u: number, v: number, tag?: number): PlaceBlock | null {
  if (b.phase !== 'deploy') return 'phase';
  if (UNITS[defId]?.side !== 'hero') return 'side';
  if (!isDeployTile(v, b.board.d) || !standable(tileAt(b.board, u, v))) return 'tile';
  const there = unitAt(b, u, v);
  if (there && !(tag === undefined ? there.def === defId : there.tag === tag)) return 'taken';
  return twinOf(b, defId, tag) ? 'twin' : null;
}

/** Whether a hero may be put on a tile: the fight hasn't begun, it's on the heroes' rows, it's free ground, and no other of its kind is on the field. */
export function canPlace(b: Battle, defId: string, u: number, v: number, tag?: number): boolean {
  return placeBlock(b, defId, u, v, tag) === null;
}

/** ONE-OF-EACH (the owner's rule: one unit of a hero on the battlefield at a time): another hero of kind `defId` on the field, placed or
 *  standing, that is not the one tagged `tag` (a run's hero moved to another tile is not its own twin). The same kind is the same hero
 *  whatever its grade, rank or awakened form (they all fight as `def`). A unit a skill called up (`owner`) and a summon kind (a wolf, a
 *  treant) are not heroes for the rule, and neither are the fallen. An untagged hero has no twin: `place` moves the one there is. */
export function twinOf(b: Battle, defId: string, tag?: number): Unit | undefined {
  if (tag === undefined || UNITS[defId]?.summon) return undefined;
  return b.units.find((x) => x.side === 'hero' && x.def === defId && x.tag !== tag && x.owner === undefined && x.alive);
}

/** Put a hero on a tile (or move it there, if it's already placed). A run's hero has a `tag` and a `boost` (its grade). */
export function place(b: Battle, defId: string, u: number, v: number, tag?: number, boost?: Boost): boolean {
  if (!canPlace(b, defId, u, v, tag)) return false;
  const placed = b.units.find((x) => x.side === 'hero' && (tag === undefined ? x.def === defId : x.tag === tag));
  if (placed) {
    placed.u = u;
    placed.v = v;
  } else addUnit(b, defId, u, v, boost, tag);
  return true;
}

/** Take a placed hero back to the bench. */
export function unplace(b: Battle, defId: string, tag?: number): boolean {
  if (b.phase !== 'deploy') return false;
  const i = b.units.findIndex((x) => x.side === 'hero' && (tag === undefined ? x.def === defId : x.tag === tag));
  if (i < 0) return false;
  b.units.splice(i, 1);
  return true;
}

export const heroesPlaced = (b: Battle) => b.units.filter((x) => x.side === 'hero' && !UNITS[x.def].summon).length;
/** Who a fighter's deeds count for: its caller, for one a skill called up; itself otherwise. */
export const creditOf = (b: Battle, u: Unit): Unit => (u.owner !== undefined ? b.units.find((x) => x.id === u.owner) ?? u : u);

/** Start the fight, if at least one hero is placed. */
export function fight(b: Battle): boolean {
  if (b.phase !== 'deploy' || !heroesPlaced(b) || !boardOk(b.board)) return false;
  b.phase = 'fight';
  applyTraits(b);
  startCombo(b);
  startDuoCombos(b);
  startKits(b);
  startRift(b);
  // (Duchess wanders on as the fight begins, in the rare fight that brings her)
  if (b.duchess) joinDuchess(b);
  return true;
}

/** The hero kits' fight-long state: set when a hero with a kit is on the field (a fight without one reads as before). */
function startKits(b: Battle): void {
  const kitted = b.units.filter((x) => heroKitOf(x));
  if (!kitted.length) return;
  b.kits = {};
  for (const x of kitted) {
    // (the ultimate's meter starts the fight part full: ULT-CHARGE)
    startUlt(x);
    if (x.def === 'lancer') x.kx ??= {};
    if (x.def === 'wolfBard' && (x.level ?? 1) >= 10) {
      (x.kx ??= {}).tune = 'dirge';
      b.kits.songs = true;
    }
    if (x.def === 'timeWitch' && (x.level ?? 1) >= 10) b.kits.rewind = true;
  }
}

/** Raise the fallen party in the same fight. Enemies, charges and spent abilities stay as they were. */
export function reviveParty(b: Battle): boolean {
  if (b.phase !== 'lost' || !heroesPlaced(b)) return false;
  for (const u of b.units) {
    if (u.side !== 'hero' || defOf(u).summon || u.alive) continue;
    u.alive = true;
    u.hp = u.maxHp;
    u.diedAt = undefined;
    u.step = undefined;
    u.swing = undefined;
    u.cast = undefined;
    u.hurtAt = undefined;
    u.busyUntil = b.t;
  }
  if (b.t >= (b.timeLimit ?? TIME_LIMIT_MS)) b.timeLimit = b.t + TIME_LIMIT_MS;
  b.phase = 'fight';
  return true;
}

/** Fix the placed heroes' trait bonuses: attack and health now, the rest read by the hooks as the fight goes. */
function applyTraits(b: Battle): void {
  let fx = mergeEffects(traitEffects(kindsOf(b.units)), b.relics?.team ?? {});
  if (b.featured) fx = mergeEffects(fx, featuredExtra(b.featured, kindsOf(b.units)));
  b.traits = fx;
  // (a war drum: the foes stand a while before they act)
  if (b.relics?.first) for (const x of b.units) if (x.side === 'foe') x.busyUntil = b.relics.first;
  if (fx.mana) b.spells.rate *= fx.mana;
  for (const x of b.units) {
    if (x.side !== 'hero') continue;
    fxStart(b, x);
    if (fx.atk) x.power = (x.power ?? 1) * fx.atk;
    if (fx.hp) {
      x.maxHp = Math.round(x.maxHp * fx.hp);
      x.hp = x.maxHp;
    }
    if (x.carry !== undefined) x.hp = Math.max(1, Math.round(x.maxHp * x.carry));
    // (a cursed floor: the heroes start the fight wounded)
    if (b.twist?.wound) x.hp = Math.max(1, Math.round(x.hp * (1 - b.twist.wound)));
  }
}

/** The kind's stats as this fighter uses them: a team's reach bonus lengthens its shots from height. */
export function strikeDef(b: Battle, me: Unit): UnitDef {
  const def = me.kx ? kitDef(b, me, defOf(me)) : defOf(me);
  const reach = me.side === 'hero' ? b.traits?.reach : undefined;
  const extra = me.eq?.range ?? 0;
  // (twists: fog shortens a shooter's range, a gale lifts every jump)
  const fog = def.shot ? (b.twist?.fog ?? 0) + (b.fog ?? 0) : 0;
  const jump = b.twist?.jump ?? 0;
  if (!extra && !fog && !jump && !(reach && def.shot)) return def;
  return { ...def, range: Math.max(1, def.range + extra - fog), ...(jump ? { jump: def.jump + jump } : {}), ...(reach && def.shot ? { heightReach: (def.heightReach ?? HIGH_REACH) + reach } : {}) };
}

/** One tick of the fight. Returns what happened, for the renderer to show. */
/** A listener on every tick's events (tools and tests only: `tools/status-fx/logs.ts` fingerprints whole fights with it). The game never sets it. */
export const battleTap: { fn?: (b: Battle, events: BattleEvent[]) => void } = {};

export function stepBattle(b: Battle): BattleEvent[] {
  const out = stepOnce(b);
  battleTap.fn?.(b, out);
  return out;
}

function stepOnce(b: Battle): BattleEvent[] {
  const out: BattleEvent[] = [];
  ailCtx.b = b;
  if (b.phase !== 'fight') return out;
  // (a boss changing form holds the whole fight)
  if (b.pause) {
    b.pause = Math.max(0, b.pause - TICK_MS);
    return out;
  }
  b.t += TICK_MS;
  const rng = new Rng(b.rng);
  out.push(...b.spells.events.splice(0));
  // (the player's taps since the last tick are applied now, so each is tied to a tick and the fight replays)
  if (b.orders?.length || b.units.some((x) => x.ultOrder !== undefined)) applyOrders(b, out);
  // (an Eidolon's riders run on after its call: the warmth wears off, the drain heals; EIDOLONS)
  if (b.eidolon?.called !== undefined) tickEidolon(b, out);
  fillMana(b);
  settleFalls(b, out);
  // blows and shots that land now
  b.pending.sort((x, y) => x.at - y.at);
  while (b.pending.length && b.pending[0].at <= b.t) settle(b, b.pending.shift()!, out);
  tickStatus(b, out);
  if (b.warnings) tickSignatures(b, out);
  if (b.walls?.length || b.auras) tickToolkit(b, out);
  tickRift(b, out);
  if (b.groundFx && b.t % 1000 === 0) groundTick(b, out);
  if (b.board.hazards) tickHazards(b, out);
  for (const me of b.units) if (me.alive && me.busyUntil <= b.t) decide(b, me, rng, out);
  b.rng = rng.state;
  tickCombo(b, out);
  for (const u of b.units) if (u.alive && u.phase && !u.phase.done && u.hp <= u.maxHp * u.phase.at) enterPhase(b, u, out);
  // (the Last Stand goes on until the king falls)
  if (b.stand) {
    if (!b.units.some((x) => x.id === b.stand!.king && x.alive)) {
      b.phase = 'lost';
      b.pending = [];
      out.push({ kind: 'end', won: false });
    }
    return out;
  }
  const heroes = b.units.some((x) => x.alive && realHero(x));
  const foes = b.units.some((x) => x.alive && x.side === 'foe');
  if (!heroes || !foes || b.t >= (b.timeLimit ?? TIME_LIMIT_MS)) {
    b.phase = heroes && !foes ? 'won' : 'lost';
    b.pending = [];
    out.push({ kind: 'end', won: b.phase === 'won' });
  }
  return out;
}

function settle(b: Battle, p: Pending, out: BattleEvent[]): void {
  const by = b.units.find((x) => x.id === p.by)!;
  const to = b.units.find((x) => x.id === p.to)!;
  const def = defOf(by);
  if (p.kind === 'keg') return settleKeg(b, p, out);
  if (p.kind === 'jump') return settleJump(b, p, out);
  if (p.kind === 'erupt') return erupt(b, p, out);
  if (p.kind === 'rain' || p.kind === 'meteor') {
    landArea(b, p.kind, by, p.u!, p.v!, p.dmg, out, p.r);
    if (p.throws) blastThrows(b, by, { u: p.u!, v: p.v! }, p.throws, out);
    if (p.barrels && b.barrels) for (const i of b.barrels.filter((i) => Math.max(Math.abs((i % b.board.w) - p.u!), Math.abs(Math.floor(i / b.board.w) - p.v!)) <= 1)) blast(b, i, out);
    return;
  }
  if (p.kind === 'combo') return landCombo(b, out);
  if (p.kind === 'echo') return by.alive ? echoSkill(b, by, p.dmg, out) : undefined;
  if (p.kind === 'release') {
    // the shot leaves the bow (or the hand); it lands a moment later wherever the target is
    if (!by.alive) return;
    const ms = 120 + apart(by, to) * 110;
    out.push({ kind: 'shot', by: by.id, to: to.id, shot: def.shot!, ms });
    b.pending.push({ ...p, kind: 'land', at: b.t + ms });
    return;
  }
  // (a sword falls with its wielder; a shot already flying still lands)
  if (!def.shot && !by.alive) return;
  let target = to;
  if (def.shot && b.twist?.gales) {
    const du = ((mixSeed(b.seed, 0x9a1e, p.at, by.id) >>> 0) % 2 === 0 ? 1 : -1) * b.twist.gales;
    const nu = Math.max(0, Math.min(b.board.w - 1, to.u + du));
    if (nu !== to.u) {
      const shifted = unitAt(b, nu, to.v);
      if (shifted) {
        target = shifted;
      } else {
        out.push({ kind: 'dodge', to: to.id });
        return;
      }
    }
  }
  // (the movement toolkit, RPG-SPELLS: a blow cannot reach a fighter in the air, or one underground; a Wall of Light stops the other
  // side's shots, and a Wind Wall turns them back on the shooter)
  if ((!def.shot && airborne(b, target)) || target.under) {
    out.push({ kind: 'dodge', to: target.id });
    return;
  }
  if (def.shot && b.walls?.length) {
    const wall = shotWall(b, by, target);
    if (wall === 'block') {
      out.push({ kind: 'dodge', to: target.id });
      return;
    }
    if (wall === 'back') {
      out.push({ kind: 'dodge', to: target.id });
      if (by.alive) hurt(b, by, by, Math.max(1, Math.round(p.dmg * WALL.WIND_BACK)), false, false, out, 'skill');
      return;
    }
  }
  // (a fighter in tall growth is a little hard to hit: its own hash of the moment, so no stream moves)
  if (tileOf(b, target).ground === 'tall' && (mixSeed(b.seed, 0xd0d6, p.at, by.id, target.id) >>> 0) / 4294967296 < TALL_DODGE) {
    out.push({ kind: 'dodge', to: target.id });
    if (b.traits?.yokaiWisp && traitsOf(target.def).includes('yokai')) {
      spawnSpiritWisp(b, target, out);
    }
    return;
  }
  // (only a blow that reached health counts for leech, equipment and the hero kits: SIM-001)
  if (hurt(b, by, target, p.dmg, p.heavy, false, out)) {
    afterBlow(b, by, target, !!p.crit, p.dmg, out);
    kitBlow(b, by, target, !!p.crit, p.dmg, out);
    if (by.electrifiedUntil && by.electrifiedUntil > b.t) {
      const chainTargets = b.units
        .filter((u) => u.alive && u.side === target.side && u.id !== target.id && apart(target, u) <= 2)
        .sort((x, y) => apart(target, x) - apart(target, y) || x.id - y.id)
        .slice(0, 2);
      for (const ct of chainTargets) {
        out.push({ kind: 'arc', from: target.id, to: ct.id });
        hurt(b, by, ct, Math.max(1, Math.round(p.dmg * 0.5)), false, true, out, 'skill');
      }
    }
  }
  if (def.splash)
    for (const n of b.units)
      if (n.alive && n.side === target.side && n !== target && apart(n, target) === 1) hurt(b, by, n, Math.max(1, Math.round(p.dmg * SPLASH_SHARE)), false, true, out);
}

/** Apply a hit; return whether it reached health, including a lethal hit or revival. */
export function hurt(b: Battle, by: Unit, to: Unit, dmg: number, heavy: boolean, splash: boolean, out: BattleEvent[], src: HitSrc = 'blow'): boolean {
  if (!to.alive) return false;
  // (a burrower underground is struck by nothing but its own ailments, RPG-SPELLS)
  if (to.under && src !== 'dot') return false;
  const left = onStrike(b, by, to, dmg, src, splash, out);
  if (left === null) return false;
  dmg = left;
  // (an aura's guard takes its share off, RPG-SPELLS)
  if (to.auraGuard && to.auraGuard.until > b.t) dmg = Math.max(1, Math.round(dmg * (1 - to.auraGuard.share)));
  // (a heavy blow on a frozen fighter shatters the ice: the extra lands after the blow, STATUS-FX)
  const shatter = shatterOf(b, by, to, dmg, heavy, src);
  if (to.shield) {
    if (to.shield.until <= b.t) to.shield = undefined;
    else {
      const soaked = Math.min(dmg, to.shield.hp);
      to.shield.hp -= soaked;
      dmg -= soaked;
      if (to.shield.hp <= 0) to.shield = undefined;
      if (dmg <= 0) return false;
    }
  }
  // Terrain uses the victim as its source; it earns no combat contribution (SIM-001).
  const credit = by !== to;
  const landed = Math.min(dmg, to.hp);
  if (credit) by.dealt = (by.dealt ?? 0) + landed;
  if (credit && by.kx?.lifestealUntil && by.kx.lifestealUntil > b.t && landed > 0) {
    mendUnit(by, Math.max(1, Math.round(landed * 0.3)), out, by);
  }
  // (the ultimate's meter fills from the fight: what a hero deals, its summons' share counting for it, and what it takes)
  if (by !== to) {
    if (by.side !== to.side) ultOnDamage(by.owner !== undefined ? creditOf(b, by) : by, landed, false);
    ultOnDamage(to, landed, true);
  }
  to.hp = Math.max(0, to.hp - dmg);
  to.hurtAt = b.t;
  let killed = to.hp <= 0;

  // Guardian trait milestone (three Guardians): an emergency Aegis shield the first time a hero drops below 30% health
  if (b.traits?.guardianShield && to.side === 'hero' && !to.guardianShieldUsed && to.hp < to.maxHp * 0.3 && !killed) {
    to.guardianShieldUsed = true;
    to.shield = { hp: Math.round(to.maxHp * 0.15), until: b.t + 5000 };
    out.push({ kind: 'heal', to: to.id, amount: 0 });
  }

  // Trickster trait milestone (three Tricksters): a blow that leaves a Trickster under 25% health (not a fatal one) leaves a decoy log
  // where it stood while it slips to the safest tile beside it (once a fight; no healing, so it is a dodge, not a second life)
  if (b.traits?.tricksterLog && traitsOf(to.def).includes('trickster') && !to.tricksterLogUsed && !killed && to.hp < to.maxHp * 0.25) {
    to.tricksterLogUsed = true;
    const oldU = to.u;
    const oldV = to.v;
    const adjacent = [
      { u: oldU + 1, v: oldV },
      { u: oldU - 1, v: oldV },
      { u: oldU, v: oldV + 1 },
      { u: oldU, v: oldV - 1 },
      { u: oldU + 1, v: oldV + 1 },
      { u: oldU - 1, v: oldV - 1 },
      { u: oldU + 1, v: oldV - 1 },
      { u: oldU - 1, v: oldV + 1 },
    ].filter((at) => {
      const t = tileAt(b.board, at.u, at.v);
      return t && standable(t) && !unitAt(b, at.u, at.v);
    });

    if (adjacent.length > 0) {
      const foes = b.units.filter((u) => u.alive && u.side !== to.side);
      const best = adjacent.sort((a, bPos) => {
        const distA = foes.length ? Math.min(...foes.map((f) => apart(a, f))) : 0;
        const distB = foes.length ? Math.min(...foes.map((f) => apart(bPos, f))) : 0;
        return distB - distA || a.v - bPos.v || a.u - bPos.u;
      })[0];

      to.u = best.u;
      to.v = best.v;
      to.step = undefined;

      const decoy = addUnit(b, 'decoy', oldU, oldV);
      decoy.hp = decoy.maxHp = Math.max(1, Math.round(to.maxHp * 0.3));
      decoy.expires = b.t + 3000;
      decoy.owner = to.id;

      for (const f of foes.filter((x) => apart({ u: oldU, v: oldV }, x) <= 2)) {
        f.taunt = { to: decoy.id, until: b.t + 2000 };
      }

      out.push({ kind: 'decoyLog', by: to.id, from: { u: oldU, v: oldV }, to: { u: to.u, v: to.v } });
      out.push({ kind: 'blink', by: to.id, from: { u: oldU, v: oldV }, to: { u: to.u, v: to.v } });
    }
  }
  // (a kit holds it up: Blood Fury, a guardian angel)
  if (killed && to.kx && kitSpare(b, to, out)) killed = false;
  // (a phoenix feather: the first hero to fall rises at half health)
  if (killed && to.side === 'hero' && b.relics?.revive && !b.revived) {
    b.revived = true;
    killed = false;
    to.hp = Math.max(1, Math.round(to.maxHp / 2));
    out.push({ kind: 'heal', to: to.id, amount: to.hp });
  }
  // (a rising feather: the wearer comes back once a fight)
  if (killed && to.eq && fxRevive(to, out)) killed = false;
  // (a deathless pirate: the same, from its own passive)
  if (killed && undying(to, out)) killed = false;
  if (!killed && to.eq) fxHurt(b, to, out);
  if (killed) {
    if (credit) {
      by.kills = (by.kills ?? 0) + 1;
      by.slain = (by.slain ?? 0) + killXp(to);
    }
    to.alive = false;
    to.diedAt = b.t;
    to.step = undefined;
    to.swing = undefined;
  }
  // (a blow struck from higher ground than its target's is tagged, for the page to mark)
  const high = src === 'blow' && !splash && tileOf(b, by).h > tileOf(b, to).h;
  out.push({ kind: 'hit', by: by.id, to: to.id, dmg, heavy, splash, killed, src, ...(high ? { high } : {}) });
  if (shatter && to.alive) {
    out.push({ kind: 'shatter', to: to.id });
    tagged(out, 'shatter', () => hurt(b, by, to, shatter, true, true, out, 'skill'));
  }
  if (killed && credit) {
    onKill(b, by, out);
    fxKill(b, by, to, out);
    kitDeath(b, to, by, out);
  }
  // (a blow beside a powder barrel sets it off)
  if (b.barrels && src !== 'dot') for (const i of b.barrels.filter((i) => Math.max(Math.abs((i % b.board.w) - to.u), Math.abs(Math.floor(i / b.board.w) - to.v)) <= 1)) blast(b, i, out);
  return true;
}

/** A powder barrel goes off: it is gone, whoever is within a tile of it loses `BARREL_BLAST` of their hp, and a barrel beside it goes too. */
export function blast(b: Battle, i: number, out: BattleEvent[]): void {
  const at = b.barrels?.indexOf(i) ?? -1;
  if (at < 0) return;
  b.barrels!.splice(at, 1);
  const w = b.board.w;
  const u = i % w;
  const v = Math.floor(i / w);
  delete b.board.tiles[i].barrel;
  out.push({ kind: 'boom', u, v });
  for (const x of b.units) if (x.alive && Math.max(Math.abs(x.u - u), Math.abs(x.v - v)) <= 1) hurt(b, x, x, Math.max(1, Math.round(x.maxHp * BARREL_BLAST)), false, true, out, 'dot');
  for (const j of [...(b.barrels ?? [])]) if (Math.max(Math.abs((j % w) - u), Math.abs(Math.floor(j / w) - v)) <= 1) blast(b, j, out);
}

/** Once a second: a shrine mends whoever stands on it, lava burns whoever stands in it (a flier above passes unharmed). */
function groundTick(b: Battle, out: BattleEvent[]): void {
  for (const x of b.units) {
    if (!x.alive) continue;
    const g = tileOf(b, x).ground;
    groundSecond(b, x);
    if (!x.alive) continue;
    if (g === 'shrine') mendUnit(x, x.maxHp * SHRINE_HEAL, out);
    else if (g === 'lava' && !defOf(x).flies) hurt(b, x, x, Math.max(1, Math.round(x.maxHp * LAVA_STAND)), false, false, out, 'dot');
    else if (g === 'coals' && !defOf(x).flies) hurt(b, x, x, Math.max(1, Math.round(x.maxHp * COALS_STAND)), false, false, out, 'dot');
  }
}

/** What a level of height over the foe is worth to a fighter, in steps of walking: a shooter's blows and reach both grow with it. */
const PERCH_SHOOTER = 1.6;
const PERCH_MELEE = 1.2;
/** The most extra walking a fighter does, past the nearest tile it could strike from, for the sake of better footing. */
const PERCH_DETOUR = 4;
/** What a shooter adds to a tile's cost for each brute that could reach it in two steps. */
const MENACE_COST = 0.6;
/** The most a hurt fighter walks (cost) to reach a shrine. */
const SHRINE_RUN = 5;
/** The most a fighter walks (cost) to step up to higher ground when it could already strike. */
const PERCH_HOP = 3;

/** What standing at height `h` is worth against a foe at `hf`, in steps of walking (the blow's bonus is felt to three levels either way). */
const perchValue = (def: UnitDef, h: number, hf: number): number => (def.shot ? PERCH_SHOOTER : PERCH_MELEE) * Math.max(-3, Math.min(3, h - hf));

/** The tile a fighter that could already strike `target` first steps to, to strike from higher ground: one a step or two
 *  away that stands over where it is and still holds the target (a fighter never goes down, so it comes to rest). The tile's
 *  index, or -1 to stay and strike. */
/** What the ground under a tile is worth to a fighter standing on it, in steps of walking (below zero is good): lava burns a walker, tall growth hides a shooter, a shrine mends a hurt fighter, ice may slide it off. */
function groundScore(def: UnitDef, wound: number, g: Tile['ground']): number {
  if (g === 'lava') return def.flies ? 0 : 3;
  if (g === 'coals') return def.flies ? 0 : 2;
  if (g === 'tall') return def.shot ? -0.6 : -0.2;
  if (g === 'shrine') return wound > 0.4 ? -2 : -0.3;
  if (g === 'ice') return def.flies ? 0 : 0.3;
  return 0;
}

function perchFor(b: Battle, me: Unit, def: UnitDef, target: Unit): number {
  const board = b.board;
  const here = tileOf(b, me).h;
  // (a quick look first: nothing higher within two steps, nothing to do)
  let higher = false;
  for (let dv = -2; dv <= 2 && !higher; dv++)
    for (let du = -2; du <= 2; du++) {
      if (Math.abs(du) + Math.abs(dv) > 2) continue;
      const t = tileAt(board, me.u + du, me.v + dv);
      if (t && standable(t) && t.h > here) higher = true;
    }
  if (!higher) return -1;
  const blocked = new Set<number>();
  for (const x of b.units) if (x.alive && x !== me) blocked.add(x.v * board.w + x.u);
  const walk = walkFrom(board, me, def.jump, blocked, me.side);
  const ht = tileOf(b, target).h;
  const wound = 1 - me.hp / me.maxHp;
  const now = perchValue(def, here, ht) + groundScore(def, wound, tileOf(b, me).ground);
  let goal = -1;
  let best = 0;
  for (let i = 0; i < walk.cost.length; i++) {
    const cost = walk.cost[i];
    if (cost === 0 || cost > PERCH_HOP || board.tiles[i].h <= here) continue;
    const gain = perchValue(def, board.tiles[i].h, ht) + groundScore(def, wound, board.tiles[i].ground) - now - cost;
    if (gain <= best || !canStrike(board, def, { u: i % board.w, v: Math.floor(i / board.w) }, target)) continue;
    best = gain;
    goal = i;
  }
  return goal >= 0 ? firstStep(walk, goal)! : -1;
}

function decide(b: Battle, me: Unit, rng: Rng, out: BattleEvent[]): void {
  // (a feared fighter runs from the nearest foe and strikes nobody, STATUS-FX)
  if (isFeared(b, me)) return flee(b, me, out);
  // (BOSS-BIG: a boss's great attack is marked on the ground before it lands; a fighter standing in it steps out first, and walks round it)
  const danger = b.warnings ? dangerFor(b, me) : null;
  if (danger) {
    const off = dodgeStep(b, me, danger);
    if (off >= 0) return stepTo(b, me, off, out);
  }
  // (and a boss lets its own go when one is due, `bossAttacks.ts`)
  if (me.side === 'foe' && trySignature(b, me, out)) return;
  // (the Last Stand has its own mind for heroes and foes; every other fight goes on below as it always did)
  if (b.stand && standDecide(b, me, rng, out)) return;
  const def = strikeDef(b, me);
  me.step = undefined;
  let foes = b.units.filter((x) => x.alive && x.side !== me.side && !hidden(b, x));
  // (a hero wearing a foe's guise is picked last: the foes go for any other first)
  if (b.kits && me.side !== 'hero' && foes.some((x) => x.kx?.guise)) {
    const plain = foes.filter((x) => !(x.kx?.guise && x.kx.guise.until > b.t));
    if (plain.length) foes = plain;
  }
  // a charmed fighter turns on its own side (if it has anyone left to turn on)
  if (me.charmUntil !== undefined && me.charmUntil > b.t) {
    const friends = b.units.filter((x) => x.alive && x !== me && x.side === me.side);
    if (friends.length) foes = friends;
  }
  if (!foes.length) return;
  // a taunted fighter goes for whoever drew it
  if (me.taunt) {
    const drawn = me.taunt.until > b.t ? foes.find((x) => x.id === me.taunt!.to) : undefined;
    if (drawn) foes = [drawn];
    else me.taunt = undefined;
  }
  me.cast = undefined;
  if (tryCast(b, me, out)) return;
  // strike the weakest foe in reach (first stepping up to higher ground a step or two away, if it holds the target too)
  const inReach = foes.filter((f) => canStrike(b.board, def, me, f) && !(f.air !== undefined && !def.shot && airborne(b, f))).sort((x, y) => x.hp - y.hp || apart(me, x) - apart(me, y) || x.id - y.id);
  // (a foe the Tyrant condemned is every hero's first target, when it can be reached)
  if (b.kits && me.side === 'hero') {
    const doomed = inReach.find((f) => f.kx?.condemned && f.kx.condemned.until > b.t);
    if (doomed) inReach.unshift(doomed);
  }
  // (a standard stands where it was planted, and an anchored Siege Bot does not walk)
  if (b.kits && !inReach.length && kitStill(b, me)) {
    me.busyUntil = b.t + WAIT_MS;
    return;
  }
  if (inReach.length) {
    const up = perchFor(b, me, def, inReach[0]);
    return up >= 0 ? stepTo(b, me, up, out) : swing(b, me, inReach[0], rng, out);
  }
  // else walk toward the nearest foe it can get a blow at
  const blocked = new Set<number>();
  for (const x of b.units) if (x.alive && x !== me) blocked.add(x.v * b.board.w + x.u);
  // (round a boss's marked ground, BOSS-BIG)
  if (danger) for (const i of danger) blocked.add(i);
  const walk = walkFrom(b.board, me, def.jump, blocked, me.side);
  const wound = 1 - me.hp / me.maxHp;
  // a badly hurt fighter with nobody to strike makes for a shrine close by
  if (wound > 0.4 && b.groundFx) {
    let shrine = -1;
    for (let i = 0; i < walk.cost.length; i++) if (b.board.tiles[i].ground === 'shrine' && walk.cost[i] > 0 && walk.cost[i] <= SHRINE_RUN && (shrine < 0 || walk.cost[i] < walk.cost[shrine])) shrine = i;
    if (shrine >= 0) return stepTo(b, me, firstStep(walk, shrine)!, out);
  }
  const byDistance = [...foes].sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id);
  const menace = def.shot ? foes.filter((x) => !defOf(x).shot && defOf(x).range <= 2) : [];
  for (const f of byDistance) {
    const hf = tileOf(b, f).h;
    // (the way costs steps; high ground over the foe takes off the cost of getting there, a shooter's tile under a brute's club adds to it)
    const spots: number[] = [];
    let nearest = Infinity;
    for (let i = 0; i < walk.cost.length; i++) {
      if (walk.cost[i] === Infinity || walk.cost[i] === 0 || !canStrike(b.board, def, { u: i % b.board.w, v: Math.floor(i / b.board.w) }, f)) continue;
      spots.push(i);
      nearest = Math.min(nearest, walk.cost[i]);
    }
    let goal = -1;
    let best = Infinity;
    for (const i of spots) {
      if (walk.cost[i] > nearest + PERCH_DETOUR) continue;
      let score = walk.cost[i] - perchValue(def, b.board.tiles[i].h, hf) + groundScore(def, wound, b.board.tiles[i].ground);
      for (const m of menace) if (apart({ u: i % b.board.w, v: Math.floor(i / b.board.w) }, m) <= 2) score += MENACE_COST;
      if (score < best) {
        best = score;
        goal = i;
      }
    }
    if (goal >= 0) return stepTo(b, me, firstStep(walk, goal)!, out);
  }
  // nobody can be got at from here: close in on the nearest anyway, round the others if the way is free
  const open = walkFrom(b.board, me, def.jump, new Set(), me.side);
  const near = byDistance[0];
  const next = firstStep(open, near.v * b.board.w + near.u);
  if (next !== null && !blocked.has(next)) return stepTo(b, me, next, out);
  me.busyUntil = b.t + WAIT_MS;
}

export function swing(b: Battle, me: Unit, to: Unit, rng: Rng, out: BattleEvent[]): void {
  const def = me.kx ? kitDef(b, me, defOf(me)) : defOf(me);
  const way = wayTo(me, to);
  me.facing = way;
  const mult = blowMult(tileOf(b, me).h, tileOf(b, to).h, way, to.facing) * guardMult(tileOf(b, me).h, tileOf(b, to).h);
  const crit = rollCrit(b, me);
  const dmg = Math.max(1, Math.round(Math.max(1, atkOf(me) - Math.max(0, defenceOf(to) - pierceOf(me))) * mult * crit * preyOf(me, to) * farOf(me, to) * finishOf(me, to) * rng.range(0.9, 1.1)));
  const quick = speedOf(b, me) * frenzyOf(b, me) * (1 + (me.eq?.atkSpeed ?? 0)) * (me.kx ? kitQuick(b, me) : 1);
  const atkMs = Math.round(def.atkMs / quick);
  const windup = Math.min(def.shot ? 500 : 400, Math.round(atkMs * 0.4));
  me.swing = { at: b.t, ms: windup + 250, to: to.id };
  me.busyUntil = b.t + atkMs;
  b.pending.push({ at: b.t + windup, kind: def.shot ? 'release' : 'land', by: me.id, to: to.id, dmg, heavy: mult * crit >= 1.4, crit: crit > 1 });
  out.push({ kind: 'swing', by: me.id, to: to.id });
}

export function stepTo(b: Battle, me: Unit, i: number, out: BattleEvent[]): void {
  const def = defOf(me);
  let next = { u: i % b.board.w, v: Math.floor(i / b.board.w) };
  const from = tileOf(b, me);
  let to = tileOf(b, next);
  // (a sure-footed fighter climbs at no extra cost)
  let cost = def.flies ? 1 : 1 + (sureFooted(me) ? 0 : Math.max(0, to.h - from.h) * CLIMB_COST) + (to.ground ? GROUND_COST[to.ground] : 0);
  // (ice: a walker who steps onto it may slide one tile on, if that tile is free and no higher, and not lava; a hash of the moment says, so no stream moves)
  if (to.ground === 'ice' && !def.flies && !(b.stand && me.post) && (mixSeed(b.seed, 0x1ce, b.t, me.id) >>> 0) / 4294967296 < ICE_SLIDE) {
    const on = { u: next.u + next.u - me.u, v: next.v + next.v - me.v };
    const t2 = tileAt(b.board, on.u, on.v);
    if (standable(t2) && !unitAt(b, on.u, on.v) && t2.h <= to.h && t2.ground !== 'lava') {
      next = on;
      to = t2;
      cost += 0.5;
    }
  }
  // (a lancer riding straight builds momentum: a tenth more on his next blow for each tile, to five)
  if (me.kx && me.def === 'lancer' && (me.level ?? 1) >= 10) {
    const way = wayTo(me, next);
    me.kx.momentum = me.kx.lastWay === way ? Math.min(5, (me.kx.momentum ?? 0) + 1) : 1;
    me.kx.lastWay = way;
  }
  const ms = Math.round((def.moveMs * cost) / (speedOf(b, me) * (me.kx ? kitQuick(b, me, true) : 1) * (1 + (me.eq?.moveSpeed ?? 0)) * (me.side === 'hero' ? b.heroMove ?? 1 : 1) * (b.twist?.chill ?? 1)) * (b.walk ?? 1));
  me.step = { u: me.u, v: me.v, h: from.h, at: b.t, ms };
  me.facing = wayTo(me, next);
  me.u = next.u;
  me.v = next.v;
  me.busyUntil = b.t + ms;
  // lava and hot coals burn whoever ends a step on them (fliers pass over)
  // (with the ailments on, lava's sear is half what it was and it sets the walker burning, `groundStep`)
  if (to.ground === 'lava' && !def.flies) hurt(b, me, me, Math.max(1, Math.round(me.maxHp * LAVA_BURN * (AILMENT_SWITCH.on ? 0.5 : 1))), false, false, out, 'dot');
  else if (to.ground === 'coals' && !def.flies) hurt(b, me, me, Math.max(1, Math.round(me.maxHp * COALS_BURN)), false, false, out, 'dot');
  if (me.alive) groundStep(b, me);
}

/** A feared fighter's step: a free tile next to it, further from the foes (none: it cowers where it is). */
function flee(b: Battle, me: Unit, out: BattleEvent[]): void {
  me.step = undefined;
  const def = defOf(me);
  const blocked = new Set<number>();
  for (const x of b.units) if (x.alive && x !== me) blocked.add(x.v * b.board.w + x.u);
  const walk = walkFrom(b.board, me, def.jump, blocked, me.side);
  const steps: { i: number; u: number; v: number }[] = [];
  for (let i = 0; i < walk.cost.length; i++) {
    const t = b.board.tiles[i];
    if (walk.cost[i] > 0 && walk.cost[i] <= 2 && !blocked.has(i) && t.ground !== 'lava' && t.ground !== 'coals') {
      const u = i % b.board.w;
      const v = Math.floor(i / b.board.w);
      if (Math.abs(u - me.u) + Math.abs(v - me.v) === 1) steps.push({ i, u, v });
    }
  }
  const i = fleeTile(b, me, steps);
  if (i >= 0) return stepTo(b, me, i, out);
  me.busyUntil = b.t + WAIT_MS;
}

/** Play a fight to its end (for tests and quick checks). */
export function playOut(b: Battle): Battle {
  while (b.phase === 'fight') stepBattle(b);
  return b;
}
