// The twenty new heroes' menu art in the real page, before they join the roster (docs/notes/twenty-heroes.md): the roster's cards, the
// dossier's portrait, the full artwork and the awakened figures, at the three upright phone sizes. The heroes are not in ALL_HEROES yet, so
// the page is opened on the 45 and the first twenty cards' (and the dossier's) images are pointed at the new files: the layout, crops and
// CSS are the page's own. Run `npm run web` first.
//   node tools/heroes-20/art-check.mjs        writes docs/samples/heroes-20/art-<view>-<width>.png
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const NEW = ['vampireLord', 'hemomancer', 'nightstalker', 'bloodGargoyle', 'dhampir', 'warDrummer', 'banneret', 'geomancer', 'bellWarden', 'falconer',
  'astralSphinx', 'mirageDancer', 'plagueDoctor', 'bombardier', 'astrologer', 'inquisitor', 'seraph', 'corsairSurgeon', 'harpooner', 'seaReaver'];
await (await import('esbuild')).build({ entryPoints: ['tools/resonance/fixture.ts'], outfile: 'out/heroes-20-fixture.cjs', bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
const { ALL_HEROES } = require('../../out/heroes-20-fixture.cjs');
const out = 'docs/samples/heroes-20';
mkdirSync(out, { recursive: true });
const mime = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', json: 'application/json', webmanifest: 'application/manifest+json', woff2: 'font/woff2', opus: 'audio/ogg' };
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  try {
    const path = `out/web${pathname === '/' ? '/index.html' : pathname}`;
    res.setHeader('Content-Type', mime[path.split('.').pop()] || 'application/octet-stream');
    res.end(readFileSync(path));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://localhost:${server.address().port}`;
const browser = await chromium.launch();
const problems = [];
try {
  for (const [width, height] of [[393, 852], [360, 780], [412, 915]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', (e) => problems.push(`${width}: ${e.message}`));
    // (a seasoned save that owns the 45, as tools/heritage/shots.mjs's, so the new save's opening does not cover the page)
    await page.addInitScript((owned) => {
      localStorage.clear();
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead'] }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
    }, [...ALL_HEROES]);
    await page.goto(`${url}/?seed=7`, { timeout: 120000 });
    await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 120000 });
    await page.evaluate(() => {
      const g = window.__game;
      document.getElementById('tipSkip')?.click();
      g.home.open();
      g.home.show('heroes');
    });
    // (the Heroes tab opens on the tavern; the roster is behind All heroes)
    await page.getByRole('button', { name: 'All heroes' }).click();
    await page.locator('.heroRoster .heroAnimeArt').first().waitFor();
    /** Point the first twenty cards' art at the new heroes' files (`kind`: '' the cutouts, 'awakened-' the awakened figures). */
    const swap = (prefix) => page.evaluate(async ({ ids, prefix }) => {
      const imgs = [...document.querySelectorAll('.hcard .heroAnimeArt, .hcard .heroAwakenedArt')].slice(0, ids.length);
      imgs.forEach((img, i) => (img.src = prefix ? `heroes/${prefix}${ids[i]}.webp` : `heroes/${ids[i]}-portrait.webp`));
      await Promise.all(imgs.map((i) => i.decode()));
      return imgs.map((i) => i.naturalWidth > 0);
    }, { ids: NEW, prefix });
    const loaded = await swap('');
    if (!loaded.every(Boolean)) problems.push(`${width}: a cutout did not load`);
    await page.screenshot({ path: `${out}/art-roster-${width}.png` });
    await page.evaluate(() => document.querySelector('.heroRoster .rosGrid')?.scrollIntoView());
    if (!(await swap('awakened-')).every(Boolean)) problems.push(`${width}: an awakened figure did not load`);
    await page.screenshot({ path: `${out}/art-awakened-${width}.png` });
    // the dossier: its top-half portrait and the full artwork, for two of the new heroes
    for (const id of width === 393 ? NEW : ['vampireLord', 'seraph']) {
      await page.locator('.hcard').first().click();
      const ok = await page.evaluate(async (id) => {
        const img = document.querySelector('.heroDetail .hpic .heroAnimeArt');
        img.src = `heroes/${id}-portrait.webp`;
        await img.decode();
        return img.naturalWidth > 0;
      }, id);
      if (!ok) problems.push(`${width}: ${id}'s dossier portrait`);
      if (['vampireLord', 'seraph', 'astralSphinx'].includes(id)) await page.screenshot({ path: `${out}/art-dossier-${id}-${width}.png` });
      await page.locator('.heroArtOpen').click();
      const fit = await page.evaluate(async (id) => {
        const e = document.querySelector('dialog.heroArtViewer');
        const img = e.querySelector('img');
        img.src = `heroes/${id}.webp`;
        await img.decode();
        const r = e.getBoundingClientRect(), i = img.getBoundingClientRect();
        return img.naturalWidth > 0 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && i.bottom <= r.bottom + 1 && e.scrollWidth <= e.clientWidth + 1;
      }, id);
      if (!fit) problems.push(`${width}: ${id}'s full artwork does not fit`);
      if (['vampireLord', 'seraph'].includes(id)) await page.screenshot({ path: `${out}/art-full-${id}-${width}.png` });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.heroArtViewer'));
      await page.locator('.heroBack').click();
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else console.log('every new cutout, scene and awakened figure loads and fits at 393x852, 360x780 and 412x915');
