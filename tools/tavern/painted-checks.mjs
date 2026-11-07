// Painted tavern checks and real implementation screenshots. Run after npm run web.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/codex/cua_node/lib/node_modules/')('playwright');
const root = 'out/web';
const server = createServer((q, r) => {
  const path = `${root}/${q.url.split('?')[0].slice(1) || 'index.html'}`;
  if (!existsSync(path)) { r.writeHead(404); r.end(); return; }
  const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', webmanifest: 'application/manifest+json' };
  r.writeHead(200, { 'content-type': types[path.split('.').pop()] || 'application/octet-stream' });
  r.end(readFileSync(path));
}).listen(8719);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const owned = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'cleric', 'ranger', 'barbarian'];
const allHeroes = JSON.parse(readFileSync('art-source/tavern/guests/batches.json', 'utf8')).flat();
const paintingPaths = allHeroes.flatMap(kind => ['right', 'left'].map(facing => `ui/tavern/${kind}-${facing}.webp`));
const failures = [];
let checks = 0;
const check = (name, result) => { checks++; console.log(result ? 'ok' : 'FAIL', name); if (!result) failures.push(name); };
mkdirSync('docs/samples', { recursive: true });
try {
  for (const [width, height] of [[393, 852], [360, 780], [412, 915]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, reducedMotion: width === 412 ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript((owned) => {
      if (sessionStorage.getItem('pt-set')) return;
      sessionStorage.setItem('pt-set', '1');
      localStorage.clear();
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((kind, i) => [kind, 30 * (19 - i) * (20 - i)])), bestStage: 14, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead'] }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, music: 0, effects: 0, quips: false }));
    }, owned);
    await page.goto('http://localhost:8719/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 120000 });
    await page.evaluate(() => { document.getElementById('tipSkip')?.click(); window.__game.home.open(); window.__game.home.show('heroes'); });
    await page.waitForFunction(() => window.__game.home.tab === 'heroes' && !window.__game.home.slide, null, { timeout: 30000 });
    await page.waitForTimeout(300);
    await page.locator('.ptTavern img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const guests = await page.locator('.ptGuest').evaluateAll(nodes => nodes.map(node => node.dataset.kind));
    const rows = await page.locator('.ptHeroPick').evaluateAll(nodes => nodes.map(node => node.dataset.kind));
    check(`five live guests match roster rows ${width}`, guests.length === 5 && JSON.stringify(guests) === JSON.stringify(rows));
    check(`unique compatible seats ${width}`, await page.locator('.ptGuest').evaluateAll(nodes => new Set(nodes.map(node => node.dataset.seat)).size === nodes.length));
    check(`guests use seated paintings ${width}`, await page.locator('.ptGuestArt').evaluateAll(images => images.every(image => /ui\/tavern\/.+-(left|right)\.webp$/.test(image.src))));
    check(`room and characters decoded ${width}`, await page.locator('.ptScene img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)));
    check(`no horizontal overflow ${width}`, await page.locator('.ptTavern').evaluate(node => node.scrollWidth <= node.clientWidth + 1));
    check(`hero targets fit ${width}`, await page.locator('.ptGuest').evaluateAll(nodes => nodes.every(node => { const r = node.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && r.x >= 0 && r.right <= innerWidth; })));
    await page.screenshot({ path: `docs/samples/painted-tavern-${width}.png` });
    await page.locator('.ptGuest').first().click();
    check(`hero opens ${width}`, await page.locator('#hmSheet').isVisible());
    await page.evaluate(() => window.__game.home.closeSheet());
    await page.locator('.ptRoster').click();
    check(`full roster opens ${width}`, await page.locator('#hmSheet .heroRoster').isVisible());
    await page.evaluate(() => { window.__game.home.show('battle'); window.__game.home.show('heroes'); });
    await page.waitForFunction(() => !window.__game.home.slide);
    await page.getByRole('tab', { name: 'Your heroes', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    check(`keyboard opens services tab ${width}`, await page.getByRole('tab', { name: 'Tavern services', exact: true }).getAttribute('aria-selected') === 'true');
    check(`services panel visible ${width}`, await page.locator('.ptActions').isVisible());
    await page.locator('.ptActions').getByRole('button', { name: 'Quests', exact: true }).click();
    check(`quest log opens ${width}`, await page.locator('#hmSheetBox.qlog').isVisible());
    await page.locator('.qlShut').click();
    await page.locator('.ptActions').getByRole('button', { name: /shop|Trader visiting/i }).click();
    check(`shop opens ${width}`, await page.locator('#stall').isVisible());
    await page.locator('#stall .hsBack').click();
    const upgrades = page.locator('.ptActions').getByRole('button', { name: /^Upgrades/ });
    if (await upgrades.isVisible()) {
      await upgrades.click();
      check(`upgrades opens ${width}`, await page.locator('.ulCard').isVisible());
      await page.locator('.ulClose').click();
    }
    await page.locator('.ptActions').scrollIntoViewIfNeeded();
    check(`service targets fit ${width}`, await page.locator('.ptActions .ptButton:visible').evaluateAll(nodes => nodes.every(node => { const r = node.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && r.x >= 0 && r.right <= innerWidth; })));
    if (width === 393) await page.screenshot({ path: 'docs/samples/painted-tavern-services-393.png' });
    // Give an off-screen hero a large XP increase and refresh: it must join the room.
    const outsider = owned.find(kind => !guests.includes(kind));
    await page.evaluate(kind => { const home = window.__game.home; home.meta.xp[kind] = 10000000; home.refresh(); }, outsider);
    check(`strength changes replace guest ${width}`, await page.locator('.ptGuest').first().getAttribute('data-kind') === outsider);
    await page.evaluate(() => { const home = window.__game.home; home.meta.unlocked = ['knight', 'wizard']; home.refresh(); });
    check(`two owned means two guests ${width}`, await page.locator('.ptGuest').count() === 2);
    if (width === 393) {
      const decoded = await page.evaluate(async paths => {
        const images = await Promise.all(paths.map(async path => { const image = new Image(); image.src = path; await image.decode(); return image; }));
        return images.every(image => image.naturalWidth === 384 && image.naturalHeight === 440);
      }, paintingPaths);
      check('all 108 seated paintings decode', decoded);
      const sw = readFileSync('out/web/sw.js', 'utf8');
      check('all seated paintings are precached', paintingPaths.every(path => sw.includes(`'${path}'`)));
      await page.evaluate(() => { const home = window.__game.home; home.meta.unlocked = ['gorgon', 'kraken', 'siegeBot', 'bloodGargoyle', 'nightstalker']; home.refresh(); document.querySelector('.ptTavern').scrollTop = 0; });
      await page.locator('.ptScene img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.screenshot({ path: 'docs/samples/painted-tavern-creatures-393.png' });
      check('unusual company has five distinct seats', await page.locator('.ptGuest').count() === 5);
    }
    check(`no page errors ${width}`, errors.length === 0);
    if (width === 393) {
      await page.evaluate(async () => { await navigator.serviceWorker.register('sw.js'); });
      await page.waitForFunction(async () => { const registration = await navigator.serviceWorker.getRegistration(); return !!registration?.active; }, null, { timeout: 60000 });
      await page.waitForTimeout(1200);
      await page.reload();
      await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 120000 });
      await context.setOffline(true);
      await page.reload();
      await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 120000 });
      await page.evaluate(() => { window.__game.home.open(); window.__game.home.show('heroes'); });
      await page.locator('.ptScene img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      check('painted scene and dynamic heroes load offline', await page.locator('.ptScene img').evaluateAll(images => images.length > 1 && images.every(image => image.naturalWidth > 0)));
    }
    await context.close();
  }
} finally { await browser.close(); server.close(); }
console.log(`${checks} checks, ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
