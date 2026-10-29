// STATUS-FX phase B screenshots (docs/notes/status-fx.md): real army fights with the ailments as the game lays them, held still at the
// moment that shows them: a fight with several at once, a frozen foe's shatter, a fire-proof foe's "Immune", and the same fight with
// reduced motion; at 393x852, 360x780 and 412x915. After `npm run web`:
//   node tools/status-fx/shots.mjs             every size        SIZES=393x852 node tools/status-fx/shots.mjs     one
// The party is set on the page (a level-30 save of the heroes that lay ailments); the spells are cast by tapping the board as a player does.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = 8283;
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
const SIZES = (process.env.SIZES ?? '393x852,360x780,412x915').split(',').map((s) => s.split('x').map(Number));
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
let errors = 0;

async function open(w, h, calm, party) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: false, reducedMotion: calm ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  const owned = [...new Set([...party, 'knight', 'archer'])];
  await page.addInitScript(([owned, party, xp]) => {
    if (sessionStorage.getItem('sfx-set')) return;
    sessionStorage.setItem('sfx-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [owned, party, xpAt(30)]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  return { ctx, page };
}

/** Into an army's wave with `party` placed by the Auto button, and the fight begun. */
async function armyWave(page, army, wave, party) {
  await page.evaluate(([army, wave, party]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'army', army }, stage: wave, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, [army, wave, party]);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('fight').click());
}

/** Until the two sides have met (a hero and a foe within two tiles), or 25 s. */
const engaged = (page) => page.waitForFunction(() => {
  const u = window.__game.b.units.filter((x) => x.alive);
  return u.some((h) => h.side === 'hero' && u.some((f) => f.side === 'foe' && Math.max(Math.abs(f.u - h.u), Math.abs(f.v - h.v)) <= 2));
}, null, { timeout: 25000, polling: 200 }).catch(() => {});

/** The page position of a fighter's feet. */
const feetOf = (page, id) => page.evaluate((id) => {
  const g = window.__game;
  const r = g.app.canvas.getBoundingClientRect();
  const c = r.width / g.app.screen.width;
  const p = g.sprites.get(id).root.getGlobalPosition();
  return { x: r.left + p.x * c, y: r.top + p.y * c };
}, id);

/** Cast a king's spell on a foe's tile as a player does: choose it, then tap the board there. */
async function cast(page, id, foe) {
  await page.evaluate((id) => { const g = window.__game; g.b.spells.mana = 10; g.b.spells.ready[id] = 0; g.spell = id; }, id);
  const at = await feetOf(page, foe);
  await page.mouse.click(at.x, at.y - 4);
}

/** Hold the fight still once `test` holds (checked every frame), or after `ms`. */
async function holdWhen(page, test, ms, arg = null) {
  try {
    await page.waitForFunction(test, arg, { timeout: ms, polling: 'raf' });
  } catch { /* the moment did not come: hold where it is */ }
  await page.evaluate(() => { window.__game.sceneHold = 1; });
  await page.waitForTimeout(250);
}
const foes = (page) => page.evaluate(() => window.__game.b.units.filter((u) => u.alive && u.side === 'foe').map((u) => u.id));
/** The camera close on the fight's middle (the heroes and the nearest foes). */
const closeIn = (page, zoom) => page.evaluate((zoom) => {
  const g = window.__game;
  const live = g.b.units.filter((u) => u.alive).map((u) => g.sprites.get(u.id)).filter(Boolean);
  live.sort((a, b) => a.y - b.y);
  const mid = live.slice(Math.floor(live.length * 0.2));
  g.manualCam = true;
  g.tx = g.cx = mid.reduce((n, s) => n + s.x, 0) / mid.length;
  g.ty = g.cy = mid.reduce((n, s) => n + s.y, 0) / mid.length - 20;
  g.zoom = g.tzoom = zoom;
}, zoom);
const label = (page, text) => page.evaluate((text) => window.__game.fx.shownLabels.some((o) => !o.destroyed && o.text === text && o.alpha > 0.6), text);

const PARTY = ['wizard', 'lightningMage', 'samurai', 'warlock', 'shambler'];
for (const [w, h] of SIZES) {
  const size = `${w}x${h}`;
  // 1. The Beast Packs: the heroes burn, shock, bleed, curse and poison the wolves, the wolves bite the heroes bleeding,
  //    the meteor burns, Chain Lightning shocks.
  for (const calm of size === '393x852' ? [false, true] : [false]) {
    const { ctx, page } = await open(w, h, calm, PARTY);
    await armyWave(page, process.env.ARMY ?? 'infernal', Number(process.env.WAVE ?? 5), PARTY);
    await engaged(page);
    const f = await foes(page);
    if (f.length) await cast(page, 'meteor', f[0]);
    await page.waitForTimeout(1200);
    if (f.length > 1) await cast(page, 'chain', f[f.length - 1]);
    await page.waitForTimeout(900);
    await closeIn(page, 2.1);
    await holdWhen(page, (need) => window.__game.b.units.filter((u) => u.alive && (u.ail ?? []).some((a) => a.until > window.__game.b.t)).length >= need, 12000, Number(process.env.NEED ?? 5));
    await page.screenshot({ path: `docs/samples/status-fx-fight-${size}${calm ? '-calm' : ''}.png` });
    console.log(size, calm ? 'calm' : '', 'fight', await page.evaluate(() => window.__game.b.units.filter((u) => u.alive).map((u) => `${u.def}:${(u.ail ?? []).filter((a) => a.until > window.__game.b.t).map((a) => a.kind).join('+')}`).join(' ')));
    await ctx.close();
  }
  if (size !== '393x852') continue;
  // 2. A frozen foe shatters: Deep Freeze on the sturdiest, and the heroes' next heavy blow breaks the ice.
  {
    const { ctx, page } = await open(w, h, false, PARTY);
    await armyWave(page, 'ogres', 3, PARTY);
    await engaged(page);
    for (let i = 0; i < 6; i++) {
      const f = await foes(page);
      if (!f.length) break;
      await cast(page, i % 2 ? 'deepfreeze' : 'frost', f[i % f.length]);
      await closeIn(page, 2.2);
      try {
        await page.waitForFunction(() => window.__game.fx.shownLabels.some((o) => !o.destroyed && o.text === 'SHATTER'), null, { timeout: 2500, polling: 'raf' });
        // (held, and the camera on the shattered foe)
        await page.evaluate(() => {
          const g = window.__game;
          g.sceneHold = 1;
          const o = g.fx.shownLabels.find((o) => !o.destroyed && o.text === 'SHATTER');
          g.manualCam = true;
          g.tx = g.cx = o.x;
          g.ty = g.cy = o.y + 30;
          g.zoom = g.tzoom = 2.6;
        });
        break;
      } catch { /* no shatter yet: freeze another */ }
    }
    await page.waitForTimeout(250);
    console.log(size, 'shatter shown:', await label(page, 'SHATTER'));
    await page.screenshot({ path: `docs/samples/status-fx-shatter-${size}.png` });
    await ctx.close();
  }
  // 3. The Infernal Host: imps and demons are fire beings, so the Fire Wizard's fire does not take ("Immune").
  {
    const { ctx, page } = await open(w, h, false, PARTY);
    await armyWave(page, 'infernal', 2, PARTY);
    await engaged(page);
    await closeIn(page, 2.2);
    await holdWhen(page, () => window.__game.fx.shownLabels.some((o) => !o.destroyed && o.text === 'Immune' && o.alpha > 0.8), 12000);
    console.log(size, 'immune shown:', await label(page, 'Immune'));
    await page.screenshot({ path: `docs/samples/status-fx-immune-${size}.png` });
    await ctx.close();
  }
}
console.log('page errors', errors);
await browser.close();
srv.close();
