// The king's spells cast on their own (AUTO-CAST): the owner's "For Auto in battle, it should do auto spells and ultimates". With the
// fight's Auto switch on, the page sets `Battle.autoSpells` to the spells the player has equipped, and after every tick `stepBattle` asks
// `autoCast` whether one is worth casting now. The cast goes through `castSpell`, the same function a tap calls, at the same point a tap
// would land (between two ticks), so its effects are the same, and it is kept in the fight's log like a tap (`orders.ts`).
//
// The chooser (`chooseSpell`) is a set of plain rules, read off the board as it stands:
// - Help first: Resurrect a fallen hero, Heal or Renewal the hurt, Shield or Bulwark heroes standing in a boss's marked blow (or badly
//   hurt in the thick of it), Cleanse the held, charmed or burning, Blink the one about to fall.
// - Then harm: an area spell where the foes stand thickest (three or more worth hitting, or the boss), the lone-target spells on the boss
//   or the sturdiest foe. A foe with little health left is not worth a spell: the heroes will finish it.
// - Then the buffs (Haste, Rally, Battle Cry), once three heroes are in the fight, never while the last of the wave is nearly done.
// - A reserve: while a help spell is equipped and nobody needs it, a harm or buff spell leaves enough mana to cast that help spell
//   (unless the mana is full anyway). At most one spell a tick, and a short gap between two.
//
// The War Horn stays the player's own (`orderEidolon`): nothing here blows it. Unset `autoSpells` (every headless fight, every fight with
// Auto off) casts nothing, so those fights play exactly as before.
//
// Pure rules: no Pixi, no DOM, no randomness.

import { standable, tileAt } from './board';
import { apart, defOf, unitAt, type Battle, type Unit } from './battle';
import { canAfford, castSpell, fallenIn, HEAL_SHARE, MANA_MAX, RENEWAL_MS, RENEWAL_SHARE, SHOWER_SPOTS, SMITE_POWER, SPELLS, type SpellId } from './spells';
import { CHARGE_MAX } from './abilities';
import { hasAil, isFrozen } from './ailments';

/** The least time between two spells cast on their own (ms): a beat for the eye, and no burst of three at once. */
export const AUTO_GAP_MS = 1500;
/** A foe with less than this share of its health left is nearly done: the heroes will finish it, a spell would be wasted on it. */
export const SPENT = 0.25;
/** An area spell is cast on at least this many foes worth hitting (or on fewer when they are all that is left, or on the boss). */
export const CROWD = 3;
/** A hero below this share of its health is hurt badly enough for a heal on it alone (the king in the Last Stand a little sooner). */
export const HURT = 0.5;
export const KING_HURT = 0.65;
/** A heal (or Renewal) on several is worth it when it would give back this much health between them, in shares of one hero's whole. */
export const HEAL_WORTH = 0.6;
/** A hero this low and with a foe at its side is about to fall: Blink takes it away, a Shield covers it. */
export const DYING = 0.3;
/** A foe this near a hero (tiles, walking) counts as in the fight. */
export const ENGAGED = 2;
/** A buff waits for this many heroes in the fight (fewer when fewer stand). */
export const BUFF_HEROES = 3;
/** Battle Cry waits until the heroes' skill meters are on average no fuller than this. */
export const CRY_BELOW = 0.5;

/** The spells that save a hero; the others hurt the foes or raise the heroes. */
const HELP: ReadonlySet<SpellId> = new Set(['heal', 'renewal', 'shield', 'bulwark', 'cleanse', 'resurrect', 'blink']);

/** A spell to cast, and where. */
export interface AutoPick {
  id: SpellId;
  u: number;
  v: number;
}

const at3 = (x: { u: number; v: number }, u: number, v: number) => Math.abs(x.u - u) <= 1 && Math.abs(x.v - v) <= 1;
const heroesOf = (b: Battle) => b.units.filter((x) => x.alive && x.side === 'hero' && x.id !== 0);
const foesOf = (b: Battle) => b.units.filter((x) => x.alive && x.side === 'foe' && !x.under);
const isBig = (x: Unit) => (x.size ?? 1) > 1;
/** A foe worth a spell: not nearly done, or a boss (always worth it). */
const worth = (x: Unit) => isBig(x) || x.hp > x.maxHp * SPENT;
const share = (x: Unit) => x.hp / x.maxHp;
const isKing = (b: Battle, x: Unit) => b.stand?.king === x.id;
const hurtLine = (b: Battle, x: Unit) => (isKing(b, x) ? KING_HURT : HURT);
const engaged = (x: Unit, foes: readonly Unit[]) => foes.some((f) => apart(f, x) <= ENGAGED);
/** The tiles a 3x3 could be centred on to catch these fighters: each one's own tile and the eight round it, on the board, in a fixed order. */
function centres(b: Battle, xs: readonly Unit[]): { u: number; v: number }[] {
  const seen = new Set<number>();
  const out: { u: number; v: number }[] = [];
  for (const x of xs)
    for (let dv = -1; dv <= 1; dv++)
      for (let du = -1; du <= 1; du++) {
        const u = x.u + du;
        const v = x.v + dv;
        if (!tileAt(b.board, u, v) || seen.has(v * b.board.w + u)) continue;
        seen.add(v * b.board.w + u);
        out.push({ u, v });
      }
  return out.sort((p, q) => p.v - q.v || p.u - q.u);
}
/** The best centre by a score (the first of equals, in board order), or none scoring above 0. */
function best<T extends { u: number; v: number }>(spots: readonly T[], score: (p: T) => number): (T & { s: number }) | undefined {
  let top: (T & { s: number }) | undefined;
  for (const p of spots) {
    const s = score(p);
    if (s > 0 && (!top || s > top.s)) top = { ...p, s };
  }
  return top;
}

/** The tiles a boss's signature blow will land on before long (index set), from the warnings winding up now. */
const marked = (b: Battle) => new Set((b.warnings ?? []).filter((w) => w.at > b.t).flatMap((w) => w.tiles));
const inMarked = (b: Battle, x: Unit, m: Set<number>) => m.has(x.v * b.board.w + x.u);
/** A hero held, charmed or slowed, or burning, bleeding or poisoned: what a Cleanse lifts. */
const held = (b: Battle, x: Unit) =>
  (x.stunUntil !== undefined && x.stunUntil > b.t) || (x.charmUntil !== undefined && x.charmUntil > b.t) || isFrozen(b, x) || hasAil(x, 'stun', b.t) || hasAil(x, 'fear', b.t) || hasAil(x, 'silence', b.t);
const ailing = (b: Battle, x: Unit) => held(b, x) || (x.slowUntil !== undefined && x.slowUntil > b.t) || ['burn', 'bleed', 'poison', 'curse', 'chill'].some((k) => hasAil(x, k as never, b.t));

/** What a spell's cast would be worth now, and where (none when it would not be worth casting). */
function pickFor(b: Battle, id: SpellId, heroes: Unit[], foes: Unit[]): AutoPick | undefined {
  const worthy = foes.filter(worth);
  const boss = worthy.find(isBig);
  // (an area of foes is worth it with enough of them in it, with the boss in it, or with every foe left that is worth a blow)
  const crowd = (n: number, withBoss: boolean) => (withBoss ? n + CROWD : n >= Math.min(CROWD, Math.max(2, worthy.length)) ? n : 0);
  const area = (filter: (f: Unit) => boolean = () => true) =>
    best(centres(b, worthy), (p) => {
      const hit = worthy.filter((f) => at3(f, p.u, p.v) && filter(f));
      return crowd(hit.length, hit.some(isBig));
    });
  const inFight = heroes.filter((h) => engaged(h, foes));
  switch (id) {
    case 'resurrect': {
      if (!worthy.length) return;
      const fallen = b.units.filter((x) => !x.alive && x.side === 'hero' && !defOf(x).summon && x.owner === undefined);
      for (const x of fallen) if (fallenIn(b, x.u, x.v)) return { id, u: x.u, v: x.v };
      return;
    }
    case 'heal':
    case 'renewal': {
      if (!worthy.length) return;
      const per = (x: Unit) => Math.min(x.maxHp - x.hp, x.maxHp * (id === 'heal' ? HEAL_SHARE : RENEWAL_SHARE * (RENEWAL_MS / 1000))) / x.maxHp;
      const top = best(centres(b, heroes.filter((x) => share(x) < 1)), (p) => {
        const near = heroes.filter((x) => at3(x, p.u, p.v));
        const gain = near.reduce((n, x) => n + per(x), 0);
        const urgent = near.some((x) => share(x) < hurtLine(b, x));
        return urgent || gain >= HEAL_WORTH ? gain + (urgent ? 1 : 0) : 0;
      });
      return top && { id, u: top.u, v: top.v };
    }
    case 'shield': {
      const m = marked(b);
      const top = best(centres(b, heroes), (p) => {
        const near = heroes.filter((x) => at3(x, p.u, p.v) && !x.shield);
        const threat = near.filter((x) => inMarked(b, x, m)).length;
        const dying = near.filter((x) => share(x) < DYING && engaged(x, foes)).length;
        return threat * 2 + dying;
      });
      return top && { id, u: top.u, v: top.v };
    }
    case 'bulwark': {
      const m = marked(b);
      const threat = heroes.filter((x) => inMarked(b, x, m)).length;
      const low = heroes.filter((x) => share(x) < HURT && engaged(x, foes)).length;
      return threat >= 2 || low >= 3 ? { id, u: 0, v: 0 } : undefined;
    }
    case 'cleanse': {
      const top = best(centres(b, heroes), (p) => {
        const near = heroes.filter((x) => at3(x, p.u, p.v));
        const h = near.filter((x) => held(b, x)).length;
        const a = near.filter((x) => ailing(b, x)).length;
        return h >= 1 || a >= 2 ? h * 2 + a : 0;
      });
      return top && { id, u: top.u, v: top.v };
    }
    case 'blink': {
      const x = heroes.filter((y) => !defOf(y).summon && y.owner === undefined).sort((y, z) => share(y) - share(z) || y.id - z.id)[0];
      if (!x || share(x) >= DYING || !foes.some((f) => apart(f, x) <= 1)) return;
      // (to the free tile furthest from every foe; the heroes' own rows break ties)
      let to: { u: number; v: number; s: number } | undefined;
      for (let v = b.board.d - 1; v >= 0; v--)
        for (let u = 0; u < b.board.w; u++) {
          if (!standable(tileAt(b.board, u, v)) || unitAt(b, u, v)) continue;
          const s = Math.min(...foes.map((f) => apart(f, { u, v })));
          if (!to || s > to.s) to = { u, v, s };
        }
      return to && to.s >= 3 ? { id, u: to.u, v: to.v } : undefined;
    }
    case 'meteor':
    case 'poison':
    case 'frost':
    case 'hex': {
      // (the frost and the hex wait for the foes to be at the heroes; the meteor and the cloud for the foes to be standing to fight (engaged), so the
      // blast lands where they are when it falls)
      const top = area((f) => engaged(f, heroes) && (id !== 'frost' || !isFrozen(b, f)) && (id !== 'hex' || f.weakUntil === undefined || f.weakUntil <= b.t));
      return top && { id, u: top.u, v: top.v };
    }
    case 'starfall': {
      const top = best(centres(b, worthy), (p) => {
        const hit = worthy.filter((f) => engaged(f, heroes) && SHOWER_SPOTS.some(([du, dv]) => at3(f, p.u + du, p.v + dv)));
        return hit.length >= CROWD + 1 || hit.some(isBig) ? hit.length + (hit.some(isBig) ? CROWD : 0) : 0;
      });
      return top && { id, u: top.u, v: top.v };
    }
    case 'chain': {
      // (on a foe with others close by to leap to, or the boss)
      const top = best(worthy, (f) => {
        const near = worthy.filter((g) => g !== f && apart(g, f) <= 3).length;
        return isBig(f) ? near + CROWD : near >= 2 || near + 1 >= worthy.length ? near + 1 : 0;
      });
      return top && { id, u: top.u, v: top.v };
    }
    case 'lance': {
      let col: { u: number; v: number; s: number } | undefined;
      for (let u = 0; u < b.board.w; u++) {
        const hit = worthy.filter((f) => f.u === u);
        const s = crowd(hit.length, hit.some(isBig));
        if (s > 0 && (!col || s > col.s)) col = { u, v: hit[0].v, s };
      }
      return col && { id, u: col.u, v: col.v };
    }
    case 'quake': {
      const low = worthy.filter((f) => tileAt(b.board, f.u, f.v)!.h <= 1);
      return crowd(low.length, low.some(isBig)) ? { id, u: 0, v: 0 } : undefined;
    }
    case 'smite':
    case 'deepfreeze': {
      // (the boss, or the sturdiest foe at the heroes with health enough to be worth the bolt)
      const sturdy = (id === 'smite' ? worthy.filter((f) => isBig(f) || f.hp >= SMITE_POWER * 0.6) : worthy.filter((f) => !isFrozen(b, f)))
        .filter((f) => engaged(f, heroes))
        .sort((f, g) => Number(isBig(g)) - Number(isBig(f)) || g.hp - f.hp || f.id - g.id)[0];
      if (!sturdy) return;
      if (id === 'deepfreeze' && !isBig(sturdy) && share(sturdy) < 0.5) return;
      return { id, u: sturdy.u, v: sturdy.v };
    }
    case 'wolves': {
      if (worthy.length < CROWD && !boss) return;
      // (beside the hero with the most foes about it, where there is room)
      const top = best(centres(b, inFight), (p) => {
        let room = 0;
        for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) if (standable(tileAt(b.board, p.u + du, p.v + dv)) && !unitAt(b, p.u + du, p.v + dv)) room++;
        return room ? worthy.filter((f) => apart(f, p) <= 3).length * 10 + Math.min(room, 2) : 0;
      });
      return top && { id, u: top.u, v: top.v };
    }
    case 'haste':
    case 'rally':
    case 'warcry': {
      // (a buff is for a fight still worth having: the boss, or enough foes left with health in them)
      if (!boss && worthy.length < Math.min(CROWD, foes.length)) return;
      if (!worthy.length) return;
      const need = Math.min(BUFF_HEROES, heroes.length);
      if (id === 'rally') return inFight.length >= need && !heroes.some((x) => x.rallyUntil !== undefined && x.rallyUntil > b.t) ? { id, u: 0, v: 0 } : undefined;
      if (id === 'warcry') {
        const mean = inFight.reduce((n, x) => n + x.charge, 0) / Math.max(1, inFight.length);
        return inFight.length >= need && mean <= CHARGE_MAX * CRY_BELOW ? { id, u: 0, v: 0 } : undefined;
      }
      const top = best(centres(b, inFight), (p) => {
        const n = inFight.filter((x) => at3(x, p.u, p.v) && !(x.hasteUntil !== undefined && x.hasteUntil > b.t)).length;
        return n >= Math.min(2, need) ? n : 0;
      });
      return top && { id, u: top.u, v: top.v };
    }
  }
}

/** The spell worth casting now from `ids` (help before harm before buffs; in each, the order the spells are equipped), or none. Pure: it
 *  reads the battle and changes nothing. */
export function chooseSpell(b: Battle, ids: readonly SpellId[]): AutoPick | undefined {
  if (b.phase !== 'fight') return;
  const heroes = heroesOf(b);
  const foes = foesOf(b);
  if (!heroes.length || !foes.length) return;
  const mana = b.spells.mana;
  const help = ids.filter((id) => HELP.has(id));
  const rest = ids.filter((id) => !HELP.has(id));
  const order = [...help, ...rest.filter((id) => !isBuff(id)), ...rest.filter(isBuff)];
  // (the help spells that might be wanted later: the cheapest's cost is kept back, unless the mana is full anyway)
  const keep = help.filter((id) => id !== 'blink').reduce((n, id) => Math.min(n, SPELLS[id].cost), Infinity);
  const reserve = Number.isFinite(keep) && mana < MANA_MAX - 0.5 ? keep : 0;
  for (const id of order) {
    if (!canAfford(b, id)) continue;
    if (!HELP.has(id) && mana - SPELLS[id].cost < reserve) continue;
    const pick = pickFor(b, id, heroes, foes);
    if (pick) return pick;
  }
}
const isBuff = (id: SpellId) => id === 'haste' || id === 'rally' || id === 'warcry';

/** After a tick (`stepBattle`): with Auto on, cast the spell worth casting, if any, through `castSpell`. At most one a tick, and
 *  `AUTO_GAP_MS` between two. Returns the spell cast. */
export function autoCast(b: Battle): SpellId | undefined {
  const ids = b.autoSpells;
  if (!ids?.length || b.phase !== 'fight') return;
  if (b.spells.autoAt !== undefined && b.t - b.spells.autoAt < AUTO_GAP_MS) return;
  const pick = chooseSpell(b, ids);
  if (!pick || !castSpell(b, pick.id, pick.u, pick.v)) return;
  b.spells.autoAt = b.t;
  return pick.id;
}

/** What the page sets `Battle.autoSpells` to: the equipped spells while the Auto switch is on (or an auto-replay plays), else none. */
export const autoSpellsFor = (on: boolean, equipped: readonly SpellId[]): SpellId[] | undefined => (on && equipped.length ? [...equipped] : undefined);
