// BATTLE-HUD mock-up screenshots (docs/notes/battle-hud.md). After `npm run web`:
//   node tools/battle-hud/shots.mjs [now|a|b|c ...]   a level-30 party mid-fight at 393x852 (meter filling, one ready, a skill popover, a cast,
//                                                     the king's spells in their new home), then each variant's main view at 360x780 and 412x915
// Each variant is the page with `?hud=a|b|c`; "now" is the page as it is, for the board-height comparison.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = 8861;
const root = 'out/web';
const SCRATCH = process.env.HUD_SCRATCH;
const want = process.argv.slice(2).length ? process.argv.slice(2) : ['now', 'a', 'b', 'c'];
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
let errors = 0;
const PARTY = ['knight', 'cleric', 'wizard', 'archer', 'samurai'];

async function open(w, h, hud) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  const owned = [...new Set([...PARTY, 'knight', 'archer'])];
  await page.addInitScript(([owned, party, xp]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('hud-set')) return;
    sessionStorage.setItem('hud-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [owned, PARTY, xpAt(32)]);
  await page.goto(`http://localhost:${PORT}/${hud === 'now' ? '' : `?hud=${hud}`}`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  return { ctx, page };
}

async function fight(page) {
  await page.evaluate(([party]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: 3, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: i === 1 ? 3 : i === 2 ? 2 : 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, [PARTY]);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForFunction(() => {
    const u = window.__game.b.units.filter((x) => x.alive);
    return u.some((h) => h.side === 'hero' && u.some((f) => f.side === 'foe' && Math.max(Math.abs(f.u - h.u), Math.abs(f.v - h.v)) <= 2));
  }, null, { timeout: 25000, polling: 200 }).catch(() => {});
  await page.waitForTimeout(1500);
}

/** Hold the fight and set the meters: the second hero's full (TAP), the first's 70%, the rest part way; the pools part way. */
async function stage(page) {
  await page.evaluate(() => {
    const g = window.__game;
    g.sceneHold = 1;
    const hs = g.b.units.filter((u) => u.side === 'hero' && u.owner === undefined);
    const fills = [70, 100, 35, 85, 15];
    hs.forEach((u, i) => { u.charge2 = fills[i % 5]; u.charge = [80, 30, 55, 100, 12][i % 5]; u.hp = Math.round(u.maxHp * [0.9, 0.62, 0.4, 0.75, 0.25][i % 5]); });
    g.b.spells.mana = 7;
    g.heroBar.refresh(g.b);
    g.hudMock?.refresh(g.b);
  });
  await page.waitForTimeout(500);
}

async function measure(page) {
  return page.evaluate(() => {
    const g = window.__game;
    const p = document.getElementById('panel').getBoundingClientRect();
    return { panelTop: Math.round(p.top), areaH: Math.round(g.area.h), scale: +g.scale.toFixed(3) };
  });
}

const out = [];
const shot = async (page, name) => {
  const path = `docs/samples/battle-hud-${name}.png`;
  await page.screenshot({ path });
  out.push(path);
};

for (const hud of want) {
  const tag = hud === 'now' ? 'now' : hud;
  {
    const { ctx, page } = await open(393, 852, hud);
    await fight(page);
    await stage(page);
    console.log(hud, '393x852', JSON.stringify(await measure(page)));
    await shot(page, `${tag}-393`);
    if (hud !== 'now') {
      // (a skill name tapped: its popover, the fight held)
      // (the second hero's, a tier 3 hero, so the sheet shows the tier it has reached; layout C chooses it first)
      await page.evaluate(() => document.querySelectorAll('.hmMini')[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      await page.evaluate(() => document.querySelectorAll('.hm:not(.hmMini)')[1].querySelector('[data-hud-skill="1"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      await page.waitForTimeout(400);
      await shot(page, `${tag}-popover-393`);
      await page.evaluate(() => window.__game.hudMock?.closeInfo());
      await page.waitForTimeout(200);
      // (the cast moment: the fourth hero (the wizard) casts its skill 1, played through the HUD's own hook)
      await page.evaluate(() => {
        const g = window.__game;
        const u = g.b.units.filter((x) => x.side === 'hero' && x.owner === undefined)[3];
        g.hudMock?.demoCast(u.id, 1);
      });
      // (the effects are frozen a third of the way in, so the slow software capture shows the moment)
      await page.evaluate(() => new Promise((r) => setTimeout(() => { for (const a of document.getAnimations()) a.currentTime = 300; for (const a of document.getAnimations()) a.pause(); r(); }, 50)));
      await shot(page, `${tag}-cast-393`);
      await page.evaluate(() => { window.__game.hudMock?.clearFx(); for (const a of document.getAnimations()) a.play(); });
      await page.waitForTimeout(300);
      // (the king's spells opened in their new home)
      await page.evaluate(() => window.__game.hudMock?.demoSpells());
      await page.waitForTimeout(400);
      await shot(page, `${tag}-spells-393`);
    }
    await ctx.close();
  }
  for (const [w, h] of [[360, 780], [412, 915]]) {
    const { ctx, page } = await open(w, h, hud);
    await fight(page);
    await stage(page);
    console.log(hud, `${w}x${h}`, JSON.stringify(await measure(page)));
    await shot(page, `${tag}-${w}`);
    await ctx.close();
  }
}
if (SCRATCH) {
  mkdirSync(SCRATCH, { recursive: true });
  for (const p of out) copyFileSync(p, `${SCRATCH}/${p.split('/').pop()}`);
}
console.log('page errors:', errors);
await browser.close();
srv.close();
