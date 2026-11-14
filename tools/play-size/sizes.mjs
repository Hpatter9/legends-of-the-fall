// PLAY-SIZE (docs/notes/play-size.md): what Google Play will download for a bundle, read by bundletool from the bundle's own
// split APKs: the base module, the web asset pack and the whole install, and the universal APK made from it. Fails when the base
// module's download is over Play's 200 MB limit (the reason the asset pack exists).
//
//   node tools/play-size/sizes.mjs <app-release.aab> <bundletool.jar> [--keep <dir>]
//
// (`--keep <dir>` leaves the APK sets there: `local.apks` for `bundletool install-apks` with --local-testing, and `universal.apks`)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [aab, jar] = process.argv.slice(2);
if (!aab || !jar) {
  console.error('node tools/play-size/sizes.mjs <app-release.aab> <bundletool.jar> [--keep <dir>]');
  process.exit(2);
}
const keepAt = process.argv.indexOf('--keep');
const dir = keepAt >= 0 ? process.argv[keepAt + 1] : mkdtempSync(join(tmpdir(), 'play-size-'));
mkdirSync(dir, { recursive: true });
const bt = (...args) => execFileSync('java', ['-jar', jar, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
// (get-size prints "MIN,MAX" then one line of bytes: the largest download over every device the bundle can serve)
const maxOf = (csv) => Number(csv.trim().split('\n').pop().split(',').pop());

const local = join(dir, 'local.apks');
const universal = join(dir, 'universal.apks');
bt('build-apks', `--bundle=${aab}`, `--output=${local}`, '--local-testing', '--overwrite');
bt('build-apks', `--bundle=${aab}`, `--output=${universal}`, '--mode=universal', '--overwrite');
const base = maxOf(bt('get-size', 'total', `--apks=${local}`, '--modules=base'));
const total = maxOf(bt('get-size', 'total', `--apks=${local}`));
const mb = (n) => `${(n / 1e6).toFixed(1)} MB`;
const rows = [
  ['the bundle (.aab file)', mb(statSync(aab).size)],
  ['base module (download, most a device gets)', mb(base)],
  ['web asset pack (download)', mb(total - base)],
  ['whole install (download)', mb(total)],
  ['universal APK set (.apks file)', mb(statSync(universal).size)],
];
for (const [k, v] of rows) console.log(`${k.padEnd(46)} ${v}`);
if (keepAt < 0) rmSync(dir, { recursive: true, force: true });
// (Play's 200 MB, read as 200,000,000 bytes: the stricter of the two readings)
if (base > 200e6) {
  console.error(`The base module's download (${mb(base)}) is over Play's 200 MB limit.`);
  process.exit(1);
}
console.log(`The base module is under Play's 200 MB limit.`);
