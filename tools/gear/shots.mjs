// Screenshots of the painted equipment icons (docs/notes/gear-icons.md) at the three upright phone sizes, at a phone's pixel
// density: the hero sheet's Equipment tab (one item of each grade worn and in the bag), the picker open, and a chest that drops
// equipment. Writes docs/samples/gear-icons-<what>-<w>x<h>.png. Run `npm run web` first; PORT picks the server's port.
//   node tools/gear/shots.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', opus: 'audio/ogg', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT || 8811));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const url = `http://127.0.0.1:${srv.address().port}/`;
const DPR = Number(process.env.DPR || 2.625);
// one of each grade, Mythic among them, across the three slots
const items = [
  ['claymore', 5], ['plateCuirass', 4], ['moonPendant', 3], ['huntersBow', 1], ['stormStaff', 2], ['katana', 4], ['chainMail', 1], ['mageRobe', 5],
  ['thornplate', 2], ['ironRing', 1], ['rubyRing', 5], ['phoenixFeather', 4], ['grimoire', 3], ['bootsOfHaste', 2],
].map(([base, rarity], i) => ({ id: 901 + i, base, rarity, level: 3 }));
const HEROES = ['knight', 'wizard', 'samuraiCommander', 'cleric', 'archer'];
const metaWith = (extra) => ({ seed: 7, crowns: 300, unlocked: HEROES, party: HEROES, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, ...extra });
const saveScript = ([m]) => { try { localStorage.setItem('legends.meta', JSON.stringify(m)); localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'summon', 'crowns'])); localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false })); } catch {} };
const errors = [];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const tag = `${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: DPR, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(saveScript, [metaWith({ xp: { knight: 4000 }, equipment: items, nextItem: 999, equipped: { knight: { weapon: 901, armour: 902, trinket: 903 } } })]);
  await page.goto(url, { timeout: 120000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__game.home.openSheet('knight'));
  await page.waitForTimeout(600);
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await page.locator('.eqPanel').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `docs/samples/gear-icons-sheet-${tag}.png` });
  const sizes = await page.evaluate(() => [...document.querySelectorAll('.eqIcon')].map((e) => `${e.className.replace('eqIcon ', '')} ${Math.round(e.getBoundingClientRect().width)}px`));
  console.log(tag, 'sheet icons', sizes.join(', '));
  for (const [slot, n] of [['weapon', 0], ['armour', 1]]) {
    await page.locator('.eqSlot').nth(n).click();
    await page.waitForTimeout(400);
    await page.locator('.eqPanel').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `docs/samples/gear-icons-picker-${slot}-${tag}.png` });
    const back = page.locator('.eqPanel').getByRole('button', { name: 'Back', exact: true });
    if (await back.count()) await back.click();
    await page.waitForTimeout(200);
  }
  console.log(tag, 'painted', await page.evaluate(() => document.querySelectorAll('.eqIcon.painted').length), 'pixel', await page.evaluate(() => document.querySelectorAll('.eqIcon:not(.painted)').length));
  await ctx.close();

  // a chest that drops equipment: the first stash seed whose opening shows a gear card
  for (let seed = 1; seed < 40; seed++) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: DPR, hasTouch: true });
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.addInitScript(saveScript, [metaWith({ stash: [{ army: 'golems', at: 10, tier: 2, seed }] })]);
    await p.goto(url, { timeout: 120000 });
    await p.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    if (!(await p.locator('.csChest').count())) { await c.close(); console.log('no chest on the cart'); break; }
    await p.locator('.csChest').first().click();
    await p.waitForTimeout(6500);
    const gear = await p.locator('.lootCard .eqIcon').count();
    if (gear) {
      await p.screenshot({ path: `docs/samples/gear-icons-chest-${tag}.png` });
      console.log(tag, 'chest seed', seed, 'gear cards', gear, await p.evaluate(() => [...document.querySelectorAll('.lootCard .eqIcon')].map((e) => `${e.className} ${Math.round(e.getBoundingClientRect().width)}px`).join(', ')));
      await c.close();
      break;
    }
    await c.close();
  }
}
console.log(errors.length ? `page errors: ${errors.join(' | ')}` : 'no page errors');
await browser.close();
srv.close();
