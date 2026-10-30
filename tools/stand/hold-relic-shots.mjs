// Holding the line pays a relic (STAND-HOLD-RELIC, docs/notes/stand-hold-relic.md): the choice card saying what holding pays, the relic
// announced as the hold is won, and the camp's Last Stand plate naming the wave and the room of the run left mid-way. `npm run web` first.
//   node tools/stand/hold-relic-shots.mjs [port]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8651);
const root = resolve('out/web');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.opus': 'audio/ogg', '.webp': 'image/webp', '.json': 'application/json' };
const server = createServer((req, res) => {
  const file = resolve(root, '.' + (req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
  try { res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream'); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
}).listen(port, '127.0.0.1');
mkdirSync('docs/samples', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const shot = (page, name) => page.screenshot({ path: `docs/samples/stand-hold-relic-${name}.png` });

async function open(w, h, reduced = false) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await context.addInitScript(() => {
    if (localStorage.getItem('legends.meta')) return;
    const heroes = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'ranger'];
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), opened: ['tower', 'castle'], pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((x) => [x, 2e7])), bestStage: 14, tower: 9, stand: 12, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
    localStorage.setItem('lotf-tips-off', '1');
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => { errors.push(`${w}x${h}: ${e.message}`); console.log('PAGE ERROR', e.message); });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game, {}, { timeout: 120000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { document.getElementById('tipSkip')?.click(); document.getElementById('hmTower').click(); });
  await page.waitForSelector('.stPick:not([hidden])');
  await page.evaluate(() => {
    [...document.querySelectorAll('.stPick button')].find((b) => b.textContent === 'Auto fill')?.click();
    document.querySelector('.stPick .primary').click();
  });
  await page.waitForFunction(() => window.__game.stand.state && window.__game.stand.hall.king);
  await page.addStyleTag({ content: '#quip, #tip { display: none !important; }' });
  await page.waitForTimeout(800);
  return { context, page };
}

/** Carry the run to the end of act `n` (wave 5n) and fight it out quickly, stopping at the choice. */
async function toChoice(page, wave) {
  await page.evaluate((wave) => { window.__frail = wave >= 10; window.__game.stand.debugJump(wave, 40); }, wave);
  await page.evaluate(() => {
    const s = window.__game.stand.state;
    if (s.phase === 'deploy') document.querySelector('.stStart').click();
    else document.querySelector('.stGo').click();
  });
  for (let i = 0; i < 400; i++) {
    const phase = await page.evaluate(() => {
      const st = window.__game.stand;
      if (st.state.phase === 'break') document.querySelector('.stGo').click();
      // (for the pictures only: the ruler is kept whole, so the jump to a late act does not end the run early)
      st.state.king.hp = st.state.king.maxHp;
      // (and the foes of a late act made frail after a while, so the jump to it is fought out quickly)
      if (window.__frail) for (const u of st.state.b.units) if (u.side === 'foe' && u.alive) u.hp = Math.min(u.hp, 1);
      if (st.state.phase === 'wave' || st.state.phase === 'break') st.debugRun(300);
      return st.state.phase;
    });
    if (phase === 'choice' || phase === 'over') return phase;
  }
  throw new Error('no choice came');
}


try {
  {
    const { context, page } = await open(393, 852);
    assert.equal(await toChoice(page, 5), 'choice');
    await page.waitForTimeout(500);
    const said = await page.evaluate(() => document.querySelector('.stChoiceHold small').textContent);
    assert.match(said, /\+\d+ gold and a relic/);
    await shot(page, 'choice-393x852');
    // (hold, and fight the bonus wave out quickly; the relic's plate shows as it is won)
    await page.evaluate(() => document.querySelector('.stChoiceHold').click());
    let seen = false;
    for (let i = 0; i < 400 && !seen; i++) {
      seen = await page.evaluate(() => {
        const st = window.__game.stand;
        st.state.king.hp = st.state.king.maxHp;
        for (const u of st.state.b.units) if (u.side === 'foe' && u.alive) u.hp = Math.min(u.hp, 1);
        if (st.state.phase === 'wave') st.debugRun(100);
        return !document.querySelector('.stGain').hidden;
      });
    }
    assert.ok(seen, 'the relic is announced');
    await page.waitForTimeout(700);
    const gain = await page.evaluate(() => ({ text: document.querySelector('.stGain').textContent, img: document.querySelector('.stGain img')?.complete, relics: window.__game.stand.state.run.heldRelics }));
    console.log('relic won:', gain);
    assert.equal(gain.relics.length, 1);
    await shot(page, 'relic-393x852');
    await page.waitForTimeout(900);
    await shot(page, 'relic-retreat-393x852');
    // (on to the library's break, where the run is saved; leave for the camp)
    await page.waitForFunction(() => !document.querySelector('.stTitle').hidden, {}, { timeout: 30000 });
    await page.evaluate(() => document.querySelector('.stTitle').click());
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(() => window.__game.stand.state.run.hall), 'library');
    await page.evaluate(() => document.querySelector('.stLeave').click());
    await page.evaluate(() => [...document.querySelectorAll('.stAsk button')].find((b) => b.textContent === 'Leave').click());
    await page.waitForTimeout(1500);
    const plate = await page.evaluate(() => document.querySelector('#hmTower .cpTag small')?.textContent);
    console.log('camp plate:', plate);
    assert.equal(plate, 'Wave 6 · Library · continue');
    await shot(page, 'camp-393x852');
    await context.close();
  }
  for (const [w, h] of [[360, 780], [412, 915]]) {
    const { context, page } = await open(w, h);
    assert.equal(await toChoice(page, 5), 'choice');
    await page.waitForTimeout(500);
    await shot(page, `choice-${w}x${h}`);
    await context.close();
  }
  console.log(errors.length ? `PAGE ERRORS: ${errors.length}` : '0 page errors');
} finally {
  await browser.close();
  server.close();
}
