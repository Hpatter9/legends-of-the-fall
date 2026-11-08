// ASSAULT-MIRROR (docs/notes/assault-2.md): with the simulation in a Web Worker, the page's copy of the battle, brought up to each batch the
// worker sends (cloned, as a message is), stands exactly where the worker's battle stands: every fighter, the structures, the siege works, the
// tiles a breach or a ladder changed; and the page's own references to its fighters and platoons stay good.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assaultChecksum, stepAssault } from '../src/sim/assault/assault';
import { applyMirror, packMirror, type TickOut } from '../src/sim/assault/mirror';
import { orderPlatoon } from '../src/sim/assault/platoons';
import { callVolley } from '../src/sim/assault/works';
import { fell, quiet } from './assaultKit';

test('the page\'s copy, brought up to each batch, stands where the worker\'s battle stands', () => {
  const b = quiet({ siege: { ram: 'knight', ladders: ['samurai', 'archer'] }, auto: true, tactical: true });
  const copy = structuredClone(b);
  const sent = new Set(b.units.map((x) => x.id));
  const hero = copy.field!.byId[copy.field!.hold!.platoons[0].heroId];
  const platoon = copy.field!.hold!.platoons[0];
  let batches = 0;
  while (b.phase === 'fight' && batches < 400) {
    const ticks: TickOut[] = [];
    for (let i = 0; i < 1 + (batches % 4) && b.phase === 'fight'; i++) {
      const ev = stepAssault(b);
      ticks.push({ ev, hold: b.field!.hold!.events.slice() });
    }
    applyMirror(copy, structuredClone(packMirror(b, ticks, [], sent)));
    batches++;
    if (batches % 50 === 0) assert.equal(assaultChecksum(copy), assaultChecksum(b), `batch ${batches}`);
  }
  assert.equal(assaultChecksum(copy), assaultChecksum(b));
  assert.equal(copy.t, b.t);
  assert.deepEqual(copy.field!.hold!.forts.map((f) => [f.hp, f.broken, !!f.open]), b.field!.hold!.forts.map((f) => [f.hp, f.broken, !!f.open]));
  assert.deepEqual(copy.field!.hold!.siege.ladders, b.field!.hold!.siege.ladders);
  for (let i = 0; i < b.board.tiles.length; i++) if (b.board.tiles[i].ladder || copy.board.tiles[i].ladder) assert.equal(copy.board.tiles[i].ladder, b.board.tiles[i].ladder);
  assert.equal(copy.field!.byId[hero.id], hero, 'the page\'s fighter is the same object');
  assert.equal(copy.field!.hold!.platoons[0], platoon, 'and its platoon');
  assert.equal(hero.hp, b.field!.byId[hero.id].hp);
});

test('a volley landed and a keg gone off leave the page\'s copy too, and the barrel lifted leaves its tile', () => {
  const b = quiet();
  const h = b.field!.hold!;
  for (const x of b.units) if (x.side === 'foe' && x.u >= 50 && x.u <= 72 && x.v >= 50 && x.v <= 70) fell(b, x.id);
  const hero = b.field!.byId[h.platoons[0].heroId];
  b.field!.occ[hero.v * b.field!.w + hero.u] = -1;
  hero.u = 67;
  hero.v = 55;
  b.field!.occ[55 * b.field!.w + 67] = hero.id;
  orderPlatoon(b, 0, { kind: 'plant', at: { u: 55, v: 61 } });
  const copy = structuredClone(b);
  const sent = new Set(b.units.map((x) => x.id));
  let volleyed = false;
  let seen = { volley: false, keg: false };
  for (let n = 0; n < 900 && b.phase === 'fight'; n++) {
    if (!volleyed && b.t >= h.siege.trebReady) volleyed = callVolley(b, 40, 40) !== false;
    const ev = stepAssault(b);
    applyMirror(copy, structuredClone(packMirror(b, [{ ev, hold: h.events.slice() }], [], sent)));
    const ch = copy.field!.hold!.siege;
    seen = { volley: seen.volley || !!ch.volley, keg: seen.keg || !!ch.keg };
    assert.equal(!!ch.volley, !!h.siege.volley, `volley at ${b.t}`);
    assert.equal(!!ch.keg, !!h.siege.keg, `keg at ${b.t}`);
    if (seen.keg && !h.siege.keg) break;
  }
  assert.ok(seen.volley && seen.keg, 'both were under way at some point');
  assert.deepEqual(copy.barrels, b.barrels);
  for (let i = 0; i < b.board.tiles.length; i++) assert.equal(!!copy.board.tiles[i].barrel, !!b.board.tiles[i].barrel);
});
