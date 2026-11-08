// ASSAULT-PLAN (docs/notes/assault-1.md, phase 1a: the owner's tactics direction): the War Plan's parts drive each platoon on its own until the
// player orders it; the Flank order goes round a foe to its far side before it strikes; the four formations are line, wedge, shield wall and
// loose; scouts reveal the Council's posts until the next assault; and morale is off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startAssault, stepAssault } from '../src/sim/assault/assault';
import { orderPlatoon, setAuto, FORMATIONS, FORMATION_NAMES } from '../src/sim/assault/platoons';
import { scoutHold, scouted, ASSAULT_PRICES } from '../src/sim/assault/economy';
import { defaultPlan, settleAssault } from '../src/sim/assault/assaultMode';
import { startedMeta } from '../src/sim/meta';
import { soundRetreat } from '../src/sim/assault/platoons';
import { stepBattle } from '../src/sim/battle';
import { input, PARTY, quiet, steps } from './assaultKit';

test('the four formations are the owner\'s: line, wedge, shield wall, loose', () => {
  assert.deepEqual(FORMATIONS.map((f) => FORMATION_NAMES[f]), ['Line', 'Wedge', 'Shield Wall', 'Loose']);
});

test('the default plan gives every platoon a part; a flanking platoon makes for the Warpath on its own, then the North Gate', () => {
  assert.deepEqual(Object.values(defaultPlan(PARTY).roles!), ['main', 'main', 'cover', 'flank', 'main']);
  const b = startAssault(input({ roles: { knight: 'main', samurai: 'main', archer: 'cover', wizard: 'flank', dragoon: 'main' } }));
  const h = b.field!.hold!;
  // (the opening walk first; once its route is walked, the flank's part sends it to hold the Warpath's camp (phase 1b), then the North Gate)
  h.platoons[3].route = [h.platoons[3].route[h.platoons[3].route.length - 1]];
  steps(b, 30);
  assert.equal(h.platoons[3].role, 'flank');
  assert.deepEqual(h.platoons[3].order, { kind: 'move', at: h.bp.warpath });
  h.warpath.held = true;
  steps(b, 10);
  assert.deepEqual(h.platoons[3].order, { kind: 'assault', fort: 'northGate' });
});

test('an order from the player takes a platoon off its part until Auto hands it back', () => {
  const b = startAssault(input());
  const h = b.field!.hold!;
  assert.ok(h.platoons.every((p) => !p.manual));
  orderPlatoon(b, 2, { kind: 'hold', at: { u: 90, v: 90 } });
  stepAssault(b);
  assert.ok(h.platoons[2].manual);
  assert.ok(!h.platoons[1].manual);
  steps(b, 30);
  assert.equal(h.platoons[2].order.kind, 'hold', 'the bot leaves an ordered platoon alone');
  setAuto(b, true);
  stepAssault(b);
  assert.ok(!h.platoons[2].manual);
});

test('Flank: the platoon goes round to the far side of its foe, then strikes it', () => {
  const b = quiet();
  const h = b.field!.hold!;
  const f = b.field!;
  // (a lone grunt of the village's band, and the knight's platoon sent round it)
  const post = h.posts.find((p) => p.def.id === 'village')!;
  const foe = f.byId[f.groups[post.group].members[0]];
  orderPlatoon(b, 0, { kind: 'flank', unit: foe.id });
  stepAssault(b);
  assert.equal(h.platoons[0].order.kind, 'flank');
  const hero = f.byId[h.platoons[0].heroId];
  const startU = hero.u;
  const startV = hero.v;
  let turned = false;
  for (let i = 0; i < 900 && !turned; i++) {
    stepAssault(b);
    if ((h.platoons[0].order as { kind: string }).kind === 'focus') turned = true;
  }
  assert.ok(turned, 'it turns to strike once round');
  // (it came at the foe from beyond it: further from where it began than the foe is)
  assert.ok(Math.abs(hero.u - startU) + Math.abs(hero.v - startV) >= Math.abs(foe.u - startU) + Math.abs(foe.v - startV) - 3);
});

test('scouts cost 100 crowns, show the Council\'s posts, and their report is spent by the next assault', () => {
  const m = startedMeta(2);
  m.party = [...PARTY];
  m.crowns = 150;
  assert.ok(!scouted(m, 'orcs'));
  assert.ok(scoutHold(m, 'orcs'));
  assert.equal(m.crowns, 150 - ASSAULT_PRICES.scouts);
  assert.ok(scouted(m, 'orcs'));
  assert.ok(!scoutHold(m, 'orcs'), 'once is enough');
  const b = quiet();
  soundRetreat(b);
  stepBattle(b);
  settleAssault(m, b, 20261108);
  assert.ok(!scouted(m, 'orcs'));
});
