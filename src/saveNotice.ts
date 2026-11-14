// GUARDED-SAVES (docs/notes/guarded-saves.md): what the player is told when the game cannot save (`sim/saveGuard.ts` catches the failed
// write, and the game plays on from memory) or when the save on the phone could not be read (it is kept aside, not thrown away, and
// the Keep starts afresh). Each is a standard ornate card; the save's trouble is told once a session, however many saves then fail.

import { menuFoot, menuWell, ornateMenu } from './ornateMenu';
import { onSaveTrouble, type SaveTrouble } from './sim/saveGuard';

/** The words of each card (pure: the test reads them). */
export const SAVE_WORDS: Record<SaveTrouble, { title: string; lines: string[] }> = {
  full: {
    title: 'Progress can’t be saved',
    lines: [
      'Your phone’s storage is full: progress can’t be saved until space is freed.',
      'You can play on. The game tries again at every save, so what you do is kept once there is room.',
    ],
  },
  refused: {
    title: 'Progress can’t be saved',
    lines: [
      'This phone is not letting the game save (its storage may be switched off, or this is a private window).',
      'You can play on, but what you do now may be lost when the game is closed.',
    ],
  },
};

export const UNREADABLE_WORDS = {
  title: 'Your save could not be read',
  kept: 'The saved game on this phone is damaged, so the Keep begins afresh. The old save has not been thrown away: it is kept on this phone, untouched, in case it can be mended.',
  lost: 'The saved game on this phone is damaged, so the Keep begins afresh. The old save could not be kept aside (the phone’s storage is full).',
};

export const RUN_UNREADABLE_WORDS = {
  title: 'Your run could not be read',
  kept: 'The run in progress on this phone is damaged, so it cannot go on. Your heroes, crowns and castle are safe. The run has not been thrown away: it is kept on this phone, untouched, in case it can be mended.',
  lost: 'The run in progress on this phone is damaged, so it cannot go on. Your heroes, crowns and castle are safe. The run could not be kept aside (the phone’s storage is full).',
};

let told = false;

/** Listen for a failed save from now on: the first one puts up the card, the rest pass quietly. */
export function watchSaves(): void {
  onSaveTrouble((why) => {
    if (told) return;
    told = true;
    // (after the moment: a save fails inside the game's own flow, which goes on first)
    setTimeout(() => {
      const words = SAVE_WORDS[why];
      const menu = ornateMenu({ id: 'saveTrouble', eyebrow: 'The Keep’s records', title: words.title });
      const well = menuWell(menu.body);
      for (const line of words.lines) {
        const p = document.createElement('p');
        p.textContent = line;
        well.append(p);
      }
      menuFoot(menu, { back: { word: 'close' } });
    }, 0);
  });
}

/** Tell the player their save (or, `what` 'run', their run in progress) could not be read (`kept`: its text is kept aside). Resolves when the
 *  card is closed. */
export function tellUnreadable(kept: boolean, what: 'save' | 'run' = 'save'): Promise<void> {
  const words = what === 'run' ? RUN_UNREADABLE_WORDS : UNREADABLE_WORDS;
  return new Promise((done) => {
    const menu = ornateMenu({ id: what === 'run' ? 'runUnreadable' : 'saveUnreadable', eyebrow: 'The Keep’s records', title: words.title, onClose: done });
    const p = document.createElement('p');
    p.textContent = kept ? words.kept : words.lost;
    menuWell(menu.body).append(p);
    menuFoot(menu, { primary: { label: what === 'run' ? 'Carry on' : 'Begin afresh', onClick: () => menu.close() } }).primary?.focus();
  });
}
