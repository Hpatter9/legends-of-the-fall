// PLAY-SIZE (docs/notes/play-size.md): moves the web files that `cap sync android` copied into the app module
// (android/app/src/main/assets/public) into the install-time asset pack (android/web/src/main/assets/public), so the Play
// bundle's base module holds only the app's code and Capacitor's config. Run it after `cap sync` and before `bundleRelease`.
// The source maps are left out, as the app module's `ignoreAssetsPattern` leaves them out of an APK (the app never reads them).
//
//   node tools/play-size/pack.mjs           move the synced files into the pack
//   node tools/play-size/pack.mjs --back    move them back into the app module (for a plain APK or `cap run` after a bundle)
import { existsSync, readdirSync, renameSync, rmSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const APP = 'android/app/src/main/assets/public';
const PACK = 'android/web/src/main/assets/public';
const back = process.argv.includes('--back');
const [from, to] = back ? [PACK, APP] : [APP, PACK];

if (!existsSync(join(from, 'index.html'))) {
  console.error(`${from}/index.html is missing: ${back ? 'nothing to move back' : 'run `npx cap sync android` first'}.`);
  process.exit(1);
}

// (every file under a folder, with its size)
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [[join(dir, d.name), statSync(join(dir, d.name)).size]]));

rmSync(to, { recursive: true, force: true });
mkdirSync(join(to, '..'), { recursive: true });
renameSync(from, to);

// (what the app module's `ignoreAssetsPattern` keeps out of an APK: source maps and dot files)
let dropped = 0;
if (!back) {
  for (const [f, size] of walk(to)) {
    const name = f.split('/').pop();
    if (name.endsWith('.map') || name.startsWith('.')) {
      rmSync(f);
      dropped += size;
    }
  }
}
const files = walk(to);
const mb = (n) => (n / 1e6).toFixed(1);
console.log(`Moved ${files.length} files (${mb(files.reduce((s, [, n]) => s + n, 0))} MB) into ${to}${dropped ? `; left out ${mb(dropped)} MB of source maps` : ''}.`);
