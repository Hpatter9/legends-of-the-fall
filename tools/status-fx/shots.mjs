// STATUS-FX phase A mock-up shots (docs/notes/status-fx.md): a real fight held still, with the prototype's ailments
// (`src/render/statusMock.ts`) set on its fighters through `window.__statusMock`. Run after `npm run web`:
//   node tools/status-fx/shots.mjs
import { serve, launch, boot } from '../battle-ui/lib.mjs';
const PORT = 8281;
const s = serve('out/web', PORT);
const br = await launch();
const { ctx, page, errors } = await boot(br, 393, 852, PORT);
await page.goto(`http://localhost:${PORT}/?seed=5`);
await page.waitForTimeout(2500);
await page.evaluate(() => document.getElementById('tipSkip')?.click());
// (a party: five hires, set out by the Auto button's own arrangement)
await page.evaluate(() => { const g = window.__game; g.run.gold = 3000; for (let i = 0; i < 5; i++) document.getElementById('summon').click(); g.autoArrange(true); });
await page.waitForTimeout(800);
await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
await page.evaluate(() => document.getElementById('fight').click());
// (let the two sides close, then hold the fight where it is)
await page.waitForTimeout(Number(process.env.WAIT ?? 3300));
await page.evaluate(() => { window.__game.sceneHold = 1; });
await page.waitForTimeout(300);
const units = await page.evaluate(() => window.__game.b.units.filter((u) => u.alive).map((u) => ({ id: u.id, def: u.def, side: u.side, u: u.u, v: u.v })));
console.log(JSON.stringify(units));
const heroes = units.filter((u) => u.side === 'hero');
const foes = units.filter((u) => u.side === 'foe');
const shot = (name) => page.screenshot({ path: `docs/samples/status-fx-${name}.png` });
// (the camera closer in, on the middle of the fighters, held there)
await page.evaluate((zoom) => {
  const g = window.__game;
  const live = g.b.units.filter((u) => u.alive && u.def !== 'orcArcher').map((u) => g.sprites.get(u.id));
  g.manualCam = true;
  g.tx = g.cx = live.reduce((a, s) => a + s.x, 0) / live.length;
  g.ty = g.cy = live.reduce((a, s) => a + s.y, 0) / live.length - 16;
  g.zoom = g.tzoom = zoom;
}, Number(process.env.ZOOM ?? 2.4));

// 1. A fight with several ailments at once, on heroes and foes, with chips and coloured numbers.
await page.evaluate(([h, f]) => {
  const m = window.__statusMock;
  m.clear();
  m.set(f[0].id, ['burn', 'poison']); m.num(f[0].id, 18, 'burn'); m.num(f[0].id, 11, 'poison');
  m.set(f[1].id, ['freeze']); m.num(f[1].id, 64, 'hit');
  m.set(h[0].id, ['bleed', 'weak']); m.num(h[0].id, 9, 'bleed');
  m.set(h[1].id, ['shock', 'stun']); m.num(h[1].id, 27, 'shock');
  if (h[2]) m.set(h[2].id, ['chill']);
  if (h[3]) { m.set(h[3].id, ['curse', 'silence']); m.num(h[3].id, 14, 'curse'); }
  if (h[4]) m.set(h[4].id, ['fear']);
  if (f[2]) m.immune(f[2].id, 'burn');
}, [heroes, foes]);
await page.waitForTimeout(400);
await shot('fight');

// 2. The frozen shatter: a frozen foe takes a heavy blow and the crust bursts.
await page.evaluate(([h, f]) => {
  const m = window.__statusMock;
  m.clear();
  m.shatter(f[1].id); m.num(f[1].id, 186, 'shatter');
  m.set(f[0].id, ['freeze']);
}, [heroes, foes]);
await page.waitForTimeout(400);
await shot('shatter');

// 3. A foe resisting: Immune over a fire-proof foe (as a fire golem or a demon would be) beside one that burns.
await page.evaluate(([h, f]) => {
  const m = window.__statusMock;
  m.clear();
  m.immune(f[0].id, 'burn'); m.num(f[0].id, 31, 'hit');
  m.set(f[1].id, ['burn']); m.num(f[1].id, 18, 'burn');
}, [heroes, foes]);
await page.waitForTimeout(400);
await shot('immune');

// 4. Close-ups of every body effect on a hero and on a foe, the camera close on each, cut out and laid into a contact
// sheet by tools/status-fx/sheet.py (docs/samples/status-fx-contact.png).
const KEYS = ['burn', 'poison', 'freeze', 'bleed', 'chill', 'shock', 'stun', 'weak', 'curse', 'silence', 'fear'];
const W = 128, H = 168;
/** Stand one fighter alone on a clear tile (the way tools/awaken/aura-mock.mjs does: for the picture only, nothing is saved), the camera close on it. */
async function stand(kind, side, ailment) {
  await page.evaluate(([kind, side, ailment, spot]) => {
    const g = window.__game;
    const b = g.b;
    const proto = g.proto ?? (g.proto = JSON.parse(JSON.stringify(b.units[0])));
    g.spot ??= spot ?? (() => {
      const bd = b.board;
      const tile = (u, v) => bd.tiles?.[v * bd.w + u] ?? bd.tiles?.[v]?.[u];
      const clear = (t) => t && !t.rock && !t.wall && !t.barrel && !t.bush && !t.tree && !t.ground && !t.perch && !t.ramp && !t.bridge;
      let best = [3, 8], score = -1e9;
      for (let v = 2; v < bd.d - 1; v++) for (let u = 1; u < bd.w - 1; u++) {
        const t = tile(u, v);
        if (!clear(t)) continue;
        const near = [[u + 1, v], [u, v + 1], [u + 1, v + 1], [u - 1, v + 1], [u + 1, v - 1], [u - 1, v], [u, v - 1]].map(([a, c]) => tile(a, c));
        if (!near.every((f) => clear(f) && f.h <= t.h)) continue;
        const sc = -Math.abs(u - bd.w / 2) - Math.abs(v - bd.d / 2) * 0.5;
        if (sc > score) { score = sc; best = [u, v]; }
      }
      return best;
    })();
    const x = JSON.parse(JSON.stringify(proto));
    Object.assign(x, { id: 9000, def: kind, side, u: g.spot[0], v: g.spot[1], facing: side === 'hero' ? 3 : 1, alive: true, hp: 70, maxHp: 100 });
    for (const k of ['dot', 'slowUntil', 'stunUntil', 'swing', 'step', 'cast', 'hurtAt', 'look']) delete x[k];
    b.units = [x];
    // (the fight's leftovers: burning ground and the effects still playing)
    b.zones = [];
    if (g.fx?.root) g.fx.root.visible = false;
    g.syncSprites(true);
    const m = window.__statusMock;
    m.clear();
    m.set(9000, [ailment]);
    const sp = g.sprites.get(9000);
    sp.update(b.board, b.t, true);
    g.manualCam = true;
    g.tx = g.cx = sp.x;
    g.ty = g.cy = sp.y - 20;
    g.zoom = g.tzoom = 2.6;
  }, [kind, side, ailment, (process.env.SPOT ?? '4,9').split(',').map(Number)]);
  await page.waitForTimeout(450);
  return page.evaluate(() => {
    const g = window.__game;
    const r = g.app.canvas.getBoundingClientRect();
    const c = r.width / g.app.screen.width;
    const p = g.sprites.get(9000).root.getGlobalPosition();
    return { x: r.left + p.x * c, y: r.top + p.y * c };
  });
}
for (const k of KEYS)
  for (const [kind, side] of [['knight', 'hero'], ['orcGrunt', 'foe']]) {
    const at = await stand(kind, side, k);
    await page.screenshot({ path: `out/shots/status-fx-crop-${k}-${side}.png`, clip: { x: Math.round(at.x - W / 2), y: Math.round(at.y - H + 34), width: W, height: H } });
  }
console.log('errors', errors.length);
await ctx.close(); await br.close(); s.close();
