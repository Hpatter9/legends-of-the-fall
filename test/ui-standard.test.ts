// UI-STANDARD (docs/notes/ui-standard.md): every menu is built with the standard ornate menu (`src/ornateMenu.ts`), the owner's standing
// rule. These check that the builder's classes are all styled, that a new dialog uses the builder (the menus from before it are listed
// below and may only leave the list), and the March orders' own rules, now chosen on the War Council.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { OM_CLASSES } from '../src/ornateMenu';
import { defaultPicks, marchLine, ordersOf } from '../src/marchCard';
import { curseFor } from '../src/sim/march';
import { newMeta } from '../src/sim/meta';

/** The dialogs built before the standard: each still draws its own card. Move one onto `ornateMenu` and take it off this list; never add one. */
const BEFORE_THE_STANDARD = [
  'altarHelp.ts', 'autoAsk.ts', 'builtCard.ts', 'chestStash.ts', 'dailyView.ts', 'earnedArrival.ts', 'eidolonBinding.ts', 'eidolonChainView.ts',
  'questCard.ts', 'rankUpList.ts', 'revealCard.ts', 'settingsPicker.ts', 'shopView.ts', 'stallView.ts', 'summonTarot.ts', 'tomeView.ts', 'unitInfo.ts',
];

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? (f === 'sim' ? [] : sources(p)) : p.endsWith('.ts') ? [p] : [];
  });

test('every class the standard menu puts on the page is styled in ornateMenus.css', () => {
  const css = readFileSync('src/ornateMenus.css', 'utf8');
  for (const c of OM_CLASSES) assert.match(css, new RegExp(`\\.${c}\\b`), `.${c} has no rule in ornateMenus.css`);
  // (and the builder names no class it does not list)
  const src = readFileSync('src/ornateMenu.ts', 'utf8');
  const used = new Set([...src.matchAll(/'(om[A-Z][A-Za-z]*)\b/g)].map((m) => m[1]));
  for (const c of used) assert.ok((OM_CLASSES as readonly string[]).includes(c), `ornateMenu.ts uses .${c}, missing from OM_CLASSES`);
});

test('a dialog is built with the standard ornate menu (the menus from before it aside)', () => {
  const dialogs = sources('src').filter((p) => !p.endsWith('ornateMenu.ts') && /setAttribute\(\s*'role',\s*'dialog'\s*\)/.test(readFileSync(p, 'utf8')));
  for (const p of dialogs) {
    const name = p.split(/[\\/]/).pop()!;
    if (BEFORE_THE_STANDARD.includes(name)) continue;
    assert.fail(`${p} builds a dialog of its own: build it with ornateMenu (src/ornateMenu.ts, docs/notes/ui-standard.md)`);
  }
  // (the list only shrinks: a file on it that no longer draws a dialog of its own comes off)
  for (const name of BEFORE_THE_STANDARD)
    assert.ok(dialogs.some((p) => p.split(/[\\/]/).pop() === name), `${name} no longer builds its own dialog: take it off the list`);
});

test('the March orders, the Spell Lectern and the Field Anvil are standard menus', () => {
  const src = readFileSync('src/marchCard.ts', 'utf8');
  assert.match(src, /from '\.\/ornateMenu'/);
  for (const fn of ['openMarchOrders', 'showLectern', 'showAnvil']) {
    const body = src.slice(src.indexOf(`export function ${fn}`));
    assert.match(body.slice(0, body.indexOf('\n}\n')), /ornateMenu\(/, `${fn} builds its card with ornateMenu`);
  }
});

test('March orders: a plain march with nothing open gives no orders; the picks become the run orders', () => {
  const m = newMeta(7);
  const party = ['knight', 'cleric', 'archer'];
  const plain = defaultPicks(m, 'orcs', party);
  assert.equal(plain.chosen, 'plain');
  assert.equal(ordersOf(plain, 99, party), undefined, 'nothing open: a plain march');
  assert.equal(marchLine(plain), 'Plain march');
  // (a Cursed march carries the run's own curse, from its seed)
  assert.deepEqual(ordersOf({ chosen: 'cursed' }, 1234, party), { mod: 'cursed', curse: curseFor(1234) });
  // (the Vigil, the road, the spare and the mark go with the march)
  assert.deepEqual(ordersOf({ chosen: 'scouted', vigil: 'swift', road: 'snow', spare: 'meteor', marked: 'cleric' }, 5, party), { mod: 'scouted', vigil: 'swift', route: 'snow', spare: 'meteor', marked: 'cleric' });
  // (a marked hero taken out of the party since falls to the party's first)
  assert.equal(ordersOf({ chosen: 'plain', marked: 'wizard' }, 5, party)?.marked, 'knight');
});
