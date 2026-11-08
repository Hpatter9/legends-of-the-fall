// Coverage is tied to the real content, so a new or renamed kit cannot silently
// return to an old effect thumbnail or a missing painting.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { HERO_KITS } from '../src/sim/heroKits';
import { ultimateOf } from '../src/sim/abilities';
import type { Unit } from '../src/sim/battle';
import { SPELL_IDS } from '../src/sim/spells';
import { TRAITS } from '../src/sim/traits';
import { COMBAT_SKILL_MOTIFS, KING_SPELL_MOTIFS, BATTLE_TRAIT_MOTIFS } from '../src/combatIconRules';

const paintingExists = (id: string | undefined, label: string) => {
  assert.ok(id, `${label} needs a reviewed painted motif`);
  const path = `src/art/ui/combat-icon-${id}.png`;
  assert.ok(existsSync(path), `${label}: missing ${path}`);
  const png = readFileSync(path);
  assert.equal(png.readUInt32BE(16), 64, `${label}: expected 64px icon`);
  assert.equal(png.readUInt32BE(20), 64, `${label}: expected square icon`);
};

test('every current hero skill, revive face and unlocked ultimate has a real painting', () => {
  for (const [hero, kit] of Object.entries(HERO_KITS())) {
    const ult = ultimateOf({ def: hero, side: 'hero', level: 40 } as Unit);
    const skills = [...kit.slots.map((s) => s.skill), ...kit.slots.flatMap((s) => s.revive ? [s.revive.skill] : []), ...(ult ? [ult] : [])];
    for (const s of skills) paintingExists(COMBAT_SKILL_MOTIFS[s.name], `${hero}: ${s.name}`);
  }
});

test('every king spell has a painted motif or its existing painted school emblem', () => {
  const schools: string[] = JSON.parse(readFileSync('src/art/fx/kings/icons.json', 'utf8'));
  for (const id of SPELL_IDS) {
    if (schools.includes(id)) assert.ok(existsSync('src/art/fx/kings/icons.webp'));
    else paintingExists(KING_SPELL_MOTIFS[id], id);
  }
});

test('every battle synergy has a painted motif while keeping its written trait name', () => {
  for (const id of Object.keys(TRAITS)) paintingExists(BATTLE_TRAIT_MOTIFS[id], id);
});
