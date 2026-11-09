// ASSAULT-DUEL (docs/notes/assault-3.md; the design's 4.2, phase 3): a Vain captain at the Iron Gate calls a champion out as a hero comes near;
// accepted, a ring is staked before the gate, off the board's middle, the two set inside and everyone else kept out, and the battle carries on
// round it; won, his band routs and our heroes heal; lost or timed out, he goes back to his post; refused, he is Mocking.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { standable } from '../src/sim/board';
import { forNear } from '../src/sim/assault/field';
import { acceptDuel, duelBlow, DUEL_CALL, DUEL_OFFER_MS, GATE_DUEL, GATE_DUEL_HEAL, MOCKING, refuseDuel, vainCaptain } from '../src/sim/assault/gateDuel';
import { DUEL_MS, inRing } from '../src/sim/duelRing';
import { stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import type { HoldEvent } from '../src/sim/assault/holdTypes';
import type { NemSnap } from '../src/sim/nemesis';
import { fell, quiet, steps } from './assaultKit';

const snap = (id: number, might: number, weak: string[]): NemSnap => ({ id, base: 'orcBrute', name: `N${id}`, epithet: 'the Test', rank: 'captain', might, scars: 0, traits: [], weak });
/** Two captains: the mightier takes the South Gate, the other (Vain, or not) the Iron Gate. */
const council = (vain: boolean) => [snap(1, 6, []), snap(2, 2, vain ? ['vain'] : [])];

function put(b: Battle, x: Unit, u: number, v: number): void {
  const f = b.field!;
  if (f.occ[x.v * f.w + x.u] === x.id) f.occ[x.v * f.w + x.u] = -1;
  x.u = u;
  x.v = v;
  x.step = undefined;
  f.occ[v * f.w + u] = x.id;
}
function gather(b: Battle, n: number): { hold: HoldEvent[]; ev: BattleEvent[] } {
  const hold: HoldEvent[] = [];
  const ev: BattleEvent[] = [];
  for (let i = 0; i < n && b.phase === 'fight'; i++) {
    ev.push(...stepBattle(b));
    hold.push(...b.field!.hold!.events);
  }
  return { hold, ev };
}
/** A battle with the Iron Gate's captain (Vain or not) and the first hero brought within the call of his post. */
function called(vain = true, auto = false): { b: Battle; hero: Unit } {
  const b = quiet({ council: council(vain) });
  const h = b.field!.hold!;
  if (auto) h.auto = true;
  const hero = b.field!.byId[h.platoons[0].heroId];
  put(b, hero, 66, 47);
  return { b, hero };
}

test('a Vain captain at the Iron Gate calls a champion out as a hero comes within twelve tiles; one not Vain does not', () => {
  const { b } = called(true);
  const h = b.field!.hold!;
  assert.ok(vainCaptain(b.field!, h), 'the Iron Gate\'s captain is Vain');
  const home = b.field!.groups[h.posts.find((p) => p.def.id === 'ironGate')!.group].home;
  assert.ok(Math.abs(66 - home.u) + Math.abs(47 - home.v) <= DUEL_CALL);
  const { hold } = gather(b, 3);
  assert.ok(hold.some((e) => e.kind === 'duelCalled'));
  assert.equal(h.duel?.state, 'offered');
  const plain = called(false);
  gather(plain.b, 3);
  assert.equal(plain.b.field!.hold!.duel, undefined);
});

test('accepted, the ring is staked before the gate, off the middle; the two inside, nobody else; nobody outside sees them', () => {
  const { b, hero } = called();
  const f = b.field!;
  const h = f.hold!;
  gather(b, 2);
  assert.ok(acceptDuel(b, hero.id));
  const d = h.duel!;
  assert.equal(d.state, 'fighting');
  const mid = d.mid!;
  assert.ok(Math.abs(mid.u - 49.5) + Math.abs(mid.v - 49.5) > 10, `the ring at (${mid.u}, ${mid.v}) is off the middle`);
  assert.ok(mid.u > 61, 'before the gate, outside the wall');
  const cap = f.byId[d.captain];
  assert.ok(inRing({ mid, r: d.r! }, hero) && inRing({ mid, r: d.r! }, cap));
  for (const x of b.units) if (x.alive && x !== hero && x !== cap) assert.ok(!inRing({ mid, r: d.r! + 1 }, x), `${x.def} kept out`);
  for (const i of d.fence!) assert.ok(!standable(b.board.tiles[i]), 'the stakes are solid');
  assert.ok(d.fence!.length > 12);
  assert.equal(cap.hp, Math.min(d.was!.hp, Math.round(cap.maxHp * GATE_DUEL.hp)));
  // (the buckets, rebuilt on the next tick, leave the two out)
  steps(b, 1);
  let seen = false;
  forNear(f, mid.u, mid.v, 4, (x) => (seen ||= x === hero || x === cap));
  assert.ok(!seen);
});

test('the duel fought: only the two strike each other, and it ends in the ring within sixty seconds; the stakes come down', () => {
  const { b, hero } = called();
  const f = b.field!;
  const h = f.hold!;
  gather(b, 2);
  acceptDuel(b, hero.id);
  const cap = h.duel!.captain;
  const t0 = b.t;
  const fence = [...h.duel!.fence!];
  let outsider = 0;
  for (let i = 0; i < DUEL_MS / 100 + 5 && h.duel!.state === 'fighting' && b.phase === 'fight'; i++) {
    for (const e of stepBattle(b)) if (e.kind === 'hit' && (e.to === hero.id || e.to === cap) && e.by !== hero.id && e.by !== cap) outsider++;
  }
  assert.equal(h.duel!.state, 'over');
  assert.ok(['won', 'lost', 'timeout'].includes(h.duel!.out!));
  assert.ok(b.t - t0 <= DUEL_MS + 200);
  assert.equal(outsider, 0, 'nobody outside the ring struck the two');
  for (const i of fence) assert.ok(standable(b.board.tiles[i]), 'the stakes are down');
});

test('won: the captain\'s band routs and every hero of ours heals a fifth', () => {
  const { b, hero } = called();
  const f = b.field!;
  const h = f.hold!;
  gather(b, 2);
  acceptDuel(b, hero.id);
  const heroes = h.platoons.map((p) => f.byId[p.heroId]);
  for (const x of heroes) x.hp = Math.round(x.maxHp * 0.5);
  const before = heroes.map((x) => x.hp);
  fell(b, h.duel!.captain);
  const { hold } = gather(b, 1);
  assert.ok(hold.some((e) => e.kind === 'duelOver' && e.out === 'won'));
  assert.equal(h.posts[h.duel!.post].mood, 'routed');
  heroes.forEach((x, i) => assert.ok(x.hp >= before[i] + Math.round(x.maxHp * GATE_DUEL_HEAL) - 30, `${x.def} healed`));
});

test('timed out: the captain goes back with his health as it was, by the share he kept', () => {
  const { b, hero } = called();
  const f = b.field!;
  const h = f.hold!;
  gather(b, 2);
  acceptDuel(b, hero.id);
  const cap = f.byId[h.duel!.captain];
  const was = h.duel!.was!;
  // (neither can reach the other: the clock runs out)
  hero.stunUntil = b.t + DUEL_MS + 1000;
  cap.stunUntil = b.t + DUEL_MS + 1000;
  cap.hp = Math.round(was.ring / 2);
  b.t = h.duel!.until;
  const { hold } = gather(b, 1);
  assert.ok(hold.some((e) => e.kind === 'duelOver' && e.out === 'timeout'));
  assert.ok(Math.abs(cap.hp - Math.round(was.hp / 2)) <= Math.ceil(was.hp * 0.02) + 2, `${cap.hp} against ${was.hp / 2}`);
});

test('refused, or let run out, the captain is Mocking for the battle; Auto names its strongest champion at once', () => {
  const { b } = called();
  const h = b.field!.hold!;
  gather(b, 2);
  assert.ok(refuseDuel(b));
  const cap = b.field!.byId[h.duel!.captain];
  const hero = b.field!.byId[h.platoons[1].heroId];
  assert.equal(duelBlow(h, cap, hero), MOCKING);
  const late = called();
  gather(late.b, 2);
  late.b.t += DUEL_OFFER_MS;
  gather(late.b, 1);
  assert.equal(late.b.field!.hold!.duel!.out, 'refused');
  const auto = called(true, true);
  gather(auto.b, 3);
  assert.equal(auto.b.field!.hold!.duel!.state, 'fighting');
});
