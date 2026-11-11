// The Assault's bench page (phase 0, `docs/notes/assault-0.md`): `?bench=assault` on the game's address plays the engine spike's
// fight (55 of ours against the garrison's 200 on the 100 x 100 field, `sim/assault/spike.ts`) through the chunked field renderer
// (`render/fieldView.ts`), and shows live, on the phone itself, the simulation's milliseconds a tick (mean and p95), the frame rate and
// the frame time. It touches no save: the game itself is not started. When the fight ends it starts again on the next seed.
//
// The camera starts close in and drifts to the fiercest fight (the most blows in the last three seconds, in an 8 x 8-tile square), as
// the design's camera does; drag to pan, pinch or the wheel to zoom, and the buttons jump between the three levels of detail.
//
// Since phase 1 (`docs/notes/assault-1.md`) it plays a whole assault on Bloodtusk Hold: the five heroes with their full minds and their platoons,
// the bot playing, against the garrison's 200 (`benchInput.ts`); `&spike=1` plays phase 0's engine spike.
//
//   ?bench=assault              Near, following the fight
//   &spike=1                    phase 0's engine spike instead of the hold
//   &lod=mid | far              start at Mid or Far
//   &speed=2                    the battle at double speed (the sim runs twice a tick's work a frame-second)
//   &siege=1 &skip=1500 &at=u,v &zoom=0.6   the siege works; the first ticks played at once; the camera held on a tile at a zoom
//   &seed=7                     the first fight's seed

import { Application } from 'pixi.js';
import { startSpike, stepSpike, SPIKE_PLATOONS, SPIKE_TROOPS, type FieldEvent } from './sim/assault/spike';
import { startAssault, stepAssault } from './sim/assault/assault';
import { AssaultSim } from './assaultSim';
import type { HoldEvent } from './sim/assault/holdTypes';
import { breakFort } from './sim/assault/forts';
import { breachWall, callVolley, wallStretch } from './sim/assault/works';
import { acceptDuel } from './sim/assault/gateDuel';
import { openGateDuelCard } from './gateDuelView';
import { benchInput } from './sim/assault/benchInput';
import { TICK_MS, type Battle, type BattleEvent } from './sim/battle';
import { UNITS } from './sim/units';
import { BUCKET } from './sim/assault/field';
import { FieldView, FIELD_FOG, fieldGrade, loadFieldArt, MID_AT, NEAR_AT, type Detail } from './render/fieldView';
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
  /** The longest a frame spent baking chunks so far (ms). */
  bakeWorst?: number;
  campWorkers?: number;
  campSmoke?: number;
  /** With the worker: each batch's copy on the page (mean, p95, ms), and whether the worker runs it. */
  copyMean?: number;
  copyP95?: number;
  worker?: boolean;
  detail: Detail;
  zoom: number;
  fighters: number;
  chunks: number;
  /** The chunks in view, baked or not (all of them drawn once baking catches up). */
  wanted: number;
  alive: number;
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const p95 = (xs: readonly number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
};

/** The battle's events as the field's renderer reads them (a blow, a hit, a breach). */
function fieldEvents(b: Battle, ev: readonly BattleEvent[], hold: readonly HoldEvent[] = b.field?.hold?.events ?? []): FieldEvent[] {
  const out: FieldEvent[] = [];
  for (const e of ev) {
    if (e.kind === 'swing' && e.to >= 0) out.push({ kind: 'blow', by: e.by, to: e.to, shot: !!UNITS[b.field!.byId[e.by]?.def ?? '']?.shot });
    else if (e.kind === 'hit') out.push({ kind: 'hit', to: e.to, dmg: e.dmg });
  }
  for (const e of hold) if (e.kind === 'breach' || e.kind === 'open') out.push({ kind: 'breach', tiles: e.tiles });
  return out;
}

export async function startAssaultBench(): Promise<void> {
  const query = new URLSearchParams(location.search);
  const speed = Math.max(1, Math.min(4, Number(query.get('speed')) || 1));
  let seed = Number(query.get('seed')) || 1;
  const spike = query.get('spike') === '1';
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
  await app.init({ resizeTo: host, background: FIELD_FOG, antialias: false, autoStart: false, autoDensity: true, resolution: Math.min(3, devicePixelRatio || 1) });
  host.insertBefore(app.canvas, hud);
  app.canvas.style.cssText = 'display:block;width:100%;height:100%;';
  // (the day's light over the field, under the buttons)
  fieldGrade(host, query.get('army') ?? 'orcs');
  hud.textContent = 'Loading the field…';
  const sheets = new Set<string>(['hk_orc_grunt', 'hk_orc_archer', 'hk_orc_brute', 'hk_orc_warlord', 'wolf_black']);
  for (const p of SPIKE_PLATOONS) {
    sheets.add(UNITS[p.hero].sheet);
    sheets.add(SPIKE_TROOPS[p.troop].sheet);
  }
  // (the hold's fighters: every sheet its first assault stands)
  // (`&army=undead`: the Barrow Necropolis instead of Bloodtusk Hold, at its own level, `&level=`)
  const army = query.get('army') ?? 'orcs';
  const level = Number(query.get('level')) || 55;
  if (!spike) for (const x of startAssault(benchInput(1, level, army)).units) sheets.add(UNITS[x.def].sheet);
  await Promise.all([loadSomeSheets([...sheets]), loadFieldArt(army), document.fonts?.load('700 16px "Alegreya Sans"').catch(() => {})]);

  let b: Battle;
  let view: FieldView;
  // (the hold's fight runs in a Web Worker unless `&worker=0`, as the game's does; the spike runs here)
  let sim: AssaultSim | null = null;
  const useWorker = query.get('worker') !== '0';
  let run = 0;
  const simMs: number[] = [];
  const copyMs: number[] = [];
  const frameMs: number[] = [];
  const workMs: number[] = [];
  let simWorst = 0;
  let bakeWorst = 0;
  // (the blows of the last three seconds, by bucket: the camera's "fiercest fight")
  let heat: { t: number; k: number }[] = [];
  const cam = { x: 0, y: 0, zoom: Number(query.get('zoom')) || ZOOM[(query.get('lod') as Detail) in ZOOM ? (query.get('lod') as Detail) : 'near'] };
  let follow = true;
  let ready = false;
  const begin = async () => {
    ready = false;
    view?.destroy();
    sim?.destroy();
    sim = null;
    // (`&siege=1`: the siege works of phase 1b, the ram with the knight and ladders with the samurai and the archer, the bot's Tactical style)
    const input = query.get('siege') ? { ...benchInput(seed, level, army), siege: { ram: 'knight', ladders: ['samurai', 'archer'] }, tactical: true } : benchInput(seed, level, army);
    // (`&skip=n`: the first n ticks played at once, for a look at a fight under way, before the worker takes it)
    const skip = Number(query.get('skip')) || 0;
    if (spike) b = startSpike(seed);
    else if (skip) {
      const first = startAssault(input);
      for (let i = skip; i > 0 && first.phase === 'fight'; i--) stepAssault(first);
      sim = await AssaultSim.start({ resume: first, worker: useWorker });
      b = sim.b;
    } else {
      sim = await AssaultSim.start({ input, worker: useWorker });
      b = sim.b;
    }
    view = new FieldView(b, app.renderer);
    app.stage.removeChildren();
    app.stage.addChild(view.root);
    run++;
    heat = [];
    // (the camera starts over our Landing, or over `&at=u,v` and stays there: the screenshots' views)
    const at = query.get('at')?.split(',').map(Number);
    const [x, y] = at?.length === 2 ? rawAt(at[0], at[1], 3) : rawAt(90, 90, 1);
    if (at?.length === 2) follow = false;
    cam.x = x;
    cam.y = y;
    ready = true;
  };
  await begin();

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
    void begin();
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
  const stats: BenchStats = { seed, run, ticks: 0, simMean: 0, simP95: 0, simWorst: 0, fps: 0, frameMean: 0, frameP95: 0, workMean: 0, detail: 'near', zoom: cam.zoom, fighters: 0, chunks: 0, wanted: 0, alive: 0 };
  (window as unknown as { __bench: BenchStats }).__bench = stats;
  // (for the screenshots of the structures' states: strike one to a share of its hp, or break it, as a blow would; with `&worker=0`, so it
  //  is the battle itself that is struck, not the page's copy of the worker's)
  (window as unknown as { __benchStrike: (id: string, share: number) => void }).__benchStrike = (id, share) => {
    const h = b.field?.hold;
    const i = h?.forts.findIndex((x) => x.spec.id === id) ?? -1;
    if (!h || i < 0) return;
    const f = h.forts[i];
    if (share > 0) f.hp = Math.round(f.maxHp * share);
    else {
      breakFort(b, h, i);
      view.breach(h.events.filter((e) => e.kind === 'breach').flatMap((e) => (e.kind === 'breach' ? e.tiles : [])));
    }
  };

  // (the same for the structure of a kind nearest a tile, for the ring wall's segments, whose ids name their face and tile)
  (window as unknown as { __benchStrikeNear: (kind: string, u: number, v: number, share: number) => void }).__benchStrikeNear = (kind, u, v, share) => {
    const h = b.field?.hold;
    if (!h) return;
    const w = b.board.w;
    const dist = (t: number) => Math.abs((t % w) - u) + Math.abs(Math.floor(t / w) - v);
    const near = h.forts.filter((f) => f.spec.kind === kind).sort((x, y) => Math.min(...x.spec.tiles.map(dist)) - Math.min(...y.spec.tiles.map(dist)))[0];
    if (near) (window as unknown as { __benchStrike: (id: string, share: number) => void }).__benchStrike(near.spec.id, share);
  };

  /** The heavy works' looks (phase 2): a volley's or a keg's blast, a barrel lifted from its tile. */
  const heavy = (hold: readonly HoldEvent[]) => {
    const w = b.board.w;
    for (const e of hold)
      if (e.kind === 'volley') view.blast(e.tiles.reduce((x, i) => x + (i % w), 0) / e.tiles.length, e.tiles.reduce((x, i) => x + Math.floor(i / w), 0) / e.tiles.length, true);
      else if (e.kind === 'keg' && e.state === 'carried') view.retile([e.tile]);
      else if (e.kind === 'keg' && e.state === 'boom') view.blast(e.tile % w, Math.floor(e.tile / w), true);
  };
  // (for the screenshots of the heavy works, with `&worker=0`: a volley called on a tile, a stretch of the stone wall broken, a keg set)
  (window as unknown as { __benchWorks: (what: string, u: number, v: number) => void }).__benchWorks = (what, u, v) => {
    const h = b.field?.hold;
    if (!h) return;
    const w = b.board.w;
    if (what === 'volley') {
      h.siege.trebReady = 0;
      callVolley(b, u, v);
    } else if (what === 'wall') {
      const st = wallStretch(b, v * w + u);
      if (st) {
        breachWall(b, h, st.tiles);
        view.breach(st.tiles);
      }
    } else if (what === 'keg') h.siege.keg = { platoon: 0, at: v * w + u, target: v * w + u, lit: b.t + 60_000 };
    else if (what === 'carry') h.siege.keg = { platoon: 0 };
    else if (what === 'card') {
      // (the challenge's card, over the bench, for its screenshots: a stand-in Vain captain)
      const heroes = h.platoons.map((p) => b.field!.byId[p.heroId]).map((x) => ({ id: x.id, kind: x.def }));
      openGateDuelCard({ id: 0, base: 'orcBrute', name: 'Grashnak', epithet: 'the Vain', rank: 'captain', might: 4, scars: 1, traits: [], weak: ['vain'] }, heroes, () => {});
    } else if (what === 'duel') {
      // (the Iron Gate's captain calls out the first hero, whatever his weaknesses, and the ring is staked)
      const post = h.posts.findIndex((p) => p.def.id === 'ironGate');
      h.duel = { post, captain: b.field!.groups[h.posts[post].group].leader, state: 'offered', until: b.t + 20_000 };
      acceptDuel(b, h.platoons[u]?.heroId ?? h.platoons[0].heroId);
    }
  };

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
    if (!ready) return;
    if (b.phase === 'fight') {
      acc += dt * speed;
      let n = 0;
      // (the ticks the time asks for: the spike stepped here; the hold's in the worker, or here with `&worker=0`, each tick timed where it ran)
      const batches: FieldEvent[][] = [];
      if (spike)
        while (acc - n * TICK_MS >= TICK_MS && n < 8) {
          const a = performance.now();
          batches.push(stepSpike(b));
          const ms = performance.now() - a;
          simMs.push(ms);
          if (simMs.length > TICK_WINDOW) simMs.shift();
          simWorst = Math.max(simWorst, ms);
          n++;
        }
      else if (sim) {
        for (const tk of sim.pump(Math.min(8, Math.floor(acc / TICK_MS)))) {
          batches.push(fieldEvents(b, tk.ev, tk.hold));
          heavy(tk.hold);
        }
        for (const ms of sim.copyMs.splice(0)) {
          copyMs.push(ms);
          if (copyMs.length > TICK_WINDOW) copyMs.shift();
        }
        for (const ms of sim.ms.splice(0)) {
          simMs.push(ms);
          if (simMs.length > TICK_WINDOW) simMs.shift();
          simWorst = Math.max(simWorst, ms);
        }
      }
      n = 0;
      for (const ev of batches) {
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
      if (acc > TICK_MS * 16) acc = TICK_MS * 8;
    } else if (!endedAt) endedAt = now;
    else if (now - endedAt > 4000) {
      endedAt = 0;
      seed++;
      void begin();
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
    // (the screen in CSS pixels: `app.screen`, which the device pixel ratio does not touch; the focus is drawn halfway between the
    // readout and the buttons)
    const hostTop = host.getBoundingClientRect().top;
    const play = { top: hud.getBoundingClientRect().bottom - hostTop, bottom: bar.getBoundingClientRect().top - hostTop };
    view.update(cam, app.screen.width, app.screen.height, b.t + Math.min(acc, TICK_MS), events, play);
    bakeWorst = Math.max(bakeWorst, view.drawn.bakeMs);
    app.render();
    workMs.push(performance.now() - w0);
    if (workMs.length > FRAME_WINDOW) workMs.shift();
    // the readout, four times a second
    if (now - shown > 250) {
      shown = now;
      const alive = b.units.filter((x) => x.alive);
      Object.assign(stats, {
        seed, run, ticks: b.field!.stats.ticks, simMean: mean(simMs), simP95: p95(simMs), simWorst, fps, frameMean: mean(frameMs), frameP95: p95(frameMs), workMean: mean(workMs), bakeWorst, copyMean: mean(copyMs), copyP95: p95(copyMs), worker: !!sim?.inWorker,
        campWorkers: view.drawn.campWorkers, campSmoke: view.drawn.campSmoke, detail: view.detail, zoom: cam.zoom, fighters: view.drawn.fighters, chunks: view.drawn.chunks, wanted: view.wanted.length, alive: alive.length,
      });
      const ours = alive.filter((x) => x.side === 'hero').length;
      const clock = `${Math.floor(b.t / 60000)}:${String(Math.floor((b.t % 60000) / 1000)).padStart(2, '0')}`;
      hud.textContent =
        `Assault bench · fight ${run} (seed ${seed}) · ${clock}${speed > 1 ? ` · x${speed}` : ''}${b.phase !== 'fight' ? ` · ${b.phase === 'won' ? 'won' : 'over'}` : ''}\n` +
        `Sim${sim?.inWorker ? ' (worker)' : ''}: ${stats.simMean.toFixed(2)} ms a tick (p95 ${stats.simP95.toFixed(2)}, worst ${simWorst.toFixed(1)})  budget 3 ms\n` +
        (sim?.inWorker ? `Page's copy: ${(stats.copyMean ?? 0).toFixed(2)} ms a batch (p95 ${(stats.copyP95 ?? 0).toFixed(2)})\n` : '') +
        `Frames: ${fps.toFixed(0)} fps · ${stats.frameMean.toFixed(1)} ms (p95 ${stats.frameP95.toFixed(1)}) · work ${stats.workMean.toFixed(1)} ms · bake worst ${bakeWorst.toFixed(1)} ms\n` +
        `${view.detail[0].toUpperCase()}${view.detail.slice(1)} (zoom ${cam.zoom.toFixed(2)}; Near ≥ ${NEAR_AT}, Far < ${MID_AT}) · ${view.drawn.fighters} drawn · ${view.drawn.chunks} chunks\n` +
        `Ours ${ours}/55 · theirs ${alive.length - ours}/200`;
    }
  };
  requestAnimationFrame(frame);
}
