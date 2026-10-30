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

/** Whether an ultimate gets the full moment (the hold and the dim): the setting on, and Auto off. With Auto the banner is short. */
export const fullScene = (setting: boolean, auto: boolean): boolean => setting && !auto;

export type UltShape = 'instant' | 'delayed' | 'lingering';

export const ULT_MOMENT = {
  /** The opening: the slash, the name, the dim (the battle held). */
  OPEN_MS: 1150,
  /** An instant ultimate's effects playing out while the battle stays held. */
  IMPACT_MS: 850,
  /** The dim fading as the battle runs again. */
  FADE_MS: 450,
  /** A delayed ultimate's salvo: the longest it is waited for under the dim, and the beat after it lands. */
  MAX_DELAY_MS: 1500,
  TAIL_MS: 300,
  /** How long a buff or a status must last to count as lingering. */
  LINGER_MS: 1500,
  /** The short version's banner. */
  SHORT_MS: 1500,
};

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
}

export type UltPhase = 'idle' | 'open' | 'impact' | 'settle' | 'fade';

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

  /** An ultimate fired: it plays at once, or after those before it. */
  push(m: UltMoment): void {
    if (this.current) this.queue.push(m);
    else this.begin(m);
  }

  private begin(m: UltMoment): void {
    this.seq++;
    this.current = m;
    this.phase = 'open';
    this.left = ULT_MOMENT.OPEN_MS;
  }

  /** Move on by `dt` real milliseconds; returns the phase now. */
  step(dt: number): UltPhase {
    let t = dt;
    // (a long frame may cross a phase's end: the rest of it carries on into the next, but never past an opening, which always shows)
    while (this.current && t > 0) {
      if (t < this.left) {
        this.left -= t;
        break;
      }
      t -= this.left;
      this.next();
      if (this.phase === 'open') break;
    }
    return this.phase;
  }

  private next(): void {
    const m = this.current!;
    if (this.phase === 'open') {
      if (m.shape === 'instant') return this.to('impact', ULT_MOMENT.IMPACT_MS);
      if (m.shape === 'delayed') return this.to('settle', m.ms);
      return this.to('fade', ULT_MOMENT.FADE_MS);
    }
    if (this.phase === 'impact' || this.phase === 'settle') return this.to('fade', ULT_MOMENT.FADE_MS);
    // (the fade is over: the next queued moment, or none)
    const after = this.queue.shift();
    if (after) this.begin(after);
    else {
      this.current = null;
      this.phase = 'idle';
      this.left = 0;
    }
  }

  private to(phase: UltPhase, ms: number): void {
    this.phase = phase;
    this.left = ms;
  }

  /** A tap: the moment playing goes straight to its fade (its effects then run as they would). */
  skip(): void {
    if (this.current && this.phase !== 'fade') this.to('fade', ULT_MOMENT.FADE_MS);
  }

  /** Everything dropped (the fight ended, the screen was left). */
  clear(): void {
    this.queue = [];
    this.current = null;
    this.phase = 'idle';
    this.left = 0;
  }

  /** Whether the battle is held now (the opening, and an instant one's effects playing). */
  get holdsBattle(): boolean {
    return this.phase === 'open' || this.phase === 'impact';
  }

  /** Whether the effects may move now (frozen through the opening, so the cast plays once the name has shown). */
  get runsEffects(): boolean {
    return this.phase !== 'open';
  }

  /** The dim's strength, 0 to 1: full through the opening and the effects, easing out through the fade. */
  get dim(): number {
    if (this.phase === 'idle') return 0;
    if (this.phase === 'fade') return Math.max(0, this.left / ULT_MOMENT.FADE_MS);
    return 1;
  }

  /** Moments still waiting after the one playing. */
  get waiting(): number {
    return this.queue.length;
  }
}
