import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, hurt, noteTerrain, startBattle, stepBattle, type BattleEvent } from '../src/sim/battle';
import { tileAt } from '../src/sim/board';
import { emptyStats } from '../src/sim/equipment';
import { fightXp, killXp, XP_TAKE_PART } from '../src/sim/levels';
import { fightXpByHero, CLIMB_XP } from '../src/sim/climb';
import { startStats, tally } from '../src/sim/fightStats';

function arena(kind = 'kitsune') {
  const b = bareBoard(startBattle(3));
  b.units = [];
  b.phase = 'fight';
  const by = addUnit(b, kind, 3, 6);
  const to = addUnit(b, 'skeleton', 3, 5);
  const other = addUnit(b, 'skeleton', 3, 4);
  for (const u of b.units) u.busyUntil = 1e9;
  return { b, by, to, other };
}

for (const blocked of ['dead', 'dodge', 'shield'] as const) {
  for (const kind of ['kitsune', 'gunslinger', 'lightningMage']) test(`${blocked} target: ${kind} has no post-hit effects`, () => {
    const { b, by, to, other } = arena(kind);
    by.hp = 1;
    by.eq = { ...emptyStats(), abilities: [{ id: 'honestStrike', s: 1, name: 'Honest Strike' }] };
    if (blocked === 'dead') { to.alive = false; to.hp = 0; }
    // (a dodge is a blow its d20 missed now, STATS batch 4)
    if (blocked === 'dodge') to.eq = { ...emptyStats(), dodge: 1 };
    if (blocked === 'shield') to.shield = { hp: 1000, until: 5000 };
    const hp = other.hp;
    b.pending.push({ at: 100, kind: 'land', by: by.id, to: to.id, dmg: 20, heavy: false, ...(blocked === 'dodge' ? { res: 'miss' as const } : {}) });
    const stream = b.skillRng;
    const events = stepBattle(b);
    assert.equal(by.hp, 1, 'no phantom leech');
    assert.equal(by.fx?.['honestStrike#n'] ?? 0, 0, 'no equipment hit count');
    assert.equal(other.hp, hp, 'no through or arc damage');
    assert.ok(!events.some((e) => e.kind === 'arc'));
    if (blocked !== 'dodge') assert.equal(b.skillRng, stream, 'no post-hit arc roll');
  });
}

for (const shield of [0, 10, 20]) test(`effective blow with ${shield} shield retains leech and equipment hook`, () => {
  const { b, by, to } = arena();
  by.hp = 1;
  by.eq = { ...emptyStats(), abilities: [{ id: 'honestStrike', s: 1, name: 'Honest Strike' }] };
  if (shield) to.shield = { hp: shield, until: 5000 };
  b.pending.push({ at: 100, kind: 'land', by: by.id, to: to.id, dmg: 20, heavy: false });
  const hp = to.hp;
  stepBattle(b);
  assert.equal(to.hp, hp - (20 - shield));
  assert.equal(by.hp, shield === 20 ? 1 : 6, 'retain existing nominal blow leech scaling');
  assert.equal(by.fx?.['honestStrike#n'] ?? 0, shield === 20 ? 0 : 1);
});

for (const source of ['lava', 'barrel'] as const) test(`${source} deaths give no self-credit, XP or kill hooks`, () => {
  const { b, by, to } = arena('werewolf');
  by.hp = 1;
  by.tag = 7;
  by.eq = { ...emptyStats(), abilities: [{ id: 'arcaneSiphon', s: 100, name: 'Arcane Siphon' }] };
  const stats = startStats(b.units);
  let events: BattleEvent[] = [];
  if (source === 'lava') {
    tileAt(b.board, by.u, by.v)!.ground = 'lava';
    noteTerrain(b);
    b.t = 900;
    events = stepBattle(b);
  } else {
    tileAt(b.board, 4, 6)!.barrel = true;
    noteTerrain(b);
    by.hp = 2;
    hurt(b, to, by, 1, false, false, events, 'skill');
  }
  assert.ok(events.some((e) => e.kind === 'hit' && e.by === by.id && e.to === by.id && e.killed && e.src === 'dot'));
  if (source === 'barrel') assert.ok(events.some((e) => e.kind === 'boom'));
  assert.equal(by.alive, false);
  assert.equal(by.dealt ?? 0, 0);
  assert.equal(by.kills ?? 0, 0);
  assert.equal(by.slain ?? 0, 0);
  assert.equal(by.frenzy, undefined);
  assert.equal(by.fx?.['arcaneSiphon#fired'] ?? 0, 0);
  tally(stats, events, b.units);
  assert.equal(stats[0].dealt, 0);
  assert.equal(stats[0].kills, 0);
  assert.ok(stats[0].taken > 0);
  b.phase = 'lost';
  assert.equal(fightXp(b)[by.def], XP_TAKE_PART);
  assert.equal(fightXpByHero(b)[7], XP_TAKE_PART * CLIMB_XP);
});

test('genuine kills retain credit, slain XP, frenzy and equipment kill hooks', () => {
  const { b, by, to } = arena('werewolf');
  by.eq = { ...emptyStats(), abilities: [{ id: 'arcaneSiphon', s: 100, name: 'Arcane Siphon' }] };
  to.hp = 1;
  const events: BattleEvent[] = [];
  hurt(b, by, to, 20, false, false, events, 'dot');
  assert.equal(by.kills, 1);
  assert.equal(by.slain, killXp(to));
  assert.equal(by.dealt, 1);
  assert.equal(by.frenzy?.n, 1);
  assert.equal(by.fx?.['arcaneSiphon#fired'], 1);
  const stats = startStats(b.units);
  tally(stats, events, b.units);
  assert.equal(stats[0].kills, 1);
  assert.ok(fightXp(b)[by.def] > XP_TAKE_PART);
});

for (const revive of [false, true]) test(`lethal landed blow retains post-hit hooks (revive=${revive})`, () => {
  const { b, by, to } = arena();
  by.hp = 1;
  to.hp = 1;
  if (revive) {
    to.side = 'hero';
    b.relics = { revive: true } as NonNullable<typeof b.relics>;
  }
  by.eq = { ...emptyStats(), abilities: [{ id: 'honestStrike', s: 1, name: 'Honest Strike' }] };
  b.pending.push({ at: 100, kind: 'land', by: by.id, to: to.id, dmg: 20, heavy: false });
  stepBattle(b);
  assert.equal(to.alive, revive);
  assert.equal(by.hp, 6);
  assert.equal(by.fx?.['honestStrike#n'], 1);
  assert.equal(by.kills ?? 0, revive ? 0 : 1);
});

test('a dead melee attacker cancels its queued strike', () => {
  const { b, by, to } = arena('werewolf');
  by.alive = false;
  by.hp = 0;
  const hp = to.hp;
  b.pending.push({ at: 100, kind: 'land', by: by.id, to: to.id, dmg: 20, heavy: false });
  assert.ok(!stepBattle(b).some((e) => e.kind === 'hit'));
  assert.equal(to.hp, hp);
});

test('self damage absorbed by a shield or followed by revival still earns no contribution', () => {
  const { b, by } = arena('knight');
  const events: BattleEvent[] = [];
  by.shield = { hp: 10, until: 5000 };
  const hp = by.hp;
  assert.equal(hurt(b, by, by, 10, false, false, events, 'dot'), false);
  assert.equal(by.hp, hp);
  by.hp = 1;
  b.relics = { revive: true } as NonNullable<typeof b.relics>;
  assert.equal(hurt(b, by, by, 10, false, false, events, 'dot'), true);
  assert.equal(by.alive, true);
  assert.ok(by.hp > 0);
  assert.equal(by.dealt ?? 0, 0);
  assert.equal(by.kills ?? 0, 0);
  assert.equal(by.slain ?? 0, 0);
});
