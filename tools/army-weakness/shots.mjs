// Screenshots of ARMY-WEAKNESS: node tools/army-weakness/shots.mjs  (run `npm run web` first; SIZES=393,360,412 by default)
// Writes docs/samples/army-weakness/<scene>-<w>.png: the War Room's card on the Golem Forge ("Weak to", "Resists"), the tutorial card the
// first time it shows, the deploy chips and arrows with a team built for the army and one built against it, the chip's card, and the fight
// with its "Weak!" and "Resisted" (a few frames, `fight-<w>-<n>.png`).
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = process.env.OUT ?? 'docs/samples/army-weakness';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/army-weakness/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/armyWeakSaves.mjs', logLevel: 'error', loader: { '.png': 'empty', '.webp': 'empty' } });
const S = await import('../../out/shots/armyWeakSaves.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'];
const srv = serve();
const browser = await launch();
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : SIZES;
const only = process.argv.slice(2);
const want = (name) => !only.length || only.includes(name);

async function open(w, h, meta, run) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
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
  await page.waitForFunction(() => window.__game?.home, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const shoot = async (page, path) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path });
};
const openArmies = async (page) => {
  await page.evaluate(() => { document.getElementById('tipSkip')?.click(); window.__game.home.open(); window.__game.home.openArmies('golems'); });
  await page.waitForTimeout(1200);
};
/** Place exactly these heroes (by kind) on the board, by the page's own placing. */
const placeKinds = (page, kinds) => page.evaluate((ks) => {
  const g = window.__game;
  g.run.squad = g.run.roster.filter((h) => ks.includes(h.kind)).map((h) => h.id);
  g.autoArrange(true);
}, kinds);

for (const [w, h] of sizes) {
  if (want('warroom')) {
    const { ctx, page } = await open(w, h, S.meta());
    await openArmies(page);
    await page.evaluate(() => document.querySelector('.asMatch')?.scrollIntoView({ block: 'center' }));
    await shoot(page, `${OUT}/warroom-${w}.png`);
    await ctx.close();
  }
  if (want('tutorial')) {
    const { ctx, page } = await open(w, h, S.meta(true));
    await openArmies(page);
    await page.waitForTimeout(800);
    await shoot(page, `${OUT}/tutorial-${w}.png`);
    await ctx.close();
  }
  if (want('deploy') || want('fight')) {
    const { ctx, page } = await open(w, h, S.meta(), S.run());
    await page.click('.hmCont');
    await page.waitForTimeout(2500);
    if (want('deploy')) {
      await placeKinds(page, ['wizard', 'rifleBot', 'knight', 'paladin', 'cleric']);
      await shoot(page, `${OUT}/deploy-matched-${w}.png`);
      await page.evaluate(() => document.querySelector('#traits .trait.armyMatch')?.click());
      await page.waitForTimeout(600);
      await shoot(page, `${OUT}/deploy-card-${w}.png`);
      await page.evaluate(() => document.querySelector('#armyMatchCard .omBack')?.click());
      await page.waitForTimeout(400);
      await placeKinds(page, ['samurai', 'archer', 'knight', 'paladin', 'cleric']);
      await shoot(page, `${OUT}/deploy-mismatched-${w}.png`);
    }
    if (want('fight')) {
      await placeKinds(page, ['wizard', 'rifleBot', 'samurai', 'paladin', 'cleric']);
      await page.evaluate(() => window.__game.begin());
      for (let n = 1; n <= 6; n++) {
        await page.waitForTimeout(n === 1 ? 4200 : 650);
        await page.screenshot({ path: `${OUT}/fight-${w}-${n}.png` });
      }
    }
    await ctx.close();
  }
}
await browser.close();
srv.close();
