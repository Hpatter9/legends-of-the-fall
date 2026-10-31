// GUEST-HERO's browser check (`docs/notes/guest-hero.md`) at the three upright phone sizes: the passing cart with a guest on offer, the
// guest bought and standing beside the five (the bench's GUEST badge, "5 of 5 placed + guest"), its info card, and its farewell on a lost
// run's last card; then TALENT-ARROWS: the tavern's chevron over a hero with talent points, the Upgrades list's talent row, and its Spend
// opening the hero's tree. Writes docs/samples/guest-*.png and docs/samples/talent-arrow-*.png.
//   npm run web && node tools/guest-hero/shots.mjs [port]
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import * as esbuild from 'esbuild';
import { rmSync } from 'node:fs';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const port = Number(process.argv[2] ?? 9003);
const out = `out/guest-shots-${process.pid}`;
await esbuild.build({ entryPoints: ['tools/guest-hero/card.ts'], outfile: `${out}/card.cjs`, bundle: true, platform: 'node', format: 'cjs', logLevel: 'warning', loader: { '.png': 'empty' } });
const RUN = execFileSync(process.execPath, [`${out}/card.cjs`], { encoding: 'utf8' });
rmSync(out, { recursive: true, force: true });
const server = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'peasant', 'cleric', 'buccaneer'];
const errors = [];
let bad = 0;

async function boot(w, h, extra) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(240000);
  page.setDefaultNavigationTimeout(240000);
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`);
  await page.evaluate(([heroes, extra]) => {
    localStorage.clear();
    const rec = { waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 } };
    const m = {
      seed: 7, crowns: 4000, stones: 0, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0,
      castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 },
      shards: {}, ranked: {}, stars: {}, xp: {}, bestStage: 14, tower: 0, daily: {}, bosses: [], achievements: [], armies: { orcs: rec, undead: rec }, armySeen: ['orcs', 'undead'], stash: [],
      scenes: ['opening', 'awaken'], heroesSeen: heroes, duchessTaps: 2, ...extra,
    };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
  }, [HEROES, extra]);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => window.__game?.home && document.getElementById('hmBattle'), {}, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await skipAll(page);
  return { ctx, page };
}
async function skipAll(page) {
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  for (let i = 0; i < 10; i++) {
    const on = await page.evaluate(() => { const b = [...document.querySelectorAll('.csSkip')].find((x) => x.offsetParent); b?.click(); return !!b; });
    if (!on) break;
    await page.waitForTimeout(800);
  }
  for (let i = 0; i < 12 && (await page.$('.earnedArrival')); i++) {
    await page.evaluate(() => document.querySelector('.earnedArrival')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForTimeout(600);
  }
}
const shot = (page, name) => page.screenshot({ path: `docs/samples/${name}.png` });

const SIZES = process.argv[3] ? [process.argv[3].split('x').map(Number)] : [[393, 852], [360, 780], [412, 915]];
for (const [w, h] of SIZES) {
  const size = `${w}x${h}`;
  // ---- the guest hero
  let { ctx, page } = await boot(w, h, { xp: { knight: 30000, samurai: 30000, kunoichi: 30000, archer: 30000, wizard: 30000 } });
  await page.evaluate((run) => {
    localStorage.setItem('legends.run', run);
    const g = window.__game;
    g.home.go(() => g.resume());
  }, RUN);
  await page.waitForTimeout(2500);
  await skipAll(page);
  await page.waitForSelector('#events .opt.guest', { timeout: 60000 });
  await page.waitForTimeout(400);
  await shot(page, `guest-cart-${size}`);
  await page.evaluate(() => document.querySelector('#events .opt.guest').click());
  await page.waitForTimeout(400);
  await shot(page, `guest-bought-${size}`);
  const line = await page.evaluate(() => document.querySelector('#events .note')?.textContent ?? '');
  await page.evaluate(() => [...document.querySelectorAll('#events .opt')].find((b) => b.classList.contains('leave'))?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#events .primary')?.click());
  await page.waitForTimeout(1500);
  await skipAll(page);
  const field = await page.evaluate(() => {
    const g = window.__game;
    g.refresh();
    return { heroes: g.b.units.filter((u) => u.side === 'hero').length, status: document.getElementById('status').textContent, badge: !!document.querySelector('#bench .card.guest .guestMark'), recycle: !!document.querySelector('#bench .card.guest .recycle') };
  });
  await page.waitForTimeout(500);
  await shot(page, `guest-field-${size}`);
  await page.evaluate(() => {
    const g = window.__game;
    g.openBenchInfo(g.run.roster.find((x) => x.guest).id);
  });
  await page.waitForTimeout(600);
  const tag = await page.evaluate(() => document.querySelector('.uiTags .guestTag')?.textContent ?? '');
  await shot(page, `guest-info-${size}`);
  await page.evaluate(() => document.querySelector('.uiSheet .fsClose')?.click());
  // (a lost wave with no heart left: the run ends, and the guest's farewell is on the last card)
  await page.evaluate(() => {
    const g = window.__game;
    g.run.retries = 2;
    g.setSpeed(3);
    g.begin();
    // (the heroes all fall as the fight begins, so it is lost)
    const keep = setInterval(() => {
      for (const u of window.__game.b.units) if (u.side === 'hero' && u.alive) Object.assign(u, { hp: 0, alive: false });
      if (window.__game.b.phase !== 'fight') clearInterval(keep);
    }, 30);
  });
  await page.waitForFunction(() => window.__game.b.phase === 'lost', null, { timeout: 120000 }).catch(() => {});
  // (the bench after the loss shows the GUEST badge; then the last card, with the farewell among its lines)
  await page.waitForTimeout(1500);
  await shot(page, `guest-bench-${size}`);
  // (the first defeat's cinematic is skipped as it comes)
  for (let i = 0; i < 40; i++) {
    const seen = await page.evaluate(() => {
      [...document.querySelectorAll('.csSkip')].find((x) => x.offsetParent)?.click();
      return [...document.querySelectorAll('#result, #waveNotes, .jrCard, #jrBody')].some((e) => e.offsetParent && e.textContent.includes('the guest'));
    });
    if (seen) break;
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(800);
  const bye = await page.evaluate(() => (window.__game.run.found ?? []).some((l) => l.includes('the guest')) && document.body.innerText.includes('the guest'));
  await shot(page, `guest-farewell-${size}`);
  console.log(size, JSON.stringify({ line, field, tag, bye }));
  if (!(line.includes('guest') && field.heroes === 6 && field.status.includes('5 of 5 placed + guest') && field.badge && !field.recycle && tag.includes('Guest') && bye)) bad++;
  await ctx.close();

  // ---- talent arrows: the knight has talent points only; the samurai a rank waiting
  ({ ctx, page } = await boot(w, h, { xp: { knight: 30000 }, shards: { samurai: 1 } }));
  await page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Heroes')).click());
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    const t = window.__game.home.tavern;
    const a = t.actors.get('knight');
    if (a) t.camX = t.clampX(a.x - t.viewW / t.scale / 2);
  });
  await page.waitForTimeout(900);
  const marked = await page.evaluate(() => [...window.__game.home.tavern.rise]);
  await shot(page, `talent-arrow-tavern-${size}`);
  await page.evaluate(() => document.querySelector('.tvUpgrades').click());
  await page.waitForTimeout(800);
  const row = await page.evaluate(() => document.querySelector('.ulTalent .ulWhat')?.textContent ?? '');
  await shot(page, `talent-arrow-list-${size}`);
  await page.evaluate(() => document.querySelector('.ulTalent .ulGo').click());
  await page.waitForTimeout(1200);
  const tree = await page.evaluate(() => !!document.querySelector('.tPanel .tTree, .tPanel svg, .tPanel .tNode, .tPanel button.tTile') || document.querySelector('.tPanel')?.textContent.slice(0, 60));
  await shot(page, `talent-arrow-tree-${size}`);
  const hop = await page.evaluate(() => document.querySelector('.heroNextUp')?.textContent ?? '');
  console.log(size, JSON.stringify({ marked, row, tree, hop }));
  if (!(marked.includes('knight') && marked.includes('samurai') && /Talent points: \d+ to spend/.test(row))) bad++;
  await ctx.close();
}
await browser.close();
server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
process.exit(bad ? 1 : 0);
