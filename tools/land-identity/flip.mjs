// Bundles tools/land-identity/flip.ts with esbuild (as tools/balance.mjs does) and runs it:
//   node tools/land-identity/flip.mjs [--games 1800] [--lands swamp]
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
const outdir = `out/land-identity-${process.pid}`;
await esbuild.build({ entryPoints: ['tools/land-identity/flip.ts'], outfile: `${outdir}/flip.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty', '.webp': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/flip.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
