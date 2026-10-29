// Bundles tools/ult-charge/probe.ts with esbuild and runs it (arguments go to the script). The bundle wraps `stepBattle` (in the bundle only,
// the source is untouched) so every tick's events reach the probe while the greedy players run as they are.
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';

const outdir = `out/ult-charge-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
const wrap = {
  name: 'probe-step',
  setup(build) {
    build.onLoad({ filter: /src[\\/]sim[\\/]battle\.ts$/ }, (args) => {
      const src = readFileSync(args.path, 'utf8').replace('export function stepBattle(b: Battle): BattleEvent[] {', 'export function stepBattle(b: Battle): BattleEvent[] {\n  const ev = stepInner(b);\n  (globalThis as any).__ultProbe?.(b, ev);\n  return ev;\n}\nfunction stepInner(b: Battle): BattleEvent[] {');
      return { contents: src, loader: 'ts' };
    });
  },
};
await esbuild.build({ entryPoints: ['tools/ult-charge/probe.ts'], outfile: `${outdir}/probe.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' }, plugins: [wrap] });
const run = spawnSync(process.execPath, [`${outdir}/probe.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
