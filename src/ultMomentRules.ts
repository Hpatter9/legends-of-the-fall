// The ultimate's moment (ULT-CUTIN, docs/notes/battle-hud.md): the rules of when a fight is held for a hero's ultimate and for how long. Pure: no
// DOM, no Pixi, so the tests read it; the page (`ultMoment.ts`) shows it and the fight loops ask it whether to step the battle.
//
// Full (the default): an ultimate fires and the fight is held for the opening (a slash of the hero's art across the screen, the ultimate's name,
// the board dimmed round the caster). What follows depends on the ultimate's shape, read from what its cast did on the tick it fired:
//   instant    every blow, heal or burst landed on that tick: the battle stays held while the effects play out, then the dim fades and it resumes;
//   delayed    a salvo still in the air (a shot or a strike from the sky lands later): the battle runs on under the dim until it has landed;
//   lingering  it left something that keeps working (a zone, a field, a wall, an aura, a song, a banner, a buff over time, fighters called up):
//              the battle resumes at once after the opening, so the lingering part runs live, and the dim fades.
// Several ultimates queue, each its own moment. Times are real time (the page's frame time, not the battle's), so the fight's speed changes
// nothing. A tap skips the moment that is playing. Short (the setting off): no hold and no dim, only a banner while the fight runs.
// With Auto on (the ultimates fire on their own, or an auto-replay) the moments are always short, the owner's call (`fullScene`).

import type { BattleEvent, Unit } from './sim/battle';
import type { Skill } from './sim/abilities';
import { liftedDim, ULT_EPIC, type UltTargets } from './ultEpicRules';
import type { Element } from './render/fxRules';
import type { PlannedCue } from './render/audioRules';
import type { StageName, UltStages } from './ultStageRules';

/** Whether an ultimate gets the full moment (the hold and the dim): the setting on, and Auto off. With Auto the banner is short. */
export const fullScene = (setting: boolean, auto: boolean): boolean => setting && !auto;

/** FREEZE-FIX (the director's call): whether an ultimate that just fired gets a full moment: only when no other show has the screen
 *  (`playing`: an ultimate's moment; `call`: an Eidolon's call). Otherwise it takes effect at once with the short banner. */
export const oneShow = (playing: boolean, call: boolean): boolean => !playing && !call;

/** FREEZE-FIX, the page's belt at a fight's end: `over` real ms since the fight ended, `shown` whether anything the player can act on
 *  is up (the result, a card, a film). Past `BELT_MS` with nothing shown, the page pushes the flow on. */
export const WAVE_END = { BELT_MS: 10000 };
export const waveEndStuck = (over: number, shown: boolean): boolean => !shown && !(over < WAVE_END.BELT_MS);

export type UltShape = 'instant' | 'delayed' | 'lingering';

export const ULT_MOMENT = {
  /** The opening: the slash, the name, the dim (the battle held). BATTLE-POLISH (docs/notes/battle-polish.md): 1150 to 1450 ms, a longer
   *  build-up on the caster (the owner found the whole moment too quick). */
  OPEN_MS: 1450,
  /** An instant ultimate's effects playing out while the battle stays held (ULT-EPIC: 700 ms; BATTLE-POLISH: 650 ms, the slow beat at its
   *  start), so with the freeze and the fade an instant ultimate's whole moment is about 3 s. */
  IMPACT_MS: 650,
  /** The dim fading (and the camera easing back) as the battle runs again (450 ms before BATTLE-POLISH). */
  FADE_MS: 650,
  /** BATTLE-POLISH: the slow-motion beat after the freeze on the blow (real ms), and how fast the effects and the fight run through it. */
  SLOW_MS: 500,
  SLOW_RATE: 0.3,
  /** A delayed ultimate's salvo: the longest it is waited for under the dim, and the beat after it lands. */
  MAX_DELAY_MS: 1500,
  TAIL_MS: 300,
  /** How long a buff or a status must last to count as lingering. */
  LINGER_MS: 1500,
  /** The short version's banner. */
  SHORT_MS: 1500,
  /** FREEZE-FIX (docs/notes/freeze-fix.md): the longest a moment may run past its own length before it is ended whatever it was waiting
   *  for (real ms), so a show can never hold a fight for good. */
  OVERRUN_MS: 2500,
  /** FREEZE-FIX: once the fight is over, the most that is left of the show playing: its aftermath, cut to this (real ms). The owner's
   *  freeze was a wave's end waiting 10 to 20 s for shows with nothing left to strike. */
  OVER_MS: 1000,
};

/** FREEZE-FIX: the longest a moment may last, start to end (real ms, the freeze on the blow counted): its own length (its stages'; the
 *  old lengths and its showcase without them), a salvo's longest wait, and `OVERRUN_MS` over. Always a finite number, whatever the
 *  moment holds. */
export function momentLimit(m: Pick<UltMoment, 'stages' | 'show'>): number {
  const own = m.stages?.total ?? ULT_MOMENT.OPEN_MS + (m.show ?? 0) + ULT_MOMENT.IMPACT_MS + ULT_MOMENT.FADE_MS;
  const most = 20000;
  return (Number.isFinite(own) && own > 0 ? Math.min(own, most) : most) + ULT_MOMENT.MAX_DELAY_MS + ULT_EPIC.HIT_STOP_MS + ULT_MOMENT.OVERRUN_MS;
}

/** The sound of the moment's two beats (HOLD-SOUND, docs/notes/hold-sound.md). The opening: the slash's sting and, under it, the power
 *  gathering for the whole of the build-up. The blow: its heavy sting and, once the freeze lets go, the slow beat's drag (none when calm:
 *  reduced motion has no freeze and no slow beat, so nothing to drag). */
export function ultCues(beat: 'open' | 'impact' | 'echo', calm: boolean, windup: number = ULT_MOMENT.OPEN_MS): PlannedCue[] {
  // (ULT-EPIC 2: a longer wind-up starts quiet; the charge still climbs for its own length and ends on the blow)
  if (beat === 'open') return [{ cue: 'ultSlash' }, { cue: 'ultCharge', ...(windup > ULT_MOMENT.OPEN_MS ? { delay: windup - ULT_MOMENT.OPEN_MS } : {}) }];
  // (a further burst of a flurry or a storm: the blow's sting again, softer)
  if (beat === 'echo') return [{ cue: 'ultImpact', gain: 0.5 }];
  return calm ? [{ cue: 'ultImpact' }] : [{ cue: 'ultImpact' }, { cue: 'ultSlow', delay: ULT_EPIC.HIT_STOP_MS }];
}

/** Words in an ultimate's own text that say it calls fighters up (the cast tick's new fighters say so too; this is for one that calls them a
 *  moment later). Most ultimates' words name a duration ("stunned for 2s"), so durations are read from the cast's events instead. */
const LINGER_TEXT = /\bsummons?\b|\bcalls? (up|forth)\b/i;

/** The shape of an ultimate that just fired: what its cast tick's events (`events`, the whole tick) show for this caster, the fighters that
 *  appeared on that tick (`born`), and its own words. `ms` is how long a delayed one is waited for (0 otherwise). */
export function ultShape(ult: Pick<Skill, 'text'>, caster: number, events: readonly BattleEvent[], born: readonly Pick<Unit, 'owner'>[] = []): { shape: UltShape; ms: number } {
  if (born.some((u) => u.owner === caster)) return { shape: 'lingering', ms: 0 };
  let delay = 0;
  for (const e of events) {
    switch (e.kind) {
      case 'zone':
      case 'trap':
      case 'aura':
      case 'wisp':
        return { shape: 'lingering', ms: 0 };
      case 'song':
      case 'banner':
        if (e.by === caster && e.ms >= ULT_MOMENT.LINGER_MS) return { shape: 'lingering', ms: 0 };
        break;
      case 'terrain':
      case 'mark':
        if (e.ms >= ULT_MOMENT.LINGER_MS) return { shape: 'lingering', ms: 0 };
        break;
      case 'haste':
        // (the team hastened; the caster's own talent haste as it casts is not the ultimate's)
        if (e.to !== caster && e.ms >= ULT_MOMENT.LINGER_MS) return { shape: 'lingering', ms: 0 };
        break;
      case 'shot':
        if (e.by === caster) delay = Math.max(delay, e.ms);
        break;
      case 'area':
        if (e.by === caster) delay = Math.max(delay, e.ms);
        break;
    }
  }
  if (LINGER_TEXT.test(ult.text)) return { shape: 'lingering', ms: 0 };
  if (delay > 120) return { shape: 'delayed', ms: Math.min(ULT_MOMENT.MAX_DELAY_MS, delay + ULT_MOMENT.TAIL_MS) };
  return { shape: 'instant', ms: 0 };
}

/** One ultimate's moment, as the queue keeps it. */
export interface UltMoment {
  /** The caster's unit id, and what the page shows (its kind, the ultimate's name). */
  unit: number;
  kind: string;
  name: string;
  shape: UltShape;
  /** A delayed one's wait. */
  ms: number;
  /** ULT-EPIC: its element, what its cast touched (lit, and burst on as it lands), and what its salvo struck when it landed. */
  el?: Element;
  targets?: UltTargets;
  landing?: UltTargets;
  /** ULT-SHOW (`ultShowRules.ts`): the showcase's length (ms) when this use plays the long version; it plays after the opening, the fight
   *  still held, and the blow lands as it ends. */
  show?: number;
  /** ULT-EPIC 2 (`ultStageRules.ts`): this use's three stages (the wind-up, the strike, the aftermath), which set how long each phase
   *  lasts, so the whole runs 4 to 6 s. A moment without them plays the old lengths (`ULT_MOMENT`). */
  stages?: UltStages;
}

export type UltPhase = 'idle' | 'open' | 'show' | 'impact' | 'settle' | 'fade';

/** The queue of ultimate moments and the one playing: `step` it with the page's frame time; `holdsBattle` says whether the battle may step,
 *  `runsEffects` whether the effects may (they are frozen through the opening, so the cast plays after it). */
export class UltQueue {
  private queue: UltMoment[] = [];
  current: UltMoment | null = null;
  phase: UltPhase = 'idle';
  /** Time left in the phase, ms. */
  left = 0;
  /** How many moments have begun (the page draws a new slash when it changes). */
  seq = 0;
  /** ULT-EPIC: how many blows have landed (the page plays the burst, the flash and the shake when it changes), the freeze on the blow
   *  left (real ms), and the ms since the moment's blow landed (null: not yet; the dim eases off from then). */
  strikes = 0;
  stopLeft = 0;
  /** BATTLE-POLISH: the slow-motion beat left after the freeze (real ms): everything moves at `SLOW_RATE` (`rate`). */
  slowLeft = 0;
  since: number | null = null;
  /** The screen kept still (reduced motion, or shake off): no freeze. */
  calm = false;
  /** ULT-EPIC 2: the stage playing and the real ms into it (the freeze counted); how many further bursts have gone off since the blow
   *  (the page plays one each time it changes); the wind-up's and the fade's lengths now; a salvo's wait left. */
  stageName: StageName | null = null;
  stageT = 0;
  /** ULT-CAMERA: the real ms since the moment playing began (the freeze counted): the camera's clock (`ultCameraRules.ts`). */
  clock = 0;
  echoes = 0;
  private echoAt = 0;
  private openMs = ULT_MOMENT.OPEN_MS;
  private fadeMs = ULT_MOMENT.FADE_MS;
  private waitLeft = 0;
  /** FREEZE-FIX: how many moments were ended by their deadline (`momentLimit`), and how many were dropped still waiting as the fight
   *  ended (the page logs each when the count changes: neither should happen). */
  overran = 0;
  dropped = 0;

  /** An ultimate fired: it plays at once, or after those before it. */
  push(m: UltMoment): void {
    if (this.current) this.queue.push(m);
    else this.begin(m);
  }

  private begin(m: UltMoment): void {
    this.seq++;
    this.current = m;
    this.phase = 'open';
    this.openMs = m.stages?.windup.ms ?? ULT_MOMENT.OPEN_MS;
    this.left = this.openMs;
    this.since = null;
    this.stopLeft = 0;
    this.slowLeft = 0;
    this.stageName = 'windup';
    this.clock = 0;
    this.stageT = 0;
    this.echoAt = 0;
    this.waitLeft = 0;
  }

  /** ULT-EPIC: the blow lands (an instant or lingering ultimate as its opening ends; a delayed one when its salvo arrives, `land`): the
   *  freeze begins and the dim starts to lift. Once a moment. */
  private strike(): void {
    if (this.since !== null) return;
    this.strikes++;
    this.since = 0;
    this.stopLeft = this.calm ? 0 : ULT_EPIC.HIT_STOP_MS;
    // (and the slow-motion beat after it; none with the screen kept still)
    this.slowLeft = this.calm ? 0 : ULT_MOMENT.SLOW_MS;
  }

  /** A delayed ultimate's salvo has landed (the page saw its blows): its impact now. */
  land(): void {
    if (this.current && this.phase === 'settle') this.strike();
  }

  /** Move on by `dt` real milliseconds; returns the phase now. */
  step(dt: number): UltPhase {
    let t = dt;
    // (a long frame may cross a phase's end: the rest of it carries on into the next, but never past an opening, which always shows)
    while (this.current && t > 0) {
      // (the freeze on the blow spends real time first: nothing else moves, the phase's own time included)
      if (this.stopLeft > 0) {
        const s = Math.min(t, this.stopLeft);
        this.stopLeft -= s;
        this.stageT += s;
        this.clock += s;
        t -= s;
        continue;
      }
      // (ULT-EPIC 2: a salvo the page has not seen land by the end of its wait gets its blow then, so the aftermath is never cut short)
      if (this.phase === 'settle' && this.since === null && this.current.stages) {
        if (this.waitLeft <= 0) {
          this.strike();
          continue;
        }
        if (t > this.waitLeft && this.waitLeft < this.left) {
          const s = this.waitLeft;
          this.waitLeft = 0;
          this.left -= s;
          this.stageT += s;
          this.clock += s;
          t -= s;
          continue;
        }
        this.waitLeft -= Math.min(t, this.left);
      }
      this.stageT += Math.min(t, this.left);
      this.clock += Math.min(t, this.left);
      if (this.since !== null) {
        this.since += Math.min(t, this.left);
        // (the further bursts of a flurry or a storm, while the strike plays)
        const e = this.current.stages?.echoes;
        if (e && this.stageName === 'strike')
          while (this.echoAt < e.length && this.since >= e[this.echoAt]) {
            this.echoAt++;
            this.echoes++;
          }
      }
      // (the slow beat spends real time alongside the phase's own)
      if (this.slowLeft > 0) this.slowLeft = Math.max(0, this.slowLeft - Math.min(t, this.left));
      if (t < this.left) {
        this.left -= t;
        break;
      }
      t -= this.left;
      this.next();
      if (this.phase === 'open') break;
    }
    // (FREEZE-FIX: a moment that has outlived its own length, whatever it was waiting for, is ended here: the fight is never held for good)
    if (this.current && !(this.clock <= momentLimit(this.current))) {
      this.overran++;
      this.stopLeft = 0;
      this.slowLeft = 0;
      this.phase = 'fade';
      this.next();
    }
    return this.phase;
  }

  /** FREEZE-FIX: the fight is over, and no show outlives it: the moments waiting are dropped, and the one playing goes straight to its
   *  aftermath, `OVER_MS` of it at most. Asked every frame while the fight stays over: it only ever shortens. */
  fightOver(): void {
    this.dropWaiting();
    if (!this.current) return;
    this.stopLeft = 0;
    this.slowLeft = 0;
    if (this.phase !== 'fade') this.fade(Math.min(ULT_MOMENT.OVER_MS, this.current.stages?.aftermath.ms ?? ULT_MOMENT.FADE_MS));
    else if (!(this.left <= ULT_MOMENT.OVER_MS)) this.left = ULT_MOMENT.OVER_MS;
  }

  /** FREEZE-FIX: the fight is over: the moments still waiting their turn are dropped (the one playing finishes), so a won fight's result
   *  is not kept back by a line of shows with nothing left to strike. Returns how many went. */
  dropWaiting(): number {
    const n = this.queue.length;
    this.queue = [];
    this.dropped += n;
    return n;
  }

  private next(): void {
    const m = this.current!;
    const st = m.stages;
    // (ULT-EPIC 2: the strike begins as the wind-up ends; a showcase is the first part of it)
    if (this.phase === 'open') this.stage('strike');
    // (ULT-SHOW: the showcase follows the opening, and the blow lands as it ends)
    if (this.phase === 'open' && m.show) return this.to('show', m.show);
    if (this.phase === 'open' || this.phase === 'show') {
      // (the blow lands as the opening ends, unless it is a salvo still in the air)
      if (m.shape !== 'delayed') this.strike();
      // (with stages, what is left of the strike after a showcase and the freeze on the blow: the freeze spends its own real time)
      const rest = st ? Math.max(0, st.strike.ms - (this.phase === 'show' ? m.show ?? 0 : 0) - (this.calm ? 0 : ULT_EPIC.HIT_STOP_MS)) : 0;
      if (m.shape === 'instant') return this.to('impact', st ? rest : ULT_MOMENT.IMPACT_MS);
      if (m.shape === 'delayed') {
        this.waitLeft = m.ms;
        return this.to('settle', st ? rest : m.ms);
      }
      // (lingering: the fight runs again at once; with stages its strike plays out live under the dim before the aftermath)
      return st ? this.to('settle', rest) : this.fade(ULT_MOMENT.FADE_MS);
    }
    if (this.phase === 'impact' || this.phase === 'settle') {
      // (a salvo the page never saw land still gets its impact, as the wait ends)
      if (m.shape === 'delayed' && this.since === null) this.strike();
      return this.fade(st ? st.aftermath.ms : ULT_MOMENT.FADE_MS);
    }
    // (the fade is over: the next queued moment, or none)
    const after = this.queue.shift();
    if (after) this.begin(after);
    else {
      this.current = null;
      this.phase = 'idle';
      this.left = 0;
      this.stageName = null;
    }
  }

  private to(phase: UltPhase, ms: number): void {
    this.phase = phase;
    this.left = ms;
  }

  private stage(name: StageName): void {
    this.stageName = name;
    this.stageT = 0;
  }

  /** The aftermath: the fight runs again, the dim fades over `ms`. */
  private fade(ms: number): void {
    this.fadeMs = ms;
    this.stage('aftermath');
    this.to('fade', ms);
  }

  /** A tap: the moment playing goes straight to its fade (its effects then run as they would); a tap in the fade ends it at once.
   *  SWEEP-1110 (the director's call): a tap ends it at any point, the settle of a salvo in the air included. */
  skip(): void {
    if (this.current && this.phase !== 'fade') this.fade(ULT_MOMENT.FADE_MS);
    else if (this.current) this.left = 0;
    this.stopLeft = 0;
    this.slowLeft = 0;
  }

  /** Everything dropped (the fight ended, the screen was left). */
  clear(): void {
    this.queue = [];
    this.current = null;
    this.phase = 'idle';
    this.left = 0;
    this.stopLeft = 0;
    this.slowLeft = 0;
    this.since = null;
    this.stageName = null;
    this.stageT = 0;
  }

  /** BATTLE-POLISH: how fast the fight and the effects move now, as a share of x1: slowed through the beat after the blow, else 1 (the
   *  freeze itself is `holdsBattle` and `runsEffects`). */
  get rate(): number {
    return this.stopLeft <= 0 && this.slowLeft > 0 ? ULT_MOMENT.SLOW_RATE : 1;
  }

  /** BATTLE-POLISH: how far through the opening it is, 0 to 1 (0 outside it): the camera's lean builds with it. */
  get openT(): number {
    return this.phase === 'open' ? 1 - this.left / this.openMs : 0;
  }

  /** ULT-EPIC 2: the stage playing now and how far through it (0 to 1), for the page to draw and for art to be played against; null
   *  when no moment plays. */
  get stageNow(): { name: StageName; k: number; ms: number } | null {
    const m = this.current;
    if (!m || !this.stageName) return null;
    const len = m.stages ? m.stages[this.stageName].ms : this.stageName === 'windup' ? this.openMs : this.stageName === 'aftermath' ? this.fadeMs : 0;
    return { name: this.stageName, k: len > 0 ? Math.min(1, this.stageT / len) : 1, ms: this.stageT };
  }

  /** Whether the battle is held now (the opening, a showcase, an instant one's effects playing, and the freeze on any blow). */
  get holdsBattle(): boolean {
    return this.phase === 'open' || this.phase === 'show' || this.phase === 'impact' || this.stopLeft > 0;
  }

  /** Whether the effects may move now (frozen through the opening and a showcase, so the cast plays once they are over, and through the
   *  freeze). */
  get runsEffects(): boolean {
    return this.phase !== 'open' && this.phase !== 'show' && this.stopLeft <= 0;
  }

  /** ULT-SHOW: ms into the showcase playing (null: none is). */
  get showT(): number | null {
    return this.phase === 'show' && this.current?.show ? this.current.show - this.left : null;
  }

  /** The dim's strength, 0 to 1: full through the opening, eased down to a light veil as the blow lands (ULT-EPIC), then out through the
   *  fade. */
  get dim(): number {
    if (this.phase === 'idle') return 0;
    const lifted = this.current?.stages ? liftedDim(this.since, ULT_EPIC.STAGED_LIFT, ULT_EPIC.STAGED_LIFT_MS) : liftedDim(this.since);
    if (this.phase === 'fade') return lifted * Math.max(0, this.left / this.fadeMs);
    return lifted;
  }

  /** Moments still waiting after the one playing. */
  get waiting(): number {
    return this.queue.length;
  }
}
