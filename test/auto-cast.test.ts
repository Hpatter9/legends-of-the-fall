// AUTO-CAST: the king's spells cast on their own while the fight's Auto is on (`src/sim/autoCast.ts`, docs/notes/auto-cast.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, fight, startBattle, stepBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { AUTO_GAP_MS, autoCast, chooseSpell } from '../src/sim/autoCast';
import { castSpell, MANA_MAX, SPELLS, type SpellId } from '../src/sim/spells';
import { replayLog } from '../src/sim/orders';
import { armyRun, startStage } from '../src/sim/run';
import { savedAt } from '../tools/autoplay';
import { autoDeploy, autoRound } from '../src/sim/autoplay';

/** A flat, empty board mid-fight. */
function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}

/** The first army's first wave, the starting five set out by the Auto button's rules, played to its end; every hit and cast traced. */
function wave(seed: number, opts: { auto?: SpellId[]; log?: Battle['log'] } = {}): { b: Battle; trace: string; casts: number } {
  const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
  const meta = savedAt(1, party, seed);
  const run = armyRun(seed, 'orcs', party);
  autoRound(run, meta, false);
  const b = startStage(run);
  autoDeploy(b, run, meta);
  fight(b);
  if (opts.auto) b.autoSpells = opts.auto;
  let trace = '';
  let casts = 0;
  while (b.phase === 'fight') {
    if (opts.log) replayLog(b, opts.log);
    for (const e of stepBattle(b)) {
      if (e.kind === 'spell') casts++;
      if (e.kind === 'hit' || e.kind === 'spell' || e.kind === 'heal') trace += `${b.t}:${e.kind}:${'by' in e ? e.by : ''}:${'to' in e ? e.to : ''};`;
    }
  }
  return { b, trace, casts };
}

test('with Auto off (autoSpells unset) a fight casts nothing and plays exactly as before', () => {
  const off = wave(5);
  assert.equal(off.casts, 0);
  assert.ok(!off.b.log?.some((e) => e.kind === 'spell'));
  assert.equal(off.b.spells.autoAt, undefined);
  // (an empty list is off as well)
  assert.equal(wave(5, { auto: [] }).trace, off.trace);
});

test('with Auto on the equipped spells are cast on their own, logged like a tap, the same every time, and the log replays it whole', () => {
  const ids: SpellId[] = ['heal', 'meteor', 'haste'];
  const on = wave(5, { auto: ids });
  assert.ok(on.casts > 0, 'some spell was cast');
  const logged = on.b.log!.filter((e) => e.kind === 'spell');
  assert.equal(logged.length, on.casts);
  assert.ok(logged.every((e) => e.kind === 'spell' && ids.includes(e.id)));
  // (no two casts closer than the gap)
  for (let i = 1; i < logged.length; i++) assert.ok(logged[i].t - logged[i - 1].t >= AUTO_GAP_MS);
  assert.equal(wave(5, { auto: ids }).trace, on.trace);
  // (played again from the log with Auto off: the same fight, cast for cast)
  assert.equal(wave(5, { log: on.b.log }).trace, on.trace);
});

test('only spells in the list are cast', () => {
  const on = wave(5, { auto: ['haste'] });
  assert.ok(on.casts > 0);
  assert.ok(on.b.log!.filter((e) => e.kind === 'spell').every((e) => e.kind === 'spell' && e.id === 'haste'));
});

test('a heal goes to the hurt, and not when every hero is well', () => {
  const b = arena();
  const k = addUnit(b, 'knight', 3, 7);
  addUnit(b, 'archer', 6, 9);
  addUnit(b, 'skeleton', 3, 6);
  b.spells.mana = MANA_MAX;
  assert.equal(chooseSpell(b, ['heal']), undefined);
  k.hp = Math.round(k.maxHp * 0.3);
  const pick = chooseSpell(b, ['heal'])!;
  assert.equal(pick.id, 'heal');
  assert.ok(Math.abs(pick.u - k.u) <= 1 && Math.abs(pick.v - k.v) <= 1, 'the 3x3 covers the hurt knight');
});

test('a meteor goes where the foes stand thickest, and is not spent on foes nearly done or on one foe of many', () => {
  const b = arena();
  for (const u of [1, 2, 6]) addUnit(b, 'knight', u, 7);
  const pack = [addUnit(b, 'skeleton', 1, 6), addUnit(b, 'skeleton', 2, 6), addUnit(b, 'skeleton', 2, 5)];
  addUnit(b, 'skeleton', 6, 6);
  b.spells.mana = MANA_MAX;
  const pick = chooseSpell(b, ['meteor'])!;
  assert.equal(pick.id, 'meteor');
  for (const f of pack) assert.ok(Math.abs(f.u - pick.u) <= 1 && Math.abs(f.v - pick.v) <= 1, 'the whole pack is in the blast');
  // (the pack nearly dead: no foes worth the blast together)
  for (const f of pack) f.hp = Math.round(f.maxHp * 0.1);
  assert.equal(chooseSpell(b, ['meteor']), undefined);
});

test('a reserve: with a heal equipped and nobody hurt, the meteor waits for mana enough to heal after it (or a full bar)', () => {
  const b = arena();
  for (const u of [1, 2, 3]) addUnit(b, 'knight', u, 7);
  for (const u of [1, 2, 3]) addUnit(b, 'skeleton', u, 6);
  b.spells.mana = SPELLS.meteor.cost;
  assert.equal(chooseSpell(b, ['heal', 'meteor']), undefined);
  assert.equal(chooseSpell(b, ['meteor'])?.id, 'meteor');
  b.spells.mana = SPELLS.meteor.cost + SPELLS.heal.cost;
  assert.equal(chooseSpell(b, ['heal', 'meteor'])?.id, 'meteor');
});

test("a shield goes up before a boss's marked blow lands on the heroes", () => {
  const b = arena();
  const a = addUnit(b, 'knight', 3, 7);
  addUnit(b, 'archer', 4, 7);
  addUnit(b, 'skeleton', 3, 4);
  b.spells.mana = MANA_MAX;
  assert.equal(chooseSpell(b, ['shield']), undefined);
  b.warnings = [{ n: 1, by: 99, key: 'x', from: b.t, at: b.t + 1500, tiles: [a.v * b.board.w + a.u, 7 * b.board.w + 4], rage: false }];
  const pick = chooseSpell(b, ['shield'])!;
  assert.equal(pick.id, 'shield');
  assert.ok(Math.abs(pick.u - a.u) <= 1 && Math.abs(pick.v - a.v) <= 1);
});

test('a buff waits for the heroes to be in the fight', () => {
  const b = arena();
  for (const u of [2, 3, 4]) addUnit(b, 'knight', u, 9);
  const foes = [2, 3, 4].map((u) => addUnit(b, 'skeleton', u, 0));
  b.spells.mana = MANA_MAX;
  assert.equal(chooseSpell(b, ['rally']), undefined);
  for (const f of foes) f.v = 8;
  assert.equal(chooseSpell(b, ['rally'])?.id, 'rally');
});

test('autoCast casts through castSpell (mana, cooldown and the gap), and the War Horn is never touched', () => {
  const b = arena();
  const k = addUnit(b, 'knight', 3, 7);
  addUnit(b, 'skeleton', 3, 6);
  k.hp = Math.round(k.maxHp * 0.3);
  b.spells.mana = MANA_MAX;
  b.autoSpells = ['heal'];
  const before = k.hp;
  assert.equal(autoCast(b), 'heal');
  assert.ok(k.hp > before);
  assert.equal(b.spells.mana, MANA_MAX - SPELLS.heal.cost);
  assert.equal(b.spells.ready.heal, b.t + SPELLS.heal.cooldownMs);
  // (the same as a tap on that tile would have done)
  const c = arena();
  const k2 = addUnit(c, 'knight', 3, 7);
  addUnit(c, 'skeleton', 3, 6);
  k2.hp = Math.round(k2.maxHp * 0.3);
  c.spells.mana = MANA_MAX;
  const e = b.log!.find((x) => x.kind === 'spell')!;
  assert.ok(e.kind === 'spell' && castSpell(c, 'heal', e.u, e.v));
  assert.equal(k2.hp, k.hp);
  // (cooling down, and inside the gap: nothing)
  k.hp = Math.round(k.maxHp * 0.3);
  assert.equal(autoCast(b), undefined);
  assert.equal(b.orders, undefined);
  const ev: BattleEvent[] = [];
  for (let i = 0; i < 70 && b.phase === 'fight'; i++) ev.push(...stepBattle(b));
  assert.ok(!ev.some((x) => x.kind === 'eidolon'));
});
