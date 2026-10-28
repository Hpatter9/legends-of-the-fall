// The Battle page names the army in front only when it is new to the player, not on every launch (docs/notes/ux-fixes.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMY_SHOWN_KEY, announceArmy, resetArmyShown } from '../src/armyShown';
import { SAVE_KEYS } from '../src/settings';

const store = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

test('an army is named on the visit it is new, and stays named for that visit', () => {
  resetArmyShown();
  const s = store();
  assert.equal(announceArmy('undead', s), true, 'first time: named');
  assert.equal(s.getItem(ARMY_SHOWN_KEY), 'undead');
  assert.equal(announceArmy('undead', s), true, 'a redraw on the same visit keeps it');
});

test('the next launch with the same army is quiet; another army is named again', () => {
  resetArmyShown();
  const s = store();
  announceArmy('undead', s);
  resetArmyShown(); // (the page is closed and opened again)
  assert.equal(announceArmy('undead', s), false, 'reopened: not named again');
  assert.equal(announceArmy('beasts', s), true, 'a new army in front, or a run against another: named');
  resetArmyShown();
  assert.equal(announceArmy('beasts', s), false);
  assert.equal(announceArmy('undead', s), true, 'picking the earlier army again counts as a change');
});

test('blocked storage still names the army, and Start over wipes the key', () => {
  resetArmyShown();
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(announceArmy('orcs', broken), true);
  assert.ok(SAVE_KEYS.includes(ARMY_SHOWN_KEY));
});
