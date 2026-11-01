// Prints each hero skill's Level 5 step (`lv5.ts`), and with --write writes `src/sim/kits/lv5.ts`.
import { writeFileSync } from 'node:fs';
import { lv5Table } from './lv5';

const table = lv5Table();
const count: Record<string, number> = {};
for (const s of Object.values(table)) count[s] = (count[s] ?? 0) + 1;
console.log(count);
if (process.argv.includes('--write')) {
  const rows = Object.entries(table)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, s]) => `  ${/^[A-Za-z]\w*$/.test(k) ? k : k.includes("'") ? JSON.stringify(k) : `'${k}'`}: '${s}',`);
  writeFileSync(
    'src/sim/kits/lv5.ts',
    `// Each hero skill's Level 5 step (the skills overhaul's batch 5, \`skillLevels.ts\`), by key. Written by \`node tools/skills/lv5.mjs --write\`, which
// casts every skill and notes which talents it reads; \`test/skill-levels.test.ts\` holds the two together.
import type { Lv5Step } from '../skillLevels';

export const LV5: Readonly<Record<string, Lv5Step>> = {
${rows.join('\n')}
};
`,
  );
} else console.log(table);
