// Print a scenario's sections as text: '.' road, '#' scenery (its first letter), 'R' rock, 'W' wall, '=' bridge, '~' water, 'P' perch, '^' ramp.
import { planScenario, type ScenarioId } from '../../src/sim/scenario';
const [theme, seed = '11', only] = process.argv.slice(2);
const boss = (n: number) => n === 15 || n === (theme === 'wildwood' ? 5 : 8) || (theme === 'wildwood' && n === 10);
const p = planScenario(Number(seed), theme as ScenarioId, 15, boss);
for (const s of p.sections) {
  if (only && !only.split(',').includes(String(s.wave))) continue;
  console.log(`wave ${s.wave} join ${s.join} rot ${s.rot}${s.boss ? ' BOSS' : ''} pieces ${JSON.stringify(s.board.pieces ?? [])}`);
  const b = s.board;
  for (let v = 0; v < b.d; v++) {
    let row = '';
    for (let u = 0; u < b.w; u++) {
      const t = b.tiles[v * b.w + u];
      row += t.scene ? t.scene[0].toUpperCase() === 'W' && t.scene === 'water' ? '~' : t.scene[0] : t.perch ? 'P' : t.ramp ? '^' : t.bridge ? '=' : t.rock ? 'R' : t.wall ? 'W' : t.barrel ? 'B' : t.ground === 'lava' ? 'L' : t.ground === 'water' ? '~' : t.ground === 'shrine' ? '+' : t.paved ? ',' : '.';
    }
    console.log(row + '   ' + b.tiles.slice(v * b.w, v * b.w + b.w).map((t) => t.h.toString(36)).join(''));
  }
}
