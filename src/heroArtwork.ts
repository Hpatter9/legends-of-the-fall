// Menu illustrations are separate from the battle animation sheets.
import { ALL_HEROES } from './sim/units';
import { heroTitle } from './sim/heroNames';

export function heroArtwork(kind: string, full = false): HTMLImageElement {
  if (!ALL_HEROES.includes(kind)) throw new Error(`Unknown hero artwork: ${kind}`);
  const image = document.createElement('img');
  image.className = 'heroAnimeArt';
  image.src = `heroes/${kind}${full ? '' : '-portrait'}.webp`;
  image.alt = `${heroTitle(kind)} — anime character artwork`;
  image.decoding = 'async';
  image.draggable = false;
  return image;
}

/** Native modal supplies focus containment, Escape and inert background controls. */
export function openHeroArtwork(kind: string, trigger: HTMLElement): () => void {
  const dialog = document.createElement('dialog');
  dialog.className = 'heroArtViewer';
  dialog.setAttribute('aria-label', `${heroTitle(kind)} full artwork`);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'heroArtClose';
  close.textContent = '× Close';
  close.setAttribute('aria-label', 'Close full artwork');
  const title = document.createElement('h2');
  title.textContent = heroTitle(kind);
  dialog.append(close, heroArtwork(kind, true), title);
  const dismiss = () => dialog.close();
  close.addEventListener('click', dismiss);
  dialog.addEventListener('keydown', event => {
    // The close button is the viewer's only control; keep Tab and Shift+Tab on it.
    if (event.key === 'Tab') { event.preventDefault(); close.focus(); }
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismiss();
    }
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (trigger.isConnected) trigger.focus({ preventScroll: true });
  }, { once: true });
  document.body.append(dialog);
  dialog.showModal();
  close.focus();
  return () => { dialog.close(); dialog.remove(); };
}
