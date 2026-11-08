// Commissioned Council symbols from art-source/expansion/nemesis-icons.png; bundled for offline play.
import type { NewsKind } from './sim/nemesis';
import { RANK_BADGE } from './expansionArt';
import slain from './art/council/slain.png';
import recruit from './art/council/recruit.png';
import promotion from './art/council/promotion.png';
import feud from './art/council/feud.png';
import betrayal from './art/council/betrayal.png';
import feast from './art/council/feast.png';
import trial from './art/council/trial.png';
import oath from './art/council/oath.png';
import desertion from './art/council/desertion.png';
import fled from './art/council/fled.png';
import cheated from './art/council/cheated.png';
import humiliated from './art/council/humiliated.png';
import vengeance from './art/council/vengeance.png';
import reclaimed from './art/council/reclaimed.png';
import duel from './art/council/duel.png';
import token from './art/council/token.png';
import named from './art/relics/bookOfNames.webp';
import muster from './art/relics/warDrum.webp';

/** All nineteen News events have an explicit symbol. Existing commissioned crowns and painted relics
 * fill the four events without a separate News cel; the other fifteen use the Council source sheet. */
export const NEWS_ICON: Readonly<Record<NewsKind, string>> = {
  cheated, recruit, promotion, feud, betrayal, feast, trial, oath, desertion,
  claim: RANK_BADGE.warchief, crowned: RANK_BADGE.warchief, named, slain, muster,
  fled, humiliated, vengeance, reclaimed, duel,
};
export const TROPHY_ICON = token;
export const SMOOTH_COUNCIL_ART = new Set([named, muster]);
