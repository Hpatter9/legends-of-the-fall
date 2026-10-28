// The page's talking: heroes' quips and Duchess's bleats, glued to the rules (`render/quipRules.ts`), the words (`quipData.ts`)
// and the bubble (`quipView.ts`). Everything goes through one `QuipBox` so the whole page shares one rate limit, and the
// settings' "Hero quips" switch silences the lot (a tap on Duchess still gets its "Mehh."). It only draws; nothing here
// changes the game, and the picks come from a side stream of the save's seed.

import { settings } from './settings';
import { UNITS } from './sim/units';
import { Rng, mixSeed } from './sim/rng';
import { DUCHESS_LINES, type KingKind, type QuipKind } from './quipData';
import { QuipBox } from './render/quipRules';
import { showBanter, showQuip, type Anchor } from './quipView';

const GOAT_SALT = 0xd0a7;
const FIGHT_BUBBLE_SALT = 0xbabb1e;
/** Keep one tenth of combat bubbles, after the usual chances and timing have been applied. */
const FIGHT_BUBBLE_CHANCE = 0.1;
/** The least time (ms) between two of Duchess's own remarks (a tap is always answered). */
export const GOAT_GAP_MS = 9000;

let box = new QuipBox(1, () => settings().quips);
let goatRng = new Rng(mixSeed(1, GOAT_SALT));
let fightBubbleRng = new Rng(mixSeed(1, FIGHT_BUBBLE_SALT));
let goatAt = -Infinity;

const now = () => performance.now();

/** Start the page's quips from the save's seed (the page calls this once the save is loaded). */
export function initQuips(seed: number): void {
  box = new QuipBox(seed, () => settings().quips);
  goatRng = new Rng(mixSeed(seed, GOAT_SALT));
  fightBubbleRng = new Rng(mixSeed(seed, FIGHT_BUBBLE_SALT));
}

/** A new scene (a fight starting, a screen opening): the per-scene count starts over. */
export function newQuipScene(): void {
  box.newScene();
}

/** A hero says their line for a moment, if the rules allow, over `at()`. */
export function heroSays(hero: string, kind: QuipKind, at: () => Anchor | null): void {
  const q = box.say(hero, kind, now());
  if (q && (kind === 'ultimate' || kind === 'lowHp' || kind === 'levelUp') && fightBubbleRng.next() >= FIGHT_BUBBLE_CHANCE) return;
  const a = q && at();
  if (q && a) showQuip(a, q.text, { who: UNITS[hero]?.name });
}

/** A foe grumbles as the fight starts (a short-staffed band most of all). `at(i)` says where the `i`th foe is on the page. */
export function foeGrumbles(foes: number, at: (i: number) => Anchor | null): void {
  const text = box.grumble(foes, now());
  if (text && fightBubbleRng.next() >= FIGHT_BUBBLE_CHANCE) return;
  const a = text && at(0);
  if (text && a) showQuip(a, text, { who: 'A foe' });
}

/** A heart has brought the party back: one of the `heroes` says so. `at(hero)` says where each is on the page. */
export function revivedQuip(heroes: readonly string[], at: (hero: string) => Anchor | null): void {
  const q = box.revive(heroes, now());
  if (q && fightBubbleRng.next() >= FIGHT_BUBBLE_CHANCE) return;
  const a = q && at(q.hero);
  if (q && a) showQuip(a, q.text, { who: UNITS[q.hero]?.name });
}

/** A fight ends: one of the `heroes` has a word, or two trade banter. `at(hero)` says where each is on the page. */
export function endingQuip(heroes: readonly string[], won: boolean, at: (hero: string) => Anchor | null): void {
  const q = box.ending(heroes, won, now());
  if (!q || fightBubbleRng.next() >= FIGHT_BUBBLE_CHANCE) return;
  const first = { at: () => at(q.hero), text: q.text, who: UNITS[q.hero]?.name ?? '' };
  if (q.reply) showBanter(first, { at: () => at(q.reply!.hero), text: q.reply.text, who: UNITS[q.reply.hero]?.name ?? '' });
  else {
    const a = first.at();
    if (a) showQuip(a, first.text, { who: first.who });
  }
}

/** The king speaks in the Last Stand (a wave starting, a boss wave, a hit on him, his health low, a wave cleared, his fall), over `at()`. */
export function kingSays(kind: KingKind, at: () => Anchor | null): void {
  const text = box.king(kind, now());
  if (text && fightBubbleRng.next() >= FIGHT_BUBBLE_CHANCE) return;
  const a = text && at();
  if (text && a) showQuip(a, text, { who: 'The king' });
}

/** A foe at the edge of the field grumbles as a Last Stand wave comes in (one a wave, likelier on a boss wave), over `at()`. */
export function standFoeGrumbles(boss: boolean, at: () => Anchor | null): void {
  const text = box.standFoe(boss, now());
  if (text && fightBubbleRng.next() >= FIGHT_BUBBLE_CHANCE) return;
  const a = text && at();
  if (text && a) showQuip(a, text, { who: 'A foe' });
}

export type GoatKind = keyof Pick<typeof DUCHESS_LINES, 'tap' | 'nibble' | 'bigHit' | 'boss' | 'wipe' | 'won'>;

/** Duchess speaks over `at`. A tap is always answered; her own remarks wait their turn (and the quips setting). */
export function goatSays(kind: GoatKind, at: Anchor): void {
  if (kind !== 'tap') {
    if (!settings().quips || now() - goatAt < GOAT_GAP_MS) return;
  }
  goatAt = now();
  showQuip(at, goatRng.pick(DUCHESS_LINES[kind]), { goat: true, who: 'Duchess' });
}
