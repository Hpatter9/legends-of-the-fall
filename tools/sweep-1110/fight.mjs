// SWEEP-1110, an army's fight: the bench (its cards' height, the rune side), the split SPELL and ULT Auto buttons, a hand-fired ultimate (how
// long it takes, the fight held at x1 through it at x2 or x3, a tap skipping it) and the follow camera (it holds a pan for about 4 s, then
// eases back). At the three upright sizes.   npm run web && node tools/sweep-1110/fight.mjs [out dir]
import { serve, launch, open, SIZES, out, wait, overflow, saveOf } from './lib.mjs';
const PORT = 8912;
const dir = out(process.argv[2] ?? 'out/sweep-1110/fight');
const server = serve(PORT);
const browser = await launch();
const note = (s) => console.log(s);

async function army(page, party) {
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts', tier: 0 }, stage: 3, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
  }, party);
  await wait(page, 900);
}

for (const [w, h] of SIZES) {
  const save = { ...saveOf(), spells: undefined };
  const { ctx, page, log } = await open(browser, w, h, PORT, { save });
  const shot = (n) => page.screenshot({ path: `${dir}/${n}-${w}.png` });
  await army(page, ['knight', 'cleric', 'archer', 'wizard', 'samurai', 'paladin', 'kraken']);
  // (two left on the bench: its cards' height)
  await page.evaluate(() => window.__game.autoArrange(true));
  await wait(page, 700);
  const bench = await page.evaluate(() => [...document.querySelectorAll('#bench .card, #bench > *')].filter((e) => e.offsetParent).slice(0, 4).map((e) => `${e.className}:${Math.round(e.getBoundingClientRect().height)}`));
  note(`${w} bench cards ${JSON.stringify(bench)}`);
  await shot('deploy');
  const o = await overflow(page);
  if (o.scroll || o.bad.length) note(`${w} deploy overflow ${JSON.stringify(o)}`);
  await page.evaluate(() => document.getElementById('fight').click());
  await wait(page, 1500);
  // (the Auto buttons: each flips its own setting)
  const autos = await page.evaluate(() => {
    const g = window.__game;
    const ult = document.querySelector('.fhAutoUlt');
    const sp = document.querySelector('.fhAutoSpell');
    const r = { ultShown: !!ult?.offsetParent, spellShown: !!sp?.offsetParent, ult0: g.meta.ultAuto, spell0: g.meta.spellAuto };
    ult?.click();
    r.ult1 = g.meta.ultAuto;
    r.ultPressed = ult?.getAttribute('aria-pressed');
    if (sp?.offsetParent) { sp.click(); r.spell1 = g.meta.spellAuto; r.spellPressed = sp.getAttribute('aria-pressed'); sp.click(); }
    ult?.click();
    r.ult2 = g.meta.ultAuto;
    const rects = [ult, sp].filter((e) => e?.offsetParent).map((e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; });
    r.rects = rects;
    return r;
  });
  note(`${w} autos ${JSON.stringify(autos)}`);
  await shot('fight-hud');
  // (Auto ultimates off, so the hand-fired one is ours; the fight at the fastest speed it allows)
  await page.evaluate(() => {
    const g = window.__game;
    if (g.meta.ultAuto) document.querySelector('.fhAutoUlt').click();
    g.setSpeed(3);
    // (the foes made tough, so the wave outlasts three ultimates)
    for (const f of g.b.units) if (f.side === 'foe') { f.maxHp *= 40; f.hp *= 40; }
  });
  const speed = await page.evaluate(() => window.__game.speed);
  await page.waitForFunction(() => {
    const u = window.__game.b.units.filter((x) => x.alive);
    return u.some((h) => h.side === 'hero' && u.some((f) => f.side === 'foe' && Math.max(Math.abs(f.u - h.u), Math.abs(f.v - h.v)) <= 2));
  }, null, { timeout: 25000, polling: 200 }).catch(() => {});
  for (const [pick, skip] of [['samurai', false], ['samurai', false], ['wizard', true]]) {
    const r = await page.evaluate(async ([pick, skip]) => {
      const g = window.__game;
      const hs = g.b.units.filter((u) => u.side === 'hero' && u.owner === undefined && u.alive);
      const u = hs.find((x) => x.def === pick) ?? hs[0];
      if (!u) return 'no hero';
      u.charge2 = 100;
      g.hud.refresh(g.b);
      const row = document.querySelector(`.fhRow[data-unit="${u.id}"]`);
      if (!row) return 'no row';
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const t0 = performance.now();
      let began = null;
      const marks = [];
      while (performance.now() - t0 < 9000) {
        await new Promise((r) => requestAnimationFrame(r));
        const cur = g.ultm.queue.current;
        const now = performance.now();
        if (cur && began === null) { began = now; marks.push([0, g.b.t, g.ultm.queue.phase]); if (skip) setTimeout(() => document.querySelector('.umLayer').dispatchEvent(new MouseEvent('click', { bubbles: true })), 400); }
        if (began !== null && marks.length < 200 && now - began > marks.at(-1)[0] + 250) marks.push([Math.round(now - began), g.b.t, g.ultm.queue.phase, g.speed]);
        if (began !== null && !cur) return { ms: Math.round(now - began), marks };
      }
      return { ms: began === null ? 'never began' : 'never ended', marks };
    }, [pick, skip]);
    note(`${w} ult ${pick} ${skip ? 'skipped at 400 ms' : 'played'} at x${speed}: ${JSON.stringify(r)}`);
    await wait(page, 600);
  }
  // (the camera: a pan, then where the world sits each half second)
  const cam = await page.evaluate(async () => {
    const g = window.__game;
    const c = g.app.canvas.getBoundingClientRect();
    const x = c.left + c.width / 2, y = c.top + c.height * 0.45;
    const fire = (type, dx, dy) => g.app.canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x + dx, clientY: y + dy }));
    fire('pointerdown', 0, 0);
    for (let i = 1; i <= 10; i++) { fire('pointermove', -12 * i, -6 * i); await new Promise((r) => requestAnimationFrame(r)); }
    fire('pointerup', -120, -60);
    const out = [];
    const t0 = performance.now();
    for (let i = 0; i < 16; i++) {
      out.push([Math.round(performance.now() - t0), Math.round(g.world.x), Math.round(g.world.y), +g.world.scale.x.toFixed(2)]);
      await new Promise((r) => setTimeout(r, 500));
    }
    return out;
  });
  note(`${w} camera after a pan ${JSON.stringify(cam)}`);
  await shot('fight-late');
  await ctx.close();
  note(`${w} errors ${log.errors.length} 404 ${log.missing.length} console ${JSON.stringify(log.console.slice(0, 3))}`);
}
await browser.close();
server.close();
