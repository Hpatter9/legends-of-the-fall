// Bundles tools/battle-feel/dailyBand.ts with esbuild and runs it (arguments go to the script).
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = `out/dband-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/battle-feel/dailyBand.ts'], outfile: `${outdir}/dailyBand.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/dailyBand.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
