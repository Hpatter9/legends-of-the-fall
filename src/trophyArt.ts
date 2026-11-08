// Painted mounted trophies, bundled in game.js for offline play. Sources: art-source/trophies/.
import calBoss1 from './art/trophies/calBoss1.webp';
import calBoss2 from './art/trophies/calBoss2.webp';
import calBoss3 from './art/trophies/calBoss3.webp';
import calBoss4 from './art/trophies/calBoss4.webp';
import calBoss5 from './art/trophies/calBoss5.webp';
import calBoss6 from './art/trophies/calBoss6.webp';
import lichKing from './art/trophies/lichKing.webp';
import oniKing from './art/trophies/oniKing.webp';
import demonLord from './art/trophies/demonLord.webp';
import sapphireColossus from './art/trophies/sapphireColossus.webp';
import forgeTitan from './art/trophies/forgeTitan.webp';
import gorgonQueen from './art/trophies/gorgonQueen.webp';
import orcWarlord from './art/trophies/orcWarlord.webp';
import minotaurChampion from './art/trophies/minotaurChampion.webp';
import nineTails from './art/trophies/nineTails.webp';
import boneCaptain from './art/trophies/boneCaptain.webp';
import hornedOgre from './art/trophies/hornedOgre.webp';
import shamanKing from './art/trophies/shamanKing.webp';
import locked from './art/trophies/locked.webp';

export const TROPHY_ART: Record<string, string> = {
  calBoss1, calBoss2, calBoss3, calBoss4, calBoss5, calBoss6, lichKing, oniKing, demonLord, sapphireColossus, forgeTitan, gorgonQueen, orcWarlord, minotaurChampion, nineTails, boneCaptain, hornedOgre, shamanKing, locked
};

/** A complete mounted keepsake; locked entries use an empty plaque without revealing the spoil. */
export function trophyPicture(id: string, unlocked: boolean): HTMLImageElement {
  const img = document.createElement('img');
  img.className = 'twPainting';
  img.src = TROPHY_ART[unlocked ? id : 'locked'] ?? TROPHY_ART.locked;
  img.alt = '';
  img.draggable = false;
  return img;
}
