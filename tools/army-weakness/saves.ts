// Saves for ARMY-WEAKNESS's screenshots (`tools/army-weakness/shots.mjs`, docs/samples/army-weakness/): a save at level 75 with every army
// open and a broad roster, every tutorial seen (or all but the weaknesses' card); and a Golem Forge run whose bench holds heroes on its
// weaknesses (the Wizard, the Rifle Bot), on its resistances (the Samurai, the Archer) and neither (the Knight, the Paladin, the Cleric).
import { startedMeta } from '../../src/sim/meta';
import { ARMIES } from '../../src/sim/armies';
import { armyRun, recruit } from '../../src/sim/run';
import { HEROES } from '../../src/sim/units';
import { SCENES } from '../../src/sim/sceneScripts';
import { xpFor } from '../../src/sim/levels';
import { TUTORIALS } from '../../src/tutorialRules';

const ROSTER = ['knight', 'paladin', 'cleric', 'wizard', 'rifleBot', 'samurai', 'archer'];

export function meta(tutorial = false) {
  const m = startedMeta(7);
  m.unlocked = [...new Set([...HEROES, ...ROSTER, 'warlock', 'kunoichi', 'bombardier', 'juggernaut'])];
  m.party = ['knight', 'paladin', 'cleric', 'wizard', 'rifleBot'];
  for (const k of m.unlocked) m.xp[k] = xpFor(75);
  m.crowns = 2400;
  m.bestStage = 14;
  m.scenes = Object.keys(SCENES);
  m.heroesSeen = [...m.unlocked];
  m.featuresTold = ['autoMerge', 'autoPlace', 'autoRunes'];
  for (const a of ARMIES) m.armies[a.id] = { waves: a.waves.length, best: a.waves.length, won: a.waves.length, clears: 1, stars: {}, met: { '0': 7 }, first: 1 };
  m.armySeen = ARMIES.map((a) => a.id);
  m.tutorials = TUTORIALS.map((t) => t.id).filter((id) => !tutorial || id !== 'armyWeakness');
  return m;
}

/** A Golem Forge run on its first wave, the bench as above. */
export function run() {
  const r = armyRun(5, 'golems', ROSTER);
  r.stage = 1;
  for (const k of ROSTER) recruit(r, k);
  r.gold = 40;
  return r;
}
