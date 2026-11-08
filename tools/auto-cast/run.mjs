// Bundles tools/auto-cast/measure.ts with esbuild and runs it (arguments go to the script).
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = `out/auto-cast-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/auto-cast/measure.ts'], outfile: `${outdir}/measure.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty', '.webp': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/measure.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
