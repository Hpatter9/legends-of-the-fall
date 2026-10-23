// Screenshots for docs/samples/hero-progress-*.png and the checks of docs/notes/hero-progress.md, at 393x852, 360x780 and 412x915.
// Run after `npm run web`:  node tools/ui/hero-progress-shots.mjs
import { serve, launch, HEROES, saveScript } from './hp-lib.mjs';
import { mkdirSync } from 'node:fs';

mkdirSync('docs/samples', { recursive: true });
const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const errors = [];
const SIZES = [[393, 852], [360, 780], [412, 915]];
// knight: rank 2 earned and not taken (a new-style save: `ranked` lists what was taken); archer at the top rank with an awakening paid for
const extra = { shards: { knight: 3, archer: 26, wizard: 10, cleric: 1 }, ranked: { knight: 1, archer: 4, wizard: 4, cleric: 1 }, xp: { knight: 4000 }, talents: { knight: { picks: [], bought: 0 } }, crowns: 5000 };

async function fresh(w, h, save = extra) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  await page.addInitScript(saveScript(), [HEROES.slice(0, 22), save]);
  await page.goto(base);
  await page.waitForTimeout(2300);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  return [ctx, page];
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

for (const [w, h] of SIZES) {
  const [ctx, page] = await fresh(w, h);
  // the hero sheet with its Rank up badge, then the card
  await page.evaluate(() => window.__game.home.openSheet('knight'));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `docs/samples/hero-progress-sheet-${w}.png` });
  await page.locator('.rankBadge').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `docs/samples/hero-progress-rankup-${w}.png` });
  console.log(w, 'rank card sideways scroll:', await overflow(page));
  await page.locator('.ruBtns button').first().click();
  await page.waitForTimeout(500);
  console.log(w, 'after rank up, knight stars:', await page.evaluate(() => document.querySelector('.hsheet .stars')?.textContent));
  await page.screenshot({ path: `docs/samples/hero-progress-ranked-${w}.png` });
  // the awakening card (the archer: look before and after)
  await page.evaluate(() => window.__game.home.openSheet('archer'));
  await page.waitForTimeout(600);
  await page.locator('.rankBadge').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `docs/samples/hero-progress-awaken-${w}.png` });
  await ctx.close();
}

// the talent tree: the tiles, the box a tap opens, Learn
for (const [w, h] of SIZES) {
  const [ctx, page] = await fresh(w, h);
  await page.evaluate(() => window.__game.home.openSheet('knight'));
  await page.waitForTimeout(600);
  await page.locator('.tPanel button:has-text("Open talents")').click();
  await page.waitForTimeout(300);
  await page.locator('.tTree').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `docs/samples/hero-progress-talents-${w}.png` });
  await page.locator('.tNode.available').first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `docs/samples/hero-progress-talentbox-${w}.png` });
  const box = await page.locator('.tBox').boundingBox();
  console.log(w, 'talent box on screen:', !!box && box.y >= 0 && box.y + box.height <= h);
  await page.locator('.tBtns button.primary').click();
  await page.waitForTimeout(500);
  console.log(w, 'learned after Learn:', await page.locator('.tNode.taken').count(), 'box closed:', (await page.locator('.tBox').count()) === 0);
  await page.screenshot({ path: `docs/samples/hero-progress-learned-${w}.png` });
  await ctx.close();
}

// the summoning hall: three pulls in a row, each with the cinematic and the hall's show, and a pull from the card reveal screen
{
  const [ctx, page] = await fresh(393, 852);
  await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
  await page.waitForTimeout(800);
  const shows = [];
  for (let i = 1; i <= 3; i++) {
    if (i === 1) await page.locator('.hlBar button').first().click();
    // (poll for the cinematic, then the hall's show, then the cards)
    let cine = false;
    let hall = false;
    for (let t = 0; t < 60 && !(await page.evaluate(() => !document.getElementById('gacha').hidden)); t++) {
      const now = await page.evaluate(() => ({ c: !!document.querySelector('#cutscene:not([hidden])'), h: !!document.querySelector('.hlSkip.on') }));
      if (now.c && !cine && i === 1) await page.screenshot({ path: 'docs/samples/hero-progress-summon-cinematic-393.png' });
      if (now.h && !hall && i === 1) await page.screenshot({ path: 'docs/samples/hero-progress-summon-hall-393.png' });
      cine ||= now.c;
      hall ||= now.h;
      await page.waitForTimeout(200);
    }
    shows.push({ cine, hall });
    await page.waitForTimeout(6000);
    if (i === 3) break;
    // the card reveal is up: pull again from it
    await page.locator('#pull1').click();
  }
  console.log('pulls (cinematic up, hall show up):', JSON.stringify(shows));
  // a tap skips the cinematic and the show
  await page.evaluate(() => document.getElementById('gachaClose')?.click());
  await page.waitForSelector('#gacha', { state: 'hidden' });
  await page.waitForTimeout(800);
  await page.locator('.hlBar button').first().click();
  await page.waitForTimeout(500);
  await page.mouse.click(200, 400);
  await page.waitForTimeout(600);
  console.log('after one tap: cinematic gone:', !(await page.evaluate(() => !!document.querySelector('#cutscene:not([hidden])'))), 'cards up:', !(await page.evaluate(() => document.getElementById('gacha').hidden)));
  await ctx.close();
}

// an earned hero's reveal
{
  const [ctx, page] = await fresh(393, 852);
  await page.evaluate(() => { void window.__game.playScene('earned:werewolf'); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'docs/samples/hero-progress-earned-1-393.png' });
  await page.waitForTimeout(4200);
  await page.screenshot({ path: 'docs/samples/hero-progress-earned-2-393.png' });
  await ctx.close();
}

// an old save (no `ranked`) starts and keeps its ranks; a new save starts at the starter pick
{
  const [ctx, page] = await fresh(393, 852, { shards: { knight: 6 } });
  const ranks = await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')).ranked);
  console.log('old save ranks kept:', JSON.stringify(ranks));
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errors.push(`new: ${e.message}`));
  await p2.goto(base);
  await p2.waitForTimeout(2500);
  console.log('new save shows the starter pick:', await p2.evaluate(() => document.body.innerText.includes('Choose') || !!document.querySelector('#starter, .starter')));
  await ctx2.close();
}
console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
srv.close();
