// HUD-FACES screenshots (docs/notes/hud-faces.md; a copy of tools/battle-hud/shots.mjs with the scenes the faces show in). After `npm run web`:
//   ROOT=out/web node tools/hud-faces/shots.mjs [prefix] [scene ...]
// Scenes: fight (mid-wave, the hero rows), awake (the same with two heroes awakened), info (a hero's info card), calamity (ten heroes in two
// columns), stand (the Last Stand's eight), standsheet (the Last Stand paused: its sheet of rows). Each at 393x852, 360x780 and 412x915
// (`SIZES=393` for one size). Writes docs/samples/<prefix>-<scene>-<w>.png (prefix `hud-faces-after`) and counts the painted faces.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 9022);
const root = process.env.ROOT ?? 'out/web';
const args = process.argv.slice(2);
// (the ultimate's moment, ULT-CUTIN: `node tools/battle-hud/shots.mjs ult-cutin slash name dim linger short`)
const ULT_SCENES = ['slash', 'name', 'dim', 'linger', 'short'];
const prefix = args[0] && ![...SCENES(), ...ULT_SCENES].includes(args[0]) ? args.shift() : 'hud-faces-after';
const want = args.length ? args : SCENES();
function SCENES() { return ['fight', 'awake', 'info', 'calamity', 'stand', 'standsheet']; }
const SIZES = (process.env.SIZES ?? '393,360,412').split(',').map((w) => ({ 393: [393, 852], 360: [360, 780], 412: [412, 915] })[w]);
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
// (MP casters (the Lightning Mage, the Warlock), a blood-cost hero (the Barbarian), a monster hero (the Werewolf) and a summoner (the Beastmaster))
const KITS = ['barbarian', 'lightningMage', 'warlock', 'werewolf', 'beastmaster'];
const STAND = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'ranger'];
const ALL = [...new Set([...PARTY, ...KITS, ...STAND])];

async function open(w, h, extra = {}) {
  // (the awake scene: the second and fourth heroes of the party awakened)
  if (extra === 'awake') extra = { awakened: { cleric: 1, archer: 1 }, shards: { cleric: 9999, archer: 9999 } };
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, party, xp, extra]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('hud-set')) return;
    sessionStorage.setItem('hud-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'], ...extra }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [ALL, PARTY, xpAt(32), extra]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  return { ctx, page };
}

/** Into an army run's wave 3 with `party` (deployed by Auto); `go` starts the fight and waits until the two sides meet. */
async function army(page, party, go = true, mode = { kind: 'army', army: 'beasts' }) {
  await page.evaluate(([party, mode]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode, stage: 3, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: i === 1 ? 3 : i === 2 ? 2 : 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, [party, mode]);
  await page.waitForTimeout(700);
  if (go) await fight(page);
}

async function fight(page) {
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForFunction(() => {
    const u = window.__game.b.units.filter((x) => x.alive);
    return u.some((h) => h.side === 'hero' && u.some((f) => f.side === 'foe' && Math.max(Math.abs(f.u - h.u), Math.abs(f.v - h.v)) <= 2));
  }, null, { timeout: 25000, polling: 200 }).catch(() => {});
  await page.waitForTimeout(1500);
}

/** Hold the fight and set the meters: the second hero's full (TAP), the rest part way; the pools part way; one skill cooling. */
async function stage(page, viewKey = null) {
  await page.evaluate((viewKey) => {
    const g = window.__game;
    const v = viewKey ? g[viewKey] : g;
    const b = viewKey ? v.state.b : g.b;
    if (viewKey) v.paused = true;
    else g.sceneHold = 1;
    const hs = b.units.filter((u) => u.side === 'hero' && u.owner === undefined && u.def !== 'king');
    const fills = [70, 100, 35, 85, 15];
    hs.forEach((u, i) => { u.charge2 = fills[i % 5]; u.charge = [80, 30, 55, 100, 12][i % 5]; u.hp = Math.round(u.maxHp * [0.9, 0.62, 0.4, 0.75, 0.25][i % 5]); });
    if (hs[3]) { hs[3].ks ??= {}; hs[3].ks.at1 = b.t - 1200; }
    if (b.spells) b.spells.mana = 7;
    (viewKey ? v.hud : g.hud)?.refresh(b);
  }, viewKey);
  await page.waitForTimeout(500);
}

async function measure(page) {
  return page.evaluate(() => {
    const p = document.getElementById('panel').getBoundingClientRect();
    const t = document.getElementById('top').getBoundingClientRect();
    const o = document.getElementById('hudSpells')?.getBoundingClientRect();
    return { top: Math.round(t.bottom), panelTop: Math.round(p.top), room: Math.round(p.top - t.bottom), orbsBottom: o ? Math.round(o.bottom) : null };
  });
}

/** Put the battle-ui tools' saved Calamity (a roster of ten) into the page's storage. */
async function calamitySave(page) {
  const esbuild = await import('esbuild');
  mkdirSync('out/shots', { recursive: true });
  await esbuild.build({ entryPoints: ['tools/battle-ui/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/bu-saves.mjs', logLevel: 'error' });
  const S = await import('../../out/shots/bu-saves.mjs');
  await page.evaluate((json) => localStorage.setItem('legends.calamity', json), JSON.stringify(S.big(11)));
  await page.reload();
  await page.waitForFunction(() => document.getElementById('hmCalamity'), {}, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
}

const shot = async (page, name, w) => {
  const path = `docs/samples/${prefix}-${name}-${w}.png`;
  await page.screenshot({ path });
  console.log('  wrote', path);
};
const tap = (page, sel, i = 0) => page.evaluate(([sel, i]) => document.querySelectorAll(sel)[i]?.dispatchEvent(new MouseEvent('click', { bubbles: true })), [sel, i]);

for (const [w, h] of SIZES) {
  for (const scene of want) {
    const { ctx, page } = await open(w, h, scene === 'awake' ? 'awake' : {});
    try {
      if (scene === 'deploy') {
        await army(page, PARTY, false);
      } else if (scene === 'awake') {
        await army(page, PARTY);
        await stage(page);
      } else if (scene === 'info') {
        await army(page, PARTY);
        await stage(page);
        await page.evaluate(() => { const g = window.__game; g.openInfo(g.b.units.find((u) => u.side === 'hero' && u.def === 'knight')); });
        await page.waitForTimeout(500);
      } else if (scene === 'fight' || scene === 'sheet' || scene === 'ult' || scene === 'cast' || scene === 'spells') {
        await army(page, PARTY);
        await stage(page);
        if (scene === 'sheet') {
          // (the second hero's skill 1: a tier 3 hero, so the sheet shows the tier it has reached)
          await tap(page, '.fhRow [data-skill="1"]', 1);
        } else if (scene === 'ult') {
          await tap(page, '.fhRow [data-skill="2"]', 1);
          await page.waitForTimeout(150);
          await tap(page, '.fsTabs [data-tab="ult"]');
        } else if (scene === 'cast') {
          await page.evaluate(() => {
            const g = window.__game;
            const u = g.b.units.filter((x) => x.side === 'hero' && x.owner === undefined)[3];
            g.hud.demoCast(u.id, 1);
          });
          // (the effects frozen part way in, so the slow software capture shows the moment)
          await page.evaluate(() => new Promise((r) => setTimeout(() => { for (const a of document.getAnimations()) { a.currentTime = 320; a.pause(); } r(); }, 50)));
        } else if (scene === 'spells') {
          await page.evaluate(() => { window.__game.b.spells.mana = 10; });
          await tap(page, '#spellCards .spell', 0);
        }
      } else if (ULT_SCENES.includes(scene)) {
        if (scene === 'short') await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('legends.settings')); s.ultFull = false; localStorage.setItem('legends.settings', JSON.stringify(s)); });
        if (scene === 'short') { await page.reload(); await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 }); await page.waitForTimeout(1200); await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, #quip { display: none !important; }' }); }
        await army(page, PARTY);
        // (the hero who fires: the samurai (an instant blow) for the slash, the name and the held board; the knight (a lasting aura) for the resume)
        const pick = scene === 'linger' ? 'cleric' : 'samurai';
        await page.evaluate((pick) => {
          const g = window.__game;
          const hs = g.b.units.filter((u) => u.side === 'hero' && u.owner === undefined);
          for (const u of hs) u.charge2 = 0;
          const u = hs.find((h) => h.def === pick);
          u.charge2 = 100;
          document.querySelector(`.fhRow[data-unit="${u.id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }, pick);
        if (scene === 'short') {
          await page.waitForSelector('.fhCutIn.ult', { timeout: 8000 });
          await page.evaluate(() => { for (const a of document.getAnimations()) { a.currentTime = 400; a.pause(); } });
        } else {
          await page.waitForFunction(() => window.__game.ultm.queue.phase === 'open', null, { timeout: 8000, polling: 20 });
          // (the moment frozen where the picture wants it: its queue stopped, its animations set to a time)
          const at = { slash: ['open', 90], name: ['open', 700], dim: ['impact', 1100], linger: ['fade', 1100] }[scene];
          await page.evaluate(([phase, ms]) => {
            const q = window.__game.ultm.queue;
            q.step = () => q.phase;
            q.phase = phase;
            if (phase === 'fade') q.left = 300;
            for (const a of document.getAnimations()) { a.currentTime = ms; a.pause(); }
          }, at);
          if (scene === 'dim' || scene === 'linger') await page.waitForTimeout(scene === 'dim' ? 450 : 1200);
          await page.evaluate((ms) => { for (const a of document.getAnimations()) { a.currentTime = ms; a.pause(); } }, at[1]);
        }
      } else if (scene === 'kits') {
        await army(page, KITS);
        await stage(page);
      } else if (scene === 'daily') {
        await page.evaluate(() => document.getElementById('hmDaily').click());
        await page.waitForTimeout(600);
        await page.evaluate(() => document.querySelector('.dayBtns .primary').click());
        await page.waitForTimeout(1200);
        await page.evaluate(() => { const g = window.__game; g.run.stage = 4; g.newBattle(); document.getElementById('auto').click(); });
        await page.waitForTimeout(600);
        await fight(page);
        await stage(page);
      } else if (scene === 'calamity') {
        // (a Calamity fight with a roster of ten (the battle-ui tools' save): the reveal scene skipped, then into the Rift)
        await calamitySave(page);
        await page.evaluate(() => document.getElementById('hmCalamity').click());
        await page.waitForTimeout(1500);
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Skip' && b.offsetParent)?.click());
          await page.waitForTimeout(1200);
        }
        await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Enter the Rift')?.click());
        await page.waitForTimeout(3500);
        await page.evaluate(() => document.getElementById('auto').click());
        await page.waitForTimeout(500);
        console.log('  calamity placed', await page.evaluate(() => window.__game.b.units.filter((u) => u.side === 'hero').length));
        await fight(page);
        await stage(page);
      } else if (scene === 'stand' || scene === 'standsheet') {
        await page.evaluate((party) => {
          const m = JSON.parse(localStorage.getItem('legends.meta'));
          m.unlocked = [...new Set([...m.unlocked, ...party])];
          localStorage.setItem('legends.meta', JSON.stringify(m));
          localStorage.removeItem('legends.stand');
        }, STAND);
        await page.reload();
        await page.waitForFunction(() => document.getElementById('hmTower'), {}, { timeout: 60000 });
        await page.waitForTimeout(1200);
        await page.evaluate(() => document.getElementById('tipSkip')?.click());
        await page.evaluate(() => document.getElementById('hmTower').click());
        await page.waitForTimeout(1200);
        if (await page.evaluate(() => !!document.querySelector('.stPick:not([hidden])'))) {
          await page.evaluate(() => [...document.querySelectorAll('.stPick button')].find((b) => b.textContent === 'Auto fill')?.click());
          await page.evaluate(() => document.querySelector('.stPick .primary').click());
          await page.waitForTimeout(800);
        }
        await page.evaluate(() => { const st = window.__game.stand; st.debugJump(3, 32); });
        await page.evaluate(() => document.querySelector('.stStart').click());
        await page.waitForTimeout(6000);
        await stage(page, 'stand');
        if (scene === 'standsheet') {
          await page.evaluate(() => window.__game.stand.setPaused(true));
          await page.waitForTimeout(500);
        }
      }
      await page.waitForTimeout(400);
      await page.waitForTimeout(1200);
      console.log(scene, `${w}x${h}`, JSON.stringify(await page.evaluate(() => ({ faces: document.querySelectorAll('canvas.heroFace').length, rows: document.querySelectorAll('.fhRow').length, rowH: [...new Set([...document.querySelectorAll('.fhRow')].map((r) => Math.round(r.getBoundingClientRect().height)))] }))));
      await shot(page, scene, w);
    } catch (e) {
      errors++;
      console.log('FAILED', scene, w, String(e.message).split('\n')[0]);
    }
    await ctx.close();
  }
}
console.log('page errors:', errors);
await browser.close();
srv.close();
