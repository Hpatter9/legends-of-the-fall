// ASSAULT-MIRROR (docs/notes/assault-2.md): with the simulation in a Web Worker, the page's copy of the battle, brought up to each batch the
// worker sends (cloned, as a message is), stands exactly where the worker's battle stands: every fighter, the structures, the siege works, the
// tiles a breach or a ladder changed; and the page's own references to its fighters and platoons stay good.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assaultChecksum, stepAssault } from '../src/sim/assault/assault';
import { applyMirror, packMirror, type TickOut } from '../src/sim/assault/mirror';
import { quiet } from './assaultKit';

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
