// The re-toned battle sheets of the human heroes (docs/notes/heritage-looks.md), made offline by
// `tools/heritage/recolour.py` from the sheets beside them and the choices in `src/sim/heroLooks.ts`. Each is bundled
// under its source sheet's key, so `sheets.ts` draws it in the source's place: the layout, the rear view, the grades'
// forms and the portraits all follow. The source sheets stay in the repo as the tool's input.
import knight from '../art/units/hero_soldier_deep.png';
import knightBack from '../art/units/hero_soldier_back_deep.png';
import wizard from '../art/units/hero_res_wizard_brown.png';
import wizardBack from '../art/units/hero_res_wizard_back_brown.png';
import peasant from '../art/units/hero_res_peasant_tan.png';
import peasantBack from '../art/units/hero_res_peasant_back_tan.png';
import paladin from '../art/units/hero_res_paladin_olive.png';
import paladinBack from '../art/units/hero_res_paladin_back_olive.png';
import cleric from '../art/units/hero_res_cleric_deep.png';
import clericBack from '../art/units/hero_res_cleric_back_deep.png';
import ranger from '../art/units/hero_res_ranger_brown.png';
import rangerBack from '../art/units/hero_res_ranger_back_brown.png';
import illusionist from '../art/units/hero_res_illusionist_brown.png';
import illusionistBack from '../art/units/hero_res_illusionist_back_brown.png';
import buccaneer from '../art/units/hero_res_buccaneer_brown.png';
import buccaneerBack from '../art/units/hero_res_buccaneer_back_brown.png';
import timeWitch from '../art/units/hero_res_time_witch_deep.png';
import timeWitchBack from '../art/units/hero_res_time_witch_back_deep.png';
import dragoon from '../art/units/hero_res_dragoon_olive.png';
import dragoonBack from '../art/units/hero_res_dragoon_back_olive.png';
import sage from '../art/units/hero_res_sage_deep.png';
import sageBack from '../art/units/hero_res_sage_back_deep.png';
import lightningMage from '../art/units/hero_res_lightning_mage_brown.png';
import lightningMageBack from '../art/units/hero_res_lightning_mage_back_brown.png';

/** Source sheet key -> its re-toned picture. */
export const HERITAGE_URLS: Record<string, string> = {
  hero_soldier: knight,
  hero_soldier_back: knightBack,
  hero_res_wizard: wizard,
  hero_res_wizard_back: wizardBack,
  hero_res_peasant: peasant,
  hero_res_peasant_back: peasantBack,
  hero_res_paladin: paladin,
  hero_res_paladin_back: paladinBack,
  hero_res_cleric: cleric,
  hero_res_cleric_back: clericBack,
  hero_res_ranger: ranger,
  hero_res_ranger_back: rangerBack,
  hero_res_illusionist: illusionist,
  hero_res_illusionist_back: illusionistBack,
  hero_res_buccaneer: buccaneer,
  hero_res_buccaneer_back: buccaneerBack,
  hero_res_time_witch: timeWitch,
  hero_res_time_witch_back: timeWitchBack,
  hero_res_dragoon: dragoon,
  hero_res_dragoon_back: dragoonBack,
  hero_res_sage: sage,
  hero_res_sage_back: sageBack,
  hero_res_lightning_mage: lightningMage,
  hero_res_lightning_mage_back: lightningMageBack,
};
