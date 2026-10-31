// The passing cart (MID-EVENTS): the merchant's card between an army's or the daily's waves is a little market, not two wares. Its
// stock is drawn when the card is made, from a side stream of the run's seed and the stage (`mixSeed(seed, MARKET_SALT, stage, roll)`),
// so a saved card shows the same wares and a run's other draws stay as they were.
//
//   two pieces of gear   the run's tier (an army further on sells better), two different slots
//   two potions          of three: Draught of Iron (+hp), Fire Tonic (+attack), Quicksilver (+move speed), for the next fight
//   a sellsword          a hero of the party for hire, grade 1 (one the bench has already, when it can, so it makes a pair)
//   a relic, now and then
//   a rummage            pay a little to have the cart's back searched: the unsold wares are drawn again, once a visit
//
// Buys are limited (`MARKET_BUYS` a visit) and the prices are the old merchant's and the tower shop's, so a run's gold goes where it
// went: it buys the same things a little more by choice. Pure rules: no Pixi, no DOM.

import { mixSeed, Rng } from './rng';
import { gearText, makeGear, SLOTS, type Gear } from './gear';
import { RELIC_IDS, RELICS } from './relics';
import { HEROES, UNITS } from './units';
import { gearStage, summonCost, type Run } from './run';
import type { EventOption } from './events';
import { drawGuest, guestPrice } from './guest';
import { heroName } from './heroNames';

/** The cart's guest hero as a ware (GUEST-HERO): dear, and a sixth hero on the field for this run. */
export const guestOption = (run: Run, stage: number, kind: string): EventOption => ({
  label: `Guest: ${heroName(kind)} the ${UNITS[kind].name}`,
  text: 'fights as a sixth hero beside your five, at your party\'s level, for this run only',
  cost: guestPrice(run, stage),
  effect: { t: 'guest', kind },
});

const MARKET_SALT = 0x3a4e7;
/** Wares a visit may buy (the rummage does not count). */
export const MARKET_BUYS = 3;
/** The share of visits that bring a relic (while the run has one to find). */
export const MARKET_RELIC = 0.5;
/** A sellsword costs the next Hire's price and this much more (as the tower shop's hero). */
export const HIRE_EXTRA = 10;

/** The potions the cart sells: a boon for the next fight only, priced a little above a wave's share of gold. */
export const POTIONS = [
  { id: 'iron', label: 'Draught of Iron', text: '+25% hp in the next fight', cost: (s: number) => 14 + s, buff: { hp: 1.25 } },
  { id: 'fire', label: 'Fire Tonic', text: '+12% attack in the next fight', cost: (s: number) => 16 + s, buff: { atk: 1.12 } },
  { id: 'quick', label: 'Quicksilver', text: 'heroes walk 20% faster in the next fight', cost: (s: number) => 12 + s, buff: { speed: 1.2 } },
] as const;

const gearId = (run: Run) => (run.nextGear = (run.nextGear ?? 1) + 1) - 1;
/** The tier the cart's gear is: a drop's for the stage (an army further on drops as if further on). */
export const marketTier = (run: Run, stage: number): number => 1 + Math.floor((gearStage(run, stage) - 1) / 8);
/** A piece of gear's price on the cart (the old merchant's). */
export const gearPrice = (g: Gear, stage: number): number => 28 * g.tier + 2 * stage;
export const relicPrice = (stage: number): number => 70 + 4 * stage;
export const rummagePrice = (stage: number): number => 10 + stage;

/** The hero the cart's sellsword is: a kind of the party, one the run has a lone grade-1 of when it can (so a pair is a buy away). */
function sellsword(run: Run, rng: Rng): string {
  const pool = run.pool?.length ? run.pool : HEROES;
  const lone = pool.filter((k) => run.roster.filter((h) => h.kind === k && h.grade === 1).length === 1);
  return rng.pick(lone.length ? lone : pool);
}

/** The cart's wares at a stage (`roll` 0 for the first look, 1 after a rummage). Gear ids come from the run. */
export function stockMarket(run: Run, stage: number, roll = 0): EventOption[] {
  const rng = new Rng(mixSeed(run.seed, MARKET_SALT, stage, roll));
  const wares: EventOption[] = [];
  const tier = marketTier(run, stage);
  const slots = [...SLOTS];
  for (let i = 0; i < 2; i++) {
    const slot = slots.splice(rng.int(0, slots.length - 1), 1)[0];
    const g = makeGear(gearId(run), slot, tier);
    wares.push({ label: g.name, text: `${g.slot}: ${gearText(g)}`, cost: gearPrice(g, stage), effect: { t: 'gear', gear: g } });
  }
  const potions = [...POTIONS];
  for (let i = 0; i < 2; i++) {
    const p = potions.splice(rng.int(0, potions.length - 1), 1)[0];
    wares.push({ label: p.label, text: p.text, cost: p.cost(stage), effect: { t: 'buff', ...p.buff } });
  }
  const kind = sellsword(run, rng);
  wares.push({ label: `A sellsword ${UNITS[kind].name}`, text: 'joins the bench, grade 1', cost: summonCost(run) + HIRE_EXTRA, effect: { t: 'hire', kind } });
  const relics = RELIC_IDS.filter((id) => !run.relics?.includes(id));
  if (relics.length && rng.chance(MARKET_RELIC)) {
    const id = rng.pick(relics);
    wares.push({ label: RELICS[id].name, text: RELICS[id].text, cost: relicPrice(stage), effect: { t: 'relic', id } });
  }
  return wares;
}

/** The whole card's options: the wares, the rummage, and the way on. */
export function marketOptions(run: Run, stage: number): EventOption[] {
  // (now and then a guest hero, on its own side stream, so the stock is as it was: GUEST-HERO)
  const guest = drawGuest(run, stage);
  return [
    ...stockMarket(run, stage),
    ...(guest ? [guestOption(run, stage, guest)] : []),
    { label: 'Rummage in the back', text: 'the unsold wares are put away and others brought out (once a visit)', cost: rummagePrice(stage), effect: { t: 'reroll' } },
    { label: 'Leave', text: 'Move on.', cost: 0, effect: { t: 'leave' } },
  ];
}

/** Whether an option of a market card is a ware (it counts against the buys). */
export const isWare = (o: EventOption): boolean => o.effect.t !== 'reroll' && o.effect.t !== 'leave';
