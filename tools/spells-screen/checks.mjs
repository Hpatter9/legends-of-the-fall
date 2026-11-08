// Real Spells-screen checks with isolated saves. Run after npm run web.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { build } = require('esbuild');
// Exercise the exported overlay too, using a separate browser-only bundle.
const preview = await build({ stdin: { contents: "import { bindSpellbook, openSpellbook } from './src/spellbook'; import { SPELL_IDS } from './src/sim/spells'; window.__spellUI = { ids: SPELL_IDS, open: () => { bindSpellbook(window.__game.meta, () => {}, () => 'iron_stag'); openSpellbook(); } };", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, loader: { '.png': 'dataurl', '.webp': 'dataurl' }, logLevel: 'silent' });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', json: 'application/json', woff2: 'font/woff2', opus: 'audio/ogg', webmanifest: 'application/manifest+json' };
const server = createServer((q, r) => {
  const path = `out/web/${q.url.split('?')[0].slice(1) || 'index.html'}`;
  if (!existsSync(path)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': types[path.split('.').pop()] || 'application/octet-stream' });
  r.end(readFileSync(path));
}).listen(8723);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = 'docs/samples/spells-refresh';
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(ok ? 'ok' : 'FAIL', name); };
async function open(width, height, locked = false) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, reducedMotion: width === 412 ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.addInitScript(locked => {
    if (sessionStorage.getItem('spells-set')) return;
    sessionStorage.setItem('spells-set', '1');
    const heroes = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 2500, unlocked: heroes, party: heroes, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 2, barracks: 2, armoury: 1, mageTower: locked ? 0 : 2, stable: 1, library: 2, chapel: locked ? 0 : 1 }, chapel: !locked, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], scenes: ['opening'], opened: ['undead'], spellbook: { owned: ['heal', 'meteor', 'haste', 'rally', 'shield', 'smite'], equipped: ['rally', 'shield'], open: 'heal', school: 'iron_stag' } }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ ruler: 'iron_stag', cinematics: false, music: 0, effects: 0, quips: false }));
  }, locked);
  await page.goto('http://localhost:8723/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 120000 });
  await page.evaluate(() => { document.getElementById('tipSkip')?.click(); window.__game.home.open(); window.__game.home.show('spells'); });
  await page.waitForFunction(() => window.__game.home.tab === 'spells' && !window.__game.home.slide);
  await page.locator('.lbPainting').evaluate(img => img.decode());
  await page.waitForTimeout(250);
  return { context, page, errors };
}
try {
  if (process.argv.includes('--visual')) {
  const { context, page, errors } = await open(393, 852);
  for (const [width, height] of [[393,852],[360,780],[412,915]]) {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: width === 412 ? 'reduce' : 'no-preference' });
    await page.locator('.lbWrap').evaluate(e => e.scrollTo(0, 0));
    await page.waitForTimeout(300);
    check(`painted art uses smooth scaling ${width}`, await page.locator('.lbPainting').evaluate(e => getComputedStyle(e).imageRendering === 'auto'));
    check(`final layout has no overflow ${width}`, await page.locator('.lbWrap').evaluate(e => e.scrollWidth <= e.clientWidth + 1));
    await page.screenshot({ path: `${out}/study-${width}.png` });
    await page.locator('.sbCollection').evaluate(e => e.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `${out}/spell-cards-${width}.png` });
    check(`final cards use smooth parchment ${width}`, await page.locator('.sbCard').first().evaluate(e => getComputedStyle(e).imageRendering === 'auto' && getComputedStyle(e).backgroundImage.includes('spells-parchment.png')));
  }
  await page.setViewportSize({width:393,height:852});
  await page.addScriptTag({content:preview.outputFiles[0].text});
  await page.evaluate(() => window.__spellUI.open());
  await page.screenshot({path:`${out}/overlay-393.png`});
  check('final smooth-art pass has no page errors', errors.length === 0);
  await context.close();
  } else {
  for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
    const { context, page, errors } = await open(w, h);
    check(`painting decodes ${w}`, await page.locator('.lbPainting').evaluate(img => img.naturalWidth > 1000));
    check(`correct school ${w}`, await page.locator('.lbSchool').innerText() === 'School of Steel');
    check(`four loadout slots ${w}`, await page.locator('.sbSlots .sbSlot').count() === 4);
    check(`no page overflow ${w}`, await page.locator('.lbWrap').evaluate(e => e.scrollWidth <= e.clientWidth + 1));
    check(`all controls at least 44px ${w}`, await page.locator('.lbPage button, .lbPage summary').evaluateAll(nodes => nodes.filter(n => n.getClientRects().length).every(n => { const r = n.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })));
    await page.screenshot({ path: `${out}/study-${w}.png` });
    await page.locator('.sbSlot').first().click();
    check(`unequip saves ${w}`, await page.evaluate(() => !JSON.parse(localStorage.getItem('legends.meta')).spellbook.equipped.includes('rally')));
    await page.locator('[data-spell="rally"] .sbEquip').click();
    check(`equip saves ${w}`, await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')).spellbook.equipped.includes('rally')));
    await page.locator('[data-spell="heal"] .rankUp').click();
    check(`rank spends exactly one mark ${w}`, await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')).spellbook.ranks.heal === 2));
    await page.locator('[data-spell="heal"] .sbDetails summary').click();
    check(`rank rider accessible ${w}`, await page.locator('[data-spell="heal"] .rider').isVisible());
    await page.locator('.sbFilter').filter({ hasText: 'Your school' }).click();
    check(`school filter includes locked spells ${w}`, await page.locator('.sbCollection .sbCard.locked').count() > 0);
    await page.locator('.sbFilter').filter({ hasText: 'Locked' }).click();
    check(`locked filter has no equip actions ${w}`, await page.locator('.sbCollection .sbEquip').count() === 0);
    check(`unlock routes visible ${w}`, await page.locator('.sbCollection .how').count() > 0);
    await page.screenshot({ path: `${out}/locked-spells-${w}.png` });
    await page.locator('.sbFilter').filter({ hasText: 'Known' }).click();
    // Fill the open slot, then verify an off-school spell explains why it is blocked.
    check(`blocked equip explained ${w}`, await page.locator('[data-spell="meteor"] .sbEquip').isDisabled() && /open slot/i.test(await page.locator('[data-spell="meteor"] .sbBlocked').innerText()));
    await page.locator('.sbSchool summary').click();
    check(`Decree guidance accessible ${w}`, /Decree:/.test(await page.locator('.sbSchool').innerText()));
    if (w === 412) check('reduced motion hides ambient layer', await page.locator('.lbMagic').evaluate(e => getComputedStyle(e).display === 'none'));
    if (w === 393) {
      await page.locator('.sbCollection').evaluate(e => e.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: `${out}/spell-cards-${w}.png` });
      await page.addScriptTag({ content: preview.outputFiles[0].text });
      await page.evaluate(() => window.__spellUI.open());
      check('overlay uses standard dialog', await page.locator('#spellbook .om[role="dialog"]').count() === 1);
      check('overlay fits phone', await page.locator('#spellbook .om').evaluate(e => { const r = e.getBoundingClientRect(); return r.width <= innerWidth && r.height <= innerHeight && r.y >= 0; }));
      await page.screenshot({ path: `${out}/overlay-${w}.png` });
      await page.keyboard.press('Escape');
      check('Escape closes overlay', await page.locator('#spellbook').count() === 0);
      await page.evaluate(() => window.__spellUI.open());
      await page.locator('#spellbook .omBack').click();
      check('Close closes overlay', await page.locator('#spellbook').count() === 0);
      await page.evaluate(() => window.__game.home.library.stop());
      check('ambient pauses on stop', await page.locator('.lbMagic i').first().evaluate(e => getComputedStyle(e).animationPlayState === 'paused'));
      await page.evaluate(() => window.__game.home.library.start());
      check('ambient resumes on start', await page.locator('.lbMagic i').first().evaluate(e => getComputedStyle(e).animationPlayState === 'running'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !!window.__game?.home);
      await page.evaluate(() => { window.__game.home.open(); window.__game.home.show('spells'); });
      check('rank survives reload', await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')).spellbook.ranks.heal === 2));
      await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active, null, { timeout: 120000 });
      await page.waitForFunction(async () => (await caches.match('ui/spells-study.png')) !== undefined, null, { timeout: 120000 });
      await context.setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !!window.__game?.home);
      await page.evaluate(() => { window.__game.home.open(); window.__game.home.show('spells'); });
      await page.locator('.lbPainting').evaluate(img => img.decode());
      check('offline study and spellbook load', await page.locator('.sbSlots .sbSlot').count() === 4);
      check('offline parchment decodes', await page.evaluate(async () => { const img = new Image(); img.src = 'ui/spells-parchment.png'; await img.decode(); return img.naturalWidth > 1000; }));
      await context.setOffline(false);
      await page.locator('[data-spell="heal"] .rankUp').click();
      check('top rank removes rank action and retains focus', await page.locator('[data-spell="heal"] .rankUp').count() === 0 && await page.locator('[data-spell="heal"] .sbEquip').evaluate(e => document.activeElement === e));
      check('zero marks disables further rank spending', await page.locator('.sbMarks summary').innerText().then(text => text.includes('0 school marks')) && await page.locator('[data-spell="shield"] .rankUp').isDisabled());
      await page.addScriptTag({ content: preview.outputFiles[0].text });
      await page.evaluate(() => { const g = window.__game; g.meta.spellbook.owned = [...window.__spellUI.ids]; g.home.library.update(g.meta); });
      await page.locator('.sbFilter').filter({ hasText: 'Locked' }).click();
      check('complete collection has clear empty state', await page.locator('.sbCard').count() === 0 && await page.locator('.sbComplete').isVisible());
    }
    check(`no page errors ${w}`, errors.length === 0);
    await context.close();
    const locked = await open(w, h, true);
    check(`Chapel gate ${w}`, await locked.page.locator('.lbLock').isVisible() && !await locked.page.locator('.lbPage').isVisible());
    await locked.page.screenshot({ path: `${out}/chapel-gate-${w}.png` });
    await locked.page.locator('.lbGo').click();
    check(`Chapel gate navigates to Castle ${w}`, await locked.page.evaluate(() => window.__game.home.tab === 'castle'));
    await locked.context.close();
  }
  }
} catch (error) {
  results.push({ name: 'browser run completed', ok: false, error: String(error) });
  throw error;
} finally {
  writeFileSync(`${out}/${process.argv.includes('--visual') ? 'visual-checks' : 'checks'}.json`, JSON.stringify(results, null, 2));
  await browser.close();
  server.close();
}
if (results.some(r => !r.ok)) process.exitCode = 1;
