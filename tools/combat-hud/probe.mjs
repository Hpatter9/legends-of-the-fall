// COMBAT-HUD: the fight screen's overlap probe (docs/notes/combat-hud.md). After `npm run web`:
//   node tools/combat-hud/probe.mjs [--shots <prefix>]
// It plays real fights in the built page at 393x852, 360x780 and 412x915, with a party of five (an army run) and of eight (the Calamity),
// and at five moments: the fight's start, mid-fight, a boss wave, just after a tap on the tactic button and an ultimate's moment. At each it measures the bounding
// box of every element of the fight screen (the top bar's parts, the spell orbs, Auto, the mana, the War Horn, the tactic button and its word,
// the hero rows, their bars, names and skill chips, the boss bar, the twist and combo bars, toasts, the skill cut-ins, the ultimate's and the
// boss's showcase words, the speed button and the rest) and prints every pair that intersects. A text span is measured by its text, not its box.
// With --shots it also writes docs/samples/combat-hud/<prefix>-<scene>-<w>.png. Exits 1 when any overlap is found.
// BOSS-BAR (0.374): the boss waves are played again with the spell row as players really have it: 2, 3 or 4 spells (three slots and the open
// one: no save casts more), with and without the War Horn (held once an Eidolon is bound, it widens the row until Auto wraps under the orbs
// on a narrow phone), in an army, the Calamity's guardian and an Eidolon's trial, and also at 360x640 and at 393x852 with a 24 px top
// safe-area inset (`393s`: the top bar's inset put in by hand, as a phone's notch would). `KITS=boss` runs only those cases.
// AUTO-RIGHT (docs/notes/auto-right.md): each case also fails when Auto is not on the orbs' line right of the last orb, runs past the
// screen's edge, or a tap in the row (Auto, the horn, an orb) is under 44 px; a boss case prints its bar's top.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 8652);
const args = process.argv.slice(2);
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const SIZE_OF = { 393: [393, 852], 360: [360, 780], 412: [412, 915], 360640: [360, 640], '393s': [393, 852, 24] };
const SIZES = (process.env.SIZES ?? '393,360,412,360640,393s').split(',').map((w) => SIZE_OF[w]);
const ONLY_BOSS = process.env.KITS === 'boss';
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

/** The spells a kit casts (the three slots, then the open slot) and whether it holds the War Horn. */
const SPELLS = ['heal', 'meteor', 'haste', 'shield'];
const kitOf = (n, horn) => ({ n, horn });
const PLAIN = kitOf(3, false);

async function open(w, h, inset = 0, kit = PLAIN) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: shots ? 2 : 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(([owned, xp, spells, n, horn]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('probe-set')) return;
    sessionStorage.setItem('probe-set', '1');
    localStorage.clear();
    const meta = ({ seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: { orcs: { clears: 1 }, undead: { clears: 1 }, beasts: { clears: 1 }, wildwood: { clears: 1 } }, featuresTold: ['autoMerge', 'autoPlace'], armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] });
    meta.chapel = true;
    meta.spellbook = { owned: [...spells, 'frost', 'chain'], equipped: spells.slice(0, Math.min(3, n)), ...(n > 3 ? { open: spells[3] } : {}) };
    if (horn) meta.eidolons = { horn: 300, bound: ['askel'], chosen: 'askel', seen: ['askel'], confirmed: true };
    localStorage.setItem('legends.meta', JSON.stringify(meta));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [PARTY, xpAt(32), SPELLS, kit.n, kit.horn]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  // (the tutorial's counsel card is a lesson laid over the screen on purpose, not a part of the HUD)
  await page.addStyleTag({ content: '#tip { display: none !important; }' });
  await setInset(page, inset);
  await forceKit(page, kit);
  return { ctx, page };
}

/** A phone's top safe-area inset, put in by hand (a desktop browser's env() is 0): every rule of the page's sheets that reads
 *  env(safe-area-inset-top) is given the inset in its place, as a phone with a notch would have it. */
const setInset = (page, inset) =>
  inset &&
  page.evaluate((inset) => {
    const walk = (rules) => {
      for (const r of rules) {
        if (r.cssRules) walk(r.cssRules);
        if (!r.style) continue;
        for (const prop of [...r.style]) {
          const v = r.style.getPropertyValue(prop);
          if (v.includes('safe-area-inset-top')) r.style.setProperty(prop, v.replace(/env\(\s*safe-area-inset-top\s*(,[^)]*)?\)/g, `${inset}px`), r.style.getPropertyPriority(prop));
        }
      }
    };
    for (const sh of document.styleSheets) {
      try {
        walk(sh.cssRules);
      } catch {}
    }
    window.dispatchEvent(new Event('resize'));
  }, inset);

/** The kit's spells in the slots (the page fits the slots to the ruler's school as it loads; a probe wants the count it asked for). */
const forceKit = (page, kit) =>
  page.evaluate(([spells, n]) => {
    const l = window.__game.meta.spellbook;
    l.equipped = spells.slice(0, Math.min(3, n));
    if (n > 3) l.open = spells[3];
    else delete l.open;
  }, [SPELLS, kit.n]);

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

/** A Calamity run of eight (the battle-ui tools' save of ten, cut to eight), into the Rift and placed by Auto. With `boss`, the map's
 *  boss node is walked to and its fight begun instead (a Calamity boss: its bar under the spell row, the altar's bar under that). */
async function calamity(page, inset = 0, kit = PLAIN, boss = false) {
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
  await setInset(page, inset);
  await forceKit(page, kit);
  await page.evaluate(() => document.getElementById('hmCalamity').click());
  await page.waitForTimeout(1500);
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Skip' && b.offsetParent)?.click());
    await page.waitForTimeout(1200);
  }
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Enter the Rift')?.click());
  await page.waitForTimeout(3500);
  if (boss) {
    // (the map's own boss: the crossings before it taken as cleared, the party at the boss's row, and the boss's spot entered through the
    // map's own view, as a tap on it and Travel do)
    await page.evaluate(() => {
      const g = window.__game;
      const t = g.run.tower;
      const boss = t.map.find((n) => n.kind === 'boss');
      t.cur = undefined;
      t.path = t.map.filter((n) => n.id !== boss.id).map((n) => n.id);
      t.row = boss.row;
      g.towerView.open(g.run);
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const g = window.__game; const id = g.run.tower.map.find((n) => n.kind === 'boss').id; g.towerView.picked = id; g.towerView.goTo(id); });
    await page.waitForTimeout(5000);
    await page.evaluate(() => { window.__game.endIntro?.(); document.getElementById('bossCard')?.click(); });
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => document.getElementById('auto').click());
  await page.waitForTimeout(500);
  return page.evaluate(() => window.__game.b.units.filter((u) => u.side === 'hero' && u.owner === undefined).length);
}

/** An Eidolon's trial (Nivra's, the chain's fourth part, as tools/eidolon-trial plays it): the party suggested, the story skipped, placed by
 *  Auto, up to the boss's wave. The save holds Askel bound, so the War Horn is in the row. */
async function trial(page, inset = 0, kit = PLAIN) {
  // (the save as tools/eidolon-trial has it: three armies cleared, Askel bound, every piece of Nivra's chain found, and the trial once won
  // so it may be fought again whatever the chain's state (the same fight, as practice); put in the page's own
  // meta, as a reload would have the page save its own over it)
  await page.evaluate(() => {
    const m = window.__game.meta;
    const cleared = { waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 } };
    Object.assign(m, { armies: { orcs: cleared, undead: cleared, beasts: cleared }, armySeen: ['orcs', 'undead', 'beasts', 'wildwood'],
      quests: { active: [], offers: [], done: [], won: ['glassMere', 'nivraTrial'], told: ['glassMere', 'nivraTrial'], chains: { askel: { part: 3, progress: 0, bound: true }, nivra: { part: 3, progress: 0 } }, pieces: ['emberHeart', 'kennelCollar', 'kennelBell', 'rimeScale', 'merePearl', 'heldBreath'] },
      eidolons: { horn: 400, bound: ['askel'], chosen: 'askel', seen: ['askel'], confirmed: true } });
  });
  await forceKit(page, kit);
  // (the trial begun as its party sheet's Go begins it, with the probe's party (the Samurai is its cast))
  await page.evaluate((party) => { document.getElementById('home').hidden = true; window.__game.beginQuestTry('nivraTrial', party); }, PARTY);
  await page.waitForTimeout(2500);
  for (let i = 0; i < 40 && (await page.evaluate(() => window.__game.scenes.playing)); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  // (the boss's wave: the trial's waves made in turn until one brings a great foe)
  await page.evaluate(() => {
    const g = window.__game;
    for (let s = g.run.stage; s <= g.run.stage + 12; s++) {
      if (g.b.units.some((u) => u.side === 'foe' && (u.size ?? 1) > 1)) break;
      g.run.stage = s + 1;
      g.newBattle();
    }
    g.endIntro?.();
    document.getElementById('bossCard')?.click();
    g.autoArrange(true);
  });
  await page.waitForTimeout(700);
  return page.evaluate(() => window.__game.b.units.some((u) => u.side === 'foe' && (u.size ?? 1) > 1));
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
    // (AUTO-RIGHT: Auto on the orbs' own line, right of the last orb and inside the screen, and every tap in the row 44 px or more)
    const orbs = seen.filter((s) => s.name.startsWith('orb')).map((s) => s.r);
    const auto = box('auto');
    const row = [];
    if (auto && orbs.length) {
      const last = orbs.reduce((a, b) => (b.r > a.r ? b : a));
      const mid = (r) => (r.t + r.b) / 2;
      if (Math.abs(mid(auto) - mid(last)) > 6 || auto.l < last.r) row.push(`auto off the orbs' line (auto ${Math.round(auto.l)},${Math.round(auto.t)}; last orb ${Math.round(last.r)},${Math.round(last.t)})`);
      if (auto.r > innerWidth - 4) row.push(`auto past the screen's edge (${Math.round(auto.r)} of ${innerWidth})`);
    }
    for (const [n, r] of [['auto', auto], ['horn', box('horn')], ...orbs.map((r, i) => [`orb[${i}]`, r])])
      if (r && (r.r - r.l < 43.5 || r.b - r.t < 43.5)) row.push(`${n} under 44 px (${Math.round(r.r - r.l)}x${Math.round(r.b - r.t)})`);
    return { row, bossTop: box('bossBar')?.t, parts: seen.length, hits, tactic: box('tactic'), word: box('tacticWord'), panelTop: box('panel')?.t, boss: box('bossBar'), horn: !!box('horn'), spells: seen.filter((s) => s.name.startsWith('orb')).length };
  }, PARTS);
}

/** The cases: the moments of 0.373 with the plain kit (three spells, no horn), then BOSS-BAR's boss waves with every kit. */
const KITS = [kitOf(2, false), kitOf(4, false), kitOf(2, true), kitOf(3, true), kitOf(4, true)];
function casesAt() {
  const out = [];
  if (!ONLY_BOSS) {
    for (const scene of ['start', 'mid', 'boss', 'tap', 'ult']) out.push({ where: 'army', party: 5, scene, kit: PLAIN });
    for (const scene of ['start', 'mid', 'tap']) out.push({ where: 'calamity', party: 8, scene, kit: PLAIN });
  }
  for (const kit of ONLY_BOSS ? [PLAIN, ...KITS] : KITS) out.push({ where: 'army', party: 5, scene: 'boss', kit });
  for (const kit of [PLAIN, kitOf(4, true)]) out.push({ where: 'calamity', party: 8, scene: 'boss', kit });
  for (const kit of [kitOf(2, true), kitOf(4, true)]) out.push({ where: 'trial', party: 5, scene: 'boss', kit });
  return out;
}
const kitName = (k) => (k === PLAIN ? '' : `-${k.n}sp${k.horn ? '-horn' : ''}`);

let total = 0;
for (const [w, h, inset = 0] of SIZES) {
  const sizeName = `${w}x${h}${inset ? ` inset ${inset}` : ''}`;
  for (const { where, party, scene, kit } of casesAt()) {
    const { ctx, page } = await open(w, h, inset, kit);
    let note = '';
    if (where === 'army') await army(page, scene === 'boss');
    else if (where === 'calamity') note = ` (calamity placed ${await calamity(page, inset, kit, scene === 'boss')})`;
    else note = (await trial(page, inset, kit)) ? '' : ' (NO BOSS FOUND)';
    await fight(page);
    if (scene === 'start') await page.waitForTimeout(700);
    else await page.waitForTimeout(scene === 'boss' ? 2500 : 4500);
    await page.evaluate(() => document.fonts.ready);
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
    total += r.hits.length + r.row.length;
    // (a boss case with no boss's bar on the screen measured nothing it was meant to: that is a failure of the probe, counted)
    const missed = scene === 'boss' && !r.boss;
    if (missed) total++;
    const what = `${where}${kitName(kit)} ${scene}`;
    console.log(`${sizeName} party ${party} ${what}${note}: ${r.parts} parts, ${r.spells} spells${r.horn ? ' + horn' : ''}, ${r.hits.length} overlaps${missed ? ', NO BOSS BAR' : ''}${r.bossTop !== undefined ? `, boss bar at ${Math.round(r.bossTop)} px` : ''}${[...r.hits, ...r.row].length ? '\n    ' + [...r.hits, ...r.row].join('\n    ') : ''}`);
    if (shots) await page.screenshot({ path: `docs/samples/combat-hud/${shots}-${where === 'trial' ? 'trial' : party}${kitName(kit)}-${scene}-${w}${h !== SIZE_OF[w]?.[1] ? `x${h}` : ''}${inset ? 's' : ''}.png` });
    await ctx.close();
  }
}
console.log(total ? `${total} overlaps in all` : 'no overlaps');
await browser.close();
srv.close();
process.exit(total ? 1 : 0);
