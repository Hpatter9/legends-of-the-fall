// VAELKHAR-HEART (`docs/notes/vaelkhar-heart.md`): the Heart he wants back. Held in a run (settled, or saved in a slot) it is noted in the save;
// his binding with it held takes it back and gives the horn a gift (his drain 25% becomes 30%); without it nothing changes; the save keeps it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, stepBattle, type Battle } from '../src/sim/battle';
import { armEidolon, RIDER } from '../src/sim/eidolons';
import { orderEidolon } from '../src/sim/orders';
import { readEidolons } from '../src/sim/warHorn';
import { startedMeta, type Meta } from '../src/sim/meta';
import { armyRun } from '../src/sim/run';
import { settleRun } from '../src/sim/modes';
import { recordOf } from '../src/sim/armies';
import { chainById } from '../src/sim/eidolonChainData';
import { beginChain, bindChain, readyToBind } from '../src/sim/eidolonChains';
import { DRAIN_GIFT, drainBonus, heartHeld, heartReturned, noteHeart, noteSavedHeart, returnHeart, withHeart } from '../src/sim/vaelkharHeart';
import { FIXED_PACKS } from '../src/sim/starter';
import { bindEidolon } from '../src/sim/warHorn';

/** A save with every other Eidolon bound, the Calamity cleared and Vaelkhar's chain ready to bind. */
function ready(): Meta {
  const m = startedMeta(7);
  m.unlocked = [...FIXED_PACKS[0].heroes];
  m.party = [...m.unlocked];
  for (const id of ['orcs', 'beasts', 'wildwood', 'labyrinth', 'infernal']) m.armies[id] = { ...recordOf(m, id), clears: 1 };
  m.calamity = { best: 30, clears: 1 };
  for (const e of ['askel', 'nivra', 'aurelan', 'voltara', 'gorm']) bindEidolon(m, e);
  assert.ok(beginChain(m, 'vaelkhar'));
  m.quests!.chains = { ...m.quests!.chains, vaelkhar: { part: 3, progress: 0, trialWon: true } };
  m.quests!.pieces = ['blackScale', 'unansweredLetter', 'crownTine'];
  assert.equal(readyToBind(m)?.id, 'vaelkhar');
  return m;
}

test('the Heart is noted from a settled run, or from a saved slot, and only once', () => {
  const m = ready();
  assert.equal(heartHeld(m), false);
  assert.equal(noteHeart(m, ['maneThread']), false);
  assert.equal(noteHeart(m, ['maneThread', 'dragonHeart']), true);
  assert.ok(heartHeld(m));
  assert.equal(noteHeart(m, ['dragonHeart']), false, 'already noted');
  // (a settled fight of a run holding it)
  const n = ready();
  const run = armyRun(5, 'orcs', n.party, n.castle);
  run.relics = ['dragonHeart'];
  settleRun(n, run, { won: false, stage: 1, stars: 0 });
  assert.ok(heartHeld(n));
  // (a run saved in a slot: the tower's)
  const s = ready();
  const slots: Record<string, string> = { 'legends.tower': JSON.stringify({ relics: ['oathRing', 'dragonHeart'] }), 'legends.run': 'not json' };
  assert.equal(noteSavedHeart(s, { getItem: (k) => slots[k] ?? null }), true);
  assert.ok(heartHeld(s));
  const none = ready();
  assert.equal(noteSavedHeart(none, { getItem: () => null }), false);
  assert.equal(heartHeld(none), false);
});

test("binding Vaelkhar with the Heart held returns it: the gift is the horn's, once; without it, nothing", () => {
  const m = ready();
  noteHeart(m, ['dragonHeart']);
  const c = chainById('vaelkhar')!;
  const beats = withHeart(c.binding!);
  assert.equal(beats.length, c.binding!.length + 2);
  assert.equal(beats.at(-1)!.beat, 'bound');
  assert.ok(beats.every((b, i) => i === 0 || b.at >= beats[i - 1].at), 'beats in order');
  assert.ok(beats.some((b) => b.who === 'eidolon' && /heart/.test(b.text ?? '')));
  assert.equal(drainBonus(m), 0, 'before the binding');
  assert.ok(bindChain(m, 'vaelkhar'));
  assert.ok(heartReturned(m) && !heartHeld(m));
  assert.equal(drainBonus(m), DRAIN_GIFT);
  assert.equal(returnHeart(m), false, 'once');
  assert.equal(noteHeart(m, ['dragonHeart']), false, 'a return is never undone');
  // (no Heart: bound as before, no gift)
  const plain = ready();
  assert.ok(bindChain(plain, 'vaelkhar'));
  assert.equal(drainBonus(plain), 0);
  assert.equal(plain.eidolons!.heart, undefined);
});

test('the gift in a fight: his drain heals a share more once the Heart is returned', () => {
  const heal = (bonus: number): number => {
    const b: Battle = startBattle(3);
    bareBoard(b);
    b.units = [];
    b.phase = 'fight';
    b.kits = {};
    const h = addUnit(b, 'knight', 3, 9);
    addUnit(b, 'orcWarlord', 4, 1, { hp: 30 });
    assert.ok(armEidolon(b, 'vaelkhar', { drainBonus: bonus }));
    assert.ok(orderEidolon(b, 'vaelkhar'));
    stepBattle(b);
    h.hp = 10;
    h.dealt = (h.dealt ?? 0) + 400;
    stepBattle(b);
    return h.hp - 10;
  };
  const base = heal(0);
  const gift = heal(DRAIN_GIFT);
  assert.equal(base, Math.round(400 * RIDER.DRAIN));
  assert.equal(gift, Math.round(400 * (RIDER.DRAIN + DRAIN_GIFT)));
});

test('the save keeps the Heart (junk dropped)', () => {
  assert.equal(readEidolons({ horn: 0, heart: 'held' })?.heart, 'held');
  assert.equal(readEidolons({ horn: 0, heart: 'returned' })?.heart, 'returned');
  assert.equal(readEidolons({ horn: 0, heart: 'lost' })?.heart, undefined);
  assert.equal(readEidolons({ horn: 0 })?.heart, undefined);
});
