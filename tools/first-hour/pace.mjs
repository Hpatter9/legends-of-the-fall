// Bundles tools/first-hour/pace.ts with esbuild and prints how a new save (a three-hero starter pack) fares on the first army.
//
//   node tools/first-hour/pace.mjs [--saves 40] [--tries 12]      (BOT_SPELLS=0 plays without the king's spells)
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = 'out/first-hour-pace';
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/first-hour/pace.ts'], outfile: `${outdir}/pace.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/pace.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(run.status ?? 1);
