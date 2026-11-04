// KING-SPELLS batch 5 (docs/notes/king-spells-b5.md): the schools' fourteen spells' own painted art: the sheets (cast, impact and, for the
// walls, stand), their emblems as icons and as each spell's authored art. Their sounds still borrow a first spell's (`SPELL_SOUND`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/sim/battle';
import { SPELL_IDS } from '../src/sim/spells';
import { SPELL_SOUND } from '../src/sim/spellSounds';
import { KING_SHEET, KING_WALL } from '../src/render/kingArt';
import { spellPart, SPELL_SESSIONS } from '../src/render/spellLooks';
import { ABILITY_LOOKS, abilitySource } from '../src/render/abilityLooks';
import { SPELL_SIGNATURES } from '../src/render/spellSignatures';

const NEW = Object.keys(SPELL_SOUND) as (keyof typeof SPELL_SOUND)[];
const KING_ICONS = JSON.parse(readFileSync('src/art/fx/kings/icons.json', 'utf8')) as string[];

test('each of the fourteen has its painted cast and impact in the h-kings atlas, and each wall its stand loop', () => {
  assert.ok(SPELL_SESSIONS['h-kings'], 'the atlas is packed');
  assert.equal(NEW.length, 14);
  for (const id of NEW) {
    const sheet = KING_SHEET[id];
    assert.ok(sheet, `${id} has a sheet`);
    for (const part of ['cast', 'impact']) {
      const p = spellPart(`${sheet}.${part}`);
      assert.ok(p && p.session === 'h-kings' && p.frames >= 6 && !p.loop, `${sheet}.${part}`);
    }
  }
  for (const sheet of Object.values(KING_WALL)) assert.ok(spellPart(`${sheet}.stand`)?.loop, `${sheet}.stand loops`);
  assert.deepEqual(Object.keys(KING_WALL).sort(), ['fire', 'ice', 'stone']);
  // (the prefix keeps the heroes' own `charm` its own)
  assert.equal(spellPart('charm.impact')?.session, 'g-spells');
});

test('each has its own round emblem as its icon and as its authored art, and no first spell lost its own', () => {
  assert.deepEqual([...KING_ICONS].sort(), [...NEW].sort());
  for (const id of NEW) {
    const row = ABILITY_LOOKS[`spell:${id}`];
    assert.ok(row && row.atlas === 9 && row.motif.length > 10, id);
    assert.equal(SPELL_SIGNATURES[id].cast[0].art, `spell:${id}`);
  }
  const sources = SPELL_IDS.map((id) => abilitySource(`spell:${id}`));
  assert.equal(new Set(sources).size, SPELL_IDS.length, 'thirty-five spells, thirty-five paintings');
});
