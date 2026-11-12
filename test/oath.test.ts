// Dynasties, phase 7: the Legend Oath and the Shades (src/sim/oath.ts, the Shade's strike in src/sim/eidolons.ts; docs/notes/dynasty-7.md).
// Slain only under the Oath and only by its two rules; the progress intact; a trained heir taking up the mantle at once, or the 3-day
// mourning and the foundling; the Shades once a fight, never on auto, their shares, riders and slayer; Legend renown and Legend-slayers;
// the Oath's pay; and the readers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bareBoard } from './bare';
import { addUnit, fight, place, startBattle, stepBattle, type Battle, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, ULT_LEVEL } from '../src/sim/abilities';
import { armEidolon, armShade, canCallEidolon, SHADE, SHADE_ID, type ShadeFight } from '../src/sim/eidolons';
import { orderEidolon, replayLog } from '../src/sim/orders';
import { bindEidolon, chooseEidolon, readEidolons } from '../src/sim/warHorn';
import { nemSpare } from '../src/sim/nemesisTraits';
import { bearerOf, dayNumber, fieldedOf, lineOf, openDynasty, readDynasty } from '../src/sim/dynasty';
import { changeHonour, fieldBearer, heirState, nameHeir, passMantle, whyNoHeir, whyNotHonour } from '../src/sim/heirs';
import {
  armyParty, canSwear, chooseShade, ghostOf, hasFallen, isLegend, mourning, mourningLeft, noteOathRises, OATH, oathCrowns, oathOpen, oathPay, settleMourning, settleOath, shadeChosen, shadeFight, shadesOf, slainKind, slayBearer,
  swearOath, whyNoOath, whyNoShade, whyShadeHonour,
} from '../src/sim/oath';
import { armyRun, canJoin, gradeBoost, recruit, type Run } from '../src/sim/run';
import { startedMeta, type Meta } from '../src/sim/meta';
import { xpFor } from '../src/sim/levels';
import { bondKey, BOND_POINTS } from '../src/sim/bonds';
import { newWar } from '../src/sim/nemesis';
import { TROPHY_DAY } from '../src/sim/council';
import { grantEquipment, equipItem } from '../src/sim/equipment';
import { mixSeed, Rng } from '../src/sim/rng';
import { deploySpots } from '../tools/heroSweep';
import { REST } from '../src/sim/statRest';
import type { NemesisTally } from '../src/sim/nemesisLog';

const START = 20261102;
const NOW = Date.UTC(2026, 10, 6);
const DAY = 86_400_000;
const dayAfter = (n: number): number => {
  const d = new Date(Date.UTC(2026, 10, 2) + n * DAY);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};
const gash = (id = 7) => ({ id, base: 'orcGrunt', army: 'orcs', name: 'Gash', epithet: 'the Lieutenant', rank: 'lieutenant' as const, loyalty: 50, might: 3, scars: 0, traits: [], weak: [], known: [], memory: [], met: 1, lost: 0, born: 0 });

/** A save with the Oath open (the archer's line has passed its mantle once), the knight a Veteran of level 70, Sworn with the peasant. */
function sworn(): Meta {
  const m = startedMeta(9);
  m.unlocked = [...m.unlocked, 'peasant', 'paladin', 'ranger'];
  openDynasty(m, START);
  m.xp.knight = xpFor(70);
  m.dynasty!.lines.knight.bearers[0].served = 7;
  m.bonds = { [bondKey('knight', 'peasant')]: BOND_POINTS[2] };
  const archer = m.dynasty!.lines.archer;
  archer.bearers.push({ name: 'Wren', gen: 2, served: 0 });
  archer.current = 1;
  m.war = newWar();
  m.war.members.push(gash());
  return m;
}
/** An army run on Hard with the party's heroes hired and in the squad. */
function oathRun(m: Meta, oath = true): Run {
  const run = armyRun(5, 'orcs', m.party, m.castle, 1);
  for (const k of m.party) run.squad.push(recruit(run, k).id);
  if (oath) assert.ok(swearOath(m, run));
  return run;
}
/** A settled fight's board: the run's heroes, those named down; a foe that slew the first of them, if `by` is given (its nemesis id). */
function board(run: Run, down: string[], by?: number): { b: Battle; tally?: NemesisTally } {
  const units = run.roster.map((h, i) => ({ id: i + 1, side: 'hero', alive: !down.includes(h.kind), tag: h.id, def: h.kind }) as unknown as Unit);
  if (by === undefined) return { b: { units } as unknown as Battle };
  const foe = { id: 99, side: 'foe', alive: true, def: 'orcGrunt', nem: { id: by } } as unknown as Unit;
  const slew = units.filter((u) => !u.alive).map((u) => u.id);
  return { b: { units: [...units, foe] } as unknown as Battle, tally: { foes: { 99: { slewIds: slew } }, healed: {}, had: {} } as never };
}
const settle = (m: Meta, run: Run, down: string[], won: boolean, opts: { by?: number; day?: number; now?: number } = {}) => {
  const { b, tally } = board(run, down, opts.by);
  return settleOath(m, run, b, won, { tally, now: opts.now ?? NOW, day: opts.day ?? START })!;
};

test('swearing the Oath: per run, on Hard or harder, from the first Passing of the Mantle; auto never swears it', () => {
  const m = startedMeta(9);
  openDynasty(m, START);
  assert.equal(oathOpen(m), false);
  assert.match(whyNoOath(m, 2)!, /Passing of the Mantle/);
  const run = armyRun(5, 'orcs', m.party, m.castle, 2);
  assert.equal(swearOath(m, run), false);
  assert.equal(run.oath, undefined);
  m.dynasty!.lines.knight.bearers.push({ name: 'Cadet', gen: 2, served: 0, cadet: true });
  assert.equal(oathOpen(m), false, 'a cadet is not a Passing of the Mantle');
  m.dynasty!.lines.archer.bearers.push({ name: 'Wren', gen: 2, served: 0 });
  assert.ok(oathOpen(m));
  assert.match(whyNoOath(m, 0)!, /Hard/);
  assert.equal(canSwear(m, 1), true);
  assert.equal(swearOath(m, armyRun(5, 'orcs', m.party, m.castle, 0)), false, 'never on Normal');
  assert.ok(swearOath(m, run));
  assert.equal(run.oath, true);
  // (the next run marches free of it)
  assert.equal(armyRun(6, 'orcs', m.party, m.castle, 2).oath, undefined);
  // (the auto-replay marches plain: nothing in it swears)
  for (const f of ['src/sim/autoReplay.ts', 'src/sim/autoplay.ts']) assert.ok(!readFileSync(f, 'utf8').includes('swearOath'), f);
});

test('slain only under the Oath and only by its two rules: a second fall in the run, or a fall in a wave that is lost', () => {
  const m = sworn();
  // (no Oath: nothing at all)
  const free = oathRun(m, false);
  assert.equal(settleOath(m, free, board(free, ['knight']).b, false, { now: NOW, day: START }), null);
  assert.equal(bearerOf(m, 'knight')!.fate, undefined);
  // (under the Oath: one fall in a wave won is a fall, not a death)
  const run = oathRun(m);
  let n = settle(m, run, ['knight'], true);
  assert.deepEqual(n.slain, []);
  assert.equal(bearerOf(m, 'knight')!.fate, undefined);
  // (a wave won where nobody falls: still none)
  n = settle(m, run, [], true);
  assert.deepEqual(n.slain, []);
  // (the second fall in the run: slain)
  n = settle(m, run, ['knight', 'samurai'], true);
  assert.deepEqual(n.slain.map((s) => s.kind), ['knight']);
  assert.equal(lineOf(m, 'knight')!.bearers[0].fate, 'fallen');
  assert.equal(bearerOf(m, 'samurai')!.fate, undefined, 'a first fall is not');
  // (a wave lost: every hero who fell in it is slain, the falls a life raised among them: TEN-LIVES)
  const run2 = oathRun(m);
  noteOathRises(run2, [run2.roster.find((h) => h.kind === 'samurai')!.id]);
  n = settle(m, run2, ['wizard'], false);
  assert.deepEqual(n.slain.map((s) => s.kind).sort(), ['samurai', 'wizard']);
  // (a life's rise counts a fall: the second, at the wave's end, slays even in a wave won)
  const m2 = sworn();
  const run3 = oathRun(m2);
  noteOathRises(run3, [run3.roster.find((h) => h.kind === 'wizard')!.id]);
  assert.deepEqual(settle(m2, run3, ['wizard'], true).slain.map((s) => s.kind), ['wizard']);
});

test('what dies is the person, not the progress: every lasting thing of the kind is untouched; the kind sits out the rest of the run', () => {
  const m = sworn();
  const sword = grantEquipment(m, { base: 'ironSword', rarity: 3, level: 5 });
  equipItem(m, 'knight', sword.id);
  m.shards = { ...(m.shards ?? {}), knight: 12 };
  const before = JSON.stringify([m.xp, m.equipment, m.equipped, m.shards, m.stars, m.talents, m.books, m.skillUse, m.awakened, m.party, m.unlocked]);
  const run = oathRun(m);
  settle(m, run, ['knight'], false);
  assert.equal(JSON.stringify([m.xp, m.equipment, m.equipped, m.shards, m.stars, m.talents, m.books, m.skillUse, m.awakened, m.party, m.unlocked]), before);
  const k = run.roster.find((h) => h.kind === 'knight')!;
  assert.ok(slainKind(run, 'knight'));
  assert.ok(!run.squad.includes(k.id));
  assert.equal(canJoin(run, k.id), false);
  assert.ok(!run.pool!.includes('knight'), 'no hire draws it again');
  // (another of its kind hired is refused too: the line's person is gone for the run)
  const again = recruit(run, 'knight');
  assert.equal(canJoin(run, again.id), false);
  // (the rest of the party marches on)
  assert.ok(run.squad.length >= 4);
});

test('a trained heir takes up the mantle at once, with a Blood Grudge on the slayer', () => {
  const m = sworn();
  assert.ok(nameHeir(m, 'knight', 'peasant', NOW, START));
  const later = NOW + 7 * DAY;
  assert.equal(heirState(m, 'knight', later).state, 'ready');
  const run = oathRun(m);
  const n = settle(m, run, ['knight'], false, { by: 7, now: later, day: dayAfter(7) });
  assert.equal(n.slain[0].then, 'heir');
  assert.equal(n.slain[0].by, 7);
  const line = lineOf(m, 'knight')!;
  const heir = bearerOf(m, 'knight')!;
  assert.equal(heir.gen, 2);
  assert.equal(heir.grudge, 7);
  assert.equal(line.bearers[0].fate, 'fallen');
  assert.equal(line.bearers[0].slainBy, 7);
  assert.equal(line.bearers[0].slayer, 'Gash the Lieutenant');
  assert.ok(line.bearers.some((b) => b.cadet), 'the passed-over candidate is the cadet line');
  assert.equal(line.mourning, undefined, 'no mourning');
  assert.equal(mourning(m, 'knight', dayAfter(7)), false);
  assert.match(n.lines[0], /takes up the mantle/);
});

test('mourning for 3 days, then a foundling heir (a generation on, no birthright, a Blood Grudge on the slayer); the kind kept out of the armies', () => {
  const m = sworn();
  const run = oathRun(m);
  const n = settle(m, run, ['knight'], false, { by: 7 });
  assert.equal(n.slain[0].then, 'mourning');
  for (const d of [0, 1, 2]) {
    assert.ok(mourning(m, 'knight', dayAfter(d)), `day ${d}`);
    assert.deepEqual(settleMourning(m, NOW, dayAfter(d)), []);
  }
  assert.equal(mourningLeft(m, 'knight', START), OATH.MOURN_DAYS);
  assert.ok(!armyParty(m, START).includes('knight'), 'the House cannot march');
  assert.ok(m.party.includes('knight'), 'but the party is the player’s as it was');
  assert.ok(hasFallen(lineOf(m, 'knight')));
  assert.equal(ghostOf(m, 'knight')?.name, 'Kwame', 'its ghost keeps its seat until the next bearer comes');
  assert.match(whyNoHeir(m, 'knight')!, /mourning/);
  const lines = settleMourning(m, NOW, dayAfter(3));
  assert.equal(lines.length, 1);
  const f = bearerOf(m, 'knight')!;
  assert.equal(f.foundling, true);
  assert.equal(f.gen, 2);
  assert.equal(f.birthright, undefined);
  assert.equal(f.grudge, 7);
  assert.equal(lineOf(m, 'knight')!.mourning, undefined);
  assert.equal(mourning(m, 'knight', dayAfter(3)), false);
  assert.ok(armyParty(m, dayAfter(3)).includes('knight'));
  assert.equal(ghostOf(m, 'knight'), undefined);
  assert.equal(settleMourning(m, NOW, dayAfter(4)).length, 0, 'once');
  // (a slayer gone by then leaves no grudge)
  const m2 = sworn();
  settle(m2, oathRun(m2), ['knight'], false, { by: 7 });
  m2.war!.members = [];
  settleMourning(m2, NOW, dayAfter(3));
  assert.equal(bearerOf(m2, 'knight')!.grudge, undefined);
});

test('an elder fielded in the heir’s place who is slain falls; the heir holds the House', () => {
  const m = sworn();
  assert.ok(nameHeir(m, 'knight', 'peasant', NOW, START));
  const later = NOW + 7 * DAY;
  assert.ok(passMantle(m, 'knight', { pick: 0, honour: 'regular' }, later, dayAfter(7)));
  assert.ok(fieldBearer(m, 'knight', 0));
  assert.equal(fieldedOf(m, 'knight')!.name, 'Kwame');
  const s = slayBearer(m, 'knight', undefined, later, dayAfter(7))!;
  assert.equal(s.then, 'elder');
  const line = lineOf(m, 'knight')!;
  assert.equal(line.bearers[0].fate, 'fallen');
  assert.equal(line.field, undefined);
  assert.ok(!m.dynasty!.regulars?.includes('knight'), 'it leaves the Elders’ table');
  assert.equal(bearerOf(m, 'knight')!.fate, undefined);
  assert.equal(line.mourning, undefined);
  // (the fallen cannot take an honour or the field again)
  assert.equal(changeHonour(m, 'knight', 0, 'mentor', later + 30 * DAY, dayAfter(40)), false);
  assert.equal(fieldBearer(m, 'knight', 0), false);
});

test('Legend renown: each bearer of an Oath run cleared; three clears make a Legend; its slayer is a Legend-slayer (+2 Might, its name)', () => {
  const m = sworn();
  for (let i = 0; i < OATH.LEGEND; i++) {
    const run = oathRun(m);
    run.cleared = true;
    const n = settle(m, run, [], true, { day: dayAfter(i) });
    assert.ok(n.renown.includes('Kwame'));
  }
  assert.equal(bearerOf(m, 'knight')!.legend, 3);
  assert.ok(isLegend(bearerOf(m, 'knight')));
  // (a run not cleared gives none)
  const run = oathRun(m);
  assert.deepEqual(settle(m, run, [], true).renown, []);
  // (no renown without the Oath)
  const free = oathRun(m, false);
  free.cleared = true;
  assert.equal(settleOath(m, free, board(free, []).b, true, { now: NOW, day: START }), null);
  // (the Legend slain: its slayer +2 Might and the bearer's name in its epithet)
  const s = slayBearer(m, 'knight', 7, NOW, START)!;
  assert.equal(s.legend, true);
  const g = m.war!.members[0];
  assert.equal(g.might, 5);
  assert.equal(g.epithet, 'Kwame-Killer');
  assert.equal(lineOf(m, 'knight')!.bearers[0].slayer, 'Gash, Kwame-Killer');
  // (an ordinary bearer's slayer gains nothing)
  const m2 = sworn();
  slayBearer(m2, 'samurai', 7, NOW, START);
  assert.equal(m2.war!.members[0].might, 3);
});

test('the Oath pays: ×1.3 crowns and XP (the design’s bar), and +1 War Trophy a wave won, inside the daily cap', () => {
  const m = sworn();
  const run = oathRun(m);
  assert.equal(oathPay(run), 1.3);
  assert.equal(oathPay(oathRun(m, false)), 1);
  const pay = { crowns: 100 };
  const was = m.crowns;
  assert.equal(oathCrowns(m, pay, run), 30);
  assert.equal(pay.crowns, 130);
  assert.equal(m.crowns, was + 30);
  assert.equal(oathCrowns(m, { crowns: 100 }, oathRun(m, false)), 0);
  const t0 = m.war!.trophies;
  assert.equal(settle(m, run, [], true).trophies, 1);
  assert.equal(settle(m, run, [], false).trophies, 0, 'a wave lost pays none');
  assert.equal(m.war!.trophies, t0 + 1);
  m.war!.trophyDay = { key: START, got: TROPHY_DAY };
  assert.equal(settle(m, run, [], true).trophies, 0, 'the daily cap holds');
});

// ---- the Shades -------------------------------------------------------------------------------------------------------------------

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}
const spawn = (b: Battle, def: string, u: number, v: number, boost = {}): Unit => addUnit(b, def, u, v, boost);
const share = (u: Unit) => (u.maxHp - u.hp) / u.maxHp;
const shade = (calling: ShadeFight['calling'], slayer?: number): ShadeFight => ({ kind: 'knight', name: 'Kwame', calling, ...(slayer !== undefined ? { slayer } : {}) });

test('the Shade’s strike: ordinary foes 60%, elites and mid-bosses 35%, last bosses 20%; its slayer 60%, and it cannot cheat death', () => {
  const b = arena();
  spawn(b, 'knight', 3, 9);
  const plain = spawn(b, 'skeleton', 1, 1, { hp: 40 });
  const elite = spawn(b, 'eliteGorrak', 3, 1, { hp: 5 });
  const boss = spawn(b, 'lichKing', 5, 1, { hp: 8 });
  const slayer = spawn(b, 'orcGrunt', 7, 1, { hp: 6 });
  slayer.nem = { id: 7, name: 'Gash', rank: 'lieutenant', traits: ['survivor'], weak: [] };
  assert.ok(armShade(b, shade('martial', 7)));
  assert.ok(orderEidolon(b, SHADE_ID));
  const ev = stepBattle(b);
  assert.ok(Math.abs(share(plain) - SHADE.FIELD) < 0.02, `plain ${share(plain)}`);
  assert.ok(Math.abs(share(elite) - SHADE.ELITE) < 0.02, `elite ${share(elite)}`);
  assert.ok(Math.abs(share(boss) - SHADE.BOSS) < 0.02, `boss ${share(boss)}`);
  assert.ok(Math.abs(share(slayer) - SHADE.SLAYER) < 0.02, `slayer ${share(slayer)}`);
  assert.deepEqual([SHADE.FIELD, SHADE.ELITE, SHADE.BOSS, SHADE.SLAYER], [0.6, 0.35, 0.2, 0.6]);
  assert.deepEqual(ev.filter((e) => e.kind === 'eidolon').map((e) => (e as { phase: string }).phase), ['call', 'done']);
  // (weaker than any Eidolon: an Eidolon's least is 25%, its field 100%)
  assert.ok(SHADE.FIELD < 1 && SHADE.BOSS < 0.25);
  // (its slayer cannot cheat death this fight: the Survivor's stand is refused)
  assert.equal(slayer.nem!.doomed, true);
  slayer.hp = 0;
  assert.equal(nemSpare(slayer, []), false);
  // (a Survivor not its slayer still stands, as ever)
  const other = { nem: { id: 8, name: 'Throg', rank: 'lieutenant', traits: ['survivor'], weak: [] }, hp: 0, maxHp: 100 } as unknown as Unit;
  assert.equal(nemSpare(other, []), true);
  // (once a fight)
  assert.equal(canCallEidolon(b), false);
  assert.equal(armShade(b, shade('wild')), false);
});

test('the Shade’s riders by calling: martial +20% attack for 8 s, arcane meters +25%, devout healed 30% and cleansed, wild hasted 6 s', (t) => {
  REST.herald = false;
  t.after(() => void (REST.herald = true));
  const go = (c: ShadeFight['calling']): { b: Battle; h: Unit } => {
    const b = arena();
    const h = spawn(b, 'knight', 3, 9);
    spawn(b, 'skeleton', 1, 1, { hp: 40 });
    armShade(b, shade(c));
    orderEidolon(b, SHADE_ID);
    return { b, h };
  };
  let { b, h } = go('martial');
  const p0 = h.power ?? 1;
  stepBattle(b);
  assert.ok(Math.abs((h.power ?? 1) / p0 - SHADE.ATK) < 1e-9);
  while (b.t < SHADE.ATK_MS + 300 && b.phase === 'fight') stepBattle(b);
  assert.ok(Math.abs((h.power ?? 1) - p0) < 1e-9, 'and back after 8 s');
  ({ b, h } = go('arcane'));
  h.charge = 0;
  h.charge2 = 0;
  stepBattle(b);
  assert.ok((h.charge2 ?? 0) + h.charge >= CHARGE_MAX * SHADE.CHARGE - 1);
  ({ b, h } = go('devout'));
  h.hp = Math.round(h.maxHp * 0.4);
  const hp0 = h.hp;
  stepBattle(b);
  assert.ok(h.hp - hp0 >= Math.round(h.maxHp * SHADE.HEAL) - 2, `${h.hp - hp0}`);
  ({ b, h } = go('wild'));
  stepBattle(b);
  assert.ok((h.hasteUntil ?? 0) >= SHADE.HASTE_MS);
});

/** A fight of the starting five against orcs; a Shade armed, and called at `at` (or replayed from `log`). */
function playShade(seed: number, opts: { arm?: boolean; at?: number; log?: Battle['log'] } = {}): { b: Battle; trace: string } {
  const b = startBattle(seed, 'orcs', { foes: { hp: 4, atk: 2 } });
  const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
  ['knight', 'reaper', 'werewolf', 'timeWitch', 'dreadPirate'].forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, gradeBoost(1, 0, ULT_LEVEL)));
  if (opts.arm !== false) armShade(b, shade('devout'));
  fight(b);
  let trace = '';
  while (b.phase === 'fight') {
    if (opts.log) replayLog(b, opts.log);
    else if (opts.at !== undefined && b.t === opts.at) orderEidolon(b, SHADE_ID);
    for (const e of stepBattle(b)) if (e.kind === 'hit' || e.kind === 'skill' || e.kind === 'eidolon') trace += `${b.t}:${e.kind}:${'by' in e ? e.by : ''}:${'to' in e ? e.to : ''};`;
  }
  return { b, trace };
}

test('the Shade: replays from the log, never called by a headless fight (Auto), and an armed fight never called plays as before', () => {
  const first = playShade(21, { at: 3000 });
  assert.ok(first.trace.includes(':eidolon:'));
  assert.equal(playShade(21, { log: first.b.log }).trace, first.trace);
  // (armed but never called: exactly the fight without one; nothing headless calls it)
  const armed = playShade(21);
  assert.equal(armed.b.eidolon?.called, undefined);
  assert.equal(armed.trace, playShade(21, { arm: false }).trace);
  for (const f of ['src/sim/autoplay.ts', 'src/sim/autoReplay.ts', 'src/sim/autoCast.ts', 'src/sim/battle.ts']) assert.ok(!readFileSync(f, 'utf8').includes('armShade'), f);
});

test('the Shades on the War Horn: the fallen and the Shade honour; greyed until the horn is held; chosen in the Eidolon’s place', () => {
  const m = sworn();
  m.xp.knight = xpFor(100);
  slayBearer(m, 'samurai', 7, NOW, START);
  const list = shadesOf(m);
  assert.deepEqual(list.map((s) => s.key), ['samurai:0']);
  // (no horn yet: greyed, as is the Shade honour)
  assert.match(whyNoShade(m, list[0])!, /War Horn/);
  assert.match(whyShadeHonour(m)!, /Greyed/);
  assert.equal(chooseShade(m, 'samurai:0'), false);
  bindEidolon(m, 'askel');
  assert.equal(whyNoShade(m, list[0]), null);
  assert.equal(whyShadeHonour(m), null);
  assert.ok(chooseShade(m, 'samurai:0'));
  const s = shadeChosen(m)!;
  assert.equal(s.bearer.name, 'Kenji');
  const f = shadeFight(m, s);
  assert.equal(f.slayer, 7, 'its slayer, while it lives');
  assert.equal(f.calling, 'martial');
  m.war!.members = [];
  assert.equal(shadeFight(m, s).slayer, undefined);
  // (choosing an Eidolon sends the Shade back)
  chooseEidolon(m, 'askel');
  assert.equal(shadeChosen(m), undefined);
  // (an elder honoured as a Shade at level 100 is one too, and the honour is open with the horn held)
  assert.ok(nameHeir(m, 'knight', 'peasant', NOW, START));
  assert.equal(whyNotHonour(m, 'knight', 'shade', NOW + 7 * DAY), null);
  assert.ok(passMantle(m, 'knight', { pick: 0, honour: 'shade' }, NOW + 7 * DAY, dayAfter(7)));
  assert.ok(shadesOf(m).some((x) => x.key === 'knight:0' && !x.fallen));
  // (the saved choice is read back, and an unknown one ignored where it is used)
  assert.equal(readEidolons({ horn: 0, bound: ['askel'], shade: 'knight:0' })?.shade, 'knight:0');
  assert.equal(readEidolons({ horn: 0, bound: ['askel'], shade: '<x>' })?.shade, undefined);
  m.eidolons!.shade = 'nobody:4';
  assert.equal(shadeChosen(m), undefined);
});

test('the readers: the fallen, their slayer, renown, foundlings and mourning round-trip; a mourning without a fallen bearer is dropped', () => {
  const m = sworn();
  settle(m, oathRun(m), ['knight'], false, { by: 7 });
  const d = readDynasty(JSON.parse(JSON.stringify(m.dynasty)))!;
  const k = d.lines.knight;
  assert.equal(k.bearers[0].fate, 'fallen');
  assert.equal(k.bearers[0].slainBy, 7);
  assert.equal(k.bearers[0].slayer, 'Gash the Lieutenant');
  assert.equal(k.mourning, dayNumber(START) + OATH.MOURN_DAYS);
  const raw = JSON.parse(JSON.stringify(m.dynasty));
  raw.lines.knight.bearers[0].fate = undefined;
  raw.lines.knight.bearers[0].legend = 2.7;
  raw.lines.knight.bearers.push({ name: 'Yaw', gen: 2, served: 0, foundling: true, legend: -3 });
  raw.lines.knight.current = 1;
  const d2 = readDynasty(raw)!;
  assert.equal(d2.lines.knight.mourning, undefined);
  assert.equal(d2.lines.knight.bearers[0].legend, 2);
  assert.equal(d2.lines.knight.bearers[1].foundling, true);
  assert.equal(d2.lines.knight.bearers[1].legend, undefined);
});

test('no fight file reads the Oath; the Shade is a no-op without a call', () => {
  for (const f of ['src/sim/battle.ts', 'src/sim/armies.ts', 'src/sim/ailments.ts', 'src/sim/blow.ts']) assert.ok(!readFileSync(f, 'utf8').includes("from './oath'"), f);
  // (an Eidolon still arms and strikes as before)
  const b = arena();
  spawn(b, 'knight', 3, 9);
  const plain = spawn(b, 'skeleton', 1, 1, { hp: 40 });
  assert.ok(armEidolon(b, 'gorm'));
  orderEidolon(b, 'gorm');
  stepBattle(b);
  assert.equal(plain.alive, false);
});
