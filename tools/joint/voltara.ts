// Voltara's trial at level 40 for the eidolon-chain-4 test's party (Knight, Peasant, Samurai, Archer, Wizard), fought as that test fights
// it, over seeds 2003 on: how many are won (STATS batch 2's watch item: 6 of 10 on 0.315, 2 after). `JOINT_OFF` as the other tools.
import './off';
import { ARMIES } from '../../src/sim/armies';
import { startedMeta } from '../../src/sim/meta';
import { finish, startStage, canRetry, retryWave, summon } from '../../src/sim/run';
import { startQuestBattle } from '../../src/sim/questRun';
import { fight, playOut } from '../../src/sim/battle';
import { autoDeploy, autoEvent, pickSquad } from '../../src/sim/autoplay';
import { autoMerge } from '../../src/sim/merge';
import { savedAt } from '../autoplay';

void startedMeta;
const N = Number(process.argv[2] ?? 10);
const level = Number(process.argv[3] ?? 40);
let won = 0;
const wins: number[] = [];
for (let seed = 2003; seed < 2003 + N; seed++) {
  const party = ['knight', 'peasant', 'samurai', 'archer', 'wizard'];
  const m = savedAt(level, party, seed);
  m.unlocked = [...new Set([...m.unlocked, ...party])];
  m.party = [...party];
  for (const a of ARMIES) m.armies[a.id] = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
  m.quests = { active: [], offers: [], done: [], won: ['voltaraTrial'] };
  const run = startQuestBattle(m, 'voltaraTrial', party)!;
  const ids = run.roster.map((h) => h.id);
  while (!run.over) {
    autoEvent(run);
    autoMerge(run);
    while (summon(run)) autoMerge(run);
    run.squad = pickSquad(run, m, ids).slice(0, 5).map((h) => h.id);
    const b = startStage(run);
    autoDeploy(b, run, m);
    fight(b);
    playOut(b);
    const ok = b.phase === 'won';
    if (!ok && canRetry(run)) {
      retryWave(run);
      continue;
    }
    finish(run, ok);
  }
  if (run.cleared) {
    won++;
    wins.push(seed);
  }
}
console.log(`voltara trial, level ${level}: ${won} of ${N} won (${wins.join(' ')})`);
