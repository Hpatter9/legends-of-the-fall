// Auto-spend for a hero's talent points (TALENT-AUTO, `docs/notes/talent-auto.md`): which nodes to learn, in order, so every point
// that can buy something does, taken the way the hero's calling would want them. Pure rules: no Pixi, no DOM, no randomness; the
// same meta gives the same picks every time. The rules of what may be learned are `talents.ts`'s own: every pick is tried with
// `learn` on a copy of the hero's talents, so the plan can never hold a node the tree would refuse.
//
// How it chooses. Each node is scored for the hero's calling (`DEEP_KITS`): what it gives is sorted into four leanings (guard:
// health, defence, blocks, shields; harm: attack, crits, the skill's strength, bleeds and bursts; mend: healing and leech; aid:
// charge, haste, reach, slows, rallies) and each leaning is weighed for the calling (a bulwark values guard most, a duelist harm,
// a healer mending, a support aid). Of each pair the better-scored node is the one taken. Then, of every set of nodes the free
// points can reach, the plan is the one that spends the most points; of those, the one that goes deepest down the tree (towards
// the capstones rather than spreading thin); of those, the best score. The order it is learned in follows the path: the best two
// of the first row, then a row at a time down to the deepest, then the rest of the first row.

import type { Kind } from './equipBases';
import type { StatKey } from './equipment';
import type { Meta } from './meta';
import { DEEP_KITS, type Calling } from './talentsDeep';
import { TALENT_ABILITIES, TREES, boughtOf, costOf, learn, nodeOf, picksOf, pointsFree, type TalentNode } from './talents';

export type Lean = 'guard' | 'harm' | 'mend' | 'aid';

/** How much each leaning is worth to each calling. */
export const CALLING_LEANS: Readonly<Record<Calling, Readonly<Record<Lean, number>>>> = {
  bulwark: { guard: 3, harm: 1, mend: 1.5, aid: 1 },
  duelist: { guard: 1, harm: 3, mend: 0.5, aid: 1 },
  berserker: { guard: 1.5, harm: 3, mend: 1, aid: 0.5 },
  marksman: { guard: 0.5, harm: 3, mend: 0.5, aid: 1.5 },
  archmage: { guard: 0.5, harm: 3, mend: 0.5, aid: 1.5 },
  healer: { guard: 1.5, harm: 0.5, mend: 3, aid: 1.5 },
  support: { guard: 1, harm: 1, mend: 1.5, aid: 3 },
};

/** Each stat's leaning, and the size of a usual node's worth of it (so a first-row node counts about one). */
const STAT_LEAN: Readonly<Record<StatKey, [Lean, number]>> = {
  hp: ['guard', 0.05],
  def: ['guard', 1],
  dodge: ['guard', 0.03],
  resist: ['guard', 0.1],
  atk: ['harm', 0.05],
  crit: ['harm', 0.03],
  atkSpeed: ['harm', 0.04],
  regen: ['mend', 0.004],
  moveSpeed: ['aid', 0.06],
  range: ['aid', 1],
  charge: ['aid', 0.1],
};
/** The same for the skill and passive changes (`TAL_KEYS`). */
const TAL_LEAN: Readonly<Record<string, [Lean, number]>> = {
  pow: ['harm', 0.35],
  ultPow: ['harm', 0.3],
  extra: ['harm', 1],
  rage: ['harm', 0.4],
  frenzyMax: ['harm', 2],
  block: ['guard', 0.15],
  thorns: ['guard', 0.33],
  huddle: ['guard', 0.05],
  castShield: ['guard', 0.1],
  castHeal: ['mend', 0.1],
  leech: ['mend', 0.15],
  dur: ['aid', 0.5],
  reach: ['aid', 1],
  castHaste: ['aid', 2000],
  refund: ['aid', 30],
  skillSlow: ['aid', 1500],
  skillStun: ['aid', 500],
  ultRate: ['aid', 0.3],
};
/** Each ability kind's leaning (an ability counts as `ABILITY_WORTH` of it). */
const ABILITY_LEAN: Readonly<Record<Kind, Lean>> = {
  burn: 'harm', bleed: 'harm', curse: 'harm', chain: 'harm', splash: 'harm', pierce: 'harm', smite: 'harm', execute: 'harm', burst: 'harm', berserk: 'harm',
  shield: 'guard', guard: 'guard', reflect: 'guard', counter: 'guard', taunt: 'guard', revive: 'guard',
  leech: 'mend', heal: 'mend', healAlly: 'mend', regen: 'mend', aura: 'mend', cleanse: 'mend',
  charge: 'aid', mana: 'aid', haste: 'aid', stealth: 'aid', rally: 'aid', banner: 'aid', slow: 'aid', stun: 'aid',
};
const ABILITY_WORTH = 3;

/** What a node gives, by leaning (in about first-row-nodes' worth). */
export function leansOf(n: TalentNode): Record<Lean, number> {
  const out: Record<Lean, number> = { guard: 0, harm: 0, mend: 0, aid: 0 };
  for (const [k, v] of Object.entries(n.stats ?? {})) {
    const [lean, size] = STAT_LEAN[k as StatKey] ?? ['aid', 1];
    out[lean] += (v ?? 0) / size;
  }
  // (a stat node's score points, STATS batch 2: CON +2 is worth the health share it replaced, any other score the attack share)
  for (const [k, v] of Object.entries(n.scores ?? {})) {
    const [lean] = STAT_LEAN[k === 'con' ? 'hp' : 'atk'];
    out[lean] += (v ?? 0) / 2;
  }
  for (const [k, v] of Object.entries(n.tal ?? {})) {
    const [lean, size] = TAL_LEAN[k] ?? ['aid', Math.abs(v) || 1];
    out[lean] += v / size;
  }
  // (an ability with two halves, say a stealth at the start and every 12s, counts once)
  const kinds = new Set((n.abilities ?? []).map((id) => TALENT_ABILITIES[id]?.kind).filter((k): k is Kind => !!k));
  for (const k of kinds) out[ABILITY_LEAN[k] ?? 'aid'] += ABILITY_WORTH / kinds.size;
  return out;
}

/** The calling a hero kind's tree is read for (a kind without one is weighed as a duelist). */
export const callingOf = (kind: string): Calling => DEEP_KITS[kind]?.calling ?? 'duelist';

/** How much a node is worth to its hero's calling. */
export function nodeScore(kind: string, n: TalentNode): number {
  const w = CALLING_LEANS[callingOf(kind)];
  const l = leansOf(n);
  return l.guard * w.guard + l.harm * w.harm + l.mend * w.mend + l.aid * w.aid;
}

/** Better first: the higher score, then the earlier node of the tree (so a tie always falls the same way). */
const better = (kind: string) => (a: TalentNode, b: TalentNode): number => nodeScore(kind, b) - nodeScore(kind, a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** The nodes to learn, in order, for a hero kind's free points (empty when nothing can be learned). Changes nothing. */
export function autoPlan(m: Meta, kind: string): string[] {
  const tree = TREES[kind];
  if (!tree || pointsFree(m, kind) <= 0) return [];
  const rank = better(kind);
  // (of each pair only the better one is ever considered; the first row's four all are)
  const wanted = tree.nodes.filter((n) => n.tier === 1 || tree.nodes.filter((o) => o.tier === n.tier).sort(rank)[0] === n);
  // (a copy of the meta whose talents for this kind are its own, so `learn` can be tried freely)
  const mine = { picks: [...picksOf(m, kind)], bought: boughtOf(m, kind) };
  const w: Meta = { ...m, talents: { ...(m.talents ?? {}), [kind]: mine } };
  const start = mine.picks.length;

  // the best set of nodes to end with: every set the rules allow is walked once (they are few: a first row of four, one node a row)
  interface Best { spent: number; deep: number; score: number; key: string; picks: string[] }
  const plan = (): Best => {
    const added = mine.picks.slice(start).map((id) => nodeOf(kind, id)!);
    return {
      spent: added.reduce((s, n) => s + costOf(n), 0),
      deep: Math.max(0, ...mine.picks.map((id) => nodeOf(kind, id)!.tier)),
      score: added.reduce((s, n) => s + nodeScore(kind, n), 0),
      key: [...mine.picks.slice(start)].sort().join(' '),
      picks: mine.picks.slice(start),
    };
  };
  const beats = (a: Best, b: Best): boolean =>
    a.spent !== b.spent ? a.spent > b.spent : a.deep !== b.deep ? a.deep > b.deep : Math.abs(a.score - b.score) > 1e-9 ? a.score > b.score : a.key < b.key;
  const seen = new Set<string>();
  let best = plan();
  const walk = (): void => {
    const key = [...mine.picks].sort().join(' ');
    if (seen.has(key)) return;
    seen.add(key);
    const here = plan();
    if (beats(here, best)) best = here;
    for (const n of wanted) {
      if (!learn(w, kind, n.id)) continue;
      walk();
      mine.picks.pop();
    }
  };
  walk();
  if (!best.picks.length) return [];

  // the order to learn them in: the deepest node the rules allow next, else the best of the first row left
  mine.picks.length = start;
  const left = best.picks.map((id) => nodeOf(kind, id)!);
  const out: string[] = [];
  while (left.length) {
    const next = [...left].sort((a, b) => b.tier - a.tier || rank(a, b)).find((n) => learn(w, kind, n.id));
    // (cannot happen: the set was reached by learning its nodes one by one)
    if (!next) break;
    out.push(next.id);
    left.splice(left.indexOf(next), 1);
  }
  return out;
}

/** The points a plan spends. */
export const planCost = (kind: string, ids: readonly string[]): number => ids.reduce((s, id) => s + (nodeOf(kind, id) ? costOf(nodeOf(kind, id)!) : 0), 0);

/** Learn a hero kind's plan through the tree's own `learn`; the nodes taken, in order. */
export function autoSpend(m: Meta, kind: string): string[] {
  const took: string[] = [];
  for (const id of autoPlan(m, kind)) {
    if (!learn(m, kind, id)) break;
    took.push(id);
  }
  return took;
}

/** The plan of every hero of `kinds` with something to learn, in that order (the Upgrades list's "Auto all"). */
export const autoPlanAll = (m: Meta, kinds: readonly string[]): { kind: string; points: number; picks: string[] }[] =>
  kinds.map((kind) => ({ kind, points: pointsFree(m, kind), picks: autoPlan(m, kind) })).filter((p) => p.picks.length);

/** Learn every plan of `autoPlanAll`; the nodes each hero took. */
export const autoSpendAll = (m: Meta, kinds: readonly string[]): { kind: string; picks: string[] }[] =>
  autoPlanAll(m, kinds).map(({ kind }) => ({ kind, picks: autoSpend(m, kind) })).filter((p) => p.picks.length);
