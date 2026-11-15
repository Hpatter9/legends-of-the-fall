// NEMESIS-DEPTH, idea 7: the Council's politics in the open (`docs/notes/nemesis-depth.md`). Two things the Council already half had, made
// lasting and put in the player's hand:
//
// - RIVALRIES. Two members who fought it out between themselves (a feud, a Trial of Strength, a betrayal) and both lived are rivals until
//   one of them falls. A rival slain by the heroes lets the other climb over the body (+1 Might); rivals never stand in the same wave.
// - PLOTS. A Council turn may hatch a plot (`'plot'`, weight 1, more with a Schemer or a Trickster): a lieutenant against its captain, or any
//   member but the warchief against its rival. It comes to a head two turns later. The player may spend two War Trophies to tip off its
//   target (the plotter is caught: slain or cast down) or to back the plotter (it succeeds: it takes its captain's seat, or beats its rival);
//   left alone, it succeeds half the time. A plot's draws come from its own stream (`PLOT_SALT`), so the turn's other draws are unchanged.
//
// The warchief is never plotted against: only the heroes bring him down. Pure rules: no Pixi, no DOM.

import type { Meta } from './meta';
import { fullName, MIGHT_MAX, remember, type Nemesis, type War } from './nemesis';
import { mixSeed, Rng } from './rng';

/** A plot: who plots against whom, the turn it was hatched and the turn it comes to a head, the player's hand in it, and whether the camp's
 *  card has shown it. */
export interface Plot {
  by: number;
  on: number;
  at: number;
  due: number;
  hand?: 'tip' | 'back';
  shown?: true;
}

/** A plot's numbers: what a hand in it costs, how long it takes, how often it succeeds left alone, and the most open at once. */
export const PLOT = { price: 2, turns: 2, success: 0.5, most: 2, slays: 0.5 } as const;
/** The plots' own stream: `mixSeed(meta.seed, PLOT_SALT, war.turn, plotter)`. */
export const PLOT_SALT = 0x4e3e5d;

const byId = (war: War, id: number | undefined): Nemesis | undefined => (id === undefined ? undefined : war.members.find((n) => n.id === id));

/** Two members who fought it out between themselves and both lived become rivals (one rival each: a newer rivalry does not replace one). */
export function makeRivals(a: Nemesis, b: Nemesis): boolean {
  if (a === b || a.rival !== undefined || b.rival !== undefined) return false;
  a.rival = b.id;
  b.rival = a.id;
  remember(a, `Became the rival of ${b.name}`);
  remember(b, `Became the rival of ${a.name}`);
  return true;
}

/** The rivalry of a member who has fallen ends: its rival is freed. Returns the rival, if it had one still sitting. */
export function endRivalry(war: War, id: number): Nemesis | undefined {
  const r = war.members.find((n) => n.rival === id);
  if (r) delete r.rival;
  return r;
}

/** A rival slain by the heroes: the other climbs over the body (+1 Might, never past 10). Returns the wave card's line, if any. */
export function climbOver(war: War, fallen: { id: number; name: string }): string | undefined {
  const r = endRivalry(war, fallen.id);
  if (!r) return undefined;
  r.might = Math.min(MIGHT_MAX, r.might + 1);
  remember(r, `Climbed over the body of its rival ${fallen.name}`);
  const line = `${fullName(r)} climbs over the body of its rival ${fallen.name} · Might ${r.might}`;
  war.news.unshift({ turn: war.turn, kind: 'feud', text: line });
  war.news.length = Math.min(war.news.length, 40);
  return line;
}

/** Whom a member would plot against: its rival, else (a lieutenant) its sworn captain. Never the warchief. */
export function targetOf(war: War, n: Nemesis): Nemesis | undefined {
  if (n.rank === 'warchief') return undefined;
  const r = byId(war, n.rival);
  if (r && r.rank !== 'warchief') return r;
  if (n.rank === 'lieutenant') return byId(war, n.sworn);
  return undefined;
}

/** The members who could hatch a plot now: not the warchief, not plotting or plotted against already, with someone to plot against. */
export function plotters(war: War): Nemesis[] {
  const busy = new Set((war.plots ?? []).flatMap((p) => [p.by, p.on]));
  return war.members.filter((n) => !busy.has(n.id) && (() => {
    const t = targetOf(war, n);
    return !!t && !busy.has(t.id);
  })());
}

/** Whether a plot may be hatched now. */
export const plotOpen = (war: War): boolean => (war.plots?.length ?? 0) < PLOT.most && plotters(war).length > 0;

/** Hatch a plot (the Council's `'plot'` event): a plotter drawn among those who could, the Schemers and Tricksters first. Returns its News. */
export function hatch(war: War, rng: Rng): string | undefined {
  const pool = plotters(war).sort((a, b) => a.id - b.id);
  if (!pool.length) return undefined;
  const sly = pool.filter((n) => n.temper === 'schemer' || n.temper === 'trickster');
  const n = rng.pick(sly.length ? sly : pool);
  const t = targetOf(war, n)!;
  (war.plots ??= []).push({ by: n.id, on: t.id, at: war.turn, due: war.turn + PLOT.turns });
  remember(n, `Plotted against ${t.name}`);
  return `${fullName(n)} plots against ${t.id === n.rival ? 'its rival' : 'its captain'} ${fullName(t)}`;
}

/** Why the player cannot take a hand in a plot now, if they cannot. */
export function cannotHand(war: War | undefined, p: Plot): string | undefined {
  if (!war || war.end) return 'The War is over';
  if (p.hand) return p.hand === 'tip' ? 'You have tipped off its target' : 'You have backed the plotter';
  if (war.trophies < PLOT.price) return `A hand in it costs ${PLOT.price} War Trophies`;
  return undefined;
}

/** Take a hand in a plot (two War Trophies): tip off its target, or back the plotter. Returns whether it was taken. */
export function handPlot(m: Meta, i: number, hand: 'tip' | 'back'): boolean {
  const war = m.war;
  const p = war?.plots?.[i];
  if (!war || !p || cannotHand(war, p)) return false;
  war.trophies -= PLOT.price;
  p.hand = hand;
  return true;
}

/**
 * The plots come to a head (each Council turn, `council.ts`): one whose plotter or target has gone is dropped. Tipped off, the plotter is
 * caught: slain half the time, else cast down (a captain to lieutenant, a lieutenant to the bottom of its loyalty and a Might less). Backed, or
 * left alone and lucky (half the time), it succeeds: a lieutenant takes its captain's seat (the captain cast down), or a rival is beaten (a
 * Might less, and slain half the time). Left alone and unlucky, the plotter is found out: a Might less, its loyalty down to 10. `slay` and
 * `swap` are the Council's own (so a slaying is told and kept as the Council's). Returns the News lines.
 */
export function resolvePlots(war: War, m: Meta, slay: (n: Nemesis, by: Nemesis) => void, swap: (low: Nemesis, high: Nemesis) => void): string[] {
  const out: string[] = [];
  const keep: Plot[] = [];
  for (const p of war.plots ?? []) {
    const by = byId(war, p.by);
    const on = byId(war, p.on);
    // (one gone, or whose seats no longer fit the plot, a lieutenant's captain promoted away, lets it fizzle)
    if (!by || !on || on.rank === 'warchief' || (on.id !== by.rival && !(by.rank === 'lieutenant' && on.rank === 'captain'))) continue;
    if (war.turn < p.due) {
      keep.push(p);
      continue;
    }
    const rng = new Rng(mixSeed(m.seed, PLOT_SALT, war.turn, by.id));
    const lucky = rng.next() < PLOT.success;
    const slays = rng.next() < PLOT.slays;
    if (p.hand === 'tip') {
      if (slays) {
        slay(by, on);
        out.push(`${fullName(on)} is warned, and ${by.name} is caught plotting and slain`);
      } else {
        castDown(war, by);
        out.push(`${fullName(on)} is warned, and ${by.name} is caught plotting and cast down`);
      }
      continue;
    }
    if (p.hand === 'back' || lucky) {
      if (on.id === by.rival) {
        on.might = Math.max(1, on.might - 1);
        if (slays) {
          slay(on, by);
          out.push(`${fullName(by)}’s plot against its rival ${on.name} succeeds: ${on.name} is slain`);
        } else {
          remember(on, `Beaten by its rival ${by.name}’s plot`);
          out.push(`${fullName(by)}’s plot against its rival ${on.name} succeeds: ${on.name} is beaten`);
        }
      } else {
        swap(by, on);
        on.loyalty = 20;
        remember(by, `Plotted against ${on.name} and took the seat`);
        out.push(`${fullName(by)}’s plot succeeds: it takes ${on.name}’s seat, and ${on.name} is cast down`);
      }
      continue;
    }
    by.might = Math.max(1, by.might - 1);
    by.loyalty = Math.min(by.loyalty, 10);
    remember(by, `Found out plotting against ${on.name}`);
    out.push(`${fullName(by)} is found out plotting against ${on.name}`);
  }
  if (keep.length) war.plots = keep;
  else delete war.plots;
  return out;
}

/** A plotter caught and cast down: a captain to lieutenant (its sworn lieutenants freed), a lieutenant a Might less with no loyalty left. */
function castDown(war: War, n: Nemesis): void {
  if (n.rank === 'captain') {
    for (const x of war.members) if (x.sworn === n.id) delete x.sworn;
    n.rank = 'lieutenant';
  } else n.might = Math.max(1, n.might - 1);
  n.loyalty = 0;
  remember(n, 'Caught plotting, and cast down');
}

/** A plot in words, for the board and the camp's card ("Throg plots against its captain Morrow the Unburnt: it comes to a head in 2 turns"). */
export function plotWords(war: War, p: Plot): string {
  const by = byId(war, p.by);
  const on = byId(war, p.on);
  if (!by || !on) return '';
  const left = Math.max(0, p.due - war.turn);
  const when = left <= 0 ? 'it comes to a head on the next turn' : `it comes to a head in ${left} ${left === 1 ? 'turn' : 'turns'}`;
  const hand = p.hand === 'tip' ? `; you have warned ${on.name}` : p.hand === 'back' ? `; you have backed ${by.name}` : '';
  return `${fullName(by)} plots against ${on.id === by.rival ? 'its rival' : 'its captain'} ${fullName(on)}: ${when}${hand}`;
}

/** A plot the camp's card has not shown yet (and marks it shown). */
export function freshPlot(war: War | undefined): { plot: Plot; i: number } | undefined {
  const i = war?.plots?.findIndex((p) => !p.shown && !p.hand) ?? -1;
  if (!war?.plots || i < 0) return undefined;
  war.plots[i].shown = true;
  return { plot: war.plots[i], i };
}

/** A saved plot, if it is one, between members who still sit. */
export function readPlot(x: unknown, war: War): Plot | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const p = x as Partial<Plot>;
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (!num(p.by) || !num(p.on) || !num(p.at) || !num(p.due) || p.by === p.on) return undefined;
  if (!byId(war, p.by) || !byId(war, p.on)) return undefined;
  return { by: p.by, on: p.on, at: p.at, due: p.due, ...(p.hand === 'tip' || p.hand === 'back' ? { hand: p.hand } : {}), ...(p.shown === true ? { shown: true as const } : {}) };
}
