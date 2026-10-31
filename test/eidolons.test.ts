// The Eidolons in a fight and the War Horn (EIDOLONS batch 3, docs/notes/eidolons.md): the strike's shares per foe kind, once a fight, Auto
// and the bots never calling it, determinism (a call replays from the log; a fight armed but never called plays as before), the six riders,
// and the horn's fill per mode, its wait when full, its blow, the choice keeping the fill and older saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bareBoard } from './bare';
import { addUnit, fight, place, playOut, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, ULT_LEVEL } from '../src/sim/abilities';
import { armEidolon, canCallEidolon, EIDOLONS, RIDER, STRIKE, struckAs } from '../src/sim/eidolons';
import { orderEidolon, replayLog } from '../src/sim/orders';
import { addHorn, bindEidolon, blowHorn, chooseEidolon, chosenOf, HORN, HORN_FULL, hornGain, hornReady, readEidolons, standHornGain } from '../src/sim/warHorn';
import { hornFightOf } from '../src/sim/hornFill';
import { armyRun, gradeBoost, startStage } from '../src/sim/run';
import { dailyRun } from '../src/sim/modes';
import { armyById } from '../src/sim/armies';
import { loadMeta, startedMeta } from '../src/sim/meta';
import { mixSeed, Rng } from '../src/sim/rng';
import { MANA_MAX } from '../src/sim/spells';
import { autoDeploy } from '../src/sim/autoplay';
import { deploySpots } from '../tools/heroSweep';

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}
const spawn = (b: Battle, def: string, u: number, v: number, boost = {}): Unit => addUnit(b, def, u, v, boost);
/** Arm, order and step one tick: the call resolves at the start of it. */
function call(b: Battle, id: string, opts: { mid?: boolean; trial?: boolean } = {}): BattleEvent[] {
  assert.ok(armEidolon(b, id, opts));
  assert.ok(orderEidolon(b, id));
  return stepBattle(b);
}
const share = (u: Unit) => (u.maxHp - u.hp) / u.maxHp;

test('the strike: ordinary foes fall, elites and mid-bosses lose 65%, last bosses 45%, guardians 40%, a being in its trial 25%', () => {
  const b = arena();
  spawn(b, 'knight', 3, 9);
  const plain = spawn(b, 'skeleton', 1, 1, { hp: 40 });
  const elite = spawn(b, 'eliteGorrak', 3, 1, { hp: 5 });
  const boss = spawn(b, 'lichKing', 5, 1, { hp: 8 });
  const guard = spawn(b, 'calBoss1', 7, 1, { hp: 3 });
  const ev = call(b, 'gorm');
  assert.equal(plain.alive, false, 'an ordinary foe falls, however tough');
  assert.ok(Math.abs(share(elite) - STRIKE.ELITE) < 0.01, `elite ${share(elite)}`);
  assert.ok(Math.abs(share(boss) - STRIKE.BOSS) < 0.01, `boss ${share(boss)}`);
  assert.ok(Math.abs(share(guard) - STRIKE.GUARDIAN) < 0.01, `guardian ${share(guard)}`);
  assert.equal(STRIKE.ELITE, 0.65);
  assert.equal(STRIKE.BOSS, 0.45);
  assert.equal(STRIKE.GUARDIAN, 0.4);
  // (told to the page: the call, a hit on each foe by 0 marked as the Eidolon's, and the end)
  assert.deepEqual(ev.filter((e) => e.kind === 'eidolon').map((e) => (e as { phase: string }).phase), ['call', 'done']);
  assert.equal(ev.filter((e) => e.kind === 'hit' && e.eidolon && e.by === 0).length, 4);
  // (a mid-boss wave: its boss counts as an elite)
  const m = arena();
  spawn(m, 'knight', 3, 9);
  const mid = spawn(m, 'lichKing', 5, 1, { hp: 8 });
  call(m, 'gorm', { mid: true });
  assert.ok(Math.abs(share(mid) - STRIKE.ELITE) < 0.01);
  // (a trial: the being takes 25%, its adds fall as usual)
  const t = arena();
  spawn(t, 'knight', 3, 9);
  const being = spawn(t, 'forgeTitan', 4, 1, { hp: 10 });
  const add = spawn(t, 'stoneGolem', 2, 1, { hp: 10 });
  assert.equal(struckAs(t, being), 'boss');
  call(t, 'gorm', { trial: true });
  assert.ok(Math.abs(share(being) - STRIKE.BEING) < 0.01);
  assert.equal(add.alive, false);
});

test('a shield, a guard or defence does not soften the strike; a boss already under its share falls', () => {
  const b = arena();
  spawn(b, 'knight', 3, 9);
  const boss = spawn(b, 'orcWarlord', 4, 1, { hp: 4 });
  boss.shield = { hp: 99999, until: 999999 };
  boss.guardUntil = 999999;
  const low = spawn(b, 'lichKing', 6, 1);
  low.hp = Math.round(low.maxHp * 0.3);
  call(b, 'askel');
  assert.ok(Math.abs(share(boss) - STRIKE.BOSS) < 0.01);
  assert.equal(low.alive, false);
});

test('once a fight: a second order is refused, and the call needs the fight on and the Eidolon armed', () => {
  const b = arena();
  spawn(b, 'knight', 3, 9);
  spawn(b, 'lichKing', 4, 1, { hp: 20 });
  assert.equal(orderEidolon(b, 'askel'), false, 'not armed');
  assert.ok(armEidolon(b, 'askel'));
  assert.equal(orderEidolon(b, 'nivra'), false, 'not the one armed');
  assert.ok(orderEidolon(b, 'askel'));
  assert.equal(orderEidolon(b, 'askel'), false, 'one waiting already');
  stepBattle(b);
  assert.equal(b.eidolon?.called, b.t);
  assert.equal(canCallEidolon(b), false);
  assert.equal(orderEidolon(b, 'askel'), false, 'once a fight');
  assert.equal(armEidolon(b, 'nivra'), false, 'and it cannot be armed again');
  // (not in deploy)
  const d = startBattle(4, 'orcs');
  assert.ok(armEidolon(d, 'askel'));
  assert.equal(orderEidolon(d, 'askel'), false);
  assert.equal(armEidolon(d, 'unknown'), false);
});

/** A fight of the starting five against orcs, with an Eidolon armed; `at` (a battle time) is when the player blows the horn. */
function playArmed(seed: number, opts: { arm?: boolean; at?: number; log?: Battle['log']; autoUlt?: boolean } = {}): { b: Battle; trace: string } {
  const b = startBattle(seed, 'orcs', { foes: { hp: 4, atk: 2 } });
  if (opts.autoUlt !== undefined) b.autoUlt = opts.autoUlt;
  const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
  ['knight', 'reaper', 'werewolf', 'timeWitch', 'dreadPirate'].forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, gradeBoost(1, 0, ULT_LEVEL)));
  if (opts.arm !== false) armEidolon(b, 'nivra');
  fight(b);
  let trace = '';
  while (b.phase === 'fight') {
    if (opts.log) replayLog(b, opts.log);
    else if (opts.at !== undefined && b.t === opts.at) orderEidolon(b, 'nivra');
    for (const e of stepBattle(b)) if (e.kind === 'hit' || e.kind === 'skill' || e.kind === 'eidolon') trace += `${b.t}:${e.kind}:${'by' in e ? e.by : ''}:${'to' in e ? e.to : ''};`;
  }
  return { b, trace };
}

test('determinism: a call replays from the log, the same call twice plays the same, and an armed fight never called plays as before', () => {
  const first = playArmed(21, { at: 3000 });
  assert.ok(first.b.log?.some((e) => e.kind === 'eidolon'), 'the call is logged');
  assert.ok(first.trace.includes(':eidolon:'));
  const again = playArmed(21, { log: first.b.log });
  assert.equal(again.trace, first.trace);
  assert.deepEqual(again.b.units.map((u) => [u.hp, u.alive]), first.b.units.map((u) => [u.hp, u.alive]));
  assert.equal(playArmed(21, { at: 3000 }).trace, first.trace);
  // (armed but never called: exactly the fight without an Eidolon)
  assert.equal(playArmed(21, { arm: true }).trace, playArmed(21, { arm: false }).trace);
});

test('Auto never calls it: a headless fight with its ultimates on their own, and the greedy player of the auto-replay, leave it armed', () => {
  const auto = playArmed(8, { autoUlt: true });
  assert.equal(auto.b.eidolon?.called, undefined);
  assert.ok(!auto.b.log?.some((e) => e.kind === 'eidolon'));
  const meta = startedMeta(5);
  const run = armyRun(9, 'orcs', meta.party);
  const b = startStage(run);
  autoDeploy(b, run, meta);
  armEidolon(b, 'askel');
  fight(b);
  playOut(b);
  assert.equal(b.eidolon?.called, undefined);
  // (and nothing the bots, Auto or the auto-replay run asks for it: only the page's tap and the balance tool's flag do)
  for (const f of ['src/sim/autoplay.ts', 'src/sim/autoReplay.ts', 'src/sim/heroKits.ts', 'src/sim/battle.ts']) assert.ok(!readFileSync(f, 'utf8').includes('orderEidolon'), f);
});

test('the riders: fire burns and warms, ice freezes, light raises and heals, lightning charges, earth guards and stuns, dark strips and drains', () => {
  // (Askel: burning ground on the foes' half, the heroes +15% attack for 10 s, then back)
  let b = arena();
  let h = spawn(b, 'knight', 3, 9);
  spawn(b, 'lichKing', 4, 1, { hp: 30 });
  call(b, 'askel');
  assert.ok(b.zones.length > 0 && b.zones.every((z) => z.side === 'hero' && z.v < b.board.d / 2 + 2));
  assert.ok(Math.abs((h.power ?? 1) - RIDER.WARM_MULT) < 1e-9);
  for (let i = 0; i < 101; i++) stepBattle(b);
  assert.ok(Math.abs((h.power ?? 1) - 1) < 1e-9, 'the warmth wears off');
  // (Nivra: the ordinary foes left (none: they fell) and an elite frozen, a boss slowed)
  b = arena();
  spawn(b, 'knight', 3, 9);
  const el = spawn(b, 'eliteGorrak', 2, 1, { hp: 20 });
  const boss = spawn(b, 'orcWarlord', 5, 1, { hp: 30 });
  call(b, 'nivra');
  assert.ok((el.stunUntil ?? 0) > b.t, 'the elite is frozen');
  assert.ok((boss.slowUntil ?? 0) > b.t, 'the boss is slowed');
  // (Aurelan: a fallen hero rises at 60%, the wounded are whole and shielded)
  b = arena();
  h = spawn(b, 'knight', 3, 9);
  const fell = spawn(b, 'cleric', 4, 9);
  fell.alive = false;
  fell.hp = 0;
  h.hp = 1;
  spawn(b, 'lichKing', 4, 1, { hp: 30 });
  call(b, 'aurelan');
  assert.equal(fell.alive, true);
  assert.equal(h.hp, h.maxHp);
  assert.ok(h.shield && h.shield.until > b.t);
  // (Voltara: the ultimate's meter half filled, +5 mana)
  b = arena();
  h = spawn(b, 'knight', 3, 9, gradeBoost(1, 0, ULT_LEVEL));
  h.charge2 = 0;
  b.spells.mana = 0;
  spawn(b, 'lichKing', 4, 1, { hp: 30 });
  call(b, 'voltara');
  assert.ok((h.charge2 ?? 0) >= CHARGE_MAX * RIDER.CHARGE - 1, `charge2 ${h.charge2}`);
  assert.ok(b.spells.mana >= RIDER.MANA && b.spells.mana <= MANA_MAX);
  // (Gorm: stone skin for 10 s, the boss stunned)
  b = arena();
  h = spawn(b, 'knight', 3, 9);
  const g = spawn(b, 'orcWarlord', 4, 1, { hp: 30 });
  call(b, 'gorm');
  assert.ok((h.guardUntil ?? 0) >= b.t + RIDER.SKIN_MS - 100);
  assert.ok((g.stunUntil ?? 0) > b.t);
  // (Vaelkhar: the boss's shield gone; the heroes drain a quarter of what they deal)
  b = arena();
  h = spawn(b, 'knight', 3, 9);
  const v = spawn(b, 'orcWarlord', 4, 1, { hp: 30 });
  v.shield = { hp: 500, until: 999999 };
  call(b, 'vaelkhar');
  assert.equal(v.shield, undefined);
  h.hp = 10;
  h.dealt = (h.dealt ?? 0) + 400;
  stepBattle(b);
  assert.ok(h.hp >= 10 + 100 - 1, `drained to ${h.hp}`);
  assert.equal(EIDOLONS.length, 6);
});

test('the horn fills per mode: boss waves 100, ordinary foes 1, auto-replay half; practice, a loss or a call add nothing', () => {
  assert.equal(HORN_FULL, 1000);
  assert.equal(hornGain({ won: true, boss: 'boss', foes: 0 }), 100);
  assert.equal(hornGain({ won: true, foes: 7 }), 7);
  assert.equal(hornGain({ won: true, boss: 'boss', foes: 6, auto: true }), 53);
  assert.equal(hornGain({ won: true, boss: 'guardian', foes: 0 }), 100);
  assert.equal(hornGain({ won: true, boss: 'elite', foes: 0 }), HORN.ELITE);
  assert.equal(hornGain({ won: false, boss: 'boss', foes: 9 }), 0);
  assert.equal(hornGain({ won: true, boss: 'boss', foes: 9, counts: false }), 0);
  assert.equal(hornGain({ won: true, boss: 'boss', foes: 9, called: true }), 0);
  // (the Last Stand: half, at most 300 a run, none with a call)
  assert.equal(standHornGain(2, 60), 130);
  assert.equal(standHornGain(8, 900), HORN.STAND_CAP);
  assert.equal(standHornGain(2, 60, true), 0);
  // (read from a run: an army's boss wave, a wave of ordinary foes, the daily's practice)
  const run = armyRun(3, 'orcs');
  const last = run.stage;
  const b = startStage(run);
  b.units.filter((u) => u.side === 'foe').forEach((u) => (u.alive = false));
  const f = hornFightOf(run, last, b, true);
  assert.equal(f.boss, undefined);
  assert.ok(f.foes > 0);
  const bossWave = armyById('orcs')!.waves.findIndex((w) => w.boss) + 1;
  assert.equal(hornFightOf(run, bossWave, b, true).boss, 'boss', 'a boss wave');
  const practice = dailyRun(20260101, true);
  assert.equal(hornFightOf(practice, 1, b, true).counts, false);
  assert.equal(hornGain(hornFightOf(practice, 1, b, true)), 0);
  armEidolon(b, 'askel');
  b.eidolon!.called = 1;
  assert.equal(hornFightOf(run, bossWave, b, true).called, true);
});

test('the horn waits when full, empties when blown, needs an Eidolon bound, and keeps its fill when another is chosen', () => {
  const m = startedMeta(1);
  assert.equal(addHorn(m, 640).fill, 640);
  const add = addHorn(m, 500);
  assert.equal(add.fill, HORN_FULL);
  assert.equal(add.added, 360);
  assert.equal(add.filled, true);
  const more = addHorn(m, 100);
  assert.equal(more.added, 0, 'full, it waits');
  assert.equal(more.wasFull, true);
  assert.equal(hornReady(m), false, 'no Eidolon has answered yet');
  assert.equal(blowHorn(m), false);
  assert.equal(chooseEidolon(m, 'nivra'), false, 'only one bound may be chosen');
  bindEidolon(m, 'askel');
  bindEidolon(m, 'nivra');
  assert.equal(chosenOf(m), 'askel', 'the first bound answers');
  assert.ok(chooseEidolon(m, 'nivra'));
  assert.equal(m.eidolons!.horn, HORN_FULL, 'choosing keeps the fill');
  assert.ok(hornReady(m));
  assert.ok(blowHorn(m));
  assert.equal(m.eidolons!.horn, 0);
  assert.equal(m.eidolons!.calls, 1);
  assert.equal(blowHorn(m), false);
});

test('saves: an older save has an empty horn; the field is read safely and kept through a load', () => {
  const m = startedMeta(2);
  assert.equal(m.eidolons, undefined);
  assert.equal(readEidolons(undefined), undefined);
  assert.deepEqual(readEidolons({ horn: 5000, bound: ['askel', 'nope', 'askel'], chosen: 'nope', seen: ['x'] }), { horn: HORN_FULL, bound: ['askel'], chosen: 'askel' });
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
  addHorn(m, 250);
  bindEidolon(m, 'gorm');
  store.set('legends.meta', JSON.stringify(m));
  const back = loadMeta(2);
  assert.deepEqual(back.eidolons, { horn: 250, bound: ['gorm'], chosen: 'gorm' });
  delete (m as { eidolons?: unknown }).eidolons;
  store.set('legends.meta', JSON.stringify(m));
  assert.equal(loadMeta(2).eidolons, undefined);
});
