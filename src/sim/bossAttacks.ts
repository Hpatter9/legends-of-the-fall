// BOSS-BIG (docs/notes/boss-big-attacks.md): the bosses' great attacks. The owner: "Bosses need to have bigger attacks and feel more
// powerful. Like standard RPGs where they have huge attacks", with counterplay. Every army boss (mid and last, so the daily's bosses
// too), the Calamity's six and the Last Stand's bosses have one or two signature attacks (`SIGNATURES`): a slam, a quake ring, a breath
// down a line, a cross of beams, a rain of blasts, or a pull that drags the heroes in before the blast. Each is a real windup: the boss
// gathers (`CAST_MS`) and the tiles it will strike are marked for `WARN_MS` (`Battle.warnings`, and a `bossSig` event the page draws),
// then it lands on whoever still stands there. So there is time to answer: the heroes step off the marked tiles when they can
// (`dodgeStep`, called from the fight's `decide`), and the king's spells work on it as they do on any blow (a Shield soaks it, a
// Blinked hero cannot be struck, a Hex weakens it, a Heal mends after).
//
// When: a first one a few seconds after the boss first acts, then on a cooldown; at once when its health first falls past 60% and 30%
// (`TURNS`); and once a fight has dragged on (`RAGE_MS` since the boss first acted) it comes faster, harder and wider, under its rage
// name. A boss with two alternates them. Deterministic: no stream is drawn from (the targets are a fixed order; a rain's spots are a
// hash of the moment). Pure rules: no Pixi, no DOM.

import { standable, tileAt, type At } from './board';
import { apart, atkOf, defenceOf, defOf, hurt, wayTo, type Battle, type BattleEvent, type Unit } from './battle';
import { firstStep, walkFrom } from './path';
import { mixSeed } from './rng';
import { hidden } from './equipFx';
import { burnFor, chillFor, curseFor, isSilenced, poisonFor, stunFor, bleedFor } from './ailments';
import { airborne, moveMany, shove } from './toolkit/move';

/** The switch (tools and tests turn it off to measure the fights without it, or the dodge alone). */
export const BOSS_BIG = { on: true, dodge: true };

/** The element a signature looks like (the same names as the page's `Element`). */
export type SigElement = 'fire' | 'ice' | 'lightning' | 'light' | 'dark' | 'forest' | 'poison' | 'earth' | 'wind' | 'blood';

/** The shapes. `slam`: a square `r` round a spot (the boss itself, or the heroes' thickest crowd in `reach`). `ring`: the tiles `r0` to
 *  `r` round the boss (its feet are safe when `r0` is 2). `line`: from the boss towards the hero it faces, `len` long and `w` wide (a
 *  breath, a charge). `cross`: beams down the boss's row and column, `len` each way, `w` wide. `rain`: a 3x3 blast on up to `n` heroes
 *  (spread). `pull`: heroes within `reach` are dragged `drag` tiles in as it gathers, then a square `r` round it is struck. */
export type SigShape =
  | { kind: 'slam'; r: number; on: 'self' | 'crowd'; reach?: number }
  | { kind: 'ring'; r0: number; r: number }
  | { kind: 'line'; len: number; w: number }
  | { kind: 'cross'; len: number; w: number }
  | { kind: 'rain'; n: number }
  | { kind: 'pull'; reach: number; drag: number; r: number };

/** What a struck hero is left with besides the damage. */
export type SigRider = 'burn' | 'poison' | 'bleed' | 'curse' | 'stun' | 'freeze' | 'chill' | 'shove';

export interface Signature {
  /** Its fixed key (the page looks its look and sound up by it) and its name, and the name of its rage version. */
  key: string;
  name: string;
  rage: string;
  el: SigElement;
  shape: SigShape;
  /** Its damage, as a multiple of the boss's attack at the moment it lands (the hero's defence comes off), times `SIG.POWER`; never less
   *  than `SIG.FLOOR` of the struck hero's health. */
  power: number;
  rider?: SigRider;
}

/** The shared numbers. */
export const SIG = {
  /** How long the boss gathers while its tiles are marked (battle ms): the heroes' and the player's moment to answer. */
  WARN_MS: 2000,
  /** The rage version's windup: a little shorter. */
  RAGE_WARN_MS: 1700,
  /** The first one comes this long after the boss first acts; then one every `EVERY_MS` (`MID_EVERY_MS` for a mid-boss's single one). */
  FIRST_MS: 5000,
  EVERY_MS: 9000,
  /** After this long since the boss first acted, the fight has dragged: the rage version. */
  RAGE_MS: 40_000,
  /** The rage version: its cooldown, damage and the extra reach of its shape. */
  RAGE_EVERY: 0.6,
  RAGE_POWER: 1.3,
  RAGE_REACH: 1,
  /** The boss stands gathering this long as it begins (then fights on while the marks run out: the blow is on its way). */
  CAST_MS: 900,
  /** Every signature's damage is multiplied by this (the one knob for all of them). */
  POWER: 0.85,
  /** But never less than this share of the struck hero's health (a boss's great blow is always a great one, whatever the levels). */
  FLOOR: 0.2,
  /** The Calamity's guardians strike at this share of both (its runs are a lone starter and the recruits it gathers, weaker than an army's
   *  party; the re-tune). */
  CALAMITY: 0.5,
  /** A boss with signatures has this share of the health it had before them, so its army stays winnable (the re-tune: its great blows
   *  are the danger now, and a fight with it a little shorter). */
  HP: 0.9,
  /** The shares of its health at which it lets one go at once (each once). */
  TURNS: [0.6, 0.3] as readonly number[],
  /** A signature waits until a hero is this close (tiles). */
  NEAR: 6,
  /** How long the riders last (ms). */
  STUN_MS: 1000,
  FREEZE_MS: 1400,
  CHILL_MS: 3000,
  BURN_MS: 3000,
  /** The heroes see the marks this long after they appear before they move (a windup's first moment is the boss's; the rest is theirs). */
  REACT_MS: 800,
  /** The farthest a hero walks (path cost) to step out of the marked tiles. */
  DODGE_COST: 4,
};

const slam = (r: number, on: 'self' | 'crowd' = 'crowd', reach = 4): SigShape => ({ kind: 'slam', r, on, reach });
const ring = (r0: number, r: number): SigShape => ({ kind: 'ring', r0, r });
const line = (len: number, w: number): SigShape => ({ kind: 'line', len, w });
const cross = (len: number, w = 1): SigShape => ({ kind: 'cross', len, w });
const rain = (n: number): SigShape => ({ kind: 'rain', n });
const pull = (reach: number, drag: number, r: number): SigShape => ({ kind: 'pull', reach, drag, r });
const sig = (key: string, name: string, rage: string, el: SigElement, shape: SigShape, power: number, rider?: SigRider): Signature => ({ key, name, rage, el, shape, power, ...(rider ? { rider } : {}) });

/** Each boss's signatures, by fighter id: the armies' mid-bosses one, their last bosses, the forest bosses and the Calamity's six two. */
export const SIGNATURES: Record<string, readonly Signature[]> = {
  // the Orc Warband
  orcChieftain: [sig('shieldBreaker', 'Shield Breaker', 'Banner of Ruin', 'earth', slam(1), 2.2, 'stun')],
  orcWarlord: [sig('skullsplitter', 'Skullsplitter', 'Red Tusk Cataclysm', 'earth', slam(1), 2.4, 'stun'), sig('waaaghQuake', 'WAAAGH Quake', 'Quake of the Horde', 'earth', ring(1, 2), 1.9, 'shove')],
  // the Undead Legion
  boneCaptain: [sig('graveVolley', 'Grave Volley', 'Volley of the Fallen', 'dark', rain(3), 1.2)],
  lichKing: [sig('frozenCrown', 'Frozen Crown', 'Crown of Endless Winter', 'ice', cross(5), 1.7, 'freeze'), sig('soulHarvest', 'Soul Harvest', 'Harvest of Souls', 'dark', pull(4, 2, 2), 1.6, 'curse')],
  // the Beast Packs
  alphaWolf: [sig('moonlitRend', 'Moonlit Rend', 'Blood Moon Rend', 'blood', line(4, 3), 2.2, 'bleed')],
  boarKing: [sig('stampede', 'Thundering Stampede', 'Stampede of the Herd', 'earth', line(6, 3), 2.2, 'shove'), sig('tuskQuake', 'Tusk Quake', 'The Herd Shakes the Earth', 'earth', slam(2, 'self'), 1.9, 'stun')],
  // the Wildwood
  forestBoss1: [sig('brambleRing', 'Bramble Eruption', 'The Briar Remembers', 'forest', ring(2, 3), 2.0, 'stun'), sig('thornSlam', 'Thorn Slam', 'Warden’s Wrath', 'forest', slam(1), 2.2, 'bleed')],
  forestBoss2: [sig('raidersAmbush', 'Raider’s Ambush', 'Ambush of the Deep Wood', 'forest', rain(3), 1.55, 'bleed'), sig('raidersCharge', 'Raider’s Charge', 'The Wood Runs Red', 'blood', line(5, 1), 2.4, 'shove')],
  forestBoss3: [sig('groveSpear', 'Spear of the Old Grove', 'The Grove’s Last Spear', 'forest', line(7, 1), 2.4, 'bleed'), sig('groveTempest', 'Grove Tempest', 'Tempest of the Old Grove', 'wind', cross(4), 2.0, 'shove')],
  // the Labyrinth
  gorgonQueen: [sig('gazeOfAges', 'Gaze of Ages', 'The Queen’s Stone Gaze', 'poison', line(6, 3), 1.9, 'stun')],
  minotaurChampion: [sig('labyrinthCharge', 'Labyrinth Charge', 'The Maze Closes', 'earth', line(6, 3), 2.3, 'shove'), sig('labyrinthQuake', 'Labyrinth Quake', 'The Walls Come Down', 'earth', ring(1, 3), 1.8, 'stun')],
  // the Ogre Clans
  shamanKing: [sig('spiritStorm', 'Spirit Storm', 'Storm of the Dead', 'dark', rain(3), 1.3)],
  hornedOgre: [sig('mountainSlam', 'Mountain Slam', 'The Mountain Falls', 'earth', slam(2), 1.7, 'stun'), sig('hornSweep', 'Horn Sweep', 'Horns of the Crag', 'earth', ring(1, 2), 1.5, 'shove')],
  // the Infernal Host
  devilLeader: [sig('hellfireRain', 'Hellfire Rain', 'Rain of the Ninth Circle', 'fire', rain(3), 1.45, 'burn')],
  demonLord: [sig('infernalPact', 'Infernal Pact', 'Pact of the Abyss', 'dark', pull(4, 2, 2), 1.9, 'burn'), sig('impStorm', 'Brimstone Storm', 'Brimstone Without End', 'fire', rain(3), 1.55, 'burn')],
  // the Yokai Night Parade (this army's and the Golem Forge's bosses strike a quarter softer: their own attack is the game's biggest; the re-tune)
  nineTails: [sig('foxfireCross', 'Foxfire Cross', 'Nine Lanterns Burning', 'fire', cross(5), 1.25)],
  oniKing: [sig('thunderDrum', 'Thunder Drum', 'Drum of the Midnight Storm', 'lightning', ring(1, 3), 1.2, 'shove'), sig('kanaboMeteor', 'Kanabo Meteor', 'The Oni’s Falling Star', 'earth', slam(2), 1.4, 'shove')],
  // the Golem Forge
  sapphireColossus: [sig('crystalCross', 'Crystal Cross', 'Prism of the Blue Vein', 'ice', cross(5), 1.5, 'chill')],
  forgeTitan: [sig('moltenRain', 'Molten Rain', 'The Forge Overflows', 'fire', rain(3), 1.15, 'burn'), sig('forgeBreath', 'Forge Breath', 'Breath of the Eternal Forge', 'fire', line(6, 3), 1.6, 'burn')],
  // the Calamity's six
  calBoss1: [sig('ashSlam', 'Ash Slam', 'Ash of the First Herald', 'fire', slam(1), 2.3, 'burn'), sig('cinderRing', 'Cinder Ring', 'Ring of Living Cinders', 'fire', ring(2, 3), 1.9, 'burn')],
  calBoss2: [sig('briarRing', 'Briar Ring', 'The Bramble Remembers', 'forest', ring(2, 3), 2.0, 'stun'), sig('thornLances', 'Thorn Lances', 'Lances of the Old Moss', 'forest', cross(5), 2.0, 'bleed')],
  calBoss3: [sig('courtOfFlames', 'Court of Flames', 'The Court Burns', 'fire', rain(3), 1.55, 'burn'), sig('abyssalPull', 'Abyssal Pull', 'The Hordes Close In', 'dark', pull(4, 2, 2), 1.9, 'curse')],
  calBoss4: [sig('avalanche', 'Avalanche', 'The Mountain Walks', 'earth', line(7, 3), 2.2, 'shove'), sig('mountainsFall', 'Mountain’s Fall', 'The Wall Comes Down', 'earth', slam(2), 2.1, 'stun')],
  calBoss5: [sig('lastFlame', 'Rain of the Last Flame', 'The Last Flame Falls', 'fire', rain(3), 1.45, 'poison'), sig('hellbringerCross', 'Hellbringer’s Cross', 'Cross of the Hellbringer', 'fire', cross(5, 1), 2.0, 'burn')],
  calBoss6: [sig('calamityCharge', 'Calamity Charge', 'No Horizon Beyond', 'fire', line(8, 3), 2.3, 'shove'), sig('endOfRoads', 'The End of All Roads', 'The End of Everything', 'dark', pull(5, 2, 2), 2.0, 'curse')],
};

/** A signature a boss has begun: the tiles it will strike, and when. */
export interface BossWarning {
  /** Its number in the fight (the page matches the windup to the blow by it). */
  n: number;
  by: number;
  key: string;
  /** From when, and when it lands (battle ms). */
  from: number;
  at: number;
  /** The tiles it will strike, by index. */
  tiles: number[];
  rage: boolean;
}

/** What a boss keeps for its signatures: when it first acted, when the next is due, which comes next, the turns it has let go. */
export interface SigState {
  born: number;
  next: number;
  i: number;
  turns: number;
}

/** A fighter's signatures (none for a hero or a common foe, or with the switch off). */
export const signaturesOf = (u: Unit): readonly Signature[] | undefined => (BOSS_BIG.on && u.side === 'foe' ? SIGNATURES[u.def] : undefined);

/** What a fighter's health is multiplied by for its signatures (`SIG.HP` for a boss that has them, else 1). */
export const sigHp = (id: string): number => (BOSS_BIG.on && SIGNATURES[id] ? SIG.HP : 1);

/** Whether a fight has dragged on so long for this boss that its rage version comes. */
export const enraged = (b: Battle, s: SigState): boolean => b.t - s.born >= SIG.RAGE_MS;

const idx = (b: Battle, a: At): number => a.v * b.board.w + a.u;
const onBoard = (b: Battle, u: number, v: number): boolean => u >= 0 && v >= 0 && u < b.board.w && v < b.board.d && !!tileAt(b.board, u, v);
const cheb = (a: At, c: At): number => Math.max(Math.abs(a.u - c.u), Math.abs(a.v - c.v));

/** The fighters a boss's signature strikes and drags: its foes, alive, not underground; the Last Stand's king is not among them (he is
 *  the Stand's own life; the bosses' great blows are for the heroes who stand in their way). */
const targetsOf = (b: Battle, me: Unit): Unit[] => b.units.filter((x) => x.alive && x.side !== me.side && !x.under && x.def !== 'standKing');

/** The tiles a signature would strike if begun now (the boss where it stands, its foes where they stand). */
export function sigTiles(b: Battle, me: Unit, s: Signature, rage: boolean): number[] {
  const extra = rage ? SIG.RAGE_REACH : 0;
  const heroes = targetsOf(b, me);
  const out = new Set<number>();
  const square = (c: At, r: number) => {
    for (let dv = -r; dv <= r; dv++) for (let du = -r; du <= r; du++) if (onBoard(b, c.u + du, c.v + dv)) out.add(idx(b, { u: c.u + du, v: c.v + dv }));
  };
  const sh = s.shape;
  if (sh.kind === 'slam') {
    const r = sh.r + extra;
    let c: At = me;
    if (sh.on === 'crowd') {
      // (the hero with the most of its side within the square round it, in reach of the boss; the nearest when none is)
      const reach = (sh.reach ?? 4) + extra;
      const near = heroes.filter((h) => apart(me, h) <= reach);
      const pool = near.length ? near : heroes;
      const best = [...pool].sort((x, y) => heroes.filter((h) => cheb(h, y) <= r).length - heroes.filter((h) => cheb(h, x) <= r).length || apart(me, x) - apart(me, y) || x.id - y.id)[0];
      if (best) c = best;
    }
    square(c, r);
  } else if (sh.kind === 'ring' || sh.kind === 'pull') {
    const r0 = sh.kind === 'ring' ? sh.r0 : 1;
    const r = sh.r + extra;
    for (let dv = -r; dv <= r; dv++)
      for (let du = -r; du <= r; du++) {
        const d = Math.max(Math.abs(du), Math.abs(dv));
        if (d >= r0 && d <= r && onBoard(b, me.u + du, me.v + dv)) out.add(idx(b, { u: me.u + du, v: me.v + dv }));
      }
  } else if (sh.kind === 'line' || sh.kind === 'cross') {
    const len = sh.len + extra;
    const half = Math.floor((sh.w + (rage && sh.kind === 'cross' ? 2 : 0)) / 2);
    const target = [...heroes].sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id)[0];
    const ways = sh.kind === 'cross' ? [0, 1, 2, 3] : [target ? wayTo(me, target) : me.facing];
    const D = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ];
    for (const w of ways) {
      const [du, dv] = D[w];
      for (let k = 1; k <= len; k++)
        for (let s2 = -half; s2 <= half; s2++) {
          const u = me.u + du * k + (dv !== 0 ? s2 : 0);
          const v = me.v + dv * k + (du !== 0 ? s2 : 0);
          if (onBoard(b, u, v)) out.add(idx(b, { u, v }));
        }
    }
  } else if (sh.kind === 'rain') {
    // (a blast on each of up to `n` heroes, the nearest first, each a little off its mark by a hash of the moment, and none on a hero
    // another blast already covers)
    const n = sh.n + extra;
    const order = [...heroes].sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id);
    let made = 0;
    for (const h of order) {
      if (made >= n) break;
      if (out.has(idx(b, h))) continue;
      const k = (mixSeed(b.seed, 0xb16a, b.t, me.id, h.id) >>> 0) % 9;
      const c = { u: h.u + ((k % 3) - 1) * (made % 2), v: h.v + (Math.floor(k / 3) - 1) * (made % 2) };
      square(onBoard(b, c.u, c.v) ? c : h, 1);
      made++;
    }
  }
  // (only ground that can be stood on is marked; the boss's own tile is never struck)
  out.delete(idx(b, me));
  return [...out].filter((i) => standable(b.board.tiles[i])).sort((x, y) => x - y);
}

/** A free boss with a signature due lets it go (its windup begins): true when it did, and the fighter's turn is spent. */
export function trySignature(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const list = signaturesOf(me);
  if (!list?.length || isSilenced(b, me)) return false;
  const st = ((b.sigs ??= {})[me.id] ??= { born: b.t, next: b.t + SIG.FIRST_MS, i: 0, turns: 0 });
  if (b.warnings?.some((w) => w.by === me.id)) return false;
  // (a turn of its health lets one go at once; each once)
  const turn = SIG.TURNS.findIndex((at, k) => k >= st.turns && me.hp <= me.maxHp * at);
  if (turn < 0 && b.t < st.next) return false;
  const heroes = targetsOf(b, me);
  if (!heroes.some((h) => apart(me, h) <= SIG.NEAR)) return false;
  const rage = enraged(b, st);
  const s = list[st.i % list.length];
  // (a pull drags the heroes near it in first, so the blast round it is marked where they now stand)
  if (s.shape.kind === 'pull') {
    const reach = s.shape.reach + (rage ? SIG.RAGE_REACH : 0);
    // (a Last Stand hero holds its post: it is not dragged off it)
    moveMany(b, me, heroes.filter((h) => apart(me, h) <= reach && apart(me, h) > 1 && !(b.stand && h.post)), s.shape.drag, 'drag', out);
  }
  const tiles = sigTiles(b, me, s, rage);
  if (!tiles.length) return false;
  if (turn >= 0) st.turns = turn + 1;
  st.i++;
  const ms = rage ? SIG.RAGE_WARN_MS : SIG.WARN_MS;
  st.next = b.t + ms + Math.round(SIG.EVERY_MS * (rage ? SIG.RAGE_EVERY : 1));
  const w: BossWarning = { n: (b.sigN = (b.sigN ?? 0) + 1), by: me.id, key: s.key, from: b.t, at: b.t + ms, tiles, rage };
  (b.warnings ??= []).push(w);
  // (the boss faces its mark and gathers, standing, until it lands)
  const aim = heroes.sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id)[0];
  if (aim) me.facing = wayTo(me, aim);
  me.step = undefined;
  me.swing = undefined;
  me.cast = { at: b.t, ms: SIG.CAST_MS, anim: 'attack2' };
  me.busyUntil = b.t + SIG.CAST_MS;
  out.push({ kind: 'bossSig', phase: 'warn', by: me.id, n: w.n, key: s.key, name: rage ? s.rage : s.name, el: s.el, tiles, ms, rage });
  return true;
}

/** Each tick: the windups whose moment has come land (or fizzle, their boss fallen). */
export function tickSignatures(b: Battle, out: BattleEvent[]): void {
  const list = b.warnings;
  if (!list?.length) return;
  for (const w of list.filter((x) => x.at <= b.t)) {
    list.splice(list.indexOf(w), 1);
    const me = b.units.find((x) => x.id === w.by);
    const s = me && SIGNATURES[me.def]?.find((x) => x.key === w.key);
    if (!me || !me.alive || !s) {
      out.push({ kind: 'bossSig', phase: 'fizzle', by: w.by, n: w.n, key: w.key, name: '', el: s?.el ?? 'dark', tiles: w.tiles, ms: 0, rage: w.rage });
      continue;
    }
    land(b, me, s, w, out);
  }
  if (!list.length) delete b.warnings;
}

/** A signature lands: every foe of the boss still on its tiles is struck (a Blinked hero cannot be; a shield soaks it as any blow), with
 *  its rider. */
function land(b: Battle, me: Unit, s: Signature, w: BossWarning, out: BattleEvent[]): void {
  out.push({ kind: 'bossSig', phase: 'land', by: me.id, n: w.n, key: s.key, name: w.rage ? s.rage : s.name, el: s.el, tiles: w.tiles, ms: 0, rage: w.rage });
  const on = new Set(w.tiles);
  const k = (w.rage ? SIG.RAGE_POWER : 1) * (me.def.startsWith('calBoss') ? SIG.CALAMITY : 1);
  const power = atkOf(me) * s.power * SIG.POWER * k;
  const struck = targetsOf(b, me)
    .filter((x) => on.has(idx(b, x)) && !hidden(b, x) && !airborne(b, x))
    .sort((x, y) => apart(me, y) - apart(me, x) || x.id - y.id);
  for (const x of struck) {
    if (!x.alive) continue;
    const dmg = Math.max(1, Math.round(Math.max(power - defenceOf(x), x.maxHp * SIG.FLOOR * k)));
    if (!hurt(b, me, x, dmg, true, false, out, 'skill') || !x.alive) continue;
    rider(b, me, x, s.rider, out);
  }
}

function rider(b: Battle, me: Unit, x: Unit, r: SigRider | undefined, out: BattleEvent[]): void {
  if (!r) return;
  if (r === 'burn') burnFor(b, me, x, SIG.BURN_MS);
  else if (r === 'poison') poisonFor(b, me, x);
  else if (r === 'bleed') bleedFor(b, me, x, 0.08);
  else if (r === 'curse') curseFor(b, me, x);
  else if (r === 'stun') stunFor(b, x, SIG.STUN_MS, false, 'stun', me);
  else if (r === 'freeze') stunFor(b, x, SIG.FREEZE_MS, false, 'freeze', me);
  else if (r === 'chill') chillFor(b, x, SIG.CHILL_MS, false, false, me);
  // (a Last Stand hero at its post is not thrown off it: the Stand's guard holds its ground)
  else if (r === 'shove' && !(b.stand && x.post)) shove(b, me, x, 1, out);
}

/** The tiles marked by the foes of `me` that are about to land (none: null). */
export function dangerFor(b: Battle, me: Unit): Set<number> | null {
  if (!BOSS_BIG.dodge || !b.warnings?.length) return null;
  let set: Set<number> | null = null;
  for (const w of b.warnings) {
    if (b.t - w.from < SIG.REACT_MS) continue;
    const by = b.units.find((x) => x.id === w.by);
    if (!by || by.side === me.side) continue;
    set ??= new Set();
    for (const i of w.tiles) set.add(i);
  }
  return set;
}

/** A fighter standing on marked ground steps towards the nearest unmarked tile it can reach (within `DODGE_COST`): the tile of its first
 *  step, or -1 when it is safe where it is, cannot move, or has nowhere to go (a blade with no way out stays and strikes). */
export function dodgeStep(b: Battle, me: Unit, danger: ReadonlySet<number>): number {
  const here = idx(b, me);
  if (!danger.has(here) || defOf(me).still || me.def === 'standKing') return -1;
  const blocked = new Set<number>();
  for (const x of b.units) if (x.alive && x !== me && !x.under) blocked.add(idx(b, x));
  const walk = walkFrom(b.board, me, defOf(me).jump, blocked, me.side);
  let goal = -1;
  for (let i = 0; i < walk.cost.length; i++) {
    const c = walk.cost[i];
    if (c === 0 || c > SIG.DODGE_COST || danger.has(i) || blocked.has(i)) continue;
    const t = b.board.tiles[i];
    if (t.ground === 'lava' || t.ground === 'coals') continue;
    // (a Last Stand hero keeps within its leash of its post)
    if (me.post && apart({ u: i % b.board.w, v: Math.floor(i / b.board.w) }, me.post) > me.post.leash) continue;
    if (goal < 0 || c < walk.cost[goal]) goal = i;
  }
  return goal >= 0 ? firstStep(walk, goal) ?? -1 : -1;
}
