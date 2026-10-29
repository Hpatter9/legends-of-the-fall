// Menu illustrations are separate from the battle animation sheets.
import { ALL_HEROES } from './sim/units';
import { heroTitle } from './sim/heroNames';

export function heroArtwork(kind: string, full = false, awakened = 0): HTMLImageElement {
  if (!ALL_HEROES.includes(kind)) throw new Error(`Unknown hero artwork: ${kind}`);
  const image = document.createElement('img');
  image.className = `heroAnimeArt${awakened ? ' heroAwakenedArt' : ''}`;
  image.src = awakened ? `heroes/awakened-${kind}.webp` : `heroes/${kind}${full ? '' : '-portrait'}.webp`;
  image.alt = `${heroTitle(kind)} — ${awakened ? 'awakened character with legendary gear' : 'anime character artwork'}`;
  image.decoding = 'async';
  image.draggable = false;
  return image;
}

/** Native modal supplies focus containment, Escape and inert background controls. */
export function openHeroArtwork(kind: string, trigger: HTMLElement, awakened = 0): () => void {
  const dialog = document.createElement('dialog');
  dialog.className = 'heroArtViewer';
  dialog.setAttribute('aria-label', `${heroTitle(kind)} full artwork`);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'heroArtClose';
  close.textContent = '× Close';
  close.setAttribute('aria-label', 'Close full artwork');
  const title = document.createElement('h2');
  const illustration = heroArtwork(kind, true);
  title.textContent = heroTitle(kind);
  dialog.append(close, illustration, title);
  const controls: HTMLButtonElement[] = [close];
  if (awakened) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'heroArtForm';
    toggle.textContent = 'Show awakened form';
    toggle.setAttribute('aria-pressed', 'false');
    let showingForm = false;
    toggle.addEventListener('click', () => {
      showingForm = !showingForm;
      const next = heroArtwork(kind, true, showingForm ? awakened : 0);
      illustration.src = next.src;
      illustration.alt = next.alt;
      illustration.className = next.className;
      toggle.textContent = showingForm ? 'Show illustration' : 'Show awakened form';
      toggle.setAttribute('aria-pressed', String(showingForm));
      title.textContent = `${heroTitle(kind)}${showingForm ? ' · Awakened' : ''}`;
    });
    controls.push(toggle);
    dialog.append(toggle);
  }
  const dismiss = () => dialog.close();
  close.addEventListener('click', dismiss);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const at = controls.indexOf(document.activeElement as HTMLButtonElement);
      controls[(at + (event.shiftKey ? controls.length - 1 : 1)) % controls.length].focus();
    }
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
