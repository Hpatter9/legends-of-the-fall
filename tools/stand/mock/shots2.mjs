// STAND-003, the second round of mock-ups (the owner: "make this fit the new style, more ornate, exciting, flashy"): the four castle halls
// dressed (banners, braziers and their pools of light, stained glass and its coloured light, carpets, broken masonry, smoke and dust at the
// breaches, the grand dais with the castle's enthroned king), the Keep & Kingdom brass on the Stand's bars, the deploy tray and the pause sheet.
// The real renderer from the mock builds (`build.mjs`, after `prep.py`), the halls laid on the field and the dressing added in the page.
// Every picture carries a "MOCK-UP" label. Writes docs/samples/stand-overhaul-mock2-*.png at 393x852.
//   python3 tools/stand/mock/prep.py ../chronos-assets && node tools/stand/mock/build.mjs && node tools/stand/mock/shots2.mjs [scene ...]
import { readFileSync, readdirSync } from 'node:fs';
import { serve, launch, boot, enter } from '../lib.mjs';

const ART = 'out/stand-mock/art';
const PICS = Object.fromEntries(readdirSync(ART).filter((f) => f.endsWith('.png')).map((f) => [f.slice(0, -4), `data:image/png;base64,${readFileSync(`${ART}/${f}`).toString('base64')}`]));
const only = process.argv.slice(2);
const W = 393;
const H = 852;

/** The four halls: the walls' breaches (side, centre, width), pillars, cover, carpets and the dressing's places. */
const HALLS = {
  hall: {
    title: 'The great hall',
    pillars: [[7, 4], [7, 8], [7, 16], [7, 20], [17, 4], [17, 8], [17, 16], [17, 20]],
    breaches: [['north', 12, 4], ['east', 16, 3]],
    rubble: [[11, 2], [14, 1], [21, 14], [22, 19], [13, 3], [20, 17]],
    runner: [[12, 15, 12, 22], [12, 1, 12, 9]],
    braziers: [[9, 9], [15, 9], [9, 15], [15, 15], [7, 12], [17, 12]],
  },
  chapel: {
    title: 'The chapel',
    pillars: [[5, 5], [5, 19], [19, 5], [19, 19], [12, 4], [12, 20], [4, 12], [20, 12]],
    breaches: [['west', 8, 3], ['south', 15, 4]],
    rubble: [[2, 7], [1, 10], [14, 21], [18, 22], [3, 9]],
    gallery: true,
    runner: [[12, 15, 12, 19], [12, 5, 12, 9], [5, 12, 9, 12], [15, 12, 19, 12]],
    braziers: [[9, 9], [15, 9], [9, 15], [15, 15]],
    boss: true,
  },
  library: {
    title: 'The library',
    pillars: [[3, 3], [3, 20], [20, 3], [20, 20]],
    breaches: [['south', 6, 3], ['east', 7, 3], ['north', 17, 3]],
    shelves: [[2, 5, 2, 10], [2, 5, 14, 21], [18, 21, 14, 21], [6, 9, 2, 2], [6, 9, 21, 21], [15, 18, 21, 21]],
    runner: [[12, 15, 12, 20]],
    braziers: [[9, 9], [15, 9], [9, 15], [15, 15]],
  },
  courtyard: {
    title: 'The courtyard',
    area: 'plains',
    pillars: [],
    breaches: [['north', 6, 4], ['west', 17, 4], ['east', 5, 3]],
    rubble: [[5, 2], [8, 1], [1, 15], [2, 19], [21, 4]],
    cover: [['fountain', 18, 17], ['well', 6, 6], ['crates', 17, 6], ['barrels', 18, 7], ['chests', 5, 18], ['pots', 7, 19]],
    flags: [[12, 13, 12, 22], [13, 12, 22, 12], [12, 1, 12, 11], [1, 12, 11, 12]],
    braziers: [[9, 9], [15, 9], [9, 15], [15, 15]],
    lamps: [[9, 4], [15, 4], [4, 9], [4, 15], [20, 9], [9, 20], [15, 20]],
  },
};

/** In the page: lay a hall on the field and dress it. Pixi's classes are taken from the page's own objects (the field is a Sprite). */
async function dress([hall, pics]) {
  const v = window.__game.stand;
  const s = v.state;
  const b = s.b.board;
  b.area = hall.area ?? 'dungeon';
  const ring = (u, w) => Math.max(Math.abs(u - 12), Math.abs(w - 12));
  // (the throne's own tiles are kept clear: a hero posted on the dais's inner ring steps out to its edge, so the king is seen)
  for (const x of s.b.units) {
    if (x.side !== 'hero' || x.tag === undefined) continue;
    if (ring(x.u, x.v) <= 1) {
      const du = Math.sign(x.u - 12) || 1;
      const dw = Math.sign(x.v - 12);
      x.u = 12 + 2 * du;
      x.v = 12 + 2 * dw;
      if (x.post) Object.assign(x.post, { u: x.u, v: x.v });
    }
  }
  const taken = new Set(s.b.units.filter((x) => x.alive).map((x) => x.v * 24 + x.u));
  const T = (u, w) => b.tiles[w * 24 + u];
  for (let w = 0; w < 24; w++)
    for (let u = 0; u < 24; u++) {
      const t = T(u, w);
      for (const k of ['rock', 'wall', 'barrel', 'bush', 'ground', 'bridge']) delete t[k];
      const r = ring(u, w);
      // (the grand dais: a 5x5 top of carpet, a broad step, then the floor)
      t.h = r <= 2 ? 3 : r === 3 ? 2 : hall.gallery && r >= 8 ? (r === 8 ? 2 : 3) : 1;
      if (u === 0 || w === 0 || u === 23 || w === 23) Object.assign(t, { h: 8, ground: 'ice' });
    }
  const gapTiles = [];
  for (const [side, c, n] of hall.breaches) {
    for (let i = -Math.floor(n / 2) - 1; i <= Math.floor(n / 2) + 1; i++) {
      const at = side === 'north' ? [c + i, 0] : side === 'south' ? [c + i, 23] : side === 'west' ? [0, c + i] : [23, c + i];
      const t = T(at[0], at[1]);
      const edge = Math.abs(i) === Math.floor(n / 2) + 1;
      t.h = edge ? 4 : 1;
      if (!edge) {
        delete t.ground;
        gapTiles.push([...at, side]);
      }
    }
  }
  for (const [u, w] of hall.pillars ?? []) if (!taken.has(w * 24 + u)) Object.assign(T(u, w), { h: 8, ground: 'ice' });
  for (const [u, w] of hall.rubble ?? []) if (!taken.has(w * 24 + u)) T(u, w).rock = true;
  for (const [u0, u1, w0, w1] of hall.shelves ?? []) for (let u = u0; u <= u1; u++) for (let w = w0; w <= w1; w++) if (!taken.has(w * 24 + u) && (u === u0 || u === u1 || w === w0 || w === w1)) T(u, w).rock = true;
  for (const [, u, w] of hall.cover ?? []) if (!taken.has(w * 24 + u)) T(u, w).rock = false;
  s.b.stand.fields = {};
  v.buildField();

  const Sprite = v.field.constructor;
  const Texture = v.field.texture.constructor;
  const Container = v.holder.constructor;
  const Graphics = v.marks.constructor;
  const load = async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    return Texture.from(img);
  };
  const tex = {};
  for (const [k, src] of Object.entries(pics)) tex[k] = await load(src);
  for (const t of Object.values(tex)) if (t.source) t.source.scaleMode = 'nearest';
  // (a soft round light, drawn once: the pools of torchlight and the auras)
  const glowCanvas = (r, g, bl) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${r},${g},${bl},0.85)`);
    gr.addColorStop(0.45, `rgba(${r},${g},${bl},0.3)`);
    gr.addColorStop(1, `rgba(${r},${g},${bl},0)`);
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    return Texture.from(c);
  };
  const glowWarm = glowCanvas(255, 170, 70);
  const glowGold = glowCanvas(255, 220, 120);
  const glowRed = glowCanvas(255, 60, 40);
  const layer = new Container();
  layer.sortableChildren = true;
  layer.zIndex = 0;
  v.holder.addChild(layer);
  window.__mock = { layer, tex, Sprite, Graphics, Container, glowWarm, glowGold, glowRed };
  const top = (u, w) => [(u - w) * 32, (u + w) * 16 - T(u, w).h * 12];
  const put = (key, u, w, o = {}) => {
    const sp = new Sprite(o.texture ?? tex[key]);
    sp.anchor.set(o.ax ?? 0.5, o.ay ?? 1);
    const [x, y] = top(u, w);
    sp.position.set(x + (o.dx ?? 0), y + (o.dy ?? 0));
    sp.scale.set(o.scale ?? 1, (o.scale ?? 1) * (o.sy ?? 1));
    if (o.skewY) sp.skew.y = o.skewY;
    if (o.blend) sp.blendMode = o.blend;
    if (o.alpha !== undefined) sp.alpha = o.alpha;
    if (o.tint !== undefined) sp.tint = o.tint;
    if (o.rot) sp.rotation = o.rot;
    sp.zIndex = o.z ?? (u + w) * 10 + 6;
    (o.into ?? layer).addChild(sp);
    return sp;
  };
  const glow = (u, w, t, size, alpha, dy = 0, z) => put(null, u, w, { texture: t, ax: 0.5, ay: 0.5, scale: size / 128, sy: 0.55, blend: 'add', alpha, dy, z: z ?? -5e5 });
  // carpets: a tile's diamond of the red rug (the rug square turned 45 degrees and flattened)
  const rugTile = (u, w, key = 'high') => {
    const c = new Container();
    const [x, y] = top(u, w);
    c.position.set(x, y);
    c.scale.set(1, 0.5);
    c.zIndex = -4e5;
    const sp = new Sprite(tex[key]);
    sp.anchor.set(0.5);
    sp.rotation = Math.PI / 4;
    sp.scale.set(Math.SQRT1_2 * 64 / 64 * 0.98);
    c.addChild(sp);
    layer.addChild(c);
  };
  for (const [u0, w0, u1, w1] of hall.runner ?? []) for (let u = u0; u <= u1; u++) for (let w = w0; w <= w1; w++) if (T(u, w).h < 3 && !T(u, w).rock) rugTile(u, w);
  // the courtyard's flagstone paths (the castle's own iso flagstone)
  for (const [u0, w0, u1, w1] of hall.flags ?? []) for (let u = u0; u <= u1; u++) for (let w = w0; w <= w1; w++) if (!T(u, w).rock && T(u, w).h < 3) put('flagstone', u, w, { ay: 0.5, scale: 64 / 94, z: -4e5, dy: 1 });

  // the back walls' faces: stained glass and gilt pilasters with banners, each window throwing coloured light across the floor
  const ATAN = Math.atan(0.5);
  const faceN = (u, key, scale) => {
    // (the north wall's inner face is a tile column's left face: it runs down to the right at half a step)
    const [x, y] = top(u, 0);
    return put(key, u, 0, { ax: 0.5, ay: 0, dx: -16, dy: y - y + 10, scale, skewY: ATAN, z: 1e5 });
  };
  const faceW = (w, key, scale) => {
    const [x, y] = top(0, w);
    return put(key, 0, w, { ax: 0.5, ay: 0, dx: 16, dy: 10, scale, skewY: -ATAN, z: 1e5 });
  };
  const isGap = (side, i) => gapTiles.some(([u, w, sd]) => sd === side && (side === 'north' || side === 'south' ? u === i : w === i)) || hall.breaches.some(([sd, c, n]) => sd === side && Math.abs(i - c) <= Math.floor(n / 2) + 1);
  const shafts = new Graphics();
  shafts.zIndex = -3e5;
  shafts.blendMode = 'add';
  layer.addChild(shafts);
  const GLASS = [0x6ab8ff, 0xffc04a, 0xff5a6a, 0x8aff9a];
  const indoors = !hall.area;
  for (let i = 2; i <= 21; i++) {
    const nGap = isGap('north', i);
    const wGap = isGap('west', i);
    if (!nGap) {
      if (indoors && i % 4 === 2) {
        faceN(i, 'window', 0.62);
        const [x, y] = top(i, 1);
        const c = GLASS[i % 4];
        shafts.poly([x - 30, y - 6, x - 6, y - 18, x + 70, y + 40, x + 44, y + 54]).fill({ color: c, alpha: 0.13 });
      } else if (i % 4 === 0) faceN(i, indoors ? 'pilaster' : 'banner', indoors ? 0.62 : 0.9);
    }
    if (!wGap) {
      if (indoors && i % 4 === 2) {
        faceW(i, 'window', 0.62);
        const [x, y] = top(1, i);
        const c = GLASS[(i + 1) % 4];
        shafts.poly([x + 30, y - 6, x + 6, y - 18, x - 70, y + 40, x - 44, y + 54]).fill({ color: c, alpha: 0.13 });
      } else if (i % 4 === 0) faceW(i, indoors ? 'pilaster' : 'banner', indoors ? 0.62 : 0.9);
    }
  }
  // banners atop the near walls, so the hall reads as a whole even where the faces are hidden
  for (let i = 3; i <= 20; i += 5) {
    if (!isGap('south', i)) put('banner', i, 23, { scale: 0.75 });
    if (!isGap('east', i)) put('banner', 23, i, { scale: 0.75 });
  }
  // braziers and lamps, each in a pool of warm light
  for (const [u, w] of hall.braziers ?? []) {
    glow(u, w, glowWarm, 150, 0.55, -6);
    put('brazier', u, w, { scale: 0.62, dy: 4 });
    glow(u, w, glowWarm, 46, 0.9, -48, (u + w) * 10 + 7);
  }
  for (const [u, w] of hall.lamps ?? []) {
    glow(u, w, glowWarm, 110, 0.4, -4);
    put('lamp', u, w, { scale: 0.7, dy: 4 });
  }
  // cover in the courtyard: a fountain, a well, crates and chests
  for (const [key, u, w] of hall.cover ?? []) {
    T(u, w).rock = true;
    put(key, u, w, { scale: key === 'fountain' ? 0.6 : 0.7, dy: 10 });
  }
  // the dais: standards behind the throne, a golden aura, the enthroned king of the castle
  put('standard', 10, 10, { scale: 0.55 });
  put('standard', 14, 10, { scale: 0.55 });
  put('standard', 10, 14, { scale: 0.55, z: 1 });
  glow(12, 12, glowGold, 260, 0.45, -10);
  glow(12, 12, glowGold, 120, 0.7, -60, 260);
  const kingSp = v.sprites.get(s.king.id);
  if (kingSp) kingSp.body.alpha = 0;
  put('king_throne', 12, 12, { scale: 0.6, dy: 8, z: 245 });
  // the breaches: broken masonry, smoke rolling in, dust bursting as the wave arrives
  const seen = new Set();
  for (const [u, w, side] of gapTiles) {
    const key = `${side}`;
    const inward = side === 'north' ? [0, 1] : side === 'south' ? [0, -1] : side === 'west' ? [1, 0] : [-1, 0];
    put('smoke', u, w, { scale: 1.1, tint: 0x8a8070, alpha: 0.55, dy: -26, z: (u + w) * 10 + 8 });
    put('smoke', u + inward[0], w + inward[1], { scale: 0.8, tint: 0x6a645a, alpha: 0.45, dy: -40, z: (u + w) * 10 + 18 });
    if (!seen.has(key)) {
      seen.add(key);
      put('dust', u + inward[0] * 2, w + inward[1] * 2, { ay: 0.5, scale: 1.7, alpha: 0.9, sy: 0.7, dy: -6 });
      put('dust2', u + inward[0] * 2 + 1, w + inward[1] * 2, { ay: 0.7, scale: 0.9, alpha: 0.95 });
      glow(u, w, glowRed, 140, 0.35, -10);
    }
  }
  return gapTiles;
}

/** In the page: the Keep & Kingdom brass on the Stand's own bars, and the mock-ups' pieces. Sizes 12 and 24 only, never bold. */
function brass(pics) {
  const st = document.createElement('style');
  st.className = 'mockPiece';
  st.textContent = `
  #stand .stTop { background: linear-gradient(110deg, #111b18f5, #303029fa 50%, #111b18f5), url(ui/page.png); border-bottom: 3px double #b99b61; box-shadow: 0 4px 18px #0008, inset 0 -4px 8px #0006; padding-bottom: 10px; }
  #stand .stTop::after { content: ''; position: absolute; left: calc(50% - 72px); bottom: -30px; width: 144px; height: 48px; background: url(ui/battle-crest.png) center / contain no-repeat; filter: drop-shadow(0 2px 3px #000b); pointer-events: none; }
  #stand .stTop button, #stand .stCentre { border: 1px solid #a58b56; border-radius: 3px; background: linear-gradient(#414435, #1b2720); box-shadow: inset 0 0 0 2px #121c15, 0 2px 5px #0008; color: #f2d69d; }
  #stand .stCentre { top: calc(env(safe-area-inset-top) + 92px); border: 2px solid #c9a75e; box-shadow: 0 0 10px #e8c26a55, inset 0 0 0 2px #121c15; }
  #stand .stWave span, #stand .stGold span { color: #f4db9f; }
  #stand .stKing i { border: 1px solid #9b986d; background: #0a1420; box-shadow: inset 0 2px 4px #000a; }
  #stand .stKing i span { background: linear-gradient(#b4e47d, #4d9b61); box-shadow: 0 0 6px #78c97a88; }
  #stand .stBottom { background: radial-gradient(ellipse at 50% 0, #66734533, transparent 65%), linear-gradient(100deg, #131e1af8, #2c3027fa 50%, #131e1af8), url(ui/page.png); border-top: 3px double #c0a268; box-shadow: 0 -6px 25px #0008, inset 0 4px 0 #111b15; }
  #stand .stBottom::before { content: ''; position: absolute; top: -12px; left: calc(50% - 30px); width: 60px; height: 20px; background: url(ui/ribbon.png) center / 100% 100% no-repeat; }
  #stand .stHeroes .hb, #stand .stHeroes .hbAuto { border: 1px solid #a28a58; border-radius: 4px; background: radial-gradient(ellipse at top, #83945b33, transparent 75%), linear-gradient(#2b372a, #111d17); box-shadow: inset 0 0 0 2px #0c1712, 0 2px 5px #0007; }
  #stand .stHeroes .hb.ready { border-color: #f6db91; box-shadow: inset 0 0 0 1px #dbc17b, 0 0 12px #edc56c66; }
  #stand .stSpell { border: 1px solid #b69a64; border-radius: 5px; background: radial-gradient(ellipse at 50% 10%, #e9b85c3a, transparent 75%), linear-gradient(#263229, #101a17); box-shadow: inset 0 0 0 2px #101813, 0 2px 6px #0008; color: #f5e6be; }
  #stand .stBuy, #stand .stRelic { border: 1px solid #a58b56; border-radius: 4px; background: linear-gradient(#2d3a2c, #141e18); box-shadow: inset 0 0 0 2px #0f1813, 0 2px 5px #0007; color: #f1e3bf; }
  #stand .stRelic span { color: #f4db9f; }
  #stand .stBuy.level { border: 3px double #d5bb7c; background: linear-gradient(#4a6b48, #1e402b); }
  .mkBanner { position: fixed; left: 0; right: 0; top: 372px; z-index: 30; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
  .mkBanner .crest { width: 220px; height: 74px; background: url(ui/battle-crest.png) center / contain no-repeat; filter: drop-shadow(0 0 12px #f2c96a99) drop-shadow(0 3px 2px #000c); }
  .mkBanner .plate { margin-top: -10px; padding: 6px 40px 8px; background: linear-gradient(90deg, transparent, #1b2420f2 18%, #2e3a2cf2 50%, #1b2420f2 82%, transparent); border-top: 2px solid #c9a75e; border-bottom: 2px solid #c9a75e; text-align: center; }
  .mkBanner small { display: block; font: 400 12px/1.2 var(--body); color: #e8d9b0; letter-spacing: .3em; }
  .mkBanner b { display: block; font: 400 24px/1.2 var(--display); color: #f4db9f; letter-spacing: .12em; text-shadow: 0 0 10px #f2c96a, 0 2px 0 #000; font-weight: 400; }
  .mkBanner.boss .crest { filter: drop-shadow(0 0 16px #ff4a3acc) drop-shadow(0 3px 2px #000c) hue-rotate(-20deg); }
  .mkBanner.boss .plate { border-color: #e0503a; background: linear-gradient(90deg, transparent, #2a0d0cf2 18%, #4a1410f2 50%, #2a0d0cf2 82%, transparent); }
  .mkBanner.boss b { color: #ffd2b8; text-shadow: 0 0 12px #ff4a3a, 0 2px 0 #000; }
  .mkVignette { position: fixed; inset: 0; z-index: 4; pointer-events: none; box-shadow: inset 0 0 120px 30px #c0201899; }
  .mkTray { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; padding: 18px 8px 34px; display: flex; flex-direction: column; gap: 8px; font: 400 12px/1.25 var(--body); color: #efe3c4;
    background: radial-gradient(ellipse at 50% 0, #66734533, transparent 65%), linear-gradient(100deg, #131e1af8, #2c3027fa 50%, #131e1af8), url(ui/page.png); border-top: 3px double #c0a268; box-shadow: 0 -6px 25px #0009; }
  .mkTray::before { content: ''; position: absolute; top: -14px; left: calc(50% - 40px); width: 80px; height: 24px; background: url(ui/ribbon.png) center / 100% 100% no-repeat; }
  .mkTray h3 { margin: 0; text-align: center; font: 400 24px/1.1 var(--display); color: #f4db9f; text-shadow: 0 2px 0 #000; font-weight: 400; }
  .mkTip { text-align: center; color: #d6c9a4; }
  .mkRoster { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 4px; }
  .mkHero { position: relative; aspect-ratio: 2 / 3; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding: 0 0 6px; background: #18251a url(ui/hero-brass-frame.png) center / 100% 100% no-repeat; box-shadow: 0 2px 5px #0007; }
  .mkHero img { position: absolute; top: 14%; left: 14%; width: 72%; image-rendering: pixelated; }
  .mkHero span { position: relative; max-width: 92%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 400 12px/1 var(--body); color: #f1e3bf; text-shadow: 0 1px 0 #000; }
  .mkHero i { position: absolute; left: 12%; right: 12%; bottom: 3px; height: 3px; background: linear-gradient(#b4e47d, #4d9b61); }
  .mkHero.swap { box-shadow: 0 0 0 2px #ffe499, 0 0 14px #f2c96a; }
  .mkHero.swap::after { content: '⇄'; position: absolute; top: -10px; right: -4px; width: 20px; height: 20px; font: 400 12px/20px var(--body); text-align: center; color: #1c1408; background: #f2cf6a; border-radius: 50%; }
  .mkRow { display: grid; grid-template-columns: 1fr 1fr 1.6fr; gap: 6px; }
  .mkRow button { min-height: 48px; font: 400 12px/1.2 var(--body); color: #f2d69d; border: 1px solid #a58b56; border-radius: 3px; background: linear-gradient(#414435, #1b2720); box-shadow: inset 0 0 0 2px #121c15, 0 2px 5px #0008; }
  .mkRow button.go { font: 400 24px/1.1 var(--display); color: #fff3d0; border: 3px double #d5bb7c; background: linear-gradient(#4a6b48, #1e402b); box-shadow: inset 0 0 14px #b5cf7933, 0 0 14px #e8c26a55; }
  .mkCall { position: fixed; z-index: 25; padding: 4px 8px; font: 400 12px/1.2 var(--body); color: #1c1408; background: linear-gradient(#f2cf6a, #c9952e); border: 1px solid #7a5a18; box-shadow: 0 2px 6px #000a; white-space: nowrap; }
  .mkSheet { position: fixed; inset: 0; z-index: 40; display: flex; align-items: flex-start; justify-content: center; padding: 40px 8px 30px; background: radial-gradient(ellipse at 50% 30%, #00000088, #000000dd); }
  .mkCard { position: relative; width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 6px; padding: 30px 10px 10px; font: 400 12px/1.25 var(--body); color: #efe3c4;
    background: radial-gradient(ellipse at 50% 0, #66734540, transparent 60%), linear-gradient(100deg, #131e1afa, #2c3027fc 50%, #131e1afa), url(ui/page.png); border: 3px double #c9a75e; box-shadow: 0 0 0 2px #0c0a08, 0 10px 30px #000c, inset 0 0 30px #0009; }
  .mkCard .crest { position: absolute; left: calc(50% - 80px); top: -28px; width: 160px; height: 54px; background: url(ui/battle-crest.png) center / contain no-repeat; filter: drop-shadow(0 2px 3px #000b); }
  .mkCard h2 { margin: 0; text-align: center; font: 400 24px/1.2 var(--display); color: #f4db9f; text-shadow: 0 0 10px #f2c96a88, 0 2px 0 #000; font-weight: 400; }
  .mkKing { display: grid; grid-template-columns: 48px 1fr; gap: 8px; align-items: center; padding: 4px 8px; border: 1px solid #a58b56; border-radius: 4px; background: linear-gradient(#3a2a1c, #1a120c); box-shadow: inset 0 0 0 2px #0f0a06; }
  .mkKing img { width: 48px; height: 48px; object-fit: cover; object-position: 50% 15%; image-rendering: pixelated; border: 1px solid #c9a75e; }
  .mkBar { height: 6px; margin-top: 2px; background: #060f0b; border: 1px solid #4c4430; }
  .mkBar span { display: block; height: 100%; }
  .mkGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .mkU { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border: 1px solid #a28a58; border-radius: 4px; background: radial-gradient(ellipse at top, #83945b33, transparent 75%), linear-gradient(#2b372a, #111d17); box-shadow: inset 0 0 0 2px #0c1712, 0 2px 5px #0007; }
  .mkU.fallen { filter: grayscale(1) brightness(0.6); border-color: #5a5040; }
  .mkU.fallen header em { color: #e07060; }
  .mkU header { display: flex; align-items: center; gap: 6px; }
  .mkU header img { width: 32px; height: 32px; image-rendering: pixelated; background: #0a140f; border: 1px solid #a58b56; border-radius: 50%; }
  .mkU header span { color: #f4db9f; }
  .mkU header em { margin-left: auto; font-style: normal; color: #c8bb94; }
  .mkStats { display: grid; grid-template-columns: repeat(3, 1fr); color: #d6c9a4; }
  .mkSk { display: flex; justify-content: space-between; color: #b9ad8c; }
  .mkSk.ready { color: #a8e2ff; text-shadow: 0 0 6px #48b6e7; }
  .mkSk.shut { color: #6e6658; }
  .mkSk.ult { color: #f4db9f; }
  .mkSk.ult.full { color: #fff3c0; text-shadow: 0 0 8px #f2c96a; }
  .mkResume { min-height: 48px; font: 400 24px/1.1 var(--display); color: #fff3d0; border: 3px double #d5bb7c; border-radius: 3px; background: linear-gradient(#4a6b48, #1e402b); box-shadow: inset 0 0 14px #b5cf7933, 0 0 14px #e8c26a55; }
  #quip { display: none !important; }
  .mkTag { position: fixed; left: 0; right: 0; bottom: 0; padding: 4px 8px; font: 400 12px/1.3 sans-serif; color: #fff; background: rgba(160,20,20,0.9); z-index: 60; text-align: center; pointer-events: none; }
  `;
  document.head.append(st);
}

/** In the page: the dark castle backdrop (the throne room's back wall, dimmed, over deep stone), after the field is laid. */
function backdrop(pics) {
  const sky = document.getElementById('sky');
  if (sky) {
    sky.replaceChildren();
    const d = document.createElement('div');
    Object.assign(d.style, { position: 'absolute', inset: '0', background: `linear-gradient(#000a, #0008 40%, #050409 75%), url(${pics.backwall}) center 18% / auto 46% repeat-x, #0b0910` });
    sky.append(d);
  }
}

function tag(text) {
  const t = document.createElement('div');
  t.className = 'mockPiece mkTag';
  t.innerHTML = `<b>MOCK-UP</b> ${text}`;
  document.body.append(t);
}

async function open(browser, build = 'hall') {
  const server = serve(`out/stand-mock/web-${build}`, 8142);
  const { page, ctx } = await boot(browser, W, H, 30, 8142);
  await page.evaluate(() => localStorage.setItem('lotf-tips-off', '1'));
  await page.waitForSelector('#hmTower', { state: 'attached', timeout: 15000 });
  await enter(page);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { page, close: async () => (await ctx.close(), server.close()) };
}

/** A hall mid-wave: the foes pouring in at the breaches, the wave's banner (a boss's flourish in the chapel). */
async function hallShot(browser, name) {
  const hall = HALLS[name];
  const { page, close } = await open(browser, name === 'library' ? 'library' : 'hall');
  await page.evaluate(brass, PICS);
  await page.evaluate(() => document.querySelector('.stStart').click());
  await page.evaluate(() => window.__game.stand.debugRun(2600));
  const gaps = await page.evaluate(dress, [hall, PICS]);
  await page.evaluate(backdrop, PICS);
  await page.evaluate(([gaps]) => {
    const v = window.__game.stand;
    const s = v.state;
    // (the foes at the breaches they would come in by, a step or two inside)
    let g = 0;
    for (const f of s.b.units.filter((x) => x.alive && x.side === 'foe')) {
      const [u, w, side] = gaps[g++ % gaps.length];
      const d = 1 + (g % 3);
      f.u = side === 'west' ? u + d : side === 'east' ? u - d : u;
      f.v = side === 'north' ? w + d : side === 'south' ? w - d : w;
      f.step = undefined;
    }
    v.paused = false;
  }, [gaps]);
  await page.waitForTimeout(900);
  await page.evaluate(([boss]) => {
    const v = window.__game.stand;
    v.paused = true;
    v.scale = v.tscale = 0.66;
    v.cx = v.tx = 20;
    v.cy = v.ty = 270;
    v.place();
    for (const el of document.querySelectorAll('.stBanner, .stCount')) el.style.display = 'none';
    const b = document.createElement('div');
    b.className = `mockPiece mkBanner${boss ? ' boss' : ''}`;
    b.innerHTML = `<div class="crest"></div><div class="plate"><small>${boss ? 'A BOSS COMES' : 'THEY BREAK THROUGH'}</small><b>WAVE ${boss ? 10 : 7}</b></div>`;
    document.body.append(b);
    if (boss) {
      const vg = document.createElement('div');
      vg.className = 'mockPiece mkVignette';
      document.body.append(vg);
    }
  }, [!!hall.boss]);
  await page.waitForTimeout(300);
  await page.evaluate(tag, `${hall.title}: breaches, smoke and dust, braziers, the king enthroned${hall.boss ? '; a boss wave arrives' : ''}`);
  await page.screenshot({ path: `docs/samples/stand-overhaul-mock2-${name}.png` });
  await close();
}

const SCENES = {
  hall: (b) => hallShot(b, 'hall'),
  chapel: (b) => hallShot(b, 'chapel'),
  library: (b) => hallShot(b, 'library'),
  courtyard: (b) => hallShot(b, 'courtyard'),

  /** Deploy: the eight already at their ring-plan posts, glowing; the brass tray to swap them. */
  async deploy(browser) {
    const { page, close } = await open(browser, 'hall');
    await page.evaluate(brass, PICS);
    await page.evaluate(dress, [HALLS.hall, PICS]);
    await page.evaluate(backdrop, PICS);
    await page.evaluate(() => {
      const v = window.__game.stand;
      v.heroBar.build(v.state.b);
      v.scale = v.tscale = 1;
      v.cx = v.tx = 0;
      v.cy = v.ty = 330;
      v.place();
    });
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const v = window.__game.stand;
      const s = v.state;
      const { layer, Graphics, glowGold, Sprite } = window.__mock;
      const heroes = s.b.units.filter((u) => u.side === 'hero' && u.tag !== undefined);
      const T = (u, w) => s.b.board.tiles[w * 24 + u];
      const top = (u, w) => [(u - w) * 32, (u + w) * 16 - T(u, w).h * 12];
      document.querySelector('.stBottom').style.visibility = 'hidden';
      document.querySelector('.stCount').style.display = 'none';
      v.marks.clear();
      const g = new Graphics();
      g.zIndex = -2e5;
      layer.addChild(g);
      const dia = (u, w, colour, a, line, grow = 0) => {
        const [x, y] = top(u, w);
        g.poly([x, y - 14 - grow, x + 29 + grow * 2, y, x, y + 14 + grow, x - 29 - grow * 2, y]);
        if (line) g.stroke({ color: colour, alpha: a, width: line });
        else g.fill({ color: colour, alpha: a });
      };
      // every post a hero may take, faintly; the ring plan's posts glowing gold, each with a soft pillar of light
      for (let w = 6; w <= 18; w++)
        for (let u = 6; u <= 18; u++) {
          const t = T(u, w);
          if (t.ground === 'ice' || t.rock || (u === 12 && w === 12)) continue;
          dia(u, w, 0x7fc7ff, 0.08);
        }
      heroes.forEach((u, i) => {
        const swap = i === 3 || i === 6;
        dia(u.u, u.v, swap ? 0xffe499 : 0xffc84a, 0.32);
        dia(u.u, u.v, 0xfff2b0, 0.95, 2);
        dia(u.u, u.v, 0xffd76a, 0.35, 2, 4);
        const [x, y] = top(u.u, u.v);
        const pool = new Sprite(glowGold);
        pool.anchor.set(0.5);
        pool.position.set(x, y);
        pool.scale.set(0.7, 0.36);
        pool.blendMode = 'add';
        pool.alpha = 0.6;
        pool.zIndex = -1.5e5;
        layer.addChild(pool);
      });
      // the swap: a golden arc between the two heroes being traded
      const a = heroes[3];
      const b2 = heroes[6];
      const [ax, ay] = top(a.u, a.v);
      const [bx, by] = top(b2.u, b2.v);
      const arc = new Graphics();
      arc.zIndex = 1e6;
      arc.moveTo(ax, ay - 30).quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - 80, bx, by - 30).stroke({ color: 0xffe499, width: 3, alpha: 0.95 });
      arc.circle(bx, by - 30, 4).fill({ color: 0xffe499 });
      arc.circle(ax, ay - 30, 4).fill({ color: 0xffe499 });
      layer.addChild(arc);
      // the tray
      const tray = document.createElement('div');
      tray.className = 'mockPiece mkTray';
      const pic = (id) => {
        const c = document.querySelector(`.hb[data-unit="${id}"] .hbPic`);
        return c ? (c.toDataURL ? c.toDataURL() : c.src) : '';
      };
      tray.innerHTML = `<h3>Hold the throne</h3><div class="mkTip">Your eight stand at their posts. Tap two to swap them, or drag one onto a glowing tile.</div>`;
      const roster = document.createElement('div');
      roster.className = 'mkRoster';
      heroes.forEach((u, i) => {
        const el = document.createElement('div');
        el.className = `mkHero${i === 3 || i === 6 ? ' swap' : ''}`;
        el.innerHTML = `<img src="${pic(u.id)}"><span>${u.def[0].toUpperCase() + u.def.slice(1)}</span><i></i>`;
        roster.append(el);
      });
      const row = document.createElement('div');
      row.className = 'mkRow';
      row.innerHTML = '<button>Auto-place</button><button>Reset</button><button class="go">Begin</button>';
      tray.append(roster, row);
      document.body.append(tray);
      const v2 = v.world;
      const call = document.createElement('div');
      call.className = 'mockPiece mkCall';
      const nm = (u) => u.def[0].toUpperCase() + u.def.slice(1);
      call.textContent = `Swap: the ${nm(a)} and the ${nm(b2)}`;
      Object.assign(call.style, { left: `${Math.max(8, Math.min(innerWidth - 220, v2.x + ((ax + bx) / 2) * v2.scale.x - 100))}px`, top: `${v2.y + (Math.min(ay, by) - 120) * v2.scale.y}px` });
      document.body.append(call);
    });
    await page.evaluate(tag, 'Deploy: posts glow at the ring plan, the brass tray swaps heroes, Auto-place, Begin');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'docs/samples/stand-overhaul-mock2-deploy.png' });
    await close();
  },

  /** The pause sheet in brass: the king, then each hero's card, and Resume. */
  async pause(browser) {
    const { page, close } = await open(browser, 'hall');
    await page.evaluate(brass, PICS);
    await page.evaluate(() => document.querySelector('.stStart').click());
    await page.evaluate(() => {
      const v = window.__game.stand;
      v.debugRun(14000);
      const u = v.state.b.units.find((x) => x.def === 'kunoichi');
      if (u) (u.alive = false), (u.hp = 0);
      const w = v.state.b.units.find((x) => x.def === 'samurai');
      if (w) w.charge2 = 999;
      v.debugRun(200);
    });
    await page.evaluate(dress, [HALLS.hall, PICS]);
    await page.evaluate(backdrop, PICS);
    await page.waitForTimeout(1200);
    await page.evaluate((pics) => {
      const v = window.__game.stand;
      v.paused = true;
      v.scale = v.tscale = 0.56;
      v.cx = v.tx = 0;
      v.cy = v.ty = 300;
      v.place();
      const sh = v.sheet;
      const units = v.state.b.units;
      const pic = (id) => {
        const u = units.find((x) => x.tag === id);
        const c = u && document.querySelector(`.hb[data-unit="${u.id}"] .hbPic`);
        return c ? (c.toDataURL ? c.toDataURL() : c.src) : '';
      };
      const bar = (share, bg) => `<div class="mkBar"><span style="width:${Math.round(share * 100)}%;background:${bg}"></span></div>`;
      const box = document.createElement('div');
      box.className = 'mockPiece mkSheet';
      const card = document.createElement('div');
      card.className = 'mkCard';
      card.innerHTML = `<div class="crest"></div><h2>Paused</h2>
        <div class="mkKing"><img src="${pics.king_throne}"><div><span style="color:#f4db9f">The King</span> · wave ${sh.wave} · ${sh.gold} gold<span style="float:right">${sh.king.hp} / ${sh.king.maxHp}</span>${bar(sh.king.hp / sh.king.maxHp, 'linear-gradient(#b4e47d,#4d9b61)')}</div></div>`;
      const grid = document.createElement('div');
      grid.className = 'mkGrid';
      for (const h of sh.heroes) {
        const el = document.createElement('div');
        el.className = `mkU${h.fallen ? ' fallen' : ''}`;
        const sk = h.skills.map((k) => `<div class="mkSk ${!k.open ? 'shut' : k.paid ? 'ready' : ''}"><span>${k.name}</span><span>${k.open ? k.cost : `Lv ${k.opens}`}</span></div>`).join('');
        const ult = h.ult ? `<div class="mkSk ult${h.ult.ready ? ' full' : ''}"><span>★ ${h.ult.name}</span><span>${!h.ult.open ? `Lv ${h.ult.opens}` : h.ult.ready ? 'Ready' : `${Math.round(h.ult.meter * 100)}%`}</span></div>` : '';
        el.innerHTML = `<header><img src="${pic(h.id)}"><span>${h.name}</span><em>${h.fallen ? 'Fallen' : `Lv ${h.level}${h.runLv ? ` +${h.runLv}` : ''}`}</em></header>
          ${bar(h.maxHp ? h.hp / h.maxHp : 0, 'linear-gradient(#b4e47d,#4d9b61)')}${h.pool ? bar(h.pool.now / h.pool.max, h.pool.kind === 'mana' ? 'linear-gradient(#c2f5ff,#48b6e7 45%,#2b6098)' : 'linear-gradient(#ffe8a0,#e0b030)') : ''}
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
    await page.evaluate(tag, 'The pause sheet: the king, each hero\'s stats, skills and ultimate, Resume');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'docs/samples/stand-overhaul-mock2-pause.png' });
    await close();
  },
};

const browser = await launch();
for (const [name, run] of Object.entries(SCENES)) if (!only.length || only.includes(name)) await run(browser);
await browser.close();
