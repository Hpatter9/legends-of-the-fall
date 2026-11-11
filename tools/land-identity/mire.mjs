// Bundles tools/land-identity/mire.ts with esbuild (as tools/balance.mjs does) and runs it:
//   node tools/land-identity/mire.mjs [--games 3000]
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
const outdir = `out/land-identity-${process.pid}`;
await esbuild.build({ entryPoints: ['tools/land-identity/mire.ts'], outfile: `${outdir}/mire.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty', '.webp': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/mire.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
