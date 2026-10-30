// When a hero speaks, and what they say: pure rules (no DOM, no clock of their own) for the speech bubbles. A `QuipBox` picks a
// line for a moment (hired, placed, won, lost, a level gained, an ultimate cast, a revival, a close call) or a bit of banter
// between two heroes who share a trait, and rate-limits them so the screen is never crowded: at most one bubble per `GAP_MS`, a
// few per scene, a hero's "first placed" and "close call" only once a scene, and the newer moments a line or two a scene. The
// king of the Last Stand and its foes talk through the same box. Each pick has a chance, and the line is chosen from the three or
// so a moment has, both drawn from a side stream of the seed, so a quiet game stays quiet and nothing here touches the fight's
// own stream. The settings can switch them all off.

import { Rng, mixSeed } from '../sim/rng';
import { BANTER, FOE_GRUMBLES, HERO_QUIPS, KING_LINES, STAND_FOE_LINES, type KingKind, type QuipKind, type StandFoeKind } from '../quipData';
import { traitsOf } from '../sim/traits';
import { keyOf, ultimateOf } from '../sim/abilities';
import type { Battle, BattleEvent, Unit } from '../sim/battle';

/** The least time (ms) between two bubbles. */
export const GAP_MS = 5000;
/** The most bubbles in one scene (a fight, or a visit to a screen). */
export const SCENE_MAX = 5;
/** How likely each moment is to get a line at all. */
export const CHANCE: Record<QuipKind, number> = { hired: 0.7, placed: 0.5, won: 0.9, lost: 0.9, levelUp: 0.4, ultimate: 0.15, revived: 1, lowHp: 0.6 };
/** The most lines of a kind in one scene (a kind not named here has only the scene's own limit). */
export const KIND_MAX: Partial<Record<QuipKind, number>> = { levelUp: 2, ultimate: 2, lowHp: 2, revived: 1 };
/** The moments that may speak inside the gap, once: the end of a fight, and a heart bringing the party back. */
const URGENT = new Set<QuipKind>(['won', 'lost', 'revived']);
/** A hero is in a close call when they fall under this share of their health. */
export const LOW_HP = 0.25;
/** The king's lines: how likely each is, how many a wave may have (a kind not named has no limit of its own), which may speak inside the gap, and the least time between two hurts. */
export const KING_CHANCE: Record<KingKind, number> = { waveStart: 0.6, bossWave: 1, hurt: 0.5, lowHp: 1, waveCleared: 0.4, fallen: 1 };
export const KING_MAX: Partial<Record<KingKind, number>> = { hurt: 2, lowHp: 1 };
const KING_URGENT = new Set<KingKind>(['waveStart', 'bossWave', 'lowHp', 'fallen']);
export const KING_HURT_GAP_MS = 12000;
/** The king is in a close call under this share of his health. */
export const KING_LOW_HP = 0.3;
/** A foe's grumble as a Last Stand wave comes in: likelier on a boss wave. */
export const STAND_FOE_CHANCE: Record<StandFoeKind, number> = { waveStart: 0.5, bossWave: 0.9 };
/** Banter has this chance when a result comes in and two heroes share a trait. */
export const BANTER_CHANCE = 0.35;
/** The salt of the quips' side stream. */
export const QUIP_SALT = 0x71b5;

export interface Quip {
  /** Who says it (a hero kind). */
  hero: string;
  text: string;
  /** For banter: the other hero's reply, and who gives it. */
  reply?: { hero: string; text: string };
}

export class QuipBox {
  private rng: Rng;
  private lastAt = -Infinity;
  private shown = 0;
  private placedSaid = new Set<string>();
  private lowSaid = new Set<string>();
  private counts: Partial<Record<QuipKind, number>> = {};
  private kingCounts: Partial<Record<KingKind, number>> = {};
  private kingHurtAt = -Infinity;
  private grumbled = false;
  private standFoeSaid = false;

  constructor(
    seed: number,
    private enabled: () => boolean = () => true,
  ) {
    this.rng = new Rng(mixSeed(seed, QUIP_SALT));
  }

  /** A new scene: a fresh fight or a fresh visit; the count and the "first placed" start over (the gap does not). */
  newScene(): void {
    this.shown = 0;
    this.placedSaid.clear();
    this.lowSaid.clear();
    this.counts = {};
    this.kingCounts = {};
    this.grumbled = false;
    this.standFoeSaid = false;
  }

  private allowed(now: number, urgent: boolean): boolean {
    if (!this.enabled() || this.shown >= SCENE_MAX) return false;
    return urgent || now - this.lastAt >= GAP_MS;
  }

  private line(hero: string, kind: QuipKind): string | null {
    const q = HERO_QUIPS[hero]?.[kind];
    return q?.length ? this.rng.pick(q) : null;
  }

  /** A line for a hero at a moment, or null (quiet, too soon, too many, off, or no lines for this hero). A win, a loss or a revival may speak inside the gap, once. */
  say(hero: string, kind: QuipKind, now: number): Quip | null {
    if (!this.allowed(now, URGENT.has(kind))) return null;
    if ((this.counts[kind] ?? 0) >= (KIND_MAX[kind] ?? Infinity)) return null;
    if (kind === 'placed') {
      if (this.placedSaid.has(hero)) return null;
      this.placedSaid.add(hero);
    }
    // (a close call comes once for each hero a scene, whether or not they say anything)
    if (kind === 'lowHp') {
      if (this.lowSaid.has(hero)) return null;
      this.lowSaid.add(hero);
    }
    if (this.rng.next() >= CHANCE[kind]) return null;
    const text = this.line(hero, kind);
    if (!text) return null;
    this.lastAt = now;
    this.shown++;
    this.counts[kind] = (this.counts[kind] ?? 0) + 1;
    return { hero, text };
  }

  /** A heart has brought the party back: one of `heroes` (the kinds, in the order placed) says so, inside the gap. */
  revive(heroes: readonly string[], now: number): Quip | null {
    return heroes.length ? this.say(this.rng.pick(heroes), 'revived', now) : null;
  }

  /** The king's line at a moment of the Last Stand, or null (quiet, too soon, too many, off). The wave's start and the king's own distress speak inside the gap; a hit on him is throttled hard. */
  king(kind: KingKind, now: number): string | null {
    if (!this.allowed(now, KING_URGENT.has(kind))) return null;
    if ((this.kingCounts[kind] ?? 0) >= (KING_MAX[kind] ?? Infinity)) return null;
    if (kind === 'hurt' && now - this.kingHurtAt < KING_HURT_GAP_MS) return null;
    if (this.rng.next() >= KING_CHANCE[kind]) return null;
    this.lastAt = now;
    this.shown++;
    this.kingCounts[kind] = (this.kingCounts[kind] ?? 0) + 1;
    if (kind === 'hurt') this.kingHurtAt = now;
    return this.rng.pick(KING_LINES[kind]);
  }

  /** A foe's grumble as a Last Stand wave comes in: one a wave, from the edge. */
  standFoe(boss: boolean, now: number): string | null {
    const kind: StandFoeKind = boss ? 'bossWave' : 'waveStart';
    if (!this.allowed(now, false) || this.standFoeSaid) return null;
    this.standFoeSaid = true;
    if (this.rng.next() >= STAND_FOE_CHANCE[kind]) return null;
    this.lastAt = now;
    this.shown++;
    return this.rng.pick(STAND_FOE_LINES[kind]);
  }

  /** A foe's grumble at the start of a fight (staffing, pay, hats): quiet most fights, and likelier the fewer foes there are. */
  grumble(foes: number, now: number): string | null {
    if (!this.allowed(now, false) || this.grumbled) return null;
    this.grumbled = true;
    if (this.rng.next() >= (foes <= 3 ? 0.7 : 0.3)) return null;
    this.lastAt = now;
    this.shown++;
    return this.rng.pick(FOE_GRUMBLES);
  }

  /** A fight's end: one of the heroes who fought speaks, picked from `heroes` (the kinds, in the order placed); sometimes two
   *  of them who share a trait trade a line instead. */
  ending(heroes: readonly string[], won: boolean, now: number): Quip | null {
    if (!heroes.length || !this.allowed(now, true)) return null;
    const pair = this.rng.next() < BANTER_CHANCE ? pickPair(heroes, this.rng) : null;
    if (pair) {
      const [a, b, trait] = pair;
      const lines = BANTER[trait];
      if (lines?.length) {
        const [first, second] = this.rng.pick(lines);
        this.lastAt = now;
        this.shown++;
        return { hero: a, text: first, reply: { hero: b, text: second } };
      }
    }
    const hero = this.rng.pick(heroes);
    return this.say(hero, won ? 'won' : 'lost', now);
  }
}

/** Two different heroes in `heroes` who share a trait that has banter, and the trait; null if there is no such pair. */
export function pickPair(heroes: readonly string[], rng: Rng): [string, string, string] | null {
  const kinds = [...new Set(heroes)];
  const pairs: [string, string, string][] = [];
  for (let i = 0; i < kinds.length; i++)
    for (let j = i + 1; j < kinds.length; j++) {
      const t = traitsOf(kinds[i]).find((x) => traitsOf(kinds[j]).includes(x) && BANTER[x]);
      if (t) pairs.push([kinds[i], kinds[j], t]);
    }
  return pairs.length ? rng.pick(pairs) : null;
}

/** The kinds of the heroes (not summons) whose ultimate went off in these events, in order. */
export function ultimatesCast(b: Battle, events: readonly BattleEvent[]): string[] {
  const out: string[] = [];
  for (const e of events) {
    if (e.kind !== 'skill') continue;
    const u = b.units.find((x) => x.id === e.by);
    if (u && u.side === 'hero' && u.owner === undefined && (() => { const s = ultimateOf(u); return !!s && keyOf(s) === e.name; })()) out.push(u.def);
  }
  return out;
}

/** The heroes (not summons, and not `except`) that these events left alive and under `LOW_HP` of their health, in order, each once. */
export function closeCalls(b: Battle, events: readonly BattleEvent[], except?: number): Unit[] {
  const out: Unit[] = [];
  for (const e of events) {
    if (e.kind !== 'hit') continue;
    const u = b.units.find((x) => x.id === e.to);
    if (u && u.alive && u.side === 'hero' && u.owner === undefined && u.id !== except && u.hp < u.maxHp * LOW_HP && !out.includes(u)) out.push(u);
  }
  return out;
}
