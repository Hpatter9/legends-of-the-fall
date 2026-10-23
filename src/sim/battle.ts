// One fight, King God Castle style: the heroes are placed on the near rows while the foes wait on the far ones, then
// both sides fight on their own in real time. Time moves in fixed ticks (`TICK_MS`), so the same board and the same
// placing always play out the same. Each fighter, when free, strikes the weakest foe it can reach from where it
// stands, or else walks one tile toward the nearest it can get at. High ground and blows from the side or behind hit
// harder, and shooters reach further from high ground (Chronos's `blowMult` and `shotReach`).
//
// Pure rules: no Pixi, no DOM. The renderer reads the battle and the events each tick returns.

import { boardOk, CLIMB_COST, D, DEPLOY_ROWS, DROP_EXTRA, GROUND_COST, LAVA_BURN, makeBoard, sightClear, standable, tileAt, type Area, type At, type Board } from './board';
import { cloneBoard } from './chain';
import { twistBoard, type TwistFx } from './twists';
import { firstStep, walkFrom } from './path';
import { mixSeed, Rng } from './rng';
import { FOE_BANDS } from './foes';
import { killXp } from './levels';
import { enterPhase, PHASE2 } from './bossPhases';
import { afterBlow, CHARGE_MAX, echoSkill, undying, farOf, finishOf, frenzyOf, landArea, onKill, pierceOf, preyOf, onStrike, rageOf, rollCrit, sureFooted, tickStatus, tryCast, type Dot, type Kit, type Hot, type Trap, type Zone } from './abilities';
import { fillMana, freshSpells, settleFalls, speedOf, type SpellId, type SpellState } from './spells';
import type { SetHooks } from './relicSets';
import { kindsOf, traitEffects, type TraitEffects } from './traits';
import { fxHurt, fxKill, fxRevive, fxStart, hidden } from './equipFx';
import { mergeEffects } from './relics';
import { applyTierMods } from './tierSkills';
import { landCombo, startCombo, tickCombo, type ComboState } from './combos';
import type { EquipStats } from './equipment';
import { SPLASH_SHARE, UNITS, type Shot, type Side, type UnitDef } from './units';

export const TICK_MS = 100;
/** A fight still going after this long is lost (the foes held). */
export const TIME_LIMIT_MS = 120_000;
/** How long a fighter with nothing it can do waits before looking again. */
const WAIT_MS = 300;

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
  step?: { u: number; v: number; h: number; at: number; ms: number };
  /** The blow being swung, from when and for how long. */
  swing?: { at: number; ms: number; to: number };
  hurtAt?: number;
  /** Skill charge, 0 to `CHARGE_MAX` (heroes only). */
  charge: number;
  /** An ultimate's charge, 0 to `CHARGE_MAX` (only the heroes with an ultimate fill it). */
  charge2?: number;
  /** The skill being cast, from when and for how long. */
  cast?: { at: number; ms: number; anim: 'attack' | 'attack2' | 'defend' };
  /** Takes half damage until then (Shield Wall). */
  guardUntil?: number;
  /** Must go for this fighter until then (Shield Wall's draw). */
  taunt?: { to: number; until: number };
  /** Bleeding or burning. */
  dot?: Dot & { by: number; next: number; until: number };
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
}

interface Pending {
  at: number;
  kind: 'release' | 'land' | 'rain' | 'meteor' | 'echo' | 'combo';
  by: number;
  to: number;
  dmg: number;
  heavy: boolean;
  /** A blow that crit. */
  crit?: boolean;
  /** Where a volley or meteor falls. */
  u?: number;
  v?: number;
}

/** What hurt: a blow, a skill's strike, or burning or bleeding. */
export type HitSrc = 'blow' | 'skill' | 'dot';

export type BattleEvent =
  | { kind: 'swing'; by: number; to: number }
  | { kind: 'shot'; by: number; to: number; shot: Shot; ms: number }
  | { kind: 'hit'; by: number; to: number; dmg: number; heavy: boolean; splash: boolean; killed: boolean; src: HitSrc; high?: boolean }
  | { kind: 'skill'; by: number; name: string; ms: number }
  | { kind: 'dash'; by: number; from: At; to: At }
  | { kind: 'blink'; by: number; from: At; to: At }
  | { kind: 'area'; by: number; id: 'volley' | 'meteor'; u: number; v: number; ms: number }
  | { kind: 'arc'; from: number; to: number }
  | { kind: 'zone'; u: number; v: number; ms: number }
  | { kind: 'trap'; u: number; v: number; ms: number }
  | { kind: 'dodge'; to: number }
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
  /** A hero is promoted (merged up to `grade`): the page plays it (`promote` in the page's fx). */
  | { kind: 'promote'; to: number; grade: number }
  /** A boss changes form (`bossPhases.ts`): the fight is held for `ms` while the page plays it. */
  | { kind: 'phase'; by: number; phase: 2; line: string; ms: number }
  | { kind: 'end'; won: boolean };

export interface Battle {
  seed: number;
  board: Board;
  units: Unit[];
  phase: Phase;
  /** Time into the fight (ms). */
  t: number;
  /** The fight's own random stream (its state). */
  rng: number;
  pending: Pending[];
  /** The skills' own random stream (its state). */
  skillRng: number;
  /** Burning ground. */
  zones: Zone[];
  /** Snares laid by rangers (none until one is laid). */
  traps?: Trap[];
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
  /** Time still to hold the fight for a boss changing form (ms); nothing moves while it runs down. */
  pause?: number;
  /** Every hero's healing is multiplied by this (a calamity ascension). */
  heroHeal?: number;
  /** The five-hero combo this fight has, when the placed heroes make one (`combos.ts`). */
  combo?: ComboState;
}

export const defOf = (u: Unit): UnitDef => UNITS[u.def];
/** A fighter's attack: its kind's, times its own multiplier. */
export const atkOf = (u: Unit): number => UNITS[u.def].atk * (u.power ?? 1) * rageOf(u);
/** A fighter's defence: its kind's, plus what its equipment adds. */
export const defenceOf = (u: Unit): number => UNITS[u.def].def + (u.eq?.def ?? 0);
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
  /** The board to fight on, ready made (an army's section of its long map, `chain.ts`); the seed's own when unset. It is copied. */
  board?: Board;
  /** The floor's twist (the tower's, `twists.ts`); none when unset. */
  twist?: TwistFx;
  /** Every hero's healing is multiplied by this (a calamity ascension). */
  heal?: number;
}
export const apart = (a: At, b: At) => Math.abs(a.u - b.u) + Math.abs(a.v - b.v);
export const tileOf = (b: Battle, a: At) => tileAt(b.board, a.u, a.v)!;
export const unitAt = (b: Battle, u: number, v: number): Unit | undefined => b.units.find((x) => x.alive && x.u === u && x.v === v);
/** Whether a tile is on the heroes' rows. */
export const isDeployTile = (v: number) => v >= D - DEPLOY_ROWS;

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
  const board = stage.board ? cloneBoard(stage.board) : makeBoard(seed, stage.area);
  const tw = stage.twist;
  if (tw) twistBoard(board, tw, seed);
  const b: Battle = { seed, board, units: [], phase: 'deploy', t: 0, rng: mixSeed(seed, 0xf167), pending: [], skillRng: mixSeed(seed, 0x5c111), zones: [], nextId: 1, spells: freshSpells(tw?.mana ? (stage.mana ?? 1) * tw.mana : stage.mana) };
  if (tw) b.twist = tw;
  if (stage.heroes) b.heroBoost = stage.heroes;
  if (tw?.heroAtk) b.heroBoost = { ...b.heroBoost, atk: (b.heroBoost?.atk ?? 1) * tw.heroAtk };
  // (the foes' boost with the twist's share in it)
  const foes: Boost | undefined = tw?.foeAtk || tw?.foeHp ? { ...stage.foes, hp: (stage.foes?.hp ?? 1) * (tw.foeHp ?? 1), atk: (stage.foes?.atk ?? 1) * (tw.foeAtk ?? 1) } : stage.foes;
  if (stage.move && stage.move !== 1) b.heroMove = stage.move;
  if (foes) b.foeBoost = foes;
  if (stage.foes?.speed && stage.foes.speed !== 1) b.foeSpeed = stage.foes.speed;
  if (stage.relics) b.relics = stage.relics;
  if (stage.heal && stage.heal !== 1) b.heroHeal = stage.heal;
  // the foes: fighters in the front row (v = DEPLOY_ROWS - 1), shooters at the back, by a side stream of the seed; each takes the
  // higher ground its row offers, and a shooter will take a perch in a row nearer the front for it
  const rng = new Rng(mixSeed(seed, 0xf0e5));
  (typeof band === 'string' ? FOE_BANDS[band] : band).forEach((id, n) => {
    const def = UNITS[id];
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
    const boss = n === 0 ? stage.boss : undefined;
    addUnit(b, id, at.u, at.v, { hp: (foes?.hp ?? 1) * (boss?.hp ?? 1), atk: (foes?.atk ?? 1) * (boss?.atk ?? 1), size: boss?.size, phase: boss?.phase, surge: boss?.surge, shield: boss?.shield });
  });
  if (tw?.ambush) ambush(b);
  return b;
}

/** An ambush: the band's last plain fighter (not the leader) stands among the heroes' back row instead. */
function ambush(b: Battle): void {
  const foes = b.units.filter((x) => x.side === 'foe');
  const who = [...foes.slice(1)].reverse().find((x) => !UNITS[x.def].shot) ?? foes[foes.length - 1];
  if (!who || foes.length < 2) return;
  const free: number[] = [];
  for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, D - 1)) && !unitAt(b, u, D - 1)) free.push(u);
  if (!free.length) return;
  who.u = free[new Rng(mixSeed(b.seed, 0xa3b5)).int(0, free.length - 1)];
  who.v = D - 1;
  who.facing = 3;
}

export function addUnit(b: Battle, defId: string, u: number, v: number, boost: Boost = {}, tag?: number): Unit {
  const def = UNITS[defId];
  const castle = def.side === 'hero' ? b.heroBoost : undefined;
  const eq = def.side === 'hero' ? boost.equip : undefined;
  const hp = Math.round(def.hp * (boost.hp ?? 1) * (castle?.hp ?? 1) * (1 + (eq?.hp ?? 0)));
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
  b.units.push(unit);
  return unit;
}

/** Whether a hero may be put on a tile: the fight hasn't begun, it's on the heroes' rows, and it's free ground. */
export function canPlace(b: Battle, defId: string, u: number, v: number, tag?: number): boolean {
  if (b.phase !== 'deploy' || UNITS[defId]?.side !== 'hero') return false;
  if (!isDeployTile(v) || !standable(tileAt(b.board, u, v))) return false;
  const there = unitAt(b, u, v);
  return !there || (tag === undefined ? there.def === defId : there.tag === tag);
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
  return true;
}

/** Fix the placed heroes' trait bonuses: attack and health now, the rest read by the hooks as the fight goes. */
function applyTraits(b: Battle): void {
  const fx = mergeEffects(traitEffects(kindsOf(b.units)), b.relics?.team ?? {});
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
  const def = defOf(me);
  const reach = me.side === 'hero' ? b.traits?.reach : undefined;
  const extra = me.eq?.range ?? 0;
  // (twists: fog shortens a shooter's range, a gale lifts every jump)
  const fog = def.shot ? b.twist?.fog ?? 0 : 0;
  const jump = b.twist?.jump ?? 0;
  if (!extra && !fog && !jump && !(reach && def.shot)) return def;
  return { ...def, range: Math.max(1, def.range + extra - fog), ...(jump ? { jump: def.jump + jump } : {}), ...(reach && def.shot ? { heightReach: (def.heightReach ?? HIGH_REACH) + reach } : {}) };
}

/** One tick of the fight. Returns what happened, for the renderer to show. */
export function stepBattle(b: Battle): BattleEvent[] {
  const out: BattleEvent[] = [];
  if (b.phase !== 'fight') return out;
  // (a boss changing form holds the whole fight)
  if (b.pause) {
    b.pause = Math.max(0, b.pause - TICK_MS);
    return out;
  }
  b.t += TICK_MS;
  const rng = new Rng(b.rng);
  out.push(...b.spells.events.splice(0));
  fillMana(b);
  settleFalls(b, out);
  // blows and shots that land now
  b.pending.sort((x, y) => x.at - y.at);
  while (b.pending.length && b.pending[0].at <= b.t) settle(b, b.pending.shift()!, out);
  tickStatus(b, out);
  for (const me of b.units) if (me.alive && me.busyUntil <= b.t) decide(b, me, rng, out);
  b.rng = rng.state;
  tickCombo(b, out);
  for (const u of b.units) if (u.alive && u.phase && !u.phase.done && u.hp <= u.maxHp * u.phase.at) enterPhase(b, u, out);
  const heroes = b.units.some((x) => x.alive && x.side === 'hero' && !defOf(x).summon);
  const foes = b.units.some((x) => x.alive && x.side === 'foe');
  if (!heroes || !foes || b.t >= TIME_LIMIT_MS) {
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
  if (p.kind === 'rain' || p.kind === 'meteor') return landArea(b, p.kind, by, p.u!, p.v!, p.dmg, out);
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
  hurt(b, by, to, p.dmg, p.heavy, false, out);
  afterBlow(b, by, to, !!p.crit, p.dmg, out);
  if (def.splash)
    for (const n of b.units)
      if (n.alive && n.side === to.side && n !== to && apart(n, to) === 1) hurt(b, by, n, Math.max(1, Math.round(p.dmg * SPLASH_SHARE)), false, true, out);
}

export function hurt(b: Battle, by: Unit, to: Unit, dmg: number, heavy: boolean, splash: boolean, out: BattleEvent[], src: HitSrc = 'blow'): void {
  if (!to.alive) return;
  const left = onStrike(b, by, to, dmg, src, splash, out);
  if (left === null) return;
  dmg = left;
  if (to.shield) {
    if (to.shield.until <= b.t) to.shield = undefined;
    else {
      const soaked = Math.min(dmg, to.shield.hp);
      to.shield.hp -= soaked;
      dmg -= soaked;
      if (to.shield.hp <= 0) to.shield = undefined;
      if (dmg <= 0) return;
    }
  }
  by.dealt = (by.dealt ?? 0) + Math.min(dmg, to.hp);
  to.hp = Math.max(0, to.hp - dmg);
  to.hurtAt = b.t;
  let killed = to.hp <= 0;
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
    by.kills = (by.kills ?? 0) + 1;
    by.slain = (by.slain ?? 0) + killXp(to);
    to.alive = false;
    to.diedAt = b.t;
    to.step = undefined;
    to.swing = undefined;
  }
  // (a blow struck from higher ground than its target's is tagged, for the page to mark)
  const high = src === 'blow' && !splash && tileOf(b, by).h > tileOf(b, to).h;
  out.push({ kind: 'hit', by: by.id, to: to.id, dmg, heavy, splash, killed, src, ...(high ? { high } : {}) });
  if (killed) {
    onKill(b, by, out);
    fxKill(b, by, to, out);
  }
}

/** What a level of height over the foe is worth to a fighter, in steps of walking: a shooter's blows and reach both grow with it. */
const PERCH_SHOOTER = 1.6;
const PERCH_MELEE = 1.2;
/** The most extra walking a fighter does, past the nearest tile it could strike from, for the sake of better footing. */
const PERCH_DETOUR = 4;
/** What a shooter adds to a tile's cost for each brute that could reach it in two steps. */
const MENACE_COST = 0.6;
/** The most a fighter walks (cost) to step up to higher ground when it could already strike. */
const PERCH_HOP = 3;

/** What standing at height `h` is worth against a foe at `hf`, in steps of walking (the blow's bonus is felt to three levels either way). */
const perchValue = (def: UnitDef, h: number, hf: number): number => (def.shot ? PERCH_SHOOTER : PERCH_MELEE) * Math.max(-3, Math.min(3, h - hf));

/** The tile a fighter that could already strike `target` first steps to, to strike from higher ground: one a step or two
 *  away that stands over where it is and still holds the target (a fighter never goes down, so it comes to rest). The tile's
 *  index, or -1 to stay and strike. */
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
  const walk = walkFrom(board, me, def.jump, blocked);
  const ht = tileOf(b, target).h;
  const now = perchValue(def, here, ht);
  let goal = -1;
  let best = 0;
  for (let i = 0; i < walk.cost.length; i++) {
    const cost = walk.cost[i];
    if (cost === 0 || cost > PERCH_HOP || board.tiles[i].h <= here) continue;
    const gain = perchValue(def, board.tiles[i].h, ht) - now - cost;
    if (gain <= best || !canStrike(board, def, { u: i % board.w, v: Math.floor(i / board.w) }, target)) continue;
    best = gain;
    goal = i;
  }
  return goal >= 0 ? firstStep(walk, goal)! : -1;
}

function decide(b: Battle, me: Unit, rng: Rng, out: BattleEvent[]): void {
  const def = strikeDef(b, me);
  me.step = undefined;
  let foes = b.units.filter((x) => x.alive && x.side !== me.side && !hidden(b, x));
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
  const inReach = foes.filter((f) => canStrike(b.board, def, me, f)).sort((x, y) => x.hp - y.hp || apart(me, x) - apart(me, y) || x.id - y.id);
  if (inReach.length) {
    const up = perchFor(b, me, def, inReach[0]);
    return up >= 0 ? stepTo(b, me, up, out) : swing(b, me, inReach[0], rng, out);
  }
  // else walk toward the nearest foe it can get a blow at
  const blocked = new Set<number>();
  for (const x of b.units) if (x.alive && x !== me) blocked.add(x.v * b.board.w + x.u);
  const walk = walkFrom(b.board, me, def.jump, blocked);
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
      let score = walk.cost[i] - perchValue(def, b.board.tiles[i].h, hf);
      for (const m of menace) if (apart({ u: i % b.board.w, v: Math.floor(i / b.board.w) }, m) <= 2) score += MENACE_COST;
      if (score < best) {
        best = score;
        goal = i;
      }
    }
    if (goal >= 0) return stepTo(b, me, firstStep(walk, goal)!, out);
  }
  // nobody can be got at from here: close in on the nearest anyway, round the others if the way is free
  const open = walkFrom(b.board, me, def.jump, new Set());
  const near = byDistance[0];
  const next = firstStep(open, near.v * b.board.w + near.u);
  if (next !== null && !blocked.has(next)) return stepTo(b, me, next, out);
  me.busyUntil = b.t + WAIT_MS;
}

function swing(b: Battle, me: Unit, to: Unit, rng: Rng, out: BattleEvent[]): void {
  const def = defOf(me);
  const way = wayTo(me, to);
  me.facing = way;
  const mult = blowMult(tileOf(b, me).h, tileOf(b, to).h, way, to.facing) * guardMult(tileOf(b, me).h, tileOf(b, to).h);
  const crit = rollCrit(b, me);
  const dmg = Math.max(1, Math.round(Math.max(1, atkOf(me) - Math.max(0, defenceOf(to) - pierceOf(me))) * mult * crit * preyOf(me, to) * farOf(me, to) * finishOf(me, to) * rng.range(0.9, 1.1)));
  const quick = speedOf(b, me) * frenzyOf(b, me) * (1 + (me.eq?.atkSpeed ?? 0));
  const atkMs = Math.round(def.atkMs / quick);
  const windup = Math.min(def.shot ? 500 : 400, Math.round(atkMs * 0.4));
  me.swing = { at: b.t, ms: windup + 250, to: to.id };
  me.busyUntil = b.t + atkMs;
  b.pending.push({ at: b.t + windup, kind: def.shot ? 'release' : 'land', by: me.id, to: to.id, dmg, heavy: mult * crit >= 1.4, crit: crit > 1 });
  out.push({ kind: 'swing', by: me.id, to: to.id });
}

function stepTo(b: Battle, me: Unit, i: number, out: BattleEvent[]): void {
  const def = defOf(me);
  const next = { u: i % b.board.w, v: Math.floor(i / b.board.w) };
  const from = tileOf(b, me);
  const to = tileOf(b, next);
  // (a sure-footed fighter climbs at no extra cost)
  const cost = def.flies ? 1 : 1 + (sureFooted(me) ? 0 : Math.max(0, to.h - from.h) * CLIMB_COST) + (to.ground ? GROUND_COST[to.ground] : 0);
  const ms = Math.round((def.moveMs * cost) / (speedOf(b, me) * (1 + (me.eq?.moveSpeed ?? 0)) * (me.side === 'hero' ? b.heroMove ?? 1 : 1) * (b.twist?.chill ?? 1)));
  me.step = { u: me.u, v: me.v, h: from.h, at: b.t, ms };
  me.facing = wayTo(me, next);
  me.u = next.u;
  me.v = next.v;
  me.busyUntil = b.t + ms;
  // lava burns whoever ends a step on it (fliers pass over)
  if (to.ground === 'lava' && !def.flies) hurt(b, me, me, Math.max(1, Math.round(me.maxHp * LAVA_BURN)), false, false, out, 'dot');
}

/** Play a fight to its end (for tests and quick checks). */
export function playOut(b: Battle): Battle {
  while (b.phase === 'fight') stepBattle(b);
  return b;
}
