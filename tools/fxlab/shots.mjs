// Builds the lab, serves out/web and takes mid-fight screenshot sequences of the combat effects at two phone sizes:
//   node tools/fxlab/shots.mjs [scenario,scenario | all | perf]      (DEBUG=1 prints the events seen; SIZES=upright|sideways; PORT)
// Contact sheets go to docs/samples/combat-fx-<scenario>-<upright|sideways>.png (nine frames, three across; sheet.py).
// The fight is stepped by hand (the lab's `advance`), so frames land on the moment asked for, not on the wall clock.
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

await esbuild.build({ entryPoints: ['tools/fxlab/lab.ts'], outfile: 'out/lab.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', logLevel: 'warning' });
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT ?? 8126));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const wait = (page, ms) => page.waitForTimeout(ms);

/** Each scenario: `heroes` against `band`; the fight is run to the first event named in `until` (a kind, or kind:detail),
 *  then `n` frames are taken `step` ms of fight time apart. `cast` casts the king's spell when the fight reaches `until`
 *  (or at the start). `skip` runs the fight silently first. */
const SCENARIOS = {
  'arrow-volley': { heroes: ['archer', 'ranger', 'knight'], band: 'orcs', until: 'shot:arrow', step: 60, zoom: 2.6 },
  'bone-arrow': { heroes: ['knight', 'samurai'], band: 'skeletons', until: 'shot:bone', step: 60, zoom: 2.6 },
  'gun-tracer': { heroes: ['gunslinger', 'knight'], band: 'skeletons', until: 'shot:bullet', step: 50, zoom: 2.6 },
  'fire-orb': { heroes: ['wizard', 'knight'], band: 'skeletons', until: 'shot:fire', step: 70, zoom: 2.6 },
  'lightning-bolt': { heroes: ['lightningMage', 'knight', 'samurai'], band: 'werewolves', until: 'shot:bolt', step: 70, zoom: 2.6 },
  'curse-orb': { heroes: ['warlock', 'knight'], band: 'demons', until: 'shot:curse', step: 70, zoom: 2.6 },
  'leaf-orb': { heroes: ['druid', 'knight'], band: 'skeletons', until: 'shot:leaf', step: 70, zoom: 2.6 },
  'gorgon-spit': { heroes: ['gorgon', 'knight'], band: 'orcs', until: 'shot:bolt', step: 70, zoom: 2.6 },
  'shaman-boss': { heroes: ['knight', 'samurai', 'barbarian'], band: 'shamanKing', boss: { hp: 0.05, atk: 1, size: 1.5 }, until: 'shot:bolt', step: 80, zoom: 2.2 },
  'melee-slash': { heroes: ['knight', 'samurai', 'barbarian', 'kunoichi'], band: 'werewolves', until: 'swing', step: 70, zoom: 2.6, power: 2 },
  'melee-crit': { heroes: ['samurai', 'barbarian', 'knight'], band: 'skeletons', until: 'hit', skip: 1500, step: 70, zoom: 2.6, power: 4 },
  'spear-thrust': { heroes: ['peasant', 'knight'], band: 'skeletons', until: 'swing', step: 60, zoom: 2.6 },
  'skill-shield-iaido': { heroes: ['knight', 'samurai', 'kunoichi'], band: 'skeletons', charged: true, until: 'skill', step: 110, zoom: 2.2 },
  'skill-meteor': { heroes: ['wizard', 'knight'], band: 'skeletons', charged: true, until: 'skill:Meteor', step: 130, zoom: 1.7 },
  'skill-volley-whirlwind': { heroes: ['archer', 'barbarian', 'knight'], band: 'skeletons', charged: true, until: 'skill:Volley', step: 100, zoom: 2 },
  'skill-chain': { heroes: ['lightningMage', 'knight', 'samurai'], band: 'werewolves', charged: true, until: 'skill:Chain Lightning', step: 90, zoom: 2.2 },
  'skill-heals': { heroes: ['cleric', 'wanderer', 'paladin', 'knight'], band: 'skeletons', charged: true, power: 0.5, skip: 3000, until: 'heal', step: 120, zoom: 2.2 },
  'skill-summons': { heroes: ['druid', 'illusionist', 'warlock', 'ranger'], band: 'skeletons', charged: true, until: 'skill', step: 120, zoom: 2.2 },
  'ult-tempest': { heroes: ['yamabushi', 'knight'], band: 'minotaurs', charged: true, until: 'skill:Tempest', step: 130, zoom: 1.8 },
  'ult-feather-storm': { heroes: ['karasu', 'knight'], band: 'skeletons', charged: true, until: 'skill:Feather Storm', step: 130, zoom: 1.8 },
  'ult-nine-tails': { heroes: ['kitsune', 'knight'], band: 'minotaurs', charged: true, until: 'skill:Nine-Tailed Dream', step: 130, zoom: 1.8 },
  'spell-frost': { heroes: ['knight', 'samurai'], band: 'werewolves', until: 'swing', cast: 'frost', step: 220, zoom: 1.9 },
  'spell-meteor': { heroes: ['knight', 'samurai'], band: 'werewolves', until: 'swing', cast: 'meteor', step: 160, zoom: 1.7 },
  'spell-chain': { heroes: ['knight', 'samurai'], band: 'werewolves', until: 'swing', cast: 'chain', step: 110, zoom: 2 },
  'spell-smite': { heroes: ['knight', 'samurai'], band: 'werewolves', until: 'swing', cast: 'smite', step: 110, zoom: 2 },
  'spell-poison': { heroes: ['knight', 'samurai'], band: 'werewolves', until: 'swing', cast: 'poison', step: 330, zoom: 1.9 },
  'spell-heal-haste-shield': { heroes: ['knight', 'samurai', 'archer'], band: 'skeletons', until: 'hit', cast: ['heal', 'haste', 'shield'], step: 200, zoom: 2 },
  'spell-quake': { heroes: ['knight', 'samurai'], band: 'werewolves', until: 'swing', cast: 'quake', step: 140, zoom: 1.9 },
  'spell-rally-resurrect': { heroes: ['knight', 'samurai', 'archer'], band: 'ogres', until: 'hit', cast: ['rally'], step: 200, zoom: 2 },
  'deaths-skeleton-demon': { heroes: ['samurai', 'barbarian', 'kunoichi', 'knight'], band: 'demons', power: 8, until: 'hit', step: 130, zoom: 2.1 },
  'deaths-ogre-bones': { heroes: ['samurai', 'barbarian', 'kunoichi', 'knight'], band: 'ogres', power: 8, until: 'hit', skip: 800, step: 150, zoom: 2.1 },
  'deaths-skeletons': { heroes: ['samurai', 'barbarian', 'kunoichi', 'knight'], band: 'skeletons', power: 8, until: 'hit', skip: 400, step: 130, zoom: 2.1 },
  'boss-entrance': { heroes: ['knight', 'archer', 'wizard'], band: 'orcWarlord', boss: { hp: 0.2, atk: 1, size: 1.5 }, step: 130, zoom: 1.8, entrance: true },
  'boss-skill': { heroes: ['knight', 'archer', 'wizard'], band: 'orcWarlord', boss: { hp: 0.2, atk: 1, size: 1.5 }, foesCharged: true, until: 'skill', step: 130, zoom: 1.8 },
  'status-burn-slow': { heroes: ['wizard', 'knight'], band: 'skeletons', until: 'hit', skip: 2500, cast: 'frost', step: 300, zoom: 2.2 },
  // the other heroes' ultimates (docs/notes/ultimates.md): contact sheets go to docs/samples/ultimates-<name>-upright.png
  'ultimates-arrow-storm': { heroes: ['archer', 'knight', 'samurai'], band: 'orcs', charged: true, until: 'skill:Arrow Storm', step: 130, zoom: 1.5 },
  'ultimates-armageddon': { heroes: ['wizard', 'knight', 'samurai'], band: 'skeletons', charged: true, until: 'skill:Armageddon', step: 150, zoom: 1.5 },
  'ultimates-last-bastion': { heroes: ['knight', 'samurai', 'archer'], band: 'werewolves', charged: true, until: 'skill:Last Bastion', step: 160, zoom: 1.8 },
  'ultimates-divine-intervention': { heroes: ['cleric', 'knight', 'samurai', 'archer'], band: 'skeletons', charged: true, wound: 0.35, until: 'skill:Divine Intervention', step: 150, zoom: 1.9 },
  'ultimates-hunt-of-the-pack': { heroes: ['beastmaster', 'knight', 'samurai'], band: 'orcs', charged: true, until: 'skill:Hunt of the Pack', step: 150, zoom: 1.9 },
  'ultimates-time-stop': { heroes: ['timeWitch', 'knight', 'samurai'], band: 'werewolves', charged: true, until: 'skill:Time Stop', step: 150, zoom: 1.7 },
  'ultimates-cataclysm': { heroes: ['juggernaut', 'knight', 'samurai'], band: 'orcs', charged: true, until: 'skill:Cataclysm', step: 130, zoom: 1.8 },
  'status-stun-thousand-fists': { heroes: ['ninjaMonk', 'knight'], band: 'skeletons', charged: true, until: 'skill', step: 150, zoom: 2.4 },
};
const arg = process.argv[2];
const only = !arg || arg === 'all' ? Object.keys(SCENARIOS) : arg === 'perf' ? [] : arg.split(',');
mkdirSync('docs/samples', { recursive: true });
mkdirSync('out/fxframes', { recursive: true });

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message.split('\n')[0]));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
  await page.goto('http://localhost:' + (process.env.PORT ?? 8126) + '/?seed=7');
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.addScriptTag({ path: 'out/lab.js' });
  await wait(page, 800);
  return { ctx, page };
}

const SIZES = { upright: ['upright', 393, 852], sideways: ['sideways', 852, 393] };
for (const [tag, w, h] of arg === 'perf' ? [] : (process.env.SIZES ?? 'upright,sideways').split(',').map((k) => SIZES[k])) {
  for (const name of only) {
    const sc = SCENARIOS[name];
    if (!sc) { console.log('no scenario', name); continue; }
    const { ctx, page } = await open(w, h);
    try {
      await page.evaluate((s) => { window.__lab.setup(s); window.__lab.speed(0); }, { ...sc, seed: 7 });
      await wait(page, 300);
      await page.evaluate(() => window.__lab.go());
      const adv = (ms) => page.evaluate((ms) => window.__lab.advance(ms), ms);
      const casts = sc.cast ? [].concat(sc.cast) : [];
      if (sc.skip) await adv(sc.skip);
      // run to the event (a hundred milliseconds at a time, up to a minute)
      if (sc.until && !sc.entrance) {
        const [kind, detail] = sc.until.split(':');
        let found = false;
        for (let k = 0; k < 600 && !found; k++) found = (await adv(100)).some((e) => e[1] === kind && (!detail || e[2] === detail));
        if (!found) console.log('  event never came:', name, sc.until);
      }
      await page.evaluate(() => window.__lab.pin());
      const shots = [];
      for (let i = 0; i < 9; i++) {
        if (i < casts.length) await page.evaluate((id) => { const [u, v] = window.__lab.foeTile(); window.__lab.cast(id, u, v); }, casts[i]);
        if (sc.cast && i === 0 && casts.length === 0) { /* (no cast) */ }
        await page.evaluate((z) => window.__lab.look(z, true), sc.zoom ?? 2.2);
        await wait(page, 50);
        shots.push(await page.screenshot());
        const seen = await adv(sc.step);
        if (process.env.DEBUG) console.log(i, [...new Set(seen.map((e) => e[1] + (e[2] ? ':' + e[2] : '')))].join(' '));
      }
      const files = shots.map((buf, k) => { const f = `out/fxframes/${name}-${tag}-${k}.png`; writeFileSync(f, buf); return f; });
      execFileSync('python3', ['-I', 'tools/fxlab/sheet.py', name.startsWith('ultimates-') ? `docs/samples/${name}-${tag}.png` : `docs/samples/combat-fx-${name}-${tag}.png`, ...files]);
      console.log('ok', name, tag);
    } catch (e) { console.log('FAILED', name, tag, e.message.split('\n')[0]); }
    await ctx.close();
  }
}

if (arg === 'perf') {
  // frame time in a busy fight: ten heroes against a crowded band, skills charged, spells cast through the run
  const { ctx, page } = await open(393, 852);
  await page.evaluate(() => { window.__lab.setup({ heroes: ['archer', 'ranger', 'gunslinger', 'wizard', 'lightningMage', 'druid', 'warlock', 'barbarian', 'kunoichi', 'cleric'], band: 'mixed', charged: true, power: 0.4 }); window.__lab.speed(1); window.__lab.look(1.6); });
  await page.evaluate(() => window.__lab.go());
  const out = [];
  await wait(page, 1500);
  out.push(['plain', await page.evaluate(() => window.__lab.frames(3000))]);
  for (const id of ['frost', 'meteor', 'chain', 'poison']) {
    await page.evaluate((id) => { const [u, v] = window.__lab.foeTile(); window.__lab.cast(id, u, v); }, id);
    out.push([id, await page.evaluate(() => window.__lab.frames(2500))]);
  }
  console.log(JSON.stringify(out));
  await ctx.close();
}
await browser.close(); srv.close();
