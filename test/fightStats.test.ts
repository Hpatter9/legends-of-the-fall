import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readyBattle } from './helpers';
import { stepBattle, type BattleEvent, type Battle } from '../src/sim/battle';
import { mvpOf, startStats, tally } from '../src/sim/fightStats';

const heroes = (b: Battle) => b.units.filter((u) => u.side === 'hero');
const foes = (b: Battle) => b.units.filter((u) => u.side === 'foe');

test('a fight starts with a row for each hero placed, and no numbers', () => {
  const b = readyBattle(3);
  const stats = startStats(b.units);
  assert.deepEqual(
    stats.map((s) => s.id),
    heroes(b).map((u) => u.id),
  );
  assert.ok(stats.every((s) => s.dealt === 0 && s.taken === 0 && s.healed === 0 && s.kills === 0));
});

test('a hit counts as damage dealt by its attacker and taken by the one struck', () => {
  const b = readyBattle(3);
  const [h] = heroes(b);
  const [f] = foes(b);
  const stats = startStats(b.units);
  tally(stats, [{ kind: 'hit', by: h.id, to: f.id, dmg: 40, heavy: false, splash: false, killed: false, src: 'blow' }]);
  tally(stats, [{ kind: 'hit', by: f.id, to: h.id, dmg: 15, heavy: true, splash: false, killed: false, src: 'blow' }]);
  const row = stats.find((s) => s.id === h.id)!;
  assert.equal(row.dealt, 40);
  assert.equal(row.taken, 15);
  assert.equal(row.kills, 0);
});

test('a killing blow is a kill for the hero who struck it, and foes get no row', () => {
  const b = readyBattle(3);
  const [h] = heroes(b);
  const [f] = foes(b);
  const stats = startStats(b.units);
  tally(stats, [{ kind: 'hit', by: h.id, to: f.id, dmg: 9, heavy: false, splash: true, killed: true, src: 'blow' }]);
  assert.equal(stats.find((s) => s.id === h.id)!.kills, 1);
  assert.equal(stats.length, heroes(b).length);
});

test('healing counts for the healer, and a heal with no healer (the king\'s spell) counts for no one', () => {
  const b = readyBattle(3);
  const [h, other] = heroes(b);
  const stats = startStats(b.units);
  const events: BattleEvent[] = [
    { kind: 'heal', to: other.id, amount: 30, by: h.id },
    { kind: 'heal', to: other.id, amount: 50 },
  ];
  tally(stats, events);
  assert.equal(stats.find((s) => s.id === h.id)!.healed, 30);
  assert.equal(stats.find((s) => s.id === other.id)!.healed, 0);
});

test('tallies add up over ticks, and the numbers from a real fight are all counted', () => {
  const b = readyBattle(7);
  const stats = startStats(b.units);
  let dealt = 0;
  let kills = 0;
  for (let i = 0; i < 4000 && b.phase === 'fight'; i++) {
    const events = stepBattle(b);
    for (const e of events) {
      if (e.kind === 'hit' && stats.some((s) => s.id === e.by)) {
        dealt += e.dmg;
        if (e.killed) kills++;
      }
    }
    tally(stats, events);
  }
  assert.equal(
    stats.reduce((n, s) => n + s.dealt, 0),
    dealt,
  );
  assert.equal(
    stats.reduce((n, s) => n + s.kills, 0),
    kills,
  );
});

test('the MVP is the hero who did the most, damage and healing together, with half the damage taken counted', () => {
  const b = readyBattle(3);
  const [a, c] = heroes(b);
  const [f] = foes(b);
  const stats = startStats(b.units);
  assert.equal(mvpOf(stats), null, 'no one did anything, so no MVP');
  tally(stats, [{ kind: 'hit', by: a.id, to: f.id, dmg: 50, heavy: false, splash: false, killed: false, src: 'blow' }]);
  tally(stats, [{ kind: 'hit', by: f.id, to: c.id, dmg: 80, heavy: false, splash: false, killed: false, src: 'blow' }]);
  assert.equal(mvpOf(stats)?.id, a.id, '50 dealt beats 40 for taking 80');
  tally(stats, [{ kind: 'heal', to: c.id, amount: 30, by: c.id }]);
  assert.equal(mvpOf(stats)?.id, c.id, '30 healed and 40 counted for taking 80 is 70 against 50');
});
