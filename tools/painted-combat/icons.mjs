// Mechanical sheet slicing and import generation; paintings are never drawn here.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const sheets = JSON.parse(readFileSync('tools/painted-combat/icon-sheets.json'));
mkdirSync('out/review', { recursive: true });
for (const [sheet, ids] of Object.entries(sheets)) {
  if (ids.length !== 16) throw new Error(`Expected sixteen icons in ${sheet}`);
  const temp = `out/review/${sheet}-grid.png`;
  execFileSync('magick', [`art-source/ui/painted-combat/${sheet}-source.png`, '-resize', '1280x1280!', temp]);
  ids.forEach((id, i) => execFileSync('magick', [temp, '-crop', `320x320+${i%4*320}+${Math.floor(i/4)*320}`, '+repage', '-trim', '+repage', '-resize', '56x56', '-gravity', 'center', '-background', 'none', '-extent', '64x64', `src/art/ui/combat-icon-${id}.png`]));
}
const ids = ['shield','rush','slash','parry','volley','aim','fireball','firewall','bolt','prayer','arcane','heal',...Object.values(sheets).flat()];
if (new Set(ids).size !== ids.length) throw new Error('Duplicate motif id');
writeFileSync('src/combatArtAssets.ts', `// Painted motifs, from the credited source sheets. Regenerate with tools/painted-combat/icons.mjs.\n${ids.map(id=>`import ${id} from './art/ui/combat-icon-${id}.png';`).join('\n')}\n\nexport const COMBAT_ART: Readonly<Record<string, string>> = {\n  ${ids.join(', ')}\n};\n`);
console.log(`${ids.length} painted motifs imported`);
