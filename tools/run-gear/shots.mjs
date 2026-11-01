// Screenshots of real gear in runs (RUN-GEAR, docs/notes/run-gear.md) at the three phone sizes: the run's pack with found pieces (fresh
// from the field) and the result card's Found row. Run after `npm run web`; the pictures go to docs/samples/run-gear-*.png (with the
// size in the name for any size but 393x852).
//   node tools/run-gear/shots.mjs [port]
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { serve, launch, boot, SIZES } from '../shop/lib.mjs';
const port = Number(process.argv[2] ?? 8951);
const srv = serve('out/web', port);
// (the audit's Chromium, or the machine's own where that one is missing)
const own = '/opt/pw-browsers/chromium';
const browser = existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') || !existsSync(own)
  ? await launch()
  : await createRequire('/opt/node-tools/node_modules/')('playwright').chromium.launch({ executablePath: own, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const extra = {
  equipment: [{ id: 1, base: 'runedBlade', rarity: 2, level: 4, wear: 40 }, { id: 2, base: 'leatherJerkin', rarity: 1, level: 2 }, { id: 3, base: 'ironRing', rarity: 1, level: 1 }],
  equipped: { knight: { weapon: 1, armour: 2 } }, nextItem: 4,
};
let failed = 0;
for (const [w, h] of SIZES) {
  const tag = w === 393 ? '' : `-${w}x${h}`;
  const out = (n) => `docs/samples/run-gear-${n}${tag}.png`;
  const { ctx, page, errors } = await boot(browser, port, w, h, extra);
  // (a run with five heroes and five finds: the knight wears a Frostbrand found this run)
  await page.evaluate(() => {
    const g = window.__game;
    const run = g.run;
    const kinds = ['knight', 'archer', 'wizard', 'cleric', 'barbarian'];
    run.roster = kinds.map((kind, i) => ({ id: i + 1, kind, grade: 1 }));
    run.squad = run.roster.map((h) => h.id);
    run.nextId = 6;
    run.real = true;
    const tag = run.seed >>> 0 || 1;
    run.pack = [
      { id: 101, base: 'frostbrand', rarity: 2, level: 13, found: tag },
      { id: 102, base: 'leatherJerkin', rarity: 1, level: 7, found: tag },
      { id: 103, base: 'luckyCharm', rarity: 1, level: 7, found: tag },
      { id: 104, base: 'ironRing', rarity: 1, level: 7, found: tag, wear: 30 },
      { id: 105, base: 'huntersBow', rarity: 3, level: 10, found: tag },
    ];
    run.worn = { knight: { weapon: 101 } };
    g.events.openPack(run, true, () => {}, run.squad);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: out('pack') });
  // (the run's end: its finds come home and the result card shows the Found row)
  await page.evaluate(() => {
    const g = window.__game;
    // (the pack closed by its own button)
    [...document.querySelectorAll('.evcard.pack header button')].find((b) => b.textContent === 'Close')?.click();
    const run = g.run;
    run.over = true;
    window.__settleFinds(g.meta, run);
    g.showRunRecap();
  });
  await page.waitForTimeout(2500);
  // (a tap hurries the results' count-ups to their end)
  await page.evaluate(() => document.querySelector('.rcSheet')?.click());
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.querySelector('.rcFound')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: out('found') });
  const has = await page.evaluate(() => !!document.querySelector('.rcFound .rcFoundRow button'));
  if (!has) (failed++, console.log('NO FOUND ROW', w, h));
  if (errors.length) failed++;
  await ctx.close();
}
await browser.close();
srv.close();
console.log(failed ? `${failed} problems` : 'shots taken');
process.exit(failed ? 1 : 0);
