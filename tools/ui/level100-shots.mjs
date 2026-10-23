// Screenshots for docs/samples/level-100-*.png at 393x852 and 360x780: the hero sheet at level 47 and 100, the talent tree with the deep rows,
// a level-up recap past level 30, a badge on a bench card and on the roster, and a milestone aura in battle. Run after `npm run web`:
//   npx esbuild src/sim/levels.ts --bundle --format=esm --outfile=out/levels-shots.mjs --loader:.png=empty
//   node tools/ui/level100-shots.mjs
import { serve, launch, HEROES, saveScript } from '../audit/lib.mjs';
import { xpFor } from '../../out/levels-shots.mjs';

const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
// the first ten heroes at levels that show every badge frame (the bench and the party take the first five)
const LEVELS = [100, 90, 80, 70, 60, 50, 40, 47, 30, 12];
const xp = Object.fromEntries(HEROES.slice(0, 10).map((k, i) => [k, xpFor(LEVELS[i])]));
const save = (extra = {}) => ({ xp, shards: { knight: 9, samurai: 9 }, ...extra });
const ev = (page, fn, ...a) => page.evaluate(fn, ...a);

async function open(w, h, extra, seeded = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(saveScript(), [HEROES.slice(0, 22), save(extra)]);
  await page.goto(seeded ? `${base}?seed=7` : base);
  await page.waitForTimeout(2300);
  await ev(page, () => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  return { ctx, page };
}
const out = (name, w) => `docs/samples/level-100-${name}-${w}.png`;
const heroesTab = async (page) => { await page.locator('.hmTab').nth(1).click(); await page.waitForTimeout(800); };

for (const [w, h] of [[393, 852], [360, 780]]) {
  // the hero sheet at 47 (the knight is 47 in a save of its own) and at 100 (the first hero)
  for (const [name, kind, lv] of [['sheet-47', 'knight', 47], ['sheet-100', 'knight', 100]]) {
    const { ctx, page } = await open(w, h, { xp: { ...xp, knight: xpFor(lv) + Math.round((xpFor(lv + 1 > 100 ? 100 : lv + 1) - xpFor(lv)) * 0.4) } });
    await heroesTab(page);
    await ev(page, (k) => window.__game.home.openSheet(k), kind);
    await page.waitForTimeout(700);
    await page.screenshot({ path: out(name, w) });
    await ctx.close();
  }
  // the roster, with the badges
  {
    const { ctx, page } = await open(w, h);
    await heroesTab(page);
    await ev(page, () => window.__game.home.openRoster());
    await page.waitForTimeout(700);
    await page.screenshot({ path: out('roster', w) });
    await ctx.close();
  }
  // the talent tree at level 100: the deep rows, with some learned
  {
    const picks = ['knight:1a', 'knight:1b', 'knight:1c', 'knight:1d', 'knight:2a', 'knight:3b', 'knight:4b', 'knight:5a', 'knight:6b'];
    const { ctx, page } = await open(w, h, { xp: { ...xp, knight: xpFor(100) }, talents: { knight: { picks, bought: 3 } } });
    await heroesTab(page);
    await ev(page, () => window.__game.home.openSheet('knight'));
    await page.waitForTimeout(500);
    await page.locator('.tPanel button').filter({ hasText: 'Open talents' }).click();
    await page.waitForTimeout(300);
    await page.locator('.tTree .tNode').nth(14).click();
    await page.waitForTimeout(200);
    await ev(page, () => document.querySelector('.tTree').scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: out('talents-top', w) });
    await ev(page, () => document.querySelectorAll('.tRow')[3].scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(200);
    await page.screenshot({ path: out('talents-deep', w) });
    await page.locator('.tPanel').screenshot({ path: out('talents-tree', w) });
    await ctx.close();
  }
  // the fight: the bench with its badges, the deploy and the auras, then a win with a level-up past 30
  {
    const near = (lv) => xpFor(lv + 1) - 25;
    const { ctx, page } = await open(w, h, { xp: { ...xp, [HEROES[0]]: near(46), [HEROES[1]]: near(99) } }, true);
    await page.waitForTimeout(500);
    await ev(page, () => { const g = window.__game; for (const hh of g.run.roster.slice(0, 5)) { if (g.b.units.some((u) => u.tag === hh.id)) continue; const t = g.freeTile(); if (t) g.put(String(hh.id), t); } });
    await page.waitForTimeout(1200);
    await ev(page, () => { const g = window.__game; document.getElementById('fight').click(); g.setSpeed?.(1); });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: out('aura-battle', w) });
    // (the bench cards are on screen through the fight: a close shot of them)
    await page.locator('#benchWrap').screenshot({ path: out('bench', w) });
    await ev(page, () => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') { u.alive = false; u.hp = 0; } });
    await page.waitForTimeout(7000);
    await ev(page, () => document.getElementById('xp')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(2500);
    await page.screenshot({ path: out('levelup', w) });
    await ctx.close();
  }
}
await browser.close();
srv.close();
