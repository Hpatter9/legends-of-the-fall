// Existing source paintings are bundled for offline play; the ornate menu owns all controls and framing.
import houses from './art/dynasty/houses-backdrop.webp';
import council from './art/dynasty/council-backdrop.webp';
import { AmbientLayer } from './render/ambientLayer';
import { SCENE_LIFE } from './render/ambientScenes';

export function menuBackdrop(card: HTMLElement, kind: 'houses' | 'council'): void {
  card.classList.add('paintedMenu');
  card.style.backgroundImage = `linear-gradient(180deg, rgba(12, 14, 10, 0.62), rgba(12, 14, 10, 0.82)), url("${kind === 'houses' ? houses : council}")`;
  card.style.backgroundSize = 'cover';
  card.style.backgroundPosition = 'center';
  // (ALIVE: the painting's light under the card's content: its candles or braziers gutter, embers and dust drift; light only, as the
  //  painting lies under the card's veil)
  card.prepend(new AmbientLayer(SCENE_LIFE[kind], kind === 'houses' ? houses : council, { fit: 'cover' }, 'ambMenu').root);
}
