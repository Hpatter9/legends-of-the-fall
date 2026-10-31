// TALENT-AUTO (`docs/notes/talent-auto.md`): the auto-spend for a hero's talent points. Every pick is one the tree's own rules allow,
// every point that can buy something does (no plan could spend more), the same meta gives the same plan, and the picks suit the
// hero's calling (a bulwark's lean to guarding, a duelist's to harm, a healer's to mending).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startedMeta, type Meta } from '../src/sim/meta';
import { xpFor } from '../src/sim/levels';
import { TREES, canLearn, costOf, learn, nodeOf, picksOf, pointsFree, pointsSpent } from '../src/sim/talents';
import { DEEP_KITS } from '../src/sim/talentsDeep';
import { autoPlan, autoPlanAll, autoSpend, autoSpendAll, leansOf, planCost, type Lean } from '../src/sim/talentAuto';

const KINDS = Object.keys(TREES);
const LEVELS = [1, 3, 6, 9, 12, 15, 21, 30, 40, 52, 60, 80, 100];

/** A meta with `kind` owned at `level`, with `bought` shard points. */
function metaAt(kind: string, level: number, bought = 0): Meta {
  const m = startedMeta(5);
  if (!m.unlocked.includes(kind)) m.unlocked.push(kind);
  m.xp[kind] = xpFor(level);
  m.shards[kind] = 9;
  m.talents = { [kind]: { picks: [], bought } };
  return m;
}
/** A hand-made start: learn up to `n` nodes, trying the tree's nodes from the `turn`th on (so the starts differ, and may take the "worse" of a pair). */
function partial(m: Meta, kind: string, n: number, turn: number): void {
  const nodes = TREES[kind].nodes;
  const order = [...nodes.slice(turn % nodes.length), ...nodes.slice(0, turn % nodes.length)];
  for (let i = 0; i < n; i++) if (!order.some((x) => learn(m, kind, x.id))) break;
}
/** The most points any legal order of learning could spend from here (every node tried, both of each pair). */
function mostSpendable(m: Meta, kind: string): number {
  const own = m.talents![kind];
  const start = pointsSpent(m, kind);
  const seen = new Set<string>();
  let best = 0;
  const walk = (): void => {
    const key = [...own.picks].sort().join(' ');
    if (seen.has(key)) return;
    seen.add(key);
    best = Math.max(best, pointsSpent(m, kind) - start);
    for (const n of TREES[kind].nodes) {
      if (!learn(m, kind, n.id)) continue;
      walk();
      own.picks.pop();
    }
  };
  walk();
  return best;
}
/** Each case: a hero, a level, shard points and a hand-made start. */
function* cases(): Generator<[string, Meta]> {
  for (const [i, kind] of KINDS.entries())
    for (const level of LEVELS)
      for (const start of [0, 2, 5]) {
        const m = metaAt(kind, level, (i + level) % 4);
        partial(m, kind, start, i + level);
        yield [kind, m];
      }
}

test('every hero has a calling the auto-spend reads', () => {
  for (const kind of KINDS) assert.ok(DEEP_KITS[kind], kind);
});

test('every pick is legal under the tree\'s own rules, and the plan changes nothing until spent', () => {
  let picks = 0;
  for (const [kind, m] of cases()) {
    const before = JSON.stringify(m);
    const plan = autoPlan(m, kind);
    assert.equal(JSON.stringify(m), before, `${kind}: planning changed the meta`);
    assert.equal(new Set(plan).size, plan.length, `${kind}: a node twice`);
    assert.ok(planCost(kind, plan) <= pointsFree(m, kind), `${kind}: more than the free points`);
    for (const id of plan) {
      assert.ok(nodeOf(kind, id), `${kind}: ${id} is not of its tree`);
      assert.ok(canLearn(m, kind, id), `${kind}: ${id} is not learnable when its turn comes`);
      assert.ok(learn(m, kind, id));
      picks++;
    }
  }
  assert.ok(picks > 1000);
});

test('it spends every point that can buy something: nothing is left to learn, and no plan spends more', () => {
  let n = 0;
  for (const [kind, m] of cases()) {
    const free = pointsFree(m, kind);
    const most = mostSpendable(m, kind);
    const took = autoSpend(m, kind);
    assert.equal(planCost(kind, took), most, `${kind}: spent ${planCost(kind, took)} of ${free}, could spend ${most}`);
    assert.equal(pointsFree(m, kind), free - most);
    assert.ok(!TREES[kind].nodes.some((x) => canLearn(m, kind, x.id)), `${kind}: a node is still learnable after the auto-spend`);
    assert.deepEqual(autoPlan(m, kind), []);
    n++;
  }
  assert.ok(n > 500);
});

test('the same meta gives the same plan, every time', () => {
  for (const [kind, m] of cases()) {
    const a = autoPlan(m, kind);
    const b = autoPlan(structuredClone(m), kind);
    assert.deepEqual(a, b);
    assert.deepEqual(autoPlan(m, kind), a);
  }
});

test('nothing to learn: no points, a hero not owned, or points that buy nothing yet', () => {
  const m = metaAt('knight', 1);
  assert.equal(pointsFree(m, 'knight'), 0);
  assert.deepEqual(autoPlan(m, 'knight'), []);
  const out = metaAt('knight', 30);
  out.unlocked = out.unlocked.filter((k) => k !== 'knight');
  assert.deepEqual(autoPlan(out, 'knight'), []);
  // (the first row taken and one point over: the next row costs two)
  const one = metaAt('knight', 15);
  for (const x of TREES.knight.nodes.filter((x) => x.tier === 1)) learn(one, 'knight', x.id);
  assert.equal(pointsFree(one, 'knight'), 1);
  assert.deepEqual(autoPlan(one, 'knight'), []);
});

test('it follows a path down the tree before filling the first row', () => {
  // (four points and nothing learned: two of the first row and a node of the second, not all four of the first row)
  const m = metaAt('samurai', 12);
  assert.equal(pointsFree(m, 'samurai'), 4);
  const plan = autoPlan(m, 'samurai').map((id) => nodeOf('samurai', id)!.tier);
  assert.deepEqual(plan, [1, 1, 2]);
  // (level 30: the whole of the first three rows, the pair choices before the rest of the first row)
  const full = metaAt('samurai', 30);
  assert.deepEqual(autoPlan(full, 'samurai').map((id) => nodeOf('samurai', id)!.tier), [1, 1, 2, 3, 1, 1]);
});

/** The share of a plan's worth that leans one way. */
function share(kind: string, ids: string[], lean: Lean): number {
  let all = 0;
  let one = 0;
  for (const id of ids) {
    const l = leansOf(nodeOf(kind, id)!);
    all += l.guard + l.harm + l.mend + l.aid;
    one += l[lean];
  }
  return all ? one / all : 0;
}
const mean = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;
const ofCalling = (c: string) => KINDS.filter((k) => DEEP_KITS[k]?.calling === c);

test('the picks suit the calling: a tank takes guarding, a damage dealer harm, a healer mending', () => {
  // (two points: the knight takes his health and defence, the samurai her attack and crit)
  const knight = autoPlan(metaAt('knight', 6), 'knight').map((id) => nodeOf('knight', id)!.name);
  assert.deepEqual([...knight].sort(), ['Sturdy Greaves', 'Tempered Steel']);
  const samurai = autoPlan(metaAt('samurai', 6), 'samurai').map((id) => nodeOf('samurai', id)!.name);
  assert.deepEqual([...samurai].sort(), ['Calm Mind', 'Whetstone']);
  // (a whole tree's pair choices, by calling)
  const pairs = (kind: string) => autoPlan(metaAt(kind, 100, 3), kind).filter((id) => nodeOf(kind, id)!.tier > 1);
  const guard = (c: string) => mean(ofCalling(c).map((k) => share(k, pairs(k), 'guard')));
  const harm = (c: string) => mean(ofCalling(c).map((k) => share(k, pairs(k), 'harm')));
  const mend = (c: string) => mean(ofCalling(c).map((k) => share(k, pairs(k), 'mend')));
  assert.ok(guard('bulwark') > guard('duelist'), `bulwark guard ${guard('bulwark')} vs duelist ${guard('duelist')}`);
  assert.ok(harm('duelist') > harm('bulwark'), `duelist harm ${harm('duelist')} vs bulwark ${harm('bulwark')}`);
  assert.ok(mend('healer') > mend('duelist'), `healer mend ${mend('healer')} vs duelist ${mend('duelist')}`);
  // (the bulwark's deep rows: the guarding one of each pair where there is one)
  const kn = pairs('knight').map((id) => nodeOf('knight', id)!.name);
  assert.ok(kn.includes('Iron Resolve') && kn.includes('Last Stand') && kn.includes('Immortal Bastion'), kn.join(', '));
  const sam = pairs('samurai').map((id) => nodeOf('samurai', id)!.name);
  assert.ok(sam.includes('Master of Blades') || sam.includes('Phantom Edge'), sam.join(', '));
});

test('Auto all: a plan for each hero with points, in roster order, and spending them all', () => {
  const m = startedMeta(5);
  const [a, b, c] = m.unlocked.filter((k) => TREES[k]);
  m.xp[a] = xpFor(9);
  m.xp[c] = xpFor(30);
  const plans = autoPlanAll(m, [a, b, c]);
  assert.deepEqual(plans.map((p) => p.kind), [a, c]);
  assert.equal(plans[0].points, 3);
  const before = { a: plans[0].picks, c: plans[1].picks };
  const done = autoSpendAll(m, [a, b, c]);
  assert.deepEqual(done, [{ kind: a, picks: before.a }, { kind: c, picks: before.c }]);
  assert.deepEqual(picksOf(m, a), before.a);
  assert.equal(picksOf(m, b).length, 0);
  assert.deepEqual(autoPlanAll(m, [a, b, c]), []);
  for (const k of [a, c]) assert.ok(!TREES[k].nodes.some((x) => canLearn(m, k, x.id)));
  assert.ok(costOf(nodeOf(a, before.a[0])!) >= 1);
});
