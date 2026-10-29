// The rank-4 skills' screenshots: a hero card's Skills tab with its Tier 4 skill, at the three phone sizes (docs/samples/rank4-skills-*.png).
//   npm run web, serve out/web, then GAME_URL=http://127.0.0.1:8670 node tools/rank4/shots.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await (await browser.newContext({ viewport: { width: 393, height: 852 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false })));
  await page.goto(`${process.env.GAME_URL || 'http://127.0.0.1:8670'}/?seed=123`, { timeout: 120000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  for (const [width, height] of [[393, 852], [360, 780], [412, 915]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      document.getElementById('tipSkip')?.click();
      const g = window.__game;
      g.meta.unlocked = ['knight', 'wizard', 'samurai', 'cleric', 'archer'];
      g.home.open();
      g.home.show('heroes');
    });
    // (a new save's summon reveals come first: tap through them)
    for (let i = 0; i < 30 && (await page.locator('.trKicker').count()); i++) {
      await page.mouse.click(width / 2, height / 2);
      await page.waitForTimeout(300);
    }
    await page.evaluate(() => document.querySelector('.hcard[data-kind="samurai"]').click());
    await page.waitForTimeout(400);
    await page.getByRole('tab', { name: 'Skills', exact: true }).click();
    const four = page.locator('.dossierAbility[data-type="tier-4"]');
    assert.equal(await four.count(), 1, 'the hero card lists its Tier 4 skill');
    assert.match(await four.textContent(), /Tier 4[\s\S]*Sword Saint/);
    await four.scrollIntoViewIfNeeded();
    assert.equal(await page.getByRole('tabpanel').evaluate((e) => e.scrollWidth <= e.clientWidth + 1), true, `fits at ${width}`);
    await page.screenshot({ path: `docs/samples/rank4-skills-card-${width}.png` });
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors, []);
  console.log('ok');
} finally {
  await browser.close();
}
