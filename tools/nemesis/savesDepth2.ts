// Saves for NEMESIS-DEPTH's second batch screenshots (`tools/nemesis/shotsDepth2.mjs`, docs/samples/nemesis-depth-2/): the first batch's
// Council, now with Morrow having studied Karim and the wizard, Throg and Sister Ash rivals since a feud, Hask plotting against his captain Morrow,
// and Greymaw kneeling before Kwame (`meta`); or Greymaw spared and informing, with two runs to go (`metaInformant`). And Hask's wave as phase
// 4's, an old foe met three times, for the duel's card with its new stakes (`duelRun`).

import { meta as base } from './savesDepth';
import { run as phase4Run } from './saves4';

function council() {
  const m = base();
  const war = m.war!;
  const morrow = war.members.find((n) => n.id === 2)!;
  morrow.studied = ['paladin', 'wizard'];
  const throg = war.members.find((n) => n.name === 'Throg')!;
  const ash = war.members.find((n) => n.name === 'Sister Ash')!;
  throg.rival = ash.id;
  ash.rival = throg.id;
  const hask = war.members.find((n) => n.id === 6)!;
  hask.sworn = 2;
  war.plots = [{ by: hask.id, on: morrow.id, at: war.turn, due: war.turn + 2 }];
  war.trophies = 5;
  return m;
}

/** Greymaw kneels before Kwame, its pay held back. */
export function meta() {
  const m = council();
  const war = m.war!;
  const grey = war.members.find((n) => n.name === 'Greymaw')!;
  war.members = war.members.filter((n) => n !== grey);
  war.kneel = { n: grey, by: 'knight', crowns: 80, trophies: 1, tier: 0, how: 'slain' };
  war.plots![0].shown = true;
  return m;
}

/** Greymaw spared by Natsu, informing on the Orc Warband for two more runs; the plot not yet shown at the camp. */
export function metaInformant() {
  const m = council();
  const war = m.war!;
  const grey = war.members.find((n) => n.name === 'Greymaw')!;
  war.members = war.members.filter((n) => n !== grey);
  war.informant = { n: grey, by: 'archer', runs: 2, brothers: [], betrayed: 1 };
  return m;
}

/** Hask's wave, Hask met three times, so he may call Natsu out. */
export function duelRun(stage = 5) {
  const r = phase4Run(stage);
  for (const s of r.nemesis!.members) s.met = 3;
  return r;
}
