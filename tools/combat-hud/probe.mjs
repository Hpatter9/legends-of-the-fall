// COMBAT-HUD: the fight screen's overlap probe (docs/notes/combat-hud.md). After `npm run web`:
//   node tools/combat-hud/probe.mjs [--shots <prefix>]
// It plays real fights in the built page at 393x852, 360x780 and 412x915, with a party of five (an army run) and of eight (the Calamity),
// and at five moments: the fight's start, mid-fight, a boss wave, just after a tap on the tactic button and an ultimate's moment. At each it measures the bounding
// box of every element of the fight screen (the top bar's parts, the spell orbs, Auto, the mana, the War Horn, the tactic button and its word,
// the hero rows, their bars, names and skill chips, the boss bar, the twist and combo bars, toasts, the skill cut-ins, the ultimate's and the
// boss's showcase words, the speed button and the rest) and prints every pair that intersects. A text span is measured by its text, not its box.
// With --shots it also writes docs/samples/combat-hud/<prefix>-<scene>-<w>.png. Exits 1 when any overlap is found.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 8652);
const args = process.argv.slice(2);
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const SIZES = (process.env.SIZES ?? '393,360,412').split(',').map((w) => ({ 393: [393, 852], 360: [360, 780], 412: [412, 915] })[w]);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = (process.env.ROOT ?? 'out/web') + '/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
if (shots) mkdirSync('docs/samples/combat-hud', { recursive: true });

const PARTY = ['knight', 'cleric', 'wizard', 'archer', 'samurai'];
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));

/** The fight screen's parts: a name and a selector each; `text` measures the text inside rather than the box. */
const PARTS = [
  ['lives', '#top #lives'], ['gold', '#top #gold'], ['clock', '#top #clock'], ['mute', '#top #mute'], ['gear', '#top #gear'], ['speed', '#top #speed'],
  ['status', '#top #status', 'text'], ['version', '#version', 'text'],
  ['mana', '#hudSpells #mana'], ['orb', '#spellCards > *'], ['auto', '#hudSpells .fhAuto'], ['horn', '.ehHorn'],
  ['tactic', '#tacticBtn'], ['tacticWord', '#tacticWord.up'],
  ['bossBar', '#bossBar'], ['twist', '#twistBanner'], ['combo', '#comboBar'], ['synergies', '#synCol'], ['autoBar', '#autoBar'], ['phase', '#phaseBanner'],
  ['heroRow', '.fhRow'], ['heroName', '.fhRow .fhName', 'text'], ['heroBar', '.fhRow .fhBar'], ['chip', '.fhRow .fhChip'], ['portrait', '.fhRow .fhPic'],
  ['bench', '#panel #benchWrap'], ['panel', '#panel'],
  ['toast', '.toast.show'], ['cutIn', '.fhCutIn'], ['ultWords', '.umWords'], ['bossWords', '.bmWords'], ['quip', '#quip'], ['bossCard', '#bossCard'],
];

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: shots ? 2 : 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(([owned, xp]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('probe-set')) return;
    sessionStorage.setItem('probe-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: { orcs: { clears: 1 }, undead: { clears: 1 }, beasts: { clears: 1 }, wildwood: { clears: 1 } }, featuresTold: ['autoMerge', 'autoPlace'], armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [PARTY, xpAt(32)]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  // (the tutorial's counsel card is a lesson laid over the screen on purpose, not a part of the HUD)
  await page.addStyleTag({ content: '#tip { display: none !important; }' });
  return { ctx, page };
}

/** An army run of five at `stage` (the boss's wave when `boss`), placed by Auto. */
async function army(page, boss) {
  await page.evaluate(([party, boss]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: 3, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 2, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    if (boss) {
      for (let s = 1; s <= 20; s++) {
        g.run.stage = s;
        g.newBattle();
        if (g.b.units.some((u) => u.side === 'foe' && (u.size ?? 1) > 1)) break;
      }
      g.endIntro?.();
    }
    g.autoArrange(true);
  }, [PARTY, boss]);
  await page.waitForTimeout(700);
}

/** A Calamity run of eight (the battle-ui tools' save of ten, cut to eight), into the Rift and placed by Auto. */
async function calamity(page) {
  const esbuild = await import('esbuild');
  mkdirSync('out/shots', { recursive: true });
  await esbuild.build({ entryPoints: ['tools/battle-ui/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/bu-saves.mjs', logLevel: 'error' });
  const S = await import('../../out/shots/bu-saves.mjs');
  const run = S.big(11);
  run.roster = run.roster.slice(0, 8);
  run.squad = (run.squad ?? []).filter((id) => run.roster.some((h) => h.id === id));
  await page.evaluate((json) => localStorage.setItem('legends.calamity', json), JSON.stringify(run));
  await page.reload();
  await page.waitForFunction(() => document.getElementById('hmCalamity'), {}, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip { display: none !important; }' });
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
  return page.evaluate(() => window.__game.b.units.filter((u) => u.side === 'hero' && u.owner === undefined).length);
}

const fight = (page) => page.evaluate(() => { window.__game.endIntro?.(); document.getElementById('fight').click(); });

/** Every part's boxes, and every pair of them that intersects (a part inside another, as a chip in its row, is not an overlap). */
async function probe(page) {
  return page.evaluate((PARTS) => {
    const seen = [];
    for (const [name, sel, how] of PARTS) {
      document.querySelectorAll(sel).forEach((e, i) => {
        if (e.closest('[hidden]')) return;
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
        for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || +s.opacity < 0.05) return; }
        let r = e.getBoundingClientRect();
        if (how === 'text') {
          const g = document.createRange();
          g.selectNodeContents(e);
          r = g.getBoundingClientRect();
        }
        if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return;
        seen.push({ name: `${name}${document.querySelectorAll(sel).length > 1 ? `[${i}]` : ''}`, e, r: { l: r.left, t: r.top, r: r.right, b: r.bottom } });
      });
    }
    const hits = [];
    for (let i = 0; i < seen.length; i++)
      for (let j = i + 1; j < seen.length; j++) {
        const a = seen[i], b = seen[j];
        if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
        const w = Math.min(a.r.r, b.r.r) - Math.max(a.r.l, b.r.l);
        const h = Math.min(a.r.b, b.r.b) - Math.max(a.r.t, b.r.t);
        if (w >= 1 && h >= 1) hits.push(`${a.name} x ${b.name} (${Math.round(w)}x${Math.round(h)} px)`);
      }
    const box = (n) => seen.find((s) => s.name === n)?.r;
    return { parts: seen.length, hits, tactic: box('tactic'), word: box('tacticWord'), panelTop: box('panel')?.t };
  }, PARTS);
}

let total = 0;
for (const [w, h] of SIZES) {
  for (const party of [5, 8]) {
    const scenes = party === 5 ? ['start', 'mid', 'boss', 'tap', 'ult'] : ['start', 'mid', 'tap'];
    for (const scene of scenes) {
      const { ctx, page } = await open(w, h);
      if (party === 5) await army(page, scene === 'boss');
      else console.log(`  (calamity placed ${await calamity(page)})`);
      await fight(page);
      if (scene === 'start') await page.waitForTimeout(700);
      else await page.waitForTimeout(scene === 'boss' ? 2500 : 4500);
      if (scene === 'tap') {
        await page.evaluate(() => document.getElementById('tacticBtn')?.click());
        await page.waitForTimeout(250);
      }
      // (an ultimate's moment: a hero's ultimate filled and tapped on its row, its words caught as they show)
      if (scene === 'ult') {
        await page.evaluate(() => {
          const g = window.__game;
          for (const u of g.b.units) if (u.side === 'hero' && u.alive) u.charge2 = 100;
          g.hud?.refresh(g.b);
        });
        await page.waitForTimeout(200);
        await page.evaluate(() => document.querySelector('.fhRow .fhPic')?.click());
        await page.waitForFunction(() => document.querySelector('.umWords, .fhCutIn'), null, { timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
      // (a toast in the lane as a fight shows one, so its place is measured too)
      if (scene === 'mid' || scene === 'boss') {
        // (the game's own toast: the deploy helpers' unlock lines, told again)
        await page.evaluate(() => { const g = window.__game; g.meta.featuresTold = []; g.tellUnlocks(); });
        await page.waitForTimeout(500);
      }
      const r = await probe(page);
      total += r.hits.length;
      console.log(`${w}x${h} party ${party} ${scene}: ${r.parts} parts, ${r.hits.length} overlaps${r.hits.length ? '\n    ' + r.hits.join('\n    ') : ''}`);
      if (shots) await page.screenshot({ path: `docs/samples/combat-hud/${shots}-${party}-${scene}-${w}.png` });
      await ctx.close();
    }
  }
}
console.log(total ? `${total} overlaps in all` : 'no overlaps');
await browser.close();
srv.close();
process.exit(total ? 1 : 0);
