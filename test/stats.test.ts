import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import {
  ABILITIES, blowResult, bodyOf, d20At, derivedOf, foeFamilyOf, foeStatsOf, HERO_ARRAY, initiativeRoll, modOf, orderOf, proficiencyOf, scaledBody,
  SCORE_CAP, SCORE_TOTAL, scoresAtLevel, scoresOf, STAT_PROFILES, type Scores,
} from '../src/sim/stats';

// STATS batch 1 (docs/notes/stats-1.md; the design is docs/notes/rpg-stats-design.md): the six ability scores as data. Nothing here touches a
// fight (the identity fixtures, `spells-identity.test.ts`, do not move); these hold the profiles and the pure rules to the design.

const row = (s: Scores) => ABILITIES.map((a) => s[a]).join(' ');
const p = (kind: string) => STAT_PROFILES[kind];

test('every hero has a profile, and only heroes do', () => {
  assert.equal(ALL_HEROES.length, 45);
  assert.deepEqual(Object.keys(STAT_PROFILES).sort(), [...ALL_HEROES].sort());
});

test("every hero's scores are 17, 15, 13, 12, 10 and 8, adding up to 75, with two trained saves and a real weakness", () => {
  for (const kind of ALL_HEROES) {
    const pr = p(kind);
    const six = ABILITIES.map((a) => pr.base[a]);
    assert.deepEqual([...six].sort((a, b) => b - a), [...HERO_ARRAY], kind);
    assert.equal(six.reduce((n, v) => n + v, 0), SCORE_TOTAL, kind);
    assert.equal(new Set(pr.saves).size, 2, `${kind} is trained in two different saves`);
    const order = orderOf(pr);
    assert.equal(pr.base[order[0]], 17, `${kind}'s primary`);
    assert.equal(pr.base[order[5]], 8, `${kind}'s weakness`);
  }
});

test('the modifier is (score − 10) ÷ 2 rounded down, and proficiency steps with level', () => {
  const mods: [number, number][] = [[6, -2], [7, -2], [8, -1], [9, -1], [10, 0], [11, 0], [12, 1], [17, 3], [18, 4], [20, 5], [24, 7], [30, 10]];
  for (const [s, m] of mods) assert.equal(modOf(s), m, `score ${s}`);
  const prof: [number, number][] = [[1, 2], [9, 2], [10, 3], [19, 3], [20, 4], [29, 4], [30, 5], [49, 5], [50, 6], [79, 6], [80, 7], [100, 7]];
  for (const [l, b] of prof) assert.equal(proficiencyOf(l), b, `level ${l}`);
});

test("the Knight grows as the design's worked table says", () => {
  const knight: [number, string, number][] = [
    [1, '15 8 17 10 13 12', 4], [4, '15 8 19 10 13 12', 4], [8, '16 8 20 10 13 12', 5], [12, '18 8 20 10 13 12', 7], [16, '18 8 20 10 15 12', 7],
    [20, '18 8 20 10 16 13', 8], [30, '18 8 21 10 16 13', 9], [60, '18 8 24 10 16 13', 10], [100, '20 8 24 10 18 13', 12],
  ];
  for (const [level, scores, toHit] of knight) {
    assert.equal(row(scoresAtLevel(p('knight'), level)), scores, `level ${level}`);
    assert.equal(derivedOf(p('knight'), { level }).toHit, toHit, `to hit at level ${level}`);
  }
});

test('growth by level: +10 points by level 20 and +8 more by 100, in the calling\'s order; the two lowest never grow', () => {
  for (const kind of ALL_HEROES) {
    const pr = p(kind);
    const order = orderOf(pr);
    const sum = (s: Scores) => ABILITIES.reduce((n, a) => n + s[a], 0);
    let last = scoresAtLevel(pr, 1);
    for (let level = 2; level <= 100; level++) {
      const now = scoresAtLevel(pr, level);
      for (const a of ABILITIES) assert.ok(now[a] >= last[a], `${kind} never loses a score (level ${level})`);
      const gained = sum(now) - sum(last);
      const want = [4, 8, 12, 16, 20].includes(level) ? 2 : level >= 30 && level % 10 === 0 ? 1 : 0;
      assert.equal(gained, want, `${kind} at level ${level}`);
      last = now;
    }
    const at20 = scoresAtLevel(pr, 20);
    const at100 = scoresAtLevel(pr, 100);
    assert.equal(sum(at20), SCORE_TOTAL + 10, kind);
    assert.equal(sum(at100), SCORE_TOTAL + 18, kind);
    assert.deepEqual([at20[order[0]], at20[order[1]], at20[order[2]]], [20, 18, 16], `${kind} at 20`);
    assert.deepEqual([at100[order[0]], at100[order[1]], at100[order[2]]], [24, 20, 18], `${kind} at 100`);
    for (const a of order.slice(4)) assert.equal(at100[a], pr.base[a], `${kind}'s ${a} never grows from levels`);
  }
});

test("the design's table of scores at levels 20 and 100 holds for some heroes of every shape", () => {
  const want: [string, string, string][] = [
    ['samurai', '18 20 16 10 13 8', '20 24 18 10 13 8'],
    ['yamabushi', '16 13 18 10 20 8', '18 13 20 10 24 8'],
    ['beastmaster', '10 16 13 8 18 20', '10 18 13 8 20 24'],
    ['sage', '8 10 13 20 18 16', '8 10 13 24 20 18'],
    ['tyrant', '16 8 18 13 10 20', '18 8 20 13 10 24'],
  ];
  for (const [kind, at20, at100] of want) {
    assert.equal(row(scoresAtLevel(p(kind), 20)), at20, `${kind} at 20`);
    assert.equal(row(scoresAtLevel(p(kind), 100)), at100, `${kind} at 100`);
  }
});

test("ranks and grades give +1 to the two best scores a step; awakening +2 to the primary; nothing passes 30", () => {
  const k = p('knight');
  assert.equal(row(scoresOf(k, { rank: 1 })), '15 8 17 10 13 12');
  assert.equal(row(scoresOf(k, { rank: 0 })), '15 8 17 10 13 12', 'rank 0 (just joined) is the base');
  assert.equal(row(scoresOf(k, { rank: 4 })), '18 8 20 10 13 12', 'a rank 4 Knight: CON +3, STR +3');
  assert.equal(row(scoresOf(k, { rank: 6 })), '18 8 24 10 13 12', 'two awakening steps: CON +4 more');
  assert.equal(row(scoresOf(k, { grade: 3 })), '17 8 19 10 13 12', 'grade 3: CON +2, STR +2');
  assert.equal(row(scoresOf(k, { level: 100, rank: 6, grade: 4 })), '26 8 30 10 18 13', 'everything at once stops at 30');
  for (const kind of ALL_HEROES) {
    const s = scoresOf(p(kind), { level: 100, rank: 6, grade: 4, extra: { str: 9, dex: 9, con: 9, int: 9, wis: 9, cha: 9 } });
    for (const a of ABILITIES) assert.ok(s[a] <= SCORE_CAP, `${kind}'s ${a}`);
  }
});

test("the derived numbers at level 1 match the design's table", () => {
  // kind: AC, to hit, skill DC, crit %
  const want: Record<string, [number, number, number, number]> = {
    knight: [16, 4, 12, 5], samurai: [15, 5, 13, 8], kunoichi: [14, 5, 13, 8], wizard: [12, 5, 13, 7], ninjaMonk: [15, 5, 12, 8],
    lightningMage: [11, 5, 13, 6], yamabushi: [14, 3, 13, 6], werewolf: [13, 5, 13, 6], minotaur: [16, 5, 13, 5], beastmaster: [12, 2, 13, 6],
    kraken: [13, 4, 11, 5], sage: [10, 5, 13, 5], dreadPirate: [14, 4, 11, 6], juggernaut: [16, 4, 12, 5], peasant: [14, 4, 12, 6],
  };
  for (const [kind, [ac, toHit, dc, crit]] of Object.entries(want)) {
    const d = derivedOf(p(kind));
    assert.deepEqual([d.ac, d.toHit, d.dc, Math.round(d.crit * 100)], [ac, toHit, dc, crit], kind);
  }
  // at level 100 (to hit / DC)
  const at100: Record<string, [number, number]> = { knight: [12, 20], samurai: [14, 22], yamabushi: [11, 22], beastmaster: [7, 22], kraken: [12, 19] };
  for (const [kind, [toHit, dc]] of Object.entries(at100)) {
    const d = derivedOf(p(kind), { level: 100 });
    assert.deepEqual([d.toHit, d.dc], [toHit, dc], kind);
  }
  // the Knight's saves at level 1: STR and CON trained
  assert.equal(row(derivedOf(p('knight')).saves), '4 -1 5 0 1 1');
  const d = derivedOf(p('knight'));
  assert.equal(d.initiative, -1);
  assert.equal(d.stamTop, 69);
  assert.equal(d.cooldown, 1);
});

test("each hero's derived level-1 health, attack and blow time are today's numbers exactly", () => {
  for (const kind of ALL_HEROES) {
    const def = UNITS[kind];
    const pr = p(kind);
    const at1 = scaledBody(def, pr, { level: 1, rank: 1, grade: 1 });
    assert.deepEqual([at1.hp, at1.atk, at1.atkMs], [def.hp, def.atk, def.atkMs], kind);
    // and the fitted body, put back with the level-1 scores, gives them too
    const body = bodyOf(def, pr);
    const d = derivedOf(pr);
    assert.ok(Math.abs(body.hp * d.hpMult - def.hp) < 1e-9 && Math.abs(body.atk * d.atkMult - def.atk) < 1e-9 && Math.abs(body.atkMs / d.blowSpeed - def.atkMs) < 1e-9, kind);
  }
  // later, a point of modifier shows: a level-8 Barbarian (STR 20, +5 from +3) hits 10% harder (by 1.25 / 1.15)
  const barb = scaledBody(UNITS.barbarian, p('barbarian'), { level: 8 });
  assert.ok(Math.abs(barb.atk / UNITS.barbarian.atk - 1.25 / 1.15) < 1e-12);
});

test("the d20 against AC gives the design's odds (over every roll)", () => {
  // needs (AC − to hit): [hit and crit, glance, miss] in twentieths
  const want: [number, number[]][] = [[6, [15, 4, 1]], [8, [13, 5, 2]], [10, [11, 5, 4]], [12, [9, 5, 6]], [14, [7, 5, 8]]];
  for (const [needs, odds] of want) {
    const n = { hit: 0, glance: 0, miss: 0 };
    for (let roll = 1; roll <= 20; roll++) {
      const r = blowResult(roll, 5, 5 + needs);
      n[r === 'crit' ? 'hit' : r]++;
    }
    assert.deepEqual([n.hit, n.glance, n.miss], odds, `needs ${needs}`);
  }
  assert.equal(blowResult(20, -10, 40), 'crit', 'a natural 20 always hits');
  assert.equal(blowResult(1, 40, 10), 'miss', 'a natural 1 always misses');
});

test('the scores are pure: the same inputs give the same numbers, and the d20s are hashes, fair and seeded', () => {
  for (const kind of ALL_HEROES) assert.deepEqual(derivedOf(p(kind), { level: 37, rank: 3, grade: 2 }), derivedOf(p(kind), { level: 37, rank: 3, grade: 2 }));
  assert.equal(d20At(1234, 5, 6, 7), d20At(1234, 5, 6, 7));
  assert.equal(initiativeRoll(99, 3, 2), initiativeRoll(99, 3, 2));
  const counts = new Array(21).fill(0);
  for (let i = 0; i < 20000; i++) counts[d20At(42, i)]++;
  assert.equal(counts[0], 0);
  for (let f = 1; f <= 20; f++) assert.ok(counts[f] > 850 && counts[f] < 1150, `face ${f} came up ${counts[f]} times in 20,000`);
  const seeds = new Set(Array.from({ length: 50 }, (_, s) => d20At(s, 1)));
  assert.ok(seeds.size > 10, 'different seeds roll differently');
});

test('every foe has a family block; bosses are stronger and trained in every save', () => {
  const foes = Object.values(UNITS).filter((d) => d.side === 'foe');
  assert.ok(foes.length > 50);
  const families = new Set(foes.map((d) => foeFamilyOf(d)));
  assert.ok(families.size >= 5, `the foes span the families (${[...families].join(', ')})`);
  assert.equal(foeFamilyOf(UNITS.skeleton), 'armoured');
  assert.equal(foeFamilyOf(UNITS.boneArcher), 'shooter');
  for (const d of foes) {
    const f = foeStatsOf(d, 0);
    assert.ok(f.ac >= 12 && f.ac <= 17, d.id);
    assert.ok(f.proficiency === 2 || (f.boss && f.proficiency === 4), d.id);
    if (f.boss) for (const a of ABILITIES) assert.equal(f.saves[a], f.mods[a] + f.proficiency, `${d.id} is trained in ${a}`);
  }
  assert.equal(foeStatsOf(UNITS.skeleton, 4).proficiency, 6, 'Mythic foes are +6');
  const boss = foes.find((d) => foeStatsOf(d).boss);
  assert.ok(boss, 'some foe is a boss');
});
