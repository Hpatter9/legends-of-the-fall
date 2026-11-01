// Bundles tools/run-gear/sweep.ts with esbuild and prints the modes' sweep (`node tools/run-gear/sweep.mjs -- --attempts 40`).
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = `out/run-gear-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/run-gear/sweep.ts'], outfile: `${outdir}/run.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
const r = spawnSync(process.execPath, [`${outdir}/run.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(r.status ?? 1);
