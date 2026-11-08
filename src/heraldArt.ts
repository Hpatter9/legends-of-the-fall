// Sprite-matched Calamity herald paintings, bundled for offline play.
import calBoss1 from './art/heralds/calBoss1.webp';
import calBoss1Face from './art/heralds/calBoss1-face.webp';
import calBoss2 from './art/heralds/calBoss2.webp';
import calBoss2Face from './art/heralds/calBoss2-face.webp';
import calBoss3 from './art/heralds/calBoss3.webp';
import calBoss3Face from './art/heralds/calBoss3-face.webp';
import calBoss4 from './art/heralds/calBoss4.webp';
import calBoss4Face from './art/heralds/calBoss4-face.webp';
import calBoss5 from './art/heralds/calBoss5.webp';
import calBoss5Face from './art/heralds/calBoss5-face.webp';
import calBoss6 from './art/heralds/calBoss6.webp';
import calBoss6Face from './art/heralds/calBoss6-face.webp';

export const HERALD_ART: Readonly<Record<string, string>> = { calBoss1, calBoss2, calBoss3, calBoss4, calBoss5, calBoss6 };
export const HERALD_FACE: Readonly<Record<string, string>> = { calBoss1: calBoss1Face, calBoss2: calBoss2Face, calBoss3: calBoss3Face, calBoss4: calBoss4Face, calBoss5: calBoss5Face, calBoss6: calBoss6Face };

/** Returns no image for other bosses; the caller retains its existing sprite presentation. */
export function heraldPortrait(id: string, cls: string, face = false): HTMLImageElement | null {
  const url = (face ? HERALD_FACE : HERALD_ART)[id];
  if (!url) return null;
  const img = document.createElement('img');
  img.src = url;
  img.className = cls;
  img.alt = '';
  img.draggable = false;
  return img;
}
