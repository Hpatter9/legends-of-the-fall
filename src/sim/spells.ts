// The king's spell cards, King God Castle style: the one thing the player does during a fight. Mana fills slowly over
// the fight; a spell costs some and then has to cool down. Each spell also has a power rating (shown as pips in the spellbook; the power
// budget it once counted against went with the Schools of the Crown: `schools.ts` holds the loadout's rules now). Most work on a 3x3 of tiles; Rally, Earthquake, Battle Cry and Bulwark need no tile. `castSpell` is the only way in; it
// checks the mana, the cooldown and the tile, and leaves its events for the next tick to hand to the renderer.
//
// Pure rules: no Pixi, no DOM, no randomness (a cast does the same every time).

import { standable, tileAt } from './board';
import { CHARGE_MAX, mendUnit } from './abilities';
import { addUnit, apart, defOf, hurt, TICK_MS, unitAt, type Battle, type BattleEvent, type Unit } from './battle';
import { AILMENT_SWITCH, burnFor, charmFor, chillFor, cleanse, curseFor, freezeFor, hasAil, isFrozen, poisonFor, shockFor, stunFor, tagged, unfear, ward } from './ailments';
import { raiseWall, wallAt } from './toolkit/walls';
import { moveMany } from './toolkit/move';
import { relicFoeSlow, relicMana, relicSpeed } from './relicFight';

export type SpellId =
  | 'heal' | 'meteor' | 'haste' | 'shield' | 'chain' | 'frost' | 'rally' | 'quake' | 'smite' | 'resurrect' | 'poison'
  | 'cleanse' | 'blink' | 'hex' | 'lance' | 'renewal' | 'deepfreeze' | 'warcry' | 'bulwark' | 'wolves' | 'starfall'
  // (KING-SPELLS batch 4: the schools' new spells)
  | 'firewall' | 'icewall' | 'shatter' | 'gale' | 'thunderclap' | 'snare' | 'charm' | 'foresight' | 'sunbeam' | 'venom' | 'mirage' | 'drain' | 'bonewall' | 'raisedead';

/** The mana bar's top, and what it gains each second. */
export const MANA_MAX = 10;
/** (half of what it was: a spell is a choice, not a habit). */
export const MANA_PER_SEC = 0.5;
/** The mana a fight starts with. */
export const MANA_START = 2;

/** A hasted hero attacks and walks this much faster, for `HASTE_MS`. */
export const HASTE_MULT = 1.5;
export const HASTE_MS = 5000;
/** How long a meteor takes to fall, and the raw power it lands with (the foe's defence comes off). */
export const METEOR_MS = 900;
export const METEOR_POWER = 110;
/** The share of its health a heal gives back. */
export const HEAL_SHARE = 0.4;
/** A shield soaks this share of a hero's health, for `SHIELD_MS`. */
export const SHIELD_SHARE = 0.4;
export const SHIELD_MS = 6000;
/** Chain Lightning: raw power on the first foe, each jump this much of the one before, and how many jumps and how far. */
export const CHAIN_POWER = 70;
export const CHAIN_FALLOFF = 0.8;
export const CHAIN_JUMPS = 3;
export const CHAIN_REACH = 3;
/** Frost Nova: foes in the area stand frozen for `FREEZE_MS`, then move and strike at half speed until `SLOW_MS` from the cast. */
export const FREEZE_MS = 2000;
export const SLOW_MS = 6000;
export const SLOW_MULT = 0.5;
/** Rally: every hero's attack goes up by this much for `RALLY_MS`. */
export const RALLY_MULT = 1.25;
export const RALLY_MS = 8000;
/** Earthquake: foes standing this low or lower take this raw power. */
export const QUAKE_LOW = 1;
export const QUAKE_POWER = 60;
/** Smite: raw power on the sturdiest foe in the area. */
export const SMITE_POWER = 160;
/** Resurrect: the share of its health a fallen hero rises with. */
export const RESURRECT_SHARE = 0.5;
/** Poison Cloud: how long it lingers, how often it bites and how hard (defence does not count). */
export const POISON_MS = 6000;
export const POISON_EVERY = 1000;
export const POISON_DMG = 14;

/** Light Lance: raw power on every foe in the tapped tile's column. */
export const LANCE_POWER = 85;
/** Bulwark: every hero's shield soaks this share of its health, for `BULWARK_MS`. */
export const BULWARK_SHARE = 0.3;
export const BULWARK_MS = 6000;
/** Deep Freeze: the sturdiest foe in the area is held for `DEEPFREEZE_MS` and takes `BRITTLE_MULT` times from every blow until it thaws. */
export const DEEPFREEZE_MS = 4000;
/** Battle Cry: every hero's skill meter jumps by this much. */
export const WARCRY_CHARGE = 40;
/** Meteor Shower: five small meteors (a plus, two tiles out), one every `SHOWER_GAP` ms, each blasting a 3x3 for `SHOWER_POWER` raw. */
export const SHOWER_POWER = 55;
export const SHOWER_GAP = 300;
export const SHOWER_SPOTS: readonly (readonly [number, number])[] = [[0, 0], [-2, 0], [2, 0], [0, -2], [0, 2]];
/** Call the Wolves: this many Dire Wolves (a little tougher than the Beastmaster's) come up on free tiles in the area. */
export const WOLVES = 2;
export const WOLF_BOOST = { hp: 1.3, atk: 1.1 };
/** Cleanse: the share of its health a cleansed hero gains back. */
export const CLEANSE_HEAL = 0.15;
/** Blink: the most wounded hero leaps to the tapped tile and cannot be targeted for `BLINK_HIDE_MS`. */
export const BLINK_HIDE_MS = 1500;
/** Renewal: heroes in the area regain this share of their health every second for `RENEWAL_MS`. */
export const RENEWAL_SHARE = 0.08;
export const RENEWAL_MS = 8000;
/** Hex: foes in the area strike with this share of their attack for `HEX_MS`. */
export const HEX_MULT = 0.7;
export const HEX_MS = 8000;

export interface Spell {
  id: SpellId;
  name: string;
  text: string;
  cost: number;
  /** Before it can be cast again (ms). */
  cooldownMs: number;
  /** How strong it counts against the loadout's power budget. */
  power: number;
  /** Where it goes: the 3x3 around a tapped tile, or everywhere at once. */
  target: 'tile' | 'all';
}

const sp = (id: SpellId, name: string, text: string, cost: number, cooldownMs: number, power: number, target: 'tile' | 'all' = 'tile'): Spell => ({ id, name, text, cost, cooldownMs, power, target });

export const SPELLS: Record<SpellId, Spell> = {
  heal: sp('heal', 'Heal', 'Heroes in a 3x3 regain 40% of their health', 3, 6000, 2),
  meteor: sp('meteor', 'Meteor', 'A meteor blasts the foes in a 3x3', 5, 10000, 4),
  haste: sp('haste', 'Haste', 'Heroes in a 3x3 attack and move 50% faster for 5s', 3, 8000, 2),
  shield: sp('shield', 'Shield', 'Heroes in a 3x3 gain a shield worth 40% of their health for 6s', 3, 8000, 2),
  smite: sp('smite', 'Smite', 'A bolt of light strikes the sturdiest foe in a 3x3 for great damage', 3, 8000, 3),
  chain: sp('chain', 'Chain Lightning', 'Lightning hits a foe in a 3x3, then leaps to three more, weaker each time', 4, 9000, 3),
  poison: sp('poison', 'Poison Cloud', 'A cloud on a 3x3 poisons foes inside it for 6s', 4, 12000, 3),
  frost: sp('frost', 'Frost Nova', 'Foes in a 3x3 freeze for 2s, then move and strike at half speed', 4, 12000, 3),
  rally: sp('rally', 'Rally', 'Every hero attacks 25% harder for 8s', 4, 14000, 3, 'all'),
  quake: sp('quake', 'Earthquake', 'The ground shakes: every foe on low ground takes damage', 5, 14000, 4, 'all'),
  resurrect: sp('resurrect', 'Resurrect', 'A fallen hero in a 3x3 rises with half its health', 5, 20000, 5),
  cleanse: sp('cleanse', 'Cleanse', 'Heroes in a 3x3 shake off burns, bleeding, curses, slows, holds and charms, and regain 15% of their health', 2, 8000, 1),
  blink: sp('blink', 'Blink', 'Your most wounded hero leaps to the tapped tile and cannot be targeted for 1.5s', 3, 12000, 2),
  hex: sp('hex', 'Hex', 'Foes in a 3x3 strike 30% weaker for 8s', 3, 10000, 2),
  lance: sp('lance', 'Light Lance', 'A beam of light runs down a whole column and hits every foe in it', 4, 9000, 3),
  renewal: sp('renewal', 'Renewal', 'Heroes in a 3x3 regain 8% of their health every second for 8s', 4, 14000, 3),
  deepfreeze: sp('deepfreeze', 'Deep Freeze', 'The sturdiest foe in a 3x3 is frozen for 4s and takes 30% more from every blow', 4, 12000, 3),
  warcry: sp('warcry', 'Battle Cry', 'Every hero\'s skill meter jumps by 40', 4, 14000, 3, 'all'),
  bulwark: sp('bulwark', 'Bulwark', 'Every hero gains a shield worth 30% of its health for 6s', 5, 16000, 4, 'all'),
  wolves: sp('wolves', 'Call the Wolves', 'Two Dire Wolves come up on free tiles in a 3x3 and fight for you', 5, 20000, 4),
  starfall: sp('starfall', 'Meteor Shower', 'Five small meteors rain round the tapped tile, one after another, each blasting a 3x3', 7, 18000, 5),
  // (KING-SPELLS batch 4: the schools' new spells, docs/notes/king-spells-b4.md)
  firewall: sp('firewall', 'Wall of Fire', 'A wall of fire three tiles wide burns the foes that stand in it or cross it for 6s', 4, 12000, 3),
  icewall: sp('icewall', 'Ice Wall', 'A wall of ice three tiles wide bars the foes\' way for 6s and chills those beside it', 3, 12000, 2),
  shatter: sp('shatter', 'Shatter', 'Foes in a 3x3 take a heavy blow, twice as heavy on a frozen or chilled foe', 4, 10000, 3),
  gale: sp('gale', 'Gale', 'A gust throws the foes in a 3x3 two tiles back from your heroes', 3, 10000, 2),
  thunderclap: sp('thunderclap', 'Thunderclap', 'Thunder strikes every foe beside a hero and stuns it for 1s', 4, 12000, 3, 'all'),
  snare: sp('snare', 'Thorn Snare', 'Thorns hold the foes in a 3x3 still for 2s', 3, 12000, 2),
  charm: sp('charm', 'Charm', 'The sturdiest foe in a 3x3 (never a boss) fights for you for 4s', 4, 14000, 3),
  foresight: sp('foresight', 'Foresight', 'Heroes in a 3x3 slip from sight for 2s: no foe can single them out', 3, 12000, 2),
  sunbeam: sp('sunbeam', 'Sunbeam', 'A beam of sun runs along the tapped row and burns every foe in it', 4, 9000, 3),
  venom: sp('venom', 'Venom Fang', 'The sturdiest foe in a 3x3 is bitten and poisoned three times over', 3, 8000, 2),
  mirage: sp('mirage', 'Mirage', 'Two decoys rise on free tiles in a 3x3 and draw the foes\' blows', 3, 14000, 2),
  drain: sp('drain', 'Drain Life', 'The sturdiest foe in a 3x3 is struck, and your most wounded hero heals by the harm done', 4, 10000, 3),
  bonewall: sp('bonewall', 'Bone Wall', 'A wall of bone three tiles wide bars the foes\' way for 8s', 3, 14000, 2),
  raisedead: sp('raisedead', 'Raise Dead', 'Up to two foes that fell in a 3x3 rise as wraiths and fight for you', 5, 20000, 4),
};
export const SPELL_IDS: SpellId[] = ['heal', 'meteor', 'haste', 'shield', 'smite', 'chain', 'poison', 'frost', 'rally', 'quake', 'resurrect', 'cleanse', 'blink', 'hex', 'lance', 'renewal', 'deepfreeze', 'warcry', 'bulwark', 'wolves', 'starfall',
  'firewall', 'icewall', 'shatter', 'gale', 'thunderclap', 'snare', 'charm', 'foresight', 'sunbeam', 'venom', 'mirage', 'drain', 'bonewall', 'raisedead'];
/** The three every save starts with (and has equipped). */
export const STARTER_SPELLS: readonly SpellId[] = ['heal', 'meteor', 'haste'];
/** How many spells a run takes. */
export const LOADOUT_SIZE = 3;

/** A meteor falling, from when and onto which tile. */
export interface Fall {
  at: number;
  u: number;
  v: number;
  /** The rank's strength it lands with (1 when unset). */
  mult?: number;
  /** The raw power it lands with (a meteor's own `METEOR_POWER` when unset). */
  power?: number;
}

/** A poison cloud over the 3x3 around a tile. */
export interface Cloud {
  u: number;
  v: number;
  until: number;
  next: number;
  /** The rank's strength it bites with (1 when unset). */
  mult?: number;
}

/** The spell state a battle carries. */
export interface SpellState {
  mana: number;
  /** When each spell may next be cast. */
  ready: Record<SpellId, number>;
  falls: Fall[];
  /** Poison clouds lingering, and when each next bites. */
  clouds: Cloud[];
  /** How fast the mana fills (1 is usual; the castle's Mage Tower raises it). */
  rate: number;
  /** Events recorded between ticks, handed out by the next one. */
  events: BattleEvent[];
  /** Mana over the bar's top, kept to pour back in (`fillMana`); unset until some spills. */
  spill?: number;
  /** The ruler's Decree on this fight (KING-SPELLS batch 2, `decrees.ts`); unset when none was armed. */
  decree?: DecreeState;
  /** The fallen foes Raise Dead has already lifted (KING-SPELLS batch 4), so none rises twice. */
  risen?: number[];
  /** Each spell's rank, 1 to 3 (KING-SPELLS batch 3: the page copies the save's ranks onto the fight); unset is rank 1 for all. */
  ranks?: Partial<Record<SpellId, number>>;
  /** When a spell was last cast on its own (AUTO-CAST, `autoCast.ts`); unset until one is. */
  autoAt?: number;
}

export const freshSpells = (rate = 1): SpellState => ({ mana: MANA_START, ready: Object.fromEntries(SPELL_IDS.map((id) => [id, 0])) as Record<SpellId, number>, falls: [], clouds: [], rate, events: [] });

/** The king stands behind the meteor's blows: not on the board, so it has no side effects on the fighters. */
export const KING: Unit = { id: 0, def: 'king', side: 'hero', u: 0, v: 0, hp: 1, maxHp: 1, facing: 0, alive: true, busyUntil: 0, charge: 0 };

const inArea = (x: { u: number; v: number }, u: number, v: number) => Math.abs(x.u - u) <= 1 && Math.abs(x.v - v) <= 1;

/** Whether a hero is hasted now. */
export const isHasted = (b: Battle, x: Unit) => x.hasteUntil !== undefined && x.hasteUntil > b.t;
/** Whether a fighter is slowed (Frost Nova) now. */
export const isSlowed = (b: Battle, x: Unit) => x.slowUntil !== undefined && x.slowUntil > b.t;
/** How much faster a fighter acts now (1 when neither hasted nor slowed): it moves and swings at this speed. */
export const speedOf = (b: Battle, x: Unit) => (isHasted(b, x) ? HASTE_MULT : 1) * (isSlowed(b, x) ? SLOW_MULT : 1) * (x.side === 'hero' ? (b.traits?.speed ?? 1) * relicSpeed(b, x) : (b.foeSpeed ?? 1) * relicFoeSlow(b, x)) * (b.twist?.pace ?? 1);

/** Mana that comes in over the top of the bar is kept, up to this much more (KING-SPELLS batch 1): it waits behind the bar and pours back in as
 *  soon as a cast makes room, so a king who waits for the right moment loses nothing. */
export const SPILL_MAX = 10;

/** A ruler's Decree on a fight (KING-SPELLS batch 2; its rules and effects are in `decrees.ts`): which, how full its meter, and whether it was cast. */
export interface DecreeState {
  id: string;
  fill: number;
  used: boolean;
}
/** The Decree's meter: its top, and what feeds it (the spill one for one, three quarters of the mana spent on spells, and a trickle a second). */
export const DECREE_FULL = 8;
export const DECREE_PER_SPENT = 0.75;
export const DECREE_PER_SEC = 0.1;
/** Add to the meter (to its top); nothing when no Decree is armed or it was cast. */
export function feedDecree(b: Battle, n: number): void {
  const d = b.spells.decree;
  if (d && !d.used && n > 0) d.fill = Math.min(DECREE_FULL, Math.round((d.fill + n) * 1000) / 1000);
}

/** Mana gain for one tick; what will not fit in the bar goes to the spill, and the spill tops the bar up when there is room. With a Decree armed
 *  (KING-SPELLS batch 2) what will not fit feeds the Decree's meter instead, and the meter takes its trickle. */
export function fillMana(b: Battle): void {
  const s = b.spells;
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const total = r3(s.mana + (s.spill ?? 0) + (TICK_MS * MANA_PER_SEC * s.rate * relicMana(b)) / 1000);
  s.mana = Math.min(MANA_MAX, total);
  if (s.decree && !s.decree.used) {
    feedDecree(b, r3(total - s.mana) + (DECREE_PER_SEC * TICK_MS) / 1000);
    return;
  }
  const spill = Math.min(SPILL_MAX, r3(total - s.mana));
  if (spill > 0 || s.spill !== undefined) s.spill = spill;
}

/**
 * How hard the king's blows land (KING-SPELLS batch 1): the damage spells were flat numbers, so they faded as the foes grew with the level and
 * the tier. Now they grow with the health boost the fight's foes were made with (`Battle.foeBoost`: the army, the tier, the wave and the mode's
 * own), from `MIGHT_FROM` (about the first army's), to the power `MIGHT_POWER`. Never below 1, so the first armies, and any fight with no boost
 * (the tests' arenas), play as before. The Last Stand sets the boost wave by wave, so the king keeps pace there too.
 */
export const MIGHT_FROM = 1.4;
export const MIGHT_POWER = 0.5;
export const kingMight = (b: Battle) => Math.max(1, ((b.foeBoost?.hp ?? 1) / MIGHT_FROM) ** MIGHT_POWER);

/** The mana bar's words: the mana, and the spill waiting behind it ("10/10 +4"). */
export const manaText = (s: SpellState) => `${Math.floor(s.mana)}/${MANA_MAX}${(s.spill ?? 0) >= 1 ? ` +${Math.floor(s.spill!)}` : ''}`;

/**
 * A spell's rank (KING-SPELLS batch 3, `spellRanks.ts`): rank 2 strikes, heals and shields 20% harder and cools 15% sooner; rank 3 40% harder
 * and 30% sooner, and adds the spell's rider (`RIDERS`). Durations do not grow, bar the riders that say so.
 */
export const RANK_MAX = 3;
export const RANK_POWER = [1, 1, 1.2, 1.4] as const;
export const RANK_COOL = [1, 1, 0.85, 0.7] as const;
export const rankOf = (b: Battle, id: SpellId) => Math.max(1, Math.min(RANK_MAX, Math.floor(b.spells.ranks?.[id] ?? 1)));
/** What rank 3 adds to each spell (the spellbook's words; the rules are in `castSpell`). */
export const RIDERS: Record<SpellId, string> = {
  heal: 'also lifts every ailment from those it heals',
  meteor: 'a second, smaller meteor falls on the spot a moment later',
  haste: 'also fills each hasted hero\'s skill meter by 20',
  shield: 'the shield lasts 9s',
  smite: 'the bolt also stuns for 1s',
  chain: 'the lightning leaps once more',
  poison: 'the cloud lingers 9s',
  frost: 'the freeze lasts 3s',
  rally: 'also heals every hero 10%',
  quake: 'reaches foes one step higher',
  resurrect: 'the hero rises with 75% of its health',
  cleanse: 'also shields each hero for 15% of its health',
  blink: 'the hero cannot be targeted for 3s',
  hex: 'the hexed foes are also slowed',
  lance: 'the beam sets its foes burning',
  renewal: 'also lifts every ailment at once',
  deepfreeze: 'freezes the second sturdiest foe in the area too',
  warcry: 'the meters jump by 60',
  bulwark: 'the shields last 9s',
  wolves: 'three wolves come',
  starfall: 'seven meteors fall',
  firewall: 'the wall is five tiles wide',
  icewall: 'the wall is five tiles wide',
  shatter: 'a frozen or chilled foe takes three times as much',
  gale: 'the gust throws them three tiles',
  thunderclap: 'the stun lasts 2s',
  snare: 'the thorns hold for 3s',
  charm: 'the charm lasts 6s',
  foresight: 'they stay out of sight for 3s',
  sunbeam: 'the beam runs along three rows',
  venom: 'the bite poisons five times over',
  mirage: 'three decoys rise',
  drain: 'every hero in the area heals too',
  bonewall: 'the wall is five tiles wide',
  raisedead: 'three wraiths rise',
};
// (the sound table, `SPELL_SOUND`, `soundOf` and `withSounds`, lives in `spellSounds.ts`: the sound reads it without loading the fight's modules)
export { soundOf, SPELL_SOUND, withSounds, type BaseSpellId } from './spellSounds';
export const RIDER_SPOTS: readonly (readonly [number, number])[] = [[-2, -2], [2, 2]];

/** Milliseconds until a spell may be cast again (0 when ready). */
export const cooldownLeft = (b: Battle, id: SpellId) => Math.max(0, b.spells.ready[id] - b.t);

/** Whether a spell could be cast now (mana and cooldown; the tile is checked by `castSpell`). */
export const canAfford = (b: Battle, id: SpellId) => b.phase === 'fight' && b.spells.mana >= SPELLS[id].cost && cooldownLeft(b, id) === 0;

/** KING-SPELLS batch 4: the schools' new spells' numbers. */
export const SHATTER_POWER = 90;
export const THUNDER_POWER = 50;
export const SUNBEAM_POWER = 75;
export const VENOM_POWER = 40;
export const DRAIN_POWER = 100;
export const RISEN_BOOST = { hp: 1.3, atk: 1.1 };
/** The walls: what kind (`toolkit/walls.ts`) and how long they stand. */
export const WALLS = { firewall: { kind: 'fire', ms: 6000 }, icewall: { kind: 'ice', ms: 6000 }, bonewall: { kind: 'stone', ms: 8000 } } as const;
/** A row of tiles centred on (u, v), `half` either side, on the board. */
const rowTiles = (b: Battle, u: number, v: number, half: number) => {
  const out: { u: number; v: number }[] = [];
  for (let du = -half; du <= half; du++) if (tileAt(b.board, u + du, v)) out.push({ u: u + du, v });
  return out;
};
/** Whether a wall could stand on a tile (a fire wall may burn under a fighter). */
const wallFree = (b: Battle, at: { u: number; v: number }, onFighters: boolean) => {
  const t = tileAt(b.board, at.u, at.v);
  return !!t && standable(t) && !wallAt(b, at.u, at.v) && (onFighters || !unitAt(b, at.u, at.v)) && !(b.stand && apart(at, b.stand.at) <= 1);
};
/** The foes fallen in the 3x3 that Raise Dead could lift: not a boss or a summoned fighter, on a tile now free, and not already risen. */
export const fallenFoesIn = (b: Battle, u: number, v: number) =>
  b.units
    .filter((x) => !x.alive && x.side === 'foe' && (x.size ?? 1) <= 1 && !defOf(x).summon && inArea(x, u, v) && !b.spells.risen?.includes(x.id) && !unitAt(b, x.u, x.v))
    .sort((x, y) => apart(x, { u, v }) - apart(y, { u, v }) || x.id - y.id);

/** The foes in the 3x3 around a tile, in id order. */
const foesIn = (b: Battle, u: number, v: number) => b.units.filter((x) => x.alive && x.side === 'foe' && inArea(x, u, v));
/** The fallen hero a Resurrect on this tile would lift: the nearest in the 3x3 whose tile is free. None in the Last Stand, where the fallen stay down. */
export const fallenIn = (b: Battle, u: number, v: number) =>
  b.stand ? undefined : b.units
    .filter((x) => !x.alive && x.side === 'hero' && !defOf(x).summon && inArea(x, u, v) && !b.units.some((o) => o.alive && o.u === x.u && o.v === x.v))
    .sort((x, y) => apart(x, { u, v }) - apart(y, { u, v }) || x.id - y.id)[0];

/** The free tiles in the 3x3 around a tile that a conjured fighter could stand on, nearest first. */
const freeIn = (b: Battle, u: number, v: number) => {
  const spots: { u: number; v: number }[] = [];
  for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) if (standable(tileAt(b.board, u + du, v + dv)) && !unitAt(b, u + du, v + dv)) spots.push({ u: u + du, v: v + dv });
  return spots.sort((x, y) => apart(x, { u, v }) - apart(y, { u, v }) || x.v - y.v || x.u - y.u);
};
/** The hero Blink would move: the one with the least health left, as a share (the lowest id of equals). */
const mostWounded = (b: Battle) => b.units.filter((x) => x.alive && x.side === 'hero' && !defOf(x).summon).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];

/** A raw blow from the king, grown by the might: the foe's defence comes off. */
export const kingStrike = (b: Battle, x: Unit, power: number, heavy: boolean, out: BattleEvent[], might = kingMight(b)) => hurt(b, KING, x, Math.max(1, Math.round(power * might) - defOf(x).def), heavy, false, out, 'skill');

/** Cast a spell on the 3x3 around tile (u, v) (the tile is ignored by spells that go everywhere). False (and nothing changed) if the fight isn't on, the tile isn't on the board, the mana or cooldown isn't there, or Resurrect has nobody to lift. */
export function castSpell(b: Battle, id: SpellId, u: number, v: number): boolean {
  const spell = SPELLS[id];
  // (the Nemesis War, phase 4: the king's spells stay out of a duel)
  if (b.duel) return false;
  if (!spell || (spell.target === 'tile' && !tileAt(b.board, u, v)) || !canAfford(b, id)) return false;
  const fallen = id === 'resurrect' ? fallenIn(b, u, v) : undefined;
  if (id === 'resurrect' && !fallen) return false;
  // (Blink needs a free tile to land on and a hero to move; the wolves need room to come up)
  const leaper = id === 'blink' ? mostWounded(b) : undefined;
  if (id === 'blink' && (!leaper || !standable(tileAt(b.board, u, v)) || unitAt(b, u, v))) return false;
  const room = id === 'wolves' || id === 'mirage' ? freeIn(b, u, v) : [];
  if ((id === 'wolves' || id === 'mirage') && !room.length) return false;
  // (KING-SPELLS batch 4: a wall needs a tile to stand on; Raise Dead a foe fallen in the area to lift)
  const rk0 = rankOf(b, id);
  const wall = WALLS[id as keyof typeof WALLS];
  const wallTiles = wall ? rowTiles(b, u, v, rk0 >= RANK_MAX ? 2 : 1).filter((at) => wallFree(b, at, wall.kind === 'fire')) : [];
  if (wall && !wallTiles.length) return false;
  const corpses = id === 'raisedead' ? fallenFoesIn(b, u, v) : [];
  if (id === 'raisedead' && !corpses.length) return false;
  const s = b.spells;
  s.mana -= spell.cost;
  feedDecree(b, spell.cost * DECREE_PER_SPENT);
  // (the rank: its strength, its cooldown, and at the top its rider)
  const rk = rankOf(b, id);
  const pot = RANK_POWER[rk];
  const top = rk >= RANK_MAX;
  s.ready[id] = b.t + Math.round(spell.cooldownMs * RANK_COOL[rk]);
  s.events.push({ kind: 'spell', id, u, v });
  // (kept in the fight's log with the heroes' ultimates, so a recorded fight replays whole: `orders.ts`)
  (b.log ??= []).push({ t: b.t, kind: 'spell', id, u, v });
  const ev = s.events;
  const fx = (to: Unit) => ev.push({ kind: 'spellfx', id, to: to.id });
  switch (id) {
    case 'meteor':
      s.falls.push({ at: b.t + METEOR_MS, u, v, ...(pot !== 1 ? { mult: pot } : {}) });
      ev.push({ kind: 'area', by: 0, id: 'meteor', u, v, ms: METEOR_MS });
      if (top) {
        s.falls.push({ at: b.t + METEOR_MS + 600, u, v, power: METEOR_POWER / 2, mult: pot });
        ev.push({ kind: 'area', by: 0, id: 'meteor', u, v, ms: METEOR_MS + 600 });
      }
      break;
    case 'heal':
    case 'haste':
    case 'shield':
      for (const x of b.units) {
        if (!x.alive || x.side !== 'hero' || !inArea(x, u, v)) continue;
        if (id === 'heal') {
          const amount = Math.min(x.maxHp - x.hp, Math.round(x.maxHp * HEAL_SHARE * pot * (x.healMult ?? 1)));
          x.hp += amount;
          ev.push({ kind: 'heal', to: x.id, amount });
          if (top) cleanse(b, x);
        } else if (id === 'haste') {
          x.hasteUntil = b.t + HASTE_MS;
          ev.push({ kind: 'haste', to: x.id, ms: HASTE_MS });
          if (top) x.charge = Math.min(CHARGE_MAX, x.charge + 20);
        } else x.shield = { hp: Math.round(x.maxHp * SHIELD_SHARE * pot), until: b.t + SHIELD_MS * (top ? 1.5 : 1) };
        fx(x);
      }
      break;
    case 'rally':
      for (const x of b.units) {
        if (!x.alive || x.side !== 'hero') continue;
        // (a second rally only lengthens the first: the attack is raised once)
        if (x.rallyUntil === undefined) x.power = (x.power ?? 1) * RALLY_MULT;
        x.rallyUntil = b.t + RALLY_MS;
        if (top) mendUnit(x, x.maxHp * 0.1, ev);
        fx(x);
      }
      break;
    case 'smite': {
      const target = foesIn(b, u, v).sort((x, y) => y.hp - x.hp || x.id - y.id)[0];
      if (target) {
        fx(target);
        kingStrike(b, target, SMITE_POWER * pot, true, ev);
        if (top && target.alive && freezeFor(b, target, 1000, true)) target.step = undefined;
      }
      break;
    }
    case 'chain': {
      let at = foesIn(b, u, v).sort((x, y) => apart(x, { u, v }) - apart(y, { u, v }) || x.id - y.id)[0];
      const hit = new Set<number>();
      let power = CHAIN_POWER * pot;
      const jumps = CHAIN_JUMPS + (top ? 1 : 0);
      for (let n = 0; at && n <= jumps; n++) {
        hit.add(at.id);
        fx(at);
        kingStrike(b, at, power, false, ev);
        shockFor(b, KING, at);
        power *= CHAIN_FALLOFF;
        const from: Unit = at;
        if (n === jumps) break;
        at = b.units.filter((x) => x.alive && x.side === 'foe' && !hit.has(x.id) && apart(x, from) <= CHAIN_REACH).sort((x, y) => apart(x, from) - apart(y, from) || x.id - y.id)[0];
        if (at) ev.push({ kind: 'arc', from: from.id, to: at.id });
      }
      break;
    }
    case 'frost':
      for (const x of foesIn(b, u, v)) {
        if (freezeFor(b, x, top ? 3000 : FREEZE_MS, true)) x.step = undefined;
        chillFor(b, x, SLOW_MS, true, true);
        fx(x);
      }
      break;
    case 'quake':
      for (const x of b.units.filter((y) => y.alive && y.side === 'foe' && tileAt(b.board, y.u, y.v)!.h <= QUAKE_LOW + (top ? 1 : 0))) {
        fx(x);
        kingStrike(b, x, QUAKE_POWER * pot, false, ev);
      }
      break;
    case 'poison':
      s.clouds.push({ u, v, until: b.t + POISON_MS + (top ? 3000 : 0), next: b.t + POISON_EVERY, ...(pot !== 1 ? { mult: pot } : {}) });
      break;
    case 'lance':
      for (const x of b.units.filter((y) => y.alive && y.side === 'foe' && y.u === u).sort((y, z) => y.v - z.v || y.id - z.id)) {
        fx(x);
        kingStrike(b, x, LANCE_POWER * pot, false, ev);
        if (top && x.alive) burnFor(b, KING, x);
      }
      break;
    case 'bulwark':
      for (const x of b.units) {
        if (!x.alive || x.side !== 'hero') continue;
        x.shield = { hp: Math.round(x.maxHp * BULWARK_SHARE * pot), until: b.t + BULWARK_MS * (top ? 1.5 : 1) };
        fx(x);
      }
      break;
    case 'deepfreeze': {
      for (const x of foesIn(b, u, v).sort((y, z) => z.hp - y.hp || y.id - z.id).slice(0, top ? 2 : 1)) {
        if (freezeFor(b, x, DEEPFREEZE_MS, true)) x.step = undefined;
        // (with the ailments on, the freeze itself makes it brittle, as long as it holds)
        if (!AILMENT_SWITCH.on) x.brittleUntil = b.t + DEEPFREEZE_MS;
        fx(x);
      }
      break;
    }
    case 'warcry':
      for (const x of b.units) {
        if (!x.alive || x.side !== 'hero') continue;
        x.charge = Math.min(CHARGE_MAX, x.charge + (top ? 60 : WARCRY_CHARGE));
        // (the cry steadies them: no hero stays afraid, STATUS-FX)
        unfear(x);
        fx(x);
      }
      break;
    case 'starfall':
      [...SHOWER_SPOTS, ...(top ? RIDER_SPOTS : [])].forEach(([du, dv], i) => {
        const at = { u: u + du, v: v + dv };
        if (!tileAt(b.board, at.u, at.v)) return;
        const ms = METEOR_MS + i * SHOWER_GAP;
        s.falls.push({ at: b.t + ms, ...at, power: SHOWER_POWER, ...(pot !== 1 ? { mult: pot } : {}) });
        ev.push({ kind: 'area', by: 0, id: 'meteor', ...at, ms });
      });
      break;
    case 'wolves':
      for (const at of room.slice(0, WOLVES + (top ? 1 : 0))) fx(addUnit(b, 'wolf', at.u, at.v, WOLF_BOOST));
      break;
    // (KING-SPELLS batch 4: the schools' new spells)
    case 'firewall':
    case 'icewall':
    case 'bonewall':
      raiseWall(b, KING, wallTiles, wall!.kind, wall!.ms, ev, wall!.kind === 'fire' ? { pow: pot, onFighters: true } : {});
      break;
    case 'shatter':
      for (const x of foesIn(b, u, v)) {
        const brittle = isFrozen(b, x) || isSlowed(b, x) || hasAil(x, 'chill', b.t);
        fx(x);
        kingStrike(b, x, SHATTER_POWER * pot * (brittle ? (top ? 3 : 2) : 1), true, ev);
      }
      break;
    case 'gale': {
      // (thrown back from the hero nearest the gust, who lends the shove its strength against the foes' saves)
      const by = b.units.filter((x) => x.alive && x.side === 'hero' && x.id !== 0).sort((x, y) => apart(x, { u, v }) - apart(y, { u, v }) || x.id - y.id)[0];
      const fs = foesIn(b, u, v);
      for (const x of fs) fx(x);
      if (by) moveMany(b, by, fs, top ? 3 : 2, 'shove', ev);
      break;
    }
    case 'thunderclap':
      for (const x of b.units.filter((y) => y.alive && y.side === 'foe' && b.units.some((h) => h.alive && h.side === 'hero' && h.id !== 0 && apart(h, y) <= 1))) {
        fx(x);
        kingStrike(b, x, THUNDER_POWER * pot, false, ev);
        if (x.alive && stunFor(b, x, top ? 2000 : 1000, true)) x.step = undefined;
      }
      break;
    case 'snare':
      for (const x of foesIn(b, u, v)) {
        if (stunFor(b, x, top ? 3000 : 2000, true)) x.step = undefined;
        fx(x);
      }
      break;
    case 'charm': {
      const x = foesIn(b, u, v).filter((y) => (y.size ?? 1) <= 1).sort((y, z) => z.hp - y.hp || y.id - z.id)[0];
      if (x) {
        charmFor(b, x, top ? 6000 : 4000);
        fx(x);
      }
      break;
    }
    case 'foresight':
      for (const x of b.units) {
        if (!x.alive || x.side !== 'hero' || !inArea(x, u, v)) continue;
        x.hideUntil = Math.max(x.hideUntil ?? 0, b.t + (top ? 3000 : 2000));
        fx(x);
      }
      break;
    case 'sunbeam':
      for (const x of b.units.filter((y) => y.alive && y.side === 'foe' && Math.abs(y.v - v) <= (top ? 1 : 0)).sort((y, z) => y.u - z.u || y.v - z.v || y.id - z.id)) {
        fx(x);
        kingStrike(b, x, SUNBEAM_POWER * pot, false, ev);
        if (x.alive) burnFor(b, KING, x);
      }
      break;
    case 'venom': {
      const x = foesIn(b, u, v).sort((y, z) => z.hp - y.hp || y.id - z.id)[0];
      if (x) {
        fx(x);
        kingStrike(b, x, VENOM_POWER * pot, false, ev);
        if (x.alive) for (let i = 0; i < (top ? 5 : 3); i++) poisonFor(b, KING, x);
      }
      break;
    }
    case 'mirage':
      for (const at of room.slice(0, top ? 3 : 2)) fx(addUnit(b, 'decoy', at.u, at.v));
      break;
    case 'drain': {
      const x = foesIn(b, u, v).sort((y, z) => z.hp - y.hp || y.id - z.id)[0];
      if (x) {
        fx(x);
        const before = x.hp;
        kingStrike(b, x, DRAIN_POWER * pot, true, ev);
        const dealt = Math.max(0, before - Math.max(0, x.hp));
        const low = mostWounded(b);
        if (low && dealt) mendUnit(low, dealt, ev);
        if (top && dealt) for (const h of b.units) if (h.alive && h.side === 'hero' && h !== low && inArea(h, u, v)) mendUnit(h, dealt / 2, ev);
      }
      break;
    }
    case 'raisedead':
      for (const x of corpses.slice(0, top ? 3 : 2)) {
        (s.risen ??= []).push(x.id);
        fx(addUnit(b, 'wraith', x.u, x.v, RISEN_BOOST));
      }
      break;
    case 'cleanse':
      for (const x of b.units) {
        if (!x.alive || x.side !== 'hero' || !inArea(x, u, v)) continue;
        cleanse(b, x);
        x.slowUntil = undefined;
        x.charmUntil = undefined;
        x.weakUntil = undefined;
        // (a hold or freeze is broken: the hero is free to act on the next tick)
        if (x.stunUntil !== undefined && x.stunUntil > b.t) x.busyUntil = Math.min(x.busyUntil, b.t + TICK_MS);
        x.stunUntil = undefined;
        mendUnit(x, x.maxHp * CLEANSE_HEAL * pot, ev);
        // (and wards them a moment against the next: STATUS-FX)
        ward(b, x);
        if (top) x.shield = { hp: Math.round(x.maxHp * 0.15), until: b.t + SHIELD_MS };
        fx(x);
      }
      break;
    case 'blink': {
      const x = leaper!;
      const from = { u: x.u, v: x.v };
      x.u = u;
      x.v = v;
      x.step = undefined;
      x.swing = undefined;
      x.busyUntil = Math.max(x.busyUntil, b.t + TICK_MS * 2);
      x.hideUntil = b.t + (top ? 3000 : BLINK_HIDE_MS);
      ev.push({ kind: 'blink', by: x.id, from, to: { u, v } });
      fx(x);
      break;
    }
    case 'renewal':
      for (const x of b.units) {
        if (!x.alive || x.side !== 'hero' || !inArea(x, u, v)) continue;
        x.hot = { amount: x.maxHp * RENEWAL_SHARE * pot, every: 1000, next: b.t + 1000, until: b.t + RENEWAL_MS + 1, by: x.id }; // (+1: the eighth second's mend still lands)
        if (top) cleanse(b, x);
        fx(x);
      }
      break;
    case 'hex':
      for (const x of foesIn(b, u, v)) {
        // (a second hex only lengthens the first: the attack is cut once)
        if (x.weakUntil === undefined) x.power = (x.power ?? 1) * HEX_MULT;
        x.weakUntil = b.t + HEX_MS;
        // (and its healing is turned to harm: STATUS-FX)
        curseFor(b, KING, x, HEX_MS);
        if (top) chillFor(b, x, SLOW_MS, true, true);
        fx(x);
      }
      break;
    case 'resurrect': {
      const x = fallen!;
      x.alive = true;
      x.hp = Math.max(1, Math.round(x.maxHp * (top ? 0.75 : RESURRECT_SHARE)));
      x.diedAt = undefined;
      x.busyUntil = b.t + 500;
      x.charge = 0;
      x.charge2 = undefined;
      cleanse(b, x);
      ev.push({ kind: 'heal', to: x.id, amount: x.hp });
      fx(x);
      break;
    }
  }
  return true;
}

/** Every tick: meteors that have fallen strike the foes in their 3x3, poison clouds bite, and rallies wear off. */
export function settleFalls(b: Battle, out: BattleEvent[]): void {
  const s = b.spells;
  s.falls.sort((x, y) => x.at - y.at);
  while (s.falls.length && s.falls[0].at <= b.t) {
    const f = s.falls.shift()!;
    const might = kingMight(b);
    for (const x of b.units) {
      if (!x.alive || x.side !== 'foe' || !inArea(x, f.u, f.v)) continue;
      hurt(b, KING, x, Math.max(1, Math.round((f.power ?? METEOR_POWER) * might * (f.mult ?? 1)) - defOf(x).def), true, false, out, 'skill');
      // (a meteor, not a shower's star, sets what it strikes burning: STATUS-FX)
      if (f.power === undefined) burnFor(b, KING, x);
    }
  }
  for (const c of s.clouds) {
    while (c.next <= b.t && c.next <= c.until) {
      c.next += POISON_EVERY;
      const might = kingMight(b);
      for (const x of foesIn(b, c.u, c.v)) {
        tagged(out, 'poison', () => hurt(b, KING, x, Math.round(POISON_DMG * might * (c.mult ?? 1)), false, false, out, 'dot'));
        // (and each bite leaves a stack of poison: STATUS-FX)
        poisonFor(b, KING, x);
      }
    }
  }
  s.clouds = s.clouds.filter((c) => c.until > b.t);
  for (const x of b.units) {
    if (x.rallyUntil !== undefined && x.rallyUntil <= b.t) {
      x.power = (x.power ?? 1) / RALLY_MULT;
      x.rallyUntil = undefined;
    }
    if (x.weakUntil !== undefined && x.weakUntil <= b.t) {
      x.power = (x.power ?? 1) / HEX_MULT;
      x.weakUntil = undefined;
    }
  }
}

/* -------------------------------------------------------------- the loadout */

/** The spells a player knows, the school slots' spells and the open slot's (the Schools of the Crown: `schools.ts`). Kept in the Meta. */
export interface Loadout {
  owned: SpellId[];
  /** The school slots (three at most). */
  equipped: SpellId[];
  /** The open slot: any spell known (KING-SPELLS batch 2). */
  open?: SpellId;
  /** The school the loadout was last fitted to (`fitSchool`); unset on a save from before the schools. */
  school?: string;
  /** Each spell's rank above the first (KING-SPELLS batch 3, `spellRanks.ts`); a spell not listed is rank 1. */
  ranks?: Partial<Record<SpellId, number>>;
}

/** A new save's: the starting three known and in the slots (the page fits them to the ruler's school when it loads: `fitSchool`). */
export const newLoadout = (): Loadout => ({ owned: [...STARTER_SPELLS], equipped: [...STARTER_SPELLS] });

/** The total power of some spells. */
export const powerOf = (ids: readonly SpellId[]) => ids.reduce((n, id) => n + SPELLS[id].power, 0);

/** A loadout read from a saved value: the starting three are always known (and in the slots when nothing was saved); the slots and the open
 *  slot hold only spells known, three at most in the slots. Old saves keep every spell they own; the page then fits the slots to the ruler's
 *  school (`fitSchool`). */
export function readLoadout(raw: unknown): Loadout {
  const l = newLoadout();
  if (!raw || typeof raw !== 'object') return l;
  const list = (x: unknown): SpellId[] => (Array.isArray(x) ? [...new Set(x.filter((id): id is SpellId => typeof id === 'string' && id in SPELLS))] : []);
  const r = raw as Record<string, unknown>;
  l.owned = [...new Set([...STARTER_SPELLS, ...list(r.owned)])];
  l.equipped = (Array.isArray(r.equipped) ? list(r.equipped).filter((id) => l.owned.includes(id)) : [...STARTER_SPELLS]).slice(0, LOADOUT_SIZE);
  if (typeof r.open === 'string' && l.owned.includes(r.open as SpellId) && !l.equipped.includes(r.open as SpellId)) l.open = r.open as SpellId;
  if (typeof r.school === 'string') l.school = r.school;
  // (the ranks: whole numbers from 2 to the top, on real spells; a spell not yet known keeps its rank for when it is)
  if (r.ranks && typeof r.ranks === 'object') {
    const ranks: Partial<Record<SpellId, number>> = {};
    for (const [id, n] of Object.entries(r.ranks as Record<string, unknown>)) if (id in SPELLS && typeof n === 'number' && n >= 2) ranks[id as SpellId] = Math.min(RANK_MAX, Math.floor(n));
    if (Object.keys(ranks).length) l.ranks = ranks;
  }
  return l;
}
