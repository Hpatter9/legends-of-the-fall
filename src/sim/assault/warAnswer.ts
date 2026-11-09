// The War's answer to an assault (phase 3, `docs/notes/assault-3.md`; the design's 1.4, 4.2 and Q1): the warchief's flight, the captains'
// taunts as our heroes come near, and the War News's conquest lines.
//
// - THE WARCHIEF'S FLIGHT. The warchief holds the throne of whichever hold is stormed (Q1). Brought under a fifth of his health while
//   another hold still stands, he may flee (one chance in two, a hash of the moment): he is gone from the field, the hold falls as if he
//   had, and he rides for the strongest hold still standing (the unconquered army the player has opened whose Council is mightiest, a later
//   army first on a tie). He lives on, escaped, and that army becomes his home. At the last hold standing he never flees.
// - THE TAUNTS. A Council member at his post who has a score with one of our heroes (a trophy taken from it, a humiliation, a hero it slew
//   or maimed, the hero it dreads or one whose friend it killed) taunts that hero once, when it comes within ten tiles. The words are the
//   run's own taunts (`nemesisLines.ts`), chosen on the page.
// - THE NEWS. A hold's fall writes the conquest line; the warchief's flight, its own; a duel won at the Iron Gate, its own.
//
// Deterministic: the flight is a hash of the battle's seed, the moment and the warchief; the taunts are by tick and the fixed orders. Pure
// rules: no Pixi, no DOM.

import type { Battle, BattleEvent } from '../battle';
import { ARMIES, armyById, armyIndex, armyUnlocked } from '../armies';
import { news } from '../council';
import type { Meta } from '../meta';
import { fullName, type NemSnap } from '../nemesis';
import { dreadOf } from '../nemesisTraits';
import { mixSeed } from '../rng';
import { occClear, type FieldState } from './field';
import type { HoldState } from './holdTypes';
import { BLOODTUSK } from './maps/orcs';

/** The warchief is asked once, the first time he stands under this share of his health, whether he flees, at this chance. */
export const CHIEF_FLIGHT = { at: 0.2, chance: 0.5 } as const;
export const FLIGHT_SALT = 0xf1a7;
/** A captain taunts a hero he has a score with as it comes this near. */
export const TAUNT_NEAR = 10;
/** Each army's hold, by its blueprint's name (only the Orcs' is built yet; the others are phase 4's). */
export const HOLD_NAMES: Readonly<Record<string, string>> = { [BLOODTUSK.army]: BLOODTUSK.name };
export const holdName = (army: string): string => HOLD_NAMES[army] ?? `the ${armyById(army)?.name ?? army}'s hold`;

/** The strongest hold still standing other than `except`: the unconquered army the player has opened whose Council's Might is greatest, a
 *  later army first on a tie. Undefined when none stands (the warchief then makes his last stand). */
export function strongestHold(m: Meta, except: string): string | undefined {
  let best: string | undefined;
  let bs = -1;
  for (const a of ARMIES) {
    if (a.id === except || m.assault?.conquered[a.id] || !armyUnlocked(m, a.id)) continue;
    const might = (m.war?.members ?? []).filter((n) => n.army === a.id && n.rank !== 'warchief').reduce((s, n) => s + n.might, 0);
    const score = might * 100 + armyIndex(a.id);
    if (score > bs) {
      bs = score;
      best = a.id;
    }
  }
  return best;
}

/** The warchief's flight, each tick: under a fifth of his health with another hold standing, asked once whether he flees. */
export function flightTick(b: Battle, f: FieldState, h: HoldState, out: BattleEvent[]): void {
  const chief = h.input.warchief;
  if (!chief || !h.input.flightTo || h.flight) return;
  const lord = f.byId[h.lord];
  if (!lord?.alive || lord.nem?.id !== chief.id || lord.hp >= lord.maxHp * CHIEF_FLIGHT.at) return;
  h.flight = { asked: b.t };
  if ((mixSeed(b.seed, FLIGHT_SALT, b.t, lord.id) >>> 0) / 4294967296 >= CHIEF_FLIGHT.chance) return;
  // (he is gone from the field at once, not slain: the War reads him as escaped, and the hold falls as if he had)
  h.flight.fled = true;
  occClear(f, lord);
  lord.alive = false;
  lord.fled = true;
  // (the page draws the fallen a moment longer; he leaves no body)
  lord.diedAt = b.t - 2000;
  h.events.push({ kind: 'chiefFled', to: h.input.flightTo, at: lord.v * f.w + lord.u });
  void out;
}

/** Whether a Council member has a score with a hero kind (the personal taunts of `tauntCutRules.ts`'s `triggerOf`). */
export function hasScore(s: NemSnap, kind: string): boolean {
  return !!(
    s.trophies?.some((t) => t.kind === kind) ||
    s.shamed === kind ||
    (s.avengers && kind in s.avengers) ||
    s.slew?.includes(kind) ||
    dreadOf(s.weak) === kind ||
    s.maimed?.includes(kind)
  );
}

/** The taunts, each tick: a Council member at his post taunts once each hero of ours he has a score with, as it comes within ten tiles. */
export function tauntTick(f: FieldState, h: HoldState): void {
  const council = [...(h.input.council ?? []), ...(h.input.warchief ? [h.input.warchief] : [])];
  if (!council.length || f.stats.ticks % 5 !== 3) return;
  for (const post of h.posts) {
    if (post.council === undefined || post.mood === 'routed') continue;
    const s = council.find((n) => n.id === post.council);
    const me = f.byId[f.groups[post.group].leader];
    if (!s || !me?.alive) continue;
    for (const pl of h.platoons) {
      const hero = f.byId[pl.heroId];
      const key = `${s.id}:${pl.hero}`;
      if (!hero.alive || h.taunted?.includes(key) || Math.abs(hero.u - me.u) + Math.abs(hero.v - me.v) > TAUNT_NEAR || !hasScore(s, pl.hero)) continue;
      (h.taunted ??= []).push(key);
      h.events.push({ kind: 'taunt', member: s.id, hero: pl.hero, unit: me.id });
    }
  }
}

/** The War News's lines for an assault settled: the warchief's flight, a duel won at the Iron Gate, and the hold's fall (its first conquest,
 *  or the Warband regrouped and broken again). */
export function conquestNews(m: Meta, h: HoldState, first: boolean, regroup: boolean): string[] {
  const war = m.war;
  if (!war) return [];
  const army = h.input.army;
  const hold = holdName(army);
  const lines: string[] = [];
  const say = (kind: Parameters<typeof news>[1], text: string) => {
    news(war, kind, text);
    lines.push(text);
  };
  const chief = h.input.warchief;
  if (h.flight?.fled && chief && h.input.flightTo) {
    const to = armyById(h.input.flightTo)?.name ?? h.input.flightTo;
    say('fled', `${fullName(chief)} flees ${hold} and rides for the ${to}`);
    // (the army he rode for is his home now: he meets the heroes in its runs)
    const n = war.members.find((x) => x.id === chief.id);
    if (n) n.army = h.input.flightTo;
  }
  const d = h.duel;
  if (d?.out === 'won') {
    const s = h.input.council?.find((n) => n.id === h.posts[d.post]?.council);
    if (s) say('duel', `${fullName(s)} falls in single combat before the Iron Gate of ${hold}`);
  }
  if (h.outcome === 'won' && (first || regroup)) {
    const name = armyById(army)?.name ?? army;
    say('conquest', first ? `${hold} falls. The ${name} is broken, and the Council's seat there stands empty` : `The ${name} regrouped at ${hold}, and is broken again`);
  }
  return lines;
}
