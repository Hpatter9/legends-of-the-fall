// Bundles tools/xp-split/split.ts with esbuild and prints what the kill-XP split does (`KILL_KEEP`).
//
//   node tools/xp-split/split.mjs [--seeds 8] [--keeps 1,0.5,0.4]
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = 'out/xp-split';
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/xp-split/split.ts'], outfile: `${outdir}/split.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/split.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(run.status ?? 1);
