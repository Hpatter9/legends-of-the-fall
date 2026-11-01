// Bundles tools/lost/measure.ts and runs it. See that file.
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
const outdir = 'out/lostMeasure';
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/lost/measure.ts'], outfile: `${outdir}/measure.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/measure.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(run.status ?? 1);
