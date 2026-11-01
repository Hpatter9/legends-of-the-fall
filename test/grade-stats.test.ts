// The skills overhaul's batch 3 (docs/notes/skills-overhaul-design.md section 4, docs/notes/skills-1.md): the owner's rule that a rank needs no
// upgraded skill. A merged hero (grade 2, 3 or 4) is a bigger body and nothing else: more health and attack (`GRADE_BOOST`), the same skills,
// costs, cooldowns and talents as at grade 1. This replaces `tier-skills.test.ts` (the tier skills, their riders and echoes, and the tier 3
// discount went with this batch).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, fight, place, startBattle, stepBattle, type BattleEvent } from '../src/sim/battle';
import { CHARGE_MAX } from '../src/sim/abilities';
import { HERO_KITS, costOf, heroKitOf } from '../src/sim/heroKits';
import { GRADE_BOOST, gradeBoost, gradeMult } from '../src/sim/run';
import { ALL_HEROES } from '../src/sim/units';
import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';

test('a grade changes health and attack only: by its step, with the same kit, costs and talents', () => {
  for (const kind of ALL_HEROES) {
    const b = startBattle(7, 'skeletons');
    const plain = addUnit(b, kind, 1, 9, gradeBoost(1, 0, 10));
    for (let g = 2; g <= GRADE_BOOST.length; g++) {
      const big = addUnit(b, kind, 2 + g, 9, gradeBoost(g, 0, 10));
      assert.equal(big.grade, g);
      assert.ok(Math.abs(big.maxHp / plain.maxHp - gradeMult(g)) < 0.02, `${kind} grade ${g} health`);
      assert.ok(Math.abs((big.power ?? 1) / (plain.power ?? 1) - gradeMult(g)) < 0.02, `${kind} grade ${g} attack`);
      assert.equal(heroKitOf(big), heroKitOf(plain), `${kind} grade ${g} keeps its kit`);
      for (const s of HERO_KITS()[kind].slots) assert.equal(costOf(big, s), costOf(plain, s), `${kind} grade ${g} pays as grade 1`);
      assert.deepEqual(big.eq?.tal ?? {}, plain.eq?.tal ?? {}, `${kind} grade ${g} gains no talent`);
    }
  }
});

test('a merged party casts the skills a plain one does: no tier echoes, rings or riders', () => {
  for (const grade of [1, 4]) {
    const b = startBattle(11, 'skeletons');
    const spots: [number, number][] = [];
    for (let v = b.board.d - DEPLOY_ROWS; v < b.board.d; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
    const team = ['samurai', 'knight', 'archer', 'beastmaster', 'cleric'];
    team.forEach((id, i) => place(b, id, spots[i * 2][0], spots[i * 2][1], undefined, gradeBoost(grade, 0, 10)));
    fight(b);
    for (const u of b.units) if (u.side === 'hero') u.charge = CHARGE_MAX;
    const names = new Set<string>();
    const out: BattleEvent[] = [];
    for (let i = 0; i < 300 && b.phase === 'fight'; i++) out.push(...stepBattle(b));
    for (const e of out) {
      assert.ok(!(e.kind === 'burst' && e.tone === 'tier'), 'no tier ring');
      if (e.kind === 'skill') names.add(e.name);
    }
    assert.ok(!b.pending.some((p) => p.kind === 'echo'), 'no echo is scheduled');
    const own = new Set(team.flatMap((k) => [...HERO_KITS()[k].slots.map((s) => s.skill.key ?? s.skill.name)]));
    for (const n of names) if (!own.has(n)) assert.ok(!/echo/i.test(n), n);
  }
});
