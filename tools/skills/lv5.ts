// The skills overhaul's batch 5 (docs/notes/skills-5.md): which Level 5 step each skill takes, by the design's rule (section 5): a skill that
// makes several things makes one more (it reads the `extra` talent), one that reaches reaches a tile further (`reach`), any other lasts 15%
// longer again (`dur`); a skill that reads none of them (a plain blow, a heal) hits harder again instead (`pow`). Each hero's three skills are
// cast in a few set cases (foes near and far, a friend and the caster hurt) and the talent keys the cast reads are noted.
// `src/sim/kits/lv5.ts` is this table written out (`node tools/skills/lv5.mjs --write`); `test/skill-levels.test.ts` holds the two together.

import { addUnit, startBattle, type Battle, type BattleEvent, type Unit } from '../../src/sim/battle';
import { keyOf, powered } from '../../src/sim/abilities';
import { emptyStats } from '../../src/sim/equipment';
import { HERO_KITS } from '../../src/sim/heroKits';
import { ALL_HEROES } from '../../src/sim/units';
import type { Lv5Step } from '../../src/sim/skillLevels';

function arena(): Battle {
  const b = startBattle(3);
  for (const t of b.board.tiles) {
    t.h = 0;
    delete t.rock;
    delete t.wall;
    delete t.barrel;
    delete t.bridge;
    delete t.ground;
    delete t.bush;
  }
  delete b.barrels;
  delete b.groundFx;
  delete b.walk;
  delete b.fog;
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  b.t = 10000;
  return b;
}

/** The set cases: where the foes stand, and who is hurt. */
const CASES: { foes: [number, number][]; hurt: boolean }[] = [
  { foes: [[3, 6], [4, 6], [2, 5], [3, 4], [5, 3]], hurt: true },
  { foes: [[3, 3], [4, 2], [2, 2]], hurt: false },
  { foes: [[3, 6]], hurt: true },
];

/** The talent keys a hero's skill in `slot` (0, 1, 2) reads while it is cast in any of the cases. */
export function keysRead(kind: string, slot: number): Set<string> {
  const read = new Set<string>();
  const s = HERO_KITS()[kind].slots[slot];
  for (const c of CASES) {
    const b = arena();
    const tal = new Proxy({} as Record<string, number>, { get: (_t, k) => (typeof k === 'string' && read.add(k), undefined) });
    const me: Unit = addUnit(b, kind, 3, 7, { level: 30, equip: { ...emptyStats(), tal } });
    const ally = addUnit(b, 'archer', 4, 8, { level: 1 });
    for (const [u, v] of c.foes) {
      const f = addUnit(b, 'orcGrunt', u, v);
      f.maxHp = f.hp = 50000;
    }
    if (c.hurt) {
      me.hp = Math.round(me.maxHp * 0.3);
      ally.hp = Math.round(ally.maxHp * 0.3);
    }
    const out: BattleEvent[] = [];
    try {
      powered(b, me, s.skill, s.tune - 1, out);
    } catch {
      /* a case the skill was not made for */
    }
  }
  return read;
}

/** The step the rule gives a skill from the keys it reads. */
export const stepOf = (read: Set<string>): Lv5Step => (read.has('extra') ? 'extra' : read.has('reach') ? 'reach' : read.has('dur') ? 'dur' : 'pow');

/** Every hero skill's step, by its key. */
export function lv5Table(): Record<string, Lv5Step> {
  const out: Record<string, Lv5Step> = {};
  for (const kind of ALL_HEROES) {
    const kit = HERO_KITS()[kind];
    if (!kit) continue;
    kit.slots.forEach((s, i) => (out[keyOf(s.skill)] ??= stepOf(keysRead(kind, i))));
  }
  return out;
}
