// PIXELLAB-ART's pictures (docs/samples/pixellab-art/): the War Room's Beast Packs and Wildwood cards with their new trophies, the
// trophy wall, the Alpha Werewolf's and the Nine-Tailed Fox's fights (a Wanted mark on a foe, the crown over a hero) and the Undead's
// risen skeletons, at the three phone sizes. `node tools/pixellab/shots.mjs [width]` after `npm run web`.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 8741;
const out = 'docs/samples/pixellab-art';
mkdirSync(out, { recursive: true });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', opus: 'audio/ogg' };
const server = createServer((q, r) => {
  const p = 'out/web/' + (decodeURIComponent(q.url.split('?')[0].slice(1)) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const only = process.argv[2];
const PARTY = ['shambler', 'mummy', 'reaper', 'dreadPirate', 'knight'];
const ARMIES = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai'];
const BOSSES = ['orcWarlord', 'orcChieftain', 'boneCaptain', 'lichKing', 'alphaWolf', 'boarKing', 'forestBoss1', 'forestBoss2', 'forestBoss3', 'devilLeader', 'nineTails'];
let errors = 0;
try {
  for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
    if (only && only !== String(w)) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w === 393 ? 2 : 1, hasTouch: true, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
    await page.addInitScript(([party, armies, bosses]) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: party, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, library: 0, stable: 0 },
        armies: Object.fromEntries(armies.map((a) => [a, { clears: 1, best: 15, won: 15 }])), opened: armies, armySeen: armies, bosses, xp: Object.fromEntries(party.map((k) => [k, 50000])), daily: {}, stats: {}, scenes: ['opening'],
        tutorials: ['pause', 'autoMerge', 'traitPerks', 'spellSlots', 'daily', 'eidolons', 'castle', 'autoRunes', 'nemesis', 'chapel', 'talents', 'secondSkill', 'duels', 'warHorn', 'ultimates', 'autoPlace', 'tavern', 'summoning', 'council', 'hunts'] }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, music: 0, effects: 0, quips: false }));
    }, [PARTY, ARMIES, BOSSES]);
    await page.goto(`http://localhost:${PORT}/`, { timeout: 240000 });
    await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 120000 });
    await page.evaluate(() => { document.getElementById('tipSkip')?.click(); window.__game.home.open(); });
    // (the save's one-off notice of the summoning stones has to have gone before the pictures)
    await page.waitForTimeout(7000);
    const shot = (name, clip) => page.screenshot({ path: `${out}/${name}-${w}.jpg`, quality: 85, ...(clip ? { clip } : {}) });
    for (const a of ['beasts', 'wildwood']) {
      await page.evaluate((id) => { document.getElementById('tipSkip')?.click(); window.__game.home.open(); window.__game.home.openArmies(id); }, a);
      await page.waitForTimeout(1200);
      await page.locator('.asRoot img').evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode().catch(() => 0))));
      await shot(`warroom-${a}`);
    }
    // (a fight: the army's mid-boss wave, the foes held a moment so the picture shows the lines before they meet)
    for (const [army, boss] of [['beasts', 'alphaWolf'], ['yokai', 'nineTails']]) {
      await page.evaluate((a) => { const g = window.__game; g.home.go(() => g.home.hooks.onArmy(a, 0)); }, army);
      await page.locator('#ptGo').waitFor({ state: 'visible', timeout: 60000 });
      await page.click('#ptGo');
      await page.waitForTimeout(900);
      const got = await page.evaluate(([party, boss]) => {
        const g = window.__game;
        g.run.gold = 500; g.run.roster = party.map((kind, i) => ({ id: i + 1, kind, grade: 1, paid: 5 }));
        g.run.squad = party.map((_, i) => i + 1); g.run.nextId = 6; g.run.event = undefined;
        for (const s of [8, 7, 9]) { g.run.stage = s; g.newBattle(); if (g.b.units.some((u) => u.def === boss)) break; }
        g.refresh(); document.getElementById('events')?.setAttribute('hidden', ''); g.autoArrange(true);
        return g.b.units.filter((u) => u.side === 'foe').map((u) => u.def);
      }, [PARTY, boss]);
      console.log(army, w, got.join(' '));
      await page.waitForTimeout(700);
      await page.click('#fight');
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const g = window.__game;
        for (const u of g.b.units) if (u.side === 'foe') u.busyUntil = g.b.t + 6000;
        // (the marks, set by hand for the picture: the Wanted foe and the crowned hero)
        const foe = g.b.units.find((u) => u.side === 'foe' && u.alive && !u.def.endsWith('Wolf') && u.def !== 'nineTails');
        if (foe) (foe.pk ??= {}).wanted = true;
        const hero = g.b.units.find((u) => u.side === 'hero' && u.alive);
        if (hero) (hero.pk ??= {}).crowned = true;
      });
      await page.waitForTimeout(3200);
      await shot(`fight-${boss}`);
      const box = await page.evaluate((boss) => {
        const g = window.__game; const c = document.querySelector('canvas').getBoundingClientRect();
        const u = g.b.units.find((x) => x.def === boss); const p = u && g.sprites.get(u.id)?.root?.getGlobalPosition();
        return p ? { x: p.x + c.left, y: p.y + c.top } : null;
      }, boss);
      if (box) await shot(`close-${boss}`, { x: Math.max(0, Math.min(w - 220, box.x - 110)), y: Math.max(0, box.y - 150), width: 220, height: 190 });
      await page.evaluate(() => window.__game.home.open());
      await page.waitForTimeout(600);
    }
  }
} finally {
  await browser.close();
  server.close();
  console.log('page errors', errors);
}
