// DEPTH-BUILD (docs/notes/depth-build.md): every boss with signature attacks has one weakness, a rule of the fight that is always there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, stepBattle, TIME_LIMIT_MS, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { SIGNATURES } from '../src/sim/bossAttacks';
import { TRIALS } from '../src/sim/eidolonTrials';
import { WEAK, WEAKNESS, cluesOf, sapShare, spared, weakHurt, callingOf } from '../src/sim/weakness';
import { readyBattle } from './helpers';

type Sig = Extract<BattleEvent, { kind: 'bossSig' }>;

function bossFight(id: string, seed = 3): { b: Battle; boss: Unit } {
  const b = readyBattle(seed, [id, 'orcGrunt'], { boss: { size: 1.5, hp: 1.2, atk: 0.3 } });
  fight(b);
  return { b, boss: b.units.find((u) => u.def === id)! };
}
function untilWarn(b: Battle): Sig | undefined {
  while (b.phase === 'fight' && b.t < TIME_LIMIT_MS) {
    const w = stepBattle(b).find((e): e is Sig => e.kind === 'bossSig' && e.phase === 'warn');
    if (w) return w;
  }
  return undefined;
}

test('every boss with signature attacks has exactly one weakness, with three clues, the last the full rule', () => {
  const trials = new Set(TRIALS.map((t) => t.boss.id));
  const bosses = Object.keys(SIGNATURES).filter((id) => !trials.has(id));
  assert.equal(bosses.length, 25);
  for (const id of bosses) {
    assert.ok(WEAKNESS[id], `${id} has a weakness`);
    const c = cluesOf(id);
    assert.equal(new Set(c).size, 3, id);
    for (const line of c) assert.ok(line.length > 10 && !/undefined/.test(line), `${id}: ${line}`);
  }
  assert.deepEqual(Object.keys(WEAKNESS).sort(), bosses.sort());
});

test('a stun laid on the Orc Warlord while his great attack is marked breaks it, and he is dazed', () => {
  const { b, boss } = bossFight('orcWarlord');
  const w = untilWarn(b);
  assert.ok(w, 'a windup begins');
  boss.stunUntil = b.t + 300;
  const out = stepBattle(b);
  assert.ok(out.some((e) => e.kind === 'bossSig' && e.n === w!.n && e.phase === 'fizzle'), 'the attack is lost');
  assert.ok(out.some((e) => e.kind === 'weakness' && e.by === boss.id));
  assert.equal(b.exploited?.orcWarlord, 1);
  assert.ok(boss.stunUntil! >= b.t + 1800, 'dazed about 2 s');
  assert.ok(!b.warnings?.some((x) => x.n === w!.n));
});

test('without a stun the Warlord\'s attack lands as before and nothing is noted', () => {
  const { b } = bossFight('orcWarlord');
  const w = untilWarn(b)!;
  let landed = false;
  while (b.phase === 'fight' && !landed) landed = stepBattle(b).some((e) => e.kind === 'bossSig' && e.n === w.n && e.phase === 'land');
  assert.ok(landed);
  assert.equal(b.exploited?.orcWarlord, undefined);
});

test('devout blows crack the Lich King\'s guard after three, and only then does he take more harm', () => {
  const { b, boss } = bossFight('lichKing');
  const hero = b.units.find((u) => u.side === 'hero')!;
  const cleric = { ...hero, def: 'cleric' };
  const knight = { ...hero, def: 'knight' };
  assert.equal(callingOf('cleric'), 'devout');
  const out: BattleEvent[] = [];
  assert.equal(weakHurt(b, knight, boss, 100, false, out), 100, 'a martial blow does not count');
  assert.equal(weakHurt(b, cleric, boss, 100, false, out), 100);
  assert.equal(weakHurt(b, cleric, boss, 100, true, out), 100, 'a damage over time does not count');
  assert.equal(weakHurt(b, cleric, boss, 100, false, out), 100);
  assert.equal(out.length, 0);
  assert.equal(weakHurt(b, cleric, boss, 100, false, out), 125, 'the third devout blow cracks it');
  assert.equal(out.filter((e) => e.kind === 'weakness').length, 1);
  assert.equal(weakHurt(b, knight, boss, 100, false, out), 125, 'every blow after lands harder');
  assert.equal(out.length, 1, 'noted once');
});

test('heroes behind the Gorgon Queen, or in water beside the Demon Lord, are spared his great attacks', () => {
  const { b, boss } = bossFight('gorgonQueen');
  boss.facing = 0;
  const hero = b.units.find((u) => u.side === 'hero')!;
  const out: BattleEvent[] = [];
  assert.equal(spared(b, boss, { ...hero, u: boss.u - 1, v: boss.v }, out), true, 'behind');
  assert.equal(spared(b, boss, { ...hero, u: boss.u + 1, v: boss.v }, out), false, 'in front');
  assert.equal(spared(b, boss, { ...hero, u: boss.u, v: boss.v + 1 }, out), false, 'beside is not behind');
  assert.equal(b.exploited?.gorgonQueen, 1);
  const d = bossFight('demonLord');
  const h = d.b.units.find((u) => u.side === 'hero')!;
  const tile = d.b.board.tiles[h.v * d.b.board.w + h.u];
  const was = tile.ground;
  assert.equal(spared(d.b, d.boss, h, out), was === 'water' || was === 'deep');
  tile.ground = 'water';
  assert.equal(spared(d.b, d.boss, h, out), true, 'in water');
  // (a boss with another weakness spares nobody)
  const o = bossFight('orcWarlord');
  assert.equal(spared(o.b, o.boss, { ...h, u: o.boss.u - 1, v: o.boss.v }, out), false);
});

test('a burning Thorn Warden\'s great attacks land at half', () => {
  const { b, boss } = bossFight('forestBoss1');
  const out: BattleEvent[] = [];
  assert.equal(sapShare(b, boss, out), 1);
  boss.ail = [{ kind: 'burn', until: b.t + 1000, by: boss.id } as never];
  assert.equal(sapShare(b, boss, out), 0.5);
  assert.equal(b.exploited?.forestBoss1, 1);
});

test('the weaknesses keep a fight deterministic, and the switch turns them off', () => {
  const run = () => {
    const { b } = bossFight('lichKing', 11);
    let n = 0;
    while (b.phase === 'fight' && b.t < TIME_LIMIT_MS) n += stepBattle(b).length;
    return `${b.phase}|${b.t}|${n}|${JSON.stringify(b.exploited ?? {})}|${b.units.map((u) => u.hp).join(',')}`;
  };
  assert.equal(run(), run());
  WEAK.on = false;
  try {
    const { b, boss } = bossFight('lichKing');
    assert.equal(weakHurt(b, { ...b.units[0], def: 'cleric' }, boss, 100, false, []), 100);
  } finally {
    WEAK.on = true;
  }
});

import { noteWeakness, readWeak, knownClues, marksShare, MARK_CROWNS, ESCORT_CLUE, weakLines } from '../src/sim/weakness';
import { loadMeta, newMeta } from '../src/sim/meta';

const fightOf = (units: { def: string; side: 'hero' | 'foe'; alive: boolean }[], exploited?: Record<string, number>) => ({ units: units as never, exploited });
const lich = (alive: boolean) => ({ def: 'lichKing', side: 'foe' as const, alive });
const grunt = (alive: boolean) => ({ def: 'skeleton', side: 'foe' as const, alive });

test('meeting a boss writes its first clue; each loss to it one more, up to three', () => {
  const m = { crowns: 0 } as { crowns: number; weak?: Record<string, { clues: number; marks: number[]; escorts?: number }> };
  let n = noteWeakness(m, fightOf([lich(false)]), true, 0);
  assert.equal(m.weak!.lichKing.clues, 1, 'met');
  assert.deepEqual(n.clues, [{ boss: 'lichKing', clues: 1 }]);
  n = noteWeakness(m, fightOf([lich(false)]), true, 0);
  assert.equal(n.clues.length, 0, 'a win teaches nothing new');
  noteWeakness(m, fightOf([lich(true)]), false, 0);
  assert.equal(m.weak!.lichKing.clues, 2, 'a loss to him');
  noteWeakness(m, fightOf([lich(true)]), false, 0);
  noteWeakness(m, fightOf([lich(true)]), false, 0);
  assert.equal(m.weak!.lichKing.clues, 3, 'never more than three');
  // (a loss where the boss fell is not a loss to it)
  const m2 = { crowns: 0 } as typeof m;
  noteWeakness(m2, fightOf([lich(false)]), false, 0);
  assert.equal(m2.weak!.lichKing.clues, 1);
});

test('felling its escorts writes the second clue', () => {
  const m = { crowns: 0 } as { crowns: number; weak?: Record<string, { clues: number; marks: number[]; escorts?: number }> };
  for (let i = 0; i < ESCORT_CLUE / 5; i++) noteWeakness(m, fightOf([lich(false), ...Array.from({ length: 5 }, () => grunt(false)), grunt(true)]), true, 0);
  assert.equal(m.weak!.lichKing.escorts, ESCORT_CLUE);
  assert.equal(m.weak!.lichKing.clues, 2);
});

test('a Hunter\'s mark only for a win with the weakness used, once per tier, paying its crowns', () => {
  const m = { crowns: 0 } as { crowns: number; weak?: Record<string, { clues: number; marks: number[]; escorts?: number }> };
  noteWeakness(m, fightOf([lich(false)]), true, 1);
  assert.deepEqual(m.weak!.lichKing.marks, [], 'not used');
  noteWeakness(m, fightOf([lich(true)], { lichKing: 2 }), false, 1);
  assert.deepEqual(m.weak!.lichKing.marks, [], 'not won');
  const n = noteWeakness(m, fightOf([lich(false)], { lichKing: 1 }), true, 1);
  assert.deepEqual(m.weak!.lichKing.marks, [1]);
  assert.equal(m.crowns, MARK_CROWNS[1]);
  assert.match(weakLines(n)[0], /Hunter's mark · Lich King · Hard/);
  noteWeakness(m, fightOf([lich(false)], { lichKing: 1 }), true, 1);
  assert.equal(m.crowns, MARK_CROWNS[1], 'once per tier');
  for (const t of [0, 2, 3]) noteWeakness(m, fightOf([lich(false)], { lichKing: 1 }), true, t);
  const last = noteWeakness(m, fightOf([lich(false)], { lichKing: 1 }), true, 4);
  assert.equal(last.marks[0].trophy, true, 'all five marks give its trophy');
  assert.deepEqual(marksShare(m.weak), { got: 5, of: 125 });
});

test('the codex shows the clues found, and the Archive writes them in full', () => {
  assert.deepEqual(knownClues('lichKing', undefined).lines, [null, null, null]);
  const one = knownClues('lichKing', { clues: 1, marks: [] });
  assert.ok(one.lines[0] && !one.lines[1] && !one.full);
  const arch = knownClues('lichKing', { clues: 1, marks: [] }, true);
  assert.ok(arch.full && arch.lines[2]);
  assert.equal(knownClues('lichKing', { clues: 0, marks: [] }, true).full, false, 'the Archive needs a clue found');
});

test('the weakness record survives a save, and a save from before has none', () => {
  const m0 = newMeta(1);
  assert.equal(loadMeta(1, { getItem: () => JSON.stringify(m0) }).weak, undefined);
  const raw = { lichKing: { clues: 9, marks: [1, 1, 7, 0], escorts: 12 }, nobody: { clues: 1, marks: [] } };
  assert.deepEqual(readWeak(raw), { lichKing: { clues: 3, marks: [0, 1], escorts: 12 } });
  const back = loadMeta(1, { getItem: () => JSON.stringify({ ...m0, weak: raw }) });
  assert.deepEqual(back.weak, { lichKing: { clues: 3, marks: [0, 1], escorts: 12 } });
});
