// Saves for the camp-places screenshots: the meta (open or shut Tower, daily done or not) and a run going.
import { startedMeta } from '../../src/sim/meta';
import { armyRun } from '../../src/sim/run';
import { todayKey } from '../../src/modes';
import { HEROES } from '../../src/sim/units';
import { calamityRun, towerRun } from '../../src/sim/modes';

export function meta(opts: { locked?: boolean; dailyDone?: boolean; best?: number }) {
  const m = startedMeta(7);
  m.unlocked = [...HEROES, 'paladin', 'cleric'];
  m.party = HEROES.slice(0, 5);
  m.crowns = 1200;
  m.bestStage = opts.locked ? 0 : 14;
  m.tower = opts.locked ? 0 : opts.best ?? 3;
  if (opts.dailyDone) m.daily[String(todayKey())] = { best: 320, plays: 1 };
  return m;
}
export const run = (army: string, stage: number) => {
  const r = armyRun(5, army, HEROES.slice(0, 5));
  r.stage = stage;
  return r;
};

/** A calamity and a tower climb going (their own save slots): the Calamity and Tower plates then read "Map 1/6 · continue" and "Floor 7 · continue". */
export const calamitySave = () => calamityRun(11, meta({}), 'knight', 0);
export const towerSave = () => {
  const r = towerRun(13, meta({}));
  r.stage = 7;
  return r;
};
