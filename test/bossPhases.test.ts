import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, stepBattle, TICK_MS, TIME_LIMIT_MS, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { ARMIES, bossOf, waveBoost } from '../src/sim/armies';
import { CAL_BOSSES } from '../src/sim/calamityBosses';
import { PHASE2, PHASE_AT, PHASE_PAUSE_MS } from '../src/sim/bossPhases';
import { calBossBoost } from '../src/sim/calamity';
import { readyBattle } from './helpers';

const FINALS = [...ARMIES.map(bossOf), ...CAL_BOSSES];

/** A fight against `id` as a phase boss, the heroes strong enough to bring it down. */
function bossFight(id: string, at = PHASE_AT): { b: Battle; boss: Unit } {
  const b = readyBattle(4, [id, 'orcGrunt', 'orcGrunt'], { boss: { size: 1.5, hp: 0.4, atk: 0.1, phase: at } });
  for (const h of b.units) if (h.side === 'hero') h.power = (h.power ?? 1) * 4;
  fight(b);
  return { b, boss: b.units.find((u) => u.def === id)! };
}

test('every army final boss and every calamity boss has a phase-2 kit of its own', () => {
  assert.equal(new Set(FINALS).size, ARMIES.length + CAL_BOSSES.length, 'no boss is listed twice');
  for (const id of FINALS) assert.ok(PHASE2[id], id);
  const lines = FINALS.map((id) => PHASE2[id].line);
  assert.equal(new Set(lines).size, lines.length, 'each boss has its own line');
  const kits = FINALS.map((id) => JSON.stringify({ ...PHASE2[id], line: '' }));
  assert.equal(new Set(kits).size, kits.length, 'no two kits are alike');
  for (const id of FINALS) assert.ok(PHASE2[id].atk > 1, `${id} surges`);
});

test('each boss enters phase 2 once, at half its health, and the fight holds still while it does', () => {
  for (const id of FINALS) {
    const { b, boss } = bossFight(id);
    const phases: { e: Extract<BattleEvent, { kind: 'phase' }>; hpBefore: number; hp: number; t: number }[] = [];
    let before = boss.hp / boss.maxHp;
    let held = 0;
    while (b.phase === 'fight' && b.t < TIME_LIMIT_MS) {
      const t = b.t;
      const wasPaused = !!b.pause;
      const out = stepBattle(b);
      if (wasPaused) {
        held++;
        assert.equal(b.t, t, `${id}: time stands still`);
        assert.deepEqual(out, [], `${id}: nothing happens`);
      }
      for (const e of out) if (e.kind === 'phase') phases.push({ e, hpBefore: before, hp: boss.hp / boss.maxHp, t: b.t });
      before = boss.hp / boss.maxHp;
    }
    assert.equal(phases.length, 1, `${id} changes form once`);
    assert.equal(phases[0].e.by, boss.id, id);
    assert.equal(phases[0].e.phase, 2, id);
    assert.equal(phases[0].e.line, PHASE2[id].line, id);
    assert.ok(phases[0].hpBefore > PHASE_AT, `${id}: it was above half before the blow`);
    assert.equal(held, PHASE_PAUSE_MS / TICK_MS, `${id}: held for the pause`);
    assert.ok(boss.phase!.done, id);
  }
});

test('a boss that never reaches half health never changes, and one without the flag never does', () => {
  const { b, boss } = bossFight('orcWarlord', 0.5);
  boss.hp = boss.maxHp; // (stays whole while the heroes are away from it)
  const plain = readyBattle(4, ['orcWarlord', 'orcGrunt'], { boss: { size: 1.5, hp: 1, atk: 1 } });
  assert.equal(plain.units.find((u) => u.def === 'orcWarlord')!.phase, undefined);
  fight(plain);
  for (const h of plain.units) if (h.side === 'hero') h.power = 4;
  const seen: string[] = [];
  while (plain.phase === 'fight') for (const e of stepBattle(plain)) seen.push(e.kind);
  assert.ok(!seen.includes('phase'));
  assert.equal(b.pause, undefined);
});

test('the second form is the data: surge, shield, adds, new skill, and a leap', () => {
  const surge = (id: string) => {
    const { b, boss } = bossFight(id);
    const power = boss.power ?? 1;
    const foes = b.units.filter((u) => u.side === 'foe').length;
    boss.hp = Math.floor(boss.maxHp * 0.4);
    const out: BattleEvent[] = [];
    // (one tick finds it below half)
    out.push(...stepBattle(b));
    assert.ok(out.some((e) => e.kind === 'phase'), id);
    return { b, boss, power, foes };
  };
  const k = PHASE2.lichKing;
  const lich = surge('lichKing');
  assert.ok(Math.abs(lich.boss.power! / lich.power - k.atk) < 1e-9, 'the stat surge');
  assert.ok(lich.boss.shield!.hp > 0, 'the shield');
  assert.equal(lich.boss.charge2, 100, 'the ultimate is primed');
  const orc = surge('orcWarlord');
  assert.equal(orc.b.units.filter((u) => u.side === 'foe').length, orc.foes + 2, 'adds');
  assert.ok(orc.boss.hasteUntil! > orc.b.t, 'hasted');
  const boar = surge('boarKing');
  assert.equal(boar.boss.kit!.skill.name, 'Gore Charge', 'its skill is changed');
  const min = surge('minotaurChampion');
  assert.ok(min.b.units.some((u) => u.side === 'hero' && u.alive && Math.abs(min.boss.u - u.u) + Math.abs(min.boss.v - u.v) === 1), 'it leaps in beside a hero');
});

test('a final army wave carries the phase, a mid-boss wave does not, and a calamity boss follows the ascension threshold', () => {
  for (const a of ARMIES) {
    const last = a.waves.length;
    assert.equal(waveBoost(a, last).boss?.phase, PHASE_AT, a.id);
    a.waves.forEach((w, i) => {
      if (w.boss === 'mid') assert.equal(waveBoost(a, i + 1).boss?.phase, undefined, `${a.id} wave ${i + 1}`);
    });
  }
  assert.equal(calBossBoost(3).phase, 0.5);
  assert.equal(calBossBoost(3, 0.65).phase, 0.65);
});

test('the same fight plays out the same way', () => {
  const run = (): string => {
    const { b } = bossFight('demonLord');
    const kinds: string[] = [];
    while (b.phase === 'fight') for (const e of stepBattle(b)) kinds.push(e.kind === 'hit' ? `hit${e.dmg}` : e.kind);
    return `${b.t}:${kinds.join(',')}`;
  };
  assert.equal(run(), run());
});
