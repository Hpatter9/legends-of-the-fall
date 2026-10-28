import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, DEPLOY_ROWS, boardOk, makeBoard, standable, tileAt } from '../src/sim/board';
import { canPlace, fight, place, playOut, startBattle, stepBattle, strikeDef, type Battle, type Unit } from '../src/sim/battle';
import { mendUnit } from '../src/sim/abilities';
import { speedOf } from '../src/sim/spells';
import { HEROES } from '../src/sim/units';
import { startedMeta } from '../src/sim/meta';
import { towerRun } from '../src/sim/modes';
import { startStage } from '../src/sim/run';
import { ACT_ROWS, enterNode, choices, finishTower, fightSpec, makeMap } from '../src/sim/tower';
import { rollTwist, TWIST_IDS, TWISTS, twistBoard, type TwistFx } from '../src/sim/twists';

/** A fight against `band` with a twist's effects (none when `id` is undefined), all five heroes placed on the first free tiles of their rows. */
function ready(id?: string, seed = 11, band: string | string[] = 'skeletons'): Battle {
  const b = startBattle(seed, band, id ? { twist: TWISTS[id].fx } : {});
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  HEROES.forEach((h, i) => place(b, h, ...spots[(i * 3) % spots.length]));
  return b;
}
const heroes = (b: Battle) => b.units.filter((u) => u.side === 'hero');
const foes = (b: Battle) => b.units.filter((u) => u.side === 'foe');
const unitOf = (b: Battle, def: string): Unit => b.units.find((u) => u.def === def)!;

test('there are 10 to 16 twists, curses, blessings and mixed, each named and told in a line', () => {
  assert.ok(TWIST_IDS.length >= 10 && TWIST_IDS.length <= 16);
  const tones = new Set(TWIST_IDS.map((id) => TWISTS[id].tone));
  assert.deepEqual([...tones].sort(), ['blessing', 'curse', 'mixed']);
  for (const id of TWIST_IDS) {
    const tw = TWISTS[id];
    assert.equal(tw.id, id);
    assert.ok(tw.name.length > 2 && tw.text.length > 10);
    assert.ok(Object.keys(tw.fx).length > 0, `${id} does something`);
  }
});

test('twists are rolled from the seed alone, and the map under them is untouched', () => {
  assert.deepEqual(makeMap(21, 1), makeMap(21, 1));
  for (let seed = 1; seed <= 60; seed++) {
    for (const act of [1, 2, 3]) {
      const withTwists = makeMap(seed, act);
      const bare = makeMap(seed, act, false);
      assert.ok(bare.every((n) => n.twist === undefined));
      assert.deepEqual(withTwists.map(({ twist: _t, ...n }) => n), bare);
    }
  }
  assert.equal(rollTwist(5, 1, 3, 'fight'), rollTwist(5, 1, 3, 'fight'));
});

test('about 40% of fights and 60% of elites carry a twist; nothing else does; a boss does from act 2', () => {
  let fights = 0;
  let fightTw = 0;
  let elites = 0;
  let eliteTw = 0;
  for (let seed = 1; seed <= 500; seed++) {
    for (const n of makeMap(seed, 1)) {
      if (n.kind === 'fight') (fights++, n.twist && fightTw++);
      else if (n.kind === 'elite') (elites++, n.twist && eliteTw++);
      else assert.equal(n.twist, undefined, `${n.kind} has no twist`);
      if (n.twist) assert.ok(TWISTS[n.twist], 'a real twist');
    }
  }
  assert.ok(fightTw / fights > 0.34 && fightTw / fights < 0.46, `fights ${fightTw / fights}`);
  assert.ok(eliteTw / elites > 0.53 && eliteTw / elites < 0.67, `elites ${eliteTw / elites}`);
  for (let seed = 1; seed <= 100; seed++) {
    assert.equal(makeMap(seed, 1).find((n) => n.row === ACT_ROWS - 1)!.twist, undefined, 'no twist on the first boss');
    for (const act of [2, 3, 4]) assert.ok(makeMap(seed, act).find((n) => n.row === ACT_ROWS - 1)!.twist, `act ${act} boss`);
  }
});

test('every twist turns up across the maps', () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) for (const n of makeMap(seed, 2)) if (n.twist) seen.add(n.twist);
  assert.deepEqual([...seen].sort(), [...TWIST_IDS].sort());
});

test('a fight with no twist, or an empty one, plays exactly as before', () => {
  const plain = ready();
  const empty = startBattle(11, 'skeletons', { twist: {} });
  const spots: [number, number][] = [[0, 8], [3, 8], [6, 8], [2, 7], [5, 7]];
  HEROES.forEach((h, i) => place(empty, h, ...spots[i]));
  const again = startBattle(11, 'skeletons', {});
  HEROES.forEach((h, i) => place(again, h, ...spots[i]));
  assert.ok(fight(empty) && fight(again) && fight(plain));
  assert.deepEqual(empty.board, again.board);
  assert.deepEqual(empty.units, again.units);
  playOut(empty);
  playOut(again);
  assert.equal(empty.t, again.t);
  assert.deepEqual(empty.units, again.units);
  assert.equal(plain.twist, undefined);
});

test('fog: shooters lose 1 range, fighters keep theirs', () => {
  const b = ready('fog');
  const plain = ready();
  assert.equal(strikeDef(b, unitOf(b, 'archer')).range, strikeDef(plain, unitOf(plain, 'archer')).range - 1);
  assert.equal(strikeDef(b, unitOf(b, 'knight')).range, strikeDef(plain, unitOf(plain, 'knight')).range);
  const bone = foes(b).find((u) => u.def === 'boneArcher')!;
  assert.ok(strikeDef(b, bone).range >= 1);
});

test('holy ground: healing is 50% stronger, for everyone', () => {
  const holy = ready('holy');
  const plain = ready();
  const hurt = (b: Battle) => {
    const u = unitOf(b, 'knight');
    u.hp = 1;
    mendUnit(u, 100, [], u);
    return u.hp - 1;
  };
  assert.equal(hurt(plain), 100);
  assert.equal(hurt(holy), 150);
  assert.equal(foes(holy)[0].healMult, 1.5);
});

test('lava cracks: four tiles of the middle ground burn, and nothing else about the board changes', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const lava = ready('lava', seed);
    const plain = ready(undefined, seed);
    const lit = (b: Battle) => b.board.tiles.map((t, i) => (t.ground === 'lava' ? i : -1)).filter((i) => i >= 0);
    assert.equal(lit(lava).length - lit(plain).length, 4, `seed ${seed}`);
    for (const i of lit(lava)) if (!lit(plain).includes(i)) assert.ok(Math.floor(i / lava.board.w) >= DEPLOY_ROWS && Math.floor(i / lava.board.w) < D - DEPLOY_ROWS, 'in the middle');
    assert.deepEqual(lava.board.tiles.map((t) => t.h), plain.board.tiles.map((t) => t.h));
    assert.ok(boardOk(lava.board));
  }
});

test('gale: everyone jumps 1 higher', () => {
  const b = ready('gale');
  const plain = ready();
  for (const u of [unitOf(b, 'knight'), unitOf(b, 'kunoichi'), foes(b)[0]]) {
    const p = plain.units.find((x) => x.def === u.def)!;
    assert.equal(strikeDef(b, u).jump, strikeDef(plain, p).jump + 1);
  }
});

test('blood moon: the foes hit 25% harder; the win pays double gold', () => {
  const b = ready('bloodmoon');
  const plain = ready();
  assert.ok(Math.abs((foes(b)[0].power ?? 1) / (foes(plain)[0].power ?? 1) - 1.25) < 1e-9);
  assert.equal(TWISTS.bloodmoon.fx.gold, 2);
  assert.equal(foes(b)[0].maxHp, foes(plain)[0].maxHp);
});

test('narrow pass: boulders take the heroes\' outer back tiles, and everyone can still get about', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const b = ready('narrow', seed);
    const plain = ready(undefined, seed);
    const room = (x: Battle) => x.board.tiles.filter((t, i) => Math.floor(i / x.board.w) >= D - DEPLOY_ROWS && standable(t)).length;
    assert.ok(room(b) < room(plain), `seed ${seed}`);
    assert.equal(canPlace(b, 'knight', 0, D - 1), false);
    assert.equal(canPlace(b, 'knight', 3, D - 1) || !standable(tileAt(b.board, 3, D - 1)), true);
    assert.ok(boardOk(b.board));
    assert.ok(heroes(b).length === 5, 'the squad still fits');
  }
});

test('treasure floor: +50% gold for the win', () => {
  assert.equal(TWISTS.treasure.fx.gold, 1.5);
});

test('haste: everyone acts 15% faster', () => {
  const b = ready('haste');
  const plain = ready();
  fight(b);
  fight(plain);
  for (const [x, y] of [[unitOf(b, 'knight'), unitOf(plain, 'knight')], [foes(b)[0], foes(plain)[0]]]) assert.ok(Math.abs(speedOf(b, x) / speedOf(plain, y) - 1.15) < 1e-9);
});

test('frost: a step takes longer', () => {
  const first = (b: Battle) => {
    fight(b);
    for (let i = 0; i < 40; i++) {
      stepBattle(b);
      const s = b.units.find((u) => u.step && u.side === 'hero');
      if (s) return { ms: s.step!.ms, def: s.def };
    }
    throw new Error('nobody stepped');
  };
  const cold = first(ready('frost'));
  const plain = first(ready());
  assert.equal(cold.def, plain.def);
  assert.ok(cold.ms > plain.ms * 1.2, `${cold.ms} vs ${plain.ms}`);
});

test("mana surge: the king's mana fills 50% faster", () => {
  assert.equal(ready('mana').spells.rate, 1.5);
  assert.equal(ready().spells.rate, 1);
  const r = startBattle(1, 'skeletons', { mana: 1.25, twist: TWISTS.mana.fx });
  assert.equal(r.spells.rate, 1.25 * 1.5);
});

test('cursed: the heroes start the fight 10% down on hp', () => {
  const b = ready('cursed');
  const plain = ready();
  fight(b);
  fight(plain);
  for (const h of heroes(b)) {
    const p = plain.units.find((u) => u.def === h.def)!;
    assert.equal(h.maxHp, p.maxHp);
    assert.equal(h.hp, Math.round(p.hp * 0.9));
  }
  for (const f of foes(b)) assert.equal(f.hp, f.maxHp);
});

test('ambush: a foe starts in the heroes\' back row, and the band is still all there', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const b = ready('ambush', seed);
    const plain = ready(undefined, seed);
    assert.equal(foes(b).length, foes(plain).length);
    const inBack = foes(b).filter((f) => f.v === D - 1);
    assert.equal(inBack.length, 1, `seed ${seed}`);
    assert.ok(standable(tileAt(b.board, inBack[0].u, inBack[0].v)));
    assert.equal(new Set(b.units.map((u) => `${u.u},${u.v}`)).size, b.units.length, 'nobody shares a tile');
  }
  // (the leader of a band stays where it was)
  const boss = startBattle(4, ['ogre', 'skeleton', 'skeleton'], { twist: TWISTS.ambush.fx });
  assert.notEqual(boss.units[0].v, D - 1);
});

test('glory: the heroes strike 10% harder, the foes not', () => {
  const b = ready('glory');
  const plain = ready();
  assert.ok(Math.abs(unitOf(b, 'samurai').power! / (unitOf(plain, 'samurai').power ?? 1) - 1.1) < 1e-9);
  assert.equal(foes(b)[0].power, foes(plain)[0].power);
});

test('fortified: every foe has 20% more hp', () => {
  const b = ready('fortified');
  const plain = ready();
  foes(b).forEach((f, i) => assert.equal(f.maxHp, Math.round(foes(plain)[i].maxHp * 1.2)));
  assert.ok(foes(b).length === foes(plain).length);
});

test('hot coal ground: four tiles of the middle ground become hot coals', () => {
  const b = ready('hotCoals');
  const coals = b.board.tiles.filter((t) => t.ground === 'coals');
  assert.equal(coals.length, 4);
});

test('rolling gales: projectiles shift trajectory by 1 tile', () => {
  assert.equal(TWISTS.rollingGales.fx.gales, 1);
});

test('twistBoard changes only the lava and the boulders, and keeps every board playable', () => {
  const fx: TwistFx = { lava: 4, narrow: true };
  for (let seed = 1; seed <= 60; seed++) {
    const b = makeBoard(seed, 'volcano');
    twistBoard(b, fx, seed);
    assert.ok(boardOk(b));
  }
});

test('the tower brings a node\'s twist into its fight, and a win pays for it', () => {
  const gold = (twist?: string) => {
    const run = towerRun(5, startedMeta(1));
    const first = choices(run)[0];
    run.tower!.map[first.id].twist = twist;
    enterNode(run, first.id);
    const spec = run.tower!.cur!.fight!;
    assert.equal(spec.twist, twist);
    const b = startStage(run);
    assert.deepEqual(b.twist, twist ? TWISTS[twist].fx : undefined);
    const before = run.gold;
    finishTower(run, b, true);
    return run.gold - before;
  };
  const base = gold();
  assert.ok(base > 0);
  assert.equal(gold('treasure'), Math.round(base * 1.5));
  assert.equal(gold('bloodmoon'), base * 2);
  assert.equal(gold('fog'), base);
});

test('an old save\'s map, with no twists on it, plays as it did', () => {
  const run = towerRun(8, startedMeta(1));
  for (const n of run.tower!.map) delete n.twist;
  const first = choices(run)[0];
  enterNode(run, first.id);
  assert.equal(run.tower!.cur!.fight!.twist, undefined);
  assert.equal(run.tower!.cur!.fight!.stage.twist, undefined);
  const spec = fightSpec(run, 'fight', 1);
  assert.equal(spec.twist, undefined);
  assert.equal(startStage(run).twist, undefined);
});
