// The Decrees (KING-SPELLS batch 2, docs/notes/king-spells-b2.md): each ruler's own great spell, once a fight. The page arms the chosen
// ruler's Decree on a fight (`armDecree`); its meter then fills from the mana that will not fit in the bar (the spill, which without a Decree
// pours back into the bar instead), from the mana the king spends on spells, and slowly by itself. Full, one tap casts it (`castDecree`), no
// aim: it touches every hero or every foe. It goes into the fight's log like a spell, so a recorded fight replays it; with Auto on it is cast
// by its own rule (`autoDecree`). The Eidolon's call is apart from it (the War Horn), and both may be used in one fight.
//
// The meter and what feeds it are in `spells.ts` (`feedDecree`, `DECREE_FULL`), beside the mana that feeds it.
//
// A fight never armed plays exactly as before (every headless fight, test and balance table).
//
// Pure rules: no Pixi, no DOM, no randomness.

import { defOf, type Battle, type Unit } from './battle';
import { burnFor, chillFor, cleanse, curseFor, freezeFor, poisonFor, shockFor, unfear } from './ailments';
import { CHAIN_POWER, DECREE_FULL, HEX_MS, HEX_MULT, HASTE_MS, KING, kingStrike, LANCE_POWER, METEOR_POWER, SLOW_MS, type SpellId } from './spells';

export type DecreeId = 'standFast' | 'redSky' | 'longWinter' | 'tempest' | 'rosePrice' | 'stopClock' | 'highNoon' | 'gildedToll';

export interface Decree {
  id: DecreeId;
  name: string;
  text: string;
  /** The spell whose look and sound it borrows (until its own art and voice, batch 5). */
  look: SpellId;
  /** Whom it touches, for Auto's rule. */
  aim: 'foes' | 'heroes';
}

const d = (id: DecreeId, name: string, text: string, look: SpellId, aim: Decree['aim']): Decree => ({ id, name, text, look, aim });
export const DECREES: Record<DecreeId, Decree> = {
  standFast: d('standFast', 'Stand Fast', 'Every hero gains a shield worth 40% of its health for 6s, and no hero stays afraid', 'bulwark', 'heroes'),
  redSky: d('redSky', 'Red Sky', 'Fire falls on every foe: a meteor\'s blow on each, and it burns', 'starfall', 'foes'),
  longWinter: d('longWinter', 'Long Winter', 'Every foe is frozen for 3s, then moves and strikes at half speed', 'frost', 'foes'),
  tempest: d('tempest', 'The Tempest', 'Lightning strikes every foe and leaves it shocked', 'chain', 'foes'),
  rosePrice: d('rosePrice', "The Rose's Price", 'Every foe is poisoned three times over and hexed: it strikes 30% weaker for 8s', 'poison', 'foes'),
  stopClock: d('stopClock', 'Stop the Clock', 'Every foe stands frozen for 3s while every hero is hasted', 'haste', 'foes'),
  highNoon: d('highNoon', 'High Noon', 'Every hero regains 30% of its health, and a beam of sun burns every foe', 'heal', 'heroes'),
  gildedToll: d('gildedToll', 'The Gilded Toll', 'Every fallen hero rises with 40% of its health, and every hero regains 15%', 'resurrect', 'heroes'),
};

export const STAND_FAST_SHARE = 0.4;
export const STAND_FAST_MS = 6000;
export const WINTER_MS = 3000;
export const CLOCK_MS = 3000;
export const NOON_HEAL = 0.3;
export const TOLL_RISE = 0.4;
export const TOLL_HEAL = 0.15;

/** Put the ruler's Decree on a fight (the page, as the fight is set up). Unknown ids are ignored. */
export function armDecree(b: Battle, id: string): void {
  if (id in DECREES) b.spells.decree = { id, fill: 0, used: false };
}

export const decreeReady = (b: Battle) => b.phase === 'fight' && !!b.spells.decree && !b.spells.decree.used && b.spells.decree.fill >= DECREE_FULL;

const heroes = (b: Battle) => b.units.filter((x) => x.alive && x.side === 'hero' && x.id !== 0);
const foes = (b: Battle) => b.units.filter((x) => x.alive && x.side === 'foe');

/** Cast the armed Decree. False (and nothing changed) unless the fight is on and the meter is full and unspent. */
export function castDecree(b: Battle): boolean {
  if (!decreeReady(b)) return false;
  const s = b.spells.decree!;
  s.used = true;
  const dc = DECREES[s.id as DecreeId];
  const ev = b.spells.events;
  ev.push({ kind: 'decree', id: dc.id, look: dc.look });
  ev.push({ kind: 'spell', id: dc.look, u: 0, v: 0 });
  (b.log ??= []).push({ t: b.t, kind: 'decree' });
  const fx = (to: Unit) => ev.push({ kind: 'spellfx', id: dc.look, to: to.id });
  const mend = (x: Unit, share: number) => {
    const amount = Math.min(x.maxHp - x.hp, Math.round(x.maxHp * share * (x.healMult ?? 1)));
    x.hp += amount;
    ev.push({ kind: 'heal', to: x.id, amount });
  };
  switch (dc.id) {
    case 'standFast':
      for (const x of heroes(b)) {
        x.shield = { hp: Math.round(x.maxHp * STAND_FAST_SHARE), until: b.t + STAND_FAST_MS };
        unfear(x);
        fx(x);
      }
      break;
    case 'redSky':
      for (const x of foes(b)) {
        fx(x);
        kingStrike(b, x, METEOR_POWER, true, ev);
        if (x.alive) burnFor(b, KING, x);
      }
      break;
    case 'longWinter':
    case 'stopClock':
      for (const x of foes(b)) {
        if (freezeFor(b, x, dc.id === 'longWinter' ? WINTER_MS : CLOCK_MS, true)) x.step = undefined;
        if (dc.id === 'longWinter') chillFor(b, x, SLOW_MS, true, true);
        fx(x);
      }
      if (dc.id === 'stopClock')
        for (const x of heroes(b)) {
          x.hasteUntil = b.t + HASTE_MS;
          ev.push({ kind: 'haste', to: x.id, ms: HASTE_MS });
          fx(x);
        }
      break;
    case 'tempest':
      for (const x of foes(b)) {
        fx(x);
        kingStrike(b, x, CHAIN_POWER, false, ev);
        if (x.alive) shockFor(b, KING, x);
      }
      break;
    case 'rosePrice':
      for (const x of foes(b)) {
        for (let i = 0; i < 3; i++) poisonFor(b, KING, x);
        if (x.weakUntil === undefined) x.power = (x.power ?? 1) * HEX_MULT;
        x.weakUntil = b.t + HEX_MS;
        curseFor(b, KING, x, HEX_MS);
        fx(x);
      }
      break;
    case 'highNoon':
      for (const x of heroes(b)) {
        mend(x, NOON_HEAL);
        fx(x);
      }
      for (const x of foes(b)) {
        fx(x);
        kingStrike(b, x, LANCE_POWER, false, ev);
      }
      break;
    case 'gildedToll':
      // (the Last Stand's fallen stay down, as with Resurrect)
      if (!b.stand)
        for (const x of b.units.filter((y) => !y.alive && y.side === 'hero' && !defOf(y).summon && y.owner === undefined && !b.units.some((o) => o.alive && o.u === y.u && o.v === y.v))) {
          x.alive = true;
          x.hp = Math.max(1, Math.round(x.maxHp * TOLL_RISE));
          x.diedAt = undefined;
          x.busyUntil = b.t + 500;
          x.charge = 0;
          x.charge2 = undefined;
          cleanse(b, x);
          ev.push({ kind: 'heal', to: x.id, amount: x.hp });
          fx(x);
        }
      for (const x of heroes(b)) {
        mend(x, TOLL_HEAL);
        fx(x);
      }
      break;
  }
  return true;
}

/**
 * Auto's rule for the Decree (with the Auto switch on): a Decree on the foes is cast on a boss below half its health, or on four foes or more
 * still worth fighting; one on the heroes when three heroes are below half (or one has fallen, for the Gilded Toll). Returns whether it cast.
 */
export function autoDecree(b: Battle): boolean {
  if (!decreeReady(b)) return false;
  const dc = DECREES[b.spells.decree!.id as DecreeId];
  const fs = foes(b);
  if (!fs.length) return false;
  const hs = heroes(b);
  let go: boolean;
  if (dc.aim === 'foes') go = fs.some((x) => (x.size ?? 1) > 1 && x.hp < x.maxHp * 0.5) || fs.filter((x) => x.hp > x.maxHp * 0.25).length >= 4;
  else if (dc.id === 'gildedToll') go = !b.stand && b.units.some((x) => !x.alive && x.side === 'hero' && !defOf(x).summon && x.owner === undefined);
  else go = hs.filter((x) => x.hp < x.maxHp * 0.5).length >= Math.min(3, hs.length);
  return go && castDecree(b);
}

export { DECREE_FULL, DECREE_PER_SEC, DECREE_PER_SPENT } from './spells';
