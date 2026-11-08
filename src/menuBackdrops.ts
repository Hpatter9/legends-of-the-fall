// Existing source paintings are bundled for offline play; the ornate menu owns all controls and framing.
import houses from './art/dynasty/houses-backdrop.webp';
import council from './art/dynasty/council-backdrop.webp';

export function menuBackdrop(card: HTMLElement, kind: 'houses' | 'council'): void {
  card.classList.add('paintedMenu');
  card.style.backgroundImage = `linear-gradient(180deg, rgba(12, 14, 10, 0.62), rgba(12, 14, 10, 0.82)), url("${kind === 'houses' ? houses : council}")`;
  card.style.backgroundSize = 'cover';
  card.style.backgroundPosition = 'center';
}
