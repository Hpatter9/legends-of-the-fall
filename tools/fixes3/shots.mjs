// The Paladin in the game after FIXES3 (his plain sheet made from the awakened one): a deploy with him on the board, at the
// three phone sizes. `node tools/fixes3/shots.mjs [port]` after `npm run web`; writes docs/samples/fixes3-paladin-<w>.png.
import { serve, launch } from '../battle-ui/lib.mjs';
const port = +(process.argv[2] ?? 8887);
const server = serve('out/web', port);
const browser = await launch();
const PARTY = ['paladin', 'knight', 'cleric', 'archer', 'wizard'];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000);
  page.setDefaultNavigationTimeout(180000);
  await page.goto(`http://localhost:${port}/`);
  await page.evaluate((party) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: party, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
  }, PARTY);
  await page.reload();
  await page.waitForFunction(() => window.__game);
  await page.evaluate(() => window.__game.home.go(() => window.__game.home.hooks.onArmy('orcs', 0, undefined)));
  await page.waitForTimeout(600);
  await page.evaluate(() => document.getElementById('ptGo').click());
  await page.waitForTimeout(1500);
  // (hires until the Paladin is among them, then the party set out)
  await page.evaluate(() => {
    const g = window.__game;
    for (let i = 0; i < 12 && !g.run.roster.some((r) => r.kind === 'paladin'); i++) document.getElementById('summon').click();
    g.autoArrange(true);
    document.getElementById('tipSkip')?.click();
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `docs/samples/fixes3-paladin-${w}.png` });
  await ctx.close();
}
await browser.close();
server.close();
