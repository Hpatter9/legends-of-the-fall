// Screenshots of RUN-GEAR-2 (docs/notes/run-gear-2.md) at the three phone sizes: the wave card's pack line, the camp cart's red "full" tag,
// the equipment panel's stash count and the auto-replay recap's finds. Run after `npm run web`; the pictures go to docs/samples/run-gear-2-*.png.
//   node tools/run-gear/shots2.mjs [port]
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { serve, launch, boot, SIZES } from '../shop/lib.mjs';
const port = Number(process.argv[2] ?? 8952);
const srv = serve('out/web', port);
const own = '/opt/pw-browsers/chromium';
const browser = existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') || !existsSync(own)
  ? await launch()
  : await createRequire('/opt/node-tools/node_modules/')('playwright').chromium.launch({ executablePath: own, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const bases = ['ironRing', 'leatherJerkin', 'luckyCharm', 'runedBlade', 'huntersBow'];
const full = Array.from({ length: 150 }, (_, i) => ({ id: i + 1, base: bases[i % 5], rarity: 1 + (i % 3), level: 1 + (i % 9) }));
const extra = {
  equipment: full, equipped: {}, nextItem: 151,
  cart: [{ base: 'runedBlade', rarity: 2, level: 6 }],
  stash: [{ army: 'orcs', at: 3, tier: 0, seed: 11 }],
};
let failed = 0;
for (const [w, h] of SIZES) {
  const tag = w === 393 ? '' : `-${w}x${h}`;
  const out = (n) => `docs/samples/run-gear-2-${n}${tag}.png`;
  const { ctx, page, errors } = await boot(browser, port, w, h, extra);
  // (the camp: the cart with its red tag)
  await page.evaluate(() => window.__game.home.open());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('cart') });
  const tagged = await page.evaluate(() => !!document.querySelector('.csFull'));
  if (!tagged) (failed++, console.log('NO FULL TAG', w, h));
  // (the equipment panel: the Heroes page, a hero, its Equipment)
    await page.evaluate(() => [...document.querySelectorAll('nav button, #hmTabs button, button')].find((b) => b.offsetParent && b.textContent?.trim().endsWith('Heroes'))?.click());
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('.tvRoster')?.click());
  await page.waitForTimeout(1200);
  await page.getByText('Kwame', { exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('[id^=hero-tab-]:nth-of-type(3), #hero-tab-equipment')?.click());
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelector('.eqStash')?.scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: out('equip') });
  if (!(await page.evaluate(() => !!document.querySelector('.eqStash.full')))) (failed++, console.log('NO STASH COUNT', w, h));
  // (the wave card's pack line)
  await page.evaluate(() => {
    document.getElementById('home').hidden = true;
    const r = document.getElementById('result');
    r.hidden = false;
    window.__waveNotes({ ups: [{ kind: 'knight', from: 4, to: 5 }], fell: [], hearts: 0, heartsLeft: 2, found: ['a Frostbrand'], wear: ["Kenji's Runed Blade broke"], waiting: 2 });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('wave') });
  if (!(await page.evaluate(() => !!document.querySelector('#waveNotes .wn.pack')))) (failed++, console.log('NO PACK LINE', w, h));
  // (the auto-replay recap with its finds)
  await page.evaluate(() => {
    const g = window.__game;
    document.getElementById('result').hidden = true;
    g.auto = { army: 'orcs', tier: 0, count: 3, run: 3, totals: { runs: 3, crowns: 840, xp: 5200, chests: 2, gear: 9, finds: [{ id: 1, base: 'runedBlade', rarity: 3, level: 9 }, { id: 2, base: 'huntersBow', rarity: 2, level: 8 }, { id: 3, base: 'ironRing', rarity: 1, level: 7 }, { id: 4, base: 'leatherJerkin', rarity: 1, level: 7 }, { id: 5, base: 'luckyCharm', rarity: 2, level: 8 }, { id: 6, base: 'ironRing', rarity: 1, level: 6 }, { id: 7, base: 'ironRing', rarity: 1, level: 6 }] } };
    g.endAuto('done');
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: out('auto') });
  if (!(await page.evaluate(() => !!document.querySelector('#autoSum .asumFinds .rcFoundPiece')))) (failed++, console.log('NO AUTO FINDS', w, h));
  if (errors.length) failed++;
  await ctx.close();
}
await browser.close();
srv.close();
console.log(failed ? `${failed} problems` : 'shots taken');
process.exit(failed ? 1 : 0);
