// Quick audit of the army road plans: every theme, many seeds; reports failures, bastions and road widths.
import { boardOk } from '../../src/sim/board';
import { planScenario, SCENARIOS } from '../../src/sim/scenario';
const seeds = Number(process.argv[2] ?? 25);
for (const theme of SCENARIOS) {
  let fail = 0, noBastion = 0, minW = 99, maxW = 0, sections = 0, road = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    try {
      const boss = (n: number) => n === 15 || n === (theme === 'wildwood' ? 5 : 8) || (theme === 'wildwood' && n === 10);
      const p = planScenario(seed, theme, 15, boss);
      for (const s of p.sections) {
        sections++;
        const b = s.board;
        if (!boardOk(b)) fail++;
        if (!s.boss && !b.tiles.some((t) => t.perch)) noBastion++;
        for (let v = 0; v < b.d; v++) {
          const n = b.tiles.slice(v * b.w, v * b.w + b.w).filter((t) => !t.scene).length;
          if (!s.boss) { minW = Math.min(minW, n); maxW = Math.max(maxW, n); }
        }
        road += b.tiles.filter((t) => !t.scene).length / b.tiles.length;
      }
    } catch (e) {
      fail++;
      console.log(theme, seed, (e as Error).message);
    }
  }
  console.log(theme, { fail, noBastion, minW, maxW, roadShare: (road / sections).toFixed(2) });
}
