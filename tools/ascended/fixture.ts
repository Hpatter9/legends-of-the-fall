// Review-only pure data; the production game never imports this module.
export { ALL_HEROES, UNITS } from '../../src/sim/units';
export { newRun } from '../../src/sim/run';
export { tileAt } from '../../src/sim/board';
export { startedMeta } from '../../src/sim/meta';
export { ORE_TRAITS } from '../../src/sim/awakenMats';
export { battleSheet, combatAuraStep } from '../../src/render/awakenLook';
export { HERO_NAMES } from '../../src/sim/heroNames';
export { auraOf } from '../../src/render/auraStyles';
import upgraded from '../../src/art/awakened/manifest.json';
import original from '../../src/art/units/sheets.json';
export const layout = { ...original, ...upgraded.layouts };
