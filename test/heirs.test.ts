// Dynasties, phase 6: heirs and the Mantle (src/sim/heirs.ts, docs/notes/dynasty-6.md). No lasting progress changes on passing the mantle;
// the heirloom's cap; one birthright; the twin rule with the elder fielded; the Hall's old mentors migrating; the Blood Grudge, the Heir's
// Promise, the honours and the Elders' table; and the reader keeping it all within its caps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bearerOf, bloodOn, fieldedOf, fieldsElder, lineOf, openDynasty, readDynasty, stageOfKind, noteServed, wavesThisSeason } from '../src/sim/dynasty';
import {
  addSnapshots, askRide, bannerChoices, birthrightSnapshot, bloodGrudgeFor, cadetsOf, changeHonour, fieldBearer, hasHeirs, hearStory, heirPartners, heirPicks, heirState, HEIR_SALT, HEIRS, lapsedLegacy, nameHeir, passMantle,
  promiseXp, regularsOf, seatedToday, storyWaits, takeHeirNote, takeRide, whyNoHeir, whyNoMantle, whyNotHonour,
} from '../src/sim/heirs';
import { HEIR_NAMES } from '../src/sim/heirNames';
import { HEIR_SCENES, HEIR_SCENE_KEYS } from '../src/sim/heirScenes';
import { HEIR_LOOK_IDS, lookMatrix } from '../src/sim/heroLooks';
import { HERO_NAMES } from '../src/sim/heroNames';
import { ALL_HEROES } from '../src/sim/units';
import { bondKey, KINDRED, BOND_POINTS } from '../src/sim/bonds';
import { LEGACY, legacySnapshot, PERKS, retired, seatedMentor } from '../src/sim/legacy';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { xpFor, levelOfKind } from '../src/sim/levels';
import { combineGroups, equipItem, grantEquipment, HEIRLOOM_MAX, itemStats, salvageItem, readEquipment, type NewEquipment } from '../src/sim/equipment';
import { sellPiece } from '../src/sim/stall';
import { newWar } from '../src/sim/nemesis';
import { decorate } from '../src/sim/revenge';
import { BLOOD_GRUDGE } from '../src/sim/nemesisTraits';

const START = 20261102;
const NOW = Date.UTC(2026, 10, 6);
const DAY = 86_400_000;
const dayAfter = (n: number): number => {
  const d = new Date(Date.UTC(2026, 10, 2) + n * DAY);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};
const sword = (rarity: 1 | 2 | 3 | 4 | 5 = 3, level = 5): NewEquipment => ({ base: 'ironSword', rarity, level });

/** A save with the knight a Veteran of level 70, Sworn with the peasant, and a sword on. */
function ready(): Meta {
  const m = startedMeta(9);
  m.unlocked = [...m.unlocked, 'peasant', 'paladin', 'ranger'];
  openDynasty(m, START);
  m.xp.knight = xpFor(70);
  m.dynasty!.lines.knight.bearers[0].served = 7;
  m.bonds = { [bondKey('knight', 'peasant')]: BOND_POINTS[2] };
  m.castle.hall = 2;
  return m;
}
function trained(m: Meta): void {
  assert.ok(nameHeir(m, 'knight', 'peasant', NOW, START));
}

test('naming an heir: a Veteran of level 60 with a Sworn kindred partner; seven days of training', () => {
  const m = ready();
  assert.equal(HEIRS.LEVEL, LEGACY.RETIRE_LEVEL);
  assert.deepEqual(heirPartners(m, 'knight').map((p) => p.kind), ['peasant']);
  assert.equal(whyNoHeir(m, 'knight'), null);
  // (a Prime cannot; nor below level 60; nor without a Sworn partner)
  m.dynasty!.lines.knight.bearers[0].served = 5;
  assert.match(whyNoHeir(m, 'knight')!, /Veteran/);
  m.dynasty!.lines.knight.bearers[0].served = 7;
  m.xp.knight = xpFor(59);
  assert.match(whyNoHeir(m, 'knight')!, /Level 60/);
  m.xp.knight = xpFor(70);
  m.bonds = { [bondKey('knight', 'peasant')]: BOND_POINTS[1] };
  assert.match(whyNoHeir(m, 'knight')!, /Sworn/);
  assert.equal(nameHeir(m, 'knight', 'peasant', NOW, START), false);
  m.bonds = { [bondKey('knight', 'peasant')]: BOND_POINTS[2] };
  // (only a Sworn kindred partner)
  assert.equal(nameHeir(m, 'knight', 'paladin', NOW, START), false);
  trained(m);
  assert.equal(heirState(m, 'knight', NOW).state, 'training');
  assert.equal(heirState(m, 'knight', NOW + 7 * DAY - 1).state, 'training');
  assert.equal(heirState(m, 'knight', NOW + 7 * DAY).state, 'ready');
  assert.equal(heirPicks(m, 'knight', NOW + DAY), null, 'no candidates before the training ends');
  assert.match(whyNoHeir(m, 'knight')!, /named already/);
  // (the pair's heir scene waits to play)
  assert.deepEqual(m.dynasty!.scenes, [bondKey('knight', 'peasant')]);
});

test('the two candidates: drawn on their own stream, the same every time; names from the kind\'s bank; one birthright each', () => {
  const m = ready();
  trained(m);
  const a = heirPicks(m, 'knight', NOW + 7 * DAY)!;
  const m2 = ready();
  trained(m2);
  assert.deepEqual(heirPicks(m2, 'knight', NOW + 8 * DAY), a, 'the same draw');
  assert.equal(a.length, 2);
  assert.notEqual(a[0].name, a[1].name);
  for (const p of a) assert.ok(HEIR_NAMES.knight.includes(p.name));
  assert.notEqual(a[0].look, a[1].look);
  for (const p of a) assert.ok(HEIR_LOOK_IDS.includes(p.look));
  // (the first has the partner's perk, the other the parent's own)
  assert.equal(a[0].birthright, 'peasant');
  assert.equal(a[1].birthright, 'knight');
  assert.ok(HEIR_SALT > 0);
});

test('no lasting progress changes on passing the mantle: level, ranks, talents, gear, books and skills are the kind\'s', () => {
  const m = ready();
  const it = grantEquipment(m, sword());
  assert.ok(equipItem(m, 'knight', it.id));
  m.shards.knight = 40;
  (m as { talents?: unknown }).talents = { knight: { a: 2 } };
  (m as { books?: unknown }).books = { knight: ['b1'] };
  (m as { skillUse?: unknown }).skillUse = { knight: 33 };
  trained(m);
  const keep = (x: Meta) => JSON.stringify({ xp: x.xp, shards: x.shards, stars: x.stars, ranked: x.ranked, talents: (x as { talents?: unknown }).talents, books: (x as { books?: unknown }).books, skillUse: (x as { skillUse?: unknown }).skillUse, equipped: x.equipped, awake: (x as { awakened?: unknown }).awakened, party: x.party });
  const before = keep(m);
  const level = levelOfKind(m, 'knight');
  const atk = itemStats(it, 'knight').atk;
  const r = passMantle(m, 'knight', { pick: 0, honour: 'regular', heirloom: it.id }, NOW + 7 * DAY, dayAfter(7))!;
  assert.ok(r);
  assert.equal(keep(m), before, 'nothing lasting moved');
  assert.equal(levelOfKind(m, 'knight'), level);
  // (the heir holds the slot; the elder and the cadet are in the tree)
  const line = lineOf(m, 'knight')!;
  assert.equal(bearerOf(m, 'knight')!.name, r.heir.name);
  assert.equal(r.heir.gen, 2);
  assert.deepEqual(r.heir.parents, ['Kwame', 'Minh']);
  assert.equal(r.cadet.cadet, true);
  assert.equal(line.bearers.length, 3);
  assert.equal(line.bearers[0].fate, 'regular');
  assert.equal(cadetsOf(m).length, 1);
  assert.equal(line.heir, undefined);
  assert.ok(hasHeirs(line));
  // (the heirloom: +3% a generation, still worn)
  assert.ok(Math.abs(itemStats(it, 'knight').atk / atk - 1.03) < 1e-9);
  assert.equal(m.equipped!.knight!.main, it.id);
  assert.equal(r.heir.heirloom, it.id);
  // (a mantle cannot pass twice; the heir's own season starts from nothing)
  assert.equal(passMantle(m, 'knight', { pick: 0, honour: 'regular' }, NOW + 8 * DAY, dayAfter(8)), null);
  assert.equal(wavesThisSeason(m, 'knight', dayAfter(8)), 0);
});

test('one birthright: the partner\'s perk at its first band, wherever talents apply, adding to a mentor\'s', () => {
  const m = ready();
  trained(m);
  const r = passMantle(m, 'knight', { pick: 0, honour: 'regular' }, NOW + 7 * DAY, dayAfter(7))!;
  assert.equal(r.heir.birthright, 'peasant');
  assert.equal(r.cadet.birthright, 'knight');
  const snap = birthrightSnapshot(m, m.party);
  assert.deepEqual(Object.keys(snap), ['knight']);
  assert.deepEqual(snap.knight, { hp: PERKS.peasant.steps[0] });
  // (with a mentor's perk on the same hero they add up)
  assert.deepEqual(addSnapshots({ knight: { hp: 0.03, shield: 0.04 } }, snap), { knight: { hp: 0.06, shield: 0.04 } });
  // (a save with no heir has no birthright: its fights are as they were)
  assert.deepEqual(birthrightSnapshot(ready(), ['knight', 'samurai']), {});
});

test('the heirloom\'s cap: three generation marks at most (+9%); it is never sold or combined', () => {
  const m = ready();
  m.dynasty!.lines.knight.bearers[0].served = 10;
  const it = grantEquipment(m, sword());
  equipItem(m, 'knight', it.id);
  const atk = itemStats(it, 'knight').atk;
  for (let gen = 0; gen < 5; gen++) {
    trained(m);
    const t = NOW + 7 * DAY;
    assert.ok(passMantle(m, 'knight', { pick: gen % 2, honour: 'regular', heirloom: it.id }, t, dayAfter(7)), `generation ${gen + 2}`);
    bearerOf(m, 'knight')!.served = 6;
  }
  assert.equal(it.heirloom!.marks, HEIRLOOM_MAX);
  assert.ok(Math.abs(itemStats(it, 'knight').atk / atk - 1.09) < 1e-9);
  assert.equal(lineOf(m, 'knight')!.bearers.filter((b) => !b.cadet).length, 6);
  // (taken off, it is spare, and still never sold or combined)
  m.equipped!.knight = {};
  grantEquipment(m, sword());
  grantEquipment(m, sword());
  assert.equal(salvageItem(m, it.id), 0);
  assert.equal(sellPiece(m, it.id, START), 0);
  assert.ok(!combineGroups(m).some((g) => g.items.some((x) => x.id === it.id)));
  // (it is read back with its marks)
  assert.deepEqual(readEquipment(JSON.parse(JSON.stringify(m.equipment))).find((x) => x.id === it.id)!.heirloom, it.heirloom);
  assert.equal(readEquipment([{ id: 5, base: 'ironSword', rarity: 1, level: 1, heirloom: { marks: 9, house: 'knight', bearer: 'Ama' } }])[0].heirloom!.marks, HEIRLOOM_MAX);
});

test('the twin rule with the elder: one bearer of a line takes the field; an elder mentor fielded lapses its perk for the run', () => {
  const m = ready();
  trained(m);
  passMantle(m, 'knight', { pick: 1, honour: 'mentor' }, NOW + 7 * DAY, dayAfter(7));
  assert.ok(seatedMentor(m, 'knight'));
  assert.equal(retired(m, 'knight'), false, 'the kind stays in the party through the heir');
  assert.ok(m.party.includes('knight'));
  const choices = bannerChoices(m, 'knight');
  assert.deepEqual(choices.map((c) => c.index), [1, 0], 'the heir, then the elder; never the cadet');
  // (the mentor's perk reaches its calling's other heroes)
  assert.ok(Object.keys(legacySnapshot(lapsedLegacy(m), ['samurai'])).length);
  assert.ok(fieldBearer(m, 'knight', 0));
  assert.ok(fieldsElder(m, 'knight'));
  assert.equal(fieldedOf(m, 'knight')!.name, 'Kwame');
  assert.equal(stageOfKind(m, 'knight'), 'veteran', 'the elder\'s own looks');
  // (its honour lapses: no perk this run, and no cooldown starts)
  assert.deepEqual(legacySnapshot(lapsedLegacy(m), ['samurai']), {});
  assert.ok(m.mentors?.martial);
  assert.equal(m.recalled, undefined);
  // (the elder fights with its own birthright: Kwame has none; the cadet is never fielded)
  assert.deepEqual(birthrightSnapshot(m, ['knight']), {});
  assert.equal(fieldBearer(m, 'knight', 2), false);
  assert.ok(fieldBearer(m, 'knight', 1));
  assert.equal(fieldsElder(m, 'knight'), false);
  assert.deepEqual(Object.keys(birthrightSnapshot(m, ['knight'])), ['knight']);
});

test('the Hall\'s old mentors migrate: told once that they may name an heir, which brings their kind back with the mentor seated', () => {
  const m = startedMeta(4);
  m.unlocked = [...m.unlocked, 'peasant'];
  m.castle.hall = 1;
  m.xp.knight = xpFor(65);
  m.mentors = { martial: { kind: 'knight', since: 0 } };
  m.party = m.party.filter((k) => k !== 'knight');
  m.bonds = { [bondKey('knight', 'peasant')]: BOND_POINTS[2] };
  openDynasty(m, START);
  assert.equal(bearerOf(m, 'knight')!.fate, 'mentor');
  assert.equal(bearerOf(m, 'knight')!.served, 0);
  assert.equal(takeHeirNote(m), true);
  assert.equal(takeHeirNote(m), false, 'told once');
  // (a mentor cannot serve seasons in the Hall, so its honour stands for them)
  assert.equal(whyNoHeir(m, 'knight'), null);
  trained(m);
  assert.equal(whyNotHonour(m, 'knight', 'mentor', NOW), null);
  const r = passMantle(m, 'knight', { pick: 0, honour: 'mentor' }, NOW + 7 * DAY, dayAfter(7))!;
  assert.ok(r);
  assert.deepEqual(m.mentors, { martial: { kind: 'knight', since: 0, heir: true } });
  assert.equal(retired(m, 'knight'), false);
  assert.ok(m.party.includes('knight'), 'back in the party, there being room');
  // (opened again, the elder keeps the mentor's fate and the heir has none)
  openDynasty(m, dayAfter(8));
  assert.equal(lineOf(m, 'knight')!.bearers[0].fate, 'mentor');
  assert.equal(bearerOf(m, 'knight')!.fate, undefined);
  // (a mentor recalled from the Hall elsewhere: the elder's honour lapses, to be chosen again at once)
  delete m.mentors;
  openDynasty(m, dayAfter(9));
  assert.equal(lineOf(m, 'knight')!.bearers[0].fate, undefined);
  assert.ok(changeHonour(m, 'knight', 0, 'regular', NOW + 9 * DAY, dayAfter(9)));
});

test('honours: a Shade needs level 100; a change waits a week; leaving the Hall is a recall', () => {
  const m = ready();
  trained(m);
  assert.match(whyNotHonour(m, 'knight', 'shade', NOW)!, /100/);
  passMantle(m, 'knight', { pick: 0, honour: 'mentor' }, NOW + 7 * DAY, dayAfter(7));
  const t = NOW + 7 * DAY;
  assert.equal(changeHonour(m, 'knight', 0, 'regular', t + DAY, dayAfter(8)), false, 'a week first');
  assert.ok(changeHonour(m, 'knight', 0, 'regular', t + 7 * DAY, dayAfter(14)));
  assert.equal(seatedMentor(m, 'knight'), false);
  assert.ok((m.recalled?.martial ?? 0) > t + 7 * DAY, 'the seat stays empty a while');
  assert.deepEqual(regularsOf(m), ['knight']);
  // (the heir and the cadet cannot take an honour)
  assert.equal(changeHonour(m, 'knight', 1, 'regular', t + 30 * DAY, dayAfter(30)), false);
  assert.equal(changeHonour(m, 'knight', 2, 'regular', t + 30 * DAY, dayAfter(30)), false);
  m.xp.knight = xpFor(100);
  assert.ok(changeHonour(m, 'knight', 0, 'shade', t + 14 * DAY, dayAfter(21)));
  assert.deepEqual(regularsOf(m), []);
});

test('the Blood Grudge: the heir bears +15% against the living nemesis that slew a parent, marked on the run\'s snapshot', () => {
  const m = ready();
  m.war = newWar();
  m.war.members.push({ id: 7, base: 'orcGrunt', army: 'orcs', name: 'Gash', epithet: 'the Lieutenant', rank: 'lieutenant', loyalty: 50, might: 2, scars: 0, traits: [], weak: [], known: [], memory: [], met: 1, lost: 0, born: 0 });
  m.grudges = { peasant: { '7': 2 } };
  assert.equal(bloodGrudgeFor(m, 'knight', 'peasant'), 7);
  assert.equal(bloodGrudgeFor(m, 'knight', 'paladin'), undefined);
  trained(m);
  const r = passMantle(m, 'knight', { pick: 0, honour: 'regular' }, NOW + 7 * DAY, dayAfter(7))!;
  assert.equal(r.heir.grudge, 7);
  assert.deepEqual(bloodOn(m, 7), ['knight']);
  const snap = decorate(m, { id: 7, base: 'orcGrunt', name: 'Gash', epithet: '', rank: 'lieutenant', might: 2, scars: 0, traits: [], weak: [] } as never, m.war.members[0]);
  assert.deepEqual(snap.blood, ['knight']);
  assert.equal(BLOOD_GRUDGE, HEIRS.GRUDGE);
  // (the elder fielded in its place bears none)
  fieldBearer(m, 'knight', 0);
  assert.deepEqual(bloodOn(m, 7), []);
});

test('the Heir\'s Promise: +25% XP for the heir\'s first season, not for an elder fielded in its place', () => {
  const m = ready();
  trained(m);
  passMantle(m, 'knight', { pick: 0, honour: 'regular' }, NOW + 7 * DAY, dayAfter(7));
  const gains = { knight: 1000, samurai: 1000 };
  assert.deepEqual(promiseXp(m, gains, dayAfter(7)), { knight: 1250, samurai: 1000 });
  assert.deepEqual(promiseXp(m, gains, dayAfter(20)), { knight: 1250, samurai: 1000 });
  assert.deepEqual(promiseXp(m, gains, dayAfter(21)), gains, 'a season, fourteen days');
  fieldBearer(m, 'knight', 0);
  assert.deepEqual(promiseXp(m, gains, dayAfter(8)), gains);
});

test('the Elders\' table: six seats taking turns, a story a day for 50 crowns, a free ride as the guest once a day', () => {
  const m = ready();
  const kinds = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'peasant', 'paladin', 'ranger'];
  for (const k of kinds) {
    const l = lineOf(m, k)!;
    l.bearers.push({ name: `${k}-heir`, gen: 2, served: 0 });
    l.bearers[0].fate = 'regular';
    l.current = 1;
  }
  m.dynasty!.regulars = [...kinds];
  assert.equal(seatedToday(m, START).length, HEIRS.SEATS);
  assert.notDeepEqual(seatedToday(m, START), seatedToday(m, dayAfter(1)), 'they take turns');
  const crowns = m.crowns;
  assert.ok(storyWaits(m, START));
  assert.ok(hearStory(m, START));
  assert.equal(m.crowns, crowns + HEIRS.STORY_CROWNS);
  assert.equal(hearStory(m, START), null, 'once a day');
  assert.ok(hearStory(m, dayAfter(1)));
  // (a ride: only while the heir is not in the party, once a day, lapsing on another day)
  assert.equal(askRide(m, 'knight', START), false);
  assert.ok(askRide(m, 'ranger', START));
  assert.equal(askRide(m, 'paladin', START), false, 'one a day');
  assert.equal(takeRide(m, ['ranger'], true, START), null, 'not with the heir on the run');
  assert.equal(takeRide(m, ['knight'], false, START), null, 'not where no guest may come');
  assert.equal(takeRide(m, ['knight'], true, START), 'ranger');
  assert.equal(takeRide(m, ['knight'], true, START), null);
  assert.equal(askRide(m, 'paladin', START), false, 'ridden today already');
  assert.ok(askRide(m, 'paladin', dayAfter(1)));
  assert.equal(takeRide(m, [], true, dayAfter(2)), null);
  assert.equal(m.dynasty!.guest, undefined, 'a ride asked on another day lapses');
});

test('the heirs are saved and read back; the reader keeps them within their caps; an old save plays on', () => {
  const m = ready();
  const it = grantEquipment(m, sword());
  equipItem(m, 'knight', it.id);
  trained(m);
  heirPicks(m, 'samurai', NOW);
  passMantle(m, 'knight', { pick: 0, honour: 'regular', heirloom: it.id }, NOW + 7 * DAY, dayAfter(7));
  fieldBearer(m, 'knight', 0);
  const store = new Map<string, string>();
  const s = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  saveMeta(m, s);
  const back = loadMeta(1, s);
  assert.deepEqual(back.dynasty, m.dynasty);
  assert.deepEqual(back.mentors, m.mentors);
  // (the reader drops what it does not know)
  const raw = JSON.parse(JSON.stringify(m.dynasty));
  raw.lines.knight.bearers[1].look = 'neon';
  raw.lines.knight.bearers[1].birthright = 'dragonKing';
  raw.lines.knight.field = 1;
  raw.lines.knight.heir = { doneAt: 'soon', partner: 'peasant' };
  raw.lines.samurai.heir = { doneAt: 5, partner: 'samurai' };
  raw.regulars = ['knight', 'nobody', 'knight'];
  raw.guest = { kind: 'nobody', day: 1 };
  const d = readDynasty(raw)!;
  assert.equal(d.lines.knight.bearers[1].look, undefined);
  assert.equal(d.lines.knight.bearers[1].birthright, undefined);
  assert.equal(d.lines.knight.field, undefined, 'only an honoured elder before the heir is fielded');
  assert.equal(d.lines.knight.heir, undefined);
  assert.equal(d.lines.samurai.heir, undefined, 'never an heir with itself');
  assert.deepEqual(d.regulars, ['knight']);
  assert.equal(d.guest, undefined);
  // (a phase 5 save reads as it did)
  const old = { v: 1, start: START, lines: { knight: { bearers: [{ name: 'Kwame', gen: 1, served: 3 }], current: 0 } } };
  assert.deepEqual(readDynasty(old), old);
});

test('the words and the art: six heir names a kind, none the founder\'s; the heir scenes are kindred pairs; the looks are steady tints', () => {
  for (const k of ALL_HEROES) {
    const names = HEIR_NAMES[k];
    assert.equal(names?.length, 6, `${k} has six heir names`);
    assert.equal(new Set(names).size, 6);
    assert.ok(!names.includes(HERO_NAMES[k].name));
  }
  assert.equal(HEIR_SCENES.length, 10, 'batch 1: ten scenes');
  for (const key of HEIR_SCENE_KEYS) assert.ok(KINDRED.includes(key), key);
  assert.equal(new Set(HEIR_SCENES.map((s) => s.id)).size, HEIR_SCENES.length);
  for (const l of HEIR_LOOK_IDS) assert.ok(lookMatrix('knight', 'youth', l));
  assert.equal(lookMatrix('knight', 'prime', undefined), null, 'a Prime with no tint is drawn plain');
  // (the age grade is as phase 5 drew it)
  const v = lookMatrix('knight', 'veteran', undefined)!;
  assert.ok(Math.abs(v[4] - 0.02) < 1e-9 && Math.abs(v[14] - 0.03) < 1e-9);
});

test('the heirs never reach a fight but through the run\'s snapshot: no clock, no randomness of their own but the candidates\' stream', () => {
  for (const f of ['src/sim/battle.ts', 'src/sim/run.ts', 'src/sim/armies.ts', 'src/sim/ailments.ts', 'src/sim/blow.ts']) assert.doesNotMatch(readFileSync(f, 'utf8'), /\bheirs\b|dynasty/i, `${f} reads the heirs`);
  for (const f of ['src/sim/heirs.ts', 'src/sim/heirNames.ts', 'src/sim/heirScenes.ts']) assert.doesNotMatch(readFileSync(f, 'utf8'), /Math\.random|Date\.now|new Date\(|document|window/);
  // (a fresh save is untouched by the heirs: no mantle, no Promise, nothing to field)
  const m = startedMeta(2);
  openDynasty(m, START);
  assert.deepEqual(promiseXp(m, { knight: 10 }, START), { knight: 10 });
  assert.deepEqual(bannerChoices(m, 'knight').length, 1);
  assert.equal(whyNoMantle(m, 'knight', { pick: 0, honour: 'regular' }, NOW), 'No heir is named');
  noteServed(m, ['knight'], 1, START);
  assert.equal(wavesThisSeason(m, 'knight', START), 1);
});
