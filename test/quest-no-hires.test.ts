// QUEST-POSSIBLE (docs/notes/quest-possible.md): "no sellsword hired at the cart". An army run starts with no hero and gold for two Hires, so
// every hero on its board is a summon; a quest that barred hires (`noHires`, read from `run.summons`) could never be met. The rule now
// reads the outside help hired (`Run.hired`): the cart's sellsword and guest, and a deserters' captain paid his wages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armyRun, catalogueRun, startStage, summon, noteHired, type Run } from '../src/sim/run';
import { startedMeta } from '../src/sim/meta';
import { condMet, questFightOf } from '../src/sim/quests';
import type { Cond } from '../src/sim/questData';
import { chooseOption } from '../src/sim/events';
import { applyRoad } from '../src/sim/midEvents';
import { takeGuest } from '../src/sim/guest';
import { ruleLines } from '../src/sim/questGoto';
import { chainById } from '../src/sim/eidolonChainData';
import { HEROES } from '../src/sim/units';

/** A Hard Undead Legion run at the Bone Captain's wave, its squad bought with Hire, the captain down. */
function captainDown(run: Run) {
  const meta = startedMeta(4);
  const b = startStage(run);
  for (const u of b.units) if (u.side === 'foe') u.alive = false;
  return questFightOf({ battle: b, won: true, stage: run.stage, stars: 3, run, meta });
}
function hardRun(): Run {
  const run = armyRun(21, 'undead', HEROES, undefined, 1);
  run.gold = 2000;
  for (let i = 0; i < 3; i++) assert.ok(summon(run), 'a Hire');
  run.stage = 8;
  return run;
}

test('the party’s own Hires are not hired help: Askel’s bell can be rung', () => {
  const run = hardRun();
  assert.ok(run.summons >= 3, 'every army run buys its heroes with Hire');
  const f = captainDown(run);
  assert.equal(f.hires, 0);
  const askel3 = chainById('askel')!.parts.find((p) => p.id === 'askel3')!;
  assert.ok(condMet(askel3.goal as Cond, f), "the Kennel-Master's Bell is met");
  assert.ok(f.bosses?.includes('boneCaptain'));
});

test('a sellsword, a guest or a deserters’ captain hired is outside help: the rule fails, and a resumed run remembers', () => {
  const sell = hardRun();
  sell.event = { kind: 'merchant', stage: 7, title: '', text: '', options: [{ label: 'A sellsword', text: '', cost: 0, effect: { t: 'hire', kind: 'knight' } }] } as unknown as Run['event'];
  assert.ok(chooseOption(sell, 0));
  assert.equal(sell.hired, 1);
  assert.ok(!condMet({ noHires: true }, captainDown(sell)));

  const guest = hardRun();
  guest.event = { kind: 'merchant', stage: 7, title: '', text: '', options: [{ label: 'A guest', text: '', cost: 0, effect: { t: 'guest', kind: 'paladin' } }] } as unknown as Run['event'];
  assert.ok(chooseOption(guest, 0));
  assert.equal(guest.hired, 1);
  assert.ok(takeGuest(hardRun(), 'paladin', 0), 'a guest taken outside the cart (a regular riding along) is not counted as hired');

  const desert = hardRun();
  applyRoad(desert, { line: '', hire: 'archer' }, 0);
  assert.equal(desert.hired, 1);

  // (kept on the run: a resumed run remembers, and junk is read as none)
  assert.equal(catalogueRun(JSON.parse(JSON.stringify(sell))).hired, 1);
  assert.equal(catalogueRun({ ...hardRun(), hired: -3 }).hired, undefined);
  const old = hardRun();
  delete old.hired;
  assert.equal(captainDown(old).hires, 0, 'a run saved before the fact counts none');
  noteHired(old);
  assert.equal(old.hired, 1);
});

test('the rule chip says what the rule is', () => {
  assert.ok(ruleLines({ id: 'x', title: '', giver: '', text: '', offer: [], going: '', done: [], goal: { kind: 'wavesWon', n: 1, noHires: true }, reward: {} } as never).includes('No sellsword hired at the cart'));
});
