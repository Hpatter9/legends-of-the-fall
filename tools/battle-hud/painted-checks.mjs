// Checks the painted combat skin against real controls. Larger-party and fallen
// states below are explicit presentation fixtures, not completed campaign runs.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

export async function checkPaintedCombat(page, { prefix, w }) {
  const report = { width: w, checks: [] };
  const check = (name, ok) => { assert.ok(ok, name); report.checks.push(name); };
  const shot = async (name) => page.screenshot({ path: `docs/samples/${prefix}-${name}-${w}.png` });
  const click = async (selector) => page.locator(selector).first().click();
  const geometry = await page.evaluate(() => {
    const panel = document.querySelector('#panel').getBoundingClientRect();
    const top = document.querySelector('#top').getBoundingClientRect();
    const chips = [...document.querySelectorAll('#fightHud .fhChip')];
    const controls = [...document.querySelectorAll('#hudSpells .spell, #hudSpells .fhAuto, #hudSpells #mana')].map((e) => e.getBoundingClientRect());
    const overlap = controls.some((a, i) => controls.some((b, j) => j > i && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom));
    return { overflow: document.documentElement.scrollWidth > innerWidth, room: panel.top - top.bottom, chips: chips.length,
      touch: chips.every((e) => e.getBoundingClientRect().height >= 44), overlap,
      skin: getComputedStyle(document.querySelector('#panel')).borderImageSource.includes('combat-panel.png') };
  });
  report.geometry = geometry;
  check('painted panel active', geometry.skin);
  check('no horizontal page overflow', !geometry.overflow);
  check('at least 350px between command bar and panel', geometry.room >= 350);
  check('skill buttons retain 44px height', geometry.touch && geometry.chips > 0);
  check('mana, orbs and Auto do not overlap', !geometry.overlap);

  await click('#fightHud .fhChip');
  check('skill sheet holds combat', await page.evaluate(() => window.__game.hud.holding && !!document.querySelector('.fhSheet:not([hidden])')));
  await shot('skill');
  await click('.fhSheet:not([hidden]) [data-tab="ult"]');
  check('ultimate tab opens', await page.locator('.fhSheet:not([hidden]) [data-tab="ult"]').getAttribute('aria-current') === 'true');
  await click('.fhSheet:not([hidden]) .fsClose');
  check('closing sheet releases combat', await page.evaluate(() => !window.__game.hud.holding));

  const auto = await page.locator('#hudSpells .fhAuto').getAttribute('aria-pressed');
  await click('#hudSpells .fhAuto');
  check('Auto toggles', await page.locator('#hudSpells .fhAuto').getAttribute('aria-pressed') !== auto);
  await click('#hudSpells .fhAuto');
  const tactic = await page.locator('.fhTactic').getAttribute('data-tactic');
  await click('.fhTactic');
  check('tactic changes', await page.locator('.fhTactic').getAttribute('data-tactic') !== tactic);

  // The staged battle may have cast this spell already. Clear its cooldown for
  // this interaction fixture rather than mistaking an unaffordable orb for a UI bug.
  await page.evaluate(() => {
    const g = window.__game;
    g.b.spells.mana = 10;
    for (const id of Object.keys(g.b.spells.ready)) g.b.spells.ready[id] = 0;
    g.refreshSpells();
  });
  await page.waitForTimeout(150);
  // Rally is an instant whole-party cast. Use a tile-targeted starter spell to
  // exercise arm/cancel rather than expecting every orb to enter targeting.
  await click('#hudSpells .spell:is([data-id="shield"], [data-id="heal"], [data-id="meteor"])');
  check('spell arms', await page.locator('#hudSpells .spell.armed').count() === 1);
  await shot('spell-armed');
  await click('#hudSpells .spell.armed');
  check('spell cancels', await page.locator('#hudSpells .spell.armed').count() === 0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  check('reduced motion stops pearl animation', await page.evaluate(() => getComputedStyle(document.querySelector('.fhPearl')).animationName === 'none'));
  await shot('reduced');

  // Ten real unit data records presented through the HUD, without changing any
  // simulation rule or claiming this is a naturally reached Calamity save.
  await page.evaluate(() => {
    const g = window.__game;
    const hs = g.b.units.filter((u) => u.side === 'hero' && u.owner === undefined && u.def !== 'king');
    g.b.units.push(...hs.map((u, i) => ({ ...structuredClone(u), id: 9000 + i })));
    g.hud.build(g.b);
  });
  check('ten-hero fixture uses compact two-column layout', await page.locator('#fightHud.pairs .fhRow').count() === 10);
  check('compact layout stays inside viewport', await page.evaluate(() => [...document.querySelectorAll('#fightHud .fhRow')].every((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })));
  await shot('ten-hero-fixture');

  const assets = ['combat-panel', 'combat-orb', 'combat-portrait', 'combat-skill', 'combat-heart'];
  for (const asset of assets) {
    const response = await page.request.get(`http://localhost:${new URL(page.url()).port}/ui/${asset}.png`);
    check(`${asset} loads`, response.ok());
  }
  if (w === 393) {
    await page.waitForFunction(async () => {
      const keys = await caches.keys();
      for (const key of keys) { if (await (await caches.open(key)).match('ui/combat-panel.png')) return true; }
      return false;
    }, null, { timeout: 120000 });
    check('painted assets cached for offline use', await page.evaluate(async (assets) => {
      const keys = await caches.keys();
      for (const key of keys) {
        const cache = await caches.open(key);
        if ((await Promise.all(assets.map((a) => cache.match(`ui/${a}.png`)))).every(Boolean)) return true;
      }
      return false;
    }, assets));
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller && !!window.__game?.home, null, { timeout: 90000 });
    await page.context().setOffline(true);
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 90000 });
      check('game reloads offline under service worker', true);
      check('painted frame available offline', await page.evaluate(async () => (await fetch('ui/combat-panel.png')).ok));
      await shot('offline');
    } finally { await page.context().setOffline(false); }
  }
  writeFileSync(`docs/samples/${prefix}-checks-${w}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log('painted checks', w, report.checks.length, 'passed');
}
