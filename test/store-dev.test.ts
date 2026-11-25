// STORE-DEV (docs/notes/store-dev-page.md) and RELEASE-TRIM (docs/notes/release-trim.md): no build has a Developer page (free crowns,
// shards and stones, Build Town, Try an Assault), the web's and the GitHub app's included. And each Settings screen has one way back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { settingsPages } from '../src/settings';
import { STORE } from '../src/appUpdate';

// (RELEASE-TRIM, docs/notes/release-trim.md, the owner's call before release: the Developer page is gone from every build, the web's and
// the GitHub app's too, not only the store's)
test('no build lists a Developer page: the store\'s, the web\'s and the GitHub app\'s are the same list', () => {
  const play: string[] = settingsPages('play').map((p) => p.id);
  for (const keep of ['diag', 'about', 'credits', 'updates', 'data']) assert.ok(play.includes(keep), keep);
  for (const store of ['', 'play', 'github', STORE]) {
    const ids: string[] = settingsPages(store).map((p) => p.id);
    assert.ok(!ids.includes('dev'), `${store || 'web'}: ${ids.join(', ')}`);
    assert.deepEqual(ids, play);
  }
});

test('no grant is left for a player to reach: the developer grant, Build Town and Try an Assault are gone from the code', () => {
  assert.ok(!existsSync('src/sim/devGrant.ts'), 'the grant\'s rules');
  for (const f of ['src/settings.ts', 'src/main.ts', 'src/index.html']) {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /devGrant|onDevGrant|Build Town|Try an Assault|devTrial|eidolons=all/, f);
  }
});

test('the Settings header’s “‹ Back” stays hidden on a sub-page, so each screen has one way back', () => {
  const css = readFileSync('src/settingsMenu.css', 'utf8');
  assert.match(css, /#settingsClose\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/);
  const src = readFileSync('src/settings.ts', 'utf8');
  assert.match(src, /\$\('settingsClose'\)\.hidden = page !== null/);
});
