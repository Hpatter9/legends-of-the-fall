// Tunes and measures the Normal curve of the armies (docs/notes/army-curve.md). The recruits' party at a level, the castle a climb has by then
// (none until the sixth army; then 6, 13, 18, 22 levels over the five buildings), gear dressed, XP carried between tries.
//   node tools/curve/run.mjs table [levels]                 mean tries at each level for every army (SAVES saves a cell)
//   node tools/curve/run.mjs tune                           bisect each army's `start` so its recommended level takes TARGET tries
//   node tools/curve/run.mjs cell orcs:1 undead:8           one army:level cell
// Environment: SAVES (default 24), TARGET (2.8), CAP (25), TIER (0), LEVELS (the recommended levels), START (army:value,...), GROWTH and TIERSTART (army:value,...), ONLY (army ids).
import { ARMIES } from '../../src/sim/armies';
import { BUILDINGS, maxLevel, newCastle, type BuildingId } from '../../src/sim/castle';
import { mixSeed } from '../../src/sim/rng';
import { playArmy, savedAt } from '../autoplay';

const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const SAVES = Number(process.env.SAVES ?? 24);
const TARGET = Number(process.env.TARGET ?? 2.8);
const CAP = Number(process.env.CAP ?? 25);
const TIER = Number(process.env.TIER ?? 0);
const SPREAD: BuildingId[] = ['barracks', 'armoury', 'library', 'treasury', 'stable'];
/** The castle levels a climb has when it meets the army (index `i`): shut until five armies are cleared. */
const CASTLE_TOTAL = [0, 0, 0, 0, 0, 6, 13, 18, 22];
const castleAt = (i: number) => {
  const c = newCastle();
  for (let n = 0; n < CASTLE_TOTAL[i]; n++) {
    const id = [...SPREAD].sort((a, b) => c[a] - c[b])[0];
    if (c[id] < maxLevel(id)) c[id]++;
  }
  return c;
};
const set = (env: string | undefined, key: 'start' | 'growth' | 'tierStart') => {
  for (const kv of (env ?? '').split(',').filter(Boolean)) {
    const [id, v] = kv.split(':');
    (ARMIES.find((a) => a.id === id) as unknown as Record<string, number>)[key] = Number(v);
  }
};
set(process.env.START, 'start');
set(process.env.GROWTH, 'growth');
set(process.env.TIERSTART, 'tierStart');
void BUILDINGS;

/** Mean tries to clear (a fresh save each, XP carried between tries, at most CAP; CAP + 1 if never). */
export function meanTries(i: number, level: number, saves = SAVES): number {
  const army = ARMIES[i];
  const castle = castleAt(i);
  let total = 0;
  for (let save = 1; save <= saves; save++) {
    const meta = savedAt(level, party, save);
    let n = 0;
    let ok = false;
    while (n < CAP && !ok) {
      ok = playArmy(meta, army.id, mixSeed(save, 0xd33b, i * 100 + TIER * 10 + n), party, castle, true, TIER).cleared;
      n++;
    }
    total += ok ? n : CAP + 1;
  }
  return total / saves;
}

/** Mean Normal stars (of 3) of the first clear, and the mean tries, for a party at `level` (a party that never clears counts no stars). */
function starsAt(i: number, level: number, saves = SAVES): { stars: number; tries: number } {
  const army = ARMIES[i];
  const castle = castleAt(i);
  let stars = 0;
  let total = 0;
  for (let save = 1; save <= saves; save++) {
    const meta = savedAt(level, party, save);
    let n = 0;
    while (n < CAP) {
      const r = playArmy(meta, army.id, mixSeed(save, 0xd33b, i * 100 + n), party, castle, true, 0);
      n++;
      if (r.cleared) {
        stars += r.stars;
        break;
      }
    }
    total += n;
  }
  return { stars: stars / saves, tries: total / saves };
}

const [cmd = 'table', ...rest] = process.argv.slice(2);
const recLevels = ARMIES.map((a) => a.level);
if (cmd === 'cell') {
  for (const c of rest) {
    const [id, lv] = c.split(':');
    const i = ARMIES.findIndex((a) => a.id === id);
    console.log(`${id} L${lv}: ${meanTries(i, +lv).toFixed(1)}`);
  }
} else if (cmd === 'table') {
  const levels = (rest[0] ?? process.env.LEVELS ?? '1,10,20,30,45,60,80,100').split(',').map(Number);
  console.log(['army (rec)'.padEnd(26), ...levels.map((l) => `Lv${l}`.padStart(6))].join(''));
  ARMIES.forEach((a, i) => process.env.ONLY && !process.env.ONLY.split(',').includes(a.id) ? 0 : console.log([`${a.name} (${a.level})`.padEnd(26), ...levels.map((l) => meanTries(i, l).toFixed(1).padStart(6))].join('')));
} else if (cmd === 'stars') {
  // (the Normal stars of a first clear at the recommended level, and ten levels above it)
  ARMIES.forEach((a, i) => {
    const at = starsAt(i, a.level);
    const up = starsAt(i, a.level + 10);
    console.log(`${a.name.padEnd(22)} Lv ${String(a.level).padStart(2)}: ${at.stars.toFixed(2)} stars (${at.tries.toFixed(1)} tries)   Lv ${a.level + 10}: ${up.stars.toFixed(2)} stars (${up.tries.toFixed(1)} tries)`);
  });
} else if (cmd === 'tune') {
  ARMIES.forEach((a, i) => {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(a.id)) return;
    let lo = a.start * 0.6;
    let hi = a.start * 1.6;
    for (let step = 0; step < 8; step++) {
      const mid = (lo + hi) / 2;
      a.start = mid;
      (meanTries(i, recLevels[i]) > TARGET ? (hi = mid) : (lo = mid));
    }
    a.start = Math.round(((lo + hi) / 2) * 100) / 100;
    console.log(`${a.id}: start ${a.start} -> ${meanTries(i, recLevels[i], SAVES * 2).toFixed(2)} tries at Lv ${recLevels[i]}`);
  });
}
