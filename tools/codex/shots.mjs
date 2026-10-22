// Screenshots of the codex: node tools/codex/shots.mjs  (serves out/web itself; needs playwright and Chromium)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const require = createRequire('/node-tools/node_modules/');
const { chromium } = require('playwright');
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8124);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const skip = (page) => page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
for (const [tag, w, h] of [['393', 393, 852], ['360', 360, 780]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8124/?seed=7');
  await page.waitForTimeout(2000);
  // a save part-way through the codex: a dozen more heroes, a spread of foes met
  await page.evaluate(() => {
    const m = window.__game.meta;
    const heroes = ['paladin', 'cleric', 'druid', 'barbarian', 'ranger', 'warlock', 'illusionist', 'gunslinger', 'mummy', 'reaper', 'timeWitch', 'priestess'];
    m.unlocked = [...new Set([...m.unlocked, ...heroes])];
    const met = ['skeleton', 'spearman', 'boneArcher', 'wolfBlack', 'wolfRed', 'minotaur1', 'gorgon1', 'satyr1', 'orcGrunt', 'orcArcher', 'orcBrute', 'imp', 'demon', 'ogre', 'orcWarlord', 'demonLord', 'lichKing', 'eliteGorrak', 'eliteCindra', 'calBoss1', 'yokaiFox', 'stoneGolem', 'boneCaptain', 'forestBoss1'];
    m.codex = { met, kills: Object.fromEntries(met.map((d, i) => [d, 3 + i * 4])) };
    m.codexClaimed = [];
    localStorage.setItem('legends.meta', JSON.stringify(m));
  });
  await page.reload();
  await page.waitForTimeout(2500);
  await skip(page);
  await page.click('#homeBtn');
  await page.waitForTimeout(1500);
  await skip(page);
  await page.click('.hmTab:has-text("Castle")');
  await page.waitForTimeout(1200);
  await skip(page);
  await page.screenshot({ path: `docs/samples/codex-castle-${tag}.png` });
  await page.click('.ctChip:has-text("Codex")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `docs/samples/codex-bestiary-${tag}.png` });
  await page.evaluate(() => document.getElementById('hmSubBody').scrollTo(0, 420));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `docs/samples/codex-bestiary-scrolled-${tag}.png` });
  await page.evaluate(() => document.getElementById('hmSubBody').scrollTo(0, 0));
  await page.click('.cxCard:has-text("Orc Warlord")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `docs/samples/codex-foe-${tag}.png` });
  await page.evaluate(() => document.querySelector('.cxSheet').scrollTo(0, 9999));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `docs/samples/codex-foe-tips-${tag}.png` });
  await page.click('.cxSheet .primary');
  await page.click('.cxCard.dark >> nth=0');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `docs/samples/codex-foe-unmet-${tag}.png` });
  await page.click('.cxSheet .primary');
  await page.click('.cxTab:has-text("Heroes")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `docs/samples/codex-heroes-${tag}.png` });
  await page.click('.cxCard:has-text("Paladin")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `docs/samples/codex-hero-${tag}.png` });
  await page.click('.cxSheet .primary');
  await page.click('.cxCard.dark >> nth=0');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `docs/samples/codex-hero-locked-${tag}.png` });
  await ctx.close();
}
await browser.close(); srv.close();
