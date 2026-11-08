// The names of every effect the audit feeds the renderer (bundled into the page by audit.mjs; not part of the shipped game).
import { SIGNATURES } from '../../src/render/signatures';
import { SKILL_FX } from '../../src/render/skillFx';
import { MOVE_PAINT, AREA_PAINT } from '../../src/render/movePaints';
import { KIT_LOOKS } from '../../src/render/kitLooks';
import { EIDOLONS } from '../../src/sim/eidolons';
import { HAZARD_LOOKS } from '../../src/render/hazardLooks';
import catalogue from '../../src/art/fx/abilities/catalogue.json';
(window as unknown as Record<string, unknown>).__lists = {
  skills: [...new Set([...catalogue.filter((r) => r.id.startsWith('skill:')).map((r) => r.name), ...Object.keys(SIGNATURES), ...Object.keys(SKILL_FX), ...Object.keys(MOVE_PAINT), ...Object.keys(AREA_PAINT), ...Object.keys(KIT_LOOKS)])],
  eidolons: EIDOLONS.map((e) => e.id),
  hazards: Object.keys(HAZARD_LOOKS),
};
