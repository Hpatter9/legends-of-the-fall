// SPELL-SLOTS (docs/notes/spell-slots.md): one spell slot at the start, the others opening with the army stars; a save from before
// keeps the slots it had filled; equipping is held to the open slots; each opening is told once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, newMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { ARMIES, totalStars } from '../src/sim/armies';
import { castList, equipBlock, equipSpell, fillSlots, fitSchool, unequipSpell, SCHOOL_IDS } from '../src/sim/schools';
import { readLoadout } from '../src/sim/spells';
import { SLOT_STARS, slotLockLine, slotsAtStars, slotsEmpty, slotWaiting, spellSlots, tellSlots } from '../src/sim/spellSlots';
import { SPELLS_NEED } from '../src/sim/modeUnlock';
import { needMet } from '../src/sim/quests';
import { QUESTS } from '../src/sim/questData';
import { TIPS } from '../src/tips';
import { botLoadout } from '../tools/autoplay';

const store = () => {
  const raw: Record<string, string> = {};
  return { raw, getItem: (k: string) => raw[k] ?? null, setItem: (k: string, v: string) => void (raw[k] = v) };
};
/** Give a save this many army stars (three an army, the first armies first). */
const withStars = (m: Meta, n: number): Meta => {
  let left = n;
  for (const a of ARMIES) {
    if (left <= 0) break;
    const got = Math.min(3, left);
    m.armies[a.id] = { waves: a.waves.length, best: a.waves.length, won: a.waves.length, clears: 1, stars: {}, met: { 0: (1 << got) - 1 } };
    left -= got;
  }
  assert.equal(totalStars(m), n, 'the stars were given');
  return m;
};

test('how many slots are open at N stars: one at the start, then 3, 10 and 20', () => {
  assert.deepEqual([...SLOT_STARS], [0, 3, 10, 20]);
  assert.deepEqual([0, 2, 3, 9, 10, 19, 20, 99].map(slotsAtStars), [1, 1, 2, 2, 3, 3, 4, 4]);
  // (the third slot comes with the Chapel and the Spells tab)
  assert.equal(SLOT_STARS[2], SPELLS_NEED);
  const m = newMeta(1);
  assert.equal(spellSlots(m), 1);
  assert.equal(spellSlots(withStars(newMeta(1), 3)), 2);
  assert.equal(spellSlots(withStars(newMeta(1), 12)), 3);
  assert.equal(spellSlots(withStars(newMeta(1), 20)), 4);
  assert.equal(slotLockLine(withStars(newMeta(1), 6), 2), 'Opens at 10 ★ (you have 6)');
});

test('a new save carries Heal alone, under every ruler', () => {
  for (const id of SCHOOL_IDS) {
    const m = newMeta(1);
    fitSchool(m.spellbook, id, spellSlots(m));
    assert.deepEqual(castList(m.spellbook), ['heal'], id);
  }
  // (and through a save and a load)
  const s = store();
  const m = newMeta(2);
  fitSchool(m.spellbook, 'iron_stag', spellSlots(m));
  saveMeta(m, s);
  const back = loadMeta(1, s);
  assert.equal(spellSlots(back), 1);
  assert.deepEqual(castList(back.spellbook), ['heal']);
  assert.equal(back.slotsTold, 1);
});

test('an old save keeps the slots it had filled, and is not told of them', () => {
  // (a save from before the slots: three spells in the slots, no stars, no `slots` key)
  assert.equal(readLoadout({ owned: ['heal', 'meteor', 'haste', 'rally', 'shield'], equipped: ['rally', 'shield'], open: 'heal', school: 'iron_stag' }).slots, 3);
  assert.equal(readLoadout({ owned: ['heal', 'rally', 'shield', 'bulwark'], equipped: ['rally', 'shield', 'bulwark'], open: 'heal' }).slots, 4);
  // (one that had emptied its slots follows the new rule; nothing saved at all is the old starting three)
  assert.equal(readLoadout({ owned: ['heal'], equipped: [] }).slots, undefined);
  assert.equal(readLoadout({ owned: ['heal'], equipped: ['heal'] }).slots, undefined);
  assert.equal(readLoadout(undefined).slots, 3);
  // (the count once kept is never lowered, even with the spells taken out)
  assert.equal(readLoadout({ owned: ['heal'], equipped: [], slots: 3 }).slots, 3);
  assert.equal(readLoadout({ owned: ['heal'], equipped: [], slots: 99 }).slots, 4);

  const s = store();
  const old = newMeta(3);
  old.spellbook = { owned: ['heal', 'meteor', 'haste', 'rally', 'shield'], equipped: ['rally', 'shield'], open: 'heal', school: 'iron_stag' };
  delete old.slotsTold;
  saveMeta(old, s);
  const m = loadMeta(1, s);
  assert.equal(spellSlots(m), 3);
  assert.equal(m.slotsTold, 3);
  fitSchool(m.spellbook, 'iron_stag', spellSlots(m));
  assert.deepEqual(castList(m.spellbook), ['rally', 'shield', 'heal'], 'nothing lost');
  assert.deepEqual(tellSlots(m, 'iron_stag'), [], 'nothing told');
  // (its fourth slot still opens by the stars)
  withStars(m, 20);
  assert.equal(spellSlots(m), 4);
});

test('equipping is refused on a locked slot', () => {
  const m = newMeta(4);
  const l = fitSchool(m.spellbook, 'iron_stag', spellSlots(m));
  assert.equal(equipBlock(l, 'rally', 'iron_stag', spellSlots(m)), 'Your one open slot is full: unequip a spell first, or win army stars to open another');
  assert.equal(equipSpell(l, 'rally', 'iron_stag', spellSlots(m)), false);
  assert.deepEqual(castList(l), ['heal']);
  // (the one slot takes any spell known: Heal out, Rally in)
  assert.ok(unequipSpell(l, 'heal'));
  assert.ok(equipSpell(l, 'rally', 'iron_stag', spellSlots(m)));
  assert.equal(equipSpell(l, 'heal', 'iron_stag', spellSlots(m)), false);
  // (two slots at three stars)
  withStars(m, 3);
  assert.ok(equipSpell(l, 'heal', 'iron_stag', spellSlots(m)));
  assert.match(equipBlock(l, 'shield', 'iron_stag', spellSlots(m)) ?? '', /2 open slots are full/);
  // (a change of ruler fills no more than the open slots, Heal kept first)
  fitSchool(l, 'ash_empress', spellSlots(m));
  assert.equal(castList(l).length, 2);
  assert.ok(castList(l).includes('heal'));
});

test('a slot that opens while the spellbook is shut takes its default spell; once the book is open it waits, and the tab wears its mark', () => {
  const m = newMeta(5);
  fitSchool(m.spellbook, 'iron_stag', spellSlots(m));
  assert.deepEqual(tellSlots(m, 'iron_stag'), [], 'the first slot is never told');
  withStars(m, 3);
  assert.deepEqual(tellSlots(m, 'iron_stag'), ['Second spell slot unlocked · Rally joins your spells']);
  assert.deepEqual(castList(m.spellbook), ['rally', 'heal']);
  assert.deepEqual(tellSlots(m, 'iron_stag'), [], 'told once');
  assert.equal(slotWaiting(m, 'iron_stag'), false);
  // (the Chapel stands: the third slot is the player's to fill)
  withStars(m, 10);
  m.chapel = true;
  assert.deepEqual(tellSlots(m, 'iron_stag'), ['Third spell slot unlocked · fill it in the spellbook']);
  assert.equal(slotsEmpty(m), 1);
  assert.equal(slotWaiting(m, 'iron_stag'), true);
  assert.ok(equipSpell(m.spellbook, 'shield', 'iron_stag', spellSlots(m)));
  assert.equal(slotWaiting(m, 'iron_stag'), false);
  // (the fourth: the mark shows only when a spell known could fill it; a new save's Steel school knows two, and the open slot holds Heal)
  withStars(m, 20);
  tellSlots(m, 'iron_stag');
  assert.equal(slotsEmpty(m), 1);
  assert.equal(slotWaiting(m, 'iron_stag'), false);
  m.spellbook.owned.push('bulwark');
  assert.equal(slotWaiting(m, 'iron_stag'), true);
  // (two slots opened at once are each told)
  const j = withStars(newMeta(6), 10);
  fitSchool(j.spellbook, 'iron_stag', 1);
  assert.equal(tellSlots(j, 'iron_stag').length, 2);
  assert.deepEqual(castList(j.spellbook), ['rally', 'shield', 'heal']);
});

test('fillSlots puts Heal in first, then the school in its order, and never passes the open slots', () => {
  const l = { owned: ['heal', 'meteor', 'haste', 'rally', 'shield'] as never[], equipped: [] as never[] };
  assert.deepEqual(fillSlots(l, 'iron_stag', 1), ['heal']);
  assert.deepEqual(fillSlots(l, 'iron_stag', 3), ['rally', 'shield']);
  assert.deepEqual(fillSlots(l, 'iron_stag', 4), [], 'no third Steel spell known');
});

test('the balance tools\' player casts only the open slots\' spells; the old save of the tables keeps all four', () => {
  assert.deepEqual(botLoadout(undefined, newMeta(7)), ['heal']);
  assert.deepEqual(botLoadout(undefined, withStars(newMeta(7), 3)), ['rally', 'heal']);
  assert.deepEqual(botLoadout(undefined, withStars(newMeta(7), 10)), ['rally', 'shield', 'heal']);
  assert.deepEqual(botLoadout(undefined, startedMeta(7)), ['rally', 'shield', 'heal']);
  assert.equal(spellSlots(startedMeta(7)), 4);
});

test('the quest that counts Meteor waits for the spellbook; the first-hour tips hold with one slot', () => {
  const q = QUESTS.find((x) => x.id === 'smokeTheBees')!;
  const m = withStars(newMeta(8), 9);
  assert.equal(needMet(m, q.needs!), false);
  m.chapel = true;
  assert.equal(needMet(m, q.needs!), true);
  assert.match(TIPS.mana.text, /begin with Heal/);
  assert.doesNotMatch(TIPS.mana.text, /has spells/);
  assert.match(TIPS.spellbook.text, /up to four as stars open slots/);
});
