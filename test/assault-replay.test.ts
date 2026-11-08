// ASSAULT-REPLAY (docs/notes/assault-1.md; the design's 7.5 and 7.6): the same input, seed and log give the same assault (its checksum and the
// fight's random stream), with orders given part-way; another seed another; and the budget, counted: in a bot assault the bounded walks a tick
// average at most eight, no tick decides more than sixty, and each break rebuilds the sectors once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assaultChecksum, playAssault, startAssault, stepAssault } from '../src/sim/assault/assault';
import { orderPlatoon, setFormation } from '../src/sim/assault/platoons';
import { input } from './assaultKit';

test('the same input, seed and orders play the same assault; the log replays it', () => {
  const play = () => {
    const b = startAssault(input({ auto: true }));
    for (let i = 0; i < 1200 && b.phase === 'fight'; i++) {
      if (b.t === 20_000) orderPlatoon(b, 2, { kind: 'move', at: { u: 60, v: 92 } });
      if (b.t === 30_000) setFormation(b, 0, 'square');
      stepAssault(b);
    }
    return b;
  };
  const a = play();
  const c = play();
  assert.equal(assaultChecksum(a), assaultChecksum(c));
  assert.equal(a.rng, c.rng);
  // (the log, played into a fresh assault at its ticks, gives the same fight)
  const r = startAssault(input({ auto: true }));
  const log = a.field!.hold!.log;
  assert.ok(log.length >= 2);
  let n = 0;
  playAssault(r, log, () => void n++);
  const again = startAssault(input({ auto: true }));
  playAssault(again, log);
  assert.equal(assaultChecksum(r), assaultChecksum(again));
  assert.equal(r.field!.hold!.outcome, again.field!.hold!.outcome);
});

test('another seed plays another assault', () => {
  const a = startAssault(input({ auto: true, seed: 1 }));
  const b = startAssault(input({ auto: true, seed: 2 }));
  for (let i = 0; i < 900; i++) {
    stepAssault(a);
    stepAssault(b);
  }
  assert.notEqual(assaultChecksum(a), assaultChecksum(b));
});

test('the budget, counted: walks a tick, decisions a tick, a rebuild for each break', () => {
  const b = startAssault(input({ auto: true, foeShare: 0.1 }));
  let breaks = 0;
  for (let i = 0; i < 1800 && b.phase === 'fight'; i++) {
    stepAssault(b);
    breaks += b.field!.hold!.events.filter((e) => e.kind === 'breach' || e.kind === 'open').length;
  }
  const s = b.field!.stats;
  assert.ok(s.walks / s.ticks <= 8, `${(s.walks / s.ticks).toFixed(2)} walks a tick`);
  assert.ok(s.mostDecided <= 60, `${s.mostDecided} decided in one tick`);
  assert.equal(s.rebuilds, breaks);
});
