import { bareBoard } from './bare';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { BANNER_MULT, CHARGE_MAX, KITS, finishOf, frenzyOf, onKill, onStrike, sureFooted } from '../src/sim/abilities';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { HERO_TRAITS, TRAITS, membersOf, traitEffects } from '../src/sim/traits';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { SAVES } from '../src/sim/saves';

// (these stage what each skill's row says, its written times and tiles: the saving throws, STATS batch 5, are held off here and staged in
// `test/stats-saves.test.ts`)
SAVES.on = false;

const NEW = ['werewolf', 'minotaur', 'satyr', 'gorgon', 'samuraiCommander'];

/** A flat fight with no fighters on it. */
function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  return b;
}
const spawn = (b: Battle, def: string, u: number, v: number, charge = 0): Unit => {
  const x = addUnit(b, def, u, v);
  x.charge = charge;
  return x;
};
// (stops when the fight ends, since the clock stops with it)
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end && b.phase === 'fight'; ) out.push(...stepBattle(b));
  return out;
};
const skillNamed = (out: BattleEvent[], name: string) => out.some((e) => e.kind === 'skill' && e.name === name);

test('the five beast and commander heroes are registered, with two traits each, and the beasts have forms by grade', () => {
  for (const id of NEW) {
    assert.ok(ALL_HEROES.includes(id), id);
    const d = UNITS[id];
    assert.equal(d.side, 'hero');
    assert.ok(KITS[id].skill.name && KITS[id].passive.name, id);
    assert.equal(HERO_TRAITS[id].length, 2, id);
    // (the commander's pack has one look only)
    if (id !== 'samuraiCommander') assert.equal(d.forms?.length, 3, id);
  }
  // every new hero's kit has its own skill and passive names
  const names = NEW.map((id) => KITS[id].skill.name);
  assert.equal(new Set(names).size, NEW.length);
});

test('the Beast trait unlocks at two and four of its members, and holds four', () => {
  assert.deepEqual(membersOf('beast').sort(), ['gorgon', 'minotaur', 'satyr', 'werewolf']);
  assert.equal(TRAITS.beast.tiers[0].need, 2);
  assert.equal(traitEffects(['werewolf', 'satyr']).atk, TRAITS.beast.tiers[0].effects.atk);
  assert.equal(traitEffects(['werewolf', 'satyr', 'gorgon', 'minotaur']).atk, TRAITS.beast.tiers[1].effects.atk);
  assert.equal(traitEffects(['werewolf']).atk, undefined);
});

test('Frenzy: each kill quickens the werewolf, the kills stack to three and fade after 4s', () => {
  const b = arena();
  const w = spawn(b, 'werewolf', 3, 3);
  assert.equal(frenzyOf(b, w), 1);
  onKill(b, w, []);
  assert.ok(Math.abs(frenzyOf(b, w) - 1.2) < 1e-9);
  for (let i = 0; i < 5; i++) onKill(b, w, []);
  assert.equal(w.frenzy!.n, 3);
  assert.ok(Math.abs(frenzyOf(b, w) - 1.6) < 1e-9);
  b.t += 4000;
  assert.equal(frenzyOf(b, w), 1);
});

test('Frenzy: after a kill the werewolf swings faster, and the kill event is shown', () => {
  const b = arena();
  const w = spawn(b, 'werewolf', 3, 3);
  const s = spawn(b, 'skeleton', 3, 4);
  s.hp = 1;
  // (a foe that stays out of reach, so the fight goes on after the kill)
  spawn(b, 'skeleton', 6, 8).hp = 99999;
  const out = run(b, 1500);
  assert.ok(out.some((e) => e.kind === 'hit' && e.by === w.id && e.killed));
  assert.ok(out.some((e) => e.kind === 'frenzy' && e.by === w.id && e.n === 1));
  // its next swing comes a fifth sooner
  // (it has walked on after the kill, so the new foe stands beside it)
  const f = spawn(b, 'skeleton', w.u - 1, w.v);
  f.hp = 99999;
  w.busyUntil = b.t;
  const t = b.t;
  const next = run(b, 100);
  assert.ok(next.some((e) => e.kind === 'swing' && e.by === w.id && e.to === f.id), 'swings at the new foe');
  assert.equal(w.busyUntil - (t + 100), Math.round(UNITS.werewolf.atkMs / 1.2));
});

test('Ravage bites the weakest foe for double and heals half of the damage it deals', () => {
  const b = arena();
  const w = spawn(b, 'werewolf', 3, 3, CHARGE_MAX);
  w.hp = 50;
  const s = spawn(b, 'boarKing', 3, 4);
  s.hp = 900;
  const out = run(b, 100);
  assert.ok(skillNamed(out, 'Ravage'));
  const dealt = 900 - s.hp;
  assert.ok(dealt > 0);
  assert.equal(w.hp - 50, Math.round(dealt * 0.5));
});

// (RPG-SPELLS batch 7: the hero's gore launches the foe 2 tiles, where it knocked it back one; the maze minotaurs keep the knock back)
test('Gore Charge: the minotaur charges up a free line, hits, launches and stuns the foe', () => {
  const b = arena();
  const m = spawn(b, 'minotaur', 1, 4, CHARGE_MAX);
  const s = spawn(b, 'skeleton', 4, 4);
  const hp = s.hp;
  const out = run(b, 100);
  assert.ok(skillNamed(out, 'Gore Charge'));
  assert.equal(m.u, 3, 'lands on the last free tile before the foe');
  assert.ok(out.some((e) => e.kind === 'dash' && e.by === m.id));
  assert.ok(s.hp < hp);
  assert.equal(s.u, 6, 'launched 2 tiles');
  assert.ok(s.busyUntil >= b.t + 1400, 'stunned');
});

test('Gore Charge needs a foe in a straight line within four tiles', () => {
  const b = arena();
  const m = spawn(b, 'minotaur', 0, 4, CHARGE_MAX);
  spawn(b, 'skeleton', 6, 0);
  run(b, 300);
  assert.equal(m.charge, CHARGE_MAX, 'the charge waits');
});

test('Gore Charge does not knock back a foe that is steady (Stand Firm)', () => {
  const b = arena();
  const m = spawn(b, 'minotaur', 1, 4, CHARGE_MAX);
  const c = spawn(b, 'samuraiCommander', 4, 4);
  c.side = 'foe';
  run(b, 100);
  assert.equal(c.u, 4, 'stays where it stood');
  assert.ok(c.busyUntil >= b.t + 1000, 'still stunned');
  assert.equal(m.u, 3);
});

test('Stand Firm: Wind Gust hurts a steady commander but does not shove it', () => {
  const b = arena();
  const y = spawn(b, 'yamabushi', 3, 3, CHARGE_MAX);
  const c = spawn(b, 'samuraiCommander', 3, 2);
  c.side = 'foe';
  const hp = c.hp;
  run(b, 100);
  assert.ok(c.hp < hp, 'the gust still hurts');
  assert.equal(c.u, 3);
  assert.equal(c.v, 2, 'not pushed back');
  assert.equal(y.u, 3);
});

test('Trample: blows deal 15% more to a foe under half health (STATS batch 4, the owner\u2019s answer: a quarter before; the maze minotaurs keep a quarter)', () => {
  const b = arena();
  const m = spawn(b, 'minotaur', 0, 0);
  const s = spawn(b, 'skeleton', 0, 1);
  assert.equal(finishOf(m, s), 1);
  s.hp = Math.floor(s.maxHp * 0.4);
  assert.equal(finishOf(m, s), 1.15);
  const maze = spawn(b, 'mazeMino1', 1, 1);
  assert.equal(finishOf(maze, s), 1.25);
  const k = spawn(b, 'knight', 1, 0);
  s.hp = Math.floor(s.maxHp * 0.4);
  assert.equal(finishOf(k, s), 1, 'only the minotaur has it');
});

test('Pipes of Pan hastes the allies within three tiles, and needs an ally to play to', () => {
  const b = arena();
  const sat = spawn(b, 'satyr', 3, 3, CHARGE_MAX);
  const ally = spawn(b, 'knight', 3, 5);
  const far = spawn(b, 'archer', 0, 8);
  spawn(b, 'skeleton', 0, 0);
  const out = run(b, 100);
  assert.ok(skillNamed(out, 'Pipes of Pan'));
  assert.ok(out.some((e) => e.kind === 'song' && e.by === sat.id));
  assert.ok(ally.hasteUntil !== undefined && ally.hasteUntil > b.t);
  assert.ok(sat.hasteUntil !== undefined && sat.hasteUntil > b.t);
  assert.equal(far.hasteUntil, undefined, 'out of reach');

  const alone = arena();
  const solo = spawn(alone, 'satyr', 3, 3, CHARGE_MAX);
  spawn(alone, 'skeleton', 3, 8);
  run(alone, 100);
  assert.equal(solo.charge, CHARGE_MAX, 'alone, the song waits');
});

test('Sure Hooves: a satyr climbs a ledge at no extra cost, the others pay for the height', () => {
  const step = (kind: string) => {
    const b = arena();
    b.board.tiles[0 * b.board.w + 1].h = 1;
    const m = spawn(b, kind, 0, 0);
    spawn(b, 'skeleton', 2, 0);
    stepBattle(b);
    return m.step!.ms;
  };
  assert.ok(sureFooted({ def: 'satyr' } as Unit));
  assert.ok(!sureFooted({ def: 'knight' } as Unit));
  assert.equal(step('satyr'), Math.round(UNITS.satyr.moveMs));
  assert.equal(step('knight'), Math.round(UNITS.knight.moveMs * 2));
});

test('Petrifying Gaze: the gorgon stiffens the strongest foe it sees, which is hit and stunned for 3s', () => {
  const b = arena();
  const g = spawn(b, 'gorgon', 0, 4, CHARGE_MAX);
  spawn(b, 'skeleton', 4, 4);
  const strong = spawn(b, 'orcBrute', 3, 4);
  const out = run(b, 100);
  assert.ok(skillNamed(out, 'Petrifying Gaze'));
  assert.ok(out.some((e) => e.kind === 'gaze' && e.by === g.id && e.to === strong.id));
  assert.ok(strong.busyUntil >= b.t + 2900, 'stunned about 3s');
});

test('Petrifying Gaze needs a foe it can see within five tiles', () => {
  const b = arena();
  const g = spawn(b, 'gorgon', 0, 0, CHARGE_MAX);
  spawn(b, 'skeleton', 6, 8);
  run(b, 300);
  assert.equal(g.charge, CHARGE_MAX);
});

test('Scaled Hide: the gorgon takes a fifth less from shots, and the same from melee', () => {
  const b = arena();
  const g = spawn(b, 'gorgon', 3, 3);
  const archer = spawn(b, 'boneArcher', 3, 0);
  const brute = spawn(b, 'orcBrute', 3, 4);
  assert.equal(onStrike(b, archer, g, 100, 'blow', false, []), 80);
  assert.equal(onStrike(b, brute, g, 100, 'blow', false, []), 100);
});

test('War Banner raises the attack of the allies within three tiles, once, and fades', () => {
  const b = arena();
  const c = spawn(b, 'samuraiCommander', 3, 3, CHARGE_MAX);
  const k = spawn(b, 'knight', 3, 5);
  const far = spawn(b, 'archer', 0, 8);
  spawn(b, 'skeleton', 0, 0);
  const out = run(b, 100);
  assert.ok(skillNamed(out, 'War Banner'));
  assert.ok(out.some((e) => e.kind === 'banner' && e.by === c.id));
  assert.equal(k.power, BANNER_MULT);
  assert.equal(c.power, BANNER_MULT);
  assert.equal(far.power, undefined, 'out of reach');
  // a second banner does not raise the attack again
  c.charge = CHARGE_MAX;
  c.busyUntil = 0;
  run(b, 100);
  assert.equal(k.power, BANNER_MULT);
  // it fades after 6s, and the attack is back to what it was
  run(b, 6000);
  assert.equal(k.power, 1);
  assert.equal(k.banner, undefined);
});

test('War Banner needs an ally other than the commander', () => {
  const b = arena();
  const c = spawn(b, 'samuraiCommander', 3, 3, CHARGE_MAX);
  spawn(b, 'skeleton', 3, 8);
  run(b, 100);
  assert.equal(c.charge, CHARGE_MAX);
});

test('every new hero is in the fight and fires its skill without the simulation breaking', () => {
  for (const id of NEW) {
    const b = arena();
    const h = spawn(b, id, 3, 6, CHARGE_MAX);
    const f = spawn(b, 'skeleton', 3, 2);
    f.hp = 40000;
    h.side = 'hero';
    run(b, 2000);
    assert.ok(Number.isFinite(h.hp) && Number.isFinite(f.hp), id);
  }
  // the unit placement path works too
  const b = startBattle(3);
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  NEW.forEach((id, i) => place(b, id, ...spots[i * 2]));
  assert.equal(b.units.filter((x) => x.side === 'hero').length, NEW.length);
});
