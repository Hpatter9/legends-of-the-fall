// Screenshots for docs/samples/gear-*.png: the hero sheet with empty and filled equipment slots, the picker with a comparison, and a fight
// with an equipped hero, all at 393x852. The save carries the same items as `grantSampleEquipment` (src/sim/equipment.ts).
import { serve, launch, HEROES, saveScript } from './lib.mjs';
const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const items = [
  ['ironSword', 1, 1], ['runedBlade', 3, 4], ['stormStaff', 5, 9], ['huntersBow', 2, 3], ['leatherJerkin', 2, 2], ['thornplate', 4, 7], ['luckyCharm', 1, 1], ['phoenixFeather', 4, 6],
].map(([base, rarity, level], i) => ({ id: i + 1, base, rarity, level }));
async function open(extra, vp = { width: 393, height: 852 }) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(saveScript(), [HEROES, extra]);
  await page.goto(base);
  await page.waitForTimeout(2000);
  return page;
}
const out = (n) => `docs/samples/gear-${n}.png`;
const sheet = async (page) => {
  await page.locator('.hmTab').nth(1).click();
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__game.home.openSheet('knight'));
  await page.waitForTimeout(600);
  await page.locator('.eqPanel').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
};
// empty
let page = await open({});
await sheet(page);
await page.screenshot({ path: out('sheet-empty') });
await page.context().close();
// filled: the knight wears a blade, a cuirass and a feather; the rest wait in the inventory
page = await open({ equipment: items, nextItem: 9, equipped: { knight: { weapon: 2, armour: 6, trinket: 8 } } });
await sheet(page);
await page.screenshot({ path: out('sheet-filled') });
await page.locator('.eqSlot').nth(0).click();
await page.waitForTimeout(300);
await page.locator('.eqPanel').scrollIntoViewIfNeeded();
await page.screenshot({ path: out('picker') });
await page.context().close();
// a fight with the equipped knight
page = await open({ equipment: items, nextItem: 9, equipped: { knight: { weapon: 2, armour: 6, trinket: 8 } } });
await page.evaluate(() => {
  const g = window.__game; g.run.stage = 3;
  const kind = g.run.roster.find((h) => g.run.squad.includes(h.id))?.kind ?? 'knight';
  g.meta.equipped = { [kind]: { weapon: 2, armour: 6, trinket: 8 } };
  g.placed.clear(); g.run.squad = [];
  for (const h of g.run.roster.slice(0, 5)) g.run.squad.push(h.id);
  document.getElementById('home').hidden = true; g.newBattle();
});
await page.waitForTimeout(800);
await page.screenshot({ path: out('deploy') });
await page.evaluate(() => document.getElementById('fight').click());
await page.waitForTimeout(4500);
await page.screenshot({ path: out('fight') });
console.log(await page.evaluate(() => JSON.stringify(window.__game.b.units.filter((u) => u.eq).map((u) => [u.def, u.maxHp, u.power, u.eq]))));
await page.context().close();

// the other upright phones (the sheet with the picker open, and a chest that drops equipment) and the chest reveal
const owned = { equipment: items, nextItem: 9, equipped: { knight: { weapon: 2, armour: 6, trinket: 8 } } };
for (const [w, h] of [[360, 780], [412, 915], [393, 852]]) {
  const size = w === 393 ? '' : `-${w}x${h}`;
  const p = await open(owned, { width: w, height: h });
  await sheet(p);
  await p.screenshot({ path: out(`sheet-filled${size}`) });
  await p.locator('.eqSlot').nth(0).click();
  await p.waitForTimeout(300);
  await p.locator('.eqPanel').scrollIntoViewIfNeeded();
  await p.screenshot({ path: out(`picker${size}`) });
  await p.context().close();
  const c = await open({ stash: [{ army: 'golems', at: 10, tier: 0, seed: 11 }] }, { width: w, height: h });
  await c.locator('.hmTab').nth(2).click();
  await c.waitForTimeout(1500);
  await c.locator('.csChest').first().click();
  await c.waitForTimeout(6500);
  await c.screenshot({ path: out(`chest${size}`) });
  await c.context().close();
}
await browser.close();
srv.close();
