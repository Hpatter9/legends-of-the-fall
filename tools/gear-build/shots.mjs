// Screenshots of SEVEN-SLOT GEAR's paper doll (docs/notes/gear-build.md) at the three upright phone sizes: an old save's kit moved over
// (the hero sheet's Equipment tab with the move's lines), a doll with new pieces in every slot (their placeholders), and the picker.
// Writes docs/samples/gear-build-<what>-<w>x<h>.png. Run `npm run web` first; PORT picks the server's port.
//   node tools/gear-build/shots.mjs
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
}).listen(Number(process.env.PORT || 8812));
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const url = `http://127.0.0.1:${srv.address().port}/`;
const HEROES = ['knight', 'wizard', 'samuraiCommander', 'cleric', 'archer'];
const metaWith = (extra) => ({ seed: 7, crowns: 300, unlocked: HEROES, party: HEROES, pulls: 0, castle: { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 4000 }, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, ...extra });
// (an old save: the knight wears the old Winter Court in full, worn; the wizard the Grimoire and the Scrying Orb)
const old = metaWith({
  equipment: [['frostbrand', 3], ['silkenRobe', 2], ['sapphireRing', 2], ['grimoire', 2], ['scryingOrb', 3], ['vanguardHelm', 1]].map(([base, rarity], i) => ({ id: 901 + i, base, rarity, level: 4, wear: 9 })),
  nextItem: 999,
  equipped: { knight: { weapon: 901, armour: 902, trinket: 903 }, wizard: { weapon: 904, trinket: 905 } },
});
// (a new save: a piece in every slot, new bases among them)
const full = metaWith({
  gearV: 2,
  equipment: [['stormHood', 3], ['coatOfPlates', 4], ['claymore', 5], ['kiteShield', 2], ['climberBoots', 1], ['alchemistSash', 3], ['wishbone', 2], ['frostBoots', 1]].map(([base, rarity], i) => ({ id: 901 + i, base, rarity, level: 6 })),
  nextItem: 999,
  equipped: { knight: { head: 901, torso: 902, main: 903, off: 904, feet: 905, belt: 906, acc: 907 } },
});
// (batch 2: two legends found, one with renown, and a full Winter Court on the knight)
const legends = metaWith({
  gearV: 2,
  equipment: [
    ...['frostCirclet', 'silkenRobe', 'frostbrand', 'frostMirror', 'frostBoots', 'frostSash', 'sapphireRing'].map((base, i) => ({ id: 901 + i, base, rarity: 3, level: 6 })),
    { id: 920, base: 'gravesong', rarity: 4, level: 12, renown: 31 },
    { id: 921, base: 'crownLastKing', rarity: 4, level: 12 },
  ],
  nextItem: 999,
  legends: { gravesong: 920, crownLastKing: 921 },
  equipped: { knight: { head: 901, torso: 902, main: 903, off: 904, feet: 905, belt: 906, acc: 907 } },
});
// (batch 3: worn and scarred pieces, one seasoned and enchanted, at Hester's with standing 2)
const upkeep = metaWith({
  gearV: 2,
  crowns: 6000,
  stall: { day: 0, sold: {}, spent: 5000 },
  equipment: [
    { id: 901, base: 'frostbrand', rarity: 3, level: 9, xp: 14, wear: 40, glyphs: ['keen'] },
    { id: 902, base: 'plateCuirass', rarity: 2, level: 5, wear: 30, scars: 2 },
    { id: 903, base: 'bootsOfHaste', rarity: 2, level: 4, wear: 20 },
    { id: 904, base: 'leatherBoots', rarity: 1, level: 2 },
  ],
  nextItem: 999,
  equipped: { knight: { main: 901, torso: 902, feet: 903 } },
});
const saveScript = ([m]) => { try { localStorage.setItem('legends.meta', JSON.stringify(m)); localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'summon', 'crowns'])); localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false })); } catch {} };
const errors = [];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const tag = `${w}x${h}`;
  for (const [what, meta] of [['moved', old], ['doll', full], ['legend', legends], ['upkeep', upkeep]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(saveScript, [meta]);
    await page.goto(url, { timeout: 120000 });
    await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__game.home.openSheet('knight'));
    await page.waitForTimeout(600);
    await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
    await page.waitForTimeout(500);
    // (the sheet's tips would cover the doll; then the doll's top just under the sheet's tabs)
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Got it', exact: true }).first().click({ timeout: 1500 }).catch(() => {});
    await page.evaluate(() => document.querySelector('.eqPanel h4').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `docs/samples/gear-build-${what}-${tag}.png` });
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(tag, what, 'slots', await page.locator('.eqSlot').count(), 'side scroll', wide);
    if (what === 'upkeep') {
      await page.locator('.eqSlot.at-main').click();
      await page.waitForTimeout(400);
      await page.evaluate(() => document.querySelector('.eqRow.worn')?.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `docs/samples/gear-build-upkeep-card-${tag}.png` });
      for (let i = 0; i < 3; i++) await page.locator('#hmSheet').getByRole('button', { name: 'Back', exact: true }).first().click({ timeout: 1500 }).catch(() => {});
      await page.evaluate(() => window.__game.home.tavern.shop?.onStall());
      await page.waitForTimeout(1200);
      for (const t of ['Repair', 'Enchant']) {
        await page.getByRole('tab', { name: t }).click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `docs/samples/gear-build-stall-${t.toLowerCase()}-${tag}.png` });
      }
    }
    if (what === 'legend') {
      await page.locator('.eqSlot.at-main').click();
      await page.waitForTimeout(400);
      await page.evaluate(() => [...document.querySelectorAll('.eqRow')].find((r) => r.textContent.includes('Gravesong'))?.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `docs/samples/gear-build-legend-card-${tag}.png` });
      for (let i = 0; i < 3; i++) await page.locator('#hmSheet').getByRole('button', { name: 'Back', exact: true }).first().click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(300);
      await page.evaluate(() => window.__game.home.openCodex());
      await page.waitForTimeout(600);
      await page.getByRole('button', { name: 'Legends', exact: true }).click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `docs/samples/gear-build-legends-codex-${tag}.png` });
    }
    if (what === 'doll') {
      await page.locator('.eqSlot.at-off').click();
      await page.waitForTimeout(400);
      await page.locator('.eqPanel').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `docs/samples/gear-build-picker-${tag}.png` });
    }
    await ctx.close();
  }
}
console.log(errors.length ? `page errors: ${errors.join(' | ')}` : 'no page errors');
await browser.close();
srv.close();
