// PLAY-SIZE (docs/notes/play-size.md): the Play bundle's web files go in an install-time asset pack, so its base module fits Play's
// 200 MB; and the pictures the code imports are files beside game.js (the small ones inline), each listed for offline play.
// The build itself is not run here (it takes a while); these hold its rules in place.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const build = readFileSync('build.mjs', 'utf8');

test('a picture imported by the code is a file unless it is small, and the service worker lists every one', () => {
  assert.match(build, /loader: contents\.length < SMALL_ART \? 'dataurl' : 'file'/);
  assert.match(build, /const SMALL_ART = 16 \* 1024;/);
  assert.match(build, /options\.plugins = \[artFiles\]/);
  // (named by their content, so a changed picture is a new file and an old cache never serves a stale one)
  assert.match(build, /assetNames: '\[dir\]\/\[name\]-\[hash\]'/);
  // (the list comes from what the build wrote, and goes into FILES, which the worker caches whole on install)
  assert.match(build, /ART_FILES = Object\.keys\(result\.metafile\.outputs\)/);
  assert.match(build, /\$\{ART_FILES\.map\(\(f\) => `'\$\{f\}'`\)\.join\(', '\)\}\];/);
  // (the worker is written once the build knows the files, in a plain build and on every rebuild of `npm run dev`)
  assert.match(build, /writeServiceWorker\(\);\n    \}\);/);
});

test('the Play bundle carries the web files in an install-time asset pack', () => {
  const pack = readFileSync('android/web/build.gradle', 'utf8');
  assert.match(pack, /apply plugin: 'com\.android\.asset-pack'/);
  assert.match(pack, /packName = "web"/);
  assert.match(pack, /deliveryType = "install-time"/);
  assert.match(readFileSync('android/settings.gradle', 'utf8'), /include ':web'/);
  assert.match(readFileSync('android/app/build.gradle', 'utf8'), /assetPacks = \[":web"\]/);
  // (the files are moved into it under the same `public/` path Capacitor serves from)
  const mover = readFileSync('tools/play-size/pack.mjs', 'utf8');
  assert.match(mover, /const APP = 'android\/app\/src\/main\/assets\/public';/);
  assert.match(mover, /const PACK = 'android\/web\/src\/main\/assets\/public';/);
});

test('the workflow builds the Play bundle from the Play web build, packed, and checks its size before releasing it', () => {
  const wf = readFileSync('.github/workflows/android.yml', 'utf8');
  const steps = ['npm run web:play', 'npx cap sync android', 'node tools/play-size/pack.mjs', './gradlew bundleRelease', 'node tools/play-size/sizes.mjs'];
  let at = wf.indexOf('./gradlew assembleRelease');
  assert.ok(at > 0, 'the APK is built first, from the plain web build');
  for (const s of steps) {
    const next = wf.indexOf(s, at);
    assert.ok(next > at, `${s} comes after the step before it`);
    at = next;
  }
  assert.ok(wf.indexOf('legends-of-the-last-keep-*.aab') > at, 'the bundle is attached to the release');
});
