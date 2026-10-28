// STAND-003 phase A: the visual proposal's mock-ups, at 393x852, from the mock builds (`build.mjs`): the real renderer with the proposed art and a
// castle-interior layout laid onto the field by hand, and the proposed page pieces (the new king, the roster tray, rings, arrows, the pause sheet)
// put over it in the page. Every picture carries a "MOCK-UP" label. Writes docs/samples/stand-overhaul-mock-*.png.
//   node tools/stand/mock/shots.mjs [scene ...]
import { readFileSync } from 'node:fs';
import { serve, launch, boot, enter } from '../lib.mjs';

const ART = 'out/stand-mock/art';
const uri = (f) => `data:image/png;base64,${readFileSync(`${ART}/${f}.png`).toString('base64')}`;
const PICS = { king: uri('king_front'), throne: uri('throne') };
const only = process.argv.slice(2);
const W = 393;
const H = 852;

/** The castle halls the proposal shows: their pillars, their shelves (as boulders in the library build), their breaches (side, centre, width). */
const HALLS = {
  hall: {
    title: 'The great hall',
    pillars: [[7, 3], [7, 6], [7, 9], [7, 15], [7, 18], [7, 21], [17, 3], [17, 6], [17, 9], [17, 15], [17, 18], [17, 21]],
    breaches: [['north', 11, 4], ['east', 16, 3]],
    rubble: [[10, 2], [14, 1], [21, 14], [22, 19], [13, 3]],
  },
  chapel: {
    title: 'The chapel',
    pillars: [[5, 5], [5, 19], [19, 5], [19, 19], [12, 4], [12, 20], [4, 12], [20, 12]],
    breaches: [['west', 8, 3], ['south', 15, 4]],
    rubble: [[2, 7], [1, 10], [14, 21], [18, 22], [3, 9]],
    // (raised galleries round the nave: height for the shooters)
    gallery: true,
  },
  library: {
    title: 'The library',
    pillars: [[3, 3], [3, 20], [20, 3], [20, 20]],
    breaches: [['south', 6, 3], ['east', 7, 3], ['north', 17, 3]],
    shelves: [[2, 5, 2, 10], [2, 5, 14, 21], [18, 21, 2, 10], [18, 21, 14, 21], [6, 9, 2, 2], [15, 18, 2, 2], [6, 9, 21, 21], [15, 18, 21, 21]],
  },
};

/** In the page: lay a hall onto the Stand's field (a flat floor, the walls round the edge with their breaches, pillars, rubble, the dais), and draw it again. */
function layHall(hall) {
  const v = window.__game.stand;
  const s = v.state;
  const b = s.b.board;
  b.area = 'dungeon';
  const ring = (u, w) => Math.max(Math.abs(u - 12), Math.abs(w - 12));
  const taken = new Set(s.b.units.filter((x) => x.alive).map((x) => x.v * 24 + x.u));
  const T = (u, w) => b.tiles[w * 24 + u];
  for (let w = 0; w < 24; w++)
    for (let u = 0; u < 24; u++) {
      const t = T(u, w);
      for (const k of ['rock', 'wall', 'barrel', 'bush', 'ground', 'bridge']) delete t[k];
      const r = ring(u, w);
      t.h = r <= 1 ? 3 : r === 2 ? 2 : hall.gallery && r >= 8 ? (r === 8 ? 2 : 3) : 1;
      if (u === 0 || w === 0 || u === 23 || w === 23) {
        t.h = 7;
        t.ground = 'ice';
      }
    }
  // (the breaches: a gap in the wall, its broken ends lower, and rubble strewn inside)
  for (const [side, c, n] of hall.breaches) {
    for (let i = -Math.floor(n / 2) - 1; i <= Math.floor(n / 2) + 1; i++) {
      const at = side === 'north' ? [c + i, 0] : side === 'south' ? [c + i, 23] : side === 'west' ? [0, c + i] : [23, c + i];
      const t = T(at[0], at[1]);
      const edge = Math.abs(i) === Math.floor(n / 2) + 1;
      t.h = edge ? 4 : 1;
      if (!edge) delete t.ground;
    }
  }
  for (const [u, w] of hall.pillars ?? []) if (!taken.has(w * 24 + u)) Object.assign(T(u, w), { h: 7, ground: 'ice' });
  for (const [u, w] of hall.rubble ?? []) if (!taken.has(w * 24 + u)) T(u, w).rock = true;
  for (const [u0, u1, w] of hall.rows ?? []) for (let u = u0; u <= u1; u++) if (!taken.has(w * 24 + u) && u !== 12) T(u, w).rock = true;
  for (const [u0, u1, w0, w1] of hall.shelves ?? []) for (let u = u0; u <= u1; u++) for (let w = w0; w <= w1; w++) if (!taken.has(w * 24 + u) && (u === u0 || u === u1 || w === w0 || w === w1)) T(u, w).rock = true;
  s.b.stand.fields = {};
  v.buildField();
  v.snapCamera();
}

/** In the page: the new king on his throne, over where the king's sprite stands (which is hidden). */
function placeKing(pics) {
  const v = window.__game.stand;
  const s = v.state;
  const sp = v.sprites.get(s.king.id);
  // (only the old figure goes: his health bar stays)
  sp.body.alpha = 0;
  const k = v.world.scale.x;
  const t = s.b.board.tiles[12 * 24 + 12];
  const x = v.world.x + 0 * k;
  const y = v.world.y + (24 * 16 - t.h * 12) * k;
  const add = (src, w, foot, z) => {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'mockPiece';
    Object.assign(img.style, { position: 'fixed', left: `${Math.round(x - w / 2)}px`, top: `${Math.round(y - w * foot)}px`, width: `${w}px`, imageRendering: 'pixelated', zIndex: z, pointerEvents: 'none' });
    document.body.append(img);
  };
  add(pics.throne, Math.round(64 * k), 1.12, 2);
  add(pics.king, Math.round(128 * k * 0.72), 0.97, 3);
}

/** In the page: the "MOCK-UP" label and a caption. */
function label(text) {
  const d = document.createElement('div');
  d.className = 'mockPiece';
  d.innerHTML = `<b>MOCK-UP</b><span>${text}</span>`;
  Object.assign(d.style, { position: 'fixed', left: '8px', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 50, pointerEvents: 'none', display: 'none' });
  document.body.append(d);
  const tag = document.createElement('div');
  tag.className = 'mockPiece mockTag';
  tag.innerHTML = `<b>MOCK-UP</b> ${text}`;
  Object.assign(tag.style, { position: 'fixed', left: '0', right: '0', bottom: '0', padding: '4px 8px', font: '400 12px/1.3 sans-serif', color: '#fff', background: 'rgba(160,20,20,0.88)', zIndex: 60, textAlign: 'center', pointerEvents: 'none' });
  document.body.append(tag);
}

async function open(browser, build) {
  const server = serve(`out/stand-mock/web-${build}`, 8141);
  const { page, ctx, errors } = await boot(browser, W, H, 30, 8141);
  await page.evaluate(() => localStorage.setItem('lotf-tips-off', '1'));
  await page.waitForSelector('#hmTower', { state: 'attached', timeout: 15000 });
  await enter(page);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { page, ctx, errors, close: async () => (await ctx.close(), server.close()) };
}


/** In the page: the mock-ups' own styles (sizes 12 and 24 only, never bold, as the Stand's page). */
function mockStyles() {
  const st = document.createElement('style');
  st.className = 'mockPiece';
  st.textContent = `
  .mkTray { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; padding: 8px 8px 30px; display: flex; flex-direction: column; gap: 6px; background: linear-gradient(rgba(14,12,20,0), rgba(14,12,20,0.94) 18%); font: 400 12px/1.25 'Alegreya Sans', sans-serif; color: #e8e0d0; }
  .mkTip { text-align: center; color: #c8bfae; }
  .mkRoster { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .mkHero { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0; padding: 2px; min-height: 48px; background: #241f2c; border: 2px solid #4a4256; }
  .mkHero canvas, .mkHero img { width: 32px; height: 32px; image-rendering: pixelated; border-radius: 50%; background: rgba(0,0,0,0.35); }
  .mkHero.placed { opacity: 0.5; border-style: dashed; }
  .mkHero.placed::after { content: 'posted'; position: absolute; top: 2px; right: 4px; color: #9fd8a0; }
  .mkHero.lift { outline: 2px solid #ffd76a; box-shadow: 0 0 12px #ffb84a; }
  .mkHero em { font-style: normal; color: #a99f8e; }
  .mkRow { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 6px; }
  .mkRow button { min-height: 48px; font: 400 12px/1.2 'Alegreya Sans', sans-serif; color: #f0e6d0; background: #2c2634; border: 2px solid #5a5066; }
  .mkRow button.go { font: 400 24px/1.1 'Cinzel Decorative', serif; color: #1c1408; background: linear-gradient(#f2cf6a, #c9952e); border-color: #7a5a18; }
  .mkGhost { position: fixed; z-index: 30; width: 48px; height: 48px; border-radius: 50%; outline: 2px solid #ffd76a; box-shadow: 0 0 16px #ffb84a; image-rendering: pixelated; background: rgba(0,0,0,0.4); }
  .mkFinger { position: fixed; z-index: 31; width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.55); border: 2px solid #fff; }
  .mkCall { position: fixed; z-index: 25; padding: 2px 6px; font: 400 12px/1.2 'Alegreya Sans', sans-serif; color: #1c1408; background: #ffd76a; border: 1px solid #7a5a18; white-space: nowrap; }
  .mkArrow { position: fixed; z-index: 25; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
  .mkArrow i { position: absolute; inset: 0; border-radius: 50%; background: rgba(20,16,26,0.85); border: 2px solid var(--c); }
  .mkArrow canvas, .mkArrow img { position: relative; width: 32px; height: 32px; border-radius: 50%; image-rendering: pixelated; }
  .mkArrow b { position: absolute; width: 0; height: 0; border: 8px solid transparent; }
  .mkSheet { position: fixed; inset: 0; z-index: 40; display: flex; align-items: flex-start; justify-content: center; padding: 56px 8px 32px; background: rgba(8,6,12,0.82); font: 400 12px/1.25 'Alegreya Sans', sans-serif; color: #e8e0d0; }
  .mkCard { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 6px; padding: 10px; background: #1e1a26; border: 2px solid #8a6a2a; box-shadow: 0 0 0 2px #0c0a10; }
  .mkCard h2 { margin: 0; text-align: center; font: 400 24px/1.2 'Cinzel Decorative', serif; color: #f2cf6a; }
  .mkKing { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; padding: 4px 6px; background: rgba(0,0,0,0.3); border: 2px solid #5a4a2a; }
  .mkKing img { width: 40px; height: 40px; image-rendering: pixelated; object-fit: cover; object-position: 50% 10%; }
  .mkBar { height: 8px; background: #111; border: 1px solid #444; }
  .mkBar span { display: block; height: 100%; }
  .mkGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .mkU { display: flex; flex-direction: column; gap: 3px; padding: 4px 6px; background: rgba(0,0,0,0.3); border: 2px solid #3e3648; }
  .mkU.fallen { opacity: 0.55; filter: grayscale(0.9); }
  .mkU header { display: flex; align-items: center; gap: 6px; }
  .mkU header canvas, .mkU header img { width: 32px; height: 32px; border-radius: 50%; image-rendering: pixelated; background: rgba(0,0,0,0.4); }
  .mkU header span { color: #f2cf6a; }
  .mkU header em { margin-left: auto; font-style: normal; color: #a99f8e; }
  .mkStats { display: grid; grid-template-columns: repeat(3, 1fr); color: #c8bfae; }
  .mkSk { display: flex; justify-content: space-between; color: #c8bfae; }
  .mkSk.ready { color: #9fd8ff; }
  .mkSk.shut { color: #6e6678; }
  .mkSk.ult { color: #f2cf6a; }
  .mkResume { min-height: 48px; font: 400 24px/1.1 'Cinzel Decorative', serif; color: #1c1408; background: linear-gradient(#f2cf6a, #c9952e); border: 2px solid #7a5a18; }
  `;
  document.head.append(st);
}

/** In the page: the screen point of a tile's top (the world's own projection, `iso.ts`). */
function tileXY(u, w) {
  const v = window.__game.stand;
  const t = v.state.b.board.tiles[w * 24 + u];
  const k = v.world.scale.x;
  return [v.world.x + (u - w) * 32 * k, v.world.y + ((u + w) * 16 - t.h * 12) * k];
}

/** In the page: a portrait of a hero as a picture (from the hero bar's own canvas). */
function portraitOf(unitId) {
  const c = document.querySelector(`.hb[data-unit="${unitId}"] .hbPic`);
  if (!c) return '';
  return c.toDataURL ? c.toDataURL() : c.src;
}

const SCENES = {
  /** A castle hall mid-wave: the foes pour in through the breaches; the king on his throne on the dais. */
  async hall(browser, name = 'hall') {
    const { page, close } = await open(browser, name === 'library' ? 'library' : 'hall');
    await page.evaluate(layHall, HALLS[name]);
    await page.evaluate(() => document.querySelector('.stStart').click());
    // (a few seconds of the wave, the foes moved to the breaches they would come in by)
    await page.evaluate(([hall]) => {
      const v = window.__game.stand;
      const s = v.state;
      v.debugRun(3000);
      const gaps = [];
      for (const [side, c, n] of hall.breaches)
        for (let i = -Math.floor(n / 2); i <= Math.floor(n / 2); i++)
          for (let d = 0; d < 4; d++) gaps.push(side === 'north' ? [c + i, d] : side === 'south' ? [c + i, 23 - d] : side === 'west' ? [d, c + i] : [23 - d, c + i]);
      let g = 0;
      for (const f of s.b.units.filter((x) => x.alive && x.side === 'foe')) {
        const [u, w] = gaps[g++ % gaps.length];
        f.u = u;
        f.v = w;
        f.step = undefined;
      }
      v.speed = 1;
    }, [HALLS[name]]);
    await page.waitForTimeout(2500);
    await page.evaluate(() => (window.__game.stand.paused = true));
    await page.evaluate(() => {
      const v = window.__game.stand;
      // (zoomed out past the page's usual steps, to show the whole hall)
      v.scale = v.tscale = 0.56;
      v.cx = v.tx = 0;
      v.cy = v.ty = 300;
      v.place();
      const q = document.getElementById('quip');
      if (q) q.style.display = 'none';
    });
    await page.waitForTimeout(300);
    await page.evaluate(placeKing, PICS);
    await page.evaluate(label, `${HALLS[name].title}: walls breached, the king on his throne`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `docs/samples/stand-overhaul-mock-${name}.png` });
    await close();
  },

  /** The deploy step: the roster tray, the glowing posts the ring plan suggests, a hero dragged onto one, Auto-place and Clear. */
  async deploy(browser) {
    const { page, close } = await open(browser, 'hall');
    await page.evaluate(layHall, HALLS.hall);
    await page.evaluate(mockStyles);
    await page.evaluate(() => {
      const v = window.__game.stand;
      const s = v.state;
      v.heroBar.build(s.b);
      v.scale = v.tscale = 1;
      v.place();
      const q = document.getElementById('quip');
      if (q) q.style.display = 'none';
    });
    await page.waitForTimeout(600);
    await page.evaluate(([tileXYs, portraitOfs]) => {
      const tileXY = new Function(`return (${tileXYs})`)();
      const portraitOf = new Function(`return (${portraitOfs})`)();
      const v = window.__game.stand;
      const s = v.state;
      const heroes = s.b.units.filter((u) => u.side === 'hero' && u.tag !== undefined);
      // (three not yet posted: their figures off the field, their posts glowing)
      const waiting = heroes.slice(5);
      // (moved off to a far corner, out of the picture; their posts stay)
      waiting.forEach((u, i) => {
        u.u = 1 + i;
        u.v = 22;
      });
      document.querySelector('.stCount').style.display = 'none';
      const g = v.marks;
      g.clear();
      const k = 1;
      const diamond = (u, w, colour, a, line) => {
        const t = s.b.board.tiles[w * 24 + u];
        const x = (u - w) * 32;
        const y = (u + w) * 16 - t.h * 12;
        g.poly([x, y - 14, x + 29, y, x, y + 14, x - 29, y]);
        if (line) g.stroke({ color: colour, alpha: a, width: 2 });
        else g.fill({ color: colour, alpha: a });
      };
      // every tile a hero may be posted on, faint; the posts taken, a gold rim; the suggested ones, glowing
      for (let w = 6; w <= 18; w++) for (let u = 6; u <= 18; u++) {
        const t = s.b.board.tiles[w * 24 + u];
        if (t.ground === 'ice' || t.rock || (u === 12 && w === 12)) continue;
        diamond(u, w, 0x4a9cff, 0.12);
      }
      for (const u of heroes.slice(0, 5)) diamond(u.u, u.v, 0xffe066, 0.8, true);
      for (const u of waiting) {
        diamond(u.post.u, u.post.v, 0xffc84a, 0.45);
        diamond(u.post.u, u.post.v, 0xfff2b0, 0.95, true);
      }
      // the tray: the eight, the posted ones dimmed; one lifted and being dragged to its post
      document.querySelector('.stBottom').style.visibility = 'hidden';
      const tray = document.createElement('div');
      tray.className = 'mockPiece mkTray';
      const tip = document.createElement('div');
      tip.className = 'mkTip';
      tip.textContent = 'Drag a hero onto a glowing post. Tap two heroes to swap them.';
      const roster = document.createElement('div');
      roster.className = 'mkRoster';
      heroes.forEach((u, i) => {
        const b = document.createElement('div');
        b.className = `mkHero${i < 5 ? ' placed' : ''}${i === 5 ? ' lift' : ''}`;
        const img = document.createElement('img');
        img.src = portraitOf(u.id);
        const name = document.createElement('span');
        name.textContent = u.def[0].toUpperCase() + u.def.slice(1);
        const role = document.createElement('em');
        role.textContent = u.post?.tank ? 'Front' : u.post?.leash === 1 ? 'Inner ring' : 'Middle ring';
        b.append(img, name, role);
        roster.append(b);
      });
      const row = document.createElement('div');
      row.className = 'mkRow';
      for (const [t, c] of [['Auto-place', ''], ['Clear', ''], ['Begin', 'go']]) {
        const b = document.createElement('button');
        b.textContent = t;
        b.className = c;
        row.append(b);
      }
      tray.append(tip, roster, row);
      document.body.append(tray);
      // the drag: the lifted hero's portrait under a finger, on its way to its glowing post
      const target = waiting[0];
      const [px, py] = tileXY(target.post.u, target.post.v);
      const ghost = document.createElement('img');
      ghost.className = 'mockPiece mkGhost';
      ghost.src = portraitOf(target.id);
      Object.assign(ghost.style, { left: `${px - 60}px`, top: `${py + 26}px` });
      const finger = document.createElement('div');
      finger.className = 'mockPiece mkFinger';
      Object.assign(finger.style, { left: `${px - 36}px`, top: `${py + 56}px` });
      const call = document.createElement('div');
      call.className = 'mockPiece mkCall';
      call.textContent = `Suggested post: ${target.post.tank ? 'the front, facing a breach' : target.post.leash === 1 ? 'the inner ring' : 'the middle ring'}`;
      Object.assign(call.style, { left: `${Math.min(innerWidth - 190, px - 60)}px`, top: `${py - 44}px` });
      document.body.append(ghost, finger, call);
      void k;
    }, [tileXY.toString(), portraitOf.toString()]);
    await page.evaluate(placeKing, PICS);
    await page.evaluate(label, 'Deploy: the roster tray, suggested posts, drag to post, Auto-place');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'docs/samples/stand-overhaul-mock-deploy.png' });
    await close();
  },

  /** Finding the heroes: a ring under each, a tapped portrait that pans to its hero, arrows at the rim to those off the screen, red bars on the foes. */
  async units(browser) {
    const { page, close } = await open(browser, 'hall');
    await page.evaluate(layHall, HALLS.hall);
    await page.evaluate(mockStyles);
    await page.evaluate(() => document.querySelector('.stStart').click());
    await page.evaluate(() => window.__game.stand.debugRun(9000));
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const v = window.__game.stand;
      v.paused = true;
      v.scale = v.tscale = 1;
      // (the camera panned towards the east breach, so some heroes are off the screen)
      v.cx = v.tx = 150;
      v.cy = v.ty = 330;
      v.place();
      const q = document.getElementById('quip');
      if (q) q.style.display = 'none';
    });
    await page.waitForTimeout(400);
    await page.evaluate(([tileXYs, portraitOfs]) => {
      const tileXY = new Function(`return (${tileXYs})`)();
      const portraitOf = new Function(`return (${portraitOfs})`)();
      const v = window.__game.stand;
      const s = v.state;
      const heroes = s.b.units.filter((u) => u.side === 'hero' && u.tag !== undefined && u.alive);
      const COLOURS = [0xffd24a, 0x4ad2ff, 0xff6a4a, 0x8aff6a, 0xd06aff, 0xffffff, 0xff9ad0, 0x6affd2];
      const css = (c) => `#${c.toString(16).padStart(6, '0')}`;
      const G = v.marks.constructor;
      const rings = new G();
      rings.zIndex = 3;
      const bars = new G();
      bars.zIndex = 1e6;
      v.holder.addChild(rings, bars);
      v.marks.clear();
      heroes.forEach((u, i) => {
        const sp = v.sprites.get(u.id);
        const t = s.b.board.tiles[u.v * 24 + u.u];
        const x = (u.u - u.v) * 32;
        const y = (u.u + u.v) * 16 - t.h * 12;
        rings.ellipse(x, y, 22, 11).stroke({ color: COLOURS[i], width: 3, alpha: 0.95 });
        rings.ellipse(x, y, 22, 11).fill({ color: COLOURS[i], alpha: 0.18 });
        void sp;
      });
      // the foes' bars: red, framed dark, always shown
      for (const f of s.b.units.filter((u) => u.alive && u.side === 'foe')) {
        const sp = v.sprites.get(f.id);
        if (!sp) continue;
        const t = s.b.board.tiles[f.v * 24 + f.u];
        const x = (f.u - f.v) * 32;
        const y = (f.u + f.v) * 16 - t.h * 12 - sp.tall - 6;
        bars.rect(x - 15, y, 30, 5).fill({ color: 0x1a0a0a });
        bars.rect(x - 14, y + 1, 28 * Math.max(0.15, f.hp / f.maxHp), 3).fill({ color: 0xe0362a });
      }
      // the hero bar: each tile rimmed in its hero's colour; the tapped one lit, its hero pulsed
      const tiles = [...document.querySelectorAll('.hb')];
      tiles.forEach((el) => {
        const i = heroes.findIndex((u) => String(u.id) === el.dataset.unit);
        if (i >= 0) el.style.boxShadow = `inset 0 0 0 2px ${css(COLOURS[i])}`;
      });
      const tapped = heroes[2];
      const tEl = tiles.find((el) => el.dataset.unit === String(tapped.id));
      if (tEl) tEl.style.boxShadow = `0 0 0 2px ${css(COLOURS[2])}, 0 0 14px ${css(COLOURS[2])}`;
      // arrows at the rim, pointing to the heroes off the screen
      const room = { x0: 0, y0: 60, x1: innerWidth, y1: document.querySelector('.stBottom').getBoundingClientRect().top };
      const cx = (room.x0 + room.x1) / 2;
      const cy = (room.y0 + room.y1) / 2;
      heroes.forEach((u, i) => {
        const [x, y] = tileXY(u.u, u.v);
        if (x > room.x0 + 10 && x < room.x1 - 10 && y > room.y0 + 30 && y < room.y1 - 10) {
          if (u === tapped) {
            const p = new G();
            p.zIndex = 4;
            const t = s.b.board.tiles[u.v * 24 + u.u];
            const wx = (u.u - u.v) * 32;
            const wy = (u.u + u.v) * 16 - t.h * 12;
            p.ellipse(wx, wy, 34, 17).stroke({ color: COLOURS[i], width: 2, alpha: 0.6 });
            p.ellipse(wx, wy, 46, 23).stroke({ color: COLOURS[i], width: 1, alpha: 0.35 });
            v.holder.addChild(p);
          }
          return;
        }
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.min((room.x1 - room.x0) / 2 - 30, (room.y1 - room.y0) / 2 - 30) / Math.max(Math.abs(dx) / ((room.x1 - room.x0) / 2), Math.abs(dy) / ((room.y1 - room.y0) / 2)) / Math.hypot(dx / ((room.x1 - room.x0) / 2), dy / ((room.y1 - room.y0) / 2)) * 1;
        const n = Math.hypot(dx, dy);
        const ax = Math.max(26, Math.min(innerWidth - 26, cx + (dx / n) * Math.min(n, 1000)));
        const ay = Math.max(room.y0 + 26, Math.min(room.y1 - 26, cy + (dy / n) * Math.min(n, 1000)));
        void r;
        const a = document.createElement('div');
        a.className = 'mockPiece mkArrow';
        a.style.setProperty('--c', css(COLOURS[i]));
        Object.assign(a.style, { left: `${ax - 22}px`, top: `${ay - 22}px` });
        const ang = Math.atan2(dy, dx);
        const tip = document.createElement('b');
        Object.assign(tip.style, { left: `${22 + Math.cos(ang) * 26 - 8}px`, top: `${22 + Math.sin(ang) * 26 - 8}px`, borderLeftColor: css(COLOURS[i]), transform: `rotate(${(ang * 180) / Math.PI}deg)` });
        const img = document.createElement('img');
        img.src = portraitOf(u.id);
        a.append(document.createElement('i'), img, tip);
        document.body.append(a);
      });
      const call = document.createElement('div');
      call.className = 'mockPiece mkCall';
      call.textContent = 'Tapped a portrait: the camera glides to that hero';
      const [tx, ty] = tileXY(tapped.u, tapped.v);
      Object.assign(call.style, { left: `${Math.max(8, Math.min(innerWidth - 270, tx - 120))}px`, top: `${ty + 20}px` });
      document.body.append(call);
    }, [tileXY.toString(), portraitOf.toString()]);
    await page.evaluate(placeKing, PICS);
    await page.evaluate(label, 'Finding the heroes: rings, portrait taps, rim arrows, red foe bars');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'docs/samples/stand-overhaul-mock-units.png' });
    await close();
  },

  /** The pause sheet: the king, then each hero's card (level, health, pool, attack, defence, kills, skills and ultimate), and Resume. */
  async pause(browser) {
    const { page, close } = await open(browser, 'hall');
    await page.evaluate(layHall, HALLS.hall);
    await page.evaluate(mockStyles);
    await page.evaluate(() => document.querySelector('.stStart').click());
    await page.evaluate(() => {
      const v = window.__game.stand;
      v.debugRun(12000);
      // (one hero fallen for good, to show how the fallen read)
      const u = v.state.b.units.find((x) => x.def === 'kunoichi');
      if (u) (u.alive = false), (u.hp = 0);
      v.debugRun(200);
    });
    await page.waitForTimeout(1500);
    await page.evaluate((pics) => {
      const v = window.__game.stand;
      v.paused = true;
      const q = document.getElementById('quip');
      if (q) q.style.display = 'none';
      const sh = v.sheet;
      const box = document.createElement('div');
      box.className = 'mockPiece mkSheet';
      const card = document.createElement('div');
      card.className = 'mkCard';
      const units = v.state.b.units;
      const pic = (id) => {
        const u = units.find((x) => x.tag === id);
        const c = u && document.querySelector(`.hb[data-unit="${u.id}"] .hbPic`);
        return c ? (c.toDataURL ? c.toDataURL() : c.src) : '';
      };
      const bar = (share, colour) => `<div class="mkBar"><span style="width:${Math.round(share * 100)}%;background:${colour}"></span></div>`;
      card.innerHTML = `<h2>Paused</h2><div class="mkKing"><img src="${pics.king}"><div><span style="color:#f2cf6a">The king</span> · wave ${sh.wave} · ${sh.gold} gold${bar(sh.king.hp / sh.king.maxHp, '#3fae4a')}</div><span>${sh.king.hp} / ${sh.king.maxHp}</span></div>`;
      const grid = document.createElement('div');
      grid.className = 'mkGrid';
      for (const h of sh.heroes) {
        const el = document.createElement('div');
        el.className = `mkU${h.fallen ? ' fallen' : ''}`;
        const sk = h.skills.map((k) => `<div class="mkSk ${!k.open ? 'shut' : k.paid ? 'ready' : ''}"><span>${k.name}</span><span>${k.open ? k.cost : `Lv ${k.opens}`}</span></div>`).join('');
        const ult = h.ult ? `<div class="mkSk ult"><span>${h.ult.name}</span><span>${!h.ult.open ? `Lv ${h.ult.opens}` : h.ult.ready ? 'Ready' : `${Math.round(h.ult.meter * 100)}%`}</span></div>` : '';
        el.innerHTML = `<header><img src="${pic(h.id)}"><span>${h.name}</span><em>${h.fallen ? 'Fallen' : `Lv ${h.level}${h.runLv ? ` +${h.runLv}` : ''}`}</em></header>
          ${bar(h.maxHp ? h.hp / h.maxHp : 0, '#3fae4a')}${h.pool ? bar(h.pool.now / h.pool.max, h.pool.kind === 'mana' ? '#4a8cff' : '#e0b030') : ''}
          <div class="mkStats"><span>Atk ${h.atk}</span><span>Def ${h.def}</span><span>Kills ${h.kills}</span></div>${sk}${ult}`;
        grid.append(el);
      }
      const go = document.createElement('button');
      go.className = 'mkResume';
      go.textContent = 'Resume';
      card.append(grid, go);
      box.append(card);
      document.body.append(box);
    }, PICS);
    await page.evaluate(label, 'The pause sheet: every hero\'s stats and skills, the king, Resume');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'docs/samples/stand-overhaul-mock-pause.png' });
    await close();
  },
};

const browser = await launch();
for (const [name, run] of Object.entries(SCENES)) if (!only.length || only.includes(name)) await run(browser);
for (const n of ['chapel', 'library']) if (only.includes(n)) await SCENES.hall(browser, n);
await browser.close();
