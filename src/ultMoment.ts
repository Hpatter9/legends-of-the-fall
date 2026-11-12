// The ultimate's moment on the page (ULT-CUTIN, docs/notes/battle-hud.md; the rules and timings are `ultMomentRules.ts`). The owner's ask: an
// ultimate should feel special. In full (the default setting), as it fires the fight is held: a slash crosses the screen carrying the hero's
// painted art and the ultimate's name pops up, and the rest of the screen darkens but for what the ultimate touches, where its effect
// plays. Then the dim fades and the fight resumes: at once for a lingering ultimate, so its field or aura or summons work live; after the
// effects have played for an instant one. A tap skips. Short (the setting off): no hold and no dim; the hero rows' cut-in banner shows the
// hero's face instead (`fightHud.ts`). With reduced motion the slash does not sweep: the art and the name fade in and out, held still.
//
// ULT-EPIC (docs/notes/ult-epic.md, `ultEpicRules.ts`): the payoff. The band moves (speed lines rushing through it, the art drifting one way
// while the band slides the other, the name stamped in with a glow), power gathers on the hero under it, the camera leans in (the page's,
// `focus`), and a sting sounds. As the blow lands: a freeze of 0.15 s, a huge burst of the element on each one struck (the effects of the
// ultimate itself drawn twice the size by `fx.ts` while its moment plays: `Fx.epic`), a coloured flash eased in and out, a heavy sting, a
// shake as the freeze lets go, and the dim eased off over the whole of what it touched. The painted kit (session `u-ultimate`) is used
// when its atlas is there; until then the pack's and the painted spells' bursts stand in, and the band's lines are drawn in CSS.
//
// It never changes the battle: the page's fight loop asks `holdsBattle` before stepping it (and `runsEffects` before stepping the effects).

import { type Battle, type BattleEvent, type Unit } from './sim/battle';
import { keyOf, ultimateOf } from './sim/abilities';
import { heroName } from './sim/heroNames';
import { GLOW, skillElement } from './render/fxRules';
import type { Fx } from './render/fx';
import { duck, hushMoment, playAll } from './render/sound';
import { spellImage } from './render/spellArt';
import { spellPart } from './render/spellLooks';
import { settings } from './settings';
import { whichCast } from './fightHudRules';
import { ULT_MOMENT, UltQueue, ultCues, ultShape, type UltMoment, type UltPhase } from './ultMomentRules';
import { burstSpots, KIT, KIT_SESSION, litPools, ultLean, ultTargets, type Pt, type UltTargets } from './ultEpicRules';
import { hasShowcase, planShow, readCast, wantsShow, type ShowPlan } from './ultShowRules';
import { UltShow } from './ultShow';
import { stagesFor } from './ultStageRules';
import { mythicCut, mythicPainting } from './mythicCutRules';
import { showArtUrl } from './render/showArt';
import { heroEpithet } from './sim/heroNames';
import type { UnitSprite } from './render/unitView';
import { depth } from './render/iso';
import type { Spot, View } from './render/cameraRules';
import { camAt, camPlan, strikeArt, type CamPlan, type Room } from './ultCameraRules';

export interface UltMomentOpts {
  /** The middle of a fighter's sprite on the page, for the pool of light; null when it cannot be told. */
  anchor: (id: number) => { x: number; y: number } | null;
  /** The hero's painted art for the slash (its awakened art once awakened, else its portrait). */
  art: (u: Unit) => string;
  /** A tile's ground on the page (client px), for the light over an area; null when it cannot be told. */
  tile?: (u: number, v: number) => { x: number; y: number } | null;
  /** The fight's effects: the moment's gathering and bursts are drawn there, and it is told which casters' effects are the ultimate's. */
  fx?: Fx;
  /** ULT-SHOW: the fighters' sprites and a tile's ground in the world, for the showcase to stage them (none: no showcases). */
  sprite?: (id: number) => UnitSprite | undefined;
  world?: (u: number, v: number) => [number, number] | null;
  /** ULT-SHOW: how many full moments of a hero kind's ultimate the player has seen (the save's count), and one more seen. */
  seen?: (kind: string) => number;
  saw?: (kind: string) => void;
  /** A point in the world on the page (client px): a showcase's props' light. */
  toClient?: (x: number, y: number) => { x: number; y: number } | null;
  /** ULT-CAMERA: the room the page's camera frames in now and the zoom its follow holds (none: this screen's camera is its own, and
   *  the moment only leans in on the caster as before). */
  room?: () => { room: Room; held: number } | null;
}

/** Whether the art a slash was given is a hero's awakened painting (a Mythic's frame then shows its awakened one). */
const awakenedArt = (url: string): number => (url.startsWith('heroes/awakened-') ? 1 : 0);

/** A hero's painted art: the awakened art once awakened, else the portrait (every one of the 45 has both, cached for offline play). */
export const heroArtUrl = (kind: string, awakened: number): string => (awakened > 0 ? `heroes/awakened-${kind}.webp` : `heroes/${kind}-portrait.webp`);

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const NONE: UltTargets = { struck: [], helped: [], tiles: [] };
/** The dim's canvas is drawn at a share of the screen's size (it is all soft gradients). */
const DIM_RES = 0.5;
/** The band leaves this long before the opening ends (its exit takes a little less), so it is gone as the blow lands. */
const BAND_OUT_MS = 260;

export class UltMoments {
  readonly queue = new UltQueue();
  private layer: HTMLElement;
  private dim: HTMLCanvasElement;
  private shown = 0;
  private struckSeen = 0;
  private lastPhase: UltPhase = 'idle';
  /** ULT-EPIC 2: the further bursts seen, the stage drawn, and whether the music is ducked for a moment. */
  private echoSeen = 0;
  private lastStage = '';
  private ducked = false;
  /** ULT-EPIC 2: where each moment's caster stood before its cast (a dash or a leap has already moved it in the sim): it is seen to
   *  gather there through the wind-up; and the fighter posed so now. */
  private starts = new WeakMap<UltMoment, { u: number; v: number }>();
  private gathering: number | null = null;
  /** The second gathering of a long wind-up, still to come. */
  private regather: { unit: number; at: number; ms: number } | null = null;
  private warmed = new Set<string>();
  /** The pictures kept loaded (a browser may drop an image nobody holds). */
  private keep: HTMLImageElement[] = [];
  /** The painted kit's band canvas, while a slash with it is up, and the ms since the slash began (its lines' clock). */
  private kitCanvas: HTMLCanvasElement | null = null;
  private slashT = 0;
  private reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** ULT-SHOW: each long moment's showcase plan, and the showcase on the page. */
  private plans = new WeakMap<UltMoment, ShowPlan>();
  private show: UltShow | null;

  constructor(private opts: UltMomentOpts) {
    this.show = opts.sprite && opts.world ? new UltShow({ sprite: opts.sprite, world: opts.world, fx: opts.fx }) : null;
    this.layer = document.createElement('div');
    this.layer.className = 'umLayer';
    this.layer.hidden = true;
    this.dim = document.createElement('canvas');
    this.dim.className = 'umDim';
    this.layer.append(this.dim);
    // (a tap skips the moment playing)
    this.layer.addEventListener('click', (e) => {
      e.stopPropagation();
      // (the build-up or the slow beat still ringing fades with it: a skipped moment is not heard on)
      if (this.queue.current) hushMoment();
      this.queue.skip();
    });
    document.body.append(this.layer);
    if (typeof matchMedia === 'function') matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
  }

  /** Load the placed heroes' art before the fight, so the slash never waits on a picture. */
  warm(b: Battle): void {
    for (const u of b.units) {
      if (u.side !== 'hero' || !ultimateOf(u)) continue;
      // (a Mythic's cut-in shows its whole painting and its sigil as well)
      const cut = mythicCut(u.def);
      for (const url of [this.opts.art(u), ...(cut ? [mythicPainting(u.def, awakenedArt(this.opts.art(u))), showArtUrl(cut.sigil)] : [])]) {
        if (this.warmed.has(url)) continue;
        this.warmed.add(url);
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        this.keep.push(img);
      }
    }
  }

  /** A tick's events: each hero ultimate that fired becomes a moment (full setting only); true when the battle should stop stepping now.
   *  It also tells the effects whose events are an ultimate's (drawn at its scale), and sees a delayed ultimate's salvo land. */
  note(b: Battle, events: readonly BattleEvent[], born: readonly Unit[], before?: ReadonlyMap<number, { u: number; v: number }>): boolean {
    const epic = new Set<number>();
    for (const e of events) {
      if (e.kind !== 'skill') continue;
      const u = b.units.find((x) => x.id === e.by);
      if (!u || u.side !== 'hero' || whichCast(u, e.name) !== 'ult') continue;
      const ult = ultimateOf(u)!;
      const { shape, ms } = ultShape(ult, u.id, events, born);
      const m: UltMoment = { unit: u.id, kind: u.def, name: ult.name, shape, ms, el: skillElement(keyOf(ult)), targets: ultTargets(events, u.id) };
      // (ULT-EPIC 3: every use fired by hand plays the showcase; every full moment of a hero with a showcase is still counted)
      if (this.show && hasShowcase(u.def)) {
        const s = settings();
        if (wantsShow(u.def, { full: true, short: s.ultShort })) {
          const tileOf = (id: number) => b.units.find((x) => x.id === id);
          // (where a fighter the cast moved stood before it: the page's note of the tick before, else its step begun on this tick)
          const originOf = (id: number) => {
            const was = before?.get(id);
            if (was) return was;
            const st = b.units.find((x) => x.id === id)?.step;
            return st && st.at >= b.t - 100 ? { u: st.u, v: st.v } : undefined;
          };
          // (the foes it turned on itself without a blow: taunted round to face it)
          const touched = b.units.filter((x) => x.alive && x.side !== u.side && x.taunt?.to === u.id).map((x) => x.id);
          // (its allies standing: those its blessing may reach)
          const allies = b.units.filter((x) => x.alive && x.side === u.side && x.id !== u.id).map((x) => x.id);
          const plan = planShow(u.def, readCast(u, events, born, tileOf, originOf, touched, allies));
          if (plan) {
            m.show = plan.ms;
            this.plans.set(m, plan);
            // (the light falls on everything the showcase stages: the wolves called up, each tile a hop lands on)
            const t = m.targets ?? { struck: [], helped: [], tiles: [] };
            m.targets = { struck: t.struck, helped: [...t.helped, ...plan.cast.born.map((w) => w.id)], tiles: [...t.tiles, ...plan.cast.hops.map((h) => h.to), plan.cast.start] };
          }
        }
        this.opts.saw?.(u.def);
      }
      // (ULT-EPIC 2: this use's three stages, 4 to 6 s in all: a showcase and a salvo's wait are inside its strike)
      m.stages = stagesFor(u.def, { show: m.show, wait: shape === 'delayed' ? ms : 0 });
      this.starts.set(m, before?.get(u.id) ?? { u: u.u, v: u.v });
      // (a showcase with a salvo to land after it plays a little quicker, so both fit: `showAt` reads its plan at that pace)
      if (m.show) m.show = m.stages.show ?? m.show;
      this.queue.push(m);
      epic.add(u.id);
    }
    // (a salvo in the air under the dim: its blows are the ultimate's too, and the first of them is its impact)
    const m = this.queue.current;
    if (m && this.queue.phase === 'settle') {
      epic.add(m.unit);
      const t = ultTargets(events, m.unit);
      if (t.struck.length) {
        m.landing = t;
        if (m.targets) m.targets = { ...m.targets, struck: [...new Set([...m.targets.struck, ...t.struck])] };
        this.queue.land();
      }
    }
    if (this.opts.fx) this.opts.fx.epic = epic;
    return this.queue.holdsBattle;
  }

  /** Where the page's camera should lean in now (the hero, through the opening), and how far over the view it holds; null: as it was. */
  get focus(): { unit: number; zoom: number; under?: number } | { view: View; ms: number } | null {
    const q = this.queue;
    // (ULT-CAMERA: once the casting has been seen the camera leaves for the effect, frames the whole of it for the strike and holds it
    // through the aftermath; a moment skipped before its blow goes straight back to the fight)
    const cam = q.current && !(q.phase === 'fade' && q.since === null) ? this.camOf(q.current) : null;
    const shot = cam ? camAt(cam, q.clock, q.since) : null;
    if (shot?.view) return { view: shot.view, ms: shot.ease };
    // (ULT-EPIC 2: the caster is framed just under the band, so the hero is seen gathering rather than hidden behind its own name)
    const band = this.layer.querySelector('.umSlash:not(.out)')?.getBoundingClientRect();
    const under = band ? Math.round(band.bottom + 44) : undefined;
    // (ULT-SHOW: through a showcase the camera follows the caster, leaning in a little; a salvo's showcase lets go once the staff is raised)
    const plan = q.current && this.plans.get(q.current);
    const t = this.showAt(plan);
    if (q.current && plan && t !== null) {
      if (t > plan.followMs) return null;
      const zoom = this.calm() ? 1 : plan.zoom;
      return zoom === 1 ? null : { unit: q.current.unit, zoom };
    }
    if (!q.current || q.phase !== 'open') return null;
    // (BATTLE-POLISH: the lean builds through the opening as the power gathers)
    const zoom = ultLean(q.openT, this.calm());
    return zoom === 1 ? null : { unit: q.current.unit, zoom, under };
  }

  /** ULT-CAMERA (`ultCameraRules.ts`): a moment's camera, laid out once its caster is posed (and again when a salvo's blows show what it
   *  really struck): where everything it touches stands, the strike sheet's box on each spot it bursts on, and when the blow is due. None
   *  with reduced motion (no camera travel at all), or on a screen whose camera is its own. */
  private cams = new WeakMap<UltMoment, { plan: CamPlan | null; landing: UltTargets | undefined }>();
  private camOf(m: UltMoment): CamPlan | null {
    const had = this.cams.get(m);
    if (had && had.landing === m.landing) return had.plan;
    const room = this.reduced ? null : this.opts.room?.();
    const me = this.opts.sprite?.(m.unit);
    const st = m.stages;
    let plan: CamPlan | null = null;
    if (room && me && st) {
      const t = m.targets ?? NONE;
      const land = m.landing ?? NONE;
      const of = (id: number): Spot | null => {
        const s = this.opts.sprite?.(id);
        return s ? { x: s.x, y: s.y, tall: s.tall } : null;
      };
      const tile = (p: { u: number; v: number }): Spot | null => {
        const w = this.opts.world?.(p.u, p.v);
        return w ? { x: w[0], y: w[1], tall: 0 } : null;
      };
      const real = (x: Spot | null): x is Spot => !!x;
      const spots = [...new Set([...t.struck, ...t.helped, ...land.struck])].map(of).filter(real).concat(t.tiles.map(tile).filter(real));
      const bursts = burstSpots(m.landing ?? t, m.unit, settings().saver).map((b) => ('unit' in b ? of(b.unit) : tile(b))).filter(real);
      const show = this.plans.get(m);
      // (a showcase lets go of its caster part-way: a staff raised, a burrower sunk; the camera goes on from there)
      const until = show && Number.isFinite(show.followMs) && m.show ? st.windup.ms + (show.followMs * m.show) / show.ms : undefined;
      const caster: Spot = { x: me.x, y: me.y, tall: me.tall };
      plan = camPlan({ caster, from: { cx: me.x, cy: me.y - me.tall * 0.5 }, spots, bursts, art: strikeArt(m.kind), room: room.room, held: room.held, blowAt: st.windup.ms + (m.show ?? 0), endAt: st.total, followUntil: until });
      // (the travel was timed when the moment began: what a salvo really struck changes where the strike is framed, not when)
      if (had?.plan && plan) plan = { ...plan, leaveAt: had.plan.leaveAt, travelMs: had.plan.travelMs };
    }
    this.cams.set(m, { plan, landing: m.landing });
    return plan;
  }

  /** ULT-EPIC 2: ms into the showcase's own plan (null: none plays): the queue's clock, at the pace this use plays it. */
  private showAt(plan: ShowPlan | null | undefined): number | null {
    const q = this.queue;
    const t = q.showT;
    if (t === null || !plan || !q.current?.show) return t;
    return (t * plan.ms) / q.current.show;
  }

  private calm(): boolean {
    return this.opts.fx ? this.opts.fx.calm() : this.reduced;
  }

  /** Each frame: move the moment on by `dt` real ms (unless `paused`: a sheet or a scene holds everything) and draw it. */
  frame(b: Battle, dt: number, paused = false): void {
    const q = this.queue;
    const fx = this.opts.fx;
    const step = Math.min(dt, 250);
    q.calm = this.calm();
    if (!q.current) {
      // (the moment's bursts play out after it; no caster's effects are the ultimate's any more)
      if (fx?.epic.size) fx.epic = new Set();
      if (!paused) fx?.stepMoment(step);
      if (!this.layer.hidden) this.hide();
      return;
    }
    if (!paused) q.step(step);
    // (the moment's own effects stand still through the freeze on the blow)
    // (BATTLE-POLISH: and move slowly through the slow beat after it)
    if (!paused && q.stopLeft <= 0) fx?.stepMoment(step * q.rate);
    const m = q.current;
    if (!m) return this.hide();
    const u = b.units.find((x) => x.id === m.unit);
    this.layer.hidden = false;
    // (the layer takes taps (to skip) all through the moment, SWEEP-1110: the settle and the fade too, while the battle runs again; once
    // the moment is over they reach the page)
    this.layer.classList.add('live');
    const windup = m.stages?.windup.ms ?? ULT_MOMENT.OPEN_MS;
    if (q.phase === 'open' && this.shown !== q.seq && u) {
      this.slash(u, m.name, windup);
      // (the power gathers where the hero stood as it cast, which is where it is posed through the wind-up)
      this.gather(m);
      // (ULT-EPIC 2: the power gathers twice through a long wind-up, the second time as the band leaves, so the hero is never left standing)
      const half = windup > ULT_MOMENT.OPEN_MS + 100 ? Math.round(windup * 0.55) : windup;
      fx?.ultGather(u.id, m.el ?? 'light', half);
      this.regather = half < windup ? { unit: u.id, at: half, ms: windup - half } : null;
      playAll(ultCues('open', q.calm, windup));
      // (the music stands back for the whole show)
      if (!this.ducked) duck(true, 'ult');
      this.ducked = true;
    }
    if (this.regather && q.phase === 'open' && windup - q.left >= this.regather.at) {
      fx?.ultGather(this.regather.unit, m.el ?? 'light', this.regather.ms);
      this.regather = null;
    }
    if (q.strikes !== this.struckSeen) {
      this.struckSeen = q.strikes;
      this.impact(b, m);
    }
    // (ULT-EPIC 2: a flurry's or a storm's further bursts, each on the next of what it struck)
    if (q.echoes !== this.echoSeen) {
      this.echo(b, m, q.echoes - 1);
      this.echoSeen = q.echoes;
    }
    // (the stage playing, for the styles: the tint builds through the wind-up, the afterglow lingers through the aftermath)
    const stage = q.stageNow;
    if (stage && stage.name !== this.lastStage) {
      this.lastStage = stage.name;
      this.layer.dataset.stage = stage.name;
      // (for as long as the fade really is: a tap's skip makes it a short one)
      if (stage.name === 'aftermath' && q.since !== null && m.stages) this.aftermath(b, m, Math.max(300, q.left));
    }
    // (the band slashes away just before the blow, so the blow lands on an open board, ULT-EPIC)
    if ((q.phase === 'open' && q.left <= BAND_OUT_MS) || (q.phase !== 'open' && this.lastPhase === 'open')) this.layer.querySelector('.umSlash:not(.out)')?.classList.add('out');
    this.lastPhase = q.phase;
    this.drawDim(m, q.dim);
    if (!paused) this.slashT += step;
    if (this.kitCanvas) this.drawKit(m);
    this.pose(true);
  }

  /** ULT-SHOW: the showcase's stages (its first poses through the opening, then as it plays; its beats only while it plays), dropped as it
   *  ends. The page calls `stage` again just before it draws the sprites, so a fighter a cast called up this frame is staged too. */
  private pose(beats: boolean): void {
    const q = this.queue;
    const plan = q.current && this.plans.get(q.current);
    const t = q.phase === 'open' ? 0 : this.showAt(plan);
    if (this.show && plan && t !== null) {
      if (this.show.plan !== plan) this.show.begin(plan);
      this.show.frame(t, beats && q.phase === 'show');
      this.opts.fx?.hush(true);
    } else if (this.show?.plan) {
      this.show.end();
      this.opts.fx?.hush(false);
    }
    this.gather(q.current);
  }

  stage(): void {
    this.pose(false);
  }

  /** ULT-EPIC 2: with no showcase to stage it, the caster is still seen to gather through the wind-up: stood where it was as it cast (the
   *  sim has already carried a dash or a leap through), drawing back for its blow, turned to what it will strike; let go as the blow
   *  lands, when it is drawn as the sim says again. The cast's own effects (its numbers, its cuts) are kept back until then too. */
  private gather(m: UltMoment | null): void {
    const q = this.queue;
    const on = !!m && q.phase === 'open' && !!m.stages && !this.plans.get(m);
    const s = on ? this.opts.sprite?.(m!.unit) : undefined;
    const at = on ? this.starts.get(m!) : undefined;
    const w = at && this.opts.world?.(at.u, at.v);
    if (s && at && w) {
      const foe = (m!.targets?.struck ?? []).map((id) => this.opts.sprite?.(id)).find((x) => !!x && Math.abs(x.x - w[0]) > 1);
      const face: 1 | -1 = foe ? (foe.x > w[0] ? 1 : -1) : (s.stage?.face ?? 1);
      s.stage = { x: w[0], y: w[1], z: depth(at.u, at.v) + 5, alpha: 1, row: 'attack', p: this.calm() ? 0.15 : 0.05 + 0.3 * q.openT, face };
      [s.x, s.y] = [w[0], w[1]];
      this.gathering = m!.unit;
      this.opts.fx?.hush(true);
    } else if (this.gathering !== null) {
      const was = this.opts.sprite?.(this.gathering);
      if (was) was.stage = null;
      this.gathering = null;
      // (a showcase beginning keeps the effects hidden for itself)
      if (!this.show?.plan) this.opts.fx?.hush(false);
    }
  }

  /** The blow lands: the bursts, a flash of the element's colour eased in and out round where it struck, and the heavy sting. */
  private impact(b: Battle, m: UltMoment): void {
    const el = m.el ?? 'light';
    const t = m.landing ?? m.targets ?? NONE;
    const spots = burstSpots(t, m.unit, settings().saver);
    this.opts.fx?.ultImpact(b, el, spots, 1, m.kind);
    playAll(ultCues('impact', this.queue.calm));
    const at = spots.map((s) => ('unit' in s ? this.opts.anchor(s.unit) : this.opts.tile?.(s.u, s.v) ?? null)).filter((p): p is Pt => !!p);
    const c = at.length ? { x: at.reduce((n, p) => n + p.x, 0) / at.length, y: at.reduce((n, p) => n + p.y, 0) / at.length } : { x: innerWidth / 2, y: innerHeight * 0.45 };
    this.layer.querySelector('.umFlash')?.remove();
    const flash = document.createElement('i');
    flash.className = 'umFlash';
    flash.style.setProperty('--el', hex(GLOW[el]));
    flash.style.setProperty('--x', `${Math.round(c.x)}px`);
    flash.style.setProperty('--y', `${Math.round(c.y)}px`);
    this.layer.append(flash);
    flash.addEventListener('animationend', () => flash.remove());
  }

  /** ULT-EPIC 2: a further burst of a flurry or a storm: on the next few of what it struck (or its tiles), a softer sting, a lighter
   *  shake. */
  private echo(b: Battle, m: UltMoment, i: number): void {
    const t = m.landing ?? m.targets ?? NONE;
    const all = burstSpots(t, m.unit, false);
    if (!all.length) return;
    const n = settings().saver ? 1 : Math.min(2, all.length);
    const spots = Array.from({ length: n }, (_, j) => all[(i * n + j + 1) % all.length]);
    this.opts.fx?.ultImpact(b, m.el ?? 'light', spots, 0.6, m.kind);
    playAll(ultCues('echo', this.queue.calm));
  }

  /** ULT-EPIC 2: the aftermath begins: the element's light lingers where the blow fell and fades over the stage, and dust drifts up
   *  from each spot. */
  private aftermath(b: Battle, m: UltMoment, ms: number): void {
    const el = m.el ?? 'light';
    const t = m.landing ?? m.targets ?? NONE;
    const spots = burstSpots(t, m.unit, settings().saver);
    this.opts.fx?.ultAfter(b, el, spots, ms, m.kind);
    const at = spots.map((s) => ('unit' in s ? this.opts.anchor(s.unit) : this.opts.tile?.(s.u, s.v) ?? null)).filter((p): p is Pt => !!p);
    const c = at.length ? { x: at.reduce((n, p) => n + p.x, 0) / at.length, y: at.reduce((n, p) => n + p.y, 0) / at.length } : { x: innerWidth / 2, y: innerHeight * 0.45 };
    this.layer.querySelector('.umAfter')?.remove();
    const glow = document.createElement('i');
    glow.className = 'umAfter';
    glow.style.setProperty('--el', hex(GLOW[el]));
    glow.style.setProperty('--x', `${Math.round(c.x)}px`);
    glow.style.setProperty('--y', `${Math.round(c.y)}px`);
    glow.style.setProperty('--ms', `${Math.round(ms)}ms`);
    this.layer.append(glow);
    glow.addEventListener('animationend', () => glow.remove());
  }

  /** The dim over the board, with the light left over the caster, everyone it touched and the tiles it worked on (and a softer light over
   *  all of them together), at `level` (0 to 1). */
  private drawDim(m: UltMoment, level: number): void {
    const cv = this.dim;
    cv.style.opacity = level.toFixed(3);
    if (level <= 0) return;
    const w = Math.max(1, Math.round(innerWidth * DIM_RES));
    const h = Math.max(1, Math.round(innerHeight * DIM_RES));
    if (cv.width !== w || cv.height !== h) [cv.width, cv.height] = [w, h];
    const g = cv.getContext('2d');
    if (!g) return;
    const t = m.targets ?? NONE;
    const pts = (ids: readonly number[]) => ids.map((id) => this.opts.anchor(id)).filter((p): p is Pt => !!p);
    const tiles = this.opts.tile ? t.tiles.map((x) => this.opts.tile!(x.u, x.v)).filter((p): p is Pt => !!p) : [];
    const { pools, hull } = litPools(this.opts.anchor(m.unit), [...pts(t.struck), ...pts(t.helped)], tiles);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgb(4 6 12 / 0.84)';
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    const k = DIM_RES;
    if (hull) {
      g.save();
      g.translate(hull.x * k, hull.y * k);
      g.scale(1, hull.ry / hull.rx);
      const r = hull.rx * k;
      const grad = g.createRadialGradient(0, 0, r * 0.35, 0, 0, r);
      grad.addColorStop(0, 'rgb(0 0 0 / 0.55)');
      grad.addColorStop(1, 'rgb(0 0 0 / 0)');
      g.fillStyle = grad;
      g.fillRect(-r, -r, r * 2, r * 2);
      g.restore();
    }
    // (ULT-SHOW: the light round a showcase's props while they are up: the ghost ship, the moon, the clock)
    const to = this.opts.toClient;
    if (this.show?.plan && to)
      for (const l of this.show.lights()) {
        const c = to(l.x, l.y);
        const e = to(l.x + l.r, l.y);
        if (c && e) pools.push({ x: c.x, y: c.y, r: Math.max(20, Math.abs(e.x - c.x)) });
      }
    // (BLENDER-FX: the light round an ultimate's rendered wind-up and strike while they play: they are drawn on the board under this dim,
    // so the dim is lifted over them and they show at full strength)
    if (to)
      for (const l of this.opts.fx?.momentLights() ?? []) {
        const c = to(l.x, l.y);
        const e = to(l.x + l.r, l.y);
        if (c && e) pools.push({ x: c.x, y: c.y, r: Math.max(20, Math.abs(e.x - c.x)) });
      }
    for (const p of pools) {
      const r = p.r * k;
      const grad = g.createRadialGradient(p.x * k, p.y * k, r * 0.45, p.x * k, p.y * k, r);
      grad.addColorStop(0, 'rgb(0 0 0 / 1)');
      grad.addColorStop(1, 'rgb(0 0 0 / 0)');
      g.fillStyle = grad;
      g.fillRect(p.x * k - r, p.y * k - r, r * 2, r * 2);
    }
  }

  private slash(u: Unit, name: string, windup: number): void {
    this.shown = this.queue.seq;
    this.slashT = 0;
    this.layer.querySelector('.umSlash')?.remove();
    this.layer.querySelector('.umAfter')?.remove();
    // (ULT-EPIC 2: the element's tint closes in round the screen's edge as the power gathers, and goes with the blow)
    this.layer.querySelector('.umTint')?.remove();
    const tint = document.createElement('i');
    tint.className = 'umTint';
    const ult0 = ultimateOf(u);
    tint.style.setProperty('--el', hex(GLOW[skillElement(ult0 ? keyOf(ult0) : '')]));
    tint.style.setProperty('--open', `${windup}ms`);
    this.layer.append(tint);
    const cut = mythicCut(u.def);
    if (cut) return this.legend(u, name, cut, windup);
    const ult = ultimateOf(u);
    const colour = hex(GLOW[skillElement(ult ? keyOf(ult) : '')]);
    const el = document.createElement('div');
    el.className = 'umSlash';
    el.style.setProperty('--el', colour);
    el.style.setProperty('--open', `${windup}ms`);
    const band = document.createElement('div');
    band.className = 'umBand';
    // (the speed lines rushing through the band: the painted kit's when its atlas has loaded, else CSS lines; and its glowing edges)
    const kit = spellImage(KIT_SESSION) && spellPart(KIT.speedlines) ? document.createElement('canvas') : null;
    this.kitCanvas = kit;
    if (kit) {
      kit.className = 'umKit';
      band.classList.add('kit');
      band.append(kit);
    } else {
      const lines = document.createElement('i');
      lines.className = 'umLines';
      band.append(lines);
    }
    const img = document.createElement('img');
    img.className = 'umArt';
    img.alt = '';
    img.decoding = 'async';
    img.src = this.opts.art(u);
    const words = document.createElement('div');
    words.className = 'umWords';
    const who = document.createElement('small');
    who.textContent = heroName(u.def);
    const title = document.createElement('b');
    title.textContent = name;
    words.append(who, title);
    band.append(img, words);
    const streak = document.createElement('i');
    streak.className = 'umStreak';
    const edges = document.createElement('i');
    edges.className = 'umEdges';
    el.append(streak, band, edges);
    this.layer.append(el);
  }

  /** A Mythic's own cut-in (`mythicCutRules.ts`): its whole painting in a gilded frame with its sigil turning behind, the word "Mythic", its
   *  name, title and motto and the ultimate's name beside it, coming in its own way. It leaves as the shared slash does (`.out`). */
  private legend(u: Unit, name: string, cut: NonNullable<ReturnType<typeof mythicCut>>, windup: number): void {
    this.kitCanvas = null;
    const el = document.createElement('div');
    el.className = `umSlash umMythic um-${cut.entry}`;
    el.dataset.myth = u.def;
    el.style.setProperty('--el', cut.glow);
    el.style.setProperty('--gild', cut.gild);
    el.style.setProperty('--wash', cut.wash);
    el.style.setProperty('--spin', String(cut.spin));
    el.style.setProperty('--open', `${windup}ms`);
    const veil = document.createElement('i');
    veil.className = 'umVeil';
    const sigil = document.createElement('img');
    sigil.className = 'umSigil';
    sigil.alt = '';
    sigil.decoding = 'async';
    sigil.src = showArtUrl(cut.sigil);
    const frame = document.createElement('div');
    frame.className = 'umFrame';
    const art = document.createElement('img');
    art.className = 'umPainting';
    art.alt = '';
    art.decoding = 'async';
    art.src = mythicPainting(u.def, awakenedArt(this.opts.art(u)));
    // (the portrait is the fallback: a painting that will not load leaves no empty frame)
    art.onerror = () => {
      art.onerror = null;
      art.src = this.opts.art(u);
    };
    frame.append(art);
    const words = document.createElement('div');
    words.className = 'umWords umLegend';
    const crest = document.createElement('em');
    crest.textContent = 'Mythic';
    const who = document.createElement('small');
    who.textContent = `${heroName(u.def)}, ${heroEpithet(u.def)}`;
    const title = document.createElement('b');
    title.textContent = name;
    const motto = document.createElement('i');
    motto.textContent = cut.motto;
    words.append(crest, who, title, motto);
    el.append(veil, sigil, frame, words);
    this.layer.append(el);
  }

  /** The painted kit's speed lines, tiled along the band and rushing to the right (held still with reduced motion), tinted to the element,
   *  and its glowing edge along the band's top and bottom. */
  private drawKit(m: UltMoment): void {
    const cv = this.kitCanvas!;
    const img = spellImage(KIT_SESSION);
    const lines = spellPart(KIT.speedlines);
    if (!img || !lines || !cv.isConnected) return;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== w || cv.height !== h) [cv.width, cv.height] = [w, h];
    const g = cv.getContext('2d');
    if (!g) return;
    const t = this.reduced ? 0 : this.slashT;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    const cell = lines.cell;
    const f = Math.floor(t / 80) % lines.frames;
    const tile = h;
    const off = ((t * 0.9) % tile) - tile;
    g.globalAlpha = 0.85;
    for (let x = off; x < w; x += tile) g.drawImage(img, (lines.col + f) * cell, lines.row * cell, cell, cell, x, 0, tile, h);
    const edge = spellPart(KIT.edge);
    if (edge) {
      const fe = Math.floor(t / 90) % edge.frames;
      const eh = 54;
      for (const y of [-eh / 2, h - eh / 2]) for (let x = off * 1.4 % eh - eh; x < w; x += eh * 2) g.drawImage(img, (edge.col + fe) * cell, edge.row * cell, cell, cell, x, y, eh * 2, eh);
    }
    // (tinted to the element: the painting is white and gold)
    g.globalAlpha = 0.45;
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = hex(GLOW[m.el ?? 'light']);
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;
  }

  private hide(): void {
    this.gather(null);
    this.show?.end();
    this.opts.fx?.hush(false);
    this.layer.hidden = true;
    this.layer.querySelector('.umSlash')?.remove();
    this.layer.querySelector('.umFlash')?.remove();
    this.layer.querySelector('.umTint')?.remove();
    this.layer.querySelector('.umAfter')?.remove();
    delete this.layer.dataset.stage;
    this.kitCanvas = null;
    this.shown = 0;
    this.lastPhase = 'idle';
    this.lastStage = '';
    this.regather = null;
    this.echoSeen = this.queue.echoes;
    // (the music comes back up as the show ends, however it ended)
    if (this.ducked) duck(false, 'ult');
    this.ducked = false;
  }

  /** The fight is over or left: every moment dropped. */
  clear(): void {
    this.queue.clear();
    this.struckSeen = this.queue.strikes;
    if (this.opts.fx) this.opts.fx.epic = new Set();
    this.hide();
  }

  /** For the screenshots: the moment's animations frozen `ms` into the opening. */
  get root(): HTMLElement {
    return this.layer;
  }
}
