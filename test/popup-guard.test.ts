import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GUARD_MS, GUARDED, READ_MAX_MS, READ_MIN_MS, readMs, tapVerdict, type TapFacts } from '../src/popupGuardRules';
import { BACK_LAYERS } from '../src/backRules';

// POPUP-GUARD: a popup the game raises is not skipped by a tap that was meant for something else.
const tap = (f: Partial<TapFacts>): TapFacts => ({ type: 'click', young: false, downBefore: false, downDead: false, onVeil: false, ...f });

test('a popup that has only just appeared ignores every tap', () => {
  assert.equal(tapVerdict(tap({ type: 'down', young: true })), 'dead');
  assert.equal(tapVerdict(tap({ type: 'click', young: true })), 'dead');
  assert.ok(GUARD_MS >= 300 && GUARD_MS <= 800, 'a short moment: long enough for a tap on its way, too short to feel stuck');
});

test('a tap begun on a popup not yet ready is dead to its end, even once the popup is ready', () => {
  assert.equal(tapVerdict(tap({ type: 'up', downDead: true })), 'dead');
  assert.equal(tapVerdict(tap({ type: 'click', downDead: true })), 'dead');
});

test('a tap aimed at what was underneath does nothing: its click is dead, though its finger is let up so a drag ends', () => {
  assert.equal(tapVerdict(tap({ type: 'up', young: true, downBefore: true })), 'pass');
  assert.equal(tapVerdict(tap({ type: 'click', downBefore: true })), 'dead', 'however long the finger stayed down');
});

test('a tap on a popup’s backdrop never closes it; a tap on its own button does', () => {
  for (const type of ['down', 'click'] as const) assert.equal(tapVerdict(tap({ type, onVeil: true })), 'dead', type);
  for (const type of ['down', 'up', 'click'] as const) assert.equal(tapVerdict(tap({ type })), 'pass', type);
});

test('a timed notice stays long enough to read: two seconds at the least, longer with its length, never for ever', () => {
  assert.equal(readMs('Auto: spells held'), READ_MIN_MS);
  assert.ok(READ_MIN_MS >= 2000);
  const long = 'Achievement: Giant slayer · claim 50 crowns and 3 stones for felling a boss with no hero lost';
  assert.ok(readMs(long) > readMs('Quest done: The lost ring · return to the tavern'));
  assert.ok(readMs(long) > 4000 && readMs(long) <= READ_MAX_MS);
  assert.equal(readMs('word '.repeat(200)), READ_MAX_MS);
});

test('every guarded popup is built where it says, and one with a backdrop is one the phone’s Back can close', () => {
  for (const g of GUARDED) {
    assert.ok(existsSync(join('src', g.file)), `${g.file} (in GUARDED) is not a file`);
    assert.ok(readFileSync(join('src', g.file), 'utf8').includes(g.sel.match(/[#.]([\w-]+)/)![1]) || g.file === 'main.ts', `${g.sel} is not built in ${g.file}`);
    if (!g.veil) continue;
    const sel = g.sel.replace(':not([data-asked])', '');
    assert.ok(BACK_LAYERS.some((l) => l.sel === sel), `${g.sel}: a tap on its backdrop no longer closes it in a run, so Back must (BACK_LAYERS)`);
  }
});

test('the guard is the page’s first listener, and the standard menu and the toasts use the rule', () => {
  const main = readFileSync('src/main.ts', 'utf8');
  assert.ok(main.indexOf('installPopupGuard();') > 0 && main.indexOf('installPopupGuard();') < main.indexOf('installTapGuard();'), 'installed before the ghost-click guard');
  assert.match(readFileSync('src/achievementsView.ts', 'utf8'), /readMs\(line\)/, 'a toast stays by its length');
  assert.match(readFileSync('src/ornateMenu.ts', 'utf8'), /dataset\.asked/, 'a menu the player opened says so, and is left as it was');
  assert.match(readFileSync('src/ornateMenus.css', 'utf8'), /\.pgWait[^{]*\{[^}]*opacity/, 'a popup not yet ready shows it');
  assert.match(readFileSync('src/ornateMenus.css', 'utf8'), /prefers-reduced-motion: reduce\) \{ \.pgReady/, 'and lights with no fade for reduced motion');
});
