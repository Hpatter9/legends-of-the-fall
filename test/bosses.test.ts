import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARGE_MAX, KITS, tryCast } from '../src/sim/abilities';
import { fight, playOut, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { BOSS_BANDS, BOSS_IDS, FIELD_BANDS, FOE_BANDS, isBoss } from '../src/sim/foes';
import { isBossStage, newRun, startStage } from '../src/sim/run';
import { readyBattle } from './helpers';

const NEW_BANDS = ['orcs', 'demons', 'ogres'];

test('the new bands start five foes each, and every boss band leads with its own boss', () => {
  for (const band of [...NEW_BANDS, ...FIELD_BANDS, ...BOSS_BANDS]) assert.equal(FOE_BANDS[band].length, 5, band);
  assert.equal(BOSS_BANDS.length, BOSS_IDS.length);
  for (const band of BOSS_BANDS) {
    const ids = FOE_BANDS[band];
    assert.ok(isBoss(ids[0]), band);
    assert.equal(ids.filter(isBoss).length, 1, band);
  }
  for (const band of FIELD_BANDS) assert.equal(FOE_BANDS[band].filter(isBoss).length, 0, band);
});

test('every boss stage meets exactly one boss, drawn larger, and the bosses come in turn', () => {
  const seen: string[] = [];
  for (let stage = 1; stage <= 50; stage++) {
    const b = startStage({ ...newRun(3), stage });
    const bosses = b.units.filter((u) => u.side === 'foe' && isBoss(u.def));
    if (!isBossStage(stage)) {
      assert.equal(bosses.length, 0, `stage ${stage}`);
      continue;
    }
    assert.equal(bosses.length, 1, `stage ${stage}`);
    assert.equal(bosses[0].size, 1.5, `stage ${stage}`);
    seen.push(bosses[0].def);
  }
  assert.deepEqual(seen.slice(0, BOSS_IDS.length), [...BOSS_BANDS]);
  assert.deepEqual([...new Set(seen)].sort(), [...BOSS_IDS].sort());
});

test('the bosses with skills have one, and the skill fires when charged', () => {
  // (a Demon Lord summons only once its imps are gone, so it has a test of its own)
  for (const id of BOSS_IDS.filter((x) => KITS[x] && x !== 'demonLord')) {
    const b = readyBattle(1, id);
    const boss = b.units.find((u) => u.def === id)!;
    const hero = b.units.find((u) => u.side === 'hero')!;
    // (the boss beside a hero, so the skill has something to hit)
    boss.u = hero.u;
    boss.v = hero.v - 1;
    boss.charge = CHARGE_MAX;
    const out: BattleEvent[] = [];
    assert.ok(tryCast(b, boss, out), id);
    assert.ok(out.some((e) => e.kind === 'skill' && e.by === boss.id && e.name === KITS[id].skill.name), id);
    assert.equal(boss.charge, 0, id);
  }
});

test('a Demon Lord with no imps left calls two up beside it, and not while any remain', () => {
  const b = readyBattle(2, 'demonLord');
  const boss = b.units.find((u) => u.def === 'demonLord')!;
  const imps = (x: Battle) => x.units.filter((u) => u.alive && u.side === 'foe' && u.def === 'imp').length;
  boss.charge = CHARGE_MAX;
  assert.ok(imps(b) > 0);
  assert.equal(tryCast(b, boss, []), false, 'imps still about');
  for (const u of b.units.filter((x: Unit) => x.def === 'imp')) u.alive = false;
  boss.charge = CHARGE_MAX;
  assert.ok(tryCast(b, boss, []));
  assert.equal(imps(b), 2);
  const summoned = b.units.filter((u) => u.alive && u.def === 'imp');
  for (const s of summoned) assert.ok(Math.abs(s.u - boss.u) <= 2 && Math.abs(s.v - boss.v) <= 2);
});

test('a Warlord\'s ground slam lands on the heroes in its 3x3 a moment after the call', () => {
  const b = readyBattle(3, 'orcWarlord');
  const boss = b.units.find((u) => u.def === 'orcWarlord')!;
  const hero = b.units.find((u) => u.side === 'hero')!;
  boss.u = hero.u;
  boss.v = hero.v - 1;
  boss.charge = CHARGE_MAX;
  fight(b);
  assert.ok(tryCast(b, boss, []));
  const hit: BattleEvent[] = [];
  for (let i = 0; i < 12; i++) hit.push(...stepBattle(b));
  assert.ok(hit.some((e) => e.kind === 'hit' && e.by === boss.id && e.src === 'skill'));
});

test('a fight against each new band ends', () => {
  for (const band of [...NEW_BANDS, ...BOSS_BANDS]) {
    for (let seed = 1; seed <= 10; seed++) {
      const b = readyBattle(seed, band);
      assert.ok(fight(b), `${band} seed ${seed}`);
      playOut(b);
      assert.ok(b.phase === 'won' || b.phase === 'lost', `${band} seed ${seed}`);
    }
  }
});
