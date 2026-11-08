// BENCH-MARKS' browser check (docs/notes/bench-marks.md): the bench cards' rank stars after a wave is won (a level-up), and the camp's
// Heroes tab wearing one mark at most. At the three upright phone sizes.
//   npm run web && node tools/bench-marks/shots.mjs      writes docs/samples/bench-marks/*.png; fails on a page error or a check
import { serve, launch } from '../battle-ui/lib.mjs';
const PORT = 8771;
const server = serve('out/web', PORT);
const browser = await launch();
const PARTY = ['knight', 'paladin', 'archer', 'wizard', 'cleric'];
const OUT = 'docs/samples/bench-marks';
const fails = [];
const check = (name, ok, info = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, info); if (!ok) fails.push(name); };
const HIDE = '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip, #bossCard { display: none !important; }';

async function boot(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000);
  page.on('pageerror', (e) => { fails.push(`page error ${e.message}`); console.log('PAGE ERROR', e.message); });
  await page.goto(`http://localhost:${PORT}/`);
  await page.evaluate((party) => {
    localStorage.clear();
    // (a quest waits and Hester has new stock, so the Heroes tab has more than one thing to say)
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: party, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: Object.fromEntries(party.map((k) => [k, 400])), stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, PARTY);
  await page.reload();
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: HIDE });
  return { ctx, page };
}

for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const { ctx, page } = await boot(w, h);
  // the camp's Heroes tab: what it could say, and the marks it shows
  await page.evaluate(() => window.__game.home.open());
  await page.waitForTimeout(800);
  const tab = await page.evaluate(() => {
    const t = [...document.querySelectorAll('.hmTab')].find((b) => b.querySelector('.qbadge'));
    const shown = [...t.querySelectorAll('i')].filter((i) => getComputedStyle(i).display !== 'none' && i.offsetWidth > 0).map((i) => i.className);
    return { cls: t.className, shown, label: t.getAttribute('aria-label') };
  });
  check(`${w}: the Heroes tab wears one mark at most`, tab.shown.length <= 1, JSON.stringify(tab));
  await page.screenshot({ path: `${OUT}/heroes-tab-${w}.png` });
  await page.screenshot({ path: `${OUT}/heroes-tab-${w}-zoom.png`, clip: { x: 0, y: h - 90, width: w, height: 90 } });

  // a wave won: the bench in the after-wave phase the owner saw (the stars' size does not hang on a level-up row showing)
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'orcs' }, stage: 1, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: i < 3 ? 2 : 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, PARTY);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForFunction(() => window.__game.b.phase !== 'fight', null, { timeout: 170000, polling: 500 }).catch(() => {});
  await page.evaluate(() => { const g = window.__game; for (let i = 0; i < 4000 && g.b.phase === 'fight'; i++) g.frame(100, 100); });
  await page.waitForTimeout(2500);
  const bench = await page.evaluate(() => ({
    phase: document.body.dataset.phase,
    up: document.getElementById('xp')?.textContent?.includes('Level') ?? false,
    cards: [...document.querySelectorAll('#bench .card')].map((c) => {
      const r = c.getBoundingClientRect();
      const stars = [...c.querySelectorAll('.benchGrade img')].map((i) => i.getBoundingClientRect());
      return { h: r.bottom, stars: stars.map((s) => [Math.round(s.width), Math.round(s.bottom - r.bottom)]) };
    }),
  }));
  console.log(w, bench.phase, JSON.stringify(bench.cards));
  check(`${w}: the wave is over (${bench.phase})`, bench.phase !== 'fight');
  check(`${w}: the rank stars are small and inside their cards`, bench.cards.every((c) => c.stars.every(([sw, below]) => sw <= 12 && below <= 0)));
  await page.screenshot({ path: `${OUT}/bench-levelup-${w}.png` });
  const benchBox = await page.evaluate(() => { const r = document.getElementById('bench').getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top - 10), width: innerWidth, height: Math.min(innerHeight - Math.max(0, r.top - 10), r.height + 20) }; });
  await page.screenshot({ path: `${OUT}/bench-levelup-${w}-zoom.png`, clip: benchBox });
  await ctx.close();
}
await browser.close();
server.close();
if (fails.length) { console.log('FAILED:', fails.join('; ')); process.exit(1); }
console.log('all checks passed');
