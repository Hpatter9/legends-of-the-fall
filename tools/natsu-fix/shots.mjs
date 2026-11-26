// NATSU-FIX (docs/notes/natsu-fix.md): Natsu's hero card, her full painting, the summoning's tarot reveal and an earned hero's arrival at 393 x 852, into docs/samples/natsu-fix/. `npm run web` first.
import { createRequire } from 'node:module';
import { serve } from '../audit/lib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const srv = serve('out/web');
const out = 'docs/samples/natsu-fix';
const errors = [];
const owned = ['archer', 'knight', 'samurai', 'kunoichi', 'wizard'];
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((owned) => {
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned, pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead'], scenes: ['opening'], tutorials: ['pause', 'autoMerge', 'traitPerks', 'spellSlots', 'daily', 'eidolons', 'castle', 'autoRunes', 'nemesis', 'chapel', 'talents', 'secondSkill', 'duels', 'warHorn', 'ultimates', 'autoPlace', 'tavern', 'summoning', 'council', 'hunts', 'spare', 'tiers', 'shop', 'recruit'] }));
  localStorage.setItem('lotf-tips-off', '1');
  localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
}, owned);
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 120000 });
await page.evaluate(() => { document.getElementById('tipSkip')?.click(); window.__game.home.open(); window.__game.home.show('heroes'); });
await page.getByRole('button', { name: 'All heroes' }).click();
await page.locator('.hcard').first().waitFor();
await page.locator('.hcard', { hasText: 'Natsu' }).first().click();
await page.locator('.heroDetail .heroAnimeArt').first().evaluate((i) => i.decode().catch(() => 0));
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/natsu-card.png` });
await page.locator('.heroArtOpen').click();
const fit = await page.evaluate(async () => {
  const e = document.querySelector('dialog.heroArtViewer'); const img = e.querySelector('img'); await img.decode();
  const r = e.getBoundingClientRect(), i = img.getBoundingClientRect();
  return { src: img.getAttribute('src'), fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && i.bottom <= r.bottom + 1 };
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/natsu-painting.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
// (the tarot reveal, held on its last stage, and the arrival, held on its last beat: both show her full painting)
await page.evaluate(() => { void window.__tarot.firstReveal(window.__game.meta, 'archer', { hold: 4 }); });
await page.waitForFunction(() => document.querySelector('.tarotReveal')?.dataset.stage === '4', null, { timeout: 20000 });
await page.locator('.tarotReveal .trArtwork').evaluate((i) => i.decode().catch(() => 0));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/natsu-tarot.png` });
await page.evaluate(() => document.querySelectorAll('.tarotReveal').forEach((e) => e.remove()));
await page.evaluate(() => { void window.__earned.earnedArrival(window.__game.meta, 'archer', { hold: 4 }); });
await page.waitForSelector('.earnedArrival .eaArtwork', { timeout: 20000 });
await page.locator('.earnedArrival .eaArtwork').evaluate((i) => i.decode().catch(() => 0));
await page.waitForTimeout(3500);
await page.screenshot({ path: `${out}/natsu-arrival.png` });
console.log(JSON.stringify(fit), errors.length ? `PAGE ERRORS ${errors}` : 'no page errors');
await browser.close(); srv.close();
