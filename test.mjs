// Bundles test/*.test.ts and runs them with Node's built-in test runner.
//
//   npm test               every file
//   npm test -- battle     only the files whose names contain one of these words
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const all = readdirSync('test').filter((f) => f.endsWith('.test.ts'));
const names = wanted.length ? all.filter((f) => wanted.some((w) => f.includes(w))) : all;
if (!names.length) {
  console.error(`No test file matches ${wanted.join(', ')}`);
  process.exit(1);
}
const outdir = 'out/test';
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({
  entryPoints: names.map((f) => `test/${f}`),
  outdir,
  outExtension: { '.js': '.cjs' },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2023',
  logLevel: 'warning',
  loader: { '.png': 'empty', '.webp': 'empty' },
});
const files = names.map((f) => `${outdir}/${f.replace(/\.ts$/, '.cjs')}`);
const run = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(run.status ?? 1);
