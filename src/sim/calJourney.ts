// The Calamity as a longer journey (DEPTH-BUILD, docs/notes/depth-design.md section 6). The Calamity is three regions now (the rift's,
// guardians 1, 3 and 6: `RIFT_BOSSES`), so each region is an act, the same length as before (Q6.3), with Karnok always last (Q6.2). After
// Act I the party stands at the **crossroads**: three rifts, each a guardian not yet met (drawn from the four between Gorvak and Karnok),
// and the one taken waits at the end of Act II. After Act II only Karnok is left, so the second crossroads offers a **boon** instead (the
// director's call): one of three. A guardian's strength follows its place in the journey (the act), not its name, so any choice is as hard
// as any other. Each draw has its own side stream, so a seed's
// floors and fights stay as they were; a run that never chooses keeps the fixed order. Pure rules: no Pixi, no DOM.

import { mixSeed, Rng } from './rng';

/** A list in an order drawn from a stream (Fisher-Yates). */
function shuffled<T>(rng: Rng, xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const k = rng.int(0, i);
    [out[i], out[k]] = [out[k], out[i]];
  }
  return out;
}

/** Karnok, the Hollow Heart's guardian, is always the sixth. */
export const KARNOK_LAND = 6;

export type BoonId = 'mended' | 'purse' | 'harder' | 'easier';
export const BOONS: Readonly<Record<BoonId, { name: string; line: string }>> = {
  mended: { name: 'The Healer\'s Rift', line: 'Every hero is mended to full.' },
  purse: { name: 'The Gilded Rift', line: '+80 gold now.' },
  harder: { name: 'The Burning Rift', line: 'The last act\'s foes are 15% stronger; +150 gold now.' },
  easier: { name: 'The Quiet Rift', line: 'The last act\'s foes are 10% weaker.' },
};
export const JOURNEY = { PURSE: 80, HARDER_GOLD: 150, HARDER: 1.15, EASIER: 0.9 };

/** What the journey keeps in the Calamity's run (`TowerState.journey`; missing is the fixed order, no boon). */
export interface Journey {
  /** The guardian (1 to 6) at each act, once the first crossroads is passed. */
  route?: number[];
  /** A crossroads waiting for the player: after map 2 (lands) or map 4 (boons), and what it offers. */
  cross?: { after: 1; lands: number[] } | { after: 2; boons: BoonId[] };
  boon?: BoonId;
  /** Provisions carried (`PROVISIONS`): a campfire's rest eats one; missing is the start's three (a run saved before has them). */
  provisions?: number;
  /** The oaths sworn (three at most) and the scars taken, by roster id (each −10% health). */
  oaths?: OathId[];
  scars?: Record<number, number>;
  /** The traveller met in Act I, whether helped, and whether it has come back. */
  met?: { who: TravellerId; help: boolean; back?: boolean };
}

/** Provisions: a run starts with three and carries six at most; a campfire's rest costs one, and with none the party rests at half. A shop
 *  sells them (`PROVISIONS.COST` gold). */
export const PROVISIONS = { START: 3, MAX: 6, COST: 25, HUNGRY: 0.5, /** the switch (tools measure without them) */ on: true };
export const provisionsOf = (j: Journey | undefined): number => j?.provisions ?? PROVISIONS.START;
/** A rest: eats a provision if there is one; returns the share of the usual healing it gives (1, or half when none were left). */
export function eatProvision(j: Journey): number {
  if (!PROVISIONS.on) return 1;
  const n = provisionsOf(j);
  if (n <= 0) return PROVISIONS.HUNGRY;
  j.provisions = n - 1;
  return 1;
}
/** Buy a provision at a shop: false when the sack is full or the gold is short. */
export function buyProvision(run: { gold: number }, j: Journey): boolean {
  const n = provisionsOf(j);
  if (n >= PROVISIONS.MAX || run.gold < PROVISIONS.COST) return false;
  run.gold -= PROVISIONS.COST;
  j.provisions = n + 1;
  return true;
}

/** The fixed order: the guardian at each act when nothing is chosen. */
export const FIXED_ROUTE: readonly number[] = [1, 3, KARNOK_LAND];
/** The guardian at an act of the journey: the route's, or the fixed order's. */
export const landAt = (j: Journey | undefined, act: number): number => j?.route?.[act - 1] ?? FIXED_ROUTE[act - 1] ?? act;

/** An act's guardian has fallen: the crossroads that follows it (after Act I: three guardians; after Act II: three boons), else none. */
export function crossroadsAfter(seed: number, j: Journey | undefined, act: number, acts: number): Journey['cross'] | undefined {
  if (acts !== 3) return undefined;
  if (act === 1 && !j?.route) return { after: 1, lands: shuffled(new Rng(mixSeed(seed, 0xc055)), [2, 3, 4, 5]).slice(0, 3) };
  if (act === 2 && !j?.boon) return { after: 2, boons: shuffled(new Rng(mixSeed(seed, 0xb007)), Object.keys(BOONS) as BoonId[]).slice(0, 3) };
  return undefined;
}

/** Take a rift at the first crossroads: that guardian at the end of Act II, Karnok last. False when it is not offered. */
export function chooseLand(j: Journey, land: number): boolean {
  if (j.cross?.after !== 1 || !j.cross.lands.includes(land)) return false;
  j.route = [FIXED_ROUTE[0], land, KARNOK_LAND];
  delete j.cross;
  return true;
}

/** Take a boon at the second crossroads. The page applies its gold and healing (`boonNow`); the harder or easier rift is read by the fights. */
export function chooseBoon(j: Journey, boon: BoonId): boolean {
  if (j.cross?.after !== 2 || !j.cross.boons.includes(boon)) return false;
  j.boon = boon;
  delete j.cross;
  return true;
}
/** What a boon gives at once: gold, and whether every hero is mended. */
export const boonNow = (b: BoonId): { gold: number; mend: boolean } => ({ gold: b === 'purse' ? JOURNEY.PURSE : b === 'harder' ? JOURNEY.HARDER_GOLD : 0, mend: b === 'mended' });
/** The foes' strength in an act for the boon (the last act only). */
export const boonFoes = (j: Journey | undefined, act: number): number => (act < 3 ? 1 : j?.boon === 'harder' ? JOURNEY.HARDER : j?.boon === 'easier' ? JOURNEY.EASIER : 1);

/** The board line: "Act II of III". */
export const actLine = (act: number): string => `Act ${['I', 'II', 'III'][act - 1] ?? act} of III`;

/* ------------------------------------------------------------------ oaths and scars (carried to the end of the run) */

export type OathId = 'iron' | 'ember' | 'coin' | 'vigil';
/** An oath: a lasting rule with a gift and a cost, sworn at a campfire. */
export const OATHS: Readonly<Record<OathId, { name: string; gift: string; cost: string; heroHp?: number; heroAtk?: number; foeHp?: number; gold?: number; rest?: number }>> = {
  iron: { name: 'Oath of Iron', gift: 'Heroes +8% health.', cost: 'Foes +5% health.', heroHp: 1.08, foeHp: 1.05 },
  ember: { name: 'Oath of the Ember', gift: 'Heroes +6% attack.', cost: 'Rests heal a quarter less.', heroAtk: 1.06, rest: 0.75 },
  coin: { name: 'Oath of the Coin', gift: 'Fights pay 30% more gold.', cost: 'Foes +6% health.', gold: 1.3, foeHp: 1.06 },
  vigil: { name: 'Oath of the Vigil', gift: 'Rests heal a third more.', cost: 'Heroes −4% attack.', rest: 1.33, heroAtk: 0.96 },
};
export const OATH_MAX = 3;
/** A scar: −10% health on one hero for the rest of the run, taken for gold at a campfire. */
export const SCAR = { HP: 0.9, GOLD: 60 };

/** The oath a campfire offers, if any: about one campfire in two, drawn from the run's seed and the spot (its own side stream). */
export function oathOffer(seed: number, act: number, node: number, j: Journey | undefined): OathId | undefined {
  const rng = new Rng(mixSeed(seed, 0x0a7b, act, node));
  if (!rng.chance(0.5)) return undefined;
  const open = (Object.keys(OATHS) as OathId[]).filter((o) => !j?.oaths?.includes(o));
  return open.length ? open[rng.int(0, open.length - 1)] : undefined;
}
/** Swear an oath: at most three; a fourth replaces the oldest. */
export function swearOath(j: Journey, o: OathId): OathId | undefined {
  const list = (j.oaths ??= []);
  if (list.includes(o)) return undefined;
  const dropped = list.length >= OATH_MAX ? list.shift() : undefined;
  list.push(o);
  return dropped;
}
/** Take a scar on a hero (by its roster id) for gold. */
export function takeScar(run: { gold: number }, j: Journey, heroId: number): boolean {
  (j.scars ??= {})[heroId] = (j.scars[heroId] ?? 0) + 1;
  run.gold += SCAR.GOLD;
  return true;
}
const oathsOf = (j: Journey | undefined) => (j?.oaths ?? []).map((o) => OATHS[o]);
/** The oaths' product of one number (1 when none). */
const prod = (j: Journey | undefined, k: 'heroHp' | 'heroAtk' | 'foeHp' | 'gold' | 'rest') => oathsOf(j).reduce((n, o) => n * (o[k] ?? 1), 1);
export const oathFoeHp = (j: Journey | undefined): number => prod(j, 'foeHp');
export const oathGold = (j: Journey | undefined): number => prod(j, 'gold');
export const oathRest = (j: Journey | undefined): number => prod(j, 'rest');
/** A hero's boost with its oaths and its scars laid on. */
export function journeyBoost<B extends { hp?: number; atk?: number }>(j: Journey | undefined, heroId: number, base: B): B {
  if (!j?.oaths?.length && !j?.scars?.[heroId]) return base;
  const scar = SCAR.HP ** (j.scars?.[heroId] ?? 0);
  return { ...base, hp: (base.hp ?? 1) * prod(j, 'heroHp') * scar, atk: (base.atk ?? 1) * prod(j, 'heroAtk') };
}

/* ------------------------------------------------------------------ travellers (a small story through the run) */

export type TravellerId = 'pilgrim' | 'deserter' | 'cartographer';
export const TRAVELLERS: Readonly<Record<TravellerId, { name: string; meet: string; help: string; wrong: string; thanks: string; trap: string }>> = {
  pilgrim: { name: 'The Pilgrim', meet: 'A pilgrim sits by the fire, her feet bleeding through her sandals.', help: 'Share bandages and bread (40 gold)', wrong: 'Take her alms bowl (+40 gold)', thanks: 'The pilgrim prays over the party: every hero is mended to full.', trap: 'The pilgrim\'s curse finds you: every hero loses 15% of their health.' },
  deserter: { name: 'The Deserter', meet: 'A deserter from the Calamity\'s host begs a place by the fire.', help: 'Hide him and feed him (40 gold)', wrong: 'Turn him in for the bounty (+40 gold)', thanks: 'The deserter returns with a stolen paymaster\'s purse: +100 gold.', trap: 'The deserter\'s old company remembers you: every hero loses 15% of their health.' },
  cartographer: { name: 'The Cartographer', meet: 'A cartographer has lost her maps to the wind and her mule to wolves.', help: 'Buy her a new mule (40 gold)', wrong: 'Sell her a lame one (+40 gold)', thanks: 'The cartographer leaves two sacks of provisions and a sketch of the road ahead.', trap: 'The cartographer\'s map was false: every hero loses 15% of their health.' },
};
export const TRAVEL = { GOLD: 40, THANKS_GOLD: 100, PROVISIONS: 2, TRAP: 0.15 };

/** The traveller a campfire of Act I meets, if any: one at the first such campfire, chosen by the run's seed (its own side stream). */
export function travellerAt(seed: number, act: number, j: Journey | undefined): TravellerId | undefined {
  if (act !== 1 || j?.met) return undefined;
  const ids = Object.keys(TRAVELLERS) as TravellerId[];
  return ids[new Rng(mixSeed(seed, 0x7a7e)).int(0, ids.length - 1)];
}
/** Help or wrong the traveller met (the gold moves now). */
export function meetTraveller(run: { gold: number }, j: Journey, who: TravellerId, help: boolean): boolean {
  if (j.met || (help && run.gold < TRAVEL.GOLD)) return false;
  j.met = { who, help };
  run.gold += help ? -TRAVEL.GOLD : TRAVEL.GOLD;
  return true;
}
/** Whether the traveller returns at this campfire: once, at the first campfire of Act II or III after the meeting. */
export const travellerReturns = (j: Journey | undefined, act: number): boolean => !!j?.met && !j.met.back && act >= 2;
/** The return: a thanks for a helped traveller (a mend, gold or provisions), a trap for a wronged one. Marks it back. */
export function travellerBack(j: Journey): { line: string; gold: number; mend: boolean; provisions: number; hurt: number } {
  const m = j.met!;
  m.back = true;
  const t = TRAVELLERS[m.who];
  if (!m.help) return { line: t.trap, gold: 0, mend: false, provisions: 0, hurt: TRAVEL.TRAP };
  if (m.who === 'pilgrim') return { line: t.thanks, gold: 0, mend: true, provisions: 0, hurt: 0 };
  if (m.who === 'deserter') return { line: t.thanks, gold: TRAVEL.THANKS_GOLD, mend: false, provisions: 0, hurt: 0 };
  j.provisions = Math.min(PROVISIONS.MAX, provisionsOf(j) + TRAVEL.PROVISIONS);
  return { line: t.thanks, gold: 0, mend: false, provisions: TRAVEL.PROVISIONS, hurt: 0 };
}
