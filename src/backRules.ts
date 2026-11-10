// PHONE-BACK (docs/notes/phone-back.md): what the phone's Back does (Android's back button and back gesture, in the browser, the installed
// app and the Android build; and Escape on a desktop). The owner: "The back buttons or actions on a phone shouldn't close the app or back out
// of it. Just back out of the current menu. Or back to the battle tab if they're on the main tabs." Pure: no DOM; `phoneBack.ts` reads the
// page and does what this says.
//
// - Anything open on top (a card, sheet, ornate menu, full page, the hero sheet, Settings, a result or recap card, a tip, a picker): Back
//   closes the topmost, exactly as its own Close or "‹ Back" would (the page presses that button, so any confirm it has comes too).
// - A cinematic or cut-in on top: Back skips it, as a tap does.
// - On a main tab other than Battle: Back goes to the Battle tab.
// - In a fight, a deploy or an Assault: Back opens what the game's own leave or pause control opens; it never drops the run.
// - On the Battle tab with nothing open: Back does nothing, and the game stays.

/** Where the player is, with nothing open on top. */
export type BackPlace = 'home' | 'deploy' | 'fight' | 'assault' | 'other';

/** The page as Back sees it: what is on top (a cinematic, an overlay, or nothing), where the player is, and the home screen's tab. */
export interface BackState {
  top: 'cinematic' | 'overlay' | null;
  place: BackPlace;
  tab?: string;
}

export type BackAction =
  /** Skip the cinematic on top (a tap on it). */
  | { do: 'skip' }
  /** Close the overlay on top (its own Close or "‹ Back"). */
  | { do: 'close' }
  /** Go to the Battle tab. */
  | { do: 'battleTab' }
  /** Open the place's own leave or pause control (a fight's Settings, a deploy's Home, an Assault's pause). */
  | { do: 'pause' }
  /** Nothing: the game stays where it is. */
  | { do: 'none' };

/** What Back does from here. */
export function backAction(s: BackState): BackAction {
  if (s.top === 'cinematic') return { do: 'skip' };
  if (s.top === 'overlay') return { do: 'close' };
  if (s.place === 'home') return s.tab && s.tab !== 'battle' ? { do: 'battleTab' } : { do: 'none' };
  if (s.place === 'deploy' || s.place === 'fight' || s.place === 'assault') return { do: 'pause' };
  return { do: 'none' };
}

/**
 * Every layer of the page Back knows, by the selector that finds it open, with what kind it is and the controls that close it, tried in
 * order (the first one shown is pressed). A layer with none of its controls shown is closed by a plain button of its own that reads as a
 * way out ("‹ Back", "Close", "Continue", "Skip", "Not now"), and failing that by a tap on the layer itself, as a tap skips a cinematic or a
 * tap on the backdrop closes a card. `file` names where it is built, for the audit (`test/phone-back.test.ts`).
 */
export interface BackLayer {
  sel: string;
  kind: 'cinematic' | 'overlay';
  act?: readonly string[];
  file: string;
}

export const BACK_LAYERS: readonly BackLayer[] = [
  // (the cinematics and cut-ins: a tap skips each, where a tap may)
  { sel: '#cutscene:not([hidden])', kind: 'cinematic', act: ['.csSkip'], file: 'render/sceneView.ts' },
  { sel: '.tcLayer:not([hidden])', kind: 'cinematic', file: 'tauntCut.ts' },
  { sel: '.umLayer.live:not([hidden])', kind: 'cinematic', file: 'ultMoment.ts' },
  { sel: '.ecLayer:not([hidden])', kind: 'cinematic', file: 'eidolonCall.ts' },
  { sel: '.dsVeil', kind: 'cinematic', file: 'duelShow.ts' },
  { sel: '#bossCard:not([hidden])', kind: 'cinematic', file: 'main.ts' },
  { sel: '.hlSkip.on', kind: 'cinematic', file: 'hall.ts' },
  { sel: '.tarotReveal', kind: 'cinematic', file: 'summonTarot.ts' },
  { sel: '.earnedArrival', kind: 'cinematic', file: 'earnedArrival.ts' },
  { sel: '.ebLayer', kind: 'cinematic', file: 'eidolonBinding.ts' },
  // (the standard ornate menus: their footer's way out, else their own close)
  { sel: '.omVeil', kind: 'overlay', act: ['.omFoot .omBack'], file: 'ornateMenu.ts' },
  // (the home screen's sheet and full page, Settings and its picker, the summoning collection, the party)
  { sel: '#hmSheet:not([hidden])', kind: 'overlay', file: 'home.ts' },
  { sel: '#hmSub:not([hidden])', kind: 'overlay', act: ['#hmSubBack'], file: 'home.ts' },
  { sel: '.spOverlay', kind: 'overlay', act: ['.spClose'], file: 'settingsPicker.ts' },
  { sel: '#settings:not([hidden])', kind: 'overlay', act: ['.setBack', '#settingsClose'], file: 'settings.ts' },
  { sel: '#gacha:not([hidden])', kind: 'overlay', act: ['#gachaClose'], file: 'gacha.ts' },
  { sel: '#party:not([hidden])', kind: 'overlay', act: ['#ptSheet:not([hidden]) .fsClose', '#ptBack'], file: 'party.ts' },
  // (a fight's cards: a result card's way on, the run's recap, the auto-replay's summary, the ask, a tip, a skill's sheet)
  { sel: '#result:not([hidden])', kind: 'overlay', act: ['#qbLeave:not([hidden])', '#next'], file: 'main.ts' },
  { sel: '#recap:not([hidden])', kind: 'overlay', file: 'recapView.ts' },
  { sel: '#autoSum:not([hidden])', kind: 'overlay', act: ['#asumOk'], file: 'main.ts' },
  { sel: '#ask:not([hidden])', kind: 'overlay', act: ['#askNo'], file: 'main.ts' },
  { sel: '#tip:not([hidden])', kind: 'overlay', act: ['#tipGot'], file: 'tips.ts' },
  { sel: '.fhSheet:not([hidden])', kind: 'overlay', act: ['.fsClose'], file: 'fightHud.ts' },
  // (the cards and pages built before the standard)
  { sel: '.chestShow', kind: 'overlay', file: 'chestStash.ts' },
  { sel: '.dayCard', kind: 'overlay', file: 'dailyView.ts' },
  { sel: '.ecnLayer', kind: 'overlay', file: 'eidolonChainView.ts' },
  { sel: '.qcWrap', kind: 'overlay', file: 'questCard.ts' },
  { sel: '.ulBack', kind: 'overlay', act: ['.ulClose'], file: 'rankUpList.ts' },
  { sel: '.ruBack', kind: 'overlay', file: 'rankUpView.ts' },
  { sel: '.rvCard', kind: 'overlay', file: 'revealCard.ts' },
  { sel: '#shop', kind: 'overlay', act: ['.shopClose'], file: 'shopView.ts' },
  { sel: '#stall', kind: 'overlay', act: ['.hsBack'], file: 'stallView.ts' },
  { sel: '.uiSheet:not([hidden])', kind: 'overlay', act: ['.fsClose'], file: 'unitInfo.ts' },
  { sel: 'dialog.heroArtViewer[open]', kind: 'overlay', act: ['.heroArtClose'], file: 'heroArtwork.ts' },
  { sel: '.twOverlay:not([hidden])', kind: 'overlay', act: ['.twCloseBtn'], file: 'trophyWall.ts' },
  { sel: '#events:not([hidden])', kind: 'overlay', file: 'events.ts' },
];

/** The words of a button that is a way out, when a layer names no control of its own: tried in this order. */
export const WAY_OUT = [/^‹?\s*back\b/i, /^close\b/i, /^not now\b/i, /^skip\b/i, /^continue\b/i, /^done\b/i, /^ok\b/i, /^return\b/i];

/** Which of a layer's buttons, by their words, is its way out: the index of the first that matches the earliest `WAY_OUT` pattern, or -1. */
export function wayOut(words: readonly string[]): number {
  for (const re of WAY_OUT) {
    const i = words.findIndex((w) => re.test(w.trim()));
    if (i >= 0) return i;
  }
  return -1;
}

/** The phone's history guard: one entry the page keeps pushed over its own, so a Back pops that and stays on the page. */
export const GUARD_KEY = 'lotfBack';

/** Whether a history state is the guard. */
export const isGuard = (state: unknown): boolean => !!state && typeof state === 'object' && (state as Record<string, unknown>)[GUARD_KEY] === 1;

/** The state to push for the guard, keeping whatever the page's own entry held. */
export const guardState = (state: unknown): Record<string, unknown> => ({ ...(state && typeof state === 'object' ? (state as Record<string, unknown>) : {}), [GUARD_KEY]: 1 });
