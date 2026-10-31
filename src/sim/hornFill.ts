// What a settled fight of a run brings the War Horn, by mode (EIDOLONS batch 3, docs/notes/eidolons.md; the rules are `warHorn.ts`). The
// page calls `hornFightOf` as it settles a wave and adds `hornGain` of it to the save; the Last Stand settles its run whole
// (`standHornGain`). Pure rules: no Pixi, no DOM.

import type { Battle } from './battle';
import type { Run } from './run';
import { isBossRun, waveArmyOf } from './run';
import { foesSlain, type HornFight } from './warHorn';

/** What a run's settled fight was for the horn: its boss wave (an army's, the daily's and a quest battle's mid-boss and last boss; a
 *  Calamity or spire boss node; a Calamity or spire elite), the ordinary foes slain, and whether it counts (a practice daily or a
 *  practice quest battle does not). `auto` is an auto-replay. */
export function hornFightOf(run: Run, stage: number, b: Battle, won: boolean, auto = false): HornFight {
  const mode = run.mode;
  const practice = (mode?.kind === 'daily' || mode?.kind === 'quest') && !!mode.practice;
  let boss: HornFight['boss'];
  if (run.tower) boss = run.tower.cur?.kind === 'boss' ? (mode?.kind === 'calamity' ? 'guardian' : 'boss') : run.tower.cur?.kind === 'elite' ? 'elite' : undefined;
  else if (waveArmyOf(run) && isBossRun(run, stage)) boss = 'boss';
  return { won, foes: foesSlain(b), ...(boss ? { boss } : {}), ...(auto ? { auto } : {}), ...(practice ? { counts: false } : {}), ...(b.eidolon?.called !== undefined ? { called: true } : {}) };
}

/** Whether the wave's boss is a mid-boss (the Eidolon takes 65% of it, as of an elite). */
export const midBossWave = (run: Run, stage: number): boolean => waveArmyOf(run)?.waves[stage - 1]?.boss === 'mid';
