// RELICS-3: an Eidolon relic card (price, reliquary, two and three bonuses) at 393x852. Usage: node tools/relics/eidolon-shots.mjs [root] [port] (after npm run web).
// The relics, the run's tally and the purse are set on the run by hand (a presentation fixture, not a played run).
import { openBrowser } from '../world-001/browser.mjs';
const [root = 'out/web', port = '9043'] = process.argv.slice(2);
const { browser, url, close } = await openBrowser(root, Number(port));
const SIZES = [[393, 852]];
const RELICS = ['cinderCollar', 'ashTooth', 'emberBrand', 'banner'];
let bad = 0;
const skip = (page) => page.evaluate(() => { document.querySelector('.csSkip')?.click(); document.querySelector('#tipSkip')?.click(); });
try {
  for (const [w, h] of SIZES) {
    const tag = `${w}x${h}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${url}/?seed=11`);
    await page.waitForFunction(() => window.__game);
    for (let i = 0; i < 6; i++) {
      await skip(page);
      await page.waitForTimeout(400);
    }
    await page.addStyleTag({ content: '#quip{display:none!important}' });
    await page.locator('#summon').click().catch(() => {});
    await page.locator('#summon').click().catch(() => {});
    await page.evaluate((ids) => {
      const g = window.__game;
      g.scenesOn = () => false;
      g.run.relics = ids;
      g.run.relicMarks = { won: 6, rises: 2, fallen: 3 };
      g.run.gold = 240;
      g.run.relicNote = "The keep's relics have been catalogued anew: each now has its own story and rule. Tap one to read it.";
      g.newBattle();
      g.endIntro?.();
      g.autoArrange();
      g.refresh();
    }, RELICS);
    await page.waitForTimeout(500);
    await skip(page);
    const strip = await page.evaluate(() => ({ phase: document.body.dataset.phase, icons: document.querySelectorAll('#relics .relic').length, note: !!document.querySelector('#relics .relicNote'), overflow: document.documentElement.scrollWidth > innerWidth }));
    await page.screenshot({ path: `docs/samples/relics-3-strip-${tag}.png` });
    const cards = {};
    for (const [i, name] of [[0, 'collar'], [2, 'brand']]) {
      await page.evaluate((i) => document.querySelectorAll('#relics .relic')[i].click(), i);
      await page.waitForTimeout(700);
      cards[name] = await page.evaluate(() => {
        const c = document.querySelector('.rlWrap .rlCard');
        const r = c?.getBoundingClientRect();
        return c ? { op: getComputedStyle(c.parentElement).opacity, z: getComputedStyle(c.parentElement).zIndex, top: document.elementFromPoint(innerWidth / 2, r.top + r.height / 2)?.className, lore: !!c.querySelector('.rlLore'), price: c.querySelector('.rlPrice')?.textContent ?? null, grow: c.querySelector('.rlGrow')?.textContent ?? null, set: c.querySelector('.rlSet h3')?.textContent ?? null, fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight } : null;
      });
      if (w === 393 || name === 'banner') await page.screenshot({ path: `docs/samples/relics-3-card-${name}-${tag}.png` });
      await page.evaluate(() => document.querySelector('.rlWrap')?.click());
      await page.waitForTimeout(150);
    }
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(1200);
    const fightNote = await page.evaluate(() => ({ phase: document.body.dataset.phase, strip: getComputedStyle(document.getElementById('relics')).display !== 'none', note: window.__game.run.relicNote ?? null }));
    if (w === 393) {
      // (a relic firing: the Phoenix's mark over the first hero, as the fight shows it)
      await page.evaluate(() => { const g = window.__game; const h = g.b.units.find((u) => u.side === 'hero' && u.alive); g.fx.relicMark(h.id, 'phoenix'); g.fx.relicMark(h.id, 'saintMedal'); });
      await page.waitForTimeout(350);
      await page.screenshot({ path: `docs/samples/relics-3-mark-${tag}.png` });
    }
    console.log(tag, JSON.stringify({ strip, cards, fightNote, errors }));
    const ok = cards.collar && cards.collar.fits && cards.collar.set && cards.collar.price && cards.brand?.fits && !errors.length;
    if (!ok) bad++;
    await ctx.close();
  }
} finally {
  await close();
}
if (bad) { console.log('FAILED', bad); process.exit(1); }
console.log('ok');
