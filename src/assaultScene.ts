// The Assault's battle on the page (phase 1, `docs/notes/assault-1.md`; the design's 2.4 and 8.3): the hold's field drawn in chunks at three
// levels of detail (`render/fieldView.ts`), with the command bar over it, upright at 393 x 852:
//
// - the top bar: the clock (from 3:00 left), the foes left of the 200, the three drums (struck through when silenced), Slow (the battle
//   slowed almost to a stop while orders are given: a tenth of its pace, not a pause, every order still tied to its tick), x1 / x2 and pause;
// - the minimap, top right: the hold from its zones, our platoons blue, the foes red; a tap moves the camera, a long press sends the chosen;
// - the order row, while a platoon is chosen: Hold, Charge (once), Flank (then a tap on a foe), Fall back, the formation chip (a tap cycles:
//   line, wedge, shield wall, loose) and Follow;
// - the platoon bar: five portraits (health, the platoon's count, the ultimate's ring) and All; the ultimate is the gem on the chosen
//   portrait's corner (a second tap on a chosen portrait with a full meter fires it too); a double tap flies the camera to the hero, a long
//   press opens its platoon card;
// - the king's spell row: the mana and the spells of the loadout (a tap readies one, a tap on the field casts it there).
//
// A tap on the field sends the chosen platoon: on a gate, a segment or a drum it is an Assault; on a foe a Focus; else a Move. The page drives
// the battle only through the sim's own calls (`orderPlatoon`, `setFormation`, `orderUltimate`, `castSpell`, `stepAssault`). It runs as its
// own layer over the game, with its own renderer, and gives the game back when the assault ends.

import { Application } from 'pixi.js';
import type { BattleEvent } from './sim/battle';
import { TICK_MS } from './sim/battle';
import type { Meta } from './sim/meta';
import { formOf, UNITS } from './sim/units';
import { heroName } from './sim/heroNames';
import { ultimateOf } from './sim/abilities';
import { orderUltimate } from './sim/orders';
import { castSpell, canAfford, SPELLS, MANA_MAX, type SpellId } from './sim/spells';
import { fightRanks } from './sim/spellRanks';
import { assaultScore, startAssault, stepAssault, ASSAULT_LIMIT_MS, AROUND } from './sim/assault/assault';
import { assaultInput, settleAssault, type AssaultPlan, type AssaultResult } from './sim/assault/assaultMode';
import { noteFallen } from './sim/assault/economy';
import { orderPlatoon, setFormation, soundRetreat, setAuto, FORMATIONS, FORMATION_NAMES } from './sim/assault/platoons';
import { anchorOf } from './sim/assault/holdMind';
import { BUCKET } from './sim/assault/field';
import { troopUnitOf } from './sim/assault/troops';
import type { FieldEvent } from './sim/assault/spike';
import { FieldView, loadFieldArt } from './render/fieldView';
import { loadSomeSheets, portrait } from './render/sheets';
import { rawAt, TH, TW, HH } from './render/iso';
import { menuFoot, menuNote, menuPick, menuSection, ornateMenu } from './ornateMenu';
import { drawHoldMap, mapAt, openPlatoonCard } from './assaultView';
import { playEvents, startFight, endFight } from './render/sound';
import { standTrack } from './render/battleMusic';
import { spellIconHtml } from './spellIcons';
import { todayKey } from './modes';

export interface SceneHooks {
  save(): void;
  onEnd(result: AssaultResult): void;
}

/** The camera's zoom at the start and its bounds (the design's 0.08 to 0.7), and the drift to the fiercest fight. */
const START_ZOOM = 0.42;
const ZOOM_MIN = 0.06;
const ZOOM_MAX = 0.75;
const DRIFT_TILES = 30;
const IDLE_MS = 6000;
/** A tap is a press shorter and stiller than this; a long press longer. */
const TAP_MS = 350;
const TAP_PX = 10;
const LONG_MS = 550;
/** Sounds: a blow further than this from the camera's middle plays none, and at most this many a tick. */
const SOUND_TILES = 18;
const SOUND_MOST = 8;
/** Slow time: the battle's pace while the Slow button is on. */
const SLOW = 0.1;
/** The Lite setting (the pause card's Battle detail): a 30 fps cap. (The scene stands under the ornate menus' veil, z-index 95, so its cards show over it.) */
const LITE_KEY = 'legends.assaultLite';

const CSS = `
#assaultScene{position:fixed;inset:0;z-index:90;background:#10131a;touch-action:none;overflow:hidden;font-family:"Alegreya Sans",sans-serif;color:#f3e7c7;user-select:none;-webkit-user-select:none}
#assaultScene canvas.field{position:absolute;inset:0;display:block;width:100%;height:100%}
.asTop{position:absolute;left:0;right:0;top:0;height:44px;display:flex;align-items:center;gap:6px;padding:0 8px;background:linear-gradient(#1b1610f2,#1b1610c8);border-bottom:1px solid #c9a24a99;z-index:3;box-sizing:border-box}
.asTop b{font-weight:700;font-size:14px;white-space:nowrap}.asTop .grow{flex:1}
.asTop button,.asOrders button,.asSpells button{min-height:34px;border-radius:7px;border:1px solid #c9a24acc;background:#2a2116e6;color:#f3e7c7;font:700 13px "Alegreya Sans",sans-serif;padding:0 9px}
.asTop button.on,.asOrders button.on{background:#5a4520;border-color:#f2dc9f}
.asDrums{display:flex;gap:3px}.asDrums i{display:inline-block;width:14px;height:14px;border-radius:50%;background:#a5452f;border:1px solid #f2dc9f}.asDrums i.off{background:#333;opacity:.6}
.asMini{position:absolute;right:6px;top:50px;width:104px;height:104px;z-index:3;border:1px solid #c9a24acc;border-radius:6px;background:#0b0d12cc;overflow:hidden}
.asMini canvas{position:absolute;inset:0;width:104px;height:104px}
.asBottom{position:absolute;left:0;right:0;bottom:0;z-index:3;display:flex;flex-direction:column;gap:4px;padding:4px 6px calc(6px + env(safe-area-inset-bottom));background:linear-gradient(#1b161000,#1b1610f0 18%)}
.asOrders{display:flex;gap:4px;height:40px}.asOrders button{flex:1;padding:0 2px;font-size:12px;min-width:0}
.asOrders[hidden]{display:none}
.asPlatoons{display:flex;gap:5px;justify-content:center;height:76px;align-items:flex-end}
.asPort{position:relative;width:60px;height:72px;border-radius:8px;border:1px solid #c9a24a99;background:#211a12e6;padding:0;color:#f3e7c7}
.asPort.on{border-color:#ffd76a;box-shadow:0 0 0 2px #ffd76a66;transform:translateY(-4px)}
.asPort.down{filter:grayscale(1) brightness(.7)}
.asPort canvas{position:absolute;left:5px;top:4px;width:50px;height:50px;image-rendering:pixelated}
.asPort .hp{position:absolute;left:4px;right:4px;bottom:9px;height:4px;background:#000a;border-radius:2px}.asPort .hp i{display:block;height:100%;background:#6ad06a;border-radius:2px}
.asPort .ult{position:absolute;left:4px;right:4px;bottom:3px;height:3px;background:#000a;border-radius:2px}.asPort .ult i{display:block;height:100%;background:#d7a4ff;border-radius:2px}
.asPort .n{position:absolute;right:3px;top:2px;font:700 13px "Alegreya Sans",sans-serif;text-shadow:0 1px 2px #000}
.asPort .rise{position:absolute;left:0;right:0;top:20px;text-align:center;font:700 13px "Alegreya Sans";text-shadow:0 1px 2px #000}
.asGem{position:absolute;left:-6px;top:-8px;width:26px;height:26px;border-radius:50%;border:1px solid #f2dc9f;background:#6a3fa0;color:#fff;font:700 14px sans-serif;padding:0;display:none}
.asPort.on .asGem.full{display:block}
.asAll{width:48px;height:72px;border-radius:8px;border:1px solid #c9a24a99;background:#211a12e6;color:#f3e7c7;font:700 13px "Alegreya Sans"}
.asAll.on{border-color:#ffd76a}
.asSpells{display:flex;gap:4px;align-items:center;height:40px}
.asSpells .mana{flex:0 0 64px;height:10px;background:#000a;border:1px solid #c9a24a88;border-radius:5px;overflow:hidden}.asSpells .mana i{display:block;height:100%;background:#4a8cff}
.asSpells button{flex:1;display:flex;align-items:center;justify-content:center;gap:3px;font-size:12px;padding:0 3px;overflow:hidden;white-space:nowrap}
.asSpells button.armed{background:#3a5a8a;border-color:#9ad0ff}.asSpells button:disabled{opacity:.45}
.asSpells .spIcon{transform:scale(.36);margin:-20px -20px;flex:none}
.asSpells button span{overflow:hidden;text-overflow:ellipsis}
@media (max-width:400px){.asSpells button span{display:none}}
.asToast{position:absolute;left:50%;top:60px;transform:translateX(-50%);z-index:4;background:#1b1610e6;border:1px solid #c9a24a;border-radius:8px;padding:6px 12px;font:700 14px "Alegreya Sans";pointer-events:none;white-space:nowrap;max-width:80vw;overflow:hidden;text-overflow:ellipsis}
@media (max-width:400px){.asTop{gap:4px;padding:0 5px}.asTop b{font-size:12px}.asTop button{padding:0 6px;font-size:12px;min-height:32px}.asDrums i{width:10px;height:10px}}
@media (max-width:370px){.asPort{width:54px}.asPort canvas{width:44px;height:44px}.asAll{width:40px;font-size:0}.asAll::after{content:"⚑";font-size:18px}}
@media (prefers-reduced-motion:reduce){.asPort.on{transform:none}}
`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Run an assault on the page: the battle, its bar, and at its end the settling into the save. */
export async function runAssault(m: Meta, army: string, plan: AssaultPlan, hooks: SceneHooks, seed = (Date.now() ^ m.seed) >>> 0): Promise<void> {
  if (!document.getElementById('assaultHudCss')) {
    const st = el('style');
    st.id = 'assaultHudCss';
    st.textContent = CSS;
    document.head.append(st);
  }
  const host = el('div');
  host.id = 'assaultScene';
  document.body.append(host);
  const loading = el('div', 'asToast', 'Mustering the host…');
  host.append(loading);
  const input = assaultInput(m, army, seed, plan, Object.fromEntries(m.party.filter((k) => UNITS[k]).map((k) => [k, formOf(UNITS[k], 3)])));
  const b = startAssault(input);
  b.spells.ranks = fightRanks(m.spellbook);
  const h = b.field!.hold!;
  const sheets = new Set<string>(['hk_orc_grunt', 'hk_orc_archer', 'hk_orc_brute', 'hk_orc_warlord', 'wolf_black']);
  for (const x of b.units) sheets.add(b.field!.info[x.id]?.sheet ?? UNITS[x.def].sheet);
  for (const k of input.heroes) sheets.add(UNITS[troopUnitOf(k.kind)].sheet);
  const app = new Application();
  const lite = (() => {
    try {
      return localStorage.getItem(LITE_KEY) === '1';
    } catch {
      return false;
    }
  })();
  await app.init({ resizeTo: host, background: '#10131a', antialias: false, autoStart: false, autoDensity: true, resolution: Math.min(lite ? 2 : 3, devicePixelRatio || 1) });
  app.canvas.className = 'field';
  host.prepend(app.canvas);
  await Promise.all([loadSomeSheets([...sheets]), loadFieldArt()]);
  loading.remove();
  const view = new FieldView(b, app.renderer);
  app.stage.addChild(view.root);
  startFight(standTrack(seed));

  // ----- the bar -----
  const top = el('div', 'asTop');
  const pauseBtn = el('button', '', '❚❚');
  pauseBtn.setAttribute('aria-label', 'Pause');
  const clock = el('b');
  const foes = el('b');
  const drums = el('span', 'asDrums');
  const speedBtn = el('button', '', 'x1');
  const slowBtn = el('button', '', 'Slow');
  slowBtn.setAttribute('aria-label', 'Slow time');
  const autoBtn = el('button', h.auto ? 'on' : '', 'Auto');
  top.append(pauseBtn, clock, el('span', 'grow'), foes, drums, slowBtn, autoBtn, speedBtn);
  const mini = el('div', 'asMini');
  const miniMap = el('canvas');
  const miniDots = el('canvas');
  drawHoldMap(miniMap, army, 104);
  miniDots.width = miniDots.height = 104;
  mini.append(miniMap, miniDots);
  const bottom = el('div', 'asBottom');
  const orders = el('div', 'asOrders');
  orders.hidden = true;
  const holdBtn = el('button', '', 'Hold');
  const chargeBtn = el('button', '', 'Charge');
  const backBtn = el('button', '', 'Back');
  backBtn.setAttribute('aria-label', 'Fall back');
  const flankBtn = el('button', '', 'Flank');
  const formBtn = el('button', '', 'Wall');
  const followBtn = el('button', '', 'Follow');
  orders.append(holdBtn, chargeBtn, flankBtn, backBtn, formBtn, followBtn);
  const bar = el('div', 'asPlatoons');
  const spells = el('div', 'asSpells');
  const mana = el('span', 'mana');
  const manaFill = el('i');
  mana.append(manaFill);
  spells.append(mana);
  bottom.append(orders, bar, spells);
  host.append(top, mini, bottom);
  const toast = el('div', 'asToast');
  toast.hidden = true;
  host.append(toast);
  let toastUntil = 0;
  const say = (text: string) => {
    toast.textContent = text;
    toast.hidden = false;
    toastUntil = performance.now() + 2600;
  };

  // the platoon bar
  let chosen = -1; // a platoon, or 5 for All
  let follow = false;
  const ports = h.platoons.map((pl, k) => {
    const p = el('button', 'asPort');
    p.append(portrait(b.field!.info[pl.heroId].sheet, 50));
    const hp = el('span', 'hp');
    const hpI = el('i');
    hp.append(hpI);
    const ult = el('span', 'ult');
    const ultI = el('i');
    ult.append(ultI);
    const n = el('span', 'n');
    const rise = el('span', 'rise');
    const gem = el('button', 'asGem', '★');
    gem.setAttribute('aria-label', `Fire ${heroName(pl.hero)}'s ultimate`);
    gem.addEventListener('pointerdown', (e) => e.stopPropagation());
    gem.addEventListener('click', (e) => {
      e.stopPropagation();
      if (orderUltimate(b, pl.heroId)) say(`${heroName(pl.hero)}: ${ultimateOf(b.field!.byId[pl.heroId])?.name ?? 'Ultimate'}!`);
    });
    p.append(hp, ult, n, rise, gem);
    p.setAttribute('aria-label', `${heroName(pl.hero)}'s platoon`);
    // (a tap chooses; a second tap with a full meter fires the ultimate; a double tap flies to the hero; a long press opens the card)
    let downAt = 0;
    let lastTap = 0;
    let longTimer = 0;
    p.addEventListener('pointerdown', () => {
      downAt = performance.now();
      longTimer = window.setTimeout(() => {
        downAt = 0;
        openPlatoonCard(m, pl.hero, { save: hooks.save, readOnly: true, alive: pl.soldiers.filter((s) => b.field!.byId[s.id].alive).length });
      }, LONG_MS);
    });
    p.addEventListener('pointerup', () => {
      clearTimeout(longTimer);
      if (!downAt) return;
      const now = performance.now();
      if (now - lastTap < 320) {
        const a = anchorOf(b.field!, pl);
        if (a) aimAt(a.u, a.v);
      } else if (chosen === k && b.field!.byId[pl.heroId].alive && orderUltimate(b, pl.heroId)) say(`${heroName(pl.hero)}: ${ultimateOf(b.field!.byId[pl.heroId])?.name ?? 'Ultimate'}!`);
      else choose(k);
      lastTap = now;
    });
    bar.append(p);
    return { p, hpI, ultI, n, rise, gem };
  });
  const allBtn = el('button', 'asAll', 'All');
  allBtn.addEventListener('click', () => choose(chosen === 5 ? -1 : 5));
  bar.append(allBtn);
  const choose = (k: number) => {
    chosen = k;
    view.chosen = k >= 0 && k < 5 ? h.platoons[k].group : -1;
    ports.forEach((x, i) => x.p.classList.toggle('on', i === k));
    allBtn.classList.toggle('on', k === 5);
    orders.hidden = k < 0;
    if (k >= 0 && k < 5) {
      const a = anchorOf(b.field!, h.platoons[k]);
      if (a) aimAt(a.u, a.v, true);
    }
    syncOrders();
  };
  const chosenList = (): number[] => (chosen === 5 ? h.platoons.map((_, i) => i) : chosen >= 0 ? [chosen] : []);
  const syncOrders = () => {
    const pl = chosen >= 0 && chosen < 5 ? h.platoons[chosen] : undefined;
    chargeBtn.disabled = !!pl?.charged;
    formBtn.textContent = pl ? FORMATION_NAMES[pl.formation].split(' ').pop()! : 'Form';
    formBtn.disabled = chosen === 5;
    followBtn.classList.toggle('on', follow);
    holdBtn.classList.toggle('on', pl?.order.kind === 'hold');
  };
  holdBtn.addEventListener('click', () => {
    for (const k of chosenList()) {
      const a = anchorOf(b.field!, h.platoons[k]);
      if (a) orderPlatoon(b, k, { kind: 'hold', at: { u: a.u, v: a.v } });
    }
    say('Hold!');
  });
  chargeBtn.addEventListener('click', () => {
    let any = false;
    for (const k of chosenList()) {
      const a = anchorOf(b.field!, h.platoons[k]);
      if (a && orderPlatoon(b, k, { kind: 'charge', at: { u: a.u, v: a.v } })) any = true;
    }
    if (any) say('Charge!');
  });
  backBtn.addEventListener('click', () => {
    for (const k of chosenList()) {
      const a = anchorOf(b.field!, h.platoons[k]);
      if (!a) continue;
      // (the rally flag or the nearest friendly platoon, whichever is nearer)
      let at = h.bp.rally;
      let best = Math.abs(a.u - at.u) + Math.abs(a.v - at.v);
      h.platoons.forEach((o, j) => {
        const x = j !== k ? anchorOf(b.field!, o) : undefined;
        if (!x) return;
        const d = Math.abs(a.u - x.u) + Math.abs(a.v - x.v);
        if (d < best && d > 3) {
          best = d;
          at = { u: x.u, v: x.v };
        }
      });
      orderPlatoon(b, k, { kind: 'fallback', at: { ...at } });
    }
    say('Fall back!');
  });
  formBtn.addEventListener('click', () => {
    if (chosen < 0 || chosen >= 5) return;
    const pl = h.platoons[chosen];
    const next = FORMATIONS[(FORMATIONS.indexOf(pl.formation) + 1) % FORMATIONS.length];
    setFormation(b, chosen, next);
    pl.formation = next;
    syncOrders();
    say(FORMATION_NAMES[next]);
  });
  // (Flank: the next tap on a foe sends the chosen platoon round it)
  let flanking = false;
  flankBtn.addEventListener('click', () => {
    flanking = !flanking;
    flankBtn.classList.toggle('on', flanking);
    if (flanking) say('Flank: tap a foe');
  });
  followBtn.addEventListener('click', () => {
    follow = !follow;
    syncOrders();
  });

  // the spell row
  const loadout = [...new Set([...(m.spellbook.equipped ?? []), ...(m.spellbook.open ? [m.spellbook.open] : [])])].filter((id) => SPELLS[id]).slice(0, 4);
  let armed: SpellId | null = null;
  const spellBtns = loadout.map((id) => {
    const btn = el('button');
    btn.innerHTML = `${spellIconHtml(id)}<span>${SPELLS[id].name}</span>`;
    btn.addEventListener('click', () => {
      if (!canAfford(b, id)) return;
      if (SPELLS[id].target === 'all') {
        castNear(id, Math.round(camTile().u), Math.round(camTile().v));
        return;
      }
      armed = armed === id ? null : id;
      spellBtns.forEach((x, i) => x.classList.toggle('armed', loadout[i] === armed));
      if (armed) say(`${SPELLS[id].name}: tap the field`);
    });
    spells.append(btn);
    return btn;
  });
  /** A spell on the field reaches the fighters near where it is cast (an "everywhere" spell, those near the camera's middle). */
  const castNear = (id: SpellId, u: number, v: number) => {
    const all = b.units;
    b.units = all.filter((x) => Math.abs(x.u - u) + Math.abs(x.v - v) <= AROUND);
    const n = b.units.length;
    let ok = false;
    try {
      ok = castSpell(b, id, u, v);
    } finally {
      const added = b.units.slice(n).filter((x) => !all.includes(x));
      b.units = all;
      all.push(...added);
    }
    if (ok) say(SPELLS[id].name);
    armed = null;
    spellBtns.forEach((x) => x.classList.remove('armed'));
  };

  // ----- the camera -----
  const [sx, sy] = rawAt(90, 90, 1);
  const cam = { x: sx, y: sy, zoom: START_ZOOM };
  let lastInput = performance.now();
  let heat: { t: number; k: number }[] = [];
  let aim: { x: number; y: number } | null = null;
  const aimAt = (u: number, v: number, soft = false) => {
    const [x, y] = rawAt(u, v, b.board.tiles[v * b.board.w + u]?.h ?? 2);
    if (soft) aim = { x, y };
    else {
      cam.x = x;
      cam.y = y;
      aim = null;
    }
    lastInput = performance.now();
  };
  const play = () => ({ top: 44, bottom: host.clientHeight - bottom.offsetHeight });
  const focusAt = () => {
    const pa = play();
    return [host.clientWidth / 2, (pa.top + pa.bottom) / 2] as const;
  };
  /** The tile at a point on the screen: the highest tile whose top's diamond holds it. */
  const tileAtScreen = (px: number, py: number): { u: number; v: number } | null => {
    const [fx, fy] = focusAt();
    const wx = cam.x + (px - fx) / cam.zoom;
    const wy = cam.y + (py - fy) / cam.zoom;
    let best: { u: number; v: number } | null = null;
    let bestDepth = -Infinity;
    for (let hgt = 0; hgt <= 12; hgt++) {
      // (on the plane at this height, the tile under the point)
      const a = wx / (TW / 2);
      const c = (wy + hgt * HH) / (TH / 2);
      const u = Math.round((a + c) / 2);
      const v = Math.round((c - a) / 2);
      if (u < 0 || v < 0 || u >= b.board.w || v >= b.board.d) continue;
      const t = b.board.tiles[v * b.board.w + u];
      if (Math.round(t.h) !== hgt) continue;
      if (u + v > bestDepth) {
        bestDepth = u + v;
        best = { u, v };
      }
    }
    return best;
  };
  const camTile = () => {
    const a = cam.x / (TW / 2);
    const c = (cam.y + 2 * HH) / (TH / 2);
    return { u: Math.max(0, Math.min(99, (a + c) / 2)), v: Math.max(0, Math.min(99, (c - a) / 2)) };
  };

  // ----- touch: drag to pan, pinch to zoom, tap to order -----
  const touches = new Map<number, { x: number; y: number; at: number; sx: number; sy: number }>();
  let pinch = 0;
  app.canvas.addEventListener('pointerdown', (e) => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY, at: performance.now(), sx: e.clientX, sy: e.clientY });
    app.canvas.setPointerCapture(e.pointerId);
    lastInput = performance.now();
  });
  app.canvas.addEventListener('pointermove', (e) => {
    const was = touches.get(e.pointerId);
    if (!was) return;
    if (touches.size === 1) {
      cam.x -= (e.clientX - was.x) / cam.zoom;
      cam.y -= (e.clientY - was.y) / cam.zoom;
      if (Math.abs(e.clientX - was.sx) + Math.abs(e.clientY - was.sy) > TAP_PX) {
        follow = false;
        aim = null;
        syncOrders();
      }
    }
    touches.set(e.pointerId, { ...was, x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      const [a, z] = [...touches.values()];
      const d = Math.hypot(a.x - z.x, a.y - z.y);
      if (pinch) cam.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.zoom * (d / pinch)));
      pinch = d;
    }
    lastInput = performance.now();
  });
  const lift = (e: PointerEvent) => {
    const was = touches.get(e.pointerId);
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = 0;
    if (!was || touches.size) return;
    const still = Math.abs(e.clientX - was.sx) + Math.abs(e.clientY - was.sy) <= TAP_PX;
    if (still && performance.now() - was.at < TAP_MS) tap(e.clientX - host.getBoundingClientRect().left, e.clientY - host.getBoundingClientRect().top);
  };
  app.canvas.addEventListener('pointerup', lift);
  app.canvas.addEventListener('pointercancel', (e) => {
    touches.delete(e.pointerId);
    pinch = 0;
  });
  app.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
    lastInput = performance.now();
  }, { passive: false });
  /** A tap on the field: a spell readied is cast; a platoon chosen is sent (a gate or a drum: Assault; a foe: Focus; else Move); with none
   *  chosen, a tap on one of ours chooses its platoon. */
  const tap = (px: number, py: number) => {
    const t = tileAtScreen(px, py);
    if (!t) return;
    if (armed) return castNear(armed, t.u, t.v);
    const f = b.field!;
    const near = (side: 'hero' | 'foe') => {
      let best: { id: number; d: number } | null = null;
      for (let dv = -1; dv <= 1; dv++)
        for (let du = -1; du <= 1; du++) {
          const id = f.occ[(t.v + dv) * f.w + t.u + du];
          if (id < 0 || f.byId[id].side !== side || !f.byId[id].alive) continue;
          const d = Math.abs(du) + Math.abs(dv);
          if (!best || d < best.d) best = { id, d };
        }
      return best?.id;
    };
    const list = chosenList();
    if (!list.length) {
      const id = near('hero');
      const k = id !== undefined ? h.platoons.findIndex((p) => p.heroId === id || p.soldiers.some((s) => s.id === id)) : -1;
      if (k >= 0) choose(k);
      return;
    }
    // (a Flank readied: a tap on a foe sends the platoons round it; anywhere else lets it go)
    if (flanking) {
      flanking = false;
      flankBtn.classList.remove('on');
      const target = near('foe');
      if (target === undefined) return say('Flank: no foe there');
      for (const k of list) orderPlatoon(b, k, { kind: 'flank', unit: target });
      return say(`Flank: ${UNITS[f.byId[target].def].name}`);
    }
    const fortIx = h.fortAt.get(t.v * f.w + t.u);
    const fort = fortIx !== undefined ? h.forts[fortIx] : undefined;
    const foe = near('foe');
    if (fort && !fort.broken && !fort.open) {
      for (const k of list) orderPlatoon(b, k, { kind: 'assault', fort: fort.spec.id });
      say(`Assault: ${fort.spec.name}`);
    } else if (foe !== undefined) {
      for (const k of list) orderPlatoon(b, k, { kind: 'focus', unit: foe });
      say(`Focus: ${UNITS[f.byId[foe].def].name}`);
    } else {
      // (All: each platoon keeps its place round the point, fanned out)
      const anchors = list.map((k) => anchorOf(f, h.platoons[k]));
      const live = anchors.filter((a): a is NonNullable<typeof a> => !!a);
      const mu = live.reduce((n, a) => n + a.u, 0) / Math.max(1, live.length);
      const mv = live.reduce((n, a) => n + a.v, 0) / Math.max(1, live.length);
      list.forEach((k, i) => {
        const a = anchors[i];
        const du = list.length > 1 && a ? Math.max(-4, Math.min(4, Math.round(a.u - mu))) : 0;
        const dv = list.length > 1 && a ? Math.max(-4, Math.min(4, Math.round(a.v - mv))) : 0;
        orderPlatoon(b, k, { kind: 'move', at: { u: Math.max(0, Math.min(99, t.u + du)), v: Math.max(0, Math.min(99, t.v + dv)) } });
      });
      ring = { u: t.u, v: t.v, until: performance.now() + 900 };
    }
  };
  let ring: { u: number; v: number; until: number } | null = null;
  // the minimap: a tap moves the camera; a long press sends the chosen platoon there
  let miniDown = 0;
  let miniTimer = 0;
  const miniTile = (e: PointerEvent) => {
    const r = mini.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 104 - 52;
    const y = ((e.clientY - r.top) / r.height) * 104;
    const u = Math.round((y + x) * (100 / 104));
    const v = Math.round((y - x) * (100 / 104));
    return { u: Math.max(0, Math.min(99, u)), v: Math.max(0, Math.min(99, v)) };
  };
  mini.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    miniDown = performance.now();
    const at = miniTile(e);
    miniTimer = window.setTimeout(() => {
      miniDown = 0;
      for (const k of chosenList()) orderPlatoon(b, k, { kind: 'move', at });
      if (chosenList().length) say('Sent');
    }, LONG_MS);
  });
  mini.addEventListener('pointerup', (e) => {
    clearTimeout(miniTimer);
    if (!miniDown) return;
    const at = miniTile(e);
    aimAt(at.u, at.v);
  });

  // ----- the top bar's buttons, and pause -----
  let speed = 1;
  let paused = false;
  // (Slow: the battle runs at a tenth of its pace while the player gives orders, then a second tap resumes; a pause it is not)
  let slow = false;
  slowBtn.addEventListener('click', () => {
    slow = !slow;
    slowBtn.classList.toggle('on', slow);
    say(slow ? 'Time slows: give your orders' : 'Time runs on');
  });
  speedBtn.addEventListener('click', () => {
    speed = speed === 1 ? 2 : 1;
    speedBtn.textContent = `x${speed}`;
  });
  autoBtn.addEventListener('click', () => {
    setAuto(b, !h.auto);
    autoBtn.classList.toggle('on', !h.auto);
    say(h.auto ? 'You take the platoons' : 'Auto: the platoons follow the plan');
  });
  pauseBtn.addEventListener('click', () => openPause());
  const openPause = () => {
    paused = true;
    const menu = ornateMenu({ id: 'assaultPause', eyebrow: 'The assault', title: 'Paused', sub: `${clockWords(b.t)} of battle`, onClose: () => (paused = false) });
    const grid = menuSection(menu.body, 'Battle detail', 'Lite caps the frames at 30 a second', 2);
    let now = lite;
    menuPick(grid, [false, true], lite, (x) => ({ title: x ? 'Lite' : 'Full', icon: x ? '◔' : '●' }), (x) => {
      now = x;
      try {
        localStorage.setItem(LITE_KEY, x ? '1' : '0');
      } catch {
        /* a private window: the setting lasts this assault */
      }
      app.ticker.maxFPS = x ? 30 : 0;
      fpsCap = x ? 30 : 0;
    });
    void now;
    const war = menuSection(menu.body, 'The retreat', 'the soldiers standing come home; the fallen are lost', 2);
    let asked = false;
    const retreat = menuPick(war, ['retreat'], undefined, () => ({ title: 'Sound the retreat', icon: '⚑', lines: ['Tap twice: the assault ends'] }), () => {
      if (!asked) {
        asked = true;
        retreat[0].querySelector('b')!.textContent = 'Sound it? Tap again';
        return;
      }
      soundRetreat(b);
      menu.close();
    });
    menuNote(menu.body, 'Choose a platoon on the bar and tap the field to send it: a gate or a drum to assault it, a foe to strike it first. The lord\'s fall takes the hold.');
    menuFoot(menu, { back: { word: 'close' }, primary: { label: 'Resume', onClick: () => menu.close() } });
  };
  let fpsCap = lite ? 30 : 0;

  // ----- the loop -----
  let acc = 0;
  let last = performance.now();
  let lastDraw = 0;
  let endedAt = 0;
  let shown = 0;
  let lordWoke = false;
  let gone = false;
  const frame = (now: number) => {
    if (gone) return;
    requestAnimationFrame(frame);
    if (fpsCap && now - lastDraw < 1000 / fpsCap - 2) return;
    lastDraw = now;
    const dt = Math.min(250, now - last);
    last = now;
    const events: FieldEvent[] = [];
    const sound: BattleEvent[] = [];
    if (b.phase === 'fight' && !paused) {
      acc += dt * (slow ? SLOW : speed);
      let n = 0;
      while (acc >= TICK_MS && n < 8 && b.phase === 'fight') {
        const ev = stepAssault(b);
        for (const e of ev) {
          if (e.kind === 'swing' && e.to >= 0) {
            const by = b.field!.byId[e.by];
            events.push({ kind: 'blow', by: e.by, to: e.to, shot: !!(by && UNITS[by.def].shot) });
            heat.push({ t: b.t, k: Math.floor(by.v / BUCKET) * 100 + Math.floor(by.u / BUCKET) });
          } else if (e.kind === 'hit') events.push({ kind: 'hit', to: e.to, dmg: e.dmg });
          sound.push(e);
        }
        for (const e of h.events) {
          if (e.kind === 'breach' || e.kind === 'open') view.breach(e.tiles);
          else if (e.kind === 'fell') {
            noteFallen(m, h.platoons[e.platoon].hero, e.index);
            hooks.save();
          } else if (e.kind === 'horn') say('The great horn sounds!');
          else if (e.kind === 'silenced') say('A war drum falls silent');
          else if (e.kind === 'reinforce') say('Reinforcements from the Warpath');
          else if (e.kind === 'lordFell') say('The lord of the hold falls!');
          else if (e.kind === 'rise') say(`${heroName(h.platoons[e.platoon].hero)} rises at the rally flag`);
          if (e.kind === 'breach') say('The way is open!');
        }
        acc -= TICK_MS;
        n++;
      }
      if (n === 8) acc = 0;
    } else if (b.phase !== 'fight' && !endedAt) endedAt = now;
    else if (endedAt && now - endedAt > 1800) return finish();
    // (the sounds of the blows near the camera's middle)
    if (sound.length) {
      const c = camTile();
      const near = sound.filter((e) => {
        const id = 'by' in e ? (e as { by: number }).by : 'to' in e ? (e as { to: number }).to : -1;
        const x = id >= 0 ? b.field!.byId[id] : undefined;
        return !x || Math.abs(x.u - c.u) + Math.abs(x.v - c.v) <= SOUND_TILES;
      });
      if (near.length) playEvents(b, near.slice(0, SOUND_MOST), speed);
    }
    // (the lord's fight: the boss's music once his guard wakes)
    if (!lordWoke && h.posts.find((p) => p.def.id === 'throne')?.mood !== 'posted') {
      lordWoke = true;
      startFight(standTrack(seed, true));
    }
    // the camera: following the chosen hero, easing to a point asked for, or drifting to the fiercest fight when left alone
    heat = heat.filter((x) => b.t - x.t <= 3000);
    const f = b.field!;
    if (follow && chosen >= 0 && chosen < 5) {
      const a = anchorOf(f, h.platoons[chosen]);
      if (a) aim = { x: rawAt(a.u, a.v, 2)[0], y: rawAt(a.u, a.v, 2)[1] };
    } else if (!aim && now - lastInput > IDLE_MS && heat.length && chosen < 0) {
      const count = new Map<number, number>();
      let best = -1;
      let most = 0;
      for (const x of heat) {
        const c = (count.get(x.k) ?? 0) + 1;
        count.set(x.k, c);
        if (c > most || (c === most && x.k < best)) {
          most = c;
          best = x.k;
        }
      }
      const [tx, ty] = rawAt((best % 100) * BUCKET + BUCKET / 2, Math.floor(best / 100) * BUCKET + BUCKET / 2, 3);
      const step = (DRIFT_TILES * 32 * dt) / 1000;
      const d = Math.hypot(tx - cam.x, ty - cam.y);
      if (d > 1) {
        const k = Math.min(1, step / d, 0.08);
        cam.x += (tx - cam.x) * k;
        cam.y += (ty - cam.y) * k;
      }
    }
    if (aim) {
      const d = Math.hypot(aim.x - cam.x, aim.y - cam.y);
      const k = Math.min(1, 0.15);
      cam.x += (aim.x - cam.x) * k;
      cam.y += (aim.y - cam.y) * k;
      if (d < 2 && !follow) aim = null;
    }
    view.update(cam, app.screen.width, app.screen.height, b.t + Math.min(acc, TICK_MS), events, play());
    app.render();
    // the bar, four times a second
    if (now - shown > 250) {
      shown = now;
      drawBar();
    }
    if (toastUntil && now > toastUntil) {
      toast.hidden = true;
      toastUntil = 0;
    }
    void ring;
  };
  const clockWords = (t: number) => `${Math.floor(t / 60000)}:${String(Math.floor((t % 60000) / 1000)).padStart(2, '0')}`;
  const drawBar = () => {
    const sc = assaultScore(b);
    const left = ASSAULT_LIMIT_MS - b.t;
    clock.textContent = left <= 180_000 ? `${clockWords(Math.max(0, left))} left` : clockWords(b.t);
    foes.textContent = `Foes ${sc.foesLeft} / ${sc.foesTotal}`;
    drums.replaceChildren(...h.forts.filter((x) => x.spec.kind === 'drum').map((x) => el('i', x.broken ? 'off' : '')));
    autoBtn.classList.toggle('on', h.auto);
    const f = b.field!;
    h.platoons.forEach((pl, k) => {
      const hero = f.byId[pl.heroId];
      const port = ports[k];
      port.hpI.style.width = `${Math.round((100 * Math.max(0, hero.hp)) / hero.maxHp)}%`;
      const ult = ultimateOf(hero);
      const share = ult ? Math.min(1, (hero.charge2 ?? 0) / ult.need) : 0;
      port.ultI.style.width = `${Math.round(share * 100)}%`;
      port.gem.classList.toggle('full', share >= 1 && hero.alive);
      port.n.textContent = String(sc.platoons[k].soldiers);
      port.p.classList.toggle('down', !hero.alive);
      port.rise.textContent = !hero.alive && pl.downAt !== undefined ? `${Math.max(0, Math.ceil((45_000 - (b.t - pl.downAt)) / 1000))}s` : '';
    });
    manaFill.style.width = `${Math.round((100 * b.spells.mana) / MANA_MAX)}%`;
    spellBtns.forEach((x, i) => (x.disabled = !canAfford(b, loadout[i])));
    syncOrders();
    // the minimap's dots
    const g = miniDots.getContext('2d')!;
    g.clearRect(0, 0, 104, 104);
    for (const x of b.units) {
      if (!x.alive) continue;
      const [px, py] = mapAt(x.u, x.v, 104);
      g.fillStyle = x.side === 'hero' ? '#6ab8ff' : '#ff5a4a';
      g.fillRect(px - 1, py - 1, x.side === 'hero' ? 2 : 1.5, x.side === 'hero' ? 2 : 1.5);
    }
    for (const fort of h.forts) {
      if (fort.spec.kind === 'palisade') continue;
      const t = fort.spec.tiles[0];
      const [px, py] = mapAt(t % 100, Math.floor(t / 100), 104);
      g.fillStyle = fort.broken || fort.open ? '#777' : fort.spec.kind === 'drum' ? '#ffb030' : '#f2dc9f';
      g.fillRect(px - 2, py - 2, 4, 4);
    }
    // (the camera's place)
    const c = camTile();
    const [cx, cy] = mapAt(c.u, c.v, 104);
    g.strokeStyle = '#ffffffaa';
    g.strokeRect(cx - 8, cy - 6, 16, 12);
  };
  const finish = () => {
    if (gone) return;
    gone = true;
    endFight();
    const result = settleAssault(m, b, todayKey());
    hooks.save();
    view.destroy();
    app.destroy(true);
    host.remove();
    hooks.onEnd(result);
  };
  drawBar();
  requestAnimationFrame(frame);
}
