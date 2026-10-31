// How often a greedy player wins each quest battle (batch 2 of the quests design), with the two hearts, a party of the required
// cast and starter heroes at the level its army's Normal is meant for (`like`), as the armies are tuned: about 2 to 4 tries there.
//
//   npm run quest-rate            30 tries a battle, at the army's level
//   npm run quest-rate -- 40 +5   40 tries, five levels above it

import { fight, playOut } from '../../src/sim/battle';
import { armyById, ARMIES } from '../../src/sim/armies';
import { autoDeploy, autoEvent, pickSquad } from '../../src/sim/autoplay';
import { autoMerge } from '../../src/sim/merge';
import { canRetry, finish, retryWave, summon, startStage } from '../../src/sim/run';
import { CHAIN_BATTLES, QUEST_BATTLES, castOf, forgetQuestArmies, notReady, type QuestBattle } from '../../src/sim/questBattles';
import { startQuestBattle } from '../../src/sim/questRun';
import { traitsOf } from '../../src/sim/traits';
import { savedAt } from '../autoplay';

const tries = Number(process.argv[2]) || 30;
const lift = Number(process.argv[3]) || 0;
/** `--search`: for each battle, the largest `ease` on a ladder that a party at the level wins at least half the time. */
const search = process.argv.includes('--search');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const FILL = ['knight', 'samurai', 'archer', 'peasant', 'kunoichi', 'wizard', 'cleric', 'warlock', 'lightningMage', 'sage'];

function rate(qb: QuestBattle): number {
  const like = armyById(qb.like.army)!;
  const level = like.level + lift;
  const cast = qb.cast.map((s) => s.heroes[0]);
  const fits = (k: string) => !qb.only || !!qb.only.traits?.some((t) => traitsOf(k).includes(t)) || !!qb.only.heroes?.includes(k);
  const party = [...new Set([...cast, ...FILL.filter(fits)])].slice(0, 5);
  let wins = 0;
  for (let i = 1; i <= tries; i++) {
    const m = savedAt(level, party, 1000 + i);
    m.unlocked = [...new Set([...m.unlocked, ...party])];
    m.party = [...party];
    for (const a of ARMIES) m.armies[a.id] = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
    m.quests = { active: [], offers: [], done: [], won: [qb.id] };
    const run = startQuestBattle(m, qb.id, party)!;
    const castIds = run.roster.map((h) => h.id);
    while (!run.over) {
      autoEvent(run);
      autoMerge(run);
      while (summon(run)) autoMerge(run);
      // (the cast first; then the strongest who fit the battle's rule, up to its limit)
      run.squad = pickSquad(run, m, castIds).filter((h) => castIds.includes(h.id) || fits(h.kind)).slice(0, qb.most ?? 5).map((h) => h.id);
      const b = startStage(run);
      autoDeploy(b, run, m);
      const placed = b.units.filter((u) => u.side === 'hero').map((u) => u.def);
      if (notReady(qb, castOf(m, qb)!, placed)) throw new Error(`${qb.id}: not ready ${JSON.stringify(notReady(qb, cast, placed))}`);
      fight(b);
      playOut(b);
      const ok = b.phase === 'won';
      if (!ok && canRetry(run)) {
        retryWave(run);
        continue;
      }
      finish(run, ok);
    }
    if (run.cleared) wins++;
  }
  return wins;
}

for (const qb of [...QUEST_BATTLES, ...CHAIN_BATTLES]) {
  if (only && qb.id !== only) continue;
  const level = armyById(qb.like.army)!.level + lift;
  let wins = 0;
  if (search) {
    for (const e of [1.6, 1.45, 1.3, 1.2, 1.1, 1, 0.9, 0.8, 0.72, 0.65, 0.58, 0.52, 0.46, 0.4, 0.35, 0.3]) {
      (qb as { ease?: number }).ease = e;
      forgetQuestArmies();
      wins = rate(qb);
      if (wins * 2 >= tries) break;
    }
  } else wins = rate(qb);
  console.log(`${qb.id.padEnd(16)} ${qb.like.army}@${qb.like.wave} lvl ${String(level).padStart(2)}  ${qb.waves.length} waves  won ${wins}/${tries} (${Math.round((100 * wins) / tries)}%)  ease ${qb.ease ?? 1}`);
}
