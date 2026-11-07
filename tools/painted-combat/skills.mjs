// Resolve reviewed motif assignments against the actual kit names and aliases.
// The result is pure data, so coverage tests never need the DOM or image imports.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
mkdirSync('out/review', { recursive: true });
await build({ stdin: { contents: `
import { HERO_KITS } from './src/sim/heroKits';
import { ultimateOf } from './src/sim/abilities';
export const catalog = Object.entries(HERO_KITS()).map(([hero, kit]) => ({hero, skills: [
 ...kit.slots.map(s => ({name:s.skill.name,key:s.skill.key})),
 ...kit.slots.filter(s => s.revive).map(s => ({name:s.revive!.skill.name,key:s.revive!.skill.key})),
 ...[ultimateOf({def:hero,side:'hero',level:40} as any)].filter(Boolean).map(s=>({name:s!.name,key:s!.key}))
]}));`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: 'out/review/icon-catalog.mjs', logLevel: 'error' });
const { catalog } = await import('../../out/review/icon-catalog.mjs');
const assignments = JSON.parse(readFileSync('tools/painted-combat/skill-assignments.json'));
const names = {}, aliases = {};
for (const {hero, skills} of catalog) {
  const ids = assignments[hero];
  if (!ids || ids.length !== skills.length) throw new Error(`Review icon slots for ${hero}`);
  skills.forEach((s, i) => {
    if (names[s.name] && names[s.name] !== ids[i]) throw new Error(`Conflicting motif for ${s.name}`);
    names[s.name] = ids[i];
    if (s.key) aliases[s.key] ??= ids[i];
  });
}
const ordered = Object.fromEntries(Object.entries({...aliases,...names}).sort(([a],[b])=>a.localeCompare(b)));
writeFileSync('src/combatIconRules.ts', `// Reviewed painted motifs for the actual hero kits, including revive faces.\n// Refresh with node tools/painted-combat/skills.mjs after reviewing skill-assignments.json.\nexport const COMBAT_SKILL_MOTIFS: Readonly<Record<string, string>> = ${JSON.stringify(ordered,null,2)};\n\nexport const KING_SPELL_MOTIFS: Readonly<Record<string, string>> = {\n  heal: 'heal', meteor: 'meteor', haste: 'wings', shield: 'shield', smite: 'bolt',\n  chain: 'lightning', poison: 'poison', frost: 'ice', rally: 'banner', quake: 'golem',\n  resurrect: 'phoenix', cleanse: 'star', blink: 'portal', hex: 'skull', lance: 'bolt',\n  renewal: 'heal', deepfreeze: 'ice', warcry: 'horns', bulwark: 'formation',\n  wolves: 'paw', starfall: 'meteor',\n};\n`);
writeFileSync('out/review/painted-skill-catalog.json', JSON.stringify(catalog,null,2));
console.log(`${catalog.length} hero kits, ${Object.keys(names).length} skill names and ${Object.keys(ordered).length} names/aliases assigned`);
const traits = JSON.parse(readFileSync('tools/painted-combat/trait-assignments.json'));
const source = readFileSync('src/combatIconRules.ts', 'utf8');
writeFileSync('src/combatIconRules.ts', source + `\nexport const BATTLE_TRAIT_MOTIFS: Readonly<Record<string, string>> = ${JSON.stringify(traits,null,2)};\n`);
