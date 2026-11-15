// HERO-RISE (docs/notes/hero-rise.md, `src/riseRules.ts`): the plate over a hero who rose says what went up and what was earned, read from
// the hero before and after (a merge's stars, a rank, a level that opens a skill, a skill's level by use, a talent), and reading never
// changes the save or the battle. Several plates at once are laid so none covers another.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, startBattle } from '../src/sim/battle';
import { RANK_SHARDS, startedMeta, type Meta } from '../src/sim/meta';
import { rankUp } from '../src/sim/rankUp';
import { boostOf } from '../src/sim/run';
import { HERO_KITS, SKILL2_LEVEL } from '../src/sim/heroKits';
import { xpFor } from '../src/sim/levels';
import { PERKS_SHOWN, layPlates, plateLines, riseOf, shotOfHero, shotOfUnit, type RiseShot } from '../src/riseRules';

const make = () => startBattle(1, []);
const meta = (): Meta => {
  const m = startedMeta(7);
  m.ranked = {};
  return m;
};
const shot = (over: Partial<RiseShot> = {}): RiseShot => ({ level: 10, grade: 1, rank: 0, hp: 1000, atk: 100, def: 5, pool: 60, crit: 0, dodge: 0, skills: [], perks: [], ...over });

test('a plate lists the numbers that went up and what was earned, and nothing when nothing rose', () => {
  const a = shot({ skills: [{ key: 'bash', name: 'Shield Bash', label: 'Skill 1', lv: 2 }] });
  const b = shot({
    level: 11,
    hp: 1012,
    atk: 103,
    def: 5,
    skills: [
      { key: 'bash', name: 'Shield Bash', label: 'Skill 1', lv: 3 },
      { key: 'rush', name: 'Shield Rush', label: 'Skill 2', lv: 1 },
    ],
    perks: ['Iron Resolve'],
  });
  const r = riseOf(a, b);
  assert.deepEqual(r.map((l) => l.text), ['Level 11', '+12 HP', '+3 ATK', 'Shield Bash Lv 3', 'New: Shield Rush', 'New: Iron Resolve']);
  assert.deepEqual(r.find((l) => l.kind === 'new')!.skill, { name: 'Shield Rush', key: 'rush' }, 'an earned skill carries what its icon is read by');
  const p = plateLines(r);
  assert.equal(p.stats, '+12 HP, +3 ATK');
  assert.deepEqual(p.head, ['Level 11']);
  assert.equal(p.earned.length, 3);
  assert.deepEqual(riseOf(a, a), [], 'nothing rose: no plate');
  assert.deepEqual(riseOf(b, a).filter((l) => l.kind === 'stat'), [], 'a number that fell is not a rise');
});

test('a merge\'s new stars show as stars with the health and attack they give', () => {
  const b = make();
  const one = shotOfUnit(addUnit(b, 'knight', 0, 0, boostOf({ id: 1, kind: 'knight', grade: 1 }, 0, 12)));
  const two = shotOfUnit(addUnit(b, 'knight', 1, 0, boostOf({ id: 1, kind: 'knight', grade: 2 }, 0, 12)));
  const r = riseOf(one, two);
  assert.equal(r[0].text, '★★');
  assert.ok(r.some((l) => /^\+\d+ HP$/.test(l.text)) && r.some((l) => /^\+\d+ ATK$/.test(l.text)), JSON.stringify(r));
});

test('the level that opens a skill earns it: "New: <its name>"', () => {
  const b = make();
  const lo = shotOfUnit(addUnit(b, 'knight', 0, 0, { level: SKILL2_LEVEL - 1 }));
  const hi = shotOfUnit(addUnit(b, 'knight', 1, 0, { level: SKILL2_LEVEL }));
  const r = riseOf(lo, hi);
  assert.ok(r.some((l) => l.text === `New: ${HERO_KITS().knight.s2.skill.name}`), JSON.stringify(r));
  assert.equal(r[0].text, `Level ${SKILL2_LEVEL}`);
});

test('a hero of the save read before and after a rank: the save and the scratch battle are left as they were', () => {
  const m = meta();
  m.xp.knight = xpFor(12);
  m.shards.knight = RANK_SHARDS[0];
  const before = JSON.stringify(m);
  const was = shotOfHero(m, 'knight', make);
  assert.equal(JSON.stringify(m), before, 'reading wrote nothing to the save');
  assert.equal(rankUp(m, 'knight'), 1);
  const now = shotOfHero(m, 'knight', make);
  const r = riseOf(was, now);
  assert.ok(r.some((l) => l.text === 'Rank 1'), JSON.stringify(r));
  assert.ok(r.some((l) => /HP$/.test(l.text)) && r.some((l) => /ATK$/.test(l.text)), 'a rank gives health and attack');
  assert.ok(!r.some((l) => l.kind === 'new'), 'a rank gives no skill (the skills overhaul: never a better skill)');
});

test('plates for heroes rising together are laid so none covers another, and inside the screen', () => {
  const boxes = [
    { x: 100, y: 300, w: 140, h: 44 },
    { x: 120, y: 305, w: 140, h: 44 },
    { x: 110, y: 298, w: 150, h: 60 },
    { x: 380, y: 300, w: 140, h: 44 },
    { x: 5, y: 500, w: 140, h: 44 },
  ];
  const check = (bxs: typeof boxes, spots: ReturnType<typeof layPlates>) => {
    const rects = spots.map((s, i) => ({ ...s, w: bxs[i].w, h: bxs[i].h }));
    for (const [i, a] of rects.entries()) {
      assert.ok(a.left >= 4 && a.left + a.w <= 393 - 4 && a.top >= 4, `plate ${i} inside the screen`);
      for (const b of rects.slice(i + 1))
        if (a.round === b.round) assert.ok(a.left >= b.left + b.w || b.left >= a.left + a.w || a.top >= b.top + b.h || b.top >= a.top + a.h, `plates ${i} and another of its round overlap`);
    }
  };
  const spots = layPlates(boxes, 393);
  check(boxes, spots);
  assert.equal(spots[0].top, 300 - 44 - 4, 'the first sits just above its hero');
  assert.ok(spots.every((s) => s.round === 0), 'room for all at once');
  // (heroes near the top of the screen: the plates that cannot be lifted stack downward under the others instead)
  const high = Array.from({ length: 3 }, (_, i) => ({ x: 200, y: 40 + i * 6, w: 220, h: 50 }));
  const up = layPlates(high, 393, 4, 4, 852);
  check(high, up);
  assert.ok(up.every((s) => s.round === 0), 'all at once, stacked down from the top');
  // (eight heroes in a short list: no room up or down for them all, so the rest wait for the next round, each inside the screen)
  const crowd = Array.from({ length: 8 }, (_, i) => ({ x: 200, y: 120 + i * 20, w: 220, h: 50 }));
  const laid = layPlates(crowd, 393, 4, 4, 300);
  check(crowd, laid);
  assert.ok(laid.every((s, i) => s.top + crowd[i].h <= 300), 'never below the screen');
  assert.ok(laid.some((s) => s.round > 0), 'some are queued');
  assert.equal(laid[0].round, 0);
});

test('a hero that learned many talents at once names a few and counts the rest, and a talent and its ability of one name count once', () => {
  const r = riseOf(shot(), shot({ perks: ['Tempered Steel', 'Sturdy Greaves', 'Wide Guard', 'Unbreakable', 'Unbreakable'] }));
  assert.equal(r.filter((l) => l.kind === 'perk').length, 4);
  const p = plateLines(r);
  assert.equal(p.earned.length, 1);
  assert.equal(p.earned[0].text, `New: Tempered Steel, Sturdy Greaves +${4 - PERKS_SHOWN} more`);
});

test('a skill levelled by use shows as its name and new level', () => {
  const b = make();
  const was = shotOfUnit(addUnit(b, 'knight', 0, 0, { level: 12, skillLv: [1, 2] }));
  const now = shotOfUnit(addUnit(b, 'knight', 1, 0, { level: 12, skillLv: [3, 2] }));
  const r = riseOf(was, now);
  assert.deepEqual(r.map((l) => l.text), [`${HERO_KITS().knight.s1.skill.name} Lv 3`]);
  assert.equal(r[0].kind, 'skill');
});
