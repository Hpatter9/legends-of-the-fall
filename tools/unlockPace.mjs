// Bundles tools/unlockPace.ts with esbuild and prints the pace of unlocking heroes for a typical daily player.
//
//   node tools/unlockPace.mjs                 the table (an average of 20 seeds)
//   node tools/unlockPace.mjs --seeds 50      more seeds
//   node tools/unlockPace.mjs --share 0.6     the share of crowns that goes to pulls once the castle is built
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = 'out/unlock-pace';
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/unlockPace.ts'], outfile: `${outdir}/pace.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/pace.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(run.status ?? 1);
