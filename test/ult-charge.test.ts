import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, place, startBattle, stepBattle, type Battle } from '../src/sim/battle';
import { CHARGE_MAX, ULT_LEVEL, ultimateOf, ultKeyOf } from '../src/sim/abilities';
import { ULT_FILL } from '../src/sim/heroKits';
import { FIELD_BANDS } from '../src/sim/foes';
import { gradeBoost } from '../src/sim/run';
import { mixSeed, Rng } from '../src/sim/rng';
import { deploySpots, fieldBoost, pickTeam } from '../tools/heroSweep';

// ULT-CHARGE (docs/notes/ult-charge.md): the owner's "the ultimates should charge up and be used maybe 1-2 times per battle". A fight starts with the
// meter part full, so the first ultimate comes by about mid-fight, and it fills fast enough for a second in a long or boss fight.

/** A battle with five heroes placed at a level, as the hero sweep places them (deploy, not yet fought). */
function placed(seed: number, level: number, stage = 56): Battle {
  const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
  const b = startBattle(seed, FIELD_BANDS[seed % FIELD_BANDS.length], fieldBoost(stage));
  const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
  team.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, gradeBoost(1, 0, level)));
  return b;
}

test('a fight starts with each open ultimate part full, a fuller carried meter is kept, and a locked one stays empty', () => {
  assert.ok(ULT_FILL.START > 0 && ULT_FILL.START < CHARGE_MAX);
  const b = placed(7, ULT_LEVEL);
  const heroes = b.units.filter((u) => u.side === 'hero');
  heroes[0].charge2 = 90;
  assert.ok(fight(b));
  assert.equal(heroes[0].charge2, 90, 'the carried meter, fuller than the start, is kept');
  for (const u of heroes.slice(1)) assert.equal(u.charge2, ULT_FILL.START, `${u.def} starts at ${ULT_FILL.START}`);
  for (const u of b.units.filter((x) => x.side === 'foe')) assert.ok(!u.charge2, 'the foes keep their own meter');
  const low = placed(7, ULT_LEVEL - 1);
  fight(low);
  for (const u of low.units.filter((x) => x.side === 'hero')) assert.ok(!u.charge2 && !ultimateOf(u), 'below level 30 there is no meter to start');
});

test('with its ultimate open, a hero fires it about once a fight, the first by about mid-fight, and a long fight sees a second', () => {
  let heroes = 0;
  let ults = 0;
  let firsts: number[] = [];
  let lengths = 0;
  let longHeroes = 0;
  let longUlts = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const b = placed(seed, ULT_LEVEL);
    fight(b);
    const count = new Map<number, number>();
    const first = new Map<number, number>();
    while (b.phase === 'fight') {
      for (const e of stepBattle(b)) {
        if (e.kind !== 'skill') continue;
        const u = b.units.find((x) => x.id === e.by)!;
        if (u.side !== 'hero' || u.owner !== undefined || ultKeyOf(u) !== e.name) continue;
        count.set(u.id, (count.get(u.id) ?? 0) + 1);
        if (!first.has(u.id)) first.set(u.id, b.t);
      }
    }
    const hs = b.units.filter((u) => u.side === 'hero' && u.owner === undefined);
    heroes += hs.length;
    lengths += b.t * hs.length;
    for (const u of hs) ults += count.get(u.id) ?? 0;
    firsts.push(...first.values());
    if (b.t >= 35000) {
      longHeroes += hs.length;
      for (const u of hs) longUlts += count.get(u.id) ?? 0;
    }
  }
  firsts = firsts.sort((a, b) => a - b);
  const perFight = ults / heroes;
  const median = firsts[Math.floor(firsts.length / 2)];
  const mid = lengths / heroes / 2;
  assert.ok(perFight >= 0.7 && perFight <= 2, `${perFight.toFixed(2)} ultimates a hero a fight`);
  assert.ok(median <= mid * 1.2, `the first comes at ${median} ms (median), the fight's middle is ${Math.round(mid)} ms`);
  assert.ok(longHeroes > 0 && longUlts / longHeroes >= 1.4, `a long fight sees ${(longUlts / Math.max(1, longHeroes)).toFixed(2)} a hero`);
});
