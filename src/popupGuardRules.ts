// POPUP-GUARD (docs/notes/popup-guard.md): the one rule for a popup the game raises, kept free of the DOM so a test can read it; the page's
// side is `popupGuard.ts`. The owner: "Don't let popups get skipped during a wave by tapping off of them. Sometimes I'm tapping
// pre-emptively to start the next wave and a popup flashes by; I never get to see what it said."
//
// - A popup with something to read is never closed by a tap outside it or on its backdrop. It closes by its own button, by the phone's
//   Back (`backRules.ts`) or by Escape.
// - It ignores every tap for a short moment after it appears (`GUARD_MS`), so a tap already on its way does not press its button; its
//   buttons are dimmed for that moment, then lit.
// - A tap whose finger went down before the popup appeared does nothing: it neither closes the popup nor presses what is beneath it.
// - A timed notice with something to read stays long enough to read it (`readMs`), waits its turn in a queue, and is not sent away by a
//   tap elsewhere.
// - A cinematic or a cut-in keeps its tap to skip: none of this touches one.
// The rule holds while a run is going (a deploy, a fight, between waves, a wave's result, a run's end, the Last Stand, an Assault); a
// popup marked `always` is one only the game raises, and is guarded on the home screen too. A menu the player opened themselves
// (`data-asked`: the Auto card, a relic's card) is left as it was.

/** How long a popup ignores every tap after it appears: long enough to hold a tap already on its way (and the second of an eager pair),
 *  gone before a reader's thumb gets there. */
export const GUARD_MS = 500;

/** A popup the guard watches: the selector that finds it open, and what the guard needs to know of it. `file` names where it is built,
 *  for the audit (`test/popup-guard.test.ts`). */
export interface GuardedPopup {
  sel: string;
  /** Its root is its own backdrop: a tap on the root itself, not on anything in it, is a tap outside the popup. */
  veil?: boolean;
  /** Guarded wherever it shows (a popup only the game raises); the rest are guarded while a run is going. */
  always?: boolean;
  file: string;
}

/** Every popup the game raises with something to read (the cinematics are not here: a tap skips one). */
export const GUARDED: readonly GuardedPopup[] = [
  // (the standard ornate menus the game raises: the duel's challenge, the gate's, Quest complete, the Lectern and the Anvil, the scouts'
  // report, an Assault's result. One the player opened says so, `data-asked`, and is left alone)
  { sel: '.omVeil:not([data-asked])', veil: true, file: 'ornateMenu.ts' },
  // (a fight's cards: the wave's result and the short card over the march, the run's recap, the auto-replay's summary, a tip, the road's events)
  { sel: '#result:not([hidden])', always: true, file: 'main.ts' },
  { sel: '#recap:not([hidden])', always: true, file: 'recapView.ts' },
  { sel: '#autoSum:not([hidden])', always: true, file: 'main.ts' },
  { sel: '#tip:not([hidden])', file: 'tips.ts' },
  { sel: '#events:not([hidden])', file: 'events.ts' },
  // (rewards and reveals: a chest opened, a film's end card, an Eidolon's piece)
  { sel: '.chestShow', always: true, file: 'chestStash.ts' },
  { sel: '.rvCard', always: true, file: 'revealCard.ts' },
  { sel: '.ecnLayer', veil: true, file: 'eidolonChainView.ts' },
  // (the spire's and the Calamity's cards over the map, and the Last Stand's choice and its end)
  { sel: '.rtCardWrap', file: 'towerView.ts' },
  { sel: '.stChoice', file: 'standView.ts' },
  { sel: '.stEnd', always: true, file: 'standView.ts' },
  // (three that name something and went at the first tap, with no moment of their own: the boss's card, an act's intro, a duel's walk-in.
  // A tap still skips each, once it has been up for the guard's moment. The other cinematics keep their own skip rules)
  { sel: '#bossCard:not([hidden])', file: 'main.ts' },
  { sel: '.rtIntro', file: 'towerView.ts' },
  { sel: '.dsVeil', file: 'duelShow.ts' },
];

/** What the guard knows of one tap's event. */
export interface TapFacts {
  /** The finger going down, lifting, or the click the tap makes. */
  type: 'down' | 'up' | 'click';
  /** A guarded popup is open that appeared less than `GUARD_MS` ago. */
  young: boolean;
  /** The finger went down before the newest guarded popup appeared (a click only: the tap was aimed at what was there before). */
  downBefore: boolean;
  /** This tap's finger going down was itself swallowed: the rest of the tap goes with it. */
  downDead: boolean;
  /** The event lands on a guarded popup's backdrop: outside the popup. */
  onVeil: boolean;
}

/** Whether a tap's event is swallowed ('dead') or goes on to the page ('pass'). */
export function tapVerdict(f: TapFacts): 'dead' | 'pass' {
  // (a tap begun on a popup not yet ready is dead to its end, however long the finger stays down)
  if (f.downDead) return 'dead';
  if (f.type === 'up') {
    // (a finger that went down on the page before the popup came is let up, so a drag under way ends as it should; its click is not)
    return 'pass';
  }
  if (f.young) return 'dead';
  if (f.type === 'click' && f.downBefore) return 'dead';
  if (f.onVeil) return 'dead';
  return 'pass';
}

/** How long a timed notice of these words stays, in ms: a floor of about two seconds, then longer with its length (a reader's four or
 *  five words a second), and a ceiling so a queue of them still moves. */
export const READ_MIN_MS = 2400;
export const READ_MAX_MS = 7000;
export function readMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(Math.min(READ_MAX_MS, Math.max(READ_MIN_MS, 900 + words * 260)));
}
