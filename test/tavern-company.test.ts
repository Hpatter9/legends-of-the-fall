import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tavernCompany, tavernGuestArt, TAVERN_SEATS, TAVERN_ACTIVITIES, tavernPlaces } from '../src/render/tavernCompany';
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

test('every hero has an individual activity painting and an appropriate place', () => {
  assert.equal(new Set(TAVERN_SEATS.map((seat) => seat.id)).size, 5);
  assert.deepEqual(Object.keys(TAVERN_ACTIVITIES).sort(), [...ALL_HEROES].sort());
  assert.equal(new Set(Object.values(TAVERN_ACTIVITIES).map(activity => activity.label)).size, ALL_HEROES.length);
  for (const kind of ALL_HEROES) {
    const activity = TAVERN_ACTIVITIES[kind as keyof typeof TAVERN_ACTIVITIES];
    assert.ok(TAVERN_SEATS.some(place => place.id === activity.place));
    const path = tavernGuestArt(kind);
    assert.ok(existsSync(path.replace('ui/tavern/', 'src/art/tavern/guests/')), path);
  }
});

test('activity places are unique and deterministic even when all guests prefer one place', () => {
  for (const kinds of [[], ['knight'], ['knight', 'barbarian', 'karasu', 'buccaneer', 'dhampir'], ['samurai', 'ninjaMonk', 'ranger', 'paladin', 'reaper']]) {
    const places = tavernPlaces(kinds);
    assert.equal(new Set(places).size, kinds.length);
    assert.deepEqual(tavernPlaces(kinds), places);
  }
  const kinds = ['kunoichi', 'knight', 'wizard', 'samurai', 'archer'];
  assert.deepEqual(tavernPlaces(kinds), [0, 1, 2, 3, 4]);
});
