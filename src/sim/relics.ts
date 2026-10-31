// Relics: things the keep has lost, found again on the road (RELICS-2, the owner's "more of a relic, rather than an individual piece of
// gear"; the design is docs/notes/relics-redesign.md). Each has a name, a line of lore, a rarity and a rule with character: a price (a
// strong gift with a cost, `price`), a condition (a fight hook that is on only while something is true), a growing power (`grow`, read
// from the run's tally of waves won, elites felled and heroes fallen) or a tie to the keep's old enemies. They last the rest of a run; a
// run holds them by id (`run.relics`). `relicEffects` folds them into one set of numbers the fight start reads: hp and attack go into the
// heroes' boost, the rest become a team bonus like a trait's, and the rest are the fight's own hooks (`RelicHooks`, `relicFight.ts`).
//
// Twenty-four are the keep's own, in six Chapters of its history (`relicSets.ts`: two of a chapter give a small bonus, three the strong
// one); six are Storied (only the tower's black altar and the cursed crown give them). The Calamity's sets keep their pieces, in
// `relicSets.ts`, until their own turn comes (step 2).
//
// Pure rules: no Pixi, no DOM, no randomness.

import { setBonus, SET_RELICS, type SetHooks } from './relicSets';
import type { TraitEffects } from './traits';

/** How rare a relic is: what draws it (`pickRelic`), what it costs, and its frame on the page. */
export type Rarity = 'common' | 'rare' | 'storied';

export interface Relic {
  id: string;
  name: string;
  /** What it does, in plain words (the good of it). */
  text: string;
  /** What it costs, when it has a price (shown in red on its card). */
  price?: string;
  /** One line of the keep's history. */
  lore?: string;
  rarity: Rarity;
  effects: RelicEffects;
  /** A growing power: this stat starts at `base` and gains `per` for each of the run's `mark`, to `max`. */
  grow?: Grow;
  /** A Storied relic: only the tower's black altar and the cursed crown give it (never a shop, chest or drop). */
  great?: boolean;
}

/** What a relic's power grows with: the run's tally (`RelicMarks`). */
export interface Grow {
  stat: 'atk' | 'crit' | 'charge';
  base: number;
  per: number;
  mark: keyof RelicMarks;
  max: number;
}

/** The run's tally that growing relics read: waves won, elites and bosses felled, heroes fallen, and the Phoenix's rises. */
export interface RelicMarks {
  won?: number;
  elites?: number;
  fallen?: number;
  rises?: number;
}

/** What a relic's numbers may depend on: the run's tally and its purse. */
export interface RelicCtx {
  marks?: RelicMarks;
  gold?: number;
}

/** The fight's relic rules (`relicFight.ts`). Shares add when more than one relic gives the same. */
export interface RelicHooks {
  /** Heroes deal this much more while no hero has fallen this fight. */
  unbroken?: number;
  /** The king starts each fight with this much mana. */
  startMana?: number;
  /** When one hero is left standing, it heals `heal` of its health and takes `guard` less damage (once a fight). */
  lastStand?: { heal: number; guard: number };
  /** Heroes placed on the back row have this much more hp. */
  backHp?: number;
  /** The king's mana fills twice as fast for this many ms at a fight's start. */
  earlyMana?: number;
  /** A hero at full health charges its skills this much faster. */
  fullCharge?: number;
  /** A hero at full health deals this much more. */
  fullAtk?: number;
  /** Heroes deal `v` more for the first `ms` of a fight. */
  earlyAtk?: { ms: number; v: number };
  /** Shooters deal this much more. */
  shotAtk?: number;
  /** The foes wait this many ms more when a boss is with them. */
  bossFirst?: number;
  /** Heroes start each fight this share of their health down. */
  startHp?: number;
  /** Heroes take this much less from bosses. */
  bossGuard?: number;
  /** Heroes slip `v` more of blows for the first `ms` of a fight. */
  earlyDodge?: { ms: number; v: number };
  /** A crit on a foe under half health deals this much more. */
  execCrit?: number;
  /** Heroes deal this much more to beasts. */
  beast?: number;
  /** When a hero falls the rest act `speed` faster for `ms`, up to `max` at once. */
  grief?: { speed: number; ms: number; max: number };
  /** Shooters deal this much more from higher ground than their target's. */
  highShot?: number;
  /** The strongest foe of every fight has this much more hp and attack. */
  champion?: number;
  /** Bosses have this much more attack. */
  bossAtk?: number;
  /** One hero (drawn on the fight's seed) starts each fight this share of its health down. */
  struck?: number;
  /** Every foe has this much more hp. */
  foeHp?: number;
}

/** What a set of relics gives. Multipliers are x1 when absent. */
export interface RelicEffects extends TraitEffects {
  /** The foes wait this many ms at the start of a fight. */
  first?: number;
  /** One hero that falls rises again at half health, once a fight. */
  revive?: boolean;
  /** Extra gold for each win (a price relic's may be less than none). */
  gold?: number;
  /** Shop and merchant prices are multiplied by this. */
  price?: number;
  /** What the owned sets' bonuses ask of the fight (`relicSets.ts`); absent when no set is switched on. */
  set?: SetHooks;
  /** The relics' own fight rules (`relicFight.ts`); absent when none is held. */
  hooks?: RelicHooks;
}

/** After this many rises in a run the Phoenix Feather burns out and is Phoenix Ash. */
export const PHOENIX_RISES = 5;
/** What Phoenix Ash gives. */
const ASH: RelicEffects = { atk: 1.05 };

const c = (id: string, name: string, lore: string, text: string, effects: RelicEffects, more: Partial<Relic> = {}): Relic => ({ id, name, lore, text, effects, rarity: 'common', ...more });

export const RELICS: Record<string, Relic> = {
  // ---- Chapter I: The Founding
  banner: c('banner', 'The First Banner', "Sewn from the founders' cloaks. It has never been washed and never been taken.", '+6% hp; +10% attack as well while no hero has fallen this fight', { hp: 1.06, hooks: { unbroken: 0.1 } }),
  scholarScroll: c('scholarScroll', "The Founder's Ledger", 'Every stone of the keep, counted twice, in a hand that never shook.', 'skills charge 10% faster, and 3% more for each wave won this run (to 50%)', {}, { rarity: 'rare', grow: { stat: 'charge', base: 0.1, per: 0.03, mark: 'won', max: 0.5 } }),
  holyChalice: c('holyChalice', "St Oswin's Cup", 'The saint drank from it once and declared it too big.', "the king starts each fight with 2 mana, and it fills 10% faster", { mana: 1.1, hooks: { startMana: 2 } }),
  saintMedal: c('saintMedal', "The Warden's Medal", 'Given to whoever held the gate last. Most of the names on it are scratched out.', 'when one hero is left standing, it heals 50% and takes 40% less damage', { hooks: { lastStand: { heal: 0.5, guard: 0.4 } } }),
  // ---- Chapter II: The Long Winter
  ironShield: c('ironShield', 'The Gate Boss', 'The iron boss of the old gate, prised off when the gate went.', 'heroes take 12% less damage', { guard: 0.12, speed: 0.96 }, { price: 'they act and walk 4% slower' }),
  hourglass: c('hourglass', 'The Stopped Hourglass', 'Its sand stopped in the Long Winter and has not moved since.', "the king's mana fills 15% faster, and twice as fast in each fight's first 10 seconds", { mana: 1.15, hooks: { earlyMana: 10000 } }, { rarity: 'rare' }),
  frostSapphire: c('frostSapphire', 'Rime Sapphire', 'Nobody knows who froze it. Everybody knows not to lick it.', 'a hero at full health deals 10% more and charges its skills 20% faster', { hooks: { fullCharge: 0.2, fullAtk: 0.1 } }),
  winterCloak: c('winterCloak', "The Sentry's Cloak", 'Worn by eleven sentries over one winter. Only the cloak came back warm.', '+6% hp; +16% for heroes placed on the back row', { hp: 1.06, hooks: { backHp: 0.094 } }),
  // ---- Chapter III: The Burning
  phoenix: c('phoenix', 'Phoenix Feather', 'From the bird that nested in the chimney during the Burning, and refused to leave after.', `once a fight, the first hero to fall rises at half health; after ${PHOENIX_RISES} rises it burns out to Phoenix Ash (+5% attack)`, { revive: true }, { rarity: 'rare' }),
  warDrum: c('warDrum', 'The Siege Drum', 'Beaten on the walls all night, so the town would know the keep still stood.', 'the foes wait 1 second at the start of a fight, and the heroes deal 10% more in its first 10 seconds', { first: 1000, hooks: { earlyAtk: { ms: 10000, v: 0.1 } } }),
  emberRuby: c('emberRuby', 'Ember of the Great Hall', 'The last coal of the hall\'s hearth. It has not gone out, and it is not polite.', '+16% attack for every hero', { atk: 1.16, hooks: { startHp: 0.08 } }, { price: 'heroes start each fight 8% of their health down' }),
  dragonScale: c('dragonScale', 'Scorched Scale', 'Shed by Vaelkhar on the one night he came to the keep as a guest.', 'heroes take 5% less damage, and 12% less from bosses', { guard: 0.05, hooks: { bossGuard: 0.074 } }),
  // ---- Chapter IV: The Night Watch
  featherCharm: c('featherCharm', "The Watchman's Charm", 'Every watchman wore one. The ones who forgot are in the annals.', "heroes slip 5% of blows, and 15% in each fight's first 8 seconds", { dodge: 0.05, hooks: { earlyDodge: { ms: 8000, v: 0.1 } } }),
  hawkEye: c('hawkEye', "The Hawk's Eye", "The glass eye of the keep's last falconer, who said it saw better than the other.", '+6% crit chance, and 2% more for each elite or boss felled this run (to 24%)', {}, { rarity: 'rare', grow: { stat: 'crit', base: 0.06, per: 0.02, mark: 'elites', max: 0.24 } }),
  shadowCloak: c('shadowCloak', "The Cutpurse's Cloak", 'Taken off a thief the watch caught. The watch kept it; the thief kept running.', 'heroes slip 14% of blows', { dodge: 0.14, guard: -0.05 }, { price: 'they take 5% more from those that land' }),
  viperFang: c('viperFang', "The Poisoner's Fang", 'Found in the well. The well was not used again.', '+6% crit chance; crits on a foe under half health deal 40% more', { crit: 0.06, hooks: { execCrit: 0.4 } }),
  // ---- Chapter V: The Hunt
  whetstone: c('whetstone', 'The Old Whetstone', "Worn to a sliver by forty generations of the keep's blades.", '+3% attack, and 1% more for each wave won this run (to 15%)', {}, { grow: { stat: 'atk', base: 0.03, per: 0.01, mark: 'won', max: 0.15 } }),
  swiftBoots: c('swiftBoots', "The Courier's Boots", "They ran the keep's last letter out. They came back without the courier.", 'heroes act and walk 11% faster', { speed: 1.11, hp: 0.97 }, { price: 'they have 3% less hp' }),
  wolfFang: c('wolfFang', 'The Wolf-Tooth Necklace', 'One tooth from every wolf the huntmaster killed. It is a long necklace.', '+5% attack; 15% more against beasts', { atk: 1.05, hooks: { beast: 0.15 } }),
  beastHarness: c('beastHarness', "The Huntmaster's Harness", 'The huntmaster\'s own, from the year the pack came back for him.', 'when a hero falls, the rest act 20% faster for 10 seconds (up to three at once)', { hooks: { grief: { speed: 0.2, ms: 10000, max: 3 } } }, { rarity: 'rare' }),
  // ---- Chapter VI: The Treasury
  luckyCoin: c('luckyCoin', 'The Coronation Crown-Piece', 'Minted for a coronation that was called off at the last minute.', '+8 gold for each win, and 1 more for every 50 gold you hold (to +16)', { gold: 8 }),
  gildedIngot: c('gildedIngot', 'The Tax Ingot', "The whole of one year's tax, melted down so nobody could spend it.", '+20 gold for each win', { gold: 20, price: 1.1 }, { price: 'every shop and merchant price is 10% higher' }),
  jewelCrown: c('jewelCrown', 'The Pawned Crown', 'Pawned three times, redeemed twice.', '+6% hp and +6% attack for every hero', { hp: 1.06, atk: 1.06, gold: -10 }, { rarity: 'rare', price: 'each win costs 10 gold' }),
  spyglass: c('spyglass', 'The Watchtower Glass', 'From the highest window, where you could see them coming a day off.', 'shooters reach further from high ground and deal 10% more, 20% from above', { reach: 0.3, hooks: { shotAtk: 0.1, highShot: 0.09 } }),
  // ---- the Storied relics (the tower's black altar and the cursed crown only)
  sunCrown: c('sunCrown', 'The Crown of the First King', 'The keep\'s first crown. Every king since has found it too heavy.', '+18% attack and +18% hp for every hero', { atk: 1.18, hp: 1.18, hooks: { champion: 0.12 } }, { rarity: 'storied', great: true, price: 'the strongest foe of every fight has 12% more hp and attack' }),
  dragonHeart: c('dragonHeart', "Vaelkhar's Heart", "He gave it to the keep's first queen. He would like it back.", '+15% hp, and heroes take 15% less damage', { hp: 1.15, guard: 0.15, hooks: { bossAtk: 0.1 } }, { rarity: 'storied', great: true, price: 'bosses have 10% more attack (they can smell it)' }),
  stormRing: c('stormRing', "Voltara's Wedding Ring", 'She married the storm. The storm kept the house.', 'heroes act and walk 18% faster, and +12% crit chance', { speed: 1.18, crit: 0.12, hooks: { struck: 0.15 } }, { rarity: 'storied', great: true, price: 'one hero starts each fight struck, 15% of its health down' }),
  voidLens: c('voidLens', "The Calamity's Eye", 'A splinter of the tear the Calamity came through. Look into it, and it looks back.', "+12% attack, and skills charge and the king's mana fill 40% faster", { atk: 1.12, charge: 1.4, mana: 1.4, hooks: { foeHp: 0.06 } }, { rarity: 'storied', great: true, price: 'every foe has 6% more hp' }),
  bookOfNames: c('bookOfNames', 'The Book of Names', 'Every defender who fell for the keep, in order. There is room at the end.', '+3% attack for every hero who has fallen this run (to 45%)', {}, { rarity: 'storied', great: true, grow: { stat: 'atk', base: 0, per: 0.03, mark: 'fallen', max: 0.45 } }),
  unfinishedChronicle: c('unfinishedChronicle', 'The Unfinished Chronicle', "The keep's history, the last chapter left blank.", 'every chapter and set counts one more relic than you hold, once you hold one of it', {}, { rarity: 'storied', great: true }),
};
/** The keep's own relics (the six Chapters): what events, the merchant, the market and the Pale Lady draw from. */
export const RELIC_IDS = Object.keys(RELICS).filter((id) => !RELICS[id].great);
/** The Storied relics. */
export const GREAT_RELIC_IDS = Object.keys(RELICS).filter((id) => RELICS[id].great);
// the Calamity's set relics (`relicSets.ts`) are found in the tower and the Last Stand too: their shops, chests, bosses and elites
Object.assign(RELICS, SET_RELICS);
export const ALL_RELIC_IDS = Object.keys(RELICS).filter((id) => !RELICS[id].great);

/** A relic held and burnt out: the Phoenix Feather after its rises. */
export const burntOut = (id: string, ctx: RelicCtx = {}): boolean => id === 'phoenix' && (ctx.marks?.rises ?? 0) >= PHOENIX_RISES;

/** A relic's name as the run holds it now (the Phoenix Feather burnt out is Phoenix Ash). */
export const relicName = (id: string, ctx: RelicCtx = {}): string => (burntOut(id, ctx) ? 'Phoenix Ash' : RELICS[id]?.name ?? id);

/** How far a growing relic has grown: its stat's share now (0.07 for +7%), or undefined for a relic that does not grow. */
export function grownBy(id: string, ctx: RelicCtx = {}): number | undefined {
  const g = RELICS[id]?.grow;
  if (!g) return undefined;
  return Math.min(g.max, g.base + g.per * (ctx.marks?.[g.mark] ?? 0));
}

/** One relic's numbers as the run holds it now: a growing one at its size, the Crown-Piece with the purse's share, the Phoenix burnt out. */
export function effectsOf(id: string, ctx: RelicCtx = {}): RelicEffects | undefined {
  const r = RELICS[id];
  if (!r) return undefined;
  if (burntOut(id, ctx)) return ASH;
  const fx: RelicEffects = { ...r.effects };
  const g = r.grow;
  if (g) {
    const v = grownBy(id, ctx)!;
    if (g.stat === 'crit') fx.crit = (fx.crit ?? 0) + v;
    else fx[g.stat] = (fx[g.stat] ?? 1) * (1 + v);
  }
  if (id === 'luckyCoin') fx.gold = (fx.gold ?? 0) + Math.min(8, Math.floor(Math.max(0, ctx.gold ?? 0) / 50));
  return fx;
}

const MULTS = ['atk', 'hp', 'mana', 'charge', 'speed', 'price'] as const;
const SUMS = ['guard', 'dodge', 'crit', 'reach', 'first', 'gold'] as const;

/** Two sets of fight rules as one: shares add, and a rule only one relic gives is kept as it is. */
function mergeHooks(a: RelicHooks, b: RelicHooks): RelicHooks {
  const out: RelicHooks = { ...a };
  for (const k of Object.keys(b) as (keyof RelicHooks)[]) {
    const v = b[k];
    if (typeof v === 'number') (out as Record<string, number>)[k] = ((out[k] as number | undefined) ?? 0) + v;
    else if (v && out[k] === undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Fold one relic's (or a set tier's) numbers into a running sum. */
function fold(out: RelicEffects, fx: RelicEffects): void {
  for (const k of MULTS) if (fx[k]) out[k] = (out[k] ?? 1) * fx[k]!;
  for (const k of SUMS) if (fx[k]) out[k] = (out[k] ?? 0) + fx[k]!;
  if (fx.revive) out.revive = true;
  if (fx.hooks) out.hooks = mergeHooks(out.hooks ?? {}, fx.hooks);
}

/**
 * The sum of a set of relics, as the run holds them now (`ctx`: its tally and purse; without it a growing relic is at its start): multipliers
 * multiply, shares and times add, `revive` is any, the fight rules merge. Unknown ids are skipped.
 */
export function relicEffects(ids: readonly string[] = [], ctx: RelicCtx = {}): RelicEffects {
  const out: RelicEffects = {};
  for (const id of new Set(ids)) {
    const fx = effectsOf(id, ctx);
    if (fx) fold(out, fx);
  }
  // (the chapters and sets: two of one give a small bonus, three a strong one)
  const { fx, hooks } = setBonus([...new Set(ids)]);
  fold(out, fx);
  if (Object.keys(hooks).length) out.set = hooks;
  return out;
}

/** The parts of a relics' sum that the fight start takes apart: the heroes' boost, the mana, and what the battle keeps as `relics`. */
export function fightRelics(rl: RelicEffects): { atk?: number; hp?: number; mana?: number; relics?: { team: TraitEffects; first?: number; revive?: boolean; set?: SetHooks; hooks?: RelicHooks } } {
  const { atk, hp, mana, first, revive, gold: _gold, price: _price, set, hooks, ...team } = rl;
  const any = Object.keys(team).length || first || revive || set || hooks;
  return { atk, hp, mana, relics: any ? { team, first, revive, set, ...(hooks ? { hooks } : {}) } : undefined };
}

/** A price as the run's relics have it (the Tax Ingot's 10% more), rounded. */
export const pricedFor = (ids: readonly string[] | undefined, n: number): number => {
  const m = relicEffects(ids ?? []).price ?? 1;
  return m === 1 ? n : Math.round(n * m);
};

/** What a relic costs at a shop whose price for an ordinary one is `base`: a Rare half as much again. */
export const relicPriceOf = (id: string, base: number): number => (RELICS[id]?.rarity === 'rare' ? Math.round(base * 1.5) : base);

/** How often a draw picks each rarity while one is left: a Rare a third as often as a Common. */
const WEIGHT: Record<Rarity, number> = { common: 3, rare: 1, storied: 1 };

/** One relic from a pool, a Rare a third as often as a Common, on one number from the stream (as a plain pick takes), so no other draw moves. */
export function pickRelic(next: () => number, pool: readonly string[]): string {
  const w = pool.map((id) => WEIGHT[RELICS[id]?.rarity ?? 'common']);
  let r = next() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** A team bonus with a relics' one folded in, the same way (so the battle reads the one set). */
export function mergeEffects(a: TraitEffects, b: TraitEffects): TraitEffects {
  const out: TraitEffects = { ...a };
  for (const k of ['atk', 'hp', 'mana', 'charge', 'speed'] as const) if (b[k]) out[k] = (out[k] ?? 1) * b[k]!;
  for (const k of ['guard', 'dodge', 'crit', 'reach'] as const) if (b[k]) out[k] = (out[k] ?? 0) + b[k]!;
  return out;
}

/* ------------------------------------------------------------------ old saves (RELICS-2) */

/** Old relics that are now part of another: a run that held both keeps one, and is paid the other's price back (`RELIC_REFUND`). */
export const RELIC_RENAMES: Readonly<Record<string, string>> = { coinHoard: 'luckyCoin', goldBand: 'gildedIngot' };
/** The gold paid back for a relic merged into one already held. */
export const RELIC_REFUND = 70;
/** The relics' catalogue a save was written with: 2 since RELICS-2 (absent before). */
export const RELIC_BOOK = 2;
/** The line the next prep screen shows once, after a run's relics are converted. */
export const RELIC_NOTE = "The keep's relics have been catalogued anew: each now has its own story and rule. Tap one to read it.";

/**
 * Old relic ids as the new catalogue has them: merged ones renamed, a pair that merges into one kept once, unknown ones dropped. `refund` is
 * the gold owed for the merged duplicates.
 */
export function convertRelics(ids: readonly string[] | undefined): { ids: string[]; refund: number; changed: boolean } {
  const out: string[] = [];
  let refund = 0;
  for (const old of ids ?? []) {
    const id = RELIC_RENAMES[old] ?? old;
    if (!RELICS[id]) continue;
    if (out.includes(id)) refund += RELIC_REFUND;
    else out.push(id);
  }
  return { ids: out, refund, changed: out.length !== (ids?.length ?? 0) || out.some((id, i) => id !== ids![i]) };
}

/** A relic's line for an offer or a find: what it does, and its price when it has one. */
export const relicText = (id: string): string => (RELICS[id] ? RELICS[id].text + (RELICS[id].price ? `; but ${RELICS[id].price}` : '') : '');
/** A relic named in a sentence: "the Phoenix Feather", "the First Banner" (a name that begins with "The" is not given a second). */
export const theRelic = (id: string): string => {
  const n = RELICS[id]?.name ?? id;
  return n.startsWith('The ') ? `the ${n.slice(4)}` : `the ${n}`;
};
/** The same at the start of a sentence: "The First Banner". */
export const TheRelic = (id: string): string => 'T' + theRelic(id).slice(1);
