// When a hero speaks, and what they say: pure rules (no DOM, no clock of their own) for the speech bubbles. A `QuipBox` picks a
// line for a moment (hired, placed, won, lost) or a bit of banter between two heroes who share a trait, and rate-limits
// them so the screen is never crowded: at most one bubble per `GAP_MS`, a few per scene,
// and a hero's "first placed" only once a scene. Each pick has a chance, drawn from a side stream of the seed, so a quiet
// game stays quiet and nothing here touches the fight's own stream. The settings can switch them all off.

import { Rng, mixSeed } from '../sim/rng';
import { BANTER, FOE_GRUMBLES, HERO_QUIPS, type QuipKind } from '../quipData';
import { traitsOf } from '../sim/traits';

/** The least time (ms) between two bubbles. */
export const GAP_MS = 5000;
/** The most bubbles in one scene (a fight, or a visit to a screen). */
export const SCENE_MAX = 5;
/** How likely each moment is to get a line at all. */
export const CHANCE: Record<QuipKind, number> = { hired: 0.7, placed: 0.5, won: 0.9, lost: 0.9 };
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
  private grumbled = false;

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
    this.grumbled = false;
  }

  private allowed(now: number, urgent: boolean): boolean {
    if (!this.enabled() || this.shown >= SCENE_MAX) return false;
    return urgent || now - this.lastAt >= GAP_MS;
  }

  private line(hero: string, kind: QuipKind): string | null {
    const q = HERO_QUIPS[hero]?.[kind];
    return q ?? null;
  }

  /** A line for a hero at a moment, or null (quiet, too soon, too many, off, or no lines for this hero). A win or a loss may speak inside the gap, once. */
  say(hero: string, kind: QuipKind, now: number): Quip | null {
    const urgent = kind === 'won' || kind === 'lost';
    if (!this.allowed(now, urgent)) return null;
    if (kind === 'placed') {
      if (this.placedSaid.has(hero)) return null;
      this.placedSaid.add(hero);
    }
    if (this.rng.next() >= CHANCE[kind]) return null;
    const text = this.line(hero, kind);
    if (!text) return null;
    this.lastAt = now;
    this.shown++;
    return { hero, text };
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
