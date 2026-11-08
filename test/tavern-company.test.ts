import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tavernCompany, tavernGuestArt, TAVERN_SEATS } from '../src/render/tavernCompany';
import { existsSync } from 'node:fs';
import { startedMeta } from '../src/sim/meta';
import { kindPower } from '../src/sim/power';
import { ALL_HEROES } from '../src/sim/units';

test('tavern guests are the five highest dossier powers, independent of the equipped party', () => {
  const meta = startedMeta(7);
  meta.unlocked = ALL_HEROES.slice(0, 12);
  meta.party = [];
  const guests = tavernCompany(meta);
  assert.equal(new Set(guests.map((hero) => hero.kind)).size, 5);
  for (const [index, guest] of guests.entries()) {
    assert.equal(guest.power, kindPower(meta, guest.kind));
    if (index) assert.ok(guests[index - 1].power >= guest.power);
  }
  for (const kind of meta.unlocked.filter((kind) => !guests.some((hero) => hero.kind === kind))) {
    assert.ok(kindPower(meta, kind) <= guests[4].power, `${kind} is no stronger than a guest`);
  }
});

test('a hero becoming stronger replaces a guest and unchanged strength keeps a stable order', () => {
  const meta = startedMeta(7);
  meta.unlocked = ALL_HEROES.slice(0, 12);
  const before = tavernCompany(meta);
  const outside = meta.unlocked.find((kind) => !before.some((hero) => hero.kind === kind))!;
  meta.xp[outside] = 10_000_000;
  const after = tavernCompany(meta);
  assert.equal(after[0].kind, outside);
  assert.equal(after.length, 5);
  assert.deepEqual(tavernCompany(meta), after);
  meta.unlocked = meta.unlocked.filter((kind) => kind !== outside);
  assert.ok(tavernCompany(meta).every((hero) => hero.kind !== outside));
});

test('a young or empty save shows only its recruited heroes without placeholders or strangers', () => {
  const meta = startedMeta(7);
  meta.unlocked = ['knight', 'wizard', 'knight', 'unknown'];
  assert.deepEqual(tavernCompany(meta).map((hero) => hero.kind).sort(), ['knight', 'wizard']);
  meta.unlocked = [];
  assert.deepEqual(tavernCompany(meta), []);
});

test('every hero can occupy every distinct seat with one of its two real seated paintings', () => {
  assert.equal(new Set(TAVERN_SEATS.map((seat) => seat.id)).size, 5);
  assert.equal(TAVERN_SEATS[0].facing, 'right');
  assert.equal(TAVERN_SEATS[1].facing, 'left');
  for (const kind of ALL_HEROES) {
    const paths = new Set(TAVERN_SEATS.map((_, place) => tavernGuestArt(kind, place)));
    assert.equal(paths.size, 2, `${kind} needs exactly two paintings`);
    for (const path of paths) assert.ok(existsSync(path.replace('ui/tavern/', 'src/art/tavern/guests/')), path);
  }
});
