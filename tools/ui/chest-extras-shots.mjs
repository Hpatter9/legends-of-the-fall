// Screenshots of CHEST-001 (XP tomes and Open all) at a phone size: a single chest showing its tomes, the hero page's "Use tome"
// and a tome read to a hero (with its level-up), and Open all with its summary. Run after `npm run web`; the pictures go to
// docs/samples/chest-extras-*.png (with the size in the name for any size but 393x852).
//   node tools/ui/chest-extras-shots.mjs [width height]
import { serve, launch, HEROES } from './hp-lib.mjs';
const [W, H] = [Number(process.argv[2] ?? 393), Number(process.argv[3] ?? 852)];
const tag = W === 393 ? '' : `-${W}x${H}`;
const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const out = (n) => `docs/samples/chest-extras-${n}${tag}.png`;
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
// (a save with a pile of chests on the cart: army milestones, a first clear, a tower chest and a daily; a few tomes held; the heroes part-levelled)
const armies = ['orcs', 'undead', 'beasts', 'wildwood'];
const stash = [
  ...armies.flatMap((a, i) => [3, 5, 10].map((at) => ({ army: a, at, tier: i % 2, seed: 1000 + i * 10 + at }))),
  { army: 'labyrinth', at: 5, tier: 1, seed: 777, first: true },
  { army: 'ogres', at: 3, tier: 0, seed: 778, tower: true },
  { army: 'daily', at: 3, tier: 0, seed: 31337, daily: 20261101, bonus: 2 },
];
const xp = {};
HEROES.slice(0, 8).forEach((h, i) => (xp[h] = [11000, 10900, 15000, 23000, 40000, 3000, 900, 70000][i]));
await page.addInitScript(([heroes, stash, xp]) => {
  if (localStorage.getItem('seeded')) return;
  localStorage.setItem('seeded', '1');
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 4321, stones: 12, unlocked: heroes, party: heroes.slice(0, 5), pulls: 57, castle: { treasury: 2, barracks: 2, armoury: 2, mageTower: 1, stable: 2, library: 2 }, shards: {}, stars: {}, xp, bestStage: 12, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash, tomes: { small: 4, medium: 2, large: 1 } }));
  localStorage.setItem('lotf-tips-off', '1');
}, [HEROES.slice(0, 8), stash, xp]);
await page.goto(base);
await page.waitForTimeout(5000);
// (the tutorial's tips are skipped, so they do not cover the cart)
await page.getByText('Skip tutorial').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(600);
await page.screenshot({ path: out('cart') });
// one chest: a tap on the cart opens the best one, and its tomes fly out with the rest
await page.locator('.csChest').click();
await page.waitForTimeout(5200);
await page.screenshot({ path: out('chest-tome') });
await page.locator('.chestGo').click();
await page.waitForTimeout(800);
// Open all: one burst and the summary
await page.locator('.csAll').click();
await page.waitForTimeout(450);
await page.screenshot({ path: out('open-all-burst') });
await page.waitForTimeout(1800);
await page.screenshot({ path: out('open-all') });
await page.locator('.chestAll .chestGo').click();
await page.waitForTimeout(800);
await page.screenshot({ path: out('cart-after') });
// the hero page: the tome line under the XP bar, then the sheet, a medium tome read (a level-up), then a small one
await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Heroes')) b.click(); });
await page.waitForTimeout(1200);
await page.screenshot({ path: out('roster') });
await page.locator('.hcard').first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: out('dossier') });
await page.locator('.tomeUse').click();
await page.waitForTimeout(600);
await page.screenshot({ path: out('tome-sheet') });
await page.locator('.tomeBtn.medium').click();
await page.waitForTimeout(2200);
await page.screenshot({ path: out('tome-level-up') });
await page.locator('.tomeClose').click();
await page.waitForTimeout(800);
await page.screenshot({ path: out('dossier-after') });
console.log(errors.length ? `${errors.length} page errors` : 'no page errors');
await browser.close();
srv.close();
