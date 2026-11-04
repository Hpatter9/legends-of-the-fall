// The save-like probe (QUESTS-3): plays the new quest battles with a party that has every talent row its level opens and the castle a climb
// has at that level (as `tools/army-pace/pace.ts` does), at the level the quest opens (`openLevel`), and finds the `ease` whose win rate sits
// in the middle of its star band (design section 2: three stars 45 to 70%, four 25 to 45%, five 10 to 25%). Gear is not dressed, so it
// still under-rates a real save a little: the band's middle is aimed at, not its edge.
//
//   npm run quest-bands                      every new battle: its rate now, and the ease that centres its band
//   npm run quest-bands -- --only=<id> [--tries=24]

import { fight, playOut } from '../../src/sim/battle';
import { armyById } from '../../src/sim/armies';
import { autoDeploy, autoEvent, pickSquad } from '../../src/sim/autoplay';
import { autoMerge } from '../../src/sim/merge';
import { BUILDINGS, maxLevel, newCastle, type BuildingId, type Castle } from '../../src/sim/castle';
import { levelOfKind } from '../../src/sim/levels';
import { heroRank, type Meta } from '../../src/sim/meta';
import { NEW_BATTLES, castOf, forgetQuestArmies, type QuestBattle } from '../../src/sim/questBattles';
import { QUESTS } from '../../src/sim/questData';
import { openLevel, starsOf } from '../../src/sim/questStars';
import { startQuestBattle } from '../../src/sim/questRun';
import { boostOf, canRetry, finish, retryWave, startStage, summon, type Owned } from '../../src/sim/run';
import { heroStats, learn, tierNodes } from '../../src/sim/talents';
import { ARMIES } from '../../src/sim/armies';
import { savedAt, maybeSpells } from '../autoplay';

const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const tries = Number(arg('tries')) || 20;
const only = arg('only');
const FILL = ['knight', 'samurai', 'archer', 'peasant', 'kunoichi', 'wizard', 'cleric', 'warlock', 'lightningMage', 'sage'];
const BAND: Record<number, [number, number]> = { 3: [0.45, 0.7], 4: [0.25, 0.45], 5: [0.1, 0.25] };
const mid = (s: number): number => (BAND[s] ? (BAND[s][0] + BAND[s][1]) / 2 : 0.5);

const SPREAD: BuildingId[] = ['barracks', 'armoury', 'library', 'treasury', 'stable', 'mage'].filter((id) => id in BUILDINGS) as BuildingId[];
const CASTLE_MAX = (Object.keys(BUILDINGS) as BuildingId[]).reduce((n, id) => n + maxLevel(id), 0);
const castleLevels = (L: number): number => {
  const pts: [number, number][] = [[30, 0], [38, 6], [40, 13], [46, 18], [52, 22]];
  if (L <= 30) return 0;
  for (let i = 1; i < pts.length; i++) if (L <= pts[i][0]) return Math.round(pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (L - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0]));
  return Math.min(CASTLE_MAX, Math.round(22 + (L - 52) / 2));
};
function castleAt(L: number): Castle {
  const c = newCastle();
  const ids = Object.keys(BUILDINGS) as BuildingId[];
  for (let n = 0; n < castleLevels(L); n++) {
    const open = [...SPREAD, ...ids.filter((id) => !SPREAD.includes(id))].filter((id) => c[id] < maxLevel(id));
    if (!open.length) break;
    c[open.sort((a, b) => c[a] - c[b])[0]]++;
  }
  return c;
}

/** Win rate of a battle for a save-like party at `level`. */
function rate(qb: QuestBattle, level: number): number {
  const cast = qb.cast.map((s) => s.heroes[0]);
  const party = [...new Set([...cast, ...FILL])].slice(0, 5);
  let wins = 0;
  for (let i = 1; i <= tries; i++) {
    const m: Meta = savedAt(level, party, 2000 + i);
    m.unlocked = [...new Set([...m.unlocked, ...party])];
    m.party = [...party];
    m.castle = castleAt(level);
    for (const k of party) for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(m, k, n.id);
    for (const a of ARMIES) m.armies[a.id] = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
    m.quests = { active: [], offers: [], done: [], won: [qb.id] };
    const run = startQuestBattle(m, qb.id, party)!;
    const castIds = run.roster.map((h) => h.id);
    const bf = (h: Owned) => boostOf(h, heroRank(m, h.kind), levelOfKind(m, h.kind), heroStats(m, h.kind));
    while (!run.over) {
      autoEvent(run);
      autoMerge(run);
      while (summon(run)) autoMerge(run);
      run.squad = pickSquad(run, m, castIds).slice(0, qb.most ?? 5).map((h) => h.id);
      const b = startStage(run);
      autoDeploy(b, run, m, bf);
      fight(b);
      maybeSpells(b, m, m.castle ?? newCastle());
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
  return wins / tries;
}

/** The ease whose win rate is nearest `target`: a bisection on the log of the ease (the rate falls as it rises). */
function tune(qb: QuestBattle, level: number, target: number): { ease: number; rate: number } {
  let lo = 0.12;
  let hi = 3;
  let best = { ease: qb.ease ?? 1, rate: -1 };
  for (let k = 0; k < 7; k++) {
    const e = Math.sqrt(lo * hi);
    (qb as { ease?: number }).ease = e;
    forgetQuestArmies();
    const r = rate(qb, level);
    if (best.rate < 0 || Math.abs(r - target) < Math.abs(best.rate - target)) best = { ease: e, rate: r };
    if (r > target) lo = e;
    else hi = e;
  }
  return { ease: Math.round(best.ease * 100) / 100, rate: best.rate };
}

for (const qb of NEW_BATTLES) {
  if (only && qb.id !== only) continue;
  const q = QUESTS.find((x) => x.goal.kind === 'battle' && x.goal.battle === qb.id)!;
  const stars = starsOf(q);
  const level = Math.max(openLevel(q), armyById(qb.like.army)!.level);
  const own = qb.ease ?? 1;
  forgetQuestArmies();
  const now = rate(qb, level);
  const t = tune(qb, level, mid(stars));
  (qb as { ease?: number }).ease = own;
  forgetQuestArmies();
  console.log(`${qb.id.padEnd(22)} ★${stars} lvl ${String(level).padStart(2)}  ease ${String(own).padEnd(5)} won ${Math.round(now * 100)}%   band ${BAND[stars].map((x) => Math.round(x * 100)).join('-')}%  -> ease ${t.ease} (${Math.round(t.rate * 100)}%)`);
  void castOf;
}
