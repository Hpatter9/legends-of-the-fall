// Bundles tools/living-fields/plan.ts with esbuild (as tools/balance.mjs does) and runs it.
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
const outdir = `out/living-fields-${process.pid}`;
await esbuild.build({ entryPoints: ['tools/living-fields/plan.ts'], outfile: `${outdir}/plan.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty', '.webp': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/plan.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
