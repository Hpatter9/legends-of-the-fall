// DUEL-SHOW (docs/notes/duel-show.md; the rules are `duelShowRules.ts`): a duel made a show on the page. The ring is empty, then the
// champion walks in from its side and the challenger from theirs, they stop facing each other, and a beat (their names, a horn) before the
// first blow; a tap skips it, and with reduced motion they simply stand. The rest of the party and the rest of the wave watch from just
// outside the ring on their own sides, facing in: they bob, jump and shout at a big blow, groan at one taken, and at the end the winner's
// side erupts and the loser's slumps before the outcome comes up. Over the fight, one tug-of-war bar in place of the boss's: the champion's
// face at one end and the challenger's at the other, green from the champion's end and red from the challenger's, the meeting point
// sliding with each side's share of health, pulsing on a big swing.
//
// It never changes the battle. The crowd are copies of the wave's own fighters drawn beside the board's, not in `Battle.units`; the walk-in
// stages the two's sprites (`UnitSprite.stage`) while the page holds the fight (`holding`) before its first tick; the bar reads the two.

import type { Container } from 'pixi.js';
import type { Battle, BattleEvent, Unit } from './sim/battle';
import { tileAt } from './sim/board';
import { UNITS } from './sim/units';
import { heroName } from './sim/heroNames';
import { UnitSprite } from './render/unitView';
import { at, depth, facesRight } from './render/iso';
import { portrait } from './render/sheets';
import { play } from './render/sound';
import { crowdSays } from './quips';
import { registerCamCover } from './camSafe';
// (UI-ART-WIRE: the bar's painted pieces, art/duel-show, cut by tools/duel-show/import-art.py; bundled, so they play offline)
import barFrame from './art/duel/bar-frame.webp';
import barGreen from './art/duel/bar-fill-green.webp';
import barRed from './art/duel/bar-fill-red.webp';
import barKnot from './art/duel/bar-knot.webp';
import barFlare from './art/duel/bar-flare.webp';
import type { Anchor } from './quipView';
import { bigSwing, crowdSpots, endMoods, hitMoods, hopOf, shoutFor, SHOUT_GAP_MS, TUG, tugLeader, tugPoint, walkAt, walkFrom, END_SHOW_MS, type CrowdSpot, type Mood } from './duelShowRules';

const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** How long (real ms) a cheer or a groan at a blow lasts before the crowd goes back to watching. */
const MOOD_MS = 1300;

interface Watcher {
  unit: Unit;
  sprite: UnitSprite;
  spot: CrowdSpot;
  side: 'heroes' | 'foes';
  seed: number;
}

export interface DuelShowOpts {
  /** The board's sortable container, where the fighters' sprites are drawn. */
  root: Container;
  /** A fighter's sprite on the board. */
  sprite(id: number): UnitSprite | undefined;
  /** A sprite's head on the page, for a shout's bubble (null when it is not on the screen). */
  anchor(s: UnitSprite): Anchor | null;
  /** The awakening step a hero kind is drawn at. */
  awaken(kind: string): number;
}

export class DuelShow {
  private crowd: Watcher[] = [];
  private b: Battle | null = null;
  /** Real ms since the walk-in began, since the duel ended (-1 before), and the moods with when each side's runs out. */
  private ms = 0;
  private endMs = -1;
  private mood: Record<'heroes' | 'foes', { m: Mood; until: number }> = { heroes: { m: 'watch', until: Infinity }, foes: { m: 'watch', until: Infinity } };
  private skipped = false;
  private reduced = reducedMotion();
  private lastShout = -Infinity;
  /** The bar's meeting point a moment ago (for a swing), the pulse's time left, and its parts. */
  private tugHist: { at: number; p: number }[] = [];
  private pulse = 0;
  private bar: { root: HTMLElement; green: HTMLElement; red: HTMLElement; knot: HTMLElement; clock: HTMLElement } | null = null;
  private veil: HTMLElement | null = null;
  private names: HTMLElement | null = null;
  private horn = false;

  constructor(private opts: DuelShowOpts) {}

  /** The duel's fight the show is for. */
  get battle(): Battle | null {
    return this.b;
  }

  /** Whether a duel's show is on (from its walk-in to its end). */
  get on(): boolean {
    return !!this.b;
  }

  /** Whether the page holds the fight: the walk-in and its beat. */
  get holding(): boolean {
    return !!this.b && !this.skipped && !walkAt(this.ms, this.reduced).done;
  }

  /** Whether the end's moods still play (the outcome waits for them). */
  get ending(): boolean {
    return !!this.b && this.endMs >= 0 && this.endMs < END_SHOW_MS;
  }

  /** A duel's fight is about to begin: the crowd is taken from the wave as it stood (`before`: the party placed and the wave's foes), and
   *  the walk-in begins. */
  start(b: Battle, before: readonly Unit[]): void {
    this.clear();
    const d = b.duel;
    if (!d) return;
    this.b = b;
    this.reduced = reducedMotion();
    this.ms = 0;
    this.endMs = -1;
    this.skipped = false;
    this.horn = false;
    this.tugHist = [];
    this.mood = { heroes: { m: 'watch', until: Infinity }, foes: { m: 'watch', until: Infinity } };
    const champion = b.units.find((u) => u.id === d.hero);
    const nem = b.units.find((u) => u.id === d.nem);
    const heroes = before.filter((u) => u.side === 'hero' && u.alive && u.owner === undefined && !UNITS[u.def]?.summon && u.tag !== d.tag && u.def !== champion?.def);
    const foes = before.filter((u) => u.side === 'foe' && u.alive && !UNITS[u.def]?.summon && u.nem?.id !== d.id && (u.size ?? 1) === 1);
    // (the two walk in along their own columns: the crowd leaves those open)
    const spots = crowdSpots(b.board, d, heroes.length, foes.length, { heroes: champion?.u, foes: nem?.u });
    let id = -1000;
    const add = (u: Unit, spot: CrowdSpot, side: 'heroes' | 'foes', i: number) => {
      // (a copy of the fighter, standing whole at its place, facing in; never in the battle)
      const copy: Unit = { ...u, id: id--, u: spot.u, v: spot.v, facing: spot.facing, hp: u.maxHp, alive: true };
      for (const k of ['step', 'swing', 'cast', 'hurtAt', 'diedAt'] as const) delete (copy as Partial<Unit>)[k];
      const sprite = new UnitSprite(copy, u.side === 'hero' ? this.opts.awaken(u.def) : 0);
      sprite.bystander = true;
      this.opts.root.addChild(sprite.root);
      this.crowd.push({ unit: copy, sprite, spot, side, seed: (u.id * 31 + i * 7) >>> 0 });
    };
    heroes.slice(0, spots.heroes.length).forEach((u, i) => add(u, spots.heroes[i], 'heroes', i));
    foes.slice(0, spots.foes.length).forEach((u, i) => add(u, spots.foes[i], 'foes', i));
    this.buildBar(champion, nem);
    this.buildWalkIn(champion, nem);
    if (!this.reduced) play('duelWalk');
  }

  /** The crowd's places on the screen, for the camera to keep in view (each faint, so the camera still looks at the two). */
  spots(): { x: number; y: number; tall: number }[] {
    return this.crowd.map((w) => ({ x: w.sprite.x, y: w.sprite.y, tall: w.sprite.tall }));
  }

  /** A tap: the walk-in is skipped (the two stand at their places and the fight begins). */
  skip(): void {
    if (!this.holding) return;
    this.skipped = true;
    this.dropWalkIn();
  }

  /** A tick's events in the ring: a big blow moves the crowd; the end starts the end's moods. */
  note(b: Battle, events: readonly BattleEvent[]): void {
    const d = b.duel;
    if (!d || b !== this.b) return;
    for (const e of events) {
      if (e.kind !== 'hit') continue;
      const struck = b.units.find((u) => u.id === e.to);
      if (!struck) continue;
      const m = hitMoods(e, d.hero, struck);
      if (!m) continue;
      this.setMoods(m.heroes, m.foes, this.ms + MOOD_MS);
      const side: 'heroes' | 'foes' = m.heroes === 'cheer' ? 'heroes' : 'foes';
      this.shout(side, 'cheer');
      play('crowdCheer');
    }
  }

  /** The duel has ended (`Battle.duel.ended`): the winner's side erupts, the loser's slumps; the outcome waits `END_SHOW_MS`. */
  private finish(out: 'won' | 'lost' | 'timeout'): void {
    this.endMs = 0;
    const m = endMoods(out);
    this.setMoods(m.heroes, m.foes, Infinity);
    for (const side of ['heroes', 'foes'] as const) {
      const mood = m[side];
      if (mood === 'erupt' || mood === 'slump') this.shout(side, mood);
    }
    play(out === 'won' ? 'crowdCheer' : 'tugSwing');
  }

  private setMoods(heroes: Mood, foes: Mood, until: number): void {
    this.mood.heroes = { m: heroes, until };
    this.mood.foes = { m: foes, until };
  }

  /** One of a side's crowd shouts, now and then (one bubble a few seconds at most, the Hero quips setting followed). */
  private shout(side: 'heroes' | 'foes', mood: 'cheer' | 'groan' | 'erupt' | 'slump'): void {
    const big = mood === 'erupt' || mood === 'slump';
    if (!big && this.ms - this.lastShout < SHOUT_GAP_MS) return;
    const pool = this.crowd.filter((w) => w.side === side);
    if (!pool.length) return;
    const seed = Math.round(this.ms / 100) + pool.length * 13;
    const w = pool[seed % pool.length];
    const a = this.opts.anchor(w.sprite);
    if (!a) return;
    this.lastShout = this.ms;
    crowdSays(shoutFor(mood, seed), a, side === 'heroes' ? 'The party' : 'The wave');
  }

  /** Each frame (real ms `dt`): the walk-in's poses, the crowd's, the bar and the end. Called before the board's sprites are drawn. */
  frame(dt: number, b: Battle): void {
    if (b !== this.b) return;
    const d = b.duel;
    if (!d) return;
    this.ms += dt;
    if (d.ended && this.endMs < 0) this.finish(d.ended);
    if (this.endMs >= 0) this.endMs += dt;
    for (const side of ['heroes', 'foes'] as const) if (this.ms >= this.mood[side].until) this.mood[side] = { m: 'watch', until: Infinity };
    this.poseTwo(b);
    this.poseCrowd(b);
    this.drawBar(b, dt);
  }

  /** The two duellists through the walk-in: staged from past the ring to their places, walking, then standing for the beat. */
  private poseTwo(b: Battle): void {
    const d = b.duel!;
    const w = walkAt(this.ms, this.reduced);
    const live = this.holding;
    for (const [id, champion] of [[d.hero, true], [d.nem, false]] as const) {
      const s = this.opts.sprite(id);
      const u = b.units.find((x) => x.id === id);
      if (!s || !u) continue;
      if (!live) {
        // (the walk-in is over: drawn as the sim says, unless a showcase stages it)
        if (s.stage?.row === 'walk' || this.stagedByUs.has(id)) {
          s.stage = null;
          this.stagedByUs.delete(id);
        }
        continue;
      }
      const from = walkFrom(u, champion);
      const fu = from.u + (u.u - from.u) * w.p;
      const fv = from.v + (u.v - from.v) * w.p;
      const h0 = tileAt(b.board, Math.round(from.u), Math.round(from.v))?.h ?? tileAt(b.board, u.u, u.v)!.h;
      const h1 = tileAt(b.board, u.u, u.v)!.h;
      const [x, y] = at(fu, fv, h0 + (h1 - h0) * w.p);
      // (they walk towards each other, then face each other)
      const face = facesRight(u.facing) ? 1 : -1;
      const walking = w.p < 1;
      s.stage = { x, y, z: depth(fu, fv) + 5, alpha: 1, row: walking ? 'walk' : 'idle', p: walking ? (this.ms / 560) % 1 : (this.ms / 900) % 1, face };
      this.stagedByUs.add(id);
    }
    if (live && w.beat && !this.horn) {
      this.horn = true;
      if (this.names) this.names.classList.add('show');
      play('horn');
    }
    if (!live) this.dropWalkIn();
  }

  private stagedByUs = new Set<number>();

  /** The crowd's poses: watching (a bob now and then), cheering (jumping, arms up), groaning (a flinch), erupting, slumping. */
  private poseCrowd(b: Battle): void {
    for (const w of this.crowd) {
      const mood = this.mood[w.side].m;
      const tile = tileAt(b.board, w.spot.u, w.spot.v);
      if (!tile) continue;
      const [x, y] = at(w.spot.u, w.spot.v, tile.h);
      const hop = hopOf(mood, this.ms, w.seed, this.reduced);
      const p = (this.ms / (mood === 'erupt' ? 420 : 520) + (w.seed % 13) / 13) % 1;
      const row = mood === 'cheer' || mood === 'erupt' ? 'attack' : mood === 'groan' ? 'hurt' : mood === 'slump' ? 'hurt' : 'idle';
      const face = facesRight(w.spot.facing) ? 1 : -1;
      w.sprite.stage = { x, y: y - hop, z: depth(w.spot.u, w.spot.v) + 5, alpha: mood === 'slump' ? 0.85 : 1, row, p: mood === 'slump' ? 0.99 : mood === 'groan' ? 0.5 : p, face };
      w.sprite.update(b.board, this.ms, false);
    }
  }

  // ---- the walk-in's names and its tap -----------------------------------------------------------------------------------------

  private buildWalkIn(champion: Unit | undefined, nem: Unit | undefined): void {
    // (a tap anywhere skips the walk-in; it lets taps through once the fight runs)
    const veil = document.createElement('div');
    veil.className = 'dsVeil';
    veil.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.skip();
    });
    const names = document.createElement('div');
    names.className = `dsNames${this.reduced ? ' still' : ''}`;
    const one = (who: string, cls: string) => {
      const b = document.createElement('b');
      b.className = cls;
      b.textContent = who;
      return b;
    };
    const vs = document.createElement('i');
    vs.textContent = 'vs';
    names.append(one(champion ? heroName(champion.def) : 'Champion', 'hero'), vs, one(nem?.nem?.name ?? (nem ? UNITS[nem.def].name : 'Challenger'), 'nem'));
    if (this.reduced) names.classList.add('show');
    veil.append(names);
    document.body.append(veil);
    this.veil = veil;
    this.names = names;
  }

  private dropWalkIn(): void {
    this.veil?.remove();
    this.veil = null;
    this.names = null;
  }

  // ---- the bar -----------------------------------------------------------------------------------------------------------------

  private buildBar(champion: Unit | undefined, nem: Unit | undefined): void {
    const host = document.getElementById('bossBar');
    if (!host) return;
    host.classList.add('duel');
    const root = document.createElement('div');
    // (UI-ART-WIRE: the painted bar: its frame with a socket at each end for the faces, the two fills' tiles, the knot and its flare)
    root.className = 'dsTug dsArt';
    for (const [k, url] of [['frame', barFrame], ['green', barGreen], ['red', barRed], ['knot', barKnot], ['flare', barFlare]] as const) root.style.setProperty(`--ds-${k}`, `url(${url})`);
    const face = (u: Unit | undefined, cls: string) => {
      const f = document.createElement('span');
      f.className = `dsFace ${cls}`;
      if (u) f.append(portrait(UNITS[u.def].sheet, 28));
      return f;
    };
    const track = document.createElement('span');
    track.className = 'dsTrack';
    const green = document.createElement('i');
    green.className = 'dsGreen';
    const red = document.createElement('i');
    red.className = 'dsRed';
    const knot = document.createElement('b');
    knot.className = 'dsKnot';
    track.append(green, red, knot);
    const clock = document.createElement('small');
    clock.className = 'dsClock';
    const label = document.createElement('span');
    label.className = 'dsWho';
    const hn = document.createElement('em');
    hn.textContent = champion ? heroName(champion.def) : '';
    const nn = document.createElement('em');
    nn.textContent = nem?.nem?.name ?? (nem ? UNITS[nem.def].name : '');
    label.append(hn, clock, nn);
    root.append(face(champion, 'hero'), track, face(nem, 'nem'), label);
    host.append(root);
    this.bar = { root, green, red, knot, clock };
    // (CAM-SAFE: the camera keeps the two clear of the bar; `#bossBar` is a cover already, and the bar is registered in its own right too)
    registerCamCover('#bossBar .dsTug');
  }

  private drawBar(b: Battle, dt: number): void {
    const bar = this.bar;
    const d = b.duel;
    if (!bar || !d) return;
    const hero = b.units.find((u) => u.id === d.hero);
    const nem = b.units.find((u) => u.id === d.nem);
    if (!hero || !nem) return;
    const withShield = (u: Unit) => ({ hp: u.alive ? u.hp + (u.shield?.hp ?? 0) : 0, maxHp: u.maxHp + (u.shield?.hp ?? 0) });
    const p = tugPoint(withShield(hero), withShield(nem));
    const pct = `${(p * 100).toFixed(1)}%`;
    bar.green.style.width = pct;
    bar.red.style.left = pct;
    bar.knot.style.left = pct;
    bar.root.dataset.lead = tugLeader(p);
    const left = Math.max(0, Math.ceil(((b.timeLimit ?? 0) - b.t) / 1000));
    bar.clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    // (a big swing: the bar pulses, and the swing sounds)
    this.tugHist.push({ at: this.ms, p });
    while (this.tugHist.length && this.ms - this.tugHist[0].at > TUG.SWING_MS) this.tugHist.shift();
    if (this.tugHist.length && this.pulse <= 0 && bigSwing(this.tugHist[0].p, p)) {
      this.pulse = 600;
      this.tugHist = [{ at: this.ms, p }];
      if (!this.reduced) bar.root.classList.remove('swing');
      void bar.root.offsetWidth;
      bar.root.classList.add('swing');
      play('tugSwing');
    }
    if (this.pulse > 0) this.pulse -= dt;
  }

  /** The duel's show is over (the board rebuilt, the run moved on): the crowd, the bar and the walk-in's veil go. */
  clear(): void {
    for (const w of this.crowd) w.sprite.root.destroy({ children: true });
    this.crowd = [];
    for (const id of this.stagedByUs) {
      const s = this.opts.sprite(id);
      if (s) s.stage = null;
    }
    this.stagedByUs.clear();
    this.dropWalkIn();
    this.bar?.root.remove();
    this.bar = null;
    document.getElementById('bossBar')?.classList.remove('duel');
    this.b = null;
    this.endMs = -1;
  }
}
