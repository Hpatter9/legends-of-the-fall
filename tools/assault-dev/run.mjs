// Bundles tools/assault-dev/run.ts with esbuild and plays every storming the developer's Try an Assault offers (`docs/notes/assault-dev.md`).
//
//   node tools/assault-dev/run.mjs                       every hold, Last Hold and Warband regrouped, once, "As expected", by Auto
//   node tools/assault-dev/run.mjs --strength strong     the same with the Strong force
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = `out/assault-dev-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/assault-dev/run.ts'], outfile: `${outdir}/run.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/run.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
