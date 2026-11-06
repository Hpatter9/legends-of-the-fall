// Saves for Dynasties' phase 5 screenshots (`tools/dynasty/shots5.mjs`, docs/samples/dynasty-5/): a save whose seasons opened 20 days ago
// (Summer of Year 1), with twelve Houses at every stage: Kwame an Elder (eleven seasons, his memory of the stages), Kenji a Veteran,
// Natsu in his Prime with this season's 20 waves fought (a Veteran at the turn), Ravi a Youth, Selam mentoring in the Hall of Legends.
// And an Orc Warband run on wave 2, the Elder and the Veteran in the squad, for their looks on the board.

import { startedMeta } from '../../src/sim/meta';
import { armyRun, recruit } from '../../src/sim/run';
import { SCENES } from '../../src/sim/sceneScripts';
import { xpFor } from '../../src/sim/levels';
import { openDynasty, seasonIndex } from '../../src/sim/dynasty';
import { HERO_NAMES } from '../../src/sim/heroNames';

const key = (d: Date): number => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const today = (): number => key(new Date());
const daysAgo = (n: number): number => key(new Date(Date.now() - n * 86_400_000));

export function meta() {
  const m = startedMeta(7);
  m.unlocked = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'peasant', 'wanderer', 'kitsune', 'rifleBot', 'werewolf'];
  m.party = ['knight', 'samurai', 'archer', 'wizard', 'peasant'];
  for (const k of m.unlocked) m.xp[k] = xpFor(k === 'knight' ? 96 : k === 'samurai' ? 64 : 40);
  m.crowns = 2400;
  m.bestStage = 14;
  m.scenes = Object.keys(SCENES);
  m.heroesSeen = [...m.unlocked];
  m.featuresTold = ['autoMerge', 'autoPlace'];
  m.armies.orcs = { waves: 15, best: 15, won: 15, clears: 4, stars: {}, met: { '0': 7 }, first: 1 };
  m.armySeen = ['orcs', 'undead'];
  m.opened = ['orcs', 'undead'];
  m.mentors = { devout: { kind: 'cleric', since: 0 } };
  m.bonds = { 'knight|peasant': 320, 'knight|paladin': 130, 'archer|lightningMage': 50 };
  openDynasty(m, daysAgo(20));
  const d = m.dynasty!;
  const set = (k: string, served: number, memory?: string[]) => {
    d.lines[k].bearers[0].served = served;
    if (memory) d.lines[k].bearers[0].memory = memory;
  };
  set('knight', 11, ['Came into the Prime of life · Year 1, Autumn', 'Stood at the gate through the Orc Warband’s fifteen waves', 'Became a Veteran · Year 2, Autumn', 'Became an Elder · Year 3, Autumn']);
  set('samurai', 7, ['Came into the Prime of life · Year 1, Autumn', 'Became a Veteran · Year 2, Autumn']);
  set('archer', 5);
  set('paladin', 9);
  set('kitsune', 10, ['Became an Elder · Year 3, Autumn']);
  set('rifleBot', 6);
  set('werewolf', 7);
  set('peasant', 3);
  const now = seasonIndex(d, today());
  d.served = { knight: { season: now, waves: 22 }, archer: { season: now, waves: 21 }, samurai: { season: now, waves: 12.5 }, wizard: { season: now, waves: 4 }, peasant: { season: now, waves: 9 } };
  d.told = now;
  void HERO_NAMES;
  return m;
}

/** An Orc Warband run on wave 2 with the Elder and the Veteran in the squad. */
export function run(stage = 2) {
  const party = ['knight', 'samurai', 'archer', 'wizard', 'peasant'];
  const r = armyRun(5, 'orcs', party);
  r.stage = stage;
  for (const k of party) r.squad.push(recruit(r, k).id);
  r.gold = 40;
  return r;
}

/** The same save with every bearer a Youth, for the looks' side-by-side (the touch of the years against none). */
export function youngMeta() {
  const m = meta();
  for (const l of Object.values(m.dynasty!.lines)) l.bearers[0].served = 0;
  return m;
}
