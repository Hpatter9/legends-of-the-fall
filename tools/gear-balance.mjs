// Bundles tools/gear-balance.ts with esbuild and prints the equipment balance check (`npm run gear-balance`).
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = 'out/gear-balance';
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/gear-balance.ts'], outfile: `${outdir}/run.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
process.exit(spawnSync(process.execPath, [`${outdir}/run.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' }).status ?? 1);
