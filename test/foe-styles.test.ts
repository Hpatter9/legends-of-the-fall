// FOE-STYLES (`docs/notes/foe-styles.md`): every foe fights its own way, no two foes share a kit, the stronger ones have a skill, and each
// way of fighting does what its words say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { readyBattle } from './helpers';
import { addUnit, atkOf, defOf, fight, flankStep, kiteStep, playOut, startBattle, stepTo, swing, wayTo, type Battle, type BattleEvent } from '../src/sim/battle';
import { afterBlow, gangOf, hasSkill, keyOf, KITS, tryCast, type Kit } from '../src/sim/abilities';
import { CHARGE_MULT, CHARGE_RUN, chargeOf, moveOf, preyOrder, walkOrder, wardOf } from '../src/sim/foeStyles';
import { ARMIES } from '../src/sim/armies';
import { ELITE_FOES } from '../src/sim/eliteFoes';
import { FIELD_BANDS, isBoss } from '../src/sim/foes';
import { AILMENT_SWITCH } from '../src/sim/ailments';
import { Rng } from '../src/sim/rng';
import { UNITS } from '../src/sim/units';

/** Every foe that is not a boss: the common foes, the armies' kinds and the elites. */
const FOE_IDS = Object.values(UNITS).filter((d) => d.side === 'foe' && !isBoss(d.id) && !d.summon).map((d) => d.id);

/** A kit's shape: what it does, not its numbers or words (its skill and ultimate, the kinds of its passive's effects, a rider's kind, its way
 *  of moving). Two foes with the same shape fight the same way, whatever their numbers. */
function shapeOf(k: Kit): string {
  const p = k.passive;
  const parts = Object.keys(p)
    .filter((x) => x !== 'name' && x !== 'text' && x !== 'move')
    .sort()
    .map((x) => (x === 'ignite' ? `ignite:${p.ignite!.kind}` : x === 'rider' ? `rider:${p.rider!.dot}` : x));
  const skill = hasSkill(k) ? keyOf(k.skill) : '-';
  return [skill, k.ultimate ? keyOf(k.ultimate) : '-', parts.join('+'), p.move ?? '-'].join(' | ');
}
/** A kit's every number and word (two kits with the same of these are the same kit). */
const fullOf = (k: Kit): string => JSON.stringify({ s: hasSkill(k) ? { ...k.skill, cast: k.skill.cast.toString() } : null, u: k.ultimate?.name ?? null, p: k.passive });

function deploy(): Battle {
  const b = bareBoard(startBattle(5));
  b.units = [];
  return b;
}

test('every foe has a kit of its own: no two foes (bosses aside) fight the same way, and none fights as a boss does', () => {
  const seen = new Map<string, string>();
  for (const id of FOE_IDS) {
    const k = KITS[id];
    assert.ok(k, `${id} has a kit`);
    const shape = shapeOf(k);
    assert.ok(!seen.has(shape), `${id} fights as ${seen.get(shape)} does: ${shape}`);
    seen.set(shape, id);
  }
  const fulls = new Map(FOE_IDS.map((id) => [fullOf(KITS[id]), id]));
  assert.equal(fulls.size, FOE_IDS.length, 'no two foes share an identical kit');
  for (const boss of Object.keys(UNITS).filter((id) => isBoss(id) && KITS[id])) assert.ok(!fulls.has(fullOf(KITS[boss])), `${boss}'s kit is ${fulls.get(fullOf(KITS[boss]))}'s`);
});

test('the stronger foes have a skill: the armies\' own kinds from the Beast Packs on, and every elite; the common foes fight by their passive and way of moving', () => {
  const strong = new Set<string>();
  for (const a of ARMIES.slice(2)) for (const w of a.waves) for (const id of w.foes) if (!isBoss(id)) strong.add(id);
  for (const id of Object.keys(ELITE_FOES)) strong.add(id);
  for (const id of strong) assert.ok(hasSkill(KITS[id]), `${id} has a skill`);
  for (const id of ['orcGrunt', 'skeleton', 'wolfBlack', 'gorgon1', 'satyr1', 'imp', 'ogre']) assert.ok(!hasSkill(KITS[id]), id);
  // (every foe that has no skill has a passive that does something, and most have a way of moving)
  for (const id of FOE_IDS) assert.ok(Object.keys(KITS[id].passive).length > 2, `${id}'s passive does something`);
  assert.ok(FOE_IDS.filter((id) => KITS[id].passive.move).length >= FOE_IDS.length * 0.7);
});

test('a common foe with no skill never casts, however full its charge', () => {
  const b = deploy();
  const wolf = addUnit(b, 'wolfBlack', 3, 3, {});
  addUnit(b, 'knight', 3, 4, {});
  wolf.charge = 100;
  assert.equal(tryCast(b, wolf, []), false);
  assert.equal(wolf.cast, undefined);
});

test('a charger\'s blow at the end of a run of three steps lands half as hard again, and says so', () => {
  assert.equal(moveOf({ side: 'foe', def: 'orcBrute' } as never), 'charge');
  const b = deploy();
  const brute = addUnit(b, 'orcBrute', 3, 1, {});
  const knight = addUnit(b, 'knight', 3, 5, {});
  for (let i = 0; i < CHARGE_RUN; i++) stepTo(b, brute, (brute.v + 1) * b.board.w + brute.u, []);
  assert.equal(brute.run, CHARGE_RUN);
  // (the same blow twice on one stream: after a run, and standing)
  const blowAfter = (run: number) => {
    const t = { ...brute, run };
    const rng = new Rng(9);
    const was = b.rng;
    b.pending = [];
    const out: BattleEvent[] = [];
    swing(b, t, knight, rng, out);
    b.rng = was;
    return { dmg: b.pending[0].dmg, said: out.some((e) => e.kind === 'style' && e.what === 'Charge!'), run: t.run };
  };
  const ran = blowAfter(CHARGE_RUN);
  const stood = blowAfter(0);
  assert.ok(ran.said && !stood.said);
  assert.equal(ran.run, 0, 'the run is spent');
  assert.ok(Math.abs(ran.dmg / stood.dmg - CHARGE_MULT) < 0.1, `${ran.dmg} against ${stood.dmg}`);
  // (a run of two is not a charge; a foe that does not charge keeps no run)
  const t = { ...brute, run: CHARGE_RUN - 1 };
  assert.equal(chargeOf(t), 1);
  const grunt = addUnit(b, 'orcGrunt', 6, 1, {});
  stepTo(b, grunt, 2 * b.board.w + 6, []);
  assert.equal(grunt.run, undefined);
});

test('a pack bites a tenth harder for each packmate beside its prey, up to three', () => {
  const b = deploy();
  const wolf = addUnit(b, 'wolfBlack', 3, 4, {});
  const hero = addUnit(b, 'knight', 3, 5, {});
  assert.equal(gangOf(b, wolf, hero), 1);
  addUnit(b, 'wolfRed', 2, 5, {});
  assert.ok(Math.abs(gangOf(b, wolf, hero) - 1.1) < 1e-9);
  addUnit(b, 'wolfWhite', 4, 5, {});
  addUnit(b, 'orcGrunt', 3, 6, {});
  assert.ok(Math.abs(gangOf(b, wolf, hero) - 1.3) < 1e-9);
  // (a foe without the bite gains nothing from friends)
  assert.equal(gangOf(b, addUnit(b, 'orcGrunt', 6, 6, {}), hero), 1);
});

test('a rider\'s bleed, burn or poison grows with the foe\'s attack', () => {
  assert.ok(AILMENT_SWITCH.on);
  for (const [id, kind] of [['wolfRed', 'bleed'], ['orcArcher', 'burn'], ['gorgon2', 'poison']] as const) {
    const b = deploy();
    const weak = addUnit(b, id, 3, 4, {});
    const strong = addUnit(b, id, 5, 4, { atk: 4 });
    const h1 = addUnit(b, 'knight', 3, 5, {});
    const h2 = addUnit(b, 'knight', 5, 5, {});
    afterBlow(b, weak, h1, false, 10, []);
    afterBlow(b, strong, h2, false, 10, []);
    const d1 = h1.ail?.find((a) => a.kind === kind);
    const d2 = h2.ail?.find((a) => a.kind === kind);
    assert.ok(d1 && d2, `${id} leaves ${kind}`);
    assert.equal(d1.dmg, Math.max(1, Math.round(atkOf(weak) * KITS[id].passive.rider!.share)));
    assert.ok(d2.dmg! > d1.dmg!, `${id}: ${d2.dmg} over ${d1.dmg}`);
  }
});

test('a kiting foe steps back from a blade striking it and keeps its reach; a foe that does not kite stands', () => {
  for (const id of ['orcArcher', 'spearman']) {
    const b = deploy();
    const me = addUnit(b, id, 3, 4, {});
    const blade = addUnit(b, 'samurai', 3, 5, {});
    addUnit(b, 'knight', 3, 7, {});
    blade.swing = { at: 0, ms: 600, to: me.id };
    const foes = b.units.filter((x) => x.side === 'hero');
    const step = kiteStep(b, me, defOf(me), foes, moveOf(me) === 'kite');
    assert.ok(step >= 0, `${id} steps back`);
    const at = { u: step % b.board.w, v: Math.floor(step / b.board.w) };
    assert.ok(Math.abs(at.u - blade.u) + Math.abs(at.v - blade.v) > 1, `${id} is out of the blade's reach`);
    // (the same foe without its style stands its ground: only a quick hero kites unstyled)
    assert.equal(kiteStep(b, me, defOf(me), foes, false), -1);
  }
});

test('a flanking foe steps round to the side of a hero busy with another', () => {
  const b = deploy();
  const wolf = addUnit(b, 'wolfBlack', 3, 4, {});
  const hero = addUnit(b, 'knight', 3, 5, {});
  const grunt = addUnit(b, 'orcGrunt', 3, 6, {});
  // (the knight faces the wolf, and is busy with the grunt behind it)
  hero.facing = wayTo(hero, wolf);
  hero.swing = { at: 0, ms: 600, to: grunt.id };
  const step = flankStep(b, wolf, defOf(wolf), hero, true);
  assert.ok(step >= 0, 'it goes round');
  assert.equal(flankStep(b, wolf, defOf(wolf), hero, false), -1, 'unstyled, it does not');
});

test('a hunter takes the shooters first; a guard keeps by its shooters and strikes whoever strikes its friends', () => {
  const b = deploy();
  const hunter = addUnit(b, 'wolfRed', 3, 4, {});
  const knight = addUnit(b, 'knight', 3, 5, {});
  const archer = addUnit(b, 'archer', 2, 4, {});
  archer.hp = archer.maxHp;
  knight.hp = 1;
  assert.equal(preyOrder(b, hunter, 'hunt', [knight, archer])[0], archer);
  assert.equal(walkOrder(b, hunter, 'hunt', [knight, archer])[0], archer);
  // (unstyled, the weakest first, as before)
  assert.equal(preyOrder(b, hunter, undefined, [knight, archer])[0], knight);

  const g = deploy();
  const guard = addUnit(g, 'skeleton', 3, 3, {});
  const shooter = addUnit(g, 'boneArcher', 1, 1, {});
  const grunt = addUnit(g, 'skeleton', 6, 3, {});
  grunt.hp = 1;
  assert.equal(wardOf(g, guard), shooter, 'its shooter, before its most hurt friend');
  const near = addUnit(g, 'knight', 3, 4, {});
  const onFriend = addUnit(g, 'samurai', 4, 3, {});
  onFriend.swing = { at: 0, ms: 600, to: shooter.id };
  assert.equal(preyOrder(g, guard, 'guard', [near, onFriend])[0], onFriend);
  // (it walks at whoever is nearest its ward)
  const far = addUnit(g, 'archer', 1, 3, {});
  assert.equal(walkOrder(g, guard, 'guard', [near, far])[0], far);
});

test('styled fights are deterministic, and every field band\'s fight still ends', () => {
  for (const band of FIELD_BANDS) {
    const play = () => {
      const b = readyBattle(11, band);
      fight(b);
      playOut(b);
      return JSON.stringify(b.units.map((u) => [u.def, u.hp, u.u, u.v]));
    };
    assert.equal(play(), play(), band);
  }
});
