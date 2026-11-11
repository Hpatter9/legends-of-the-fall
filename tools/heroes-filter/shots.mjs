// HEROES-FILTER: screenshots of the roster's Sort and Filter and of the War Council's Satchel and Plan drawer
// (docs/notes/heroes-filter.md). After `npm run web`:
//   node tools/heroes-filter/shots.mjs <label> [scene ...]
// Writes docs/samples/heroes-filter/<label>-<scene>-<w>.png at 393x852, 360x780 and 412x915, and prints anything in view that is
// wider than the screen or a tap target under 44 px in the new pieces.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [label = 'after', ...only] = process.argv.slice(2);
const PORT = Number(process.env.PORT ?? 8672);
const root = process.env.ROOT ?? 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css', svg: 'image/svg+xml' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const OUT = 'docs/samples/heroes-filter';
mkdirSync(OUT, { recursive: true });
const SIZES = (process.env.SIZES ?? '393,360,412').split(',').map((w) => ({ 393: [393, 852], 360: [360, 780], 412: [412, 915] })[w]);
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'peasant', 'ninjaMonk', 'wanderer', 'lightningMage', 'kitsune', 'karasu', 'yamabushi', 'werewolf', 'minotaur', 'satyr', 'gorgon', 'samuraiCommander', 'paladin', 'cleric', 'druid', 'barbarian', 'ranger', 'warlock', 'illusionist', 'gunslinger'];
const PARTY = ['knight', 'cleric', 'wizard', 'archer', 'samurai'];
const ARMIES = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'];
let errors = 0;

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, party, levels, armies]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('hf-set')) return;
    sessionStorage.setItem('hf-set', '1');
    localStorage.clear();
    const cleared = { waves: 15, best: 15, won: 15, clears: 1, stars: { 0: 11, 1: 9 }, met: { 0: 7, 1: 7, 2: 3 } };
    localStorage.setItem('legends.meta', JSON.stringify({
      seed: 7, crowns: 25000, stones: 40, unlocked: owned, party, pulls: 40, dry: 0, dryMythic: 0,
      castle: { treasury: 5, barracks: 5, armoury: 4, mageTower: 4, stable: 4, library: 5, smithy: 3, chapel: 3, watchtower: 3, hall: 2 }, chapel: true,
      shards: Object.fromEntries(owned.map((k, i) => [k, i % 4 === 0 ? 30 : i % 3])), stars: {}, xp: Object.fromEntries(owned.map((k, i) => [k, levels[i % levels.length]])),
      bestStage: 40, tower: 9, stand: 12, calamity: { best: 3, clears: 1 }, daily: {}, bosses: ['orcWarlord', 'lichKing'], achievements: ['firstWin'], armies: Object.fromEntries(armies.map((a) => [a, cleared])), armySeen: armies,
      stash: [], tomes: { small: 4, medium: 2, large: 1 }, opened: [...armies, 'tower', 'castle', 'calamity'], featuresTold: ['autoMerge', 'autoPlace'],
      satchel: { bandage: 4, draught: 2, stew: 1 }, satchelPick: { bandage: 2 },
      bonds: { 'knight|paladin': 130, 'cleric|knight': 45, 'archer|wizard': 20 }, scenes: ['opening'],
    }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('lotf-army-shown', '{}');
    localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false, speed: 1 }));
  }, [HEROES, PARTY, [32, 12, 45, 5, 21, 60, 1].map(xpAt), ARMIES]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 90000 });
  await page.waitForTimeout(1800);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page };
}

const ev = (page, fn, arg) => page.evaluate(fn, arg);
const wait = (page, ms = 700) => page.waitForTimeout(ms);
const click = async (page, sel, ms = 500) => { await ev(page, (s) => document.querySelector(s)?.click(), sel); await wait(page, ms); };
const clickText = async (page, sel, re, ms = 500) => { await ev(page, ([s, r]) => [...document.querySelectorAll(s)].find((e) => new RegExp(r).test(e.textContent || '') && e.getClientRects().length)?.click(), [sel, re]); await wait(page, ms); };
const home = async (page, tab) => {
  await ev(page, () => {
    document.querySelectorAll('.omVeil').forEach((e) => e.remove());
    for (const id of ['settings', 'party']) { const e = document.getElementById(id); if (e && !e.hidden) e.hidden = true; }
    window.__game.home.closeSheet?.();
    window.__game.home.open();
  });
  await wait(page, 500);
  if (tab) { await ev(page, (t) => window.__game.home.show(t), tab); await wait(page, 800); }
};
// (each roster scene starts from the plain list: the choice is remembered, so the last scene's is cleared first)
const roster = async (p) => { await home(p, 'heroes'); await ev(p, () => window.__game.home.openRoster()); await wait(p); await click(p, '.rosActive:not([hidden]) .rosClear', 300); };
const party = async (p) => { await home(p); await ev(p, () => window.__game.home.hooks.onArmy('orcs', 0)); await wait(p, 900); };
const foot = (p) => ev(p, () => { const b = document.getElementById('ptBody'); b.scrollTop = b.scrollHeight; });

const SCENES = {
  // ---- job 1: the roster ----
  'roster': roster,
  'roster-sort': async (p) => { await roster(p); await click(p, '.rosSortBtn'); },
  'roster-filter': async (p) => { await roster(p); await click(p, '.rosFilterBtn'); },
  'roster-sorted': async (p) => { await roster(p); await click(p, '.rosSortBtn'); await clickText(p, '#rosterSort .omChoice', '^Level'); await click(p, '#rosterSort .omBack'); },
  'roster-filtered': async (p) => { await roster(p); await click(p, '.rosFilterBtn'); await clickText(p, '#rosterFilter .omChoice', '^Shooter'); await clickText(p, '#rosterFilter .omChoice', 'Upgrade ready'); await click(p, '#rosterFilter .omBack'); },
  'roster-empty': async (p) => { await roster(p); await ev(p, () => { const s = document.querySelector('.rosterSearch input'); s.value = 'zzz'; s.dispatchEvent(new Event('input')); }); await wait(p, 300); },
  // ---- job 2: the War Council ----
  'party': party,
  'party-foot': async (p) => { await party(p); await foot(p); await wait(p, 300); },
  'party-satchel': async (p) => { await party(p); await click(p, '#ptPackTab', 700); },
  'party-plan': async (p) => { await party(p); await click(p, '#ptPackTab', 700); await clickText(p, '.ptPackTabs button', 'Plan'); },
};

for (const [w, h] of SIZES) {
  const { ctx, page } = await open(w, h);
  for (const [name, run] of Object.entries(SCENES)) {
    if (only.length && !only.includes(name)) continue;
    try {
      await run(page);
      await page.screenshot({ path: `${OUT}/${label}-${name}-${w}.png` });
      const bad = await ev(page, () => {
        const out = [];
        if (document.documentElement.scrollWidth > innerWidth) out.push(`page ${document.documentElement.scrollWidth} wide`);
        for (const e of document.querySelectorAll('.rosTools button, .rosTools input, .rosActive button, #ptPackTab, .ptPack button, .ptPackLine, #rosterSort button, #rosterFilter button')) {
          const r = e.getBoundingClientRect();
          if (!r.width) continue;
          if (r.right > innerWidth + 0.5 || r.left < -0.5) out.push(`${e.className || e.id} off the side (${Math.round(r.left)}..${Math.round(r.right)})`);
          if (r.height < 43.5) out.push(`${e.className || e.id} "${(e.textContent || '').trim().slice(0, 20)}" ${Math.round(r.height)} px tall`);
        }
        return out;
      });
      console.log(`${name} ${w}: ${bad.length ? [...new Set(bad)].join('; ') : 'ok'}`);
    } catch (e) { console.log(`${name} ${w}: FAILED ${e.message.split('\n')[0]}`); }
  }
  await ctx.close();
}
await browser.close();
srv.close();
console.log(errors ? `${errors} page errors` : 'no page errors');
