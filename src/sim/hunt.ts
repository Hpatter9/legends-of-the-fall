// NEMESIS-DEPTH, idea 4: hunts (`docs/notes/nemesis-depth.md`). The player marks one member of the Dark Council for two War Trophies: it
// stands in the next run of its army at a wave fixed in advance (a boss at its own wave, the warchief at his army's last, any other at the
// first ordinary wave a third of the way in), one of its secrets is revealed, and it comes on guard (a shield of a tenth of its health). Run
// down and slain, it pays a bounty of War Trophies on top of its pay, beyond the day's cap; neither fate nor cheating death spares it. If
// the run ends and it was met and lives, the hunt has failed: the trophies are spent, and it taunts about it at the next meeting. A run that
// ends before the quarry's wave leaves the hunt on.
//
// One hunt at a time; setting another replaces it. A quarry slain or gone some other way (a feud, a desertion) lapses the hunt and its two
// trophies come back. Deterministic: the hunt reads no stream. Pure rules: no Pixi, no DOM.

import { armyById, type Army } from './armies';
import { news } from './council';
import type { Meta } from './meta';
import { fullName, remember, reveal, secretName, type Nemesis, type War } from './nemesis';
import { HUNT_GUARD } from './nemesisTraits';
import type { Run } from './run';

/** What a hunt costs, and its bounty (two War Trophies and one more for every two Might). The quarry's guard, a shield of a tenth of its
 *  health, is `HUNT_GUARD` (`nemesisTraits.ts`, where the fight reads it). */
export const HUNT = { price: 2, bounty: 2, perMight: 0.5 } as const;
export { HUNT_GUARD };

/** The wave a hunted quarry that is neither a boss nor the warchief stands in: the first ordinary wave a third of the way into its army. */
export function huntWave(army: Pick<Army, 'waves'>): number {
  const from = Math.max(3, Math.ceil(army.waves.length / 3));
  for (let w = from; w <= army.waves.length; w++) if (!army.waves[w - 1].boss) return w;
  for (let w = from - 1; w >= 1; w--) if (!army.waves[w - 1].boss) return w;
  return 1;
}

/** The waves a quarry will stand in, for the card ("at wave 6"): a boss at its boss's waves, the warchief at the last, any other at `huntWave`. */
export function quarryWaves(n: Pick<Nemesis, 'army' | 'base' | 'boss' | 'rank'>): number[] {
  const army = armyById(n.army);
  if (!army) return [];
  if (n.boss) return army.waves.map((w, i) => (w.boss && w.foes[0] === n.base ? i + 1 : 0)).filter((x) => x > 0);
  if (n.rank === 'warchief') return [army.waves.length];
  return [huntWave(army)];
}

/** The bounty for a quarry of this Might. */
export const bountyOf = (might: number): number => HUNT.bounty + Math.floor(might * HUNT.perMight);

/** The member hunted now, if any. */
export const quarryOf = (war: War | undefined): Nemesis | undefined => (war?.hunt ? war.members.find((n) => n.id === war.hunt!.id) : undefined);

/** Why a member cannot be hunted now, if it cannot: the War over, the trophies short, licking its wounds (it sits out its army's runs). */
export function cannotHunt(war: War | undefined, n: Nemesis): string | undefined {
  if (!war || war.end) return 'The War is over';
  if (war.hunt?.id === n.id) return 'It is hunted already';
  if (war.away?.[String(n.id)]) return 'It is licking its wounds: it sits out its army’s next runs';
  if (war.trophies < HUNT.price) return `A hunt costs ${HUNT.price} War Trophies`;
  return undefined;
}

/** Set a hunt on a member (two War Trophies; one at a time, so it replaces any other): one of its secrets is revealed. Returns the words of
 *  what was learned (or ''), or null when it cannot be hunted. */
export function setHunt(m: Meta, id: number): string | null {
  const war = m.war;
  const n = war?.members.find((x) => x.id === id);
  if (!war || !n || cannotHunt(war, n)) return null;
  war.trophies -= HUNT.price;
  war.hunt = { id: n.id, army: n.army, at: war.turn };
  const s = reveal(n);
  news(war, 'hunt', `You set a hunt on ${fullName(n)}`);
  return s ? `${fullName(n)}: ${secretName(s)}` : '';
}

/** A hunt whose quarry has left the Council some other way (a feud, a betrayal, a desertion) lapses, and its trophies come back. */
export function lapseHunt(war: War): void {
  if (!war.hunt || war.members.some((n) => n.id === war.hunt!.id)) return;
  war.trophies += HUNT.price;
  delete war.hunt;
}

/**
 * An army run has ended (`settleRun`): a hunt planned into it whose quarry was met and still lives has failed (one never reached is left
 * on for the next run). The trophies are spent; the quarry
 * remembers it, and taunts about it at the next meeting (`Nemesis.huntLived`). Returns the wave card's line, if any.
 */
export function endHunt(m: Meta, run: Run): string | undefined {
  const war = m.war;
  if (!war?.hunt || !run.over || run.mode?.kind !== 'army' || war.hunt.run !== run.seed) return undefined;
  const n = quarryOf(war);
  // (a run that ended before the quarry's wave leaves the hunt on, for the army's next run)
  if (n && war.hunt.met !== undefined && n.met <= war.hunt.met) {
    delete war.hunt.run;
    delete war.hunt.met;
    return undefined;
  }
  delete war.hunt;
  if (!n) return undefined;
  n.huntLived = n.met;
  const line = `The hunt has failed: ${fullName(n)} lives`;
  news(war, 'hunt', line);
  remember(n, `Outlived a hunt · ${armyById(n.army)?.name ?? n.army}`);
  return line;
}

/** The wave card's line for a quarry standing in the next wave ("Ahead: your quarry, Morrow the Unburnt, stands in this wave"). */
export function huntAhead(run: Pick<Run, 'nemesis' | 'stage'>): string | undefined {
  const s = run.nemesis?.members.find((x) => x.hunted && run.nemesis!.waves[String(run.stage)]?.includes(x.id));
  return s ? `Ahead: your quarry, ${fullName(s)}, stands in the next wave` : undefined;
}
