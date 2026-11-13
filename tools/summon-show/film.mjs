// SUMMON-SHOW: films a real ten-stone draw (shards first, then each new hero's reveal) and a single new hero, in the real page, and
// checks the order: every shard card is turned before the first reveal opens. Frames go to out/summon-show/<size>/<take>/; a
// filmstrip is made of them by `python3 tools/summon-show/strip.py`. Sizes: W and H (393x852 by default); REDUCED=1 for reduced motion.
//   npm run web && node tools/summon-show/film.mjs [port]
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8261);
const srv = serve('out/web', port);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = Number(process.env.W ?? 393), H = Number(process.env.H ?? 852);
const REDUCED = !!process.env.REDUCED;
const EVERY = Number(process.env.EVERY ?? 250);
const size = `${W}x${H}${REDUCED ? '-reduced' : ''}`;
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
const OWNED = HEROES.slice(0, 8);
// (three heroes' bars past full, so a shard of theirs brings them in; a few begun, so the shard cards show their bars)
const unlock = { kitsune: 200, werewolf: 200, gorgon: 200, lancer: 200, mercenary: 200, samuraiCommander: 200, karasu: 2, yamabushi: 3, minotaur: 1 };
await page.addInitScript(saveScript(), [OWNED, { stones: 120, heroesSeen: OWNED, unlock, shards: { knight: 3, samurai: 1 } }]);
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => [...document.querySelectorAll('.hmTab')].some((b) => b.offsetWidth), {}, { timeout: 90000 });
await page.waitForTimeout(500);
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
await page.waitForTimeout(1500);

// (the page notes, as they happen, each card turned and each reveal opened and closed)
await page.evaluate(() => {
  const log = (window.__showLog = []);
  const t0 = performance.now();
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'attributes' && m.target.classList?.contains('tarotResult') && m.target.classList.contains('up') && !m.target.classList.contains('joined')) log.push({ t: performance.now() - t0, ev: 'card', kind: m.target.dataset.kind });
      for (const n of m.addedNodes ?? []) if (n.classList?.contains('tarotReveal')) log.push({ t: performance.now() - t0, ev: 'reveal', label: n.getAttribute('aria-label') });
      for (const n of m.removedNodes ?? []) if (n.classList?.contains('tarotReveal')) log.push({ t: performance.now() - t0, ev: 'closed' });
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  // (the page's own clock in each filmed frame, from the draw's start: the screencast's times run behind the page under load)
  const clock = document.createElement('div');
  clock.style.cssText = 'position:fixed;left:2px;top:2px;z-index:99;font:700 11px monospace;color:#fff;background:#000a;padding:1px 3px;pointer-events:none';
  document.body.append(clock);
  window.__showT0 = performance.now();
  const tick = () => { clock.textContent = `${((performance.now() - window.__showT0) / 1000).toFixed(2)} s`; requestAnimationFrame(tick); };
  tick();
});

// (frames come from the page's own screencast, as they are painted, each with its time: a screenshot a frame was too slow to film by)
const cdp = await ctx.newCDPSession(page);
let sink = null;
cdp.on('Page.screencastFrame', async (f) => {
  if (sink) sink.push({ t: f.metadata.timestamp, data: f.data });
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
async function film(take, start, until, tapHeld = true) {
  const dir = `out/summon-show/${size}/${take}`;
  mkdirSync(dir, { recursive: true });
  await page.evaluate(() => { window.__showLog.length = 0; window.__showT0 = performance.now(); });
  sink = [];
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: W, maxHeight: H });
  await start();
  const t0 = Date.now();
  let held = 0;
  for (;;) {
    const st = await page.evaluate(() => ({ stage: document.querySelector('.tarotReveal')?.dataset.stage, hint: document.querySelector('.trHint')?.textContent }));
    // (the last hero is held: tap it on once it has been seen a while)
    if (tapHeld && st.stage === '4') {
      held ||= Date.now();
      if (Date.now() - held > 2500) { held = 0; await page.mouse.click(W / 2, H / 2); }
    } else held = 0;
    if (await until() || Date.now() - t0 > 60000) break;
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(600);
  await cdp.send('Page.stopScreencast');
  const frames = sink;
  sink = null;
  const f0 = frames[0]?.t ?? 0;
  frames.forEach((f, i) => writeFileSync(`${dir}/${String(i).padStart(4, '0')}-${Math.round((f.t - f0) * 1000)}.jpg`, Buffer.from(f.data, 'base64')));
  const log = await page.evaluate(() => window.__showLog);
  return { take, frames: frames.length, log };
}

const settled = () => page.evaluate(() => !document.querySelector('.tarotReveal') && /drawn|ally|allies|step|grows|tribute|Lucky/.test(document.getElementById('resultSummary').textContent) && !/wait|answer|turn/.test(document.getElementById('resultSummary').textContent));
const back = () => page.evaluate(() => document.getElementById('gachaClose').click());
const ten = await film('ten', () => page.locator('.hlBar button').last().click(), settled);
await page.waitForTimeout(800);
await page.screenshot({ path: `out/summon-show/${size}/ten-after.png` });
const turnedAll = ten.log.filter((e) => e.ev === 'card').map((e) => e.t);
const firstReveal = ten.log.find((e) => e.ev === 'reveal')?.t ?? Infinity;
const orderOk = turnedAll.every((t) => t < firstReveal);
// a single stone that brings a hero in (from the sanctum's own button)
await back();
await page.waitForTimeout(800);
await page.evaluate(() => { window.__forceLucky = true; });
const one = await film('single', () => page.locator('.hlBar button').first().click(), settled);
await page.waitForTimeout(800);
await page.screenshot({ path: `out/summon-show/${size}/single-after.png` });
console.log(JSON.stringify({ size, orderOk, cards: turnedAll.length, ten: ten.log, single: one.log, errors }, null, 1));
await browser.close();
srv.close();
