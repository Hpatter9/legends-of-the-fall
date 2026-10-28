import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startBattle } from '../src/sim/battle';
import { ARMIES, waveFoes } from '../src/sim/armies';
import { isBoss } from '../src/sim/foes';
import { planScenario, scenarioForArmy } from '../src/sim/scenario';
import { arenaSpots, ESCORT_REACH } from '../src/sim/arenaDeploy';
import { DEPLOY_ROWS, tileAt } from '../src/sim/board';

// FIGHT-FIXES: the owner's "The bosses should stand in the middle of the boss arena."

test("every army's boss starts in its arena's middle, and its band stands round it", () => {
  let checked = 0;
  for (const army of ARMIES) {
    const theme = scenarioForArmy(army.id);
    if (!theme) continue;
    for (let seed = 1; seed <= 5; seed++) {
      const sections = planScenario(seed, theme, army.waves.length, (n) => !!army.waves[n - 1].boss).sections;
      for (const s of sections) {
        if (!s.boss) continue;
        const mid = s.board.arenaMid;
        assert.ok(mid, `${army.id}/${seed}/${s.wave} has no arena middle`);
        for (let tier = 0; tier <= 2; tier++) {
          const ids = waveFoes(army, s.wave, tier);
          if (!isBoss(ids[0])) continue;
          const b = startBattle(seed * 31 + s.wave, ids, { board: s.board, boss: { hp: 2 } });
          const foes = b.units.filter((x) => x.side === 'foe');
          const boss = foes[0];
          assert.equal(boss.def, ids[0]);
          // (on the floor tile nearest the middle: well clear of the foes' old edge rows)
          assert.ok(Math.hypot(boss.u - mid.u, boss.v - mid.v) <= 1.5, `${army.id}/${seed}/${s.wave} boss at ${boss.u},${boss.v}, middle ${mid.u},${mid.v}`);
          assert.ok(boss.v >= DEPLOY_ROWS, `${army.id}/${seed}/${s.wave} boss still on the edge rows`);
          assert.ok(!tileAt(b.board, boss.u, boss.v)!.ground, 'the boss does not start on a shrine or lava');
          for (const e of foes.slice(1)) assert.ok(Math.max(Math.abs(e.u - boss.u), Math.abs(e.v - boss.v)) <= ESCORT_REACH, `${army.id}/${seed}/${s.wave} escort ${e.def} at ${e.u},${e.v} far from the boss`);
          // (nobody shares a tile)
          assert.equal(new Set(foes.map((x) => `${x.u},${x.v}`)).size, foes.length);
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 40, `checked ${checked}`);
});

test('the same seed places the boss and its band the same way', () => {
  const army = ARMIES.find((a) => scenarioForArmy(a.id))!;
  const s = planScenario(3, scenarioForArmy(army.id)!, army.waves.length, (n) => !!army.waves[n - 1].boss).sections.find((x) => x.boss)!;
  const at = () => startBattle(7, waveFoes(army, s.wave), { board: s.board }).units.map((x) => `${x.def}@${x.u},${x.v}`).join(' ');
  assert.equal(at(), at());
});

test('arenaSpots: fighters stand on the heroes\' side of the boss, shooters behind it', () => {
  const army = ARMIES.find((a) => scenarioForArmy(a.id))!;
  const s = planScenario(2, scenarioForArmy(army.id)!, army.waves.length, (n) => !!army.waves[n - 1].boss).sections.find((x) => x.boss)!;
  const mid = s.board.arenaMid!;
  const [boss] = arenaSpots(s.board, () => false, mid, false, null);
  const taken = (u: number, v: number) => u === boss.u && v === boss.v;
  for (const f of arenaSpots(s.board, taken, mid, false, boss)) assert.ok(f.v >= boss.v);
  for (const f of arenaSpots(s.board, taken, mid, true, boss)) assert.ok(f.v <= boss.v);
});

test('a board without an arena keeps the foes on their usual rows', () => {
  const b = startBattle(5, ['orcWarlord', 'skeleton'], {});
  for (const x of b.units) assert.ok(x.v < DEPLOY_ROWS);
});
