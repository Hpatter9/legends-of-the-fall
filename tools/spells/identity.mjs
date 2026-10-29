// Bundles tools/spells/identity.ts and prints (or, with --write, records) every scenario's fight hash. See identity.ts.
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';

const outdir = `out/spells-identity-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
writeFileSync(`${outdir}.entry.ts`, `import { identityHashes } from '../tools/spells/identity';
import { writeFileSync } from 'node:fs';
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const t0 = Date.now();
const got = identityHashes(only.length ? only : undefined);
console.log(JSON.stringify(got, null, 1), (Date.now() - t0) / 1000, 's');
if (process.argv.includes('--write')) writeFileSync('test/fixtures/spells-identity.json', JSON.stringify(got, null, 1) + '\\n');
`);
await esbuild.build({ entryPoints: [`${outdir}.entry.ts`], outfile: `${outdir}/logs.cjs`, bundle: true, platform: 'node', format: 'cjs', target: 'es2023', logLevel: 'warning', loader: { '.png': 'empty' } });
rmSync(`${outdir}.entry.ts`);
const run = spawnSync(process.execPath, [`${outdir}/logs.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
