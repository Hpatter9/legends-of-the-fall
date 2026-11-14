// RELEASE-AUDIT: two runs of `profile.mjs --json` side by side, as the note's table (docs/notes/release-audit-code.md).
//
//   node tools/release-audit/compare.mjs before.json after.json
import { readFileSync } from 'node:fs';

const [a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
const row = (r) => (r ? `${r.cpu}% (style ${r.style}%), ${r.rafPerS} frames asked/s` : '-');
console.log('| Screen | Before: main thread busy | After |');
console.log('|---|---|---|');
for (const r of a.results) console.log(`| ${r.name} | ${row(r)} | ${row(b.results.find((x) => x.name === r.name))} |`);
if (a.mutations && b.mutations) console.log(`| DOM writes in 5 s of a fight (of them the same value) | ${a.mutations.all} (${a.mutations.same}) | ${b.mutations.all} (${b.mutations.same}) |`);
const w = (x) => x.waveRows.map((r) => r.heap).join(', ');
const t = (x) => x.waveRows.map((r) => r.textures).join(', ');
console.log(`| Heap MB, waves 1 to ${a.waveRows.length} | ${w(a)} | ${w(b)} |`);
console.log(`| Pixi textures, waves 1 to ${a.waveRows.length} | ${t(a)} | ${t(b)} |`);
const warn = (x) => x.console.filter((c) => !/Service Worker registration blocked/.test(c.text)).length;
console.log(`| Console warnings and errors (a menu sweep, ten waves) | ${warn(a)} | ${warn(b)} |`);
