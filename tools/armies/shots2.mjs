// Screenshots for the Yokai Night Parade and the Golem Forge at 393x852 (upright): the Armies screen with all nine armies, a
// wave of each, and the four boss intros and fights:
//   node tools/armies/shots2.mjs <web dir>
// Writes docs/samples/armies2-<scene>.png (needs Playwright, as the other shot scripts).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web'] = process.argv.slice(2);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8132);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [tag, w, h] of [['upright', 393, 852]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const shot = (name) => page.screenshot({ path: `docs/samples/armies2-${name}.png` });
  const load = async (setup) => {
    await page.goto('http://localhost:8132/?x=' + Math.random());
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:8132/');
    await page.waitForTimeout(2200);
    await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
    if (setup) await page.evaluate(setup);
    await page.evaluate(() => { window.__game.home.open(); });
    await page.waitForTimeout(300);
  };
  const startArmy = (id, wave) =>
    page.evaluate(([id, wave]) => {
      const g = window.__game;
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { mode: { kind: 'army', army: id }, stage: wave, over: false, cleared: false, gold: 500, event: undefined });
      document.getElementById('home').hidden = true;
      g.startRun(r);
      for (let i = 0; i < 4; i++) document.getElementById('summon').click();
      for (const h of g.run.roster.slice(0, 5)) {
        if (g.b.units.some((u) => u.tag === h.id)) continue;
        const t = g.freeTile();
        if (t) g.put(String(h.id), t);
      }
    }, [id, wave]);
  const openArmies = async () => { await page.evaluate(() => window.__game.home.openArmies()); await page.waitForTimeout(300); };
  // 1. the Armies screen with all nine open (the Golem Forge just opened and glowing), top and scrolled to the new cards
  await load(() => {
    const m = window.__game.meta;
    const ids = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'];
    m.armies = Object.fromEntries(ids.slice(0, 8).map((id, i) => [id, { best: 8, won: 8, clears: 1 + (i % 3), stars: { 1: 3, 2: 3, 3: 3, 4: 2 } }]));
    m.armySeen = ids.slice(1, 8);
  });
  await openArmies();
  await shot('armies-top');
  await page.evaluate(() => document.getElementById('hmSubBody').scrollTo(0, 99999));
  await page.waitForTimeout(200);
  await shot('armies-bottom');
  // 2. a wave of each (wave 4), deploying then fighting
  for (const [id, tag2] of [['yokai', 'yokai'], ['golems', 'golem']]) {
    await load();
    await startArmy(id, 4);
    await page.waitForTimeout(600);
    await shot(`${tag2}-wave-deploy`);
    await page.evaluate(() => window.__game.begin());
    await page.waitForTimeout(4500);
    await shot(`${tag2}-wave-fight`);
  }
  // 3. the four bosses: intro card, then the fight a while in
  for (const [id, wave, name] of [['yokai', 5, 'ninetails'], ['yokai', 10, 'oni'], ['golems', 5, 'colossus'], ['golems', 10, 'titan']]) {
    await load();
    await startArmy(id, wave);
    await page.waitForTimeout(900);
    await shot(`${name}-intro`);
    await page.waitForTimeout(1900);
    await page.evaluate(() => window.__game.endIntro());
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__game.begin());
    await page.waitForTimeout(7000);
    await shot(`${name}-fight`);
  }
  await ctx.close();
}
await browser.close();
srv.close();
