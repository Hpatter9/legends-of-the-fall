// REMOVE-DYNASTY: a save from before the removal, with the Dynasties' record in it (two bearers of the knight's line slain under the
// Legend Oath, the House in mourning, an heirloom, a Shade on the War Horn, a mentor seated as an elder), for the screenshots
// (`shots.mjs`). The same shape as the fixture in test/remove-dynasty.test.ts.
import { startedMeta } from '../../src/sim/meta';
import { xpFor } from '../../src/sim/levels';
import { EQUIP_BASE_IDS, equipItem, grantEquipment } from '../../src/sim/equipment';
import { ALL_HEROES } from '../../src/sim/units';

export function oldSave(): Record<string, unknown> {
  const m = startedMeta(41);
  m.unlocked = ALL_HEROES.slice(0, 12);
  m.heroesSeen = [...m.unlocked];
  m.slotsTold = 4;
  for (const k of m.unlocked) m.xp[k] = xpFor(40);
  m.xp.knight = xpFor(72);
  m.xp.samurai = xpFor(65);
  m.crowns = 4200;
  const sword = grantEquipment(m, { base: EQUIP_BASE_IDS[0], rarity: 3, level: 10 });
  equipItem(m, 'knight', sword.id);
  const raw = JSON.parse(JSON.stringify(m)) as Record<string, unknown>;
  raw.dynasty = {
    v: 1, start: 20260801, told: 3, regulars: ['samurai'], scenes: ['knight+samurai'],
    lines: {
      knight: {
        current: 2, mourning: 99999,
        bearers: [
          { name: 'Kwame', gen: 1, served: 11, fate: 'shade' },
          { name: 'Ama', gen: 2, served: 4, fate: 'fallen', slainBy: 7, legend: 3, birthright: 'samurai', look: 'gilt' },
          { name: 'Yaw', gen: 3, served: 0, foundling: true },
        ],
      },
      samurai: { current: 1, bearers: [{ name: 'Kenji', gen: 1, served: 12, fate: 'mentor' }, { name: 'Ren', gen: 2, served: 1 }] },
    },
  };
  raw.mentors = { martial: { kind: 'samurai', since: 1, heir: true } };
  (raw.equipment as { id: number; heirloom?: unknown }[]).find((x) => x.id === sword.id)!.heirloom = { marks: 2, house: 'knight', bearer: 'Yaw' };
  raw.eidolons = { horn: 1000, bound: ['askel'], chosen: 'askel', shade: 'knight:0', confirmed: true };
  return raw;
}
