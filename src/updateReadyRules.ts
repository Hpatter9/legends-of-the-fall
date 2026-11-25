// UPDATE-READY (docs/notes/release-fixes-3.md): when the card that says a new version is ready may come up. The service worker serves a
// version's own files from the phone (`build.mjs`); a new version's worker installs in the background and takes over, and the game the
// player is in stays the old one until the page is loaded again. So that the owner never waits a start for it, the home screen offers a
// reload. Pure rules: no DOM.
//
// - Only once a new worker has taken over from an old one (not the first visit's worker taking charge: that is no new version).
// - Only on the home screen: never in a fight, or under a card or screen already up.
// - Once a session: "Later" puts it away, and the next cold start is the new version anyway.

export interface UpdateLook {
  /** A new version's worker has taken over this page from an old one. */
  ready: boolean;
  /** The card has come up this session already. */
  shown: boolean;
  /** The home screen is up. */
  home: boolean;
  /** A fight is on (under the home screen too). */
  fighting: boolean;
  /** Screens or cards up (the stack `screens.ts` keeps, and any standard card). */
  covered: boolean;
}

export const updateDue = (l: UpdateLook): boolean => l.ready && !l.shown && l.home && !l.fighting && !l.covered;

/** A worker taking charge is a new version only when one was in charge before it. */
export const isNewVersion = (hadController: boolean): boolean => hadController;
