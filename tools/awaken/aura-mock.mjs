// AWAKEN-002 mock-up: heroes of different classes stood on the fight board at awaken steps 0, 1 and 2, cut out and
// laid into a contact sheet (docs/samples/awaken-auras-mock-sheet.png), plus frame strips of two auras in motion
// (docs/samples/awaken-auras-mock-motion-*.png). After `npm run web`: node tools/awaken/aura-mock.mjs
// The heroes are set straight onto the deploy board for the picture only; nothing is saved.
import { serve, boot } from '../battle-ui/lib.mjs';
import { launch } from '../stand/lib.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const OUT = 'out/aura-mock';
mkdirSync(OUT, { recursive: true });
const ROWS = (process.env.ROWS ?? 'knight:guardian,juggernaut:bulwark,samurai:blade,ranger:marksman,rifleBot:gunner,wizard:caster,timeWitch:arcanist,priestess:support,werewolf:beast,reaper:assassin,kitsune:trickster,druid:warden,lancer:vanguard').split(',').map((s) => s.split(':'));
const MOTION = (process.env.MOTION ?? 'wizard,werewolf').split(',');
const s = serve('out/web', 8147);
const br = await launch();
const { ctx, page, errors } = await boot(br, 393, 852, 8147);
// (no cinematics: a scene would cover the board)
await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('legends.settings') ?? '{}'); s.cinematics = false; localStorage.setItem('legends.settings', JSON.stringify(s)); });
await page.reload();
await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(() => { const g = window.__game; g.newBattle(); });
await page.evaluate(() => { document.getElementById('home').hidden = true; });
await page.waitForTimeout(1500);
await page.addStyleTag({ content: '#tip, .tip, #tipBox, [class*=tip], .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });

console.log(await page.evaluate(() => ({ phase: window.__game.b.phase, units: window.__game.b.units.length })));
/** Stand one hero alone on a deploy tile at an awakened step, the camera close on it, and give back its feet on the page. */
async function stand(kind, step) {
  await page.evaluate(([kind, step, ZOOM]) => {
    const g = window.__game;
    const b = g.b;
    const proto = g.proto ?? (g.proto = JSON.parse(JSON.stringify(b.units.find((u) => u.side !== 'hero') ?? b.units[0])));
    // (a clear tile: nothing on it or on the tiles in front of it, none of them higher, so the feet show)
    g.spot ??= (() => {
      const bd = b.board;
      const tile = (u, v) => bd.tiles?.[v * bd.w + u] ?? bd.tiles?.[v]?.[u];
      const clear = (t) => t && !t.rock && !t.wall && !t.barrel && !t.bush && !t.tree && !t.ground && !t.perch && !t.ramp && !t.bridge;
      let best = [3, 8], score = -1e9;
      for (let v = 2; v < bd.d - 1; v++) for (let u = 1; u < bd.w - 1; u++) {
        const t = tile(u, v);
        if (!clear(t)) continue;
        const front = [[u + 1, v], [u, v + 1], [u + 1, v + 1], [u - 1, v + 1], [u + 1, v - 1], [u - 1, v], [u, v - 1]].map(([a, c]) => tile(a, c));
        if (!front.every((f) => clear(f) && f.h <= t.h)) continue;
        const sc = -Math.abs(u - bd.w / 2) - Math.abs(v - bd.d / 2) * 0.5;
        if (sc > score) { score = sc; best = [u, v]; }
      }
      return best;
    })();
    const x = JSON.parse(JSON.stringify(proto));
    Object.assign(x, { id: 9000 + step, def: kind, side: 'hero', u: g.spot[0], v: g.spot[1], grade: 3, level: 30, facing: 1, alive: true, hp: 100, maxHp: 100 });
    delete x.awaken;
    if (step) x.awaken = step;
    b.units = [x];
    g.syncSprites(true);
    const s = g.sprites.get(x.id);
    s.update(b.board, performance.now(), false);
    g.tx = g.cx = s.x;
    g.ty = g.cy = s.y - 18;
    g.zoom = g.tzoom = ZOOM;
  }, [kind, step, Number(process.env.ZOOM ?? 2.6)]);
  await page.waitForTimeout(600);
  return page.evaluate(() => {
    const g = window.__game;
    const s = [...g.sprites.values()][0];
    const r = g.app.canvas.getBoundingClientRect();
    const c = r.width / g.app.screen.width;
    const p = s.root.getGlobalPosition();
    return { x: r.left + p.x * c, y: r.top + p.y * c };
  });
}
const W = 128, H = 160;
const clipAt = (f) => ({ x: Math.round(f.x - W / 2), y: Math.round(f.y - H + 28), width: W, height: H });
for (const [kind, cls] of ROWS) {
  for (let i = 0; i < 3; i++) {
    const f = await stand(kind, i);
    if (process.env.FULL) await page.screenshot({ path: `${OUT}/full-${kind}-${i}.png` });
    await page.screenshot({ path: `${OUT}/${kind}-${i}.png`, clip: clipAt(f) });
  }
  console.log(kind, cls);
}
// motion strips: the step 2 hero, eight frames 120ms apart
for (const kind of MOTION) {
  const f = await stand(kind, 2);
  for (let i = 0; i < 8; i++) {
    await page.screenshot({ path: `${OUT}/motion-${kind}-${i}.png`, clip: clipAt(f) });
    await page.waitForTimeout(120);
  }
}
writeFileSync(`${OUT}/rows.json`, JSON.stringify({ rows: ROWS, motion: MOTION }));
console.log('errors', errors);
await ctx.close();
await br.close();
s.close();
execFileSync('python3', ['tools/awaken/aura-sheet.py'], { stdio: 'inherit' });
