// docs/samples/new-heroes-contact.png: the twenty new heroes, grade 1 and grade 3 side by side, as the page's portraits are cut
// (the first idle frame, cropped to the figure). Run from the repo root: node tools/more-heroes/contact.mjs
import * as esbuild from 'esbuild';
import { spawnSync, execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

await esbuild.build({ entryPoints: ['tools/more-heroes/roster.ts'], outfile: 'out/roster.cjs', bundle: true, platform: 'node', format: 'cjs', logLevel: 'warning', loader: { '.png': 'empty' } });
const r = spawnSync(process.execPath, ['out/roster.cjs'], { encoding: 'utf8' });
writeFileSync('out/roster.json', r.stdout);
execFileSync('python3', ['-I', 'tools/more-heroes/contact.py', 'out/roster.json', 'docs/samples/new-heroes-contact.png'], { stdio: 'inherit' });
