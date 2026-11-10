// The Assault's state besides the battle's own (phase 1, `docs/notes/assault-1.md`): the hold's structures, the garrison's posts, our
// platoons, the orders and their log, and what the field told the page this tick. It hangs on `Battle.field.hold` and is plain data, so a
// fight is its input, its seed and its log. No Pixi, no DOM.

import type { Boost } from '../battle';
import type { At } from '../board';
import type { NemSnap } from '../nemesis';
import type { GateDuel, GateDuelOut } from './gateDuel';
import type { Blueprint, FortKind, PostDef } from './blueprint';
import type { FortSpec } from './fieldMap';
import type { PlatoonFormation, TroopKind } from './troops';

/** One of the opening plan's ways over the Redwater. */
export type ApproachId = 'west' | 'bridge' | 'east';
/** A platoon's part in the War Plan (the owner's three): the main push for the gates and the throne, cover behind the main push (shooters on
 *  the ridges), or the flank round to the North Gate and the Warpath. A platoon plays its part on its own until the player orders it. */
export type PlatoonRole = 'main' | 'cover' | 'flank';

/** What the page brings to an assault: the party with its boosts, each platoon's soldiers (their marks), the plan, and the Council's
 *  members at the hold. Built from the save by `assaultMode.ts`; the sim reads nothing else. */
export interface AssaultInput {
  seed: number;
  army: string;
  /** The heroes, at most five: the kind, its boost (as an army run's), its lasting level (its soldiers scale with it) and its sheet. */
  heroes: { kind: string; boost: Boost; level: number; sheet?: string }[];
  /** Each platoon's soldiers by its hero's kind: one entry a soldier, its marks. */
  troops: Record<string, number[]>;
  /** Each platoon's approach, part and formation, by its hero's kind. */
  approaches?: Record<string, ApproachId>;
  roles?: Record<string, PlatoonRole>;
  formations?: Record<string, PlatoonFormation>;
  /** The castle's boost on every hero, and the king's mana rate. */
  castle?: Boost;
  mana?: number;
  /** The army's members of the Dark Council at the hold (the mightiest first is not needed: `councilPlaces` sorts), and the warchief if he
   *  sits (he rides to defend whichever hold is stormed, Q1). */
  council?: NemSnap[];
  warchief?: NemSnap;
  /** Phase 3: the strongest hold still standing besides this one, where the warchief rides if he flees it (none: he never flees). */
  flightTo?: string;
  /** Phase 5: the Last Hold, the one hold still standing: the whole Council left defends it, and its fall ends the War. */
  last?: boolean;
  /** The garrison's share of a wave foe's hp and attack (`ASSAULT.foeShare` unless a tool tries another). */
  foeShare?: number;
  /** Auto from the first tick: the bot plays the platoons. */
  auto?: boolean;
  /** The bot's second style (the balance tool's Tactical): it silences the drums and flies to the wall-walk. */
  tactical?: boolean;
  /** The garrison's tier: Legendary (3, the default) or Mythic (4, the Warband regrouped, phase 2's weekly re-storm). */
  tier?: number;
  /** The siege works bought at the muster (phase 1b): the platoons (by hero kind) that carry a ladder, and the one that pushes the ram. */
  siege?: { ladders?: string[]; ram?: string };
}

/** A platoon's order (3.5): attack-move, hold, charge, fall back, strike a structure, or kill one foe first. */
export type PlatoonOrder =
  | { kind: 'move'; at: At }
  | { kind: 'hold'; at: At }
  | { kind: 'charge'; at: At }
  | { kind: 'fallback'; at: At }
  | { kind: 'assault'; fort: string }
  | { kind: 'focus'; unit: number }
  /** Go round a foe to its far side, then strike it (the owner's Flank). */
  | { kind: 'flank'; unit: number }
  /** Put the platoon's ladder up against the stone wall by this tile, and climb (phase 1b). */
  | { kind: 'scale'; at: At }
  /** Loose fire arrows at a hut of the hold until it burns (phase 1b). */
  | { kind: 'fire'; hut: string }
  /** Keep the shooters on the wall-top foes round this tile: their blows land half as hard while the volleys fall (phase 1b). */
  | { kind: 'suppress'; at: At }
  /** Fetch a powder keg and set it at the foot of the wall (or the structure) by this tile (phase 2's sappers). */
  | { kind: 'plant'; at: At };

/** An order as the log keeps it: the platoon (its index), the battle time it was asked for, and what. */
export type AssaultLogEntry =
  | { t: number; p: number; kind: 'order'; order: PlatoonOrder }
  | { t: number; p: number; kind: 'formation'; to: PlatoonFormation }
  | { t: number; p: -1; kind: 'auto'; on: boolean }
  | { t: number; p: -1; kind: 'retreat' };

export interface SoldierState {
  /** The unit's id in the fight, its slot in the formation (1 to 10), its marks as it marched and the kills it made. */
  id: number;
  slot: number;
  marks: number;
  kills: number;
  /** Its place in the save's list for the platoon (so a fall is written to the right entry). */
  index: number;
}

export interface PlatoonState {
  /** Its group in the field, its hero's kind and unit id, its soldiers' kind. */
  group: number;
  hero: string;
  heroId: number;
  troop: TroopKind;
  soldiers: SoldierState[];
  /** Its waypoints still to walk (the opening plan's approach), and the order it holds. */
  route: At[];
  order: PlatoonOrder;
  formation: PlatoonFormation;
  /** Its part in the War Plan, played on its own until the player gives it an order (`manual`), or again once Auto is turned on. */
  role: PlatoonRole;
  manual?: boolean;
  /** The bot has brought it onto the host's one crossing (Auto at a hold that draws no bows, `assault.ts`'s `huddle`). */
  regrouped?: boolean;
  /** Charge: used once a platoon, and its quickening runs until this battle time. */
  charged?: boolean;
  chargeUntil?: number;
  /** When its hero went down (for the rise at the rally flag, 3.4), and how often it has risen. */
  downAt?: number;
  /** The soldier walking for the platoon while its hero is down. */
  acting?: number;
  /** Its blows counted for the Archers' volley: the battle time of each archer's last loose, by id. */
  loosed?: Record<number, number>;
  /** It carries a ladder kit not yet put up; the foot and top of the wall it scales, and when it began to raise the ladder there. */
  ladder?: boolean;
  aim?: { foot: number; top: number } | null;
  raising?: number;
}

/** A siege ladder against the stone wall (phase 1b): the two tiles it joins, its hp (the defenders push it down), the platoon that raised
 *  it, and whether it still stands. */
export interface LadderState {
  id: number;
  foot: number;
  top: number;
  hp: number;
  platoon: number;
  up: boolean;
}

/** A hut of the hold that fire arrows can set alight (phase 1b): its tiles, the fire arrows in it, until when it burns, and whether it has
 *  burnt out. */
export interface HutState {
  id: string;
  name: string;
  tiles: number[];
  fire: number;
  burning?: number;
  burnt?: boolean;
}

/** The siege works on the field (phase 1b). */
export interface SiegeState {
  ladders: LadderState[];
  /** The ram (its unit id, the platoon pushing it, when it may strike again), if one was bought. */
  ram?: { id: number; platoon: number; next: number };
  huts: HutState[];
  /** The fire arrows on their way (they land after the loose). */
  arrows: { at: number; hut: number }[];
  /** The suppressed spots this tick: each platoon's suppress order with a shooter near enough to keep it. */
  zones: At[];
  /** Phase 2's heavy works: the trebuchet loaded again at this battle time, its volley told and falling; the hits on each stretch of the
   *  stone wall; the one keg (the platoon carrying it, where it is set and when it goes off). */
  trebReady: number;
  volley?: { u: number; v: number; lands: number };
  wallHits: Record<string, number>;
  keg?: { platoon: number; at?: number; target?: number; lit?: number };
}

/** The Warpath (phase 1b): reinforcements march down it until it is held; ours have stood at its camp unopposed since `since`. */
export interface WarpathState {
  held: boolean;
  /** Its reserve camp's tents all burnt (phase 2): no more bands set out either. */
  burnt?: boolean;
  since?: number;
  /** The bands on the march (their post and when they set out). */
  marching: { post: number; ids: number[] }[];
}

export type PostMood = 'posted' | 'alerted' | 'sally' | 'routed';

/** A post's errand from the hold's reactive mind (phase 1b): to a threatened gate (where a feint draws it), a captain's or the lord's sally
 *  at a weakened platoon, the wolves riding round the flank, or a band marching down the Warpath. */
export interface PostErrand {
  kind: 'reinforce' | 'sally' | 'flank' | 'march';
  until: number;
  /** The gate it goes to, or the platoon it hunts. */
  fort?: string;
  platoon?: number;
  at?: At;
}

export interface PostState {
  def: PostDef;
  group: number;
  mood: PostMood;
  /** Its leader's place was filled from the Council (the member's id), or by a nameless Orc Chieftain. */
  council?: number;
  /** Where it goes now: its home, the nearest of ours within the hunt, the platoon it sallies at, the keep it runs for. */
  mark: At;
  /** The patrol's next waypoint. */
  loopAt?: number;
  /** The members it began with (its losses are read against this). */
  muster: number;
  /** A reinforcement band that joined it. */
  joined?: number;
  /** Its home as posted (a reinforcing post goes back to it when its own gate is struck), and its errand now. */
  origin?: At;
  errand?: PostErrand;
  /** The wolves have ridden round the flank once. */
  rode?: boolean;
}

export interface FortState {
  spec: FortSpec;
  hp: number;
  maxHp: number;
  def: number;
  broken: boolean;
  /** A sally port opened from inside on the horn (not broken: its tiles stand open). */
  open?: boolean;
  /** When it was last struck (the horn, the renderer's battered look). */
  struckAt?: number;
  /** This run’s troops have seen the weak structure closely enough to exploit it. */
  discovered?: boolean;
}

/** What the field tells the page this tick, besides the battle's own events. */
export type HoldEvent =
  | { kind: 'weakness'; fort: string }
  | { kind: 'breach'; fort: string; tiles: number[] }
  | { kind: 'fortHit'; fort: string; dmg: number; by: number }
  | { kind: 'horn' }
  | { kind: 'open'; fort: string; tiles: number[] }
  | { kind: 'silenced'; fort: string }
  | { kind: 'reinforce'; post: number; n: number }
  | { kind: 'rout'; post: number }
  | { kind: 'sally'; post: number; platoon: number }
  | { kind: 'wake'; group: number }
  | { kind: 'rise'; platoon: number; id: number }
  | { kind: 'lordFell' }
  | { kind: 'fell'; platoon: number; soldier: number; index: number }
  | { kind: 'ladder'; platoon: number; tiles: number[]; up: boolean }
  | { kind: 'burn'; hut: string }
  | { kind: 'ram'; fort: string }
  | { kind: 'feint'; post: number; fort: string }
  | { kind: 'captain'; post: number; platoon: number }
  | { kind: 'wolves'; post: number; platoon: number }
  | { kind: 'march'; post: number }
  | { kind: 'held' }
  | { kind: 'campBurnt' }
  | { kind: 'volleyTold'; tiles: number[] }
  | { kind: 'volley'; tiles: number[] }
  | { kind: 'keg'; platoon: number; state: 'carried' | 'lit' | 'boom'; tile: number }
  | { kind: 'duelCalled'; post: number; captain: number }
  | { kind: 'duelRing'; up: boolean; tiles: number[]; hero: number; captain: number }
  | { kind: 'duelOver'; out: GateDuelOut; captain: number; hero?: number }
  | { kind: 'chiefFled'; to: string; at: number }
  | { kind: 'taunt'; member: number; hero: string; unit: number };

export type AssaultOutcome = 'won' | 'lost' | 'night' | 'withdrawn';

export interface HoldState {
  bp: Blueprint;
  input: AssaultInput;
  forts: FortState[];
  /** The forts by tile (board index -> its place in `forts`), for a strike or a barrel. */
  fortAt: Map<number, number>;
  posts: PostState[];
  platoons: PlatoonState[];
  /** The lord on the throne (his unit id) and when he fell. */
  lord: number;
  lordFell?: number;
  /** The great horn has sounded (4.5), and the mind has done its work (the ports opened, the barracks woken). */
  horn?: boolean;
  hornDone?: boolean;
  /** The reinforcement bands sent so far. */
  bands: number;
  /** The one sally out at a time: the post, the platoon it is after, and when it gives up. */
  sally?: { post: number; platoon: number; until: number };
  /** A gate's crew all fallen, with one of ours inside: it opens from inside at this battle time (5.2). */
  openAt?: Record<string, number>;
  /** Auto: the bot plays the platoons. */
  auto: boolean;
  /** Orders waiting for the next tick, and every order applied (the replay). */
  queue: AssaultLogEntry[];
  log: AssaultLogEntry[];
  events: HoldEvent[];
  outcome?: AssaultOutcome;
  /** The soldiers fallen, in the order they fell (each a write to the save as it happens, 6.4). */
  fallen: { hero: string; index: number; marks: number }[];
  /** Foe kills by side, for the page's score ("Foes 143 / 200"). */
  foesTotal: number;
  /** The unit ids of the garrison's foes as placed and brought in (the 200). */
  garrison: number[];
  /** Who of ours struck the structures (a structure counts as a kill for marks): by unit id. */
  fortKills: Record<number, number>;
  /** The kind of each structure, by id (for the drums' count). */
  kinds: Record<string, FortKind>;
  /** Blows on the structures on their way (they land after the swing's windup), and the Blades' cleaves. */
  hits: { at: number; by: number; fort: number; dmg: number }[];
  cleaves: { at: number; by: number; to: number; dmg: number }[];
  /** Each soldier's blows struck (the Blades' every third), by unit id. */
  blows: Record<number, number>;
  /** The tiles the stakes strike (the ditch, the stake field): walkers keep off them when they have a choice. */
  stakes: Uint8Array;
  /** Kills by unit id (counted by `stepAssault` from the battle's own events): a soldier's marks read them. */
  kills: Record<number, number>;
  /** The soldiers already counted fallen (by unit id). */
  down: Record<number, true>;
  /** The siege works (phase 1b) and the Warpath. */
  siege: SiegeState;
  /** The Vain captain's duel at the Iron Gate (phase 3), once called. */
  duel?: GateDuel;
  /** The warchief was asked whether he flees (phase 3), and whether he did. */
  flight?: { asked: number; fled?: true };
  /** The taunts already made: a Council member's id and the hero's kind (`id:kind`), once each. */
  taunted?: string[];
  warpath: WarpathState;
  /** The lord has sallied from the throne once (phase 1b). */
  lordSallied?: boolean;
}
