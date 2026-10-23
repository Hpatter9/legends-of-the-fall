// Screenshots for docs/samples/difficulty-*.png: the armies screen with the Mythic tier picked (Orc Warband and Golem Forge, every lower star won,
// the Mythic star not yet), at 393x852, 360x780 and 412x915. Run after `npm run web`:
//   node tools/ui/difficulty-shots.mjs
import { serve, launch, HEROES, saveScript } from '../audit/lib.mjs';

const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const IDS = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'];
const rec = (mythic) => ({ best: 15, won: 15, clears: 1, stars: {}, waves: 15, met: { 0: 7, 1: 7, 2: 7, 3: 1, ...(mythic ? { 4: 1 } : {}) }, hard: { 1: { won: 15, clears: 1 }, 2: { won: 15, clears: 1 }, 3: { won: 15, clears: 1 } }, first: 15, chests: [3, 5, 10] });
const armies = Object.fromEntries(IDS.map((id) => [id, rec(false)]));

for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  for (const [name, tier] of [['mythic', 4], ['legendary', 3]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    await page.addInitScript(saveScript(), [HEROES.slice(0, 22), { armies, armySeen: IDS }]);
    await page.goto(base);
    await page.waitForTimeout(2300);
    await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
    await page.evaluate(() => window.__game.home.openArmies('golems'));
    await page.waitForTimeout(900);
    if (tier !== 4) await page.locator('.asTier').nth(tier).click();
    await page.waitForTimeout(300);
    const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(w, name, over ? 'SIDEWAYS SCROLL' : 'fits');
    await page.screenshot({ path: `docs/samples/difficulty-${name}-${w}.png` });
    await ctx.close();
  }
}
await browser.close();
srv.close();
