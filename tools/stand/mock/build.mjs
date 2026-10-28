// STAND-003 phase A: two throwaway builds of the page with the proposed castle-interior art laid over the dungeon land's tile art (`prep.py`
// cuts it from the packs), for the mock-up screenshots (`shots.mjs`). The files in src/art are put back from git when it is done.
//   python3 tools/stand/mock/prep.py ../chronos-assets && node tools/stand/mock/build.mjs
import { copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ART = 'out/stand-mock/art';
const D = 'src/art/areas/dungeon';
const TOUCHED = [`${D}/top1.png`, `${D}/top2.png`, `${D}/high.png`, `${D}/side.png`, `${D}/boulder1.png`, `${D}/boulder2.png`, 'src/art/areas/common/ice.png'];
const variants = { hall: ['rubble1', 'rubble2'], library: ['shelf1', 'shelf2'] };
try {
  for (const [name, [b1, b2]] of Object.entries(variants)) {
    for (const f of ['top1', 'top2', 'high', 'side']) copyFileSync(`${ART}/${f}.png`, `${D}/${f}.png`);
    copyFileSync(`${ART}/${b1}.png`, `${D}/boulder1.png`);
    copyFileSync(`${ART}/${b2}.png`, `${D}/boulder2.png`);
    copyFileSync(`${ART}/walltop.png`, 'src/art/areas/common/ice.png');
    execSync(`node build.mjs --out out/stand-mock/web-${name}`, { stdio: 'inherit' });
  }
} finally {
  execSync(`git checkout -- ${TOUCHED.join(' ')}`);
}
console.log('built out/stand-mock/web-hall and web-library');
