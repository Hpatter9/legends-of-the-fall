// The cinematic fixes (docs/notes/scenes-fixes.md) in the real page, upright at 393x852:
//   node tools/cinematics/fixes.mjs [web dir] [shots dir]
// 1. a new save's opening: the "That is you" shot shows the king, and the goat comes on in a shot of her own.
// 2. an army fight lost with hearts left plays no loss scene (a heart burns, the fight resumes); lost with none left, the first-loss scene comes.
// 3. a boss's card and its form cut-in play once: a new run at the same boss brings neither; a herald's scene queued twice plays once.
// 4. the rewritten Last Stand and Calamity scenes render (frames of each).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web', out = 'docs/samples'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8147);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
const up = () => page.evaluate(() => { const e = document.getElementById('cutscene'); return !!e && !e.hidden; });
const meta = () => page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta') ?? '{}'));
const subs = () => page.evaluate(() => document.getElementById('cutscene')?.innerText.replace(/\s+/g, ' ').trim());
const url = 'http://localhost:8147/';
const ok = (what, pass) => console.log(pass ? 'PASS' : 'FAIL', what);

// 1. a fresh save's opening
await page.goto(url);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('lotf-tips-off', '1'); });
await page.goto(url);
await page.waitForFunction(() => { const e = document.getElementById('cutscene'); return e && !e.hidden; }, null, { timeout: 30000 });
// (the game object is not up yet while the opening plays, before the starter pick: the scene is stepped by taps, a line at a time)
let shotKing = false;
let shotGoat = false;
let last = '';
for (let i = 0; i < 40 && (await up()); i++) {
  const text = await subs();
  if (text !== last) console.log('opening:', text);
  last = text;
  if (/That is you/.test(text) && !shotKing) (shotKing = true), await page.waitForTimeout(1500), await page.screenshot({ path: `${out}/scenes-fixes-opening-king.png` });
  if (/court goat/.test(text) && !shotGoat) (shotGoat = true), await page.waitForTimeout(1500), await page.screenshot({ path: `${out}/scenes-fixes-opening-goat.png` });
  await page.mouse.click(196, 500);
  await page.waitForTimeout(700);
}
ok('the opening was stepped through, with its king shot and its goat shot', shotKing && shotGoat);
if (await up()) await page.click('.csSkip');
await page.waitForSelector('#starter .stPack', { timeout: 30000 });
await page.click('#starter .stPack');
await page.click('#starter .stGo');
await page.waitForTimeout(2000);

// 2. a fight lost with hearts left, then with none
const startArmy = (stage, retries = 0) => page.evaluate(([stage, retries]) => {
  const g = window.__game;
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage, over: false, cleared: false, gold: 500, event: undefined, retries });
  document.getElementById('home').hidden = true;
  g.startRun(r);
  for (let i = 0; i < 4; i++) document.getElementById('summon').click();
  for (const h of g.run.roster.slice(0, 5)) {
    if (g.b.units.some((u) => u.tag === h.id)) continue;
    const t = g.freeTile();
    if (t) g.put(String(h.id), t);
  }
}, [stage, retries]);
// (the heroes all fall; the page is slow headless, so it waits for the loss to be handled: a heart burning, the run settled or a scene)
const wipe = async () => {
  await page.waitForFunction(() => window.__game.b.phase === 'fight', null, { timeout: 30000 }).catch(() => undefined);
  await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'hero') Object.assign(u, { hp: 0, alive: false, diedAt: g.b.t }); });
  await page.waitForFunction(() => { const g = window.__game; return !!g.revive || g.settled || !document.getElementById('cutscene').hidden; }, null, { timeout: 60000 }).catch(() => console.log('loss not handled in time'));
  await page.waitForFunction(() => !window.__game.revive, null, { timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  console.log('debug', await page.evaluate(() => { const g = window.__game; return JSON.stringify({ phase: g.b.phase, revive: !!g.revive, settled: g.settled, retries: g.run.retries ?? 0, scene: !document.getElementById('cutscene').hidden }); }));
};
await startArmy(1);
await page.waitForTimeout(800);
await page.evaluate(() => { window.__game.endIntro(); window.__game.begin(); });
await page.waitForTimeout(800);
const hearts = await page.evaluate(() => window.__game.run.retries ?? 0);
await wipe();
console.log('debug', await page.evaluate(() => { const g = window.__game; return JSON.stringify({ endWait: g.endWait, revive: !!g.revive, settled: g.settled, hold: g.sceneHold, auto: !!g.auto, retries: g.run.retries, tower: !!g.run.tower, over: g.run.over, mode: g.run.mode, paused: g.paused, speed: g.speed }); }));
const after1 = await page.evaluate(() => ({ retries: window.__game.run.retries ?? 0, phase: window.__game.b.phase }));
ok(`a fall with a heart left: no loss scene (scene up ${await up()}, firstLoss seen ${!!(await meta()).scenes?.includes('firstLoss')}), a heart burned (${hearts} -> ${after1.retries}), fight ${after1.phase}`, !(await up()) && !(await meta()).scenes?.includes('firstLoss') && after1.retries === hearts + 1);
await page.screenshot({ path: `${out}/scenes-fixes-heart-no-scene.png` });
// (a fight with no heart left, then a fall: this one is the real defeat)
const startArmy0 = startArmy;
await startArmy0(1, 99);
await page.waitForTimeout(800);
await page.evaluate(() => { window.__game.endIntro(); window.__game.begin(); });
await wipe();
await page.waitForTimeout(1000);
const m2 = await meta();
ok(`with no heart left the first-loss scene plays (up ${await up()}, seen ${!!m2.scenes?.includes('firstLoss')}, over ${await page.evaluate(() => window.__game.run.over)})`, m2.scenes?.includes('firstLoss'));
if (await up()) {
  const f = await page.evaluate(() => window.__game.sceneFrames('firstLoss'));
  await page.evaluate(([s, b, t]) => window.__game.scenes.seek(s, b, t), f[f.length - 3]);
  await page.waitForTimeout(400);
  console.log('firstLoss', await subs());
  await page.screenshot({ path: `${out}/scenes-fixes-final-loss.png` });
  await page.click('.csSkip');
}
await page.waitForTimeout(800);

// 3. a boss: its card and its form cut-in once a save
const bossFight = async () => {
  await startArmy(15);
  await page.waitForTimeout(1500);
  const card = await page.evaluate(() => !document.getElementById('bossCard').hidden);
  await page.evaluate(() => { window.__game.endIntro(); window.__game.begin(); });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { const b = window.__game.b.units.find((u) => u.side === 'foe' && u.def === 'orcWarlord'); if (b) b.hp = Math.floor(b.maxHp * 0.4); });
  await page.waitForTimeout(2500);
  const cut = await up();
  if (cut) console.log('cut-in:', await subs());
  if (cut) await page.click('.csSkip');
  await page.waitForTimeout(500);
  return { card, cut };
};
const first = await bossFight();
const again = await bossFight();
ok(`the boss's card and form cut-in the first time (${JSON.stringify(first)}), neither on a new run at the same boss (${JSON.stringify(again)})`, first.card && first.cut && !again.card && !again.cut);
await page.evaluate(() => { const g = window.__game; g.meta.opened = [...(g.meta.opened ?? []), 'calamity']; document.getElementById('home').hidden = true; });
const herald = async () => {
  await page.evaluate(() => void window.__game.queueScene({ kind: 'calBoss', map: 1 }));
  await page.waitForTimeout(2000);
  const shown = await up();
  const text = shown ? await subs() : '';
  while (await up()) {
    await page.click('.csSkip').catch(() => undefined);
    await page.waitForTimeout(800);
  }
  return shown && /Gorvak|soot|HALT|herald/i.test(text + ((await meta()).scenes ?? []).join());
};
const h1 = await herald();
const h2 = await herald();
ok(`Gorvak's scene plays the first time (${h1}) and not again (${h2})`, h1 && !h2);

// 4. the rewritten scenes
for (const id of ['calamityOpens', 'spire:10', 'spire:25', 'spire:50', 'calamityEnds']) {
  const fr = await page.evaluate((id) => window.__game.sceneFrames(id), id);
  await page.evaluate((id) => void window.__game.playScene(id), id);
  await page.waitForTimeout(1500);
  for (const [i, f] of fr.entries()) {
    await page.evaluate(([s, b, t]) => window.__game.scenes.seek(s, b, t), f);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/raw-${id.replace(/\W/g, '_')}-${i + 1}.png` });
    console.log(id, i + 1, await subs());
  }
  await page.click('.csSkip');
  await page.waitForTimeout(400);
}
console.log('page errors:', errors);
await browser.close();
srv.close();
