// PAUSE-TIPS screenshots and checks (docs/notes/pause-tips.md). After `npm run web`:
//   ROOT=out/web node tools/pause-tips/shots.mjs
// At 393x852, 360x780 and 412x915 (`SIZES=393` for one): the pause medallion mid-fight; the paused card (and the battle's clock checked
// still under it, and still after the page is hidden and shown, and the loop watch never loading it again); an unlock tutorial at a wave's
// screen (Auto merge, its button lit), two queued as a fight begins, and Settings › Tutorials. The 393 shots are kept, as JPEG, in
// docs/samples/pause-tips/<scene>-393.jpg; the other widths' go to SCRATCH (default /tmp/pause-tips) to be looked at.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 9041);
const root = process.env.ROOT ?? 'out/web';
const SIZES = (process.env.SIZES ?? '393,360,412').split(',').map((w) => ({ 393: [393, 852], 360: [360, 780], 412: [412, 915] })[w]);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const OUT = 'docs/samples/pause-tips';
const SCRATCH = process.env.SCRATCH ?? '/tmp/pause-tips';
mkdirSync(OUT, { recursive: true });
mkdirSync(SCRATCH, { recursive: true });
const IDS = [...readFileSync('src/tutorialRules.ts', 'utf8').matchAll(/^    id: '(\w+)',$/gm)].map((m) => m[1]);
const PARTY = ['knight', 'cleric', 'wizard', 'archer', 'samurai'];
const cleared = { best: 15, won: 15, clears: 1, stars: {} };
let errors = 0;
const fails = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };

/** A save with the first two armies beaten and every tutorial seen but `unseen`; a run on its deploy, heroes set out. */
async function open(w, h, unseen, pair = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, seen, armies]) => {
    if (sessionStorage.getItem('pt-set')) return;
    sessionStorage.setItem('pt-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned, pulls: 3, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, 4000])), bestStage: 14, tower: 0, daily: {}, bosses: [], achievements: [], armies, armySeen: [], stash: [], opened: ['undead', 'beasts', 'castle'], tutorials: seen, featuresTold: ['autoMerge'] }));
    localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'retry', 'runes', 'recycle', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'autoReplay']));
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [PARTY, IDS.filter((id) => !unseen.includes(id)), { orcs: cleared, undead: cleared }]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: '.duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  await page.evaluate(([party, pair]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: 3, over: false, cleared: false, gold: 1240, event: undefined, roster: [...party, ...(pair ? ['knight'] : [])].map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    if (!document.getElementById('tutorialCard')) g.autoArrange(true);
  }, [PARTY, pair]);
  await page.waitForTimeout(1200);
  return { ctx, page };
}
const shot = (page, name, w) => (w === 393 ? page.screenshot({ path: `${OUT}/${name}-${w}.jpg`, type: 'jpeg', quality: 72 }) : page.screenshot({ path: `${SCRATCH}/${name}-${w}.png` }));
const clockOf = (page) => page.evaluate(() => window.__game.b.t);

for (const [w, h] of SIZES) {
  // 1. the pause medallion, then the paused card
  {
    const { ctx, page } = await open(w, h, []);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(3500);
    await shot(page, 'fight-pause-button', w);
    const box = await page.locator('#pause').boundingBox();
    check(!!box && box.width >= 40, `${w}: the pause medallion is on the top bar (${box && Math.round(box.x)},${box && Math.round(box.y)})`);
    await page.locator('#pause').tap();
    await page.waitForTimeout(700);
    await shot(page, 'paused-card', w);
    const t0 = await clockOf(page);
    await page.waitForTimeout(2000);
    check((await clockOf(page)) === t0, `${w}: the battle's clock stands still under the paused card (t ${t0})`);
    // (a tap on the veil does nothing)
    await page.mouse.click(10, h - 10);
    await page.waitForTimeout(300);
    check(await page.evaluate(() => !!document.getElementById('fightPause')), `${w}: a tap outside the card does not resume`);
    // (Settings, and back: the card comes again)
    await page.locator('#fightPause .omChoice').click();
    await page.waitForTimeout(400);
    check(await page.evaluate(() => !document.getElementById('settings').hidden), `${w}: Settings opens from the paused card`);
    await page.evaluate(() => document.getElementById('settingsClose').click());
    await page.waitForTimeout(400);
    check(await page.evaluate(() => !!document.getElementById('fightPause')), `${w}: the paused card is back after Settings`);
    check((await clockOf(page)) === t0, `${w}: still paused after Settings`);
    // (the watch over five seconds: no reload, no restart)
    await page.waitForTimeout(5000);
    check((await clockOf(page)) === t0 && (await page.evaluate(() => window.__game.loop.restarts)) === 0, `${w}: the loop watch leaves a paused fight alone`);
    await page.locator('#fightPause .omPrimary').click();
    await page.waitForTimeout(1500);
    check((await clockOf(page)) > t0, `${w}: Resume lets the fight run on`);
    // (the page hidden mid-fight: paused, and still paused when shown again)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(800);
    const t1 = await clockOf(page);
    await page.waitForTimeout(1500);
    check((await clockOf(page)) === t1 && (await page.evaluate(() => !!document.getElementById('fightPause'))), `${w}: a hidden page pauses the fight, and it stays paused on return`);
    await ctx.close();
  }
  // 2. Auto merge on the deploy screen, its button lit; the fight begins with no card
  {
    const { ctx, page } = await open(w, h, ['autoMerge'], true);
    await page.waitForFunction(() => !!document.getElementById('tutorialCard'), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
    await shot(page, 'deploy-auto-merge', w);
    check(await page.evaluate(() => window.__game.b.phase === 'deploy' && !!document.getElementById('tutorialCard')), `${w}: Auto merge's card is up on the deploy screen`);
    check(await page.evaluate(() => document.getElementById('mergeAll').classList.contains('tipLit')), `${w}: the Auto merge button is lit under it`);
    await page.locator('#tutorialCard .omPrimary').click();
    await page.waitForTimeout(400);
    check(await page.evaluate(() => !document.getElementById('mergeAll').classList.contains('tipLit')), `${w}: the light goes with the card`);
    await page.evaluate(() => window.__game.autoArrange(true));
    await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(1500);
    check(await page.evaluate(() => !document.getElementById('tutorialCard') && window.__game.b.t > 0), `${w}: the fight begins with no card of its own`);
    check(await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')).tutorials.includes('autoMerge')), `${w}: Auto merge saved as seen`);
    await ctx.close();
  }
  // 3. two queued as a fight begins: the pause and a second skill
  for (const [name, unseen] of [['tutorial-two-queued', ['pause', 'secondSkill']]]) {
    const { ctx, page } = await open(w, h, unseen);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(1200);
    await shot(page, name, w);
    const t0 = await clockOf(page);
    check(t0 === 0 && (await page.evaluate(() => !!document.getElementById('tutorialCard'))), `${w}: ${name}: the card is up and the fight has not begun`);
    for (let i = 0; i < unseen.length; i++) {
      await page.waitForTimeout(700);
      if (name === 'tutorial-two-queued' && i === 1) await shot(page, 'tutorial-two-queued-second', w);
      await page.locator('#tutorialCard .omPrimary').click();
    }
    await page.waitForTimeout(1500);
    check((await clockOf(page)) > 0, `${w}: ${name}: the fight starts once the last card is closed`);
    const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')).tutorials);
    check(unseen.every((id) => seen.includes(id)), `${w}: ${name}: saved as seen`);
    // 4. the Tutorials page (once, from this page)
    if (name === 'tutorial-two-queued') {
      await page.evaluate(() => document.getElementById('gear').click());
      await page.waitForTimeout(400);
      await page.locator('#settingsBody button', { hasText: 'Tutorials' }).first().click();
      await page.waitForTimeout(600);
      await shot(page, 'tutorials-page', w);
      await page.locator('#tutorials .omBody').evaluate((e) => (e.scrollTop = e.scrollHeight));
      await page.waitForTimeout(300);
      await shot(page, 'tutorials-page-end', w);
    }
    await ctx.close();
  }
}
console.log(`${errors} page errors; ${fails.length} checks failed`);
await browser.close();
srv.close();
process.exit(fails.length || errors ? 1 : 0);
