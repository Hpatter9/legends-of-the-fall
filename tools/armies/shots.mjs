// Screenshots for the armies: the Armies screen (fresh, mid-progress, all open), a wave in progress, the Lich King's intro
// and fight, the unlock moment and a defeat back to the main screen, at both phone sizes:
//   node tools/armies/shots.mjs <web dir>
// Writes docs/samples/armies-<scene>-<upright|sideways>.png (needs Playwright, as the other shot scripts).
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
for (const [tag, w, h] of [['upright', 393, 852], ['sideways', 852, 393]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const shot = (name) => page.screenshot({ path: `docs/samples/armies-${name}-${tag}.png` });
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
  // an army's wave with a fuller squad: gold for summons, every hero placed on a free tile of the deploy rows
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
  // 1. fresh: only the Orc Warband is open
  await load();
  await shot('home');
  await openArmies();
  await shot('fresh');
  // 2. mid-progress: orcs cleared, undead reached wave 5, the beasts newly open and glowing
  await load(() => {
    const m = window.__game.meta;
    // (the Orc Warband and the Undead Legion beaten, the Beast Packs just opened and glowing, the Wildwood still shut)
    m.armies = { orcs: { best: 8, won: 8, clears: 1, stars: { 1: 3, 2: 3, 3: 2, 4: 3, 5: 3, 6: 2, 7: 3, 8: 3 } }, undead: { best: 8, won: 8, clears: 1, stars: { 1: 3, 2: 2, 3: 3, 4: 2, 5: 3, 6: 3, 7: 2, 8: 3 } }, beasts: { best: 0, won: 0, clears: 0, stars: {} } };
    m.armySeen = ['undead'];
    m.crowns = 420;
  });
  await openArmies();
  await shot('mid');
  await page.evaluate(() => document.getElementById('hmSubBody').scrollTo(0, 400));
  await page.waitForTimeout(200);
  await shot('mid-scrolled');
  // 3. all cleared
  await load(() => {
    const m = window.__game.meta;
    m.armies = Object.fromEntries(['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal'].map((id, i) => [id, { best: 8, won: 8, clears: 1 + (i % 3), stars: { 1: 3, 2: 3, 3: 3, 4: 2 } }]));
    m.armySeen = ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal'];
  });
  await openArmies();
  await shot('all');
  await page.evaluate(() => document.getElementById('hmSubBody').scrollTo(0, 99999));
  await page.waitForTimeout(200);
  await shot('all-scrolled');
  // 4. a wave in progress (Orc Warband wave 3), then the first foes engaged
  await load();
  await startArmy('orcs', 3);
  await page.waitForTimeout(500);
  await shot('wave-deploy');
  await page.evaluate(() => window.__game.begin());
  await page.waitForTimeout(3500);
  await shot('wave-fight');
  // 5. the Lich King (undead wave 8): his intro card, then the fight
  await load();
  await startArmy('undead', 8);
  await page.waitForTimeout(900);
  await shot('lich-intro');
  await page.waitForTimeout(1900);
  await page.evaluate(() => window.__game.endIntro());
  await page.waitForTimeout(300);
  await shot('lich-deploy');
  await page.evaluate(() => window.__game.begin());
  await page.waitForTimeout(6000);
  await shot('lich-fight');
  await page.waitForTimeout(6000);
  await shot('lich-fight-2');
  // 6. the unlock moment: the Orc Warband's last boss falls
  await load();
  await startArmy('orcs', 8);
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__game.endIntro(); window.__game.begin(); for (const u of window.__game.b.units) if (u.side === 'foe') { u.hp = 1; } });
  await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 30000 });
  await page.waitForTimeout(1800);
  await shot('victory');
  await page.evaluate(() => document.getElementById('next').click());
  await page.waitForTimeout(1500);
  await shot('unlock');
  await page.evaluate(() => document.querySelector('.unlock button').click());
  await page.waitForTimeout(500);
  await shot('after-unlock');
  // 7. a defeat goes back to the main screen
  await load();
  await startArmy('orcs', 5);
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__game.endIntro(); window.__game.begin(); for (const u of window.__game.b.units) if (u.side === 'hero') { u.hp = 1; } });
  await page.waitForTimeout(500);
  await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'hero') { u.hp = 0; } });
  await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot('defeat');
  await page.evaluate(() => document.getElementById('next').click());
  await page.waitForTimeout(700);
  await shot('defeat-home');
  await ctx.close();
}
await browser.close();
srv.close();
