// QUEST-POSSIBLE (docs/notes/quest-possible.md): prints the audit (`rules.ts`): one line a quest that is broken or needs a call, or with
// --md the whole table; exits 1 if any is broken. `test/quest-audit.test.ts` runs the same check in the suite.
//   npx esbuild tools/quest-audit/audit.ts --bundle --platform=node --format=esm --outfile=out/quest-audit.mjs --loader:.png=empty --loader:.webp=empty && node out/quest-audit.mjs [--md]
import { auditQuests, type Row } from './rules';

const rows = auditQuests();
const md = process.argv.includes('--md');
const count = (s: Row['state']) => rows.filter((r) => r.state === s).length;
if (md) {
  console.log('| Quest | Kind | Goal | State | Why |\n| --- | --- | --- | --- | --- |');
  for (const r of rows) console.log(`| \`${r.id}\` ${r.title.replace(/\|/g, '/')} | ${r.kind} | ${r.text.replace(/\|/g, '/')} | ${r.state} | ${r.why.join('; ').replace(/\|/g, '/')} |`);
} else for (const r of rows.filter((x) => x.state === 'broken' || x.state === 'call')) console.log(`${r.state.toUpperCase()}  ${r.id} (${r.kind}): ${r.text}\n        ${r.why.join('\n        ')}`);
console.log(`\n${rows.length} checked: ${count('ok')} can be done, ${count('hidden')} wait with the hidden modes, ${count('call')} need a call, ${count('broken')} broken`);
process.exit(count('broken') ? 1 : 0);
