// Saves for the Nemesis War's phase 4 screenshots (`tools/nemesis/shots4.mjs`, docs/samples/nemesis-4/): phase 3's Dark Council, with the
// War's memory of duels: the News tells of a duel won, one lost and one run out of time, and the Fallen of a nemesis slain in single combat.
// An Undead run on Hask's wave (5): Hask is Vengeful against Natsu, so he calls Natsu out by name. And the same wave with Hask Vain and no
// score to settle with the squad, so he calls out any champion (an open challenge).

import { meta as base, run as baseRun } from './saves3';
import { decorate } from '../../src/sim/revenge';
import { snapOf, type NewsKind } from '../../src/sim/nemesis';

export function meta() {
  const m = base();
  const war = m.war!;
  const news: [number, NewsKind, string][] = [
    [49, 'duel', 'Gash the Gutter falls in single combat to Kwame'],
    [49, 'duel', 'Throg, Ravi’s Bane bests Ravi in single combat'],
    [48, 'duel', 'Sister Ash outlasts Aiko in single combat, and slips away'],
  ];
  war.news = [...news.map(([turn, kind, text]) => ({ turn, kind, text })), ...war.news].slice(0, 40);
  war.fallen.unshift({ id: 90, name: 'Gash', epithet: 'the Gutter', base: 'orcGrunt', army: 'orcs', rank: 'captain', might: 4, by: 'knight', how: 'duel', tier: 1, turn: 49 });
  return m;
}

/** Hask's wave, as phase 3's: he is Vengeful against Natsu (the Archer), so he challenges Natsu by name. */
export const run = (stage = 5) => baseRun(stage);

/** Hask's wave with Hask Vain, Vengeful against nobody and dreading a hero not in the squad: an open challenge. */
export function openRun(stage = 5) {
  const m = meta();
  const hask = m.war!.members.find((n) => n.id === 6)!;
  delete hask.vengeful;
  hask.weak = ['dread:samurai', 'vain'];
  delete m.grudges;
  const r = baseRun(stage);
  r.nemesis = { members: [decorate(m, snapOf(hask), hask)], waves: { [String(stage)]: [6] } };
  return r;
}
