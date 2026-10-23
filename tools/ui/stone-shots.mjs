// Screenshots of every screen in the stone-and-iron look (docs/notes/ui-stone.md):
//   node tools/ui/stone-shots.mjs <build dir> <prefix> [WxH] [screens, comma list]
// Writes docs/samples/<prefix>-<screen>[-WxH].png. Run it on a build of the old look ("before") and of the new ("after").
import { mkdirSync, writeFileSync } from 'node:fs';
import { serve, launch, HEROES, saveScript } from '../audit/lib.mjs';
const [root = 'out/web', prefix = 'ui-stone', size = '393x852', want] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const only = want?.split(',');
const tag = W === 393 && H === 852 ? '' : `-${W}x${H}`;
const srv = serve(root);
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const extra = { crowns: 1850, armySeen: ['orcs', 'undead', 'beasts'], castle: { treasury: 3, barracks: 3, armoury: 2, mageTower: 2, stable: 2, library: 1 },
  armies: { orcs: { best: 8, won: 8, clears: 1, stars: { 8: 2 }, met: { 0: 7, 1: 3 } }, undead: { best: 5, won: 0, clears: 0, stars: {}, met: { 0: 2 } } },
  shards: { knight: 14, samurai: 6 }, bestStage: 30 };
const AUDIT = process.env.AUDIT;
const failed = [];
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.size ? { width: opts.size[0], height: opts.size[1] } : { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  if (!opts.fresh) await page.addInitScript(saveScript(), [HEROES.slice(0, 22), { ...extra, ...(opts.extra ?? {}) }]);
  await page.goto(`${base}${opts.fresh ? '' : '?seed=7'}`);
  await page.waitForTimeout(opts.wait ?? 2300);
  if (!opts.tips) await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  return { ctx, page };
}
const ev = (page, fn, ...a) => page.evaluate(fn, ...a);
const home = async (page) => { await ev(page, () => document.getElementById('homeBtn').click()); await page.waitForTimeout(1300); await ev(page, () => document.getElementById('tipSkip')?.click()); };
async function shot(page, name) {
  if (only && !only.includes(name)) return;
  await page.waitForTimeout(450);
  await page.screenshot({ path: `docs/samples/${prefix}-${name}${tag}.png` });
  if (AUDIT) {
    const boxes = await ev(page, () => {
      const out = [];
      for (const el of document.body.querySelectorAll('*')) {
        const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
        if (!own || own.length < 2) continue;
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.5 || r.width < 6 || r.height < 6 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
        const top = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), Math.min(innerHeight - 1, r.top + r.height / 2));
        if (!top || !(top === el || el.contains(top) || top.contains(el))) continue;
        out.push({ x: r.left, y: r.top, w: r.width, h: r.height, color: cs.color, size: cs.fontSize, text: own.slice(0, 40), cls: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}` });
      }
      return out;
    });
    // (a scan for the old brown and cream: any visible element whose own text, background or border colour is a warm brown or a cream)
    const old = await ev(page, () => {
      const rgb = (c) => { const m = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?/.exec(c); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
      const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; };
      const warm = (c) => { const v = rgb(c); if (!v || v[3] < 0.3) return false; const [h, s, l] = hsl(v); return (h >= 14 && h <= 50 && s >= 0.25 && s <= 0.75 && l >= 0.08 && l <= 0.5) || (h >= 28 && h <= 55 && l >= 0.8 && s >= 0.2); };
      const out = new Set();
      for (const el of document.body.querySelectorAll('*')) {
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        if (cs.display === 'none' || cs.visibility === 'hidden' || r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        const bad = [];
        if (own && warm(cs.color)) bad.push('color ' + cs.color);
        if (warm(cs.backgroundColor)) bad.push('bg ' + cs.backgroundColor);
        if (cs.borderTopWidth !== '0px' && cs.borderTopStyle !== 'none' && warm(cs.borderTopColor)) bad.push('border ' + cs.borderTopColor);
        if (bad.length) out.add(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''}: ${bad.join('; ')}`);
      }
      return [...out];
    });
    if (old.length) writeFileSync(`/tmp/claude-0/-home-user/00efe0aa-d1b9-5266-bb61-c6b22731de46/scratchpad/audit2/old-${prefix}-${name}${tag}.txt`, old.join('\n'));
    mkdirSync('/tmp/claude-0/-home-user/00efe0aa-d1b9-5266-bb61-c6b22731de46/scratchpad/audit2', { recursive: true });
    writeFileSync(`/tmp/claude-0/-home-user/00efe0aa-d1b9-5266-bb61-c6b22731de46/scratchpad/audit2/${prefix}-${name}${tag}.json`, JSON.stringify(boxes));
  }
}
const group = async (label, fn, opts) => {
  let c; try { c = await open(opts); await fn(c.page); } catch (e) { failed.push(`${label}: ${String(e.message).split('\n')[0]}`); } finally { await c?.ctx.close(); }
};
const tab = (page, id) => ev(page, (i) => window.__game.home.show(i), id);

// the loading screen and the first hero pick (a fresh save)
await group('loading', async () => {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } }); const page = await ctx.newPage();
  await page.route('**/game.js', async (r) => { await new Promise((s) => setTimeout(s, 4000)); r.continue(); });
  page.goto(base + '?seed=0', { waitUntil: 'commit' }).catch(() => {});
  await page.waitForSelector('#loading', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200); await shot(page, 'loading'); await ctx.close();
});
await group('starter', async (page) => { await page.waitForTimeout(800); await shot(page, 'starter'); }, { fresh: true, tips: true });
// the home tabs and the screens that open from them
await group('home', async (page) => {
  await home(page);
  await shot(page, 'home-battle');
  await tab(page, 'heroes'); await shot(page, 'home-heroes');
  await tab(page, 'castle'); await shot(page, 'home-castle');
  await tab(page, 'recruit'); await shot(page, 'home-recruit');
  await tab(page, 'spells'); await shot(page, 'home-spells');
  await tab(page, 'castle');
  await ev(page, () => [...document.querySelectorAll('#hmPages button')].find((b) => /Codex/.test(b.textContent))?.click()); await page.waitForTimeout(700); await shot(page, 'codex');
  await ev(page, () => document.getElementById('hmSubBack')?.click()); await page.waitForTimeout(300);
  await ev(page, () => document.getElementById('hmTrophy').click()); await page.waitForTimeout(700); await shot(page, 'achievements');
  await ev(page, () => document.getElementById('hmSubBack')?.click()); await page.waitForTimeout(300);
  await ev(page, () => document.getElementById('hmGear').click()); await page.waitForTimeout(700); await shot(page, 'settings');
  await ev(page, () => document.getElementById('settingsClose').click()); await page.waitForTimeout(300);
  await tab(page, 'battle');
  await ev(page, () => document.getElementById('hmParty').click()); await page.waitForTimeout(900); await shot(page, 'party');
  await ev(page, () => document.getElementById('ptBack').click()); await page.waitForTimeout(500);
  await ev(page, () => window.__game.home.openArmies()); await page.waitForTimeout(1000); await shot(page, 'armies');
  await ev(page, () => document.querySelector('.asArrow.right')?.click()); await page.waitForTimeout(900); await shot(page, 'army-card');
});
// the hero sheet and what hangs off it
await group('sheet', async (page) => {
  await home(page); await tab(page, 'heroes');
  await ev(page, () => window.__game.home.openSheet('knight')); await page.waitForTimeout(700); await shot(page, 'hero-sheet');
  const to = async (sel, name) => { await ev(page, (s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), sel); await page.waitForTimeout(300); await shot(page, name); };
  await to('.awPanel', 'awakening'); await to('.eqPanel', 'equipment');
  await ev(page, () => [...document.querySelectorAll('#hmSheetBox button')].find((b) => /talents/i.test(b.textContent))?.click()); await page.waitForTimeout(700); await shot(page, 'talents');
});
// the fight: deploy, running, a boss, the result, the recap
await group('fight', async (page) => {
  await ev(page, () => { const g = window.__game; for (const hh of g.run.roster.slice(0, 3)) { if (g.b.units.some((u) => u.tag === hh.id)) continue; const t = g.freeTile(); if (t) g.put(String(hh.id), t); } });
  await page.waitForTimeout(1200); await shot(page, 'fight-deploy');
  await ev(page, () => { const g = window.__game; for (const hh of g.run.roster.slice(0, 5)) { if (g.b.units.some((u) => u.tag === hh.id)) continue; const t = g.freeTile(); if (t) g.put(String(hh.id), t); } document.getElementById('fight').click(); g.setSpeed?.(1); });
  await page.waitForTimeout(3500); await shot(page, 'fight-running');
  await ev(page, () => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') { u.alive = false; u.hp = 0; } });
  await page.waitForTimeout(6500); await shot(page, 'result');
  await ev(page, () => { const g = window.__game; const r = g.run; r.recap = { fights: 9, cleared: 8, ms: 412000, earned: 2310, spent: 1980, crowns: 64, chests: 2, heroes: Object.fromEntries(r.roster.slice(0, 5).map((h, i) => [h.id, { dealt: 4200 - i * 600, healed: i === 3 ? 900 : 0, taken: 1800 + i * 200, kills: 9 - i, grade: 1 }])), xp: Object.fromEntries(r.roster.slice(0, 5).map((h, i) => [h.id, 120 - i * 15])), levels: Object.fromEntries(r.roster.slice(0, 3).map((h, i) => [h.id, [3 + i, 4 + i]])) }; r.cleared = false; document.getElementById('home').hidden = true; g.showRunRecap(); document.getElementById('recap').hidden = false; });
  await shot(page, 'recap');
  await ev(page, () => { document.getElementById('recap').hidden = true; const c = document.getElementById('autoSum'); c.querySelector('h2').textContent = 'Auto-replay done'; c.querySelector('.asumWhy').textContent = '5 of 5 runs of the Orc Warband cleared'; const rows = c.querySelector('.asumRows'); rows.replaceChildren(); for (const [l, n] of [['Crowns', 640], ['XP', 3200], ['Chests', 3], ['Gear found', 2]]) { const s = document.createElement('span'); s.textContent = l; const b = document.createElement('b'); b.textContent = String(n); rows.append(s, b); } c.hidden = false; });
  await shot(page, 'auto-summary');
});
// a boss wave: its card, its bar, a change of form
await group('boss', async (page) => {
  await ev(page, () => {
    const g = window.__game; const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'army', army: 'orcs', tier: 0 }, stage: 8, over: false, cleared: false, gold: 500, event: undefined, tally: { ms: 150000, lost: 0, bossLost: 0 } });
    document.getElementById('home').hidden = true; g.startRun(r);
  });
  await page.waitForTimeout(900); await shot(page, 'boss-card');
  await ev(page, () => document.getElementById('bossCard')?.click()); await page.waitForTimeout(1200);
  await ev(page, () => { const g = window.__game; for (const hh of g.run.roster.slice(0, 5)) { if (g.b.units.some((u) => u.tag === hh.id)) continue; const t = g.freeTile(); if (t) g.put(String(hh.id), t); } document.getElementById('fight').click(); });
  await page.waitForTimeout(3000); await shot(page, 'boss-bar');
});
// an event card, a toast, a chest in the stash
await group('event', async (page) => {
  await ev(page, () => { const g = window.__game; g.run.event = { kind: 'merchant', title: 'A wandering merchant', text: 'He lays out a blanket of odd wares between two rocks.', options: [{ label: 'Healing draught', text: 'Heals every hero 40% of its hp', cost: 20, effect: { t: 'leave' } }, { label: 'Lucky charm', text: '+5% crit for the run', cost: 55, effect: { t: 'leave' } }, { label: 'Leave', text: 'Move on', cost: 0, effect: { t: 'leave' } }] }; g.events.openEvent(g.run, () => {}); });
  await page.waitForTimeout(500); await shot(page, 'event');
});
await group('stash', async (page) => {
  await home(page); await shot(page, 'stash');
  await ev(page, () => document.querySelector('.csChest')?.click()); await page.waitForTimeout(2600); await shot(page, 'chest');
}, { extra: { stash: [{ army: 'orcs', at: 3, tier: 0, seed: 1001 }, { army: 'orcs', at: 5, tier: 1, seed: 1002 }, { army: 'undead', at: 3, tier: 0, seed: 1003 }], armies: { orcs: { best: 8, won: 8, clears: 1, stars: { 8: 2 }, met: { 0: 7, 1: 3 }, chests: [3, 5] }, undead: { best: 5, won: 0, clears: 0, stars: {}, met: { 0: 2 } } } } });
// the tower and the Calamity
await group('calamity', async (page) => {
  await home(page);
  await ev(page, () => document.getElementById('hmCalamity').click()); await page.waitForTimeout(800); await shot(page, 'calamity-pick');
  await ev(page, () => { for (const b of document.querySelectorAll('.cvCard .primary')) b.click(); }); await page.waitForTimeout(3000); await shot(page, 'calamity-map');
});
await group('tower', async (page) => {
  await home(page);
  await ev(page, () => document.querySelector('.hmCard:has(b)')?.click());
  await ev(page, () => { const g = window.__game; g.home.close?.(); });
  await page.waitForTimeout(300);
  await ev(page, () => { const b = [...document.querySelectorAll('#home button, #home .hmCard')].find((x) => /Tower/.test(x.textContent)); b?.click(); });
  await page.waitForTimeout(2200); await shot(page, 'tower');
});
await group('shop', async (page) => {
  await home(page);
  await ev(page, () => { const b = [...document.querySelectorAll('#home button, #home .hmCard')].find((x) => /Tower/.test(x.textContent)); b?.click(); });
  await page.waitForTimeout(2000);
  await ev(page, () => { const g = window.__game; const t = g.run.tower; for (const n of t.map) if (n.row === 0) n.kind = 'shop'; g.towerView.open(g.run); });
  await page.waitForTimeout(500);
  await ev(page, () => { const g = window.__game; const i = g.run.tower.map.findIndex((n) => n.row === 0); document.querySelectorAll('.rtNode')[i].click(); });
  await page.waitForTimeout(200); await ev(page, () => document.querySelector('.rtGo')?.click());
  await page.waitForTimeout(900); await shot(page, 'shop');
});
await group('daily', async (page) => {
  await home(page);
  await ev(page, () => { const b = [...document.querySelectorAll('#home button, #home .hmCard')].find((x) => /Daily/.test(x.textContent)); b?.click(); });
  await page.waitForTimeout(2500); await shot(page, 'daily');
});
await group('gacha', async (page) => {
  await home(page); await tab(page, 'recruit'); await page.waitForTimeout(700);
  await ev(page, () => document.querySelector('.hmPage.hm-recruit button.primary, .hlBar button.primary')?.click());
  await page.waitForTimeout(6500); await shot(page, 'gacha');
});

// ---- the second pass: every other screen, overlay and confirm ----
const towerOpen = async (page) => {
  await home(page);
  await ev(page, () => { const b = [...document.querySelectorAll('#home button, #home .hmCard')].find((x) => /Tower/.test(x.textContent)); b?.click(); });
  await page.waitForTimeout(2000);
};
// a row-0 node turned into `kind` (with a twist if asked), picked, and its card or info shown
const node = async (page, kind, twist, go = true) => {
  await ev(page, ([k, t]) => { const g = window.__game; for (const n of g.run.tower.map) if (n.row === 0) { n.kind = k; if (t) n.twist = t; } g.towerView.open(g.run); }, [kind, twist]);
  await page.waitForTimeout(500);
  await ev(page, () => { const g = window.__game; const i = g.run.tower.map.findIndex((n) => n.row === 0); document.querySelectorAll('.rtNode')[i].click(); });
  await page.waitForTimeout(300);
};
await group('tower-nodes', async (page) => {
  await towerOpen(page);
  await node(page, 'elite'); await shot(page, 'tower-elite');
  await node(page, 'fight', 'lava'); await shot(page, 'tower-twist');
  await ev(page, () => document.querySelector('.rtGo')?.click()); await page.waitForTimeout(3500); await shot(page, 'twist-banner');
});
for (const [name, kind] of [['campfire', 'campfire'], ['recruit-node', 'recruit'], ['treasure', 'treasure'], ['mystery', 'mystery']]) {
  await group(name, async (page) => {
    await towerOpen(page); await node(page, kind);
    await ev(page, () => document.querySelector('.rtGo')?.click()); await page.waitForTimeout(1200); await shot(page, name);
    if (kind === 'treasure') { await ev(page, () => [...document.querySelectorAll('.rtCard button, #towerMap button')].find((b) => /open|take|chest/i.test(b.textContent))?.click()); await page.waitForTimeout(900); await shot(page, 'relic-pick'); }
  });
}
await group('tower-confirm', async (page) => {
  await towerOpen(page);
  await ev(page, () => document.querySelector('.rtLink')?.click()); await page.waitForTimeout(500); await shot(page, 'confirm-abandon');
  await ev(page, () => [...document.querySelectorAll('.asumCard button, .cfCard button, button')].reverse().find((b) => /Abandon|Yes|End/i.test(b.textContent))?.click()); await page.waitForTimeout(1500); await shot(page, 'tower-summary');
});
await group('equip2', async (page) => {
  await home(page); await tab(page, 'heroes');
  await ev(page, () => window.__game.home.openSheet('knight')); await page.waitForTimeout(600);
  await ev(page, () => document.querySelector('.eqPanel')?.scrollIntoView({ block: 'start' })); await page.waitForTimeout(300);
  await ev(page, () => document.querySelector('.eqSlot')?.click()); await page.waitForTimeout(700); await shot(page, 'equip-picker');
  await ev(page, () => [...document.querySelectorAll('#hmSheetBox button')].find((b) => /All sets/i.test(b.textContent))?.click()); await page.waitForTimeout(700); await shot(page, 'gear-sets');
}, { extra: { equipment: [{ id: 1, base: 'ironSword', rarity: 1, level: 1 }, { id: 2, base: 'runedBlade', rarity: 3, level: 4 }, { id: 3, base: 'leatherJerkin', rarity: 2, level: 2 }, { id: 4, base: 'luckyCharm', rarity: 1, level: 1 }], nextItem: 5, equipped: { knight: { weapon: 1 } } } });
await group('codex2', async (page) => {
  await home(page); await tab(page, 'castle');
  await ev(page, () => [...document.querySelectorAll('#hmPages button')].find((b) => /Codex/.test(b.textContent))?.click()); await page.waitForTimeout(700);
  await ev(page, () => document.querySelector('.cxCard:not(.locked)')?.click()); await page.waitForTimeout(700); await shot(page, 'codex-detail');
}, { extra: { codex: { met: ['skeleton', 'spearman', 'orcGrunt', 'wolfBlack'], kills: { skeleton: 12, spearman: 7, orcGrunt: 20, wolfBlack: 3 } }, codexClaimed: [] } });
await group('settings2', async (page) => {
  await home(page); await ev(page, () => document.getElementById('hmGear').click()); await page.waitForTimeout(600);
  await ev(page, () => { const b = document.getElementById('settingsBody'); b.scrollTop = b.scrollHeight; }); await shot(page, 'settings-bottom');
  await ev(page, () => [...document.querySelectorAll('#settings button')].find((b) => /Start over/i.test(b.textContent))?.click()); await page.waitForTimeout(500); await shot(page, 'settings-confirm');
});
await group('city', async (page) => {
  await home(page); await tab(page, 'castle');
  await ev(page, () => document.querySelector('.ctTag:not(.place)')?.click()); await page.waitForTimeout(700); await shot(page, 'building-card');
});
await group('confirm-retry', async (page) => {
  await ev(page, () => { document.getElementById('askText').textContent = 'Recycle the Samurai for 12 gold?'; document.getElementById('ask').hidden = false; }); await shot(page, 'confirm-recycle');
  await ev(page, () => { document.getElementById('ask').hidden = true; window.__game.overview?.(true); }); await page.waitForTimeout(1200); await shot(page, 'overview');
});
await group('unlock', async (page) => {
  await ev(page, () => { const g = window.__game; const r = JSON.parse(JSON.stringify(g.run)); Object.assign(r, { mode: { kind: 'army', army: 'orcs', tier: 0 }, stage: 15, over: false, cleared: false, gold: 500, event: undefined, tally: { ms: 150000, lost: 0, bossLost: 0 } }); document.getElementById('home').hidden = true; g.startRun(r); });
  await page.waitForTimeout(800); await ev(page, () => { const g = window.__game; document.getElementById('bossCard')?.click(); for (const hh of g.run.roster.slice(0, 5)) { if (g.b.units.some((u) => u.tag === hh.id)) continue; const t = g.freeTile(); if (t) g.put(String(hh.id), t); } document.getElementById('fight').click(); g.setSpeed?.(3); });
  await page.waitForTimeout(1200); await ev(page, () => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') { u.alive = false; u.hp = 0; } });
  await page.waitForTimeout(6500); await shot(page, 'army-result');
  await ev(page, () => document.getElementById('next')?.click()); await page.waitForTimeout(2500); await shot(page, 'unlock');
  await ev(page, () => document.querySelector('#recap button')?.click()); await page.waitForTimeout(2800); await shot(page, 'unlock-moment');
}, { extra: { armies: { orcs: { best: 7, won: 7, clears: 0, stars: {}, met: { 0: 7 } } } } });
await group('turnup', async (page) => { await page.waitForTimeout(500); await ev(page, () => document.getElementById('turnUp')?.removeAttribute('hidden')); await shot(page, 'turn-upright'); }, { size: [852, 393] });
await group('tips', async (page) => { await page.waitForTimeout(500); await shot(page, 'tips'); }, { tips: true, wait: 2800 });
console.log(failed.length ? 'NOT TAKEN:\n' + failed.join('\n') : 'all taken');
await browser.close(); srv.close();
