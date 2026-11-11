// ARMIES-SWIPE: the Armies page's pictures (docs/samples/armies-swipe/): at rest, mid-swipe, settled, the arrows close up, the
// first and last army, at the three phone sizes; and its checks (what moves, when the information changes, the arrows). `node tools/armies-swipe/shots.mjs` (after `npm run web`). The pictures in `before/` were taken by this script's first form, on the page as it was.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = 'docs/samples/armies-swipe/after';
mkdirSync(out, { recursive: true });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', webmanifest: 'application/manifest+json' };
const server = createServer((q, r) => {
  const path = `out/web/${q.url.split('?')[0].slice(1) || 'index.html'}`;
  if (!existsSync(path)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': types[path.split('.').pop()] || 'application/octet-stream' });
  r.end(readFileSync(path));
}).listen(8731);
const browser = await chromium.launch();
let failed = 0;
const check = (name, ok) => { if (!ok) failed++; console.log(ok ? 'ok' : 'FAIL', name); };
const owned = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'cleric'];
const save = { seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, 50000])), bestStage: 14, daily: {}, bosses: [], armies: { orcs: { clears: 1, best: 15, won: 15, met: { 0: 7 } } }, armySeen: [], achievements: [], claimed: [], stash: [], opened: ['undead'], scenes: ['opening'] };
try {
  for (const [width, height] of [[393, 852], [360, 780], [412, 915]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, deviceScaleFactor: 2 });
    const page = await context.newPage();
    page.on('pageerror', (e) => { failed++; console.log('PAGE ERROR', e.message); });
    await page.addInitScript((s) => {
      localStorage.setItem('legends.meta', JSON.stringify(s));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, music: 0, effects: 0, quips: false }));
    }, save);
    await page.goto('http://localhost:8731/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 120000 });
    // (this save's one-off notice of the summoning stones has to have gone before the pictures)
    await page.evaluate(() => { document.getElementById('tipSkip')?.click(); window.__game.home.open(); });
    await page.waitForTimeout(7000);
    const open = async (id) => {
      await page.evaluate((a) => { document.getElementById('tipSkip')?.click(); window.__game.home.open(); window.__game.home.openArmies(a); }, id);
      await page.waitForTimeout(900);
      await page.locator('.asRoot img').evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode().catch(() => 0))));
    };
    const shot = (name, clip) => page.screenshot({ path: `${out}/${name}-${width}.jpg`, quality: 85, ...(clip ? { clip } : {}) });
    await open('undead');
    await shot('rest');
    // (the two arrows close up: a strip across the page at their height)
    const box = await page.locator('.asArrow.left').boundingBox();
    if (box) await shot('arrows', { x: 0, y: Math.max(0, box.y - 30), width, height: box.height + 60 });
    for (const side of ['left', 'right']) {
      const b = await page.locator(`.asArrow.${side}`).boundingBox();
      if (b) await shot(`arrow-${side}`, { x: Math.max(0, b.x - 20), y: b.y - 20, width: b.width + 40, height: b.height + 40 });
    }
    // (the checks of the arrows: one size, mirrored, centred on the card, clear of it)
    const geo = await page.evaluate(() => {
      const r = (q) => { const b = document.querySelector(q).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
      return { l: r('.asArrow.left'), rt: r('.asArrow.right'), card: r('.asCard[aria-hidden="false"] .wrBanner'), info: r('.asInfoHost'), track: r('.asTrack'), vw: innerWidth, li: getComputedStyle(document.querySelector('.asArrow.left')).backgroundImage, ri: getComputedStyle(document.querySelector('.asArrow.right')).backgroundImage };
    });
    check(`arrows the same size ${width}`, geo.l.w === geo.rt.w && geo.l.h === geo.rt.h && geo.l.w >= 44 && geo.l.h >= 44);
    check(`arrows mirrored ${width}`, Math.abs(geo.l.x - (geo.vw - geo.rt.r)) < 0.6 && geo.l.y === geo.rt.y && /g-back/.test(geo.li) && /g-right/.test(geo.ri));
    check(`arrows centred on the card ${width}`, Math.abs(geo.l.y + geo.l.h / 2 - (geo.card.y + geo.card.h / 2)) <= 4);
    check(`arrows clear of the card ${width}`, geo.l.r <= geo.card.x && geo.rt.x >= geo.card.r && geo.l.r <= geo.track.x && geo.rt.x >= geo.track.r);
    // (the pressed state, held)
    for (const side of ['left', 'right']) {
      const b = await page.locator(`.asArrow.${side}`).boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(80);
      check(`the pressed ${side} arrow keeps its orb, sunk ${width}`, await page.evaluate((sd) => { const c = getComputedStyle(document.querySelector(`.asArrow.${sd}`)); return c.backgroundImage.includes(sd === 'left' ? 'g-back' : 'g-right') && c.transform !== 'none'; }, side));
      await shot(`arrow-${side}-pressed`, { x: Math.max(0, b.x - 20), y: b.y - 20, width: b.width + 40, height: b.height + 40 });
      await page.mouse.move(b.x + b.width / 2, b.y + 200);
      await page.mouse.up();
    }
    const state = () => page.evaluate(() => ({ info: document.querySelector('.asInfoHost').lastElementChild.dataset.army, wells: document.querySelectorAll('.asInfoHost > *').length, card: document.querySelector('.asCard[aria-hidden="false"]').dataset.army, x: Math.round(document.querySelector('.asCard[data-army="undead"]').getBoundingClientRect().x), hostH: document.querySelector('.asInfoHost').getBoundingClientRect().height, hostY: document.querySelector('.asInfoHost').getBoundingClientRect().y }));
    const rest = await state();
    // (a drag of the card: `part` of its window's width, held, then let go)
    const cdp = await context.newCDPSession(page);
    const y = Math.round(geo.card.y + geo.card.h / 2);
    const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: Math.round(x), y }] });
    const drag = async (part, held) => {
      const from = geo.vw / 2 + (part < 0 ? 60 : -60);
      await touch('touchStart', from);
      for (let i = 1; i <= 12; i++) { await touch('touchMove', from + (geo.track.w * part * i) / 12); await page.waitForTimeout(30); }
      await page.waitForTimeout(250);
      if (held) await held();
      await touch('touchEnd', 0);
      await page.waitForTimeout(900);
    };
    // (short of half-way: it springs back, and the information never changed)
    await drag(-0.4, async () => {
      const mid = await state();
      check(`short drag: the card moved, the info did not ${width}`, mid.x < rest.x - 40 && mid.info === 'undead' && mid.hostY === rest.hostY && mid.hostH === rest.hostH);
    });
    const sprung = await state();
    check(`short drag springs back ${width}`, sprung.info === 'undead' && sprung.card === 'undead' && sprung.x === rest.x && sprung.wells === 1);
    // (half-way: held for the picture, the info unchanged; a little further and let go, the card settles and the info changes)
    await drag(-0.5, async () => {
      const mid = await state();
      check(`mid-swipe: the info is unchanged ${width}`, mid.info === 'undead' && mid.wells === 1 && mid.hostY === rest.hostY && mid.hostH === rest.hostH);
      await shot('mid-swipe');
      await touch('touchMove', geo.vw / 2 + 60 - geo.track.w * 0.56);
      await page.waitForTimeout(250);
    });
    const done = await state();
    check(`past half-way: settled on the next army, the info changed ${width}`, done.card !== 'undead' && done.info === done.card && done.wells === 1 && done.hostY === rest.hostY && done.hostH === rest.hostH);
    await shot('settled');
    // (the arrows do the same move)
    await page.locator('.asArrow.left').click();
    await page.waitForTimeout(80);
    const sliding = await state();
    await page.waitForTimeout(800);
    const back = await state();
    check(`an arrow: the info waits for the card ${width}`, sliding.info === done.info && back.info === 'undead' && back.card === 'undead');
    check(`no sideways overflow ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    // (the first and the last army: the arrow that leads nowhere is dimmed and does nothing)
    await page.evaluate(() => document.querySelector('.asDot')?.click());
    await page.waitForTimeout(900);
    await shot('first');
    check(`first army: the left arrow is off ${width}`, await page.evaluate(() => document.querySelector('.asArrow.left').disabled && !document.querySelector('.asArrow.right').disabled));
    await page.evaluate(() => [...document.querySelectorAll('.asDot')].at(-1)?.click());
    await page.waitForTimeout(900);
    await shot('last');
    check(`last army: the right arrow is off ${width}`, await page.evaluate(() => document.querySelector('.asArrow.right').disabled && !document.querySelector('.asArrow.left').disabled));
    const lb = await page.locator('.asArrow.left').boundingBox();
    await shot('arrows-last', { x: 0, y: Math.max(0, lb.y - 30), width, height: lb.height + 60 });
    // (reduced motion: no slide; the card and the information swap at once)
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.asArrow.left').click();
    const still = await page.evaluate(() => ({ info: document.querySelector('.asInfoHost').lastElementChild.dataset.army, wells: document.querySelectorAll('.asInfoHost > *').length, card: document.querySelector('.asCard[aria-hidden="false"]').dataset.army, tr: document.querySelector('.asStrip').style.transition }));
    check(`reduced motion: the swap is at once ${width}`, still.info === still.card && still.wells === 1 && still.tr === 'none');
    // (Back still leaves the page)
    await page.locator('.asBack').click();
    await page.waitForTimeout(400);
    check(`Back closes the page ${width}`, (await page.locator('.asRoot').count()) === 0 || !(await page.locator('.asRoot').isVisible()));
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (failed) { console.log(`${failed} failed`); process.exit(1); }
