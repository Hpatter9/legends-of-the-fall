// Generated rows vary slightly in height: find the quietest nearby alpha seam before slicing.
import { readFileSync } from 'node:fs';
const alpha = readFileSync(process.argv[2]);
const rows = [0];
for (let row = 1; row < 8; row++) {
  const target = row * alpha.length / 8;
  let best = Infinity, seam = Math.round(target);
  for (let y = Math.floor(target - 65); y < target + 65; y++) {
    let cost = Math.abs(y - target) * 0.02;
    for (let k = -2; k <= 2; k++) cost += alpha[y + k];
    if (cost < best) { best = cost; seam = y; }
  }
  rows.push(seam);
}
console.log([...rows, alpha.length].join(' '));
