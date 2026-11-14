// RELEASE-ART (docs/notes/release-art-wire.md): the four bosses who wore a soldier's sheet wear their own now, painted on the soldier's grid;
// the rules that read a look read the soldier's (their kin), so every fight plays as it did.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KIN_SHEET, kinSheet } from '../src/sim/foes';
import { UNITS } from '../src/sim/units';
import { foeFamilyOf } from '../src/sim/stats';
import { homeArmy } from '../src/sim/nemesis';

const BOSSES: Record<string, string> = { orcChieftain: 'orc_chieftain', boneCaptain: 'bone_captain', minotaurChampion: 'minotaur_champion', gorgonQueen: 'gorgon_queen' };
const sheets = JSON.parse(readFileSync('src/art/units/sheets.json', 'utf8'));

test('each of the four bosses wears its own sheet, on its kin\'s grid', () => {
  for (const [def, sheet] of Object.entries(BOSSES)) {
    assert.equal(UNITS[def].sheet, sheet, def);
    const kin = KIN_SHEET[sheet];
    assert.ok(kin, `${sheet} has a kin`);
    const own = sheets[sheet];
    const theirs = sheets[kin];
    for (const k of ['w', 'h', 'perRow', 'rows', 'counts', 'facesRight']) assert.deepEqual(own[k], theirs[k], `${sheet}.${k}`);
  }
});

test('the rules read a boss\'s kin: its family and home army are its soldiers\'', () => {
  assert.equal(kinSheet('bone_captain'), 'skeleton_warrior');
  assert.equal(kinSheet('hk_orc_brute'), 'hk_orc_brute');
  assert.equal(foeFamilyOf(UNITS.boneCaptain), 'armoured');
  for (const def of Object.keys(BOSSES)) {
    assert.equal(foeFamilyOf(UNITS[def]), foeFamilyOf({ ...UNITS[def], sheet: kinSheet(UNITS[def].sheet) }), def);
    // (a boss in no army's waves takes its home army from its soldiers' look, as it did in their sheet)
    assert.ok(homeArmy(def), `${def} has a home army`);
  }
});
