// UI-CONSISTENCY: screenshots of every screen, menu, tab, sheet, card, pop-up and toast, and the fight HUD, from one well-on save
// (docs/notes/ui-consistency.md). After `npm run web`:
//   node tools/ui-consistency/shots.mjs <label> [scene ...]
// Writes docs/samples/ui-consistency/<label>-<scene>-<w>.png at 393x852 (SIZES=393,360,412 for all three) and prints, per scene, the
// measured rule breaks in view: tap targets under 44 px, text under 11 px, a fixed layer over the top bar.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [label = 'before', ...only] = process.argv.slice(2);
const PORT = Number(process.env.PORT ?? 8661);
const root = process.env.ROOT ?? 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css', svg: 'image/svg+xml' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const OUT = 'docs/samples/ui-consistency';
mkdirSync(OUT, { recursive: true });
const SIZES = (process.env.SIZES ?? '393').split(',').map((w) => ({ 393: [393, 852], 360: [360, 780], 412: [412, 915] })[w]);
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'peasant', 'ninjaMonk', 'wanderer', 'lightningMage', 'kitsune', 'karasu', 'yamabushi', 'werewolf', 'minotaur', 'satyr', 'gorgon', 'samuraiCommander', 'paladin', 'cleric', 'druid', 'barbarian', 'ranger', 'warlock', 'illusionist', 'gunslinger'];
const PARTY = ['knight', 'cleric', 'wizard', 'archer', 'samurai'];
const ARMIES = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'];
const report = {};
let errors = 0;

async function open(w, h, tries = 3) {
  try { return await open1(w, h); } catch (e) { if (tries <= 1) throw e; console.log('  (retrying the page)'); return open(w, h, tries - 1); }
}
async function open1(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, party, xp, armies]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('uic-set')) return;
    sessionStorage.setItem('uic-set', '1');
    localStorage.clear();
    const cleared = { waves: 15, best: 15, won: 15, clears: 1, stars: { 0: 11, 1: 9 }, met: { 0: 7, 1: 7, 2: 3 } };
    localStorage.setItem('legends.meta', JSON.stringify({
      seed: 7, crowns: 25000, stones: 40, unlocked: owned, party, pulls: 40, dry: 0, dryMythic: 0,
      castle: { treasury: 5, barracks: 5, armoury: 4, mageTower: 4, stable: 4, library: 5, smithy: 3, chapel: 3, watchtower: 3, hall: 2 }, chapel: true,
      shards: Object.fromEntries(owned.map((k) => [k, 30])), stars: {}, xp: Object.fromEntries(owned.map((k, i) => [k, i < 6 ? xp * 2 : xp])),
      bestStage: 40, tower: 9, stand: 12, calamity: { best: 3, clears: 1 }, daily: {}, bosses: ['orcWarlord', 'lichKing'], achievements: ['firstWin'], armies: Object.fromEntries(armies.map((a) => [a, cleared])), armySeen: armies,
      stash: [], tomes: { small: 4, medium: 2, large: 1 }, opened: [...armies, 'tower', 'castle', 'calamity'], featuresTold: ['autoMerge', 'autoPlace'],
      bonds: { 'knight|paladin': 130, 'cleric|knight': 45, 'archer|wizard': 20 }, scenes: ['opening'],
    }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('lotf-army-shown', '{}');
    localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false, speed: 1 }));
  }, [HEROES, PARTY, xpAt(32), ARMIES]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 90000 });
  await page.waitForTimeout(1800);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page };
}

const ev = (page, fn, arg) => page.evaluate(fn, arg);
const wait = (page, ms = 700) => page.waitForTimeout(ms);
const clickText = (page, sel, re) => page.evaluate(([sel, re]) => { const b = [...document.querySelectorAll(sel)].find((e) => new RegExp(re).test(e.textContent || '') && e.getClientRects().length); b?.click(); return !!b; }, [sel, re]);
const home = async (page, tab) => {
  await ev(page, () => {
    for (const b of document.querySelectorAll('.rvCard button, .unlock button')) if (/Continue/.test(b.textContent)) b.click();
    const gc = document.getElementById('gachaClose'); if (gc && gc.getClientRects().length) gc.click();
    for (const id of ['settings', 'party', 'result', 'recap']) { const e = document.getElementById(id); if (e && !e.hidden) e.hidden = true; }
    for (const s of ['#stall', '.ecnLayer', '.ulBack', '.cvPick', '.qcWrap', '.ruBack', '.spOverlay', '#marchCard', '.toast']) document.querySelectorAll(s).forEach((e) => e.remove());
    window.__game.home.closeSheet?.();
    window.__game.home.open();
  });
  await wait(page, 600);
  if (tab) { await ev(page, (t) => window.__game.home.show(t), tab); await wait(page, 900); }
};
/** Start an army run and land on its deploy board, with heroes hired. */
const deploy = async (page) => {
  await home(page);
  await ev(page, (party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'ogres' }, stage: 3, over: false, cleared: false, gold: 300, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, PARTY);
  await wait(page, 900);
};

// scene name -> what to do before the shot
const scrollIn = (p, sel, by = 99999) => ev(p, ([sel, by]) => document.querySelectorAll(sel).forEach((e) => { const s = getComputedStyle(e); if (e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(s.overflowY)) e.scrollTop = by; }), [sel, by]).then(() => wait(p, 400));
const SCENES = {
  'home-battle': (p) => home(p, 'battle'),
  'home-battle-dealer': async (p) => { await ev(p, () => { const m = window.__game.meta; m.stall = { day: 0, sold: {}, spent: 0, ...(m.stall ?? {}), dealerDue: true }; }); await home(p, 'battle'); await ev(p, () => window.__game.home.refresh()); await wait(p, 600); },
  'home-heroes': (p) => home(p, 'heroes'),
  'home-recruit': (p) => home(p, 'recruit'),
  'home-castle': (p) => home(p, 'castle'),
  'home-castle-rooms': async (p) => { await home(p, 'castle'); await ev(p, () => document.querySelector('.ctChamberGrid')?.scrollIntoView()); await wait(p, 400); },
  'home-castle-foot': async (p) => { await home(p, 'castle'); await ev(p, () => { const s = document.querySelector('.hmPage.on, .hm-castle'); s?.querySelectorAll('*').forEach((e) => { if (e.scrollHeight > e.clientHeight + 40) e.scrollTop = 99999; }); }); await wait(p, 400); },
  'spellbook': (p) => home(p, 'spells'),
  'spellbook-foot': async (p) => { await home(p, 'spells'); await ev(p, () => { document.querySelectorAll('#spellbook *').forEach((e) => { if (e.scrollHeight > e.clientHeight + 40) e.scrollTop = 99999; }); }); await wait(p, 400); },
  'card-hall': async (p) => { await home(p, 'castle'); await ev(p, () => document.querySelector('.ctChamberCard[data-id="hall"]')?.click()); await wait(p); },
  'card-smithy': async (p) => { await home(p, 'castle'); await ev(p, () => document.querySelector('.ctChamberCard[data-id="smithy"]')?.click()); await wait(p); },
  'card-barracks': async (p) => { await home(p, 'castle'); await ev(p, () => document.querySelector('.ctChamberCard[data-id="barracks"]')?.click()); await wait(p); },
  'card-chapel': async (p) => { await home(p, 'castle'); await ev(p, () => document.querySelector('.ctChamberCard[data-id="chapel"]')?.click()); await wait(p); },
  'card-watchtower': async (p) => { await home(p, 'castle'); await ev(p, () => document.querySelector('.ctChamberCard[data-id="watchtower"]')?.click()); await wait(p); },
  'roster': async (p) => { await home(p, 'heroes'); await ev(p, () => window.__game.home.openRoster()); await wait(p); },
  'hero-overview': async (p) => { await home(p); await ev(p, () => window.__game.home.openSheet('knight', false, 'overview')); await wait(p, 900); await scrollIn(p, '#hmSheet *', 640); },
  'hero-overview-foot': async (p) => { await home(p); await ev(p, () => window.__game.home.openSheet('knight', false, 'overview')); await wait(p, 900); await ev(p, () => document.querySelectorAll('#hmSheetBox *').forEach((e) => { if (e.scrollHeight > e.clientHeight + 40) e.scrollTop = 99999; })); await wait(p, 300); },
  'hero-progression': async (p) => { await home(p); await ev(p, () => window.__game.home.openSheet('knight', false, 'progression')); await wait(p, 900); await scrollIn(p, '#hmSheet *', 640); },
  'hero-equipment': async (p) => { await home(p); await ev(p, () => window.__game.home.openSheet('knight', false, 'equipment')); await wait(p, 900); await scrollIn(p, '#hmSheet *', 640); },
  'hero-skills': async (p) => { await home(p); await ev(p, () => window.__game.home.openSheet('knight', false, 'skills')); await wait(p, 900); await scrollIn(p, '#hmSheet *', 640); },
  'hero-talents': async (p) => { await home(p); await ev(p, () => window.__game.home.openSheet('knight', false, 'talents')); await wait(p, 900); await scrollIn(p, '#hmSheet *', 640); },
  'upgrades': async (p) => { await home(p, 'heroes'); await clickText(p, 'button', '^\\s*Upgrades'); await wait(p); },
  'quests': async (p) => { await home(p); await ev(p, () => window.__game.home.openQuests('active')); await wait(p); },
  'quests-tab2': async (p) => { await home(p); await ev(p, () => window.__game.home.openQuests('active')); await wait(p); await ev(p, () => document.querySelector('#hmSheetBox [role=tab]:nth-child(2)')?.click()); await wait(p); },
  'gallery': async (p) => { await home(p, 'recruit'); await ev(p, () => window.__game.home.openGallery()); await wait(p, 900); },
  'codex': async (p) => { await home(p, 'castle'); await ev(p, () => window.__game.home.openCodex()); await wait(p); },
  'achievements': async (p) => { await home(p); await ev(p, () => window.__game.home.openAchievements()); await wait(p); },
  'settings': async (p) => { await home(p); await ev(p, () => document.getElementById('hmGear')?.click()); await wait(p); },
  'settings-sound': async (p) => { await home(p); await ev(p, () => document.getElementById('hmGear')?.click()); await wait(p, 400); await clickText(p, '#settingsBody button', 'Sound'); await wait(p, 400); },
  'settings-updates': async (p) => { await home(p); await ev(p, () => document.getElementById('hmGear')?.click()); await wait(p, 400); await clickText(p, '#settingsBody button', 'Updates'); await wait(p, 400); },
  'armies': async (p) => { await home(p); await ev(p, () => window.__game.home.openArmies()); await wait(p, 900); },
  'party': async (p) => { await home(p); await ev(p, () => window.__game.home.hooks.onArmy('orcs', 0)); await wait(p, 900); },
  'march': async (p) => { await home(p); await ev(p, () => window.__game.home.hooks.onArmy('orcs', 0)); await wait(p, 900); await ev(p, () => document.getElementById('ptGo')?.click()); await wait(p, 700); },
  'stall-books': async (p) => { await home(p, 'heroes'); await ev(p, () => document.getElementById('hmStall')?.click()); await wait(p, 900); },
  ...Object.fromEntries(['Gear', 'Tomes', 'Chests', 'Sell', 'Repair', 'Enchant'].map((t) => [`stall-${t.toLowerCase()}`, async (p) => { await home(p, 'heroes'); await ev(p, () => document.getElementById('hmStall')?.click()); await wait(p, 700); await clickText(p, '#stall button', `^\\s*${t}`); await wait(p, 700); }])),
  'summon-1': async (p) => { await home(p, 'recruit'); await ev(p, () => window.__game.home.summon(1)); await wait(p, 4000); },
  'summon-10': async (p) => { await home(p, 'recruit'); await ev(p, () => window.__game.home.summon(10)); await wait(p, 6000); },
  'deploy': (p) => deploy(p),
  'deploy-formations': async (p) => { await deploy(p); await ev(p, () => (document.querySelector('#formBtn, .fmBtn, [data-formations]') ?? [...document.querySelectorAll('button')].find((b) => /Formation/.test(b.textContent || b.title || '')))?.click()); await wait(p); },
  'deploy-traits': async (p) => { await deploy(p); await ev(p, () => document.querySelector('#traits .trait')?.click()); await wait(p, 500); },
  'fight': async (p) => { await deploy(p); await ev(p, () => document.getElementById('fight')?.click()); await wait(p, 3500); },
  'fight-paused': async (p) => { await deploy(p); await ev(p, () => document.getElementById('fight')?.click()); await wait(p, 2500); await ev(p, () => document.querySelector('#fightHud .fhRow, .fhRow')?.click()); await wait(p, 600); },
  'result': async (p) => { await deploy(p); await ev(p, () => document.getElementById('fight')?.click()); await wait(p, 800); await ev(p, () => { for (const u of window.__game.b.units) if (u.side !== 'hero') u.hp = 0; }); await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 60000 }).catch(() => {}); await wait(p, 2500); },
  'lost': async (p) => { await deploy(p); await ev(p, () => document.getElementById('fight')?.click()); await wait(p, 800); await ev(p, () => { window.__game.run.retries = 9; for (const u of window.__game.b.units) if (u.side === 'hero') u.hp = 0; }); await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 60000 }).catch(() => {}); await wait(p, 2500); },
  'recap': async (p) => { await SCENES.lost(p); await ev(p, () => document.getElementById('next')?.click()); await wait(p, 4000); },
  'calamity': async (p) => { await home(p); await ev(p, () => window.__game.home.enterCalamity()); await wait(p, 2000); },
  'daily': async (p) => { await home(p, 'battle'); await ev(p, () => document.getElementById('hmDaily')?.click()); await wait(p, 1200); },

  'calamity-pick': async (p) => { await home(p); await ev(p, () => window.__game.home.enterCalamity()); await wait(p, 1500); },
  'calamity-map': async (p) => { await SCENES['calamity-pick'](p); await ev(p, () => document.querySelector('.cvPick .cvCard, .cvPick button.hero, .cvPick [data-kind]')?.click()); await wait(p, 600); await clickText(p, 'button', '^\\s*Begin with'); await wait(p, 1500); await clickText(p, 'button', '^\\s*(Begin|Start|Enter|Go|Yes|Continue)'); await wait(p, 3000); },
  'calamity-camp': async (p) => { await SCENES['calamity-map'](p); await ev(p, () => { const g = window.__game; document.getElementById('home').hidden = true; g.towerView.open(g.run); g.towerView.campCard(); }); await wait(p, 1000); },
  'calamity-shop': async (p) => { await SCENES['calamity-map'](p); await ev(p, () => { const g = window.__game; document.getElementById('home').hidden = true; g.run.gold = 500; g.towerView.open(g.run); g.towerView.shopCard(); }); await wait(p, 1000); },
  'calamity-mapview': async (p) => { await SCENES['calamity-map'](p); await ev(p, () => { const g = window.__game; document.getElementById('home').hidden = true; g.towerView.open(g.run); }); await wait(p, 1500); },
  'stand': async (p) => { await home(p); await ev(p, () => window.__game.home.go(window.__game.home.hooks.onTower)); await wait(p, 2500); },
  'auto-ask': async (p) => { await home(p); await ev(p, () => window.__game.home.openArmies()); await wait(p, 900); await clickText(p, 'button', '^\\s*Auto'); await wait(p, 600); },
  'pack': async (p) => { await deploy(p); await ev(p, () => document.getElementById('pack')?.click()); await wait(p, 1600); },
  'pack-foot': async (p) => { await deploy(p); await ev(p, () => document.getElementById('pack')?.click()); await wait(p, 700); await ev(p, () => document.querySelector('.rmPocket, .rmRow')?.scrollIntoView({ block: 'center' })); await wait(p, 300); },
  'trophies': async (p) => { await home(p, 'castle'); await clickText(p, '.ctPortalChip', 'Trophies'); await wait(p, 1200); },
  'bonds-sheet': async (p) => { await home(p); await ev(p, () => window.__game.home.openSheet('knight')); await wait(p, 900); await ev(p, () => document.querySelector('.dossierBonds')?.scrollIntoView({ block: 'center' })); await wait(p, 300); },
  'retire': async (p) => { await home(p); await ev(p, () => { window.__game.meta.xp.knight = 4e7; window.__game.home.openSheet('knight'); }); await wait(p, 900); await ev(p, () => document.querySelector('.dossierLegacy')?.scrollIntoView({ block: 'center' })); await wait(p, 300); },
  'rankup': async (p) => { await home(p); await ev(p, () => window.__game.home.openSheet('knight')); await wait(p, 900); await clickText(p, '#hmSheetBox button, #hmSheetBox [role=button]', 'Rank up|Awaken'); await wait(p, 800); },
  'march-foot': async (p) => { await SCENES.march(p); await scrollIn(p, '#marchCard, #marchCard *'); },
  'party-foot': async (p) => { await SCENES.party(p); await scrollIn(p, '#party, #party *'); },
  'overlook-sheet': async (p) => { await home(p, 'battle'); await clickText(p, '#home button', 'Last Stand'); await wait(p, 600); },
  'toast': async (p) => { await home(p, 'battle'); await ev(p, () => window.__game.toast?.('A royal proclamation: the toast lane')); await wait(p, 500); },
};

const audit = (page) => page.evaluate(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)))?.closest('*') && (e.contains(document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)))) || document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)))?.contains(e)); };
  const name = (e) => `${e.nodeName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)}"`;
  const small = [];
  for (const e of document.querySelectorAll('button, [role=button], [role=tab], a, input, select')) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) small.push(`${name(e)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  const tiny = new Set();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    if (!n.textContent.trim()) continue;
    const e = n.parentElement;
    if (!e || !vis(e)) continue;
    const fs = parseFloat(getComputedStyle(e).fontSize);
    if (fs < 10.5) tiny.add(`${name(e)} ${fs}px`);
  }
  const fonts = new Map();
  for (const e of document.querySelectorAll('h1,h2,h3,h4,[class*=Title],[class*=title],[class*=Head]')) { if (!vis(e)) continue; const f = getComputedStyle(e).fontFamily.split(',')[0]; fonts.set(f, (fonts.get(f) ?? 0) + 1); }
  return { small: small.slice(0, 30), tiny: [...tiny].slice(0, 30), headingFonts: Object.fromEntries(fonts) };
});

for (const [w, h] of SIZES) {
  let names = only.length ? only : Object.keys(SCENES);
  if (process.env.FROM) names = names.slice(names.indexOf(process.env.FROM));
  let { ctx, page } = await open(w, h);
  let n = 0;
  for (const name of names) {
    if (n++ % 10 === 9) { await ctx.close(); ({ ctx, page } = await open(w, h)); }
    else if (n > 1) { await page.evaluate(() => { for (const k of ['legends.run', 'legends.calamity', 'legends.questRun', 'legends.stand', 'legends.tower']) localStorage.removeItem(k); }); await page.reload(); await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 90000 }); await page.waitForTimeout(1500); await page.evaluate(() => document.getElementById('tipSkip')?.click()); }
    try {
      await SCENES[name](page);
      if (process.env.PROBE) console.log(await page.evaluate(process.env.PROBE));
      await page.screenshot({ path: `${OUT}/${label}-${name}-${w}.png` });
      if (w === 393) report[name] = await audit(page);
      console.log('✓', name, w);
    } catch (e) {
      console.log('✗', name, w, e.message.split('\n')[0]);
      await ctx.close(); ({ ctx, page } = await open(w, h));
    }
  }
  await ctx.close();
}
if (Object.keys(report).length) {
  const file = `${OUT}/${label}-audit.json`;
  const had = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  writeFileSync(file, JSON.stringify({ ...had, ...report }, null, 1));
}
await browser.close();
srv.close();
console.log(errors ? `${errors} page errors` : 'no page errors');
