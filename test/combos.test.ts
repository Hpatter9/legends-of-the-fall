import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, fight, startBattle, stepBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { CAST_MS, COMBO_NEED, COMBOS, comboOf, MIN_ALIVE, noteCombos, readCombosSeen, startCombo } from '../src/sim/combos';
import { newMeta } from '../src/sim/meta';
import { ALL_HEROES } from '../src/sim/units';
import { gradeBoost } from '../src/sim/run';

/** A fight with the five of a combo placed on the heroes' rows. */
function team(kinds: readonly string[], seed = 5, band = 'skeletons'): Battle {
  const b = startBattle(seed, band);
  kinds.forEach((k, i) => addUnit(b, k, 1 + i, 8, gradeBoost(1, 0, 1)));
  return b;
}

test('there are between five and eight combos, each five different heroes, and no hero is in two', () => {
  assert.ok(COMBOS.length >= 5 && COMBOS.length <= 8);
  const seen = new Set<string>();
  for (const c of COMBOS) {
    assert.equal(new Set(c.heroes).size, 5, c.id);
    for (const k of c.heroes) {
      assert.ok(ALL_HEROES.includes(k), `${c.id}: ${k}`);
      assert.ok(!seen.has(k), `${k} is in two combos`);
      seen.add(k);
    }
    assert.ok(c.name && c.move && c.text.length > 20 && c.beats.length >= 2, c.id);
  }
  assert.equal(new Set(COMBOS.map((c) => c.id)).size, COMBOS.length);
});

test('a fight has a combo only when all five of its heroes are placed', () => {
  const c = COMBOS[0];
  const full = team(c.heroes);
  fight(full);
  assert.equal(full.combo?.id, c.id);
  assert.equal(full.combo?.ids.length, 5);
  const short = team(c.heroes.slice(0, 4));
  fight(short);
  assert.equal(short.combo, undefined);
  const mixed = team([...c.heroes.slice(0, 4), 'peasant']);
  fight(mixed);
  assert.equal(mixed.combo, undefined);
  assert.equal(comboOf(['knight', 'archer']), undefined);
  // (no combo before the fight begins)
  assert.equal(team(c.heroes).combo, undefined);
});

test('the bar fills as the five fight, and when full the five cast together and the move lands', () => {
  for (const c of COMBOS) {
    const b = team(c.heroes, 9);
    // (sturdy five against weak foes, so the fight lasts long enough)
    for (const u of b.units) if (u.side === 'hero') u.hp = u.maxHp = 9000;
    for (const u of b.units) if (u.side === 'foe') u.hp = u.maxHp = 4000;
    fight(b);
    let cast: Extract<BattleEvent, { kind: 'comboCast' }> | undefined;
    let landed = false;
    let max = 0;
    for (let i = 0; i < 1200 && b.phase === 'fight' && !landed; i++) {
      for (const e of stepBattle(b)) {
        if (e.kind === 'comboCast') cast = e;
        if (e.kind === 'comboLand') landed = true;
      }
      max = Math.max(max, b.combo!.charge);
    }
    assert.ok(max > 20, `${c.id}: the bar fills`);
    assert.ok(cast, `${c.id}: the five cast`);
    assert.equal(cast!.by.length, 5);
    assert.equal(cast!.id, c.id);
    assert.ok(landed, `${c.id}: the move lands`);
    assert.equal(b.combo!.fired, 1);
    assert.ok(b.combo!.charge < COMBO_NEED, 'the bar empties');
  }
});

test('while the move is under way the five are held, and the bar waits', () => {
  const c = COMBOS[1];
  const b = team(c.heroes, 3);
  for (const u of b.units) if (u.side === 'hero') u.hp = u.maxHp = 9000;
  for (const u of b.units) if (u.side === 'foe') u.hp = u.maxHp = 4000;
  fight(b);
  b.combo!.charge = COMBO_NEED - 0.01;
  let at = -1;
  for (let i = 0; i < 40 && at < 0; i++) for (const e of stepBattle(b)) if (e.kind === 'comboCast') at = b.t;
  assert.ok(at > 0);
  for (const id of b.combo!.ids) assert.ok(b.units.find((u) => u.id === id)!.busyUntil >= at + CAST_MS - 100);
  const before = b.combo!.charge;
  stepBattle(b);
  assert.equal(b.combo!.charge, before, 'the bar holds while the move is under way');
});

test('each combo\'s move does what its text says: the holy order heals and shields, the arcane council burns, the wild hunt calls wolves', () => {
  const run = (id: string) => {
    const c = COMBOS.find((x) => x.id === id)!;
    const b = team(c.heroes, 4);
    for (const u of b.units) if (u.side === 'foe') u.hp = u.maxHp = 9000;
    fight(b);
    // (the traits set the heroes' health as the fight starts, so hurt them after it)
    for (const u of b.units) if (u.side === 'hero') u.hp = Math.round(u.maxHp * 0.5);
    b.combo!.charge = COMBO_NEED - 0.01;
    const events: BattleEvent[] = [];
    for (let i = 0; i < 40; i++) events.push(...stepBattle(b));
    return { b, events };
  };
  const holy = run('holyOrder');
  assert.ok(holy.events.some((e) => e.kind === 'comboLand'));
  assert.ok(holy.b.units.some((u) => u.side === 'hero' && u.shield), 'a ward');
  assert.ok(holy.events.filter((e) => e.kind === 'heal').length >= 5, 'every ally healed');
  const arcane = run('arcaneCouncil');
  assert.ok(arcane.b.units.some((u) => u.side === 'foe' && u.dot?.kind === 'burn'), 'the foes burn');
  const hunt = run('wildHunt');
  assert.ok(hunt.b.units.filter((u) => u.def === 'wolf').length >= 3 && hunt.b.units.some((u) => u.def === 'direWolf'), 'wolves rise');
  const shadow = run('shadowClan');
  assert.ok(shadow.b.units.filter((u) => u.side === 'hero' && (u.hasteUntil ?? 0) > shadow.b.t).length >= 5, 'the five are hasted');
});

test('fewer than three of the five standing stops the bar; a fallen one slows it', () => {
  const c = COMBOS[0];
  const b = team(c.heroes, 6);
  for (const u of b.units) if (u.side === 'foe') u.hp = u.maxHp = 9000;
  for (const u of b.units) if (u.side === 'hero') u.hp = u.maxHp = 9000;
  fight(b);
  const s = b.combo!;
  const heroes = b.units.filter((u) => u.side === 'hero');
  heroes[0].alive = false;
  stepBattle(b);
  assert.equal(s.fallen, 1);
  assert.equal(s.broken, false);
  heroes[1].alive = false;
  heroes[2].alive = false;
  stepBattle(b);
  assert.equal(s.fallen, 3);
  assert.equal(s.broken, true);
  assert.ok(5 - s.fallen < MIN_ALIVE);
  const held = s.charge;
  stepBattle(b);
  assert.equal(s.charge, held);
});

test('a combo fight is deterministic', () => {
  const play = () => {
    const b = team(COMBOS[4].heroes, 12);
    fight(b);
    const log: string[] = [];
    while (b.phase === 'fight') for (const e of stepBattle(b)) if (e.kind === 'comboCast' || e.kind === 'comboLand') log.push(`${e.kind}@${b.t}`);
    return [b.phase, b.t, log.join(',')].join('|');
  };
  assert.equal(play(), play());
});

test('the codex learns a combo once it has gone off, saves from before have none, and a bad list is read safely', () => {
  const m = newMeta(1);
  const b = team(COMBOS[2].heroes);
  fight(b);
  assert.deepEqual(noteCombos(m, b), [], 'it has not gone off');
  b.combo!.fired = 1;
  assert.deepEqual(noteCombos(m, b), ['shadowClan']);
  assert.deepEqual(noteCombos(m, b), [], 'only the first time');
  assert.deepEqual(m.combosSeen, ['shadowClan']);
  assert.deepEqual(readCombosSeen(undefined), []);
  assert.deepEqual(readCombosSeen(['shadowClan', 'nonsense', 7, 'shadowClan']), ['shadowClan']);
  startCombo(b);
});
