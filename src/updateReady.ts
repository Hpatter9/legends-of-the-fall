// UPDATE-READY (docs/notes/release-fixes-3.md, the rules in `updateReadyRules.ts`): a small standard card on the home screen once a new
// version has installed, "A new version is ready", with Reload. Never in a fight or an assault: the page asks again whenever the home
// screen comes up, and the next cold start is the new version in any case.

import { menuFoot, menuWell, ornateMenu } from './ornateMenu';
import { isNewVersion, updateDue } from './updateReadyRules';

export const UPDATE_WORDS = {
  title: 'A new version is ready',
  line: 'Reload to play it now. Your progress is saved; if you play on, the new version comes with the next start.',
  reload: 'Reload',
  later: 'Later',
};

let ready = false;
let shown = false;
let look: () => { home: boolean; assault: boolean; fighting: boolean; covered: boolean } = () => ({ home: false, assault: true, fighting: true, covered: true });

/** Start listening for a new version's worker (the web build only: the app has none). `where` says where the player is. */
export function watchUpdate(where: typeof look): void {
  look = where;
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
  if (!sw) return;
  const hadController = !!sw.controller;
  sw.addEventListener('controllerchange', () => {
    if (!isNewVersion(hadController)) return;
    ready = true;
    offerUpdate();
  });
}

/** Put the card up if it is due now (called as the new worker takes over, and whenever the home screen comes up). */
export function offerUpdate(): void {
  if (!updateDue({ ready, shown, ...look() })) return;
  shown = true;
  const menu = ornateMenu({ id: 'updateReady', eyebrow: 'The Keep', title: UPDATE_WORDS.title });
  const p = document.createElement('p');
  p.textContent = UPDATE_WORDS.line;
  menuWell(menu.body).append(p);
  menuFoot(menu, { back: { word: UPDATE_WORDS.later }, primary: { label: UPDATE_WORDS.reload, onClick: () => location.reload() } });
}
