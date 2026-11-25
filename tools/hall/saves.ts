// Saves for HALL-OF-HEROES's screenshots (`tools/hall/shots.mjs`, docs/samples/hall-of-heroes/): a collector of 24 heroes at ranks 1 to 4
// (two awakened), the Samurai set complete and waiting to be claimed, the Undead one hero short (the Reaper, begun on Recruit), and the
// Holy set claimed; every tutorial seen, or all but the Hall's. And an Orc Warband run whose Wizard has sat out three army runs: Rested.
import { startedMeta } from '../../src/sim/meta';
import { ARMIES } from '../../src/sim/armies';
import { armyRun, recruit } from '../../src/sim/run';
import { SCENES } from '../../src/sim/sceneScripts';
import { xpFor } from '../../src/sim/levels';
import { TUTORIALS } from '../../src/tutorialRules';
import { setOf } from '../../src/sim/hall';
import { CONTENT_HEROES } from '../../src/sim/contentHeroes';
import { PULL_HEROES } from '../../src/sim/unlockRules';

const OWN: Record<string, number> = {
  knight: 4, samurai: 4, archer: 3, wizard: 3, kunoichi: 2, peasant: 2, paladin: 4, cleric: 3, warlock: 2, ninjaMonk: 1, samuraiCommander: 1,
  shambler: 2, mummy: 1, plagueDoctor: 2, dreadPirate: 1, priestess: 2, inquisitor: 1, seraph: 1, rifleBot: 2, ranger: 1, druid: 2, lancer: 1,
  werewolf: 1, gunslinger: 1,
};
const SHARDS = [0, 1, 3, 6, 10];

export function meta(tutorial = false) {
  const m = startedMeta(7);
  const own = { ...OWN };
  for (const k of setOf('samurai')) own[k] = own[k] ?? 1;
  for (const k of setOf('holy')) own[k] = own[k] ?? 1;
  m.unlocked = Object.keys(own);
  for (const [k, r] of Object.entries(own)) m.shards[k] = SHARDS[r];
  m.awakened = { knight: 1, paladin: 1 };
  m.party = ['knight', 'samurai', 'archer', 'wizard', 'cleric'];
  for (const k of m.unlocked) m.xp[k] = xpFor(70);
  m.crowns = 2400;
  m.bestStage = 14;
  m.scenes = Object.keys(SCENES);
  m.heroesSeen = [...m.unlocked];
  m.featuresTold = ['autoMerge', 'autoPlace', 'autoRunes'];
  for (const a of ARMIES) m.armies[a.id] = { waves: a.waves.length, best: a.waves.length, won: a.waves.length, clears: 1, stars: {}, met: { '0': 7 }, first: 1 };
  m.armySeen = ARMIES.map((a) => a.id);
  m.tutorials = TUTORIALS.map((t) => t.id).filter((id) => !tutorial || id !== 'hall');
  m.hallSets = ['holy'];
  // (the heroes earned in play the save has reached are owned, so none joins as the page opens)
  for (const c of CONTENT_HEROES) if (!m.unlocked.includes(c.kind)) m.unlocked.push(c.kind);
  // (the Undead one short: every hero of the set owned but one a summon can bring, which is begun on Recruit)
  const undead = setOf('undead');
  const gap = undead.filter((k) => PULL_HEROES.includes(k)).slice(-1)[0];
  m.unlocked = [...m.unlocked.filter((k) => k !== gap), ...undead.filter((k) => k !== gap && !m.unlocked.includes(k))];
  for (const k of undead) if (k !== gap) m.shards[k] = m.shards[k] ?? 1;
  m.unlock = { [gap]: 3, falconer: 1, bombardier: 2 };
  m.heroesSeen = [...m.unlocked];
  m.rest = { wizard: 3, druid: 3 };
  return m;
}

/** An Orc Warband run on its first wave: the Wizard rested. */
export function run() {
  const r = armyRun(5, 'orcs', ['knight', 'samurai', 'archer', 'wizard', 'cleric']);
  r.stage = 1;
  for (const k of ['knight', 'samurai', 'archer', 'wizard', 'cleric']) recruit(r, k);
  r.gold = 40;
  return r;
}
