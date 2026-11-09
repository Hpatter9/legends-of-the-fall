// Screenshots for TAVERN-25: node tools/tavern-25/shots.mjs [ring] [elders]  (build with `npm run web` first; SIZES=393,360,412 by default)
// Writes docs/samples/tavern-25/: the duel's fight in its ring of standing stones (ring-<w>.png), and the Elders' table's card with the
// table at its head (elders-<w>.png); and counts page errors.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = 'docs/samples/tavern-25';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/nemesis/saves4.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/nemsaves4.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/nemsaves4.mjs');
await esbuild.build({ entryPoints: ['tools/dynasty/saves6.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/dynsaves6.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const D = await import('../../out/shots/dynsaves6.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'];
const srv = serve();
const browser = await launch();
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : SIZES;
const only = process.argv.slice(2);
const want = (name) => !only.length || only.includes(name);
let errors = 0;

async function open(w, h, meta, run, motion = 'no-preference') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: motion });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.goto('http://localhost:8139/?x=' + Math.random());
  await page.evaluate(([m, r, tips]) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('legends.tips', JSON.stringify(tips));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
    if (r) localStorage.setItem('legends.run', JSON.stringify(r));
  }, [meta, run ?? null, TIPS]);
  await page.goto('http://localhost:8139/');
  await page.waitForTimeout(2500);
  return { ctx, page };
}
const shoot = async (page, path) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path });
};

for (const [w, h] of sizes) {
  if (want('ring')) {
    const { ctx, page } = await open(w, h, S.meta(), S.run(5));
    await page.click('.hmCont');
    await page.waitForFunction(() => document.querySelector('.tcLayer:not([hidden]) .tcCut'), null, { timeout: 15000 });
    await page.evaluate(() => window.__game.autoArrange(true));
    await page.evaluate(() => window.__game.taunts.end());
    await page.waitForTimeout(150);
    await page.evaluate(() => window.__game.taunts.end());
    await page.waitForSelector('#duelCard', { timeout: 5000 });
    await page.waitForTimeout(300);
    await page.click('#duelCard .omPrimary');
    // (staged: the nemesis given more health, so the duel lasts until the picture is taken)
    await page.evaluate(() => {
      const b = window.__game.b;
      const n = b.units.find((u) => u.id === b.duel.nem);
      n.maxHp *= 8;
      n.hp = n.maxHp;
    });
    await page.waitForTimeout(2200);
    await shoot(page, `${OUT}/ring-${w}.png`);
    await ctx.close();
  }
  if (want('elders')) {
    // (the Elders' table's card, opened from its button under Tavern services, with the table at its head)
    const { ctx, page } = await open(w, h, D.meta());
    await page.evaluate(() => window.__game.home.show('heroes'));
    await page.waitForTimeout(1500);
    await page.click('#ptTab1');
    await page.waitForTimeout(300);
    await page.click('.ptActions .ptButton:has-text("Elders")');
    await page.waitForSelector('#eldersTable .hsEldersArt', { state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('#eldersTable .hsEldersArt')?.complete);
    await shoot(page, `${OUT}/elders-${w}.png`);
    await ctx.close();
  }
}
console.log('page errors:', errors);
await browser.close();
srv.close();
