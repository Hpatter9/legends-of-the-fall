// Existing source paintings are bundled for offline play; the ornate menu owns all controls and framing.
import houses from './art/dynasty/houses-backdrop.webp';
import council from './art/dynasty/council-backdrop.webp';
// (the Assault's phase 5: the Council's hall once the War has ended, its seats burning)
import councilFallen from './art/dynasty/council-fallen-backdrop.webp';
import { AmbientLayer } from './render/ambientLayer';
import { SCENE_LIFE } from './render/ambientScenes';

const PAINTINGS = { houses, council, councilFallen } as const;

export function menuBackdrop(card: HTMLElement, kind: keyof typeof PAINTINGS): void {
  const art = PAINTINGS[kind];
  card.classList.add('paintedMenu');
  card.style.backgroundImage = `linear-gradient(180deg, rgba(12, 14, 10, 0.62), rgba(12, 14, 10, 0.82)), url("${art}")`;
  card.style.backgroundSize = 'cover';
  card.style.backgroundPosition = 'center';
  // (ALIVE: the painting's light under the card's content: its candles or braziers gutter, embers and dust drift; light only, as the
  //  painting lies under the card's veil)
  card.prepend(new AmbientLayer(SCENE_LIFE[kind], art, { fit: 'cover' }, 'ambMenu').root);
}
