// Bundles tools/levelPace.ts with esbuild and prints the pace of levelling a favourite hero for a typical daily player.
//
//   node tools/levelPace.mjs                 the table (an average of 20 seeds)
//   node tools/levelPace.mjs --seeds 50      more seeds
//   node tools/levelPace.mjs --share 0.6     the share of crowns that goes to pulls once the castle is built
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = 'out/level-pace';
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/levelPace.ts'], outfile: `${outdir}/pace.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/pace.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(run.status ?? 1);
