// SUMMON-TAROT phase A mock-ups: the prototype tarot results and the first-time reveal, in the real page at 393x852.
// The single shard is a real pull; the ten-pull and the reveal use made-up pulls through the prototype's hooks
// (`__game.gacha.tarotReveal`, `__tarot.firstReveal`), so the shots show the same heroes each time. Nothing is saved by them.
//   npm run web && node tools/summon-tarot/mock-shots.mjs [port]
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8253);
const out = 'docs/samples';
const tmp = 'out/shots/summon-tarot';
mkdirSync(tmp, { recursive: true });
const srv = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = Number(process.env.W ?? 393), H = Number(process.env.H ?? 852);
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
const OWNED = HEROES.slice(0, 8);
await page.addInitScript(saveScript(), [OWNED, { stones: 60, unlock: { kitsune: 4, karasu: 2, werewolf: 6 }, shards: { knight: 3, samurai: 1 } }]);
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => [...document.querySelectorAll('.hmTab')].some((b) => b.offsetWidth), {}, { timeout: 90000 });
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
await page.waitForTimeout(1500);
const shot = (name) => page.screenshot({ path: `${name.startsWith('tmp:') ? tmp + '/' + name.slice(4) : out + '/summon-tarot-mock-' + name}.png` });
const tag = process.env.REDUCED ? '-reduced' : W !== 393 ? `-${W}x${H}` : '';

// 1. a single shard, as a real pull from the hall (a shard plays no hall show; the results open at once)
for (const variant of ['sigil', 'shadow']) {
  await page.evaluate((v) => { window.__tarotMock = v; }, variant);
  if (variant === 'sigil') {
    await page.locator('.hlBar button').first().click();
    await page.waitForFunction(() => !document.getElementById('gacha').hidden, {}, { timeout: 20000 });
  } else {
    await page.evaluate(() => window.__game.gacha.tarotReveal([{ kind: 'kitsune', isNew: false, shards: 0, unlock: 1, have: 5, need: 7 }], 'shadow'));
  }
  await page.waitForTimeout(1200);
  await shot(`single-${variant}${tag}`);
}

// 2. a ten-pull: nine shards (unlock and rank) and one hero who joins; the spread, then the join's reveal over it, then after
const ten = [
  { kind: 'knight', isNew: false, shards: 1 },
  { kind: 'kitsune', isNew: false, shards: 0, unlock: 1, have: 5, need: 7 },
  { kind: 'werewolf', isNew: false, shards: 0, unlock: 1, have: 6, need: 7 },
  { kind: 'samurai', isNew: false, shards: 1 },
  { kind: 'karasu', isNew: false, shards: 0, unlock: 1, have: 3, need: 7 },
  { kind: 'lightningMage', isNew: true, shards: 0, unlock: 1, have: 7, need: 7 },
  { kind: 'wizard', isNew: false, shards: 1 },
  { kind: 'archer', isNew: false, shards: 1 },
  { kind: 'yamabushi', isNew: false, shards: 0, unlock: 1, have: 1, need: 7 },
  { kind: 'kunoichi', isNew: false, shards: 1 },
];
await page.evaluate((ten) => { window.__game.gacha.tarotReveal(ten, 'sigil'); }, ten);
await page.waitForTimeout(400);
await shot(`ten-spread${tag}`);
await page.waitForTimeout(1200);
await shot(`tmp:ten-reveal-on`);
// (tap through the reveal: once to skip to its end, once to close)
await page.mouse.click(200, 420); await page.waitForTimeout(600);
await page.mouse.click(200, 420); await page.waitForTimeout(800);
await shot(`ten-after${tag}`);

// 3. the first-time reveal, held at each of its four stages (a lucky join of a kitsune, then a plain join)
for (const [kind, lucky] of [['kitsune', false], ['gorgon', true]]) {
  for (const stage of [1, 2, 3, 4]) {
    await page.evaluate(([kind, lucky, stage]) => { window.__tarotP = window.__tarot.firstReveal({ kind, isNew: true, shards: 0, lucky }, stage); }, [kind, lucky, stage]);
    await page.waitForTimeout(stage === 1 ? 700 : stage === 2 ? 1250 : stage === 3 ? 2400 : 3600);
    await shot(`reveal-${kind}-${stage}${tag}`);
    await page.evaluate(() => document.querySelectorAll('.tarotReveal').forEach((e) => e.remove()));
  }
  if (process.env.REDUCED || W !== 393) break;
}
console.log(JSON.stringify({ errors }));
await browser.close();
srv.close();
