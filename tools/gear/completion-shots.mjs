// Actual equipment-screen previews for the completed painting batch. Run npm run web first.
// PLAYWRIGHT_MODULE and CHROMIUM_PATH can select the local browser installation.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const manifest = JSON.parse(readFileSync('art-source/gear/completion/manifest.json', 'utf8'));
const dir = 'docs/samples/gear-completion';
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', webp: 'image/webp', png: 'image/png', woff2: 'font/woff2', opus: 'audio/ogg' };
const server = createServer((req, res) => {
  const path = 'out/web/' + (req.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(path)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.split('.').pop()] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(8817);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const heroes = ['knight', 'wizard', 'samuraiCommander', 'cleric', 'archer'];
const equipment = [...manifest.pieces.map((p) => p.id), 'stormHood', 'coatOfPlates', 'claymore'].map((base, i) => ({ id: 901 + i, base, rarity: (i % 5) + 1, level: 6 }));
const id = (base) => equipment.find((it) => it.base === base).id;
const meta = {
  seed: 7, crowns: 1200, unlocked: heroes, party: heroes, pulls: 0,
  castle: { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 },
  shards: {}, stars: {}, xp: { knight: 4000 }, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [], armies: {},
  gearV: 2, equipment, nextItem: 999,
  equipped: { knight: Object.fromEntries(Object.entries({ head: 'stormHood', torso: 'coatOfPlates', main: 'claymore', off: 'bladedFan', feet: 'frostBoots', belt: 'stormGirdle', acc: 'stormRing' }).map(([slot, base]) => [slot, id(base)])) },
};
const results = [];
try {
  for (const [width, height] of [[393, 852], [360, 780], [412, 915]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((m) => {
      localStorage.setItem('legends.meta', JSON.stringify(m));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay']));
      localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
    }, meta);
    await page.goto('http://127.0.0.1:8817/', { timeout: 120000 });
    await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await page.evaluate(() => window.__game.home.openSheet('knight'));
    await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
    await page.waitForTimeout(600);
    assert.equal(await page.locator('#tip').isVisible(), false, 'Tutorial does not obscure equipment');
    await page.locator('.eqDoll').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${dir}/doll-${width}.png` });
    assert.equal(await page.locator('.eqPanel .eqIcon.ph').count(), 0, 'No placeholder icons');
    assert.equal(await page.locator('.eqSlot .eqIcon.painted').count(), 7, 'All seven worn slots painted');
    for (const slot of ['off', 'feet', 'belt', 'acc']) {
      await page.locator(`.eqSlot.at-${slot}`).click();
      await page.waitForTimeout(250);
      assert.equal(await page.locator('.eqPanel .eqIcon.ph').count(), 0, `${slot}: no placeholders`);
      await page.screenshot({ path: `${dir}/picker-${slot}-${width}.png` });
      await page.locator('.eqPanel').getByRole('button', { name: /Back/ }).first().click();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, 'No horizontal overflow');
    assert.deepEqual(errors, [], 'No page errors');
    results.push({ width, height, paintedSlots: 7, placeholders: 0, overflow, errors });
    await ctx.close();
  }
  writeFileSync(`${dir}/browser-results.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
  server.close();
}
