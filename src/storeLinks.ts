// STORE-KIT (docs/notes/store-readiness.md): the addresses the store listings and the game both point to. Plain data: no DOM.

/** The privacy policy, `docs/store/privacy-policy.html`, which `build.mjs` copies into out/web as privacy.html for GitHub Pages. An
 *  address of its own (not a page inside the game), so Play Console, Settings and Credits all open the same page; in the app it opens
 *  in the phone's browser. */
export const PRIVACY_URL = 'https://hpatter9.github.io/legends-of-the-fall/privacy.html';
