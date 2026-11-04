// Bundles tools/skills/lv5Cli.ts with esbuild and runs it (arguments go to the script).
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = `out/lv5-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/skills/lv5Cli.ts'], outfile: `${outdir}/lv5.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/lv5.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
