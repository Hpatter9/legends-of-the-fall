// HEROES-FILTER (docs/notes/heroes-filter.md, `src/heroFilterRules.ts`): the roster's Sort and Filter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASS_ORDER, ROSTER_SORTS, SORT_INFO, cleanView, filterCount, mythicKnown, passes, rosterRows, sortRows, traitChoices, viewActive, viewLine, viewRows, type RosterRow, type RosterView } from '../src/heroFilterRules';
import { newMeta } from '../src/sim/meta';
import { ALL_HEROES } from '../src/sim/units';
import { CLASS_OF } from '../src/sim/starter';
import { TRAITS, traitsOf } from '../src/sim/traits';
import { MYTHIC_KINDS } from '../src/sim/mythicRules';
import { secretsOf } from '../src/sim/secretHeroes';
import { toCollect } from '../src/sim/unlock';
import { parseSettings } from '../src/settings';

const row = (kind: string, over: Partial<RosterRow> = {}): RosterRow => ({ kind, named: true, owned: true, name: kind, text: kind, cls: 'front', traits: [], level: 1, rank: 0, shards: 0, power: 0, joined: 0, inParty: false, ready: false, mythic: false, base: 0, ...over });
const kinds = (rows: readonly RosterRow[]) => rows.map((r) => r.kind);

test('the default is the list as it always was: the game’s order, nothing filtered, nothing said', () => {
  const rows = [row('a', { base: 0, level: 3 }), row('b', { base: 1, level: 9 }), row('c', { base: 2, level: 5 })];
  assert.deepEqual(kinds(viewRows(rows, {})), ['a', 'b', 'c']);
  assert.equal(viewLine({}), '');
  assert.equal(viewActive({}), false);
  assert.equal(viewActive({ sort: 'default' }), false);
  assert.equal(viewActive({}, ' kw '), true, 'a name search counts, so Clear shows');
});

test('each sort orders by its measure, flips, and settles ties by the game’s order', () => {
  const rows = [
    row('a', { base: 0, name: 'Mira', level: 5, rank: 2, shards: 1, power: 300, joined: 2, cls: 'support', ready: false }),
    row('b', { base: 1, name: 'Aldo', level: 9, rank: 2, shards: 7, power: 100, joined: 0, cls: 'front', ready: true }),
    row('c', { base: 2, name: 'Zed', level: 5, rank: 4, shards: 0, power: 200, joined: 1, cls: 'caster', ready: true }),
  ];
  const by = (v: RosterView) => kinds(sortRows(rows, v)).join('');
  assert.equal(by({ sort: 'level' }), 'bac', 'highest first, the tie in the game’s order');
  assert.equal(by({ sort: 'level', flip: true }), 'acb', 'lowest first, the tie still in the game’s order');
  assert.equal(by({ sort: 'rank' }), 'cba', 'rank, then shards');
  assert.equal(by({ sort: 'name' }), 'bac');
  assert.equal(by({ sort: 'name', flip: true }), 'cab');
  assert.equal(by({ sort: 'class' }), 'bca', 'the cards’ class order');
  assert.equal(by({ sort: 'newest' }), 'acb');
  assert.equal(by({ sort: 'power' }), 'acb');
  assert.equal(by({ sort: 'ready' }), 'bca', 'the ready first, each group in the game’s order');
  assert.equal(by({ sort: 'ready', flip: true }), 'abc');
  assert.deepEqual(kinds(rows), ['a', 'b', 'c'], 'the list given is not changed');
  for (const s of ROSTER_SORTS) assert.ok(SORT_INFO[s].name, s);
});

test('filters hold together: every group chosen, and any one of the classes or traits chosen', () => {
  const rows = [
    row('tank', { cls: 'front', traits: ['guardian', 'knightly'], inParty: true }),
    row('mage', { cls: 'caster', traits: ['arcane'], ready: true }),
    row('bow', { cls: 'shooter', traits: ['marksman'], inParty: true, ready: true }),
    row('far', { owned: false, cls: 'caster', traits: ['arcane'] }),
  ];
  const f = (v: RosterView, q = '') => kinds(rows.filter((r) => passes(r, v, q))).join(',');
  assert.equal(f({ own: 'owned' }), 'tank,mage,bow');
  assert.equal(f({ own: 'missing' }), 'far');
  assert.equal(f({ classes: ['caster', 'shooter'] }), 'mage,bow,far');
  assert.equal(f({ traits: ['arcane', 'knightly'] }), 'tank,mage,far');
  assert.equal(f({ party: 'in' }), 'tank,bow');
  assert.equal(f({ party: 'out', own: 'owned' }), 'mage');
  assert.equal(f({ ready: true, party: 'in' }), 'bow');
  assert.equal(f({ classes: ['caster'], traits: ['marksman'] }), '', 'nothing is both');
  assert.equal(f({ mythic: true }), '');
  assert.equal(f({}, 'MAG'), 'mage', 'the search is by name, any case');
  assert.equal(filterCount({ own: 'owned', classes: ['caster', 'shooter'], traits: ['arcane'], party: 'in', ready: true, mythic: true }), 7);
});

test('the head says what is on: "Sorted by level · 2 filters"', () => {
  assert.equal(viewLine({ sort: 'level', classes: ['front'], ready: true }), 'Sorted by level · 2 filters');
  assert.equal(viewLine({ own: 'owned' }), '1 filter');
  assert.equal(viewLine({ sort: 'name', flip: true }), 'Sorted by name (z to a)');
});

test('a hero the save may not name stays hidden whatever the sort or filter', () => {
  const rows = [row('known', { base: 1, name: 'Bea', cls: 'caster', traits: ['arcane'], mythic: true }), row('secret', { base: 0, named: false, owned: false, name: 'Aaa', text: '', cls: 'caster', traits: ['arcane'], mythic: true, ready: true, level: 99, power: 9999 })];
  for (const s of ROSTER_SORTS) for (const flip of [false, true]) assert.deepEqual(kinds(sortRows(rows, { sort: s, flip })), ['known', 'secret'], `${s}: a secret is never placed by what it is`);
  const secret = rows[1];
  assert.equal(passes(secret, {}), true, 'with no filter it shows as it does today');
  assert.equal(passes(secret, { own: 'missing', party: 'out' }), true, 'not owned and not in the party give nothing away');
  for (const v of [{ classes: ['caster'] }, { traits: ['arcane'] }, { mythic: true }, { ready: true }] as RosterView[]) assert.equal(passes(secret, v), false, JSON.stringify(v));
  assert.equal(passes(secret, {}, 'aaa'), false, 'a name search never finds it');
  assert.deepEqual(traitChoices([secret]), [], 'its traits are not offered');
  assert.equal(mythicKnown([secret]), false, 'nor the Mythic filter');
  assert.equal(mythicKnown(rows), true);
});

test('a saved choice is made safe: unknown sorts, classes and traits are dropped', () => {
  assert.deepEqual(cleanView(null), {});
  assert.deepEqual(cleanView('level'), {});
  assert.deepEqual(cleanView({ sort: 'default', flip: true }), {}, 'the default has no other way round');
  assert.deepEqual(cleanView({ sort: 'luck', own: 'all', classes: ['front', 'wizard', 'front', 3], traits: ['arcane', 'nope'], party: 'in', ready: 1, mythic: true }), { classes: ['front'], traits: ['arcane'], party: 'in', mythic: true });
  assert.deepEqual(cleanView({ sort: 'power', flip: true }), { sort: 'power', flip: true });
});

test('the choice is saved with the settings, an optional field: old saves have none, and a bad one is dropped', () => {
  assert.equal('roster' in parseSettings(null), false);
  assert.equal('roster' in parseSettings(JSON.stringify({ roster: { sort: 'nonsense' } })), false);
  assert.deepEqual(parseSettings(JSON.stringify({ roster: { sort: 'level', ready: true, junk: 1 } })).roster, { sort: 'level', ready: true });
});

test('the save’s rows: every hero of the game once, in the game’s order, read from the hero data', () => {
  const m = newMeta(5);
  const have = toCollect(m).slice(0, 4);
  m.unlocked = [have[2], have[0], have[1]];
  m.party = [have[0]];
  m.xp = { [have[1]]: 30 * 9 * 10 };
  m.unlock = { [have[3]]: 2 };
  const rows = rosterRows(m);
  assert.deepEqual(kinds(rows), [...ALL_HEROES]);
  const of = (k: string) => rows.find((r) => r.kind === k)!;
  assert.equal(of(have[0]).inParty, true);
  assert.equal(of(have[0]).joined, 1, 'the order the heroes joined');
  assert.equal(of(have[2]).joined, 0);
  assert.ok(of(have[1]).level > of(have[0]).level);
  assert.ok(of(have[0]).power > 0);
  assert.equal(of(have[3]).owned, false);
  assert.equal(of(have[3]).named, true, 'its shards are begun: it may be named');
  assert.equal(of(have[3]).shards, 2);
  for (const r of rows) {
    assert.equal(r.cls, CLASS_OF[r.kind], r.kind);
    assert.ok(CLASS_ORDER.includes(r.cls), r.kind);
    assert.deepEqual(r.traits, traitsOf(r.kind));
    assert.equal(r.mythic, MYTHIC_KINDS.includes(r.kind));
    if (!r.named) assert.equal(r.text, '', `${r.kind}: nothing to search by`);
  }
  for (const k of secretsOf(m)) assert.equal(of(k).named, false, `${k} is secret`);
  // (the filters offered are the game's own groupings: every trait offered is a trait of a hero that may be named)
  for (const t of traitChoices(rows)) assert.ok(t in TRAITS && rows.some((r) => r.named && r.traits.includes(t)), t);
  assert.equal(mythicKnown(rows), false, 'no Mythic may be named yet, so its filter is not offered');
  // (a filter by what a hero is never lets a secret through)
  const secret = new Set(secretsOf(m));
  for (const v of [{ mythic: true }, { classes: [...CLASS_ORDER] }, { traits: Object.keys(TRAITS) }, { ready: true }] as RosterView[]) assert.ok(!viewRows(rows, v).some((r) => secret.has(r.kind)), JSON.stringify(v).slice(0, 40));
});

test('the roster is drawn from the rules, and its sheets are standard ornate menus', () => {
  const view = readFileSync('src/heroFilterView.ts', 'utf8');
  assert.match(view, /ornateMenu\(\{ id: 'rosterSort'/);
  assert.match(view, /ornateMenu\(\{ id: 'rosterFilter'/);
  const roster = readFileSync('src/menuHeroes.ts', 'utf8');
  assert.match(roster, /viewRows\(/);
  assert.match(roster, /setSetting\('roster'/);
  const rules = readFileSync('src/heroFilterRules.ts', 'utf8');
  assert.doesNotMatch(rules, /document\.|pixi|Math\.random|Date\.now/, 'pure');
});
