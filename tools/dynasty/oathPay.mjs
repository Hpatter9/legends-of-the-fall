// Bundles tools/dynasty/oathPay.ts with esbuild and prints the Legend Oath's pay against its risk (docs/notes/dynasty-7.md).
//   node tools/dynasty/oathPay.mjs [--saves 6] [--runs 4] [--cells 60:1,65:2,90:3] [--only orcs,undead,beasts]
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = 'out/oath-pay';
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/dynasty/oathPay.ts'], outfile: `${outdir}/pay.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/pay.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(run.status ?? 1);
