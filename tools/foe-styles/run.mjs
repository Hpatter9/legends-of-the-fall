// Bundles one of the foe styles's measuring scripts (tools/foe-styles/<name>.ts) with esbuild and runs it (arguments go to the script).
//   node tools/foe-styles/run.mjs voltara [seeds]      Voltara's level-40 trial over seeds 2003 on (the eidolon-chain-4 party)
//   node tools/foe-styles/run.mjs first [saves]        a fresh party's first wave lost, over saves
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const [name, ...rest] = process.argv.slice(2);
const outdir = `out/foe-styles-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: [`tools/foe-styles/${name}.ts`], outfile: `${outdir}/run.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/run.cjs`, ...rest], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
