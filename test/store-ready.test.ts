// STORE-READY (docs/notes/store-readiness.md): the Android app's settings Google Play checks, read from the project's files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
const vars = readFileSync('android/variables.gradle', 'utf8');
const sdk = (name: string) => Number(new RegExp(`${name}\\s*=\\s*(\\d+)`).exec(vars)?.[1]);

test("the app targets the API level Play asks of new apps and updates (36 since 31 August 2026)", () => {
  assert.ok(sdk('targetSdkVersion') >= 36, `targetSdkVersion ${sdk('targetSdkVersion')}`);
  assert.ok(sdk('compileSdkVersion') >= sdk('targetSdkVersion'));
});

test('the app asks for no permission but the internet', () => {
  const perms = [...manifest.matchAll(/<uses-permission[^>]*android:name="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(perms, ['android.permission.INTERNET']);
});

test('the game stays upright, is marked a game, and its one activity is the launcher', () => {
  assert.match(manifest, /android:screenOrientation="portrait"/);
  assert.match(manifest, /android:appCategory="game"/);
  assert.equal([...manifest.matchAll(/<activity\b/g)].length, 1);
  assert.match(manifest, /android\.intent\.category\.LAUNCHER/);
  assert.doesNotMatch(manifest, /usesCleartextTraffic="true"/);
});

test('the save is backed up and moves to a new phone, and nothing else of the app is', () => {
  assert.match(manifest, /android:allowBackup="true"/);
  assert.match(manifest, /android:dataExtractionRules="@xml\/data_extraction_rules"/);
  assert.match(manifest, /android:fullBackupContent="@xml\/backup_rules"/);
  for (const f of ['data_extraction_rules', 'backup_rules']) {
    const xml = readFileSync(`android/app/src/main/res/xml/${f}.xml`, 'utf8');
    const paths = [...xml.matchAll(/<include domain="root" path="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(paths.length > 0, f);
    assert.ok(paths.includes('app_webview/Default/Local Storage/'), `${f}: the page's Local Storage, where the save is`);
    for (const p of paths) assert.match(p, /^app_webview\//, `${f}: only the page's storage (${p})`);
    assert.doesNotMatch(xml, /<exclude/);
  }
});
