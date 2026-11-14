// RELEASE-FIXES-2 (docs/notes/release-fixes-2.md): the service worker, cache first for a version's own files, checked end to end on the
// built game. One version is served and installed; a start online again must fetch none of its files; the server then serves the next
// version: the start after it finds it, the worker fetches the new files fresh, and the start after that is the new version, offline too.
//
//   npm run web && node tools/release-audit/sw-update.mjs
// (the next version is the same build with its version's name changed, in sw.js, index.html and game.js)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createReadStream, readFileSync, existsSync, statSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');

const V1 = process.env.ROOT ?? 'out/web';
const name1 = readFileSync(`${V1}/sw.js`, 'utf8').match(/const CACHE = 'legends-(.*)';/)[1];
const name2 = `${name1.split(' ')[0]}-next · update-test`;
// (the next version: hard links to the first's files, with the three that name the version written afresh)
const V2 = mkdtempSync(join(process.env.TMP ?? tmpdir(), 'sw-v2-'));
execSync(`cp -al ${V1}/. ${V2}/`);
for (const f of ['sw.js', 'index.html', 'game.js']) {
  // (game.js has the version's dot written as an escape, \xB7)
  const [from, to] = f === 'game.js' ? [name1.replace('·', '\\xB7'), name2.replace('·', '\\xB7')] : [name1, name2];
  const text = readFileSync(`${V1}/${f}`, 'utf8');
  if (!text.includes(from)) throw new Error(`${f} does not name the version ${from}`);
  rmSync(`${V2}/${f}`);
  writeFileSync(`${V2}/${f}`, text.split(from).join(to), 'utf8');
}

let root = V1;
const hits = new Map();
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', webmanifest: 'application/manifest+json', opus: 'audio/ogg' };
const srv = createServer((q, r) => {
  const path = decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html';
  hits.set(path, (hits.get(path) ?? 0) + 1);
  const p = `${root}/${path}`;
  if (!existsSync(p) || statSync(p).isDirectory()) {
    r.writeHead(404);
    return r.end();
  }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream', 'cache-control': 'max-age=600', 'content-length': statSync(p).size });
  // (streamed: a server holding 208 MB a request ran the machine out of memory beside the browser)
  createReadStream(p).pipe(r);
}).listen(8788);
const URL = 'http://localhost:8788/';

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'allow' });
const page = await ctx.newPage();
await page.addInitScript(() => {
  if (localStorage.getItem('legends.meta')) return;
  localStorage.setItem('lotf-tips-off', '1');
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 500, unlocked: ['knight', 'archer', 'mage', 'cleric', 'rogue'], party: ['knight', 'archer', 'mage', 'cleric', 'rogue'], bestStage: 5 }));
});
const results = [];
const check = (what, ok, said) => (results.push(ok), console.log(`${ok ? 'PASS' : 'FAIL'} ${what}: ${said}`));
const ready = () => page.waitForFunction(() => !!window.__game?.home, null, { timeout: 300000 });
const shown = () => page.evaluate(() => document.getElementById('version')?.textContent?.trim() ?? '');
/** Until the worker in charge is done installing and keeps only `cache` (polled: an async predicate would be taken as already true). */
async function settled(cache) {
  for (let i = 0; i < 600; i++) {
    const ok = await page.evaluate(async (cache) => {
      const r = await navigator.serviceWorker.getRegistration();
      if (!r?.active || r.installing || r.waiting || !navigator.serviceWorker.controller) return false;
      const ks = await caches.keys();
      return ks.length === 1 && ks[0] === `legends-${cache}`;
    }, cache);
    if (ok) return true;
    // (the browser checks sw.js for a new version a moment after a start; asked here as well, as a phone's next start would)
    if (i % 10 === 5) await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r?.update().catch(() => {})));
    await page.waitForTimeout(1000);
  }
  throw new Error(`the worker never settled on ${cache}`);
}
const gameHits = () => hits.get('game.js') ?? 0;

// 1. the first visit: the page from the network, the worker installs the version
await page.goto(URL, { timeout: 300000 });
await ready();
await settled(name1);
check('first visit', (await shown()).includes(name1.split(' ')[0]), `version shown "${await shown()}"; game.js fetched ${gameHits()} times (the page, then the worker's install)`);

// 2. a start online again: nothing of the version fetched
let before = gameHits();
const all0 = [...hits.values()].reduce((a, b) => a + b, 0);
await page.reload({ timeout: 300000 });
await ready();
check('online start, same version', gameHits() === before, `game.js fetched ${gameHits() - before} times; ${[...hits.values()].reduce((a, b) => a + b, 0) - all0} requests reached the server`);

// 3. the next version is published: this start is still the old one, and finds the new
root = V2;
before = gameHits();
await page.reload({ timeout: 300000 });
await ready();
const during = await shown();
await settled(name2);
check('next version found', during.includes(name1.split(' ')[0]) && gameHits() - before === 1, `this start shows "${during}" (the old, from the phone); the new worker fetched game.js ${gameHits() - before} time, fresh, and took over`);

// 4. the start after: the new version, from the phone
before = gameHits();
await page.reload({ timeout: 300000 });
await ready();
const now = await shown();
check('next start is the new version', now.includes('update-test') && gameHits() === before, `version shown "${now}"; game.js fetched ${gameHits() - before} times`);

// 5. offline: the new version starts
await ctx.setOffline(true);
let off = '';
try {
  await page.reload({ timeout: 300000 });
  await ready();
  off = await shown();
} catch (e) {
  off = 'did not start: ' + e.message.split('\n')[0];
}
check('offline start, new version', off.includes('update-test'), `version shown "${off}"`);

await browser.close();
srv.close();
rmSync(V2, { recursive: true, force: true });
process.exit(results.every(Boolean) ? 0 : 1);
