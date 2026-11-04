// DEPTH-BUILD (docs/notes/depth-build.md): the Library's rooms, the Reading Room and the Scriptorium.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CROSS_TUNE, canRead, grantBook, queueStudy, settleStudy, slotFor, startStudy, studyLength, unqueueStudy, whyNotRead, crossOf } from '../src/sim/books';
import { bookById } from '../src/sim/bookData';
import { startedMeta } from '../src/sim/meta';

const meta = (library: number) => {
  const m = startedMeta(1);
  m.unlocked = [...new Set([...m.unlocked, 'knight', 'lightningMage', 'cleric'])];
  m.castle.library = library;
  return m;
};

test('a queued book starts when the first is learnt (Reading Room), and only with the room', () => {
  const m = meta(1);
  grantBook(m, 'boatswainsHook');
  grantBook(m, 'whirlingStep');
  assert.ok(startStudy(m, 'knight', 'whirlingStep'));
  assert.equal(queueStudy(m, 'knight', 'boatswainsHook'), false, 'no Reading Room');
  m.castle.library = 2;
  assert.equal(queueStudy(m, 'knight', 'whirlingStep'), false, 'not the book in hand');
  assert.ok(queueStudy(m, 'knight', 'boatswainsHook'));
  assert.equal(m.books?.boatswainsHook ?? 0, 0, 'its copy left the bag');
  const len = studyLength(bookById('whirlingStep')!, m.castle.library);
  for (let i = 0; i < len; i++) settleStudy(m, ['knight']);
  assert.ok(m.learned!.knight.includes('whirlingStep'));
  assert.deepEqual(m.study?.knight, { book: 'boatswainsHook', done: 0 }, 'the queued book started');
  assert.equal(m.studyNext, undefined);
  // (unqueue gives the copy back)
  grantBook(m, 'bountyLedger');
  assert.ok(queueStudy(m, 'knight', 'bountyLedger'));
  assert.ok(unqueueStudy(m, 'knight'));
  assert.equal(m.books!.bountyLedger, 1);
});

test('a book of another calling with the Scriptorium: one a hero, at three quarters of its strength', () => {
  const m = meta(4);
  grantBook(m, 'firstFires');
  grantBook(m, 'morningPrayers');
  const fires = bookById('firstFires')!;
  assert.equal(canRead(m, 'knight', fires), false);
  assert.equal(whyNotRead(m, 'knight', 'firstFires'), 'Not of this calling');
  m.castle.library = 5;
  assert.equal(canRead(m, 'knight', fires), true);
  assert.ok(startStudy(m, 'knight', 'firstFires'));
  assert.equal(crossOf(m, 'knight'), 'firstFires');
  assert.equal(canRead(m, 'knight', bookById('morningPrayers')!), false, 'one book of another calling a hero');
  assert.equal(canRead(m, 'lightningMage', fires), true, 'its own calling as ever');
  const own = slotFor('lightningMage', 'firstFires')!;
  const cross = slotFor('knight', 'firstFires')!;
  assert.ok(Math.abs(cross.tune - own.tune * CROSS_TUNE) < 1e-9);
  // (a lost technique stays with its own calling)
  assert.equal(canRead(m, 'cleric', bookById('ninefoldCut')!), false);
});
