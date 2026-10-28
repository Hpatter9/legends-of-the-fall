// The Last Stand's idle heroes go to help (STAND-004, docs/notes/stand-help.md): once a wave's foes are all in, a hero with nothing in its
// zone leaves its post for the fight; one with a foe in its zone stays; the king always keeps his inner guard.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, apart, type Unit } from '../src/sim/battle';
import { standable, tileAt } from '../src/sim/board';
import { ringOf } from '../src/sim/standField';
import { GUARD_MIN, guardOf, INNER_RING, zoneOf } from '../src/sim/standHelp';
import { newStandRun, startFirstWave, startStand, stepStand, type Stand, type StandSetup } from '../src/sim/stand';
import { gradeBoost } from '../src/sim/run';
import { newCastle } from '../src/sim/castle';
import { ARMIES } from '../src/sim/armies';

const setupAt = (level: number): StandSetup => ({ boost: () => gradeBoost(1, 0, level), castle: newCastle() });
const armies = ARMIES.map((a) => a.id);
const EIGHT = ['knight', 'paladin', 'samurai', 'kunoichi', 'archer', 'ranger', 'wizard', 'cleric'];
const fresh = (seed = 5, level = 60): Stand => startStand(newStandRun(seed, EIGHT, armies), setupAt(level));
const heroes = (s: Stand): Unit[] => s.b.units.filter((u) => u.side === 'hero' && u.tag !== undefined && u.alive);
const helpOf = (s: Stand): Record<number, number> => s.b.stand!.help ?? {};

/** A wave whose foes are all in: the real ones gone, `n` held foes (unhurt by anything short of a long fight) put near `at`. */
function heldWave(s: Stand, at: { u: number; v: number }, n: number, hp = 1e9): Unit[] {
  startFirstWave(s);
  s.queue.length = 0;
  for (const u of s.b.units) if (u.side === 'foe') u.alive = false;
  return held(s, at, n, hp);
}

/** `n` foes held still near `at` (the first free tiles round it). */
function held(s: Stand, at: { u: number; v: number }, n: number, hp = 1e9): Unit[] {
  const out: Unit[] = [];
  for (let r = 0; r <= 3 && out.length < n; r++)
    for (let dv = -r; dv <= r && out.length < n; dv++)
      for (let du = -r; du <= r && out.length < n; du++) {
        const p = { u: at.u + du, v: at.v + dv };
        if (Math.max(Math.abs(du), Math.abs(dv)) !== r || !standable(tileAt(s.b.board, p.u, p.v)) || s.b.units.some((x) => x.alive && x.u === p.u && x.v === p.v)) continue;
        const f = addUnit(s.b, 'skeleton', p.u, p.v, {});
        f.maxHp = f.hp = hp;
        f.busyUntil = 1e12;
        out.push(f);
      }
  return out;
}

/** A corner of the field far from the dais (standable, a few tiles in from the walls). */
function corner(s: Stand): { u: number; v: number } {
  for (const at of [{ u: 3, v: 3 }, { u: 20, v: 20 }, { u: 3, v: 20 }, { u: 20, v: 3 }]) if (standable(tileAt(s.b.board, at.u, at.v))) return at;
  throw new Error('no corner');
}

test('with the wave all in, an idle hero leaves its post and heads to the fight', () => {
  const s = fresh();
  const spot = corner(s);
  const foes = heldWave(s, spot, 5);
  const posts = new Map(heroes(s).map((h) => [h.id, { ...h.post! }]));
  const sent = new Set<number>();
  let closer = 0;
  for (let i = 0; i < 200; i++) {
    stepStand(s);
    for (const id of Object.keys(helpOf(s))) sent.add(+id);
  }
  assert.ok(sent.size >= 1, 'somebody went to help');
  for (const id of sent) {
    const h = s.b.units.find((u) => u.id === id)!;
    const post = posts.get(id)!;
    if (apart(h, foes[0]) < apart(post, foes[0]) - 2) closer++;
  }
  assert.ok(closer >= 1, 'and walked towards the fight');
  // (the helpers struck the foes they went to)
  assert.ok(foes.some((f) => f.hp < f.maxHp), 'the held foes were struck');
});

test('nobody helps while foes are still to come in', () => {
  const s = fresh();
  startFirstWave(s);
  for (let i = 0; i < 400 && s.phase === 'wave'; i++) {
    stepStand(s);
    if (s.queue.length) assert.equal(Object.keys(helpOf(s)).length, 0, `a helper went out at ${s.b.t} with ${s.queue.length} foes to come`);
  }
});

test('a hero with a foe in its own zone stays at its post', () => {
  const s = fresh();
  const guard = guardOf(heroes(s));
  const h = heroes(s).find((x) => !guard.has(x.id))!;
  // (a foe at the rim of this hero's zone, on the side away from the king, held still; the rest far off in a corner)
  const z = zoneOf(h);
  const du = h.post!.u - 12;
  const dv = h.post!.v - 12;
  const out = Math.abs(du) >= Math.abs(dv) ? { u: Math.sign(du) || 1, v: 0 } : { u: 0, v: Math.sign(dv) };
  const at = { u: Math.max(1, Math.min(22, h.post!.u + out.u * (z - 2))), v: Math.max(1, Math.min(22, h.post!.v + out.v * (z - 2))) };
  heldWave(s, corner(s), 4);
  const near = held(s, at, 1);
  assert.ok(apart(near[0], h.post!) <= z, 'the foe stands in the zone');
  for (let i = 0; i < 300; i++) {
    stepStand(s);
    assert.equal(helpOf(s)[h.id], undefined, `${h.def} left with a foe in its zone`);
    near[0].busyUntil = 1e12;
  }
});

test('the king keeps his inner guard: the inner ring never leaves, and never fewer than GUARD_MIN stay', () => {
  for (const seed of [3, 5, 11]) {
    const s = fresh(seed, 30);
    startFirstWave(s);
    let helped = 0;
    for (let i = 0; i < 20000 && s.phase !== 'over' && s.run.wave < 9; i++) {
      stepStand(s);
      s.notes.length = 0;
      const help = helpOf(s);
      const hs = heroes(s);
      const away = hs.filter((h) => help[h.id] !== undefined);
      helped = Math.max(helped, away.length);
      for (const h of away) assert.ok(ringOf(h.post!) > INNER_RING, `seed ${seed}: ${h.def} of the inner ring left the king`);
      if (away.length) assert.ok(hs.length - away.length >= GUARD_MIN, `seed ${seed}: only ${hs.length - away.length} stayed`);
    }
    assert.ok(helped >= 1, `seed ${seed}: heroes did go to help in real waves`);
  }
});

test('the guard is the inner ring, then tanks, then the nearest posted; the helpers go home when the wave clears', () => {
  const mk = (id: number, u: number, v: number, tank: boolean) => ({ id, post: { u, v, leash: 4, tank } }) as unknown as Unit;
  // (no inner ring: the tanks stay, the fighters may go)
  assert.deepEqual([...guardOf([mk(1, 12, 8, false), mk(2, 16, 12, true), mk(3, 9, 9, false), mk(4, 12, 16, true)])].sort(), [2, 4]);
  // (an inner ring of three stays whole, and that is enough)
  assert.deepEqual([...guardOf([mk(1, 14, 14, false), mk(2, 10, 10, false), mk(3, 12, 14, false), mk(4, 16, 12, true)])].sort(), [1, 2, 3]);
  const s = fresh();
  const foes = heldWave(s, corner(s), 4, 400);
  for (const f of foes) f.busyUntil = 0;
  for (let i = 0; i < 3000 && s.phase === 'wave'; i++) stepStand(s);
  assert.equal(s.phase, 'break', 'the wave was cleared');
  assert.equal(Object.keys(helpOf(s)).length, 0, 'nobody is out helping in the break');
});

test('two plays of one seed with the helping come out the same', () => {
  const play = () => {
    const s = fresh(7, 30);
    startFirstWave(s);
    let sends = 0;
    for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
      stepStand(s);
      sends += Object.keys(helpOf(s)).length;
    }
    return [s.phase, s.run.wave, s.run.kills, s.b.t, s.king.hp, sends];
  };
  const a = play();
  assert.deepEqual(play(), a);
  assert.ok((a[5] as number) > 0, 'the helping happened');
});
