// Skill books (docs/notes/shop-books-gear.md): who reads what, study by fights (the library's cut and its students), learning, the two
// slots (either slot, never both, own skills swappable back), the book's slot re-costed for the reader's pool with no revive face, the
// loadout riding on the boost, a hero with no loadout fighting exactly as before, every book castable by every reader, and saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, fight, place, startBattle, stepBattle, type Battle } from '../src/sim/battle';
import { BOOKS, READS, bookById } from '../src/sim/bookData';
import { canRead, fightLoadout, kitWithLoadout, loadoutOf, readBooks, setSlot, settleStudy, slotFor, startStudy, stopStudy, studentCap, studyLeft, studyLength, whyNotRead, grantBook, OWN1, OWN2 } from '../src/sim/books';
import { HERO_KITS, heroKitOf, resMax } from '../src/sim/heroKits';
import { loadMeta, startedMeta, type Meta } from '../src/sim/meta';
import { heroStats } from '../src/sim/talents';
import { ALL_HEROES } from '../src/sim/units';
import { bareBoard } from './bare';

const meta = (): Meta => {
  const m = startedMeta(5);
  m.unlocked = [...ALL_HEROES];
  return m;
};

test('every hero reads exactly one kind of book, and every book teaches a real skill of the right kind of hero', () => {
  const all = Object.values(READS).flat();
  assert.equal(all.length, ALL_HEROES.length);
  assert.deepEqual([...new Set(all)].sort(), [...ALL_HEROES].sort());
  for (const b of BOOKS) {
    const src = HERO_KITS()[b.from.hero];
    assert.ok(src, b.id);
    if (b.kind !== 'universal') assert.ok(READS[b.kind].includes(b.from.hero), `${b.id} comes from a reader of its own kind`);
  }
});

test('a hero reads only its kind and the universal books, and not a skill it knows', () => {
  const m = meta();
  assert.equal(canRead(m, 'knight', bookById('whirlingStep')!), true);
  assert.equal(canRead(m, 'knight', bookById('firstFires')!), false, 'a fighter does not read a grimoire');
  assert.equal(canRead(m, 'cleric', bookById('wellOfStars')!), true, 'universal');
  assert.equal(canRead(m, 'barbarian', bookById('whirlingStep')!), false, 'its own skill');
});

test('study: a copy leaves the bag, each fight moves it on, and the skill is learned at the end', () => {
  const m = meta();
  grantBook(m, 'whirlingStep');
  assert.equal(whyNotRead(m, 'knight', 'firstFires'), 'No copy in the bag');
  assert.ok(startStudy(m, 'knight', 'whirlingStep'));
  assert.equal(m.books, undefined, 'the copy is in hand');
  assert.equal(studyLeft(m, 'knight'), 5);
  for (let i = 0; i < 4; i++) settleStudy(m, ['knight', 'samurai']);
  assert.equal(studyLeft(m, 'knight'), 1);
  const notes = settleStudy(m, ['knight']);
  assert.deepEqual(notes, [{ kind: 'knight', book: 'whirlingStep', left: 0, learned: true }]);
  assert.deepEqual(m.learned, { knight: ['whirlingStep'] });
  assert.equal(m.study, undefined);
  assert.equal(settleStudy(m, ['knight']).length, 0, 'nothing more to study');
});

test('a book put down goes back to the bag with its progress kept; changing books does the same', () => {
  const m = meta();
  grantBook(m, 'whirlingStep');
  grantBook(m, 'shieldwallDrill');
  startStudy(m, 'samurai', 'whirlingStep');
  settleStudy(m, ['samurai']);
  settleStudy(m, ['samurai']);
  assert.ok(startStudy(m, 'samurai', 'shieldwallDrill'));
  assert.equal(m.books?.whirlingStep, 1, 'the first book is back in the bag');
  assert.equal(m.studyKept?.samurai?.whirlingStep, 2);
  stopStudy(m, 'samurai');
  assert.ok(startStudy(m, 'samurai', 'whirlingStep'));
  assert.equal(studyLeft(m, 'samurai'), 3, 'it picks up where it was left');
});

test('the library cuts study and takes more students', () => {
  const b = bookById('whirlingStep')!;
  assert.deepEqual([0, 1, 3, 5].map((l) => studyLength(b, l)), [5, 5, 4, 3]);
  assert.equal(studyLength(bookById('riverbankIaido')!, 5), 8);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(studentCap), [1, 2, 2, 3, 3, 4]);
  const m = meta();
  m.castle.library = 0;
  grantBook(m, 'whirlingStep', 2);
  assert.ok(startStudy(m, 'knight', 'whirlingStep'));
  assert.match(whyNotRead(m, 'samurai', 'whirlingStep') ?? '', /room for 1 student/);
  m.castle.library = 1;
  assert.ok(startStudy(m, 'samurai', 'whirlingStep'));
});

test('the slots: either slot takes any known skill, a skill never sits in both, and back to its own two drops the loadout', () => {
  const m = meta();
  assert.equal(setSlot(m, 'knight', 1, 'whirlingStep'), false, 'not learned yet');
  m.learned = { knight: ['whirlingStep'] };
  assert.ok(setSlot(m, 'knight', 2, 'whirlingStep'));
  assert.deepEqual(loadoutOf(m, 'knight'), [OWN1, 'whirlingStep']);
  assert.ok(setSlot(m, 'knight', 1, 'whirlingStep'));
  assert.deepEqual(loadoutOf(m, 'knight'), ['whirlingStep', OWN1], 'the two trade places');
  assert.ok(setSlot(m, 'knight', 1, OWN1));
  assert.ok(setSlot(m, 'knight', 2, OWN2));
  assert.equal(m.loadout, undefined);
  assert.equal(fightLoadout(m, 'knight'), undefined);
});

test('a book slot costs the same share of the reader pool, keeps the skill strength, and leaves the revive with its own hero', () => {
  const book = bookById('morningPrayers')!;
  const src = HERO_KITS().cleric.s2;
  assert.ok(src.revive, 'the cleric heals with a revive face');
  const onDruid = slotFor('druid', book.id)!;
  assert.equal(onDruid.revive, undefined);
  assert.equal(onDruid.tune, src.tune);
  const stam = slotFor('knight', 'whirlingStep')!;
  const whirl = HERO_KITS().barbarian.s1;
  assert.equal(stam.cost, whirl.cost, 'stamina to stamina');
  const onMage = slotFor('lightningMage', 'firstFires')!;
  assert.ok(Math.abs(onMage.cost / resMax('mana') - HERO_KITS().wizard.s1.cost / resMax('mana')) < 0.01);
  const kit = kitWithLoadout('knight', ['whirlingStep', OWN2])!;
  assert.equal(kit.s1.skill.name, 'Whirlwind');
  assert.equal(kit.s2, HERO_KITS().knight.s2);
  assert.equal(kit.pool, 'stamina');
});

test('the loadout rides on the boost into the fight; a hero with none fights with its own kit', () => {
  const m = meta();
  assert.equal(heroStats(m, 'knight')?.book, undefined);
  m.learned = { knight: ['whirlingStep'] };
  setSlot(m, 'knight', 1, 'whirlingStep');
  const eq = heroStats(m, 'knight');
  assert.deepEqual(eq?.book, ['whirlingStep', OWN2]);
  const b = startBattle(3);
  const k = addUnit(b, 'knight', 1, 1, { equip: eq });
  assert.equal(heroKitOf(k)?.s1.skill.name, 'Whirlwind');
  const plain = addUnit(b, 'knight', 2, 1, {});
  assert.equal(heroKitOf(plain), HERO_KITS().knight);
});

function play(b: Battle): void {
  fight(b);
  for (let i = 0; i < 1200 && b.phase === 'fight'; i++) stepBattle(b);
}

test('every book can be cast by every hero who reads it: a fight with it in either slot runs without fault', () => {
  for (const book of BOOKS) {
    const readers = book.kind === 'universal' ? ['knight', 'cleric', 'gorgon', 'wizard'] : READS[book.kind].filter((k) => k !== book.from.hero).slice(0, 3);
    for (const reader of readers)
      for (const slot of [1, 2] as const) {
        const b = startBattle(7, 'orcs');
        bareBoard(b);
        const l: [string, string] = slot === 1 ? [book.id, OWN2] : [OWN1, book.id];
        const eq = { hp: 0, atk: 0, def: 0, atkSpeed: 0, moveSpeed: 0, crit: 0, range: 0, dodge: 0, charge: 0, regen: 0, resist: 0, abilities: [], book: l };
        place(b, reader, 3, 9, undefined, { level: 30, equip: eq });
        place(b, 'knight', 4, 9, undefined, { level: 30 });
        const u = b.units.find((x) => x.def === reader)!;
        assert.equal(heroKitOf(u)!.s1.skill.name, (slot === 1 ? slotFor(reader, book.id) : HERO_KITS()[reader].s1)!.skill.name);
        assert.doesNotThrow(() => play(b), `${book.id} on ${reader} in slot ${slot}`);
      }
  }
});

test('saves: the books, learning, study and loadouts read back; nonsense is dropped, and an old save has none', () => {
  const m = meta();
  grantBook(m, 'firstFires', 2);
  m.learned = { knight: ['whirlingStep', 'firstFires', 'nope'], barbarian: ['whirlingStep'] };
  m.study = { samurai: { book: 'shieldwallDrill', done: 2 }, wizard: { book: 'whirlingStep', done: 1 } };
  m.loadout = { knight: ['whirlingStep', OWN1], samurai: [OWN1, OWN1], cleric: ['firstFires', OWN2] };
  (m.books as Record<string, number>).fake = 3;
  readBooks(m);
  assert.deepEqual(m.books, { firstFires: 2 });
  assert.deepEqual(m.learned, { knight: ['whirlingStep'] });
  assert.deepEqual(m.study, { samurai: { book: 'shieldwallDrill', done: 2 } });
  assert.deepEqual(m.loadout, { knight: ['whirlingStep', OWN1] });
  const store = new Map<string, string>([['legends.meta', JSON.stringify(startedMeta(3))]]);
  const old = loadMeta(1, { getItem: (k) => store.get(k) ?? null });
  for (const k of ['books', 'learned', 'study', 'studyKept', 'loadout', 'stall'] as const) assert.equal(old[k], undefined, k);
});
