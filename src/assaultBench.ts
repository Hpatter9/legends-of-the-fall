// The Assault's bench page (phase 0, `docs/notes/assault-0.md`): `?bench=assault` on the game's address plays the engine spike's
// fight (55 of ours against the garrison's 200 on the 100 x 100 field, `sim/assault/spike.ts`) through the chunked field renderer
// (`render/fieldView.ts`), and shows live, on the phone itself, the simulation's milliseconds a tick (mean and p95), the frame rate and
// the frame time. It touches no save: the game itself is not started. When the fight ends it starts again on the next seed.
//
// The camera starts close in and drifts to the fiercest fight (the most blows in the last three seconds, in an 8 x 8-tile square), as
// the design's camera does; drag to pan, pinch or the wheel to zoom, and the buttons jump between the three levels of detail.
//
//   ?bench=assault              Near, following the fight
//   &lod=mid | far              start at Mid or Far
//   &speed=2                    the battle at double speed (the sim runs twice a tick's work a frame-second)
//   &seed=7                     the first fight's seed

import { Application } from 'pixi.js';
import { startSpike, stepSpike, SPIKE_PLATOONS, SPIKE_TROOPS, type FieldEvent } from './sim/assault/spike';
import { TICK_MS, type Battle } from './sim/battle';
import { UNITS } from './sim/units';
import { BUCKET } from './sim/assault/field';
import { FieldView, loadFieldArt, MID_AT, NEAR_AT, type Detail } from './render/fieldView';
import { loadSomeSheets } from './render/sheets';
import { rawAt } from './render/iso';

/** How many ticks and frames the readout's rolling figures cover. */
const TICK_WINDOW = 600;
const FRAME_WINDOW = 240;
/** The camera's zoom at each level when a button is pressed. */
const ZOOM: Record<Detail, number> = { near: 0.5, mid: 0.22, far: 0.06 };
/** The camera drifts at most this many tiles a second (the design's 2.4). */
const DRIFT_TILES = 30;

/** Whether this page is the Assault's bench. */
export const isAssaultBench = (): boolean => new URLSearchParams(location.search).get('bench') === 'assault';

/** What the readout shows, kept on `window.__bench` for a test page to read. */
export interface BenchStats {
  seed: number;
  run: number;
  ticks: number;
  simMean: number;
  simP95: number;
  simWorst: number;
  fps: number;
  frameMean: number;
  frameP95: number;
  workMean: number;
  detail: Detail;
  zoom: number;
  fighters: number;
  chunks: number;
  alive: number;
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const p95 = (xs: readonly number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
};

export async function startAssaultBench(): Promise<void> {
  const query = new URLSearchParams(location.search);
  const speed = Math.max(1, Math.min(4, Number(query.get('speed')) || 1));
  let seed = Number(query.get('seed')) || 1;
  // (the page's own layer over the game's: the game is not started)
  document.getElementById('loading')?.setAttribute('hidden', '');
  const host = document.createElement('div');
  host.id = 'assaultBench';
  host.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#10131a;touch-action:none;overflow:hidden;';
  document.body.appendChild(host);
  const hud = document.createElement('div');
  hud.style.cssText = 'position:absolute;left:8px;right:8px;top:8px;z-index:2;padding:8px 10px;border-radius:8px;background:rgba(10,12,18,0.82);border:1px solid rgba(201,162,74,0.7);color:#f3e7c7;font:13px/1.35 "Alegreya Sans",sans-serif;pointer-events:none;white-space:pre-wrap;';
  host.appendChild(hud);
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:8px;right:8px;bottom:12px;z-index:2;display:flex;gap:6px;justify-content:center;';
  host.appendChild(bar);
  const app = new Application();
  await app.init({ resizeTo: host, background: '#10131a', antialias: false, autoStart: false, autoDensity: true, resolution: Math.min(3, devicePixelRatio || 1) });
  host.insertBefore(app.canvas, hud);
  app.canvas.style.cssText = 'display:block;width:100%;height:100%;';
  hud.textContent = 'Loading the field…';
  const sheets = new Set<string>(['hk_orc_grunt', 'hk_orc_archer', 'hk_orc_brute', 'hk_orc_warlord', 'wolf_black']);
  for (const p of SPIKE_PLATOONS) {
    sheets.add(UNITS[p.hero].sheet);
    sheets.add(SPIKE_TROOPS[p.troop].sheet);
  }
  await Promise.all([loadSomeSheets([...sheets]), loadFieldArt(), document.fonts?.load('700 16px "Alegreya Sans"').catch(() => {})]);

  let b: Battle;
  let view: FieldView;
  let run = 0;
  const simMs: number[] = [];
  const frameMs: number[] = [];
  const workMs: number[] = [];
  let simWorst = 0;
  // (the blows of the last three seconds, by bucket: the camera's "fiercest fight")
  let heat: { t: number; k: number }[] = [];
  const cam = { x: 0, y: 0, zoom: ZOOM[(query.get('lod') as Detail) in ZOOM ? (query.get('lod') as Detail) : 'near'] };
  let follow = true;
  const begin = () => {
    view?.destroy();
    b = startSpike(seed);
    view = new FieldView(b, app.renderer);
    app.stage.removeChildren();
    app.stage.addChild(view.root);
    run++;
    heat = [];
    // (the camera starts over our Landing)
    const [x, y] = rawAt(90, 90, 1);
    cam.x = x;
    cam.y = y;
  };
  begin();

  // the buttons: the three levels, follow, and the next fight
  const button = (label: string, on: () => void) => {
    const el = document.createElement('button');
    el.textContent = label;
    el.style.cssText = 'flex:1;min-height:40px;border-radius:8px;border:1px solid rgba(201,162,74,0.8);background:rgba(28,22,14,0.9);color:#f3e7c7;font:700 14px "Alegreya Sans",sans-serif;';
    el.addEventListener('click', on);
    bar.appendChild(el);
    return el;
  };
  button('Near', () => (cam.zoom = ZOOM.near));
  button('Mid', () => (cam.zoom = ZOOM.mid));
  button('Far', () => (cam.zoom = ZOOM.far));
  const followBtn = button('Follow ✓', () => {
    follow = !follow;
    followBtn.textContent = follow ? 'Follow ✓' : 'Follow';
  });
  button('Next', () => {
    seed++;
    begin();
  });

  // pan with a finger, pinch or the wheel to zoom (any drag stops Follow)
  const touches = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  const clampZoom = (z: number) => Math.max(0.05, Math.min(0.8, z));
  app.canvas.addEventListener('pointerdown', (e) => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    app.canvas.setPointerCapture(e.pointerId);
  });
  app.canvas.addEventListener('pointermove', (e) => {
    const was = touches.get(e.pointerId);
    if (!was) return;
    if (touches.size === 1) {
      cam.x -= (e.clientX - was.x) / cam.zoom;
      cam.y -= (e.clientY - was.y) / cam.zoom;
      if (follow && Math.abs(e.clientX - was.x) + Math.abs(e.clientY - was.y) > 2) {
        follow = false;
        followBtn.textContent = 'Follow';
      }
    }
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      const [a, z] = [...touches.values()];
      const d = Math.hypot(a.x - z.x, a.y - z.y);
      if (pinch) cam.zoom = clampZoom(cam.zoom * (d / pinch));
      pinch = d;
    }
  });
  const lift = (e: PointerEvent) => {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = 0;
  };
  app.canvas.addEventListener('pointerup', lift);
  app.canvas.addEventListener('pointercancel', lift);
  app.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.zoom = clampZoom(cam.zoom * (e.deltaY > 0 ? 0.9 : 1.1));
  }, { passive: false });

  let acc = 0;
  let last = performance.now();
  let endedAt = 0;
  let fpsCount = 0;
  let fpsAt = last;
  let fps = 0;
  let shown = 0;
  const stats: BenchStats = { seed, run, ticks: 0, simMean: 0, simP95: 0, simWorst: 0, fps: 0, frameMean: 0, frameP95: 0, workMean: 0, detail: 'near', zoom: cam.zoom, fighters: 0, chunks: 0, alive: 0 };
  (window as unknown as { __bench: BenchStats }).__bench = stats;

  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = Math.min(250, now - last);
    last = now;
    frameMs.push(dt);
    if (frameMs.length > FRAME_WINDOW) frameMs.shift();
    fpsCount++;
    if (now - fpsAt >= 1000) {
      fps = (fpsCount * 1000) / (now - fpsAt);
      fpsCount = 0;
      fpsAt = now;
    }
    const w0 = performance.now();
    // the battle, ten ticks a second (times the speed), each tick timed
    const events: FieldEvent[] = [];
    if (b.phase === 'fight') {
      acc += dt * speed;
      let n = 0;
      while (acc >= TICK_MS && n < 8) {
        const a = performance.now();
        const ev = stepSpike(b);
        const ms = performance.now() - a;
        simMs.push(ms);
        if (simMs.length > TICK_WINDOW) simMs.shift();
        simWorst = Math.max(simWorst, ms);
        for (const e of ev) {
          events.push(e);
          if (e.kind === 'blow') {
            const by = b.field!.byId[e.by];
            heat.push({ t: b.t, k: Math.floor(by.v / BUCKET) * 100 + Math.floor(by.u / BUCKET) });
          } else if (e.kind === 'breach') view.breach(e.tiles);
        }
        acc -= TICK_MS;
        n++;
      }
      if (n === 8) acc = 0;
    } else if (!endedAt) endedAt = now;
    else if (now - endedAt > 4000) {
      endedAt = 0;
      seed++;
      begin();
    }
    // the camera drifts to the fiercest fight (the most blows of the last three seconds in one bucket)
    heat = heat.filter((h) => b.t - h.t <= 3000);
    if (follow && heat.length) {
      const count = new Map<number, number>();
      let best = -1;
      let most = 0;
      for (const h of heat) {
        const c = (count.get(h.k) ?? 0) + 1;
        count.set(h.k, c);
        if (c > most || (c === most && h.k < best)) {
          most = c;
          best = h.k;
        }
      }
      const [tx, ty] = rawAt((best % 100) * BUCKET + BUCKET / 2, Math.floor(best / 100) * BUCKET + BUCKET / 2, 3);
      const step = (DRIFT_TILES * 32 * dt) / 1000;
      const dx = tx - cam.x;
      const dy = ty - cam.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        const k = Math.min(1, step / d, 0.08);
        cam.x += dx * k;
        cam.y += dy * k;
      }
    }
    view.update(cam, app.renderer.width / app.renderer.resolution, app.renderer.height / app.renderer.resolution, b.t + Math.min(acc, TICK_MS), events);
    app.render();
    workMs.push(performance.now() - w0);
    if (workMs.length > FRAME_WINDOW) workMs.shift();
    // the readout, four times a second
    if (now - shown > 250) {
      shown = now;
      const alive = b.units.filter((x) => x.alive);
      Object.assign(stats, {
        seed, run, ticks: b.field!.stats.ticks, simMean: mean(simMs), simP95: p95(simMs), simWorst, fps, frameMean: mean(frameMs), frameP95: p95(frameMs), workMean: mean(workMs),
        detail: view.detail, zoom: cam.zoom, fighters: view.drawn.fighters, chunks: view.drawn.chunks, alive: alive.length,
      });
      const ours = alive.filter((x) => x.side === 'hero').length;
      const clock = `${Math.floor(b.t / 60000)}:${String(Math.floor((b.t % 60000) / 1000)).padStart(2, '0')}`;
      hud.textContent =
        `Assault bench · fight ${run} (seed ${seed}) · ${clock}${speed > 1 ? ` · x${speed}` : ''}${b.phase !== 'fight' ? ` · ${b.phase === 'won' ? 'won' : 'over'}` : ''}\n` +
        `Sim: ${stats.simMean.toFixed(2)} ms a tick (p95 ${stats.simP95.toFixed(2)}, worst ${simWorst.toFixed(1)})  budget 3 ms\n` +
        `Frames: ${fps.toFixed(0)} fps · ${stats.frameMean.toFixed(1)} ms (p95 ${stats.frameP95.toFixed(1)}) · work ${stats.workMean.toFixed(1)} ms\n` +
        `${view.detail[0].toUpperCase()}${view.detail.slice(1)} (zoom ${cam.zoom.toFixed(2)}; Near ≥ ${NEAR_AT}, Far < ${MID_AT}) · ${view.drawn.fighters} drawn · ${view.drawn.chunks} chunks\n` +
        `Ours ${ours}/55 · theirs ${alive.length - ours}/200`;
    }
  };
  requestAnimationFrame(frame);
}
