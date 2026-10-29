// Everything a wave gained (RECAP-REVEAL, the owner's ask: "The wave recap should show all items gained"): the short card after a
// wave lists each thing the wave brought in, grouped, beside its pay line (gold and crowns) and the boss's ore row. It is worked out
// by comparing what the save and the run held before the wave was settled with what they hold after, so a new kind of drop shows up
// here as soon as it lands in one of the counted places, without the settlement having to report it. Pure rules: no Pixi, no DOM.

import { chestKind } from './armyStars';
import { ORES } from './awakenMats';
import { itemName, RARITY_NAMES } from './equipment';
import { heroName } from './heroNames';
import type { Meta } from './meta';
import { RELICS } from './relics';
import type { Run } from './run';
import { TOMES, TOME_SIZES, type TomeSize } from './tomes';

/** What kind of thing a gain is: its icon and colour on the card. */
export type GainKind = 'joined' | 'recruit' | 'chest' | 'equip' | 'gear' | 'relic' | 'shard' | 'unlockShard' | 'tome' | 'stone' | 'ore';

/** One line of the card's gains: a thing and how many of it the wave brought in. */
export interface WaveGain {
  kind: GainKind;
  /** What tells one of a kind from another (and picks its icon): a gear's `slot:tier`, a relic's id, a hero kind, a tome size, a
   *  chest's kind, an ore's trait, an item's base. */
  id: string;
  name: string;
  n: number;
  /** 1 Common to 5 Mythic, for gear and equipment (a run's gear tier 1 to 3 reads as Common, Rare, Epic). */
  rarity?: number;
}

/** What the save and the run held that a wave can add to, taken just before the wave is settled. */
export interface GainSnap {
  items: number[];
  relics: string[];
  roster: number[];
  towerOres: number;
  equipment: number[];
  stash: number;
  stones: number;
  tomes: Partial<Record<TomeSize, number>>;
  unlock: Record<string, number>;
  shards: Record<string, number>;
  unlocked: string[];
}

export function snapGains(m: Meta, run: Run): GainSnap {
  return {
    items: (run.items ?? []).map((g) => g.id),
    relics: [...(run.relics ?? [])],
    roster: run.roster.map((h) => h.id),
    towerOres: run.tower?.ores?.length ?? 0,
    equipment: (m.equipment ?? []).map((e) => e.id),
    stash: m.stash.length,
    stones: m.stones ?? 0,
    tomes: { ...(m.tomes ?? {}) },
    unlock: { ...(m.unlock ?? {}) },
    shards: { ...m.shards },
    unlocked: [...m.unlocked],
  };
}

const CHEST_NAMES: Record<string, string> = { bronze: 'Bronze chest', silver: 'Silver chest', gold: 'Gold chest', mythic: 'Mythic chest', daily: 'Daily chest' };
/** The order the card lists them in: new heroes first, then chests and gear, then the smaller things. */
const ORDER: readonly GainKind[] = ['joined', 'recruit', 'chest', 'equip', 'gear', 'relic', 'unlockShard', 'shard', 'tome', 'stone', 'ore'];

/** The gains since `was`, grouped (two of the same thing are one line, ×2) and in the card's order. The army's rift ores and caches
 *  are left out: the card's own ore row shows them. Nothing is changed. */
export function gainsSince(was: GainSnap, m: Meta, run: Run): WaveGain[] {
  const out = new Map<string, WaveGain>();
  const add = (g: WaveGain) => {
    if (g.n <= 0) return;
    const key = `${g.kind}:${g.id}`;
    const had = out.get(key);
    if (had) had.n += g.n;
    else out.set(key, { ...g });
  };
  const joined = m.unlocked.filter((k) => !was.unlocked.includes(k));
  for (const k of joined) add({ kind: 'joined', id: k, name: heroName(k), n: 1 });
  for (const h of run.roster) if (!was.roster.includes(h.id)) add({ kind: 'recruit', id: h.kind, name: heroName(h.kind), n: 1 });
  for (const c of m.stash.slice(was.stash)) {
    const kind = c.daily !== undefined ? 'daily' : chestKind(c.at);
    add({ kind: 'chest', id: kind, name: CHEST_NAMES[kind], n: 1 });
  }
  for (const e of m.equipment ?? []) if (!was.equipment.includes(e.id)) add({ kind: 'equip', id: `${e.base}:${e.rarity}`, name: itemName(e), n: 1, rarity: e.rarity });
  for (const g of run.items ?? []) if (!was.items.includes(g.id)) add({ kind: 'gear', id: `${g.slot}:${g.tier}`, name: g.name, n: 1, rarity: Math.min(3, g.tier) });
  for (const r of run.relics ?? []) if (!was.relics.includes(r) && RELICS[r]) add({ kind: 'relic', id: r, name: RELICS[r].name, n: 1 });
  // (a hero who joined has its unlock shards taken off: only a rise counts)
  for (const [k, n] of Object.entries(m.unlock ?? {})) add({ kind: 'unlockShard', id: k, name: `${heroName(k)} unlock shard`, n: n - (was.unlock[k] ?? 0) });
  for (const [k, n] of Object.entries(m.shards)) add({ kind: 'shard', id: k, name: `${heroName(k)} shard`, n: n - (was.shards[k] ?? 0) });
  for (const s of TOME_SIZES) add({ kind: 'tome', id: s, name: TOMES[s].name, n: (m.tomes?.[s] ?? 0) - (was.tomes[s] ?? 0) });
  add({ kind: 'stone', id: 'stone', name: 'Summoning stone', n: (m.stones ?? 0) - was.stones });
  for (const d of run.tower?.ores?.slice(was.towerOres) ?? []) if (ORES[d.trait]) add({ kind: 'ore', id: d.trait, name: ORES[d.trait].name, n: d.n });
  return [...out.values()].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

/** A gain in words: "Steel Blade (Rare)", "Silver chest ×2", "3 Hexquartz". */
export function gainText(g: WaveGain): string {
  const rare = g.rarity ? ` (${RARITY_NAMES[g.rarity]})` : '';
  if (g.kind === 'ore') return `${g.n} ${g.name}`;
  if (g.kind === 'joined') return `${g.name} joins`;
  return `${g.name}${rare}${g.n > 1 ? ` ×${g.n}` : ''}`;
}

/** The run's own lines of what a wave found (`run.found`) that the gains do not already show: the gear, relics and ores are listed
 *  as gains, and the gold is in the pay line, so what is left is the rest (a choice of relics waiting on the map, say). */
export function otherFinds(found: readonly string[], gains: readonly WaveGain[]): string[] {
  const names = gains.filter((g) => g.kind === 'gear' || g.kind === 'relic' || g.kind === 'ore').map((g) => g.name);
  return found.filter((f) => !/\bgold from\b/.test(f) && !names.some((n) => f.startsWith(`${n} (`) || f.startsWith(`the ${n} (`) || (/^\d+ /.test(f) && f.replace(/^\d+ /, '') === n)));
}
