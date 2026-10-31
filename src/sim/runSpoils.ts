// RECAP-SPOILS (docs/notes/hud-faces.md): everything a run gained, for the spoils page of its final recap. Each wave's gains (the short
// card's `WaveGain`s, `waveGains.ts`) are added to the run's recap as they are settled (`noteSpoils`), and at the end they are sorted
// into the page's three groups: the lasting money (crowns, summoning stones; the owner: "Gold doesn't matter at the end since it is only
// for the waves", so run gold is left off), the gear (each piece with its rarity and where it went) and the items (chests, relics, shards,
// tomes, ores, heroes joining). Pure rules: no Pixi, no DOM.

import type { WaveGain } from './waveGains';
import type { RunRecap } from './runRecap';
import type { StandSummary } from './stand';
import { itemName, type Equipment } from './equipment';
import { ORES } from './awakenMats';

/** The most different things a run keeps in its spoils (a long climb would grow the save without end; two of a thing are one line). */
export const SPOILS_KEPT = 120;

/** Add a wave's gains to the run's spoils: the same thing again adds to its count. Hires for the run (`recruit`) are not spoils. */
export function noteSpoils(r: RunRecap, gains: readonly WaveGain[]): void {
  for (const g of gains) {
    if (g.n <= 0 || g.kind === 'recruit') continue;
    const list = (r.spoils ??= []);
    const had = list.find((x) => x.kind === g.kind && x.id === g.id && x.name === g.name);
    if (had) had.n += g.n;
    else list.push({ ...g });
    if (list.length > SPOILS_KEPT) list.splice(0, list.length - SPOILS_KEPT);
  }
}

/** A lasting currency counted up on the page. */
export interface SpoilMoney {
  id: 'crowns' | 'stones';
  label: string;
  n: number;
}

/** A piece of gear on the page, with where it went. */
export interface SpoilGear {
  gain: WaveGain;
  /** "Worn by Kenji", "In the run's pack", "To the armoury". */
  where: string;
}

export interface Spoils {
  money: SpoilMoney[];
  gear: SpoilGear[];
  items: WaveGain[];
  /** Nothing at all to show. */
  empty: boolean;
}

/** Where the gear went: run gear worn by a hero of the company (`wornBy`: gear name to the hero's name) or still in the pack; lasting
 *  equipment to the armoury. */
export function gearWhere(g: WaveGain, wornBy: Readonly<Record<string, string>>): string {
  if (g.kind === 'equip') return 'To the armoury';
  const who = wornBy[g.name];
  return who ? `Worn by ${who}` : "In the run's pack";
}

/** The order the items group lists its things in: heroes joining, chests, relics, then the smaller things. */
const ITEM_ORDER: readonly WaveGain['kind'][] = ['joined', 'chest', 'relic', 'unlockShard', 'shard', 'tome', 'ore'];

/** Sort a run's gains (and the crowns it paid) into the page's groups. Summoning stones are counted with the money; gear is rarest first. */
export function spoilsOf(gains: readonly WaveGain[], crowns: number, wornBy: Readonly<Record<string, string>> = {}): Spoils {
  const money: SpoilMoney[] = [];
  if (crowns > 0) money.push({ id: 'crowns', label: 'Crowns', n: crowns });
  const stones = gains.filter((g) => g.kind === 'stone').reduce((n, g) => n + g.n, 0);
  if (stones > 0) money.push({ id: 'stones', label: 'Summoning stones', n: stones });
  const gear = gains
    .filter((g) => g.kind === 'equip' || g.kind === 'gear')
    .map((g, i) => ({ g, i }))
    .sort((a, b) => (b.g.kind === 'equip' ? 1 : 0) - (a.g.kind === 'equip' ? 1 : 0) || (b.g.rarity ?? 1) - (a.g.rarity ?? 1) || a.i - b.i)
    .map(({ g }) => ({ gain: g, where: gearWhere(g, wornBy) }));
  const items = gains
    .filter((g) => ITEM_ORDER.includes(g.kind) && g.n > 0)
    .map((g, i) => ({ g, i }))
    .sort((a, b) => ITEM_ORDER.indexOf(a.g.kind) - ITEM_ORDER.indexOf(b.g.kind) || a.i - b.i)
    .map(({ g }) => g);
  return { money, gear, items, empty: !money.length && !gear.length && !items.length };
}

/** The Last Stand's end as gains for the spoils page: its chests, its equipment (each name matched to the newest piece of that name in
 *  `equipment`, for its rarity and icon), its rift ores and its relics. */
export function standSpoilGains(sum: Pick<StandSummary, 'bronze' | 'silver' | 'gold' | 'gear' | 'ores' | 'relics' | 'heldRelics'>, equipment: readonly Equipment[]): WaveGain[] {
  const out: WaveGain[] = [];
  const chests: [keyof typeof sum & ('bronze' | 'silver' | 'gold'), string][] = [['gold', 'Gold chest'], ['silver', 'Silver chest'], ['bronze', 'Bronze chest']];
  for (const [k, name] of chests) if (sum[k] > 0) out.push({ kind: 'chest', id: k, name, n: sum[k] });
  const used = new Set<number>();
  for (const name of sum.gear) {
    const e = [...equipment].reverse().find((x) => !used.has(x.id) && itemName(x) === name);
    if (e) used.add(e.id);
    const had = out.find((g) => g.kind === 'equip' && g.name === name);
    if (had) had.n++;
    else out.push({ kind: 'equip', id: e ? `${e.base}:${e.rarity}` : name, name, n: 1, ...(e ? { rarity: e.rarity } : {}) });
  }
  for (const d of sum.ores ?? []) if (d.n > 0) out.push({ kind: 'ore', id: d.trait, name: ORES[d.trait]?.name ?? d.trait, n: d.n });
  if (sum.relics > 0) out.push({ kind: 'relic', id: 'stand', name: sum.heldRelics ? `Relics (${sum.heldRelics} for holding the line)` : 'Relics', n: sum.relics });
  return out;
}
