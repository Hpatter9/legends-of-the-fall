// IAP (docs/notes/iap.md): the summoning's odds, as Google Play asks of random items bought with real money, directly or through a
// currency that can be bought. Every chance here is worked out from the sim's own tables and the very functions the draw uses
// (`pullOnce` in `sim/meta.ts`, `drawKind`, `drawPool`, `pityDue` and `closestTied` in `sim/unlock.ts`), never typed in, so the table
// cannot drift from the draw. The chest shop's chests are listed too (crowns can be bought). Pure: no Pixi, no DOM.

import type { Meta } from './sim/meta';
import { closestTied, drawPool, owns, pityDue, toCollect } from './sim/unlock';
import { LUCKY_ODDS, LUCKY_RANK_SHARDS } from './sim/unlockRules';
import { heroClassLabel } from './sim/heroNames';
import { SHOP, type ShopKind } from './sim/chestShop';
import { TOME_DROPS, TOME_SIZES, type TomeSize } from './sim/tomes';
import { CHEST_BOOK_ODDS } from './sim/books';
import { QUALITY_WEIGHTS, RARITY_NAMES } from './sim/equipment';

/** One outcome of a stone, with its chance (0 to 1). */
export interface StoneOutcome {
  /** The hero it lands on. */
  kind: string;
  /** 'whole': a lucky summon of a hero not owned (it joins at once). 'shard': one shard (an unlock shard if not owned, a rank shard if owned).
   *  'rank10': the lucky summon once every pullable hero is owned (`LUCKY_RANK_SHARDS` rank shards). */
  what: 'whole' | 'shard' | 'rank10';
  chance: number;
}

/** What the next stone can give this save, every outcome and its chance (they sum to 1). */
export interface StoneOdds {
  /** The lucky summon's chance (1 in `LUCKY_ODDS`). */
  lucky: number;
  /** The heroes a shard is drawn from now (the pool, or the pity's heroes when it is due). */
  shardFrom: string[];
  /** The pity is due: the next stone's shard is the hero closest to joining. */
  pity: boolean;
  outcomes: StoneOutcome[];
}

/** The odds of the next stone for `m`, from the draw's own rules. */
export function stoneOdds(m: Meta): StoneOdds {
  const lucky = 1 / LUCKY_ODDS;
  const pity = pityDue(m);
  // (a shard, and the lucky roll with every hero owned, are both `drawKind`: the pity's tied heroes when it is due, else the even pool)
  const shardFrom = pity ? closestTied(m) : drawPool(m);
  const left = toCollect(m);
  const outcomes: StoneOutcome[] = [];
  if (left.length) for (const kind of left) outcomes.push({ kind, what: 'whole', chance: lucky / left.length });
  else for (const kind of shardFrom) outcomes.push({ kind, what: 'rank10', chance: lucky / shardFrom.length });
  for (const kind of shardFrom) outcomes.push({ kind, what: 'shard', chance: (1 - lucky) / shardFrom.length });
  return { lucky, shardFrom, pity, outcomes };
}

/** A row of the odds sheet's hero list: a hero, the chance a stone gives it a shard, and the chance it is a whole hero (or ten rank shards). */
export interface HeroOddsRow {
  kind: string;
  name: string;
  owned: boolean;
  shard: number;
  lucky: number;
}

/** The stone's odds as one row a hero, in roster order of the outcomes (heroes with no chance left out). */
export function heroRows(m: Meta, o: StoneOdds = stoneOdds(m)): HeroOddsRow[] {
  const rows = new Map<string, HeroOddsRow>();
  for (const x of o.outcomes) {
    const r = rows.get(x.kind) ?? { kind: x.kind, name: heroClassLabel(x.kind), owned: owns(m, x.kind), shard: 0, lucky: 0 };
    if (x.what === 'shard') r.shard += x.chance;
    else r.lucky += x.chance;
    rows.set(x.kind, r);
  }
  return [...rows.values()];
}

/** A chance as a percentage for the sheet: up to three places, trailing noughts dropped ("1%", "1.8%", "0.02%"); a chance under 0.001% shows as "<0.001%". */
export function pct(p: number): string {
  if (p > 0 && p < 0.000_01) return '<0.001%';
  const s = (Math.round(p * 100_000) / 1000).toFixed(3).replace(/\.?0+$/, '');
  return `${s}%`;
}

/** One line of a chest's contents: what, and its chance (1 for certain). */
export interface ChestLine {
  what: string;
  chance: number;
}

/** A chest of the chest shop, its contents and their chances, and its gear's rarity weights (as chances). */
export interface ChestOdds {
  kind: ShopKind;
  name: string;
  lines: ChestLine[];
  /** The chance of each rarity, given a piece of gear (Common to Mythic). */
  rarity: { name: string; chance: number }[];
}

const TOME_WORD: Record<TomeSize, string> = { small: 'small XP tome', medium: 'medium XP tome', large: 'large XP tome' };

/** The chest shop's three chests, from `SHOP`, `TOME_DROPS`, `CHEST_BOOK_ODDS` and `QUALITY_WEIGHTS`. */
export function chestOdds(): ChestOdds[] {
  return SHOP.map((c) => {
    const lines: ChestLine[] = [{ what: `${c.stones} summoning stone${c.stones === 1 ? '' : 's'}`, chance: 1 }];
    for (const size of TOME_SIZES) {
      const d = TOME_DROPS[c.kind][size];
      if (d.n > 0) lines.push({ what: `${d.n} ${TOME_WORD[size]}${d.n === 1 ? '' : 's'}`, chance: 1 });
      if (d.extra > 0) lines.push({ what: `${d.n > 0 ? 'one more' : 'a'} ${TOME_WORD[size]}`, chance: d.extra });
    }
    const book = CHEST_BOOK_ODDS[c.kind] ?? 0;
    if (book > 0) lines.push({ what: 'a Rare skill book', chance: book });
    lines.push({ what: 'a piece of gear', chance: c.gearChance });
    const w = QUALITY_WEIGHTS[c.quality];
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    const rarity = [1, 2, 3, 4, 5].map((r) => ({ name: RARITY_NAMES[r], chance: (w as Record<number, number>)[r] / total }));
    return { kind: c.kind, name: c.name, lines, rarity };
  });
}

/** The sheet's opening words. */
export const ODDS_LEAD = `Each summoning stone gives one of the outcomes below. The chances are for your next stone, worked out from your own collection.`;
export const luckyWords = (all: boolean): string =>
  all
    ? `Lucky summon (1 in ${LUCKY_ODDS}): every hero is yours, so it gives ${LUCKY_RANK_SHARDS} rank shards of one hero instead.`
    : `Lucky summon (1 in ${LUCKY_ODDS}): a whole hero you do not have joins at once, each of them equally likely.`;
export const shardWords = (o: StoneOdds): string =>
  o.pity
    ? `One shard: your luck is due, so this stone's shard goes to the hero closest to joining.`
    : `One shard of one hero, each of the ${o.shardFrom.length} heroes below equally likely. Shards of a hero you have count towards its rank.`;
