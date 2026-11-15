// Bundles tools/assault-ai/track.ts with esbuild and measures how stuck the heroes get in an assault (`docs/notes/assault-skills.md`).
//
//   node tools/assault-ai/run.mjs [--seeds 8] [--only orcs,undead] [--kind hold|last|regroup]
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = `out/assault-ai-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({ entryPoints: ['tools/assault-ai/track.ts'], outfile: `${outdir}/run.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
const run = spawnSync(process.execPath, [`${outdir}/run.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
