// Prints the 45 kits as a markdown table (docs/notes/hero-kits.md): pool, the two skills with cost, strength and gap, and the ultimate's meter and strength.
//   node tools/kits/table.mjs
import { HERO_KITS, RES } from '../../src/sim/heroKits';
import { KITS } from '../../src/sim/abilities';
import { ALL_HEROES, UNITS } from '../../src/sim/units';

const gap = (pool: string, g?: number) => `${((g ?? (pool === 'mana' ? RES.GAP_MANA_MS : RES.GAP_STAM_MS)) / 1000).toFixed(0)}s`;
console.log('| Hero | Pool | Skill 1: cost, strength, gap | Skill 2 (lv 10): cost, strength, gap | Ultimate (lv 30): meter, strength |');
console.log('| --- | --- | --- | --- | --- |');
for (const h of ALL_HEROES) {
  const k = HERO_KITS()[h];
  const u = KITS[h].ultimate!;
  const s2 = `${k.s2.cost}${k.s2.hpCost ? ` + ${k.s2.hpCost * 100}% hp` : ''}`;
  console.log(`| ${UNITS[h].name} | ${k.pool} | ${k.s1.skill.name}: ${k.s1.cost}, x${k.s1.tune}, ${gap(k.pool, k.s1.gap)} | ${k.s2.skill.name}: ${s2}, x${k.s2.tune}, ${gap(k.pool, k.s2.gap)} | ${u.name}: x${u.tuned!.rate}, x${u.tuned!.power} |`);
}
