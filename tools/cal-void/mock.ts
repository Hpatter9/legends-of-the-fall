// MOCK-UP only (CAL-VOID phase A): three layouts for a small void map with branching paths, drawn over the real Calamity screen so the
// owner can pick one. Bundled by tools/cal-void/shots.mjs into the page; nothing here is part of the game. It reuses the map's own pack art
// (the atlas of landmarks and ground, the Undead Tileset rock, the stars, nebulae, moons and the PVFX rift) and its island and stone drawing.
import { drawIsland, drawStone, REALMS } from '../../src/render/calRealm';
import { LAND_ART, RECTS } from '../../src/render/calArt';
import atlasUrl from '../../src/art/calmap/atlas.png';
import rockUrl from '../../src/art/ground/rock.png';
import starsUrl from '../../src/art/calmap/stars.png';
import portalUrl from '../../src/art/calmap/portal.png';
import samuraiUrl from '../../src/art/units/samurai.png';
import neb0 from '../../src/art/calmap/nebula_0.png';
import neb1 from '../../src/art/calmap/nebula_1.png';
import neb4 from '../../src/art/calmap/nebula_4.png';
import pTan from '../../src/art/calmap/planet_tan.png';
import pWhite from '../../src/art/calmap/planet_white.png';
import pRed from '../../src/art/calmap/planet_red.png';

type Kind = 'start' | 'fight' | 'elite' | 'shop' | 'recruit' | 'treasure' | 'campfire' | 'mystery' | 'boss';
type State = 'done' | 'here' | 'open' | 'far' | 'sealed';
interface Spot { id: string; x: number; y: number; kind: Kind; pocket?: boolean }
interface Layout { title: string; realm: number; act: number; spots: Spot[]; links: [string, string][]; style: 'stones' | 'orbit' | 'threads' }
interface Scene { layout: Layout; states: Record<string, State>; say: string; tag: string }

const NAMES: Record<Kind, string> = { start: 'Portal', fight: 'Fight', elite: 'Mini-boss', shop: 'Shop', recruit: 'Recruit', treasure: 'Chest', campfire: 'Campfire', mystery: 'Mystery', boss: 'Boss' };

// ---- the three layouts (css pixels of the 393 x 606 map box) ----
const LADDER: Layout = {
  title: 'A · The rift ladder', realm: 0, act: 1, style: 'stones',
  spots: [
    { id: 'P', x: 196, y: 560, kind: 'start' },
    { id: 'a', x: 106, y: 466, kind: 'fight' }, { id: 'b', x: 290, y: 466, kind: 'fight' },
    { id: 'c', x: 66, y: 362, kind: 'mystery' }, { id: 'd', x: 196, y: 372, kind: 'recruit' }, { id: 'e', x: 326, y: 362, kind: 'shop' },
    { id: 'f', x: 116, y: 262, kind: 'elite' }, { id: 'g', x: 280, y: 262, kind: 'treasure' },
    { id: 'k', x: 196, y: 172, kind: 'campfire' },
    { id: 'B', x: 196, y: 74, kind: 'boss' },
  ],
  links: [['P', 'a'], ['P', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'd'], ['b', 'e'], ['c', 'f'], ['d', 'f'], ['d', 'g'], ['e', 'g'], ['f', 'k'], ['g', 'k'], ['k', 'B']],
};
const ORBIT: Layout = {
  title: 'B · The orbit', realm: 1, act: 2, style: 'orbit',
  spots: [
    { id: 'P', x: 196, y: 562, kind: 'start' },
    { id: 'l1', x: 82, y: 468, kind: 'fight' }, { id: 'r1', x: 310, y: 468, kind: 'fight' },
    { id: 'l2', x: 52, y: 340, kind: 'shop' }, { id: 'X', x: 196, y: 352, kind: 'recruit' }, { id: 'r2', x: 340, y: 340, kind: 'elite' },
    { id: 'l3', x: 86, y: 220, kind: 'mystery' }, { id: 'r3', x: 306, y: 220, kind: 'treasure' },
    { id: 'k', x: 196, y: 150, kind: 'campfire' },
    { id: 'B', x: 196, y: 60, kind: 'boss' },
  ],
  links: [['P', 'l1'], ['P', 'r1'], ['l1', 'l2'], ['r1', 'r2'], ['l2', 'X'], ['r2', 'X'], ['l2', 'l3'], ['r2', 'r3'], ['l3', 'k'], ['r3', 'k'], ['k', 'B']],
};
const SPINE: Layout = {
  title: 'C · The spine and its pockets', realm: 5, act: 6, style: 'threads',
  spots: [
    { id: 'P', x: 292, y: 562, kind: 'start' },
    { id: 't1', x: 170, y: 486, kind: 'fight' }, { id: 'p1', x: 330, y: 430, kind: 'treasure', pocket: true },
    { id: 't2', x: 86, y: 392, kind: 'recruit' },
    { id: 't3a', x: 64, y: 262, kind: 'elite' }, { id: 't3b', x: 214, y: 300, kind: 'fight' }, { id: 'p2', x: 336, y: 250, kind: 'shop', pocket: true },
    { id: 't4', x: 136, y: 168, kind: 'campfire' }, { id: 'p3', x: 300, y: 150, kind: 'mystery', pocket: true },
    { id: 'B', x: 236, y: 66, kind: 'boss' },
  ],
  links: [['P', 't1'], ['t1', 'p1'], ['t1', 't2'], ['t2', 't3a'], ['t2', 't3b'], ['t3b', 'p2'], ['t3a', 't4'], ['t3b', 't4'], ['t4', 'p3'], ['t4', 'B']],
};

const all = (l: Layout, s: State) => Object.fromEntries(l.spots.map((p) => [p.id, s]));
export const SCENES: Record<string, Scene> = {
  'a-fresh': { layout: LADDER, tag: 'fresh map', states: { ...all(LADDER, 'far'), P: 'here', a: 'open', b: 'open' }, say: 'A small map, all on one screen. Pick a road: each fork closes the way you did not take. Walk back along your own road at any time.' },
  'a-mid': { layout: LADDER, tag: 'two spots in', states: { ...all(LADDER, 'far'), P: 'done', a: 'done', d: 'here', b: 'sealed', c: 'sealed', e: 'sealed', f: 'open', g: 'open' }, say: 'Took the left road, then the recruit: the fight, the mystery and the shop on the other roads have drifted away.' },
  'b-fresh': { layout: ORBIT, tag: 'fresh map', states: { ...all(ORBIT, 'far'), P: 'here', l1: 'open', r1: 'open' }, say: 'Two arcs round the rift: the left, the shop side; the right, the mini-boss side. The recruit in the rift joins them.' },
  'b-mid': { layout: ORBIT, tag: 'crossing over', states: { ...all(ORBIT, 'far'), P: 'done', l1: 'done', l2: 'here', r1: 'sealed', X: 'open', l3: 'open' }, say: 'Went left. Cross the rift by the recruit to reach the right arc, or carry on up the left.' },
  'c-fresh': { layout: SPINE, tag: 'fresh map', states: { ...all(SPINE, 'far'), P: 'here', t1: 'open' }, say: 'One road up the rift, with pockets off it: a chest, a shop, a mystery. Take a pocket before you move on, or leave it.' },
  'c-mid': { layout: SPINE, tag: 'pocket passed', states: { ...all(SPINE, 'far'), P: 'done', t1: 'done', p1: 'sealed', t2: 'here', t3a: 'open', t3b: 'open' }, say: 'Passed the chest pocket by: it has drifted off. Now the road forks: the mini-boss, or the fight with the shop beside it.' },
};

const load = (src: string): Promise<HTMLImageElement> => new Promise((ok, no) => {
  const im = new Image();
  im.onload = () => ok(im);
  im.onerror = no;
  im.src = src;
});

const K = 2;

export async function mock(name: string): Promise<void> {
  const sc = SCENES[name];
  const scroll = document.querySelector('.cmScroll') as HTMLElement;
  // (the layouts are drawn for a 393 x 606 box; on another phone the spots spread to fit its box, the art keeps its size)
  const W = Math.round(scroll.clientWidth);
  const H = Math.round(scroll.clientHeight);
  const fx = W / 393;
  const fy = H / 606;
  const L0 = sc.layout;
  const L: Layout = { ...L0, spots: L0.spots.map((p) => ({ ...p, x: Math.round(p.x * fx), y: Math.round(p.y * fy) })) };
  const realm = REALMS[L.realm];
  const art = LAND_ART[L.realm];
  const [atlas, rockIm, stars, portal, samurai, nebula, planet] = await Promise.all([atlasUrl, rockUrl, starsUrl, portalUrl, samuraiUrl, [neb0, neb4, neb0, neb0, neb0, neb1][L.realm], [pTan, pWhite, pTan, pTan, pTan, pRed][L.realm]].map(load));
  const rc = document.createElement('canvas');
  rc.width = rockIm.width;
  rc.height = rockIm.height;
  const rg = rc.getContext('2d')!;
  rg.drawImage(rockIm, 0, 0);
  const rock = rg.getImageData(0, 0, rc.width, rc.height);

  const cv = document.createElement('canvas');
  cv.width = W * K;
  cv.height = H * K;
  cv.style.cssText = `width:${W}px;height:${H}px;display:block;image-rendering:pixelated`;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  // ---- the void: sky, stars, nebula, moon ----
  const sky = c.createLinearGradient(0, 0, 0, cv.height);
  sky.addColorStop(0, realm.sky[0]);
  sky.addColorStop(1, realm.sky[1]);
  c.fillStyle = sky;
  c.fillRect(0, 0, cv.width, cv.height);
  c.globalAlpha = 0.55;
  c.globalCompositeOperation = 'screen';
  c.imageSmoothingEnabled = true;
  c.drawImage(nebula, -80, -40, cv.width + 160, cv.height + 80);
  c.imageSmoothingEnabled = false;
  c.globalAlpha = 1;
  for (let y = 0; y < cv.height; y += stars.height) for (let x = 0; x < cv.width; x += stars.width) c.drawImage(stars, x, y);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 0.9;
  if (L.style !== 'orbit') c.drawImage(planet, cv.width - 170, 150, 130, 130);
  c.globalAlpha = 1;
  const at = (id: string) => L.spots.find((s) => s.id === id)!;
  const st = (id: string) => sc.states[id];
  const dim = (s: State) => s === 'sealed';
  // ---- the rift in the middle (the orbit) or behind the lair ----
  if (L.style === 'orbit' || L.realm === 5) {
    const X = L.style === 'orbit' ? at('X') : at('B');
    const size = L.style === 'orbit' ? 320 : 256;
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = 0.7;
    // (the rift is drawn several times its size: smoothed, so it reads as a glow rather than big blocks)
    c.imageSmoothingEnabled = true;
    c.drawImage(portal, 3 * 64, 0, 64, 64, X.x * K - size / 2, X.y * K - size / 2 - 30, size, size);
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
  if (L.style === 'orbit') {
    // (the orbit's path: a faint ellipse of light through both arcs)
    c.save();
    c.strokeStyle = `rgba(${realm.bridge.glow}, 0.16)`;
    c.lineWidth = 2;
    c.setLineDash([2, 10]);
    c.beginPath();
    c.ellipse(196 * fx * K, 330 * fy * K, 150 * fx * K, 210 * fy * K, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
  // ---- the links: stones (ladder, orbit) or threads of starlight (spine) ----
  const glowAt = (x: number, y: number, r: number, a: number) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${realm.bridge.glow}, ${a})`);
    g.addColorStop(1, `rgba(${realm.bridge.glow}, 0)`);
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.globalCompositeOperation = 'source-over';
  };
  for (const [p, q] of L.links) {
    const A = at(p);
    const B = at(q);
    const [sa, sb] = [st(p), st(q)];
    const lost = dim(sa) || dim(sb);
    const walked = (sa === 'done' || sa === 'here') && (sb === 'done' || sb === 'here');
    const lit = !lost && (walked || ((sa === 'done' || sa === 'here') && sb === 'open') || ((sb === 'done' || sb === 'here') && sa === 'open'));
    const ax = A.x * K, ay = A.y * K, bx = B.x * K, by = B.y * K;
    const len = Math.hypot(bx - ax, by - ay);
    const clear = 66;
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    c.globalAlpha = lost ? 0.18 : lit ? 1 : 0.5;
    if (L.style === 'threads') {
      // (a thread of light with small stars along it)
      c.strokeStyle = lit ? realm.bridge.mid : realm.bridge.under;
      c.lineWidth = lit ? 3 : 2;
      c.beginPath();
      c.moveTo(ax + ux * clear, ay + uy * clear);
      c.lineTo(bx - ux * clear, by - uy * clear);
      c.stroke();
      for (let d = clear; d <= len - clear; d += 34) {
        const x = ax + ux * d, y = ay + uy * d;
        c.fillStyle = lit ? realm.bridge.top : realm.bridge.mid;
        c.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
        if (lit) glowAt(x, y, 14, 0.35);
      }
    } else {
      const n = Math.max(1, Math.floor((len - clear * 2) / 30));
      for (let i = 0; i <= n; i++) {
        const d = clear + ((len - clear * 2) * i) / n;
        const x = ax + ux * d, y = ay + uy * d;
        if (lit) glowAt(x, y + 2, 22, 0.28);
        drawStone(c, x, y, realm.bridge, (i * 37) % 10 / 10);
      }
    }
    c.globalAlpha = 1;
  }
  // ---- the islands and their landmarks, back to front ----
  const order = [...L.spots].sort((a, b) => a.y - b.y);
  const blit = (g: CanvasRenderingContext2D, name: string, x: number, y: number, scale = 1) => {
    const [sx, sy, w, h] = RECTS[name];
    g.drawImage(atlas, sx, sy, w, h, Math.round(x - (w * scale) / 2), Math.round(y - h * scale), Math.round(w * scale), Math.round(h * scale));
  };
  const labels: { x: number; y: number; text: string; cls: string }[] = [];
  for (const s of order) {
    const state = st(s.id);
    const big = s.kind === 'boss' || s.kind === 'start';
    const rx = s.kind === 'boss' ? 84 : s.kind === 'start' ? 70 : s.pocket ? 48 : 58;
    const off = document.createElement('canvas');
    off.width = cv.width;
    off.height = cv.height;
    const g = off.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const cx = s.x * K, cy = s.y * K;
    const seed = s.id.charCodeAt(0) * 31 + (s.id.charCodeAt(1) || 7) * 7;
    drawIsland(g, rock, { cx, cy, rx, ry: rx * 0.56, depth: big ? 60 : s.pocket ? 34 : 46, seed, realm: L.realm }, (tg, ox, oy) => {
      const [sx, sy, w, h] = RECTS[art.ground[0]];
      for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) {
        if ((a + b) & 1) continue;
        tg.drawImage(atlas, sx, sy, w, h, Math.round(ox + (b * art.tw) / 2 - (w + 4) / 2), Math.round(oy + (a * art.th) / 2 - art.th / 2 - 1), w + 4, h + 3);
      }
    });
    // (the landmark: its spent picture once cleared)
    const spent = state === 'done' && RECTS[`${s.kind}_spent`];
    const name = s.kind === 'boss' ? art.lair : s.kind === 'start' ? 'start' : s.pocket && s.kind === 'treasure' ? 'side_treasure' : spent ? `${s.kind}_spent` : s.kind;
    blit(g, name, cx, cy + (s.kind === 'boss' ? 28 : 18), s.kind === 'boss' ? 0.95 : s.pocket ? 0.8 : 0.9);
    if (s.kind === 'start') {
      g.globalCompositeOperation = 'screen';
      g.drawImage(portal, 7 * 64, 0, 64, 64, cx - 44, cy - 96, 88, 88);
      g.globalCompositeOperation = 'source-over';
    }
    // (state: sealed spots are drained and sink back into the void)
    if (state === 'sealed') {
      c.filter = 'grayscale(1) brightness(0.45)';
      c.globalAlpha = 0.6;
    } else if (state === 'far') c.filter = 'brightness(0.82)';
    // (the ring under an open or chosen spot)
    if (state === 'open' || state === 'here') {
      c.save();
      c.strokeStyle = state === 'here' ? '#7fe6ff' : s.pocket ? '#7fe6ff' : '#ffd76a';
      c.lineWidth = 3;
      c.globalAlpha = 0.85;
      c.beginPath();
      c.ellipse(cx, cy + 6, rx * 0.8, rx * 0.42, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    c.drawImage(off, 0, 0);
    c.filter = 'none';
    c.globalAlpha = 1;
    if (state === 'done' && s.kind !== 'start') {
      // (the green tick of a spent spot)
      const tx = cx + 34, ty = cy - 48;
      c.fillStyle = '#0d2a12';
      c.fillRect(tx - 1, ty - 1, 22, 22);
      c.fillStyle = '#2fbf4a';
      c.fillRect(tx, ty, 20, 20);
      c.fillStyle = '#fff';
      for (const [x, y] of [[4, 10], [5, 11], [6, 12], [7, 13], [8, 12], [9, 11], [10, 10], [11, 9], [12, 8], [13, 7], [14, 6], [15, 5]]) c.fillRect(tx + x, ty + y, 2, 2);
    }
    if (state === 'here') {
      // (the party's leader: the samurai's first idle frame, at the map's scale)
      c.drawImage(samurai, 0, 2 * 105, 192, 105, cx + 2 - 96 + 30, cy + 26 - 105, 192, 105);
    }
    if (state === 'open') labels.push({ x: s.x, y: s.y + rx / K * 0.58 + 6, text: NAMES[s.kind], cls: s.pocket ? 'pocket' : 'open' });
    else if (state === 'sealed' && s.id === (L.spots.find((p) => st(p.id) === 'sealed')?.id)) labels.push({ x: s.x, y: s.y + rx / K * 0.58 + 6, text: 'Drifted away', cls: 'sealed' });
    else if (s.kind === 'boss') labels.push({ x: s.x + 58, y: s.y - 6, text: 'Boss', cls: 'boss' });
  }
  // ---- the box: the canvas, the map's name, the labels, the MOCK-UP stamp ----
  const box = document.createElement('div');
  box.className = 'cvMock';
  box.style.cssText = `position:relative;width:${W}px;height:${H}px;overflow:hidden;margin:0 auto`;
  box.append(cv);
  const css = document.createElement('style');
  css.textContent = `.cvMock .lab{position:absolute;transform:translate(-50%,0);font-size:10px;line-height:1;padding:3px 5px 2px;border:1px solid;white-space:nowrap;background:rgba(10,8,20,0.82);letter-spacing:0.5px}
.cvMock .lab.open{color:#ffe7a0;border-color:#c99a3a}.cvMock .lab.pocket{color:#bff4ff;border-color:#4fb3cc}.cvMock .lab.sealed{color:#9a98a8;border-color:#55526a}.cvMock .lab.boss{color:#ffb0b0;border-color:#a04848}
.cvMock .stamp{position:absolute;right:6px;top:6px;padding:4px 6px 3px;font-size:10px;color:#fff;background:#b0262e;border:1px solid #ffb0b0;letter-spacing:1px}
.cvMock .opt{position:absolute;right:6px;top:28px;padding:3px 6px 2px;font-size:10px;color:#ffe7a0;background:rgba(10,8,20,0.82);border:1px solid #c99a3a}
.cvMock .nm{position:absolute;left:8px;top:8px;padding:4px 8px 3px;background:rgba(10,8,20,0.7);border-left:3px solid ${realm.bridge.mid};font-size:11px;line-height:1.5}
.cvMock .nm small{display:block;color:#ddd}.cvMock .nm b{color:${realm.bridge.mid};font-weight:normal}`;
  box.append(css);
  const nm = document.createElement('div');
  nm.className = 'nm';
  nm.innerHTML = `<small>Map ${L.act} of 6</small><b>${realm.name}</b>`;
  const stamp = document.createElement('div');
  stamp.className = 'stamp';
  stamp.textContent = 'MOCK-UP';
  const opt = document.createElement('div');
  opt.className = 'opt';
  opt.textContent = `${L.title} · ${sc.tag}`;
  box.append(nm, stamp, opt);
  for (const l of labels) {
    const d = document.createElement('div');
    d.className = `lab ${l.cls}`;
    d.style.left = `${l.x}px`;
    d.style.top = `${l.y}px`;
    d.textContent = l.text;
    box.append(d);
  }
  scroll.replaceChildren(box);
  scroll.style.overflow = 'hidden';
  const say = document.querySelector('.rtSay');
  if (say) say.textContent = sc.say;
  const go = document.querySelector('.rtGo') as HTMLButtonElement | null;
  if (go) go.disabled = true;
  const status = document.querySelector('.rtHead');
  if (status) {
    // (the header's count reads the small map's)
    const total = L.spots.filter((s) => s.kind !== 'start' && s.kind !== 'boss').length;
    const done = L.spots.filter((s) => s.kind !== 'start' && (st(s.id) === 'done' || (st(s.id) === 'here'))).length;
    for (const n of status.querySelectorAll('*')) if (n.childElementCount === 0 && /spots cleared/.test(n.textContent ?? '')) n.textContent = `${done} of ${total} spots cleared`;
    for (const n of status.querySelectorAll('*')) if (n.childElementCount === 0 && /^Map \d\/6$/.test((n.textContent ?? '').trim())) n.textContent = `Map ${L.act}/6`;
  }
}

(window as unknown as { __calVoidMock: typeof mock }).__calVoidMock = mock;
