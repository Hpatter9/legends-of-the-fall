import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { fight, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { DEPLOY_ROWS } from '../src/sim/board';
import { replayLog } from '../src/sim/orders';
import { ADVANCE_CAP, CHARGE, chargeBlow, chargeMove, canCharge, HOLD_CAP, heldBy, isOpener, orderCharge, OPENERS, setTactic, startTactic, TACTICS, type Tactic } from '../src/sim/tactics';
import { HERO_KITS } from '../src/sim/heroKits';

// The party's tactics (docs/notes/tactics.md; the design is docs/notes/tactics-design.md): Advance together holds the strikers and the back
// line, and their openers, until the front line meets the foe; Hold the line keeps everyone on the deploy rows until a foe comes up; Charge
// is every fight as it was; the player's Charge! lets the held go, once a fight.

/** A fight on bare level ground: a Knight on the front deploy row, the others behind it, against `band`; the tactic picked, not yet begun. */
function field(tactic: Tactic | undefined, others: string[] = ['kunoichi', 'werewolf', 'archer'], band = 'skeletons', seed = 11): Battle {
  const b = bareBoard(startBattle(seed, band));
  const front = b.board.d - DEPLOY_ROWS;
  place(b, 'knight', 3, front);
  others.forEach((k, i) => place(b, k, 1 + 2 * i, front + 1 + (i % 2)));
  if (tactic) setTactic(b, tactic);
  return b;
}
const unit = (b: Battle, kind: string): Unit => b.units.find((u) => u.def === kind)!;
/** Play to the end, calling `each` after every tick with that tick's events. */
function play(b: Battle, each: (ev: BattleEvent[]) => void = () => {}): void {
  fight(b);
  while (b.phase === 'fight') each(stepBattle(b));
}
/** A fight's outcome and every fighter's health and tile at its end, to tell two fights apart. */
const ending = (b: Battle) => JSON.stringify({ phase: b.phase, t: b.t, units: b.units.map((u) => [u.def, u.hp, u.u, u.v]) });

/** Run `fn` with the switches as they were before the tactics (no tactic set means Charge, and the foes have no answer). */
function asBefore<T>(fn: () => T): T {
  const was = { ...TACTICS };
  TACTICS.fallback = 'charge';
  TACTICS.answer = 1;
  TACTICS.edge = false;
  try {
    return fn();
  } finally {
    Object.assign(TACTICS, was);
  }
}

test('with the switches as before the tactics, a fight with Charge picked plays exactly as one with none', () => {
  const [a, c] = asBefore(() => {
    const a = field(undefined);
    const c = field('charge');
    play(a);
    play(c);
    return [a, c];
  });
  assert.equal(ending(a), ending(c));
  assert.equal(c.tactic, undefined);
});

test('the default is Advance together, and the foes of a band answer it with TACTICS.answer more attack (their health as before)', () => {
  assert.equal(TACTICS.fallback, 'advance');
  assert.ok(TACTICS.answer > 1 && TACTICS.answer < 1.05);
  const now = startBattle(11, 'skeletons');
  const was = asBefore(() => startBattle(11, 'skeletons'));
  const foes = (b: Battle) => b.units.filter((u) => u.side === 'foe');
  foes(now).forEach((f, i) => {
    const g = foes(was)[i];
    assert.equal(f.def, g.def);
    assert.equal(f.maxHp, g.maxHp, f.def);
    assert.ok(Math.abs((f.power ?? 1) / (g.power ?? 1) - TACTICS.answer) < 1e-9);
  });
  // (a fight with no tactic set takes Advance)
  const b = field(undefined);
  fight(b);
  assert.equal(b.tactic?.kind, 'advance');
});

test('Advance together: the Knight is the front line; the Kunoichi, Werewolf and Archer are held, behind it, until it meets the foe', () => {
  const b = field('advance');
  fight(b);
  const knight = unit(b, 'knight');
  assert.deepEqual(b.tactic!.front, [knight.id]);
  assert.equal(b.tactic!.held.length, 3);
  let met: BattleEvent | undefined;
  const opened: string[] = [];
  while (b.phase === 'fight' && !met) {
    const ev = stepBattle(b);
    met = ev.find((e) => e.kind === 'lineMet');
    if (met) break;
    for (const e of ev) if (e.kind === 'skill' && b.tactic!.held.includes(e.by) && OPENERS.has(e.name)) opened.push(e.name);
    for (const id of b.tactic!.held) {
      const h = b.units.find((u) => u.id === id)!;
      // (no held hero stands past the row behind the Knight, unless a foe has come up beside it)
      if (heldBy(b, h)) assert.ok(h.v >= knight.v + 1 || h.v >= b.board.d - DEPLOY_ROWS, `${h.def} at row ${h.v}, the Knight at ${knight.v}`);
    }
  }
  assert.ok(met && met.kind === 'lineMet' && met.how === 'met', 'the line meets the foe');
  assert.equal(opened.length, 0, `no opener while held: ${opened.join(', ')}`);
  // (the line met by the Knight's first blow, or a blow on him, or the cap)
  assert.ok(knight.swing !== undefined || knight.hp < knight.maxHp || b.t >= ADVANCE_CAP);
  assert.ok(b.t <= ADVANCE_CAP);
});

test('Advance together: a party with no front-liner holds nobody (it charges)', () => {
  const b = bareBoard(startBattle(11, 'skeletons'));
  place(b, 'kunoichi', 2, b.board.d - 1);
  place(b, 'archer', 4, b.board.d - 1);
  setTactic(b, 'advance');
  fight(b);
  assert.equal(b.tactic, undefined);
});

test('Hold the line: nobody leaves the deploy rows (the Knight one row more) until a foe comes up, or the cap', () => {
  const b = field('hold');
  fight(b);
  const deploy = b.board.d - DEPLOY_ROWS;
  assert.equal(b.tactic!.held.length, 4);
  while (b.phase === 'fight' && b.tactic!.metAt === undefined) {
    stepBattle(b);
    if (b.tactic!.metAt !== undefined) break;
    for (const u of b.units) if (u.alive && u.side === 'hero' && heldBy(b, u)) assert.ok(u.v >= (u.def === 'knight' ? deploy - 1 : deploy), `${u.def} at row ${u.v}`);
  }
  assert.ok(b.tactic!.metAt !== undefined && b.tactic!.metAt <= HOLD_CAP);
});

test('a held hero is let go when a foe comes beside it', () => {
  const b = field('advance');
  fight(b);
  const k = unit(b, 'kunoichi');
  assert.equal(heldBy(b, k), true);
  const foe = b.units.find((u) => u.side === 'foe')!;
  foe.u = k.u;
  foe.v = k.v - 1;
  assert.equal(heldBy(b, k), false);
});

test("the player's Charge!: once a fight, applied at the next tick, and replayed from the log", () => {
  const b = field('advance');
  fight(b);
  assert.equal(canCharge(b), true);
  assert.equal(orderCharge(b), true);
  const ev = stepBattle(b);
  assert.ok(ev.some((e) => e.kind === 'lineMet' && e.how === 'charge'));
  assert.equal(canCharge(b), false);
  assert.equal(orderCharge(b), false);
  for (const id of b.tactic!.held) assert.equal(heldBy(b, b.units.find((u) => u.id === id)!), false);
  while (b.phase === 'fight') stepBattle(b);
  // (played again with the same log, it ends the same)
  const again = field('advance');
  fight(again);
  while (again.phase === 'fight') {
    replayLog(again, b.log ?? []);
    stepBattle(again);
  }
  assert.equal(ending(again), ending(b));
});

test('the same seed and tactic give the same fight', () => {
  for (const t of ['advance', 'hold'] as const) {
    const a = field(t, ['samurai', 'karasu', 'cleric'], 'werewolves', 5);
    const c = field(t, ['samurai', 'karasu', 'cleric'], 'werewolves', 5);
    play(a);
    play(c);
    assert.equal(ending(a), ending(c));
  }
});

test('the Last Stand takes no tactic', () => {
  const b = field('hold');
  b.stand = {} as Battle['stand'];
  startTactic(b);
  assert.equal(b.tactic, undefined);
});

test('the openers are real skills of the heroes; the escapes and the front-liners\' charges are not openers', () => {
  const names = new Set<string>();
  for (const hk of Object.values(HERO_KITS())) for (const s of hk.slots) names.add(s.skill.name).add(s.skill.key ?? s.skill.name);
  for (const n of ['Shadow Step', 'Pilfer', 'Ravage', 'Voltage Blink', 'Iaido']) assert.ok(names.has(n), n);
  for (const n of ['Smoke Bomb', 'Shield Rush', 'Gore Charge', 'Storm Surge', 'Aimed Shot']) assert.equal(isOpener({ name: n }), false, n);
});

test("Charge's edge: the party marches quicker for its first seconds, and each hero's first landed blow on a foe that shoots is harder, once", () => {
  const b = field('charge', ['kunoichi', 'archer'], 'skeletons');
  fight(b);
  assert.equal(b.tactic?.kind, 'charge');
  assert.equal(canCharge(b), false, 'nobody is held: there is nothing to call');
  const kunoichi = unit(b, 'kunoichi');
  const archer = b.units.find((u) => u.def === 'boneArcher')!;
  const skeleton = b.units.find((u) => u.def === 'skeleton')!;
  assert.equal(chargeMove(b, kunoichi), CHARGE.MOVE);
  assert.equal(chargeBlow(b, kunoichi, skeleton), 1, 'a foe that does not shoot');
  assert.equal(chargeBlow(b, kunoichi, archer), CHARGE.BLOW);
  assert.equal(chargeBlow(b, kunoichi, archer), 1, 'only the first');
  b.t = CHARGE.MS + 100;
  assert.equal(chargeMove(b, kunoichi), 1);
  // (the foes have no edge; with the edge switched off, Charge is the old fight)
  assert.equal(chargeMove({ ...b, t: 100 } as Battle, skeleton), 1);
  const old = asBefore(() => {
    const c = field('charge');
    fight(c);
    return c;
  });
  assert.equal(old.tactic, undefined);
});

test("the player's Charge! gives the edge from the call", () => {
  const b = field('advance');
  fight(b);
  const k = unit(b, 'kunoichi');
  assert.equal(chargeMove(b, k), 1, 'no edge while advancing');
  for (let i = 0; i < 5; i++) stepBattle(b);
  orderCharge(b);
  stepBattle(b);
  assert.equal(b.tactic?.edgeAt, b.t);
  assert.equal(chargeMove(b, k), CHARGE.MOVE);
});
