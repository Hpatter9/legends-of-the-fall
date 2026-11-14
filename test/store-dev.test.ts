// STORE-DEV (docs/notes/store-dev-page.md): a store's build has no Developer page (free crowns, shards and stones, Build Town, Try an
// Assault); the web page and the GitHub release's app keep it for the owner's testing. And each Settings screen has one way back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { devToolsOn, settingsPages } from '../src/settings';
import { STORE } from '../src/appUpdate';

test('the Play build lists no Developer page; the web and the GitHub app do', () => {
  const play: string[] = settingsPages('play').map((p) => p.id);
  assert.ok(!play.includes('dev'), play.join(', '));
  assert.equal(devToolsOn('play'), false);
  for (const keep of ['diag', 'about', 'credits', 'updates', 'data']) assert.ok(play.includes(keep), keep);
  const web: string[] = settingsPages('').map((p) => p.id);
  assert.ok(web.includes('dev'));
  assert.equal(devToolsOn(''), true);
  assert.equal(web.length, play.length + 1);
  // (the tests build with no store: the developer's tools are on, as on the web)
  assert.equal(STORE, '');
  assert.ok(settingsPages(STORE).some((p) => p.id === 'dev'));
});

test('the Settings header’s “‹ Back” stays hidden on a sub-page, so each screen has one way back', () => {
  const css = readFileSync('src/settingsMenu.css', 'utf8');
  assert.match(css, /#settingsClose\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/);
  const src = readFileSync('src/settings.ts', 'utf8');
  assert.match(src, /\$\('settingsClose'\)\.hidden = page !== null/);
});
