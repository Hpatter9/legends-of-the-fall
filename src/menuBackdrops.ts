// Existing source paintings are bundled for offline play; the ornate menu owns all controls and framing.
import houses from './art/dynasty/houses-backdrop.webp';
import council from './art/dynasty/council-backdrop.webp';
// (the Assault's phase 5: the Council's hall once the War has ended, its seats burning)
import councilFallen from './art/dynasty/council-fallen-backdrop.webp';
import { AmbientLayer } from './render/ambientLayer';
import { SCENE_LIFE } from './render/ambientScenes';

const PAINTINGS = { houses, council, councilFallen } as const;
/** The veil over each painting, top to bottom: dark enough for the card's words to read over it. The burning hall's is light, so its fire
 *  shows; its board puts a darker band behind its words instead (`.nmEnded` in nemesis.css). */
const VEILS: Record<keyof typeof PAINTINGS, readonly [number, number]> = { houses: [0.62, 0.82], council: [0.62, 0.82], councilFallen: [0.16, 0.42] };

export function menuBackdrop(card: HTMLElement, kind: keyof typeof PAINTINGS): void {
  const art = PAINTINGS[kind];
  card.classList.add('paintedMenu');
  const [top, foot] = VEILS[kind];
  card.style.backgroundImage = `linear-gradient(180deg, rgba(12, 14, 10, ${top}), rgba(12, 14, 10, ${foot})), url("${art}")`;
  card.style.backgroundSize = 'cover';
  card.style.backgroundPosition = 'center';
  // (ALIVE: the painting's light under the card's content: its candles or braziers gutter, embers and dust drift; light only, as the
  //  painting lies under the card's veil)
  card.prepend(new AmbientLayer(SCENE_LIFE[kind], art, { fit: 'cover' }, 'ambMenu').root);
}
