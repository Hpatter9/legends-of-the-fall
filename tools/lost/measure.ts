// Measures each lost technique against its reader's own best loadout (LOST-TECHNIQUES, docs/notes/lost-techniques.md): random five-hero
// teams of the hero sweep with one reader in them, at level 30 and stage 78, the reader fighting with its own two skills (the baseline),
// then with the lost technique in slot 1 and in slot 2 (the same seeds, the same teams). The design allows a lost technique to stand
// up to 2 points above the reader's best loadout. Win rate is for the team the reader was in.
//
//   node tools/lost/measure.mjs [games] [technique] [reader,reader,...]

import { place, startBattle, fight, stepBattle, type Boost } from '../../src/sim/battle';
import { FIELD_BANDS } from '../../src/sim/foes';
import { emptyStats } from '../../src/sim/equipment';
import { mixSeed, Rng } from '../../src/sim/rng';
import { ALL_HEROES } from '../../src/sim/units';
import { deploySpots, fieldBoost, sweepBoost, TEAM } from '../heroSweep';

const games = Number(process.argv[2]) || 300;
const only = process.argv[3];
const readers = process.argv[4]?.split(',');
const LEVEL = 30;
const STAGE = Number(process.env.STAGE ?? 78); // (STAGE=90: the joint rebalance's level-30 yardstick, where a team wins about 60%)

const SETS: Record<string, string[]> = {
  ninefoldCut: ['knight', 'samurai', 'archer', 'barbarian', 'lancer', 'reaper'],
  wordsOfUnmaking: ['wizard', 'lightningMage', 'warlock', 'illusionist', 'tyrant', 'sage'],
  longDawn: ['cleric', 'priestess', 'paladin', 'druid', 'wolfBard', 'timeWitch'],
  oldHunger: ['werewolf', 'minotaur', 'gorgon', 'kitsune', 'kraken', 'mummy'],
};

function win(seed: number, reader: string, book?: [string, string]): boolean {
  const rng = new Rng(mixSeed(seed, 0x7ea4));
  const pool = ALL_HEROES.filter((h) => h !== reader);
  const team = [reader];
  while (team.length < TEAM) team.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  const b = startBattle(seed, FIELD_BANDS[seed % FIELD_BANDS.length], fieldBoost(STAGE));
  const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
  team.forEach((id, i) => {
    const boost: Boost = sweepBoost(1, LEVEL);
    if (id === reader && book) boost.equip = { ...emptyStats(), book };
    place(b, id, spots[i][0], spots[i][1], undefined, boost);
  });
  fight(b);
  while (b.phase === 'fight') stepBattle(b);
  return b.phase === 'won';
}

for (const [id, list] of Object.entries(SETS)) {
  if (only && id !== only) continue;
  for (const reader of readers ?? list) {
    let base = 0;
    let s1 = 0;
    let s2 = 0;
    for (let g = 1; g <= games; g++) {
      if (win(g, reader)) base++;
      if (win(g, reader, [id, 'own2'])) s1++;
      if (win(g, reader, ['own1', id])) s2++;
    }
    const pc = (n: number) => ((100 * n) / games).toFixed(1).padStart(5);
    console.log(`${id.padEnd(16)} ${reader.padEnd(14)} own ${pc(base)}  slot1 ${pc(s1)} (${(((s1 - base) * 100) / games).toFixed(1)})  slot2 ${pc(s2)} (${(((s2 - base) * 100) / games).toFixed(1)})`);
  }
}
