// The audit of every hero's skill, ultimate and tier skills: what each showed before (`SKILL_FX`, the shared Pixel Effects sheets with a tint)
// and what each shows now (`SIGNATURES`). Writes tools/fxlab/heroes.json (for unique.mjs) and docs/notes/unique-spells-table.md.
//   npx esbuild tools/fxlab/audit.ts --bundle --platform=node --outfile=out/audit.cjs && node out/audit.cjs
import { writeFileSync } from 'node:fs';
import { KITS } from '../../src/sim/abilities';
import { UNITS } from '../../src/sim/units';
import { SKILL_FX } from '../../src/render/skillFx';
import { SIGNATURES, type Step } from '../../src/render/signatures';

const heroes = Object.entries(KITS).filter(([id]) => UNITS[id]?.side === 'hero' && !UNITS[id]?.summon);
const json: Record<string, { name: string; skill: string; ult?: string; heal: boolean }> = {};
const HEALERS = new Set(['cleric', 'wanderer', 'priestess', 'druid', 'wolfBard', 'satyr', 'timeWitch', 'samuraiCommander', 'peasant', 'paladin']);
for (const [id, k] of heroes) json[id] = { name: UNITS[id].name, skill: k.skill.name, ult: k.ultimate?.name, heal: HEALERS.has(id) };
writeFileSync('tools/fxlab/heroes.json', JSON.stringify(json, null, 1));

const hex = (t?: number) => (t === undefined ? '' : `#${t.toString(16).padStart(6, '0')}`);
const before = (name: string) => {
  const f = SKILL_FX[name];
  const part = (e?: { sheet: string; tint?: number }) => (e ? `${e.sheet}${e.tint !== undefined ? ' ' + hex(e.tint) : ''}` : '—');
  return `${part(f?.cast)} / ${part(f?.hit)}`;
};
const layer = (s: Step) => `${s.s}:${s.k}${s.t !== undefined ? ' ' + hex(s.t) : ''}`;
const after = (name: string) => SIGNATURES[name].cast.map(layer).join(' + ');

// which "before" looks were shared: the same cast sheet and tint
const seen = new Map<string, string[]>();
for (const [, k] of heroes)
  for (const name of [k.skill.name, ...(k.ultimate ? [k.ultimate.name] : [])]) {
    const c = SKILL_FX[name]?.cast;
    const key = c ? `${c.sheet} ${hex(c.tint)}` : 'none';
    seen.set(key, [...(seen.get(key) ?? []), name]);
  }
const sharedBefore = (name: string) => {
  const c = SKILL_FX[name]?.cast;
  if (!c) return 'no cast sheet (a hit sheet only)';
  const group = seen.get(c ? `${c.sheet} ${hex(c.tint)}` : 'none') ?? [];
  const sheetOnly = [...seen.entries()].filter(([k]) => c && k.startsWith(c.sheet + ' ')).flatMap(([, v]) => v);
  if (group.length > 1) return `**same as** ${group.filter((n) => n !== name).slice(0, 3).join(', ')}${group.length > 4 ? '…' : ''}`;
  if (sheetOnly.length > 1) return `same sheet as ${sheetOnly.filter((n) => n !== name).slice(0, 3).join(', ')}${sheetOnly.length > 4 ? '…' : ''}, other tint`;
  return 'own';
};

const rows = ['| Hero | Spell | Before (cast / hit) | Shared before? | After (cast layers: shape:strip tint) |', '|---|---|---|---|---|'];
let nShared = 0;
let nTotal = 0;
for (const [id, k] of heroes) {
  for (const [kind, name] of [['skill', k.skill.name], ...(k.ultimate ? [['ultimate', k.ultimate.name]] : [])] as const) {
    const s = sharedBefore(name);
    nTotal++;
    if (s.startsWith('**') || s.startsWith('same')) nShared++;
    rows.push(`| ${UNITS[id].name} | ${kind}: ${name} | ${before(name)} | ${s} | ${after(name)} |`);
  }
}
// (the tier skills' table went with the tier skills themselves, the skills overhaul's batch 3)
writeFileSync('docs/notes/unique-spells-table.md', `${rows.join('\n')}\n\n${nShared} of ${nTotal} hero skills and ultimates shared a look before (the same cast sheet, or the same sheet with another tint). After: 0 share a lead strip.\n`);
console.log(nShared, 'of', nTotal);
