// The old map must never stay under a new one (the owner: "sometimes the old map stays when I go play a new map: it overlaps it").
// Plays the page through many switches between the modes and maps, and after each looks at what is on the canvas: the board's
// layer must hold exactly the board in play (its columns, the long map's finished sections and the fighters), and no other
// view's layer may be showing. `node tools/fixes3/maps.mjs [port]` after `npm run web`; prints each step and exits 1 on a leftover.
import { serve, HEROES, launch } from '../battle-ui/lib.mjs';
/** The battle-ui boot, with room for a busy machine (the page can take a minute to load). */
async function boot(browser, w, h, port) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(180000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${port}/`);
  await page.evaluate((heroes) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
    // (no cinematics: they would hold the switches up)
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
  }, HEROES);
  await page.reload();
  await page.waitForFunction(() => window.__game, {}, { timeout: 180000 });
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page, errors };
}
const port = +(process.argv[2] ?? 8881);
const server = serve('out/web', port);
const browser = await launch();
const shots = process.argv.includes('--shots');
let bad = 0;

/** What the canvas holds now, and what is wrong with it. */
async function probe(page, label) {
  const r = await page.evaluate(() => {
    const g = window.__game;
    const bv = g.boardView;
    const keep = new Set(bv.keep);
    const tiles = new Set(bv.built?.tiles ?? []);
    const old = new Set(bv.old?.tiles ?? []);
    const roots = new Set([...g.sprites.values()].map((s) => s.root));
    const strays = bv.root.children.filter((c) => !keep.has(c) && !tiles.has(c) && !old.has(c) && !roots.has(c) && !c.destroyed);
    const home = !document.getElementById('home').hidden;
    const map = !document.getElementById('towerMap')?.hidden;
    const issues = [];
    const standShows = !!g.stand?.world?.visible && !!g.stand.world.parent;
    const standActive = !!g.stand?.active;
    if (!standActive && standShows) issues.push('the Last Stand\'s field shows outside the Stand');
    if (!standActive && g.stand?.root && !g.stand.root.hidden) issues.push('the Last Stand\'s page shows outside the Stand');
    const kind = g.run.mode?.kind;
    if (map && (standActive || (kind !== 'tower' && kind !== 'calamity'))) issues.push(`the Calamity's map shows over ${standActive ? 'the Last Stand' : kind ?? 'a run'}`);
    if (map && !home && (g.b.phase === 'fight')) issues.push('the Calamity\'s map shows over a fight');
    if (standActive && g.world.visible) issues.push('the fight board shows under the Last Stand');
    // (while the heroes walk to the next section the new host is drawn before its fight is made, with the walkers beside it: checked once it is done)
    if (!standActive && !home && !map && !g.chain.active) {
      if (bv.board !== g.b.board) issues.push('the board drawn is not the board in play');
      if (strays.length) issues.push(`${strays.length} stray layers on the board`);
      if (bv.old && !g.chain.active) issues.push('an old section is left drawn');
      const want = g.chain.sections.slice(0, g.chain.host).map((s) => s.board);
      const shown = [...bv.sceneryOf.keys()];
      const extra = shown.filter((b) => !want.includes(b));
      if (extra.length && !g.chain.active) issues.push(`${extra.length} finished sections of another road drawn`);
      if (bv.built && bv.built.tiles.length !== g.b.board.w * g.b.board.d && !g.chain.active) issues.push('the columns are not this board\'s');
      const live = g.b.units.length;
      if (g.sprites.size > live) issues.push(`${g.sprites.size - live} fighters drawn that are not in this fight`);
    }
    return {
      issues,
      at: standActive ? 'stand' : home ? 'home' : map ? 'map' : `${g.run.mode?.kind ?? 'run'} ${g.run.stage} ${g.b.phase}`,
      kids: bv.root.children.length, scenery: bv.sceneryOf.size, stage: g.app.stage.children.filter((c) => c.visible).length,
    };
  });
  const ok = !r.issues.length;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'BAD'} ${label.padEnd(44)} ${r.at.padEnd(22)} layers ${r.kids} sections ${r.scenery} ${r.issues.join('; ')}`);
  return r;
}

const wait = (page, ms) => page.waitForTimeout(ms);
const home = async (page) => { await page.evaluate(() => window.__game.home.open()); await wait(page, 500); };
const army = async (page, id = 'orcs') => {
  await page.evaluate((id) => window.__game.home.go(() => window.__game.home.hooks.onArmy(id, 0, undefined)), id);
  await wait(page, 400);
  await page.evaluate(() => document.getElementById('ptGo').click());
  await wait(page, 1200);
};
const daily = async (page) => {
  await page.evaluate(() => window.__game.home.go(() => window.__game.home.hooks.onDaily()));
  await wait(page, 600);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.closest('.dayBtns') && b.classList.contains('primary'))?.click());
  await wait(page, 1200);
};
const stand = async (page) => {
  await page.evaluate(() => window.__game.home.go(() => window.__game.home.hooks.onTower()));
  await wait(page, 1000);
  if (await page.evaluate(() => !!document.querySelector('.stPick:not([hidden])'))) {
    await page.evaluate(() => [...document.querySelectorAll('.stPick button')].find((b) => b.textContent === 'Auto fill')?.click());
    await page.evaluate(() => document.querySelector('.stPick .primary').click());
    await wait(page, 1500);
  }
};
const leaveStand = async (page) => { await page.evaluate(() => window.__game.stand.leave()); await wait(page, 500); };
const fight = async (page, ms = 2500) => {
  await page.evaluate(() => {
    const g = window.__game;
    g.endIntro?.();
    if (!g.b.units.some((u) => u.side === 'hero')) {
      for (let i = 0; i < 5; i++) document.getElementById('summon').click();
      g.autoArrange(true);
    }
    document.getElementById('fight').click();
  });
  await wait(page, ms);
};
/** Win the wave in hand at once (the foes fall), so the road's next section comes down and the heroes walk. */
const winWave = async (page) => {
  await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') { u.hp = 0; u.alive = false; } });
  await page.waitForFunction(() => !document.getElementById('result').hidden, {}, { timeout: 30000 }).catch(() => undefined);
  await wait(page, 600);
};
const next = async (page) => { await page.evaluate(() => document.getElementById('next')?.click()); await wait(page, 1500); };
const resume = async (page) => { await page.evaluate(() => window.__game.home.go(() => window.__game.home.hooks.onContinue())); await wait(page, 1200); };

const calamity = async (page) => {
  await page.evaluate(() => window.__game.home.go(() => window.__game.openMode('calamity')));
  await wait(page, 800);
  await page.evaluate(() => { document.querySelector('.cvGrid button')?.click(); document.querySelector('.cvPick .primary')?.click(); });
  await wait(page, 1500);
};
/** Into the fight of the Calamity map's first open spot. */
const calFight = async (page) => {
  await page.evaluate(() => [...document.querySelectorAll('#towerMap button')].find((b) => /Enter the Rift|Fight/.test(b.textContent))?.click());
  await wait(page, 2500);
};
const mapHome = async (page) => {
  await page.evaluate(() => [...document.querySelectorAll('#towerMap button')].find((b) => /^(Home|×)$/.test(b.textContent.trim()))?.click());
  await wait(page, 600);
};

const { page, errors } = await boot(browser, 393, 852, port);
const snap = async (name) => shots && page.screenshot({ path: `docs/samples/fixes3-${name}.png` });

await probe(page, 'boot');
const only = process.argv.includes('--cal') ? 'cal' : '';
if (only !== 'cal') {
await army(page, 'orcs'); await probe(page, 'home -> army (orcs)');
await home(page); await daily(page); await probe(page, 'army -> home -> daily');
await home(page); await army(page, 'undead'); await probe(page, 'daily -> home -> army (undead)');
await fight(page); await probe(page, 'army fighting');
await winWave(page); await probe(page, 'wave won, the walk');
await home(page); await army(page, 'orcs'); await probe(page, 'mid-walk -> home -> army (orcs)'); await snap('after-walk-army');
await fight(page); await winWave(page); await next(page); await probe(page, 'orcs wave 2 deploy');
await home(page); await stand(page); await probe(page, 'army wave 2 -> home -> Last Stand');
await leaveStand(page); await probe(page, 'Stand -> home');
await army(page, 'undead'); await probe(page, 'Stand -> home -> army (undead)'); await snap('stand-then-army');
await fight(page, 1500); await home(page); await daily(page); await probe(page, 'army mid-fight -> home -> daily');
await fight(page, 1500); await home(page); await stand(page); await probe(page, 'daily mid-fight -> home -> Stand');
await leaveStand(page); await resume(page); await probe(page, 'Stand -> home -> continue');
await fight(page); await winWave(page); await home(page); await daily(page); await probe(page, 'won wave -> home -> daily');
await home(page); await army(page, 'orcs'); await fight(page); await winWave(page); await probe(page, 'orcs walk');
await page.evaluate(() => document.getElementById('next')?.click()); await wait(page, 200);
await home(page); await army(page, 'undead'); await probe(page, 'walk cut -> home -> army (undead)'); await snap('walk-cut-army');
}

await page.evaluate(() => { const m = window.__game.meta; m.opened = [...new Set([...(m.opened ?? []), 'calamity', 'tower'])]; });
await home(page); await calamity(page); await probe(page, 'home -> Calamity map'); await snap('calamity-map');
await mapHome(page); await probe(page, 'Calamity map -> its home button');
await army(page, 'orcs'); await probe(page, 'Calamity map -> home -> army'); await snap('calamity-then-army');
await home(page); await calamity(page); await home(page); await probe(page, 'Calamity map -> home (not the map\'s button)');
await army(page, 'undead'); await probe(page, '... -> army (undead)'); await snap('calamity-home-army');
await home(page); await calamity(page); await calFight(page); await probe(page, 'Calamity map -> fight');
await fight(page, 1500); await home(page); await daily(page); await probe(page, 'Calamity fight -> home -> daily');
await home(page); await calamity(page); await home(page); await stand(page); await probe(page, 'Calamity map -> home -> Stand');
await leaveStand(page); await probe(page, 'Stand -> home');
await home(page); await calamity(page); await home(page); await daily(page); await probe(page, 'Calamity map -> home -> daily');

console.log(errors.length ? `page errors: ${errors.join(' | ')}` : 'no page errors');
await browser.close();
server.close();
console.log(bad ? `${bad} steps with leftovers` : 'every step clean');
process.exit(bad ? 1 : 0);
