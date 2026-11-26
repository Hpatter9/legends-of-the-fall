// STORE-KIT (docs/notes/store-readiness.md): the privacy policy the Play listing points to is built into the site, says what the game does
// today, and is linked from Settings, About and Credits; the listing's pictures are where the notes say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PRIVACY_URL } from '../src/storeLinks';

const policy = readFileSync('docs/store/privacy-policy.html', 'utf8');
const text = policy.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');

test('the privacy policy is copied into the site as privacy.html, at the address the game and the notes give', () => {
  assert.equal(PRIVACY_URL, 'https://hpatter9.github.io/legends-of-the-fall/privacy.html');
  assert.match(readFileSync('build.mjs', 'utf8'), /copyFileSync\('docs\/store\/privacy-policy\.html', `\$\{out\}\/privacy\.html`\)/);
  assert.ok(readFileSync('docs/notes/store-readiness.md', 'utf8').includes(PRIVACY_URL));
});

test('the policy names the owner’s contact, its date, and the Shop’s Google Play and RevenueCat as the game has them', () => {
  assert.match(text, /hpatter9@gmail\.com/);
  assert.match(text, /last updated \d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d/);
  for (const w of ['Google Play', 'RevenueCat', 'cosmetic', 'offline', 'no advertising']) assert.ok(text.toLowerCase().includes(w.toLowerCase()), w);
  // (what is gone from the game is not in it)
  for (const w of ['Assault', 'Developer page', 'analytics SDK']) assert.ok(!text.includes(w), w);
});

test('Settings, About and the Credits page link to the policy', () => {
  for (const f of ['src/settings.ts', 'src/credits.ts']) {
    const s = readFileSync(f, 'utf8');
    assert.match(s, /PRIVACY_URL/, f);
    assert.match(s, /target = '_blank'/, f);
  }
  assert.match(readFileSync('src/settings.ts', 'utf8'), /Privacy policy/);
});

test('the listing’s pictures and the feature graphic’s prompt are in place', () => {
  for (let i = 1; i <= 8; i++) assert.ok(readFileSync('docs/notes/store-readiness.md', 'utf8').includes(`phone-${i}-`), `phone-${i}`);
  assert.ok(existsSync('docs/store/icon-512.png'));
  assert.ok(existsSync('docs/notes/store-art-prompt.md'));
});
