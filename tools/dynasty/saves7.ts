// Saves for Dynasties' phase 7 screenshots (`tools/dynasty/shots7.mjs`, docs/samples/dynasty-7/): phase 6's save (Ama holds Kwame's House,
// the Oath open) taken on. Kenji, the samurai, was slain under the Oath by Gash yesterday, his heir still training: the House mourns two
// more days, his ghost at his tavern seat with a candle. Kohaku, the Kitsune's elder, fell under the Oath when the banner fielded him: his
// House has Akari, so his ghost sits in the Hearth Hall's corner. Kwame's heir has cleared three Oath runs (a Legend); Ravi two. Askel is bound, so
// the War Horn is held, full, and Kenji's Shade answers it. An Orc Warband run on Hard, sworn, on wave 2.

import { meta as meta6 } from './saves6';
import { armyRun, recruit } from '../../src/sim/run';
import { slayBearer } from '../../src/sim/oath';
import { bindEidolon } from '../../src/sim/warHorn';
import { lineOf } from '../../src/sim/dynasty';

const DAY = 86_400_000;
const key = (d: Date): number => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const daysAgo = (n: number): number => key(new Date(Date.now() - n * DAY));

export function meta() {
  const m = meta6();
  // (Kenji slain by Gash yesterday; his heir with Ayame trains on)
  slayBearer(m, 'samurai', 7, Date.now() - DAY, daysAgo(1));
  // (Kohaku fielded in Akari's place, and slain)
  const kl = lineOf(m, 'kitsune')!;
  kl.field = 0;
  slayBearer(m, 'kitsune', undefined, Date.now() - 3 * DAY, daysAgo(3));
  // (renown: Kwame's heir a Legend, Ravi on his way)
  lineOf(m, 'knight')!.bearers[lineOf(m, 'knight')!.current].legend = 3;
  lineOf(m, 'wizard')!.bearers[0].legend = 2;
  // (the horn held and full; Kenji's Shade chosen to answer it)
  bindEidolon(m, 'askel');
  m.eidolons!.horn = 1000;
  m.eidolons!.confirmed = true;
  m.eidolons!.shade = 'samurai:0';
  m.unlocked = [...m.unlocked];
  return m;
}

/** The same save before any Eidolon is bound: the War Horn is not held, so the Shades (and the Shade honour) show greyed. */
export function noHornMeta() {
  const m = meta();
  delete m.eidolons;
  return m;
}

/** An Orc Warband run on Hard under the Oath, wave 2 (Kenji's House mourns, so he is not in it). */
export function run(stage = 2) {
  const party = ['knight', 'archer', 'wizard', 'peasant', 'kunoichi'];
  const r = armyRun(5, 'orcs', party, undefined, 1);
  r.stage = stage;
  r.oath = true;
  for (const k of party) r.squad.push(recruit(r, k).id);
  r.gold = 40;
  return r;
}
