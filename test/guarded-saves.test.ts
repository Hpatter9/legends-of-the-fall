// GUARDED-SAVES (docs/notes/guarded-saves.md): a save never stops the game. A full or refused storage is caught (`sim/saveGuard.ts`), the
// page is told once (`saveNotice.ts`), and a save that cannot be read is kept aside before the game begins afresh.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guardedSave, isQuotaError, onSaveTrouble, type SaveTrouble } from '../src/sim/saveGuard';
import { keepUnreadable, loadMeta, newMeta, saveMeta, UNREADABLE_KEY } from '../src/sim/meta';
import { saveRun, saveSlot, type Run } from '../src/sim/run';
import { saveStand, type StandRun } from '../src/sim/stand';
import { SAVE_WORDS, UNREADABLE_WORDS } from '../src/saveNotice';

/** A storage as small as asked: writes past `room` characters throw as a full browser storage does. */
function store(room = Infinity, refuse = false) {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (refuse) throw Object.assign(new Error('The operation is insecure.'), { name: 'SecurityError' });
      const used = [...data].reduce((n, [key, val]) => n + (key === k ? 0 : key.length + val.length), 0);
      if (used + k.length + v.length > room) throw Object.assign(new Error('Setting the value exceeded the quota.'), { name: 'QuotaExceededError', code: 22 });
      data.set(k, v);
    },
  };
}

test('a full storage is caught: the save says false, the listener hears "full", nothing throws', () => {
  const heard: [SaveTrouble, string][] = [];
  onSaveTrouble((why, key) => heard.push([why, key]));
  const s = store(10);
  assert.equal(guardedSave(s, 'legends.meta', 'x'.repeat(100)), false);
  assert.deepEqual(heard, [['full', 'legends.meta']]);
  assert.equal(guardedSave(s, 'a', 'b'), true, 'a write that fits still goes through');
  onSaveTrouble(null);
});

test('a refused write is told apart from a full one', () => {
  const heard: SaveTrouble[] = [];
  onSaveTrouble((why) => heard.push(why));
  assert.equal(guardedSave(store(Infinity, true), 'k', 'v'), false);
  assert.deepEqual(heard, ['refused']);
  assert.ok(isQuotaError({ name: 'QuotaExceededError' }));
  assert.ok(isQuotaError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' }));
  assert.ok(!isQuotaError(new Error('other')));
  onSaveTrouble(null);
});

test('every saver of the game is guarded: the meta, a run, a mode slot and the Last Stand', () => {
  const full = store(0);
  assert.equal(saveMeta(newMeta(7), full), false);
  assert.equal(saveRun({ roster: [], gold: 0 } as unknown as Run, full), false);
  assert.equal(saveSlot({ roster: [], gold: 0, mode: { kind: 'quest' } } as unknown as Run, full), false);
  assert.equal(saveStand({ roster: [] } as unknown as StandRun, full), false);
  const room = store();
  assert.equal(saveMeta(newMeta(7), room), true);
  assert.ok(room.data.has('legends.meta'));
});

test('a listener that throws stops nothing either', () => {
  onSaveTrouble(() => {
    throw new Error('the notice failed');
  });
  assert.equal(saveMeta(newMeta(7), store(0)), false);
  onSaveTrouble(null);
});

test('an unreadable save is handed over before the fresh one is made; a good one or none is not', () => {
  const seen: string[] = [];
  const bad = store();
  bad.data.set('legends.meta', '{"seed":7,"crowns":120,"unlocked":["knight"');
  const m = loadMeta(5, bad, (raw) => seen.push(raw));
  assert.equal(m.crowns, newMeta(5).crowns, 'a fresh save');
  assert.deepEqual(seen, ['{"seed":7,"crowns":120,"unlocked":["knight"']);
  // (readable text that is not a save is unreadable too)
  const odd = store();
  odd.data.set('legends.meta', '{"hello":1}');
  loadMeta(5, odd, (raw) => seen.push(raw));
  assert.equal(seen.length, 2);
  const good = store();
  saveMeta({ ...newMeta(7), crowns: 345 }, good);
  assert.equal(loadMeta(5, good, (raw) => seen.push(raw)).crowns, 345);
  loadMeta(5, store(), (raw) => seen.push(raw));
  assert.equal(seen.length, 2, 'neither a good save nor no save is unreadable');
});

test('the unreadable text is kept aside, the first one only, and the game then saves afresh beside it', () => {
  const s = store();
  assert.equal(keepUnreadable('first broken', s), true);
  assert.equal(keepUnreadable('second broken', s), true);
  assert.equal(s.data.get(UNREADABLE_KEY), 'first broken', 'never written over');
  saveMeta(newMeta(9), s);
  assert.equal(s.data.get(UNREADABLE_KEY), 'first broken');
  assert.ok(s.data.has('legends.meta'));
  assert.equal(keepUnreadable('x'.repeat(50), store(10)), false, 'a full storage cannot keep it, and says so');
});

test('the words the player is told', () => {
  assert.equal(SAVE_WORDS.full.lines[0], 'Your phone’s storage is full: progress can’t be saved until space is freed.');
  assert.ok(SAVE_WORDS.refused.lines.length > 0);
  assert.match(UNREADABLE_WORDS.kept, /kept on this phone/);
  assert.match(UNREADABLE_WORDS.lost, /could not be kept/);
});

test('the page listens before its first save, and tells of an unreadable save before beginning afresh', () => {
  const src = readFileSync('src/main.ts', 'utf8');
  const watch = src.indexOf('watchSaves();');
  const load = src.indexOf('this.meta = loadMeta(');
  const firstSave = src.indexOf('saveMeta(this.meta)');
  assert.ok(watch > 0 && watch < load && load < firstSave);
  assert.match(src, /if \(unreadable !== null\) await tellUnreadable\(keepUnreadable\(unreadable\)\)/);
});
