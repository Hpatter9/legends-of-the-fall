import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { SUMMON_LOOKS, SUMMON_SHEETS, summonMark, summonSheet } from '../src/render/summonArt';
import { FOES } from '../src/sim/foes';
import { ALL_HEROES as HEROES, UNITS } from '../src/sim/units';
import layout from '../src/art/units/sheets.json';

const sheets = layout as Record<string, { rows: string[]; counts: Record<string, number> }>;
/** The kinds heroes call up in a fight (the Duchess and the Last Stand's king are summon-flagged but not called up). */
const CALLED = ['wolf', 'direWolf', 'treant', 'wraith', 'standard', 'decoy'];

test('every unit a hero calls up has its own look, sheet and caller', () => {
  for (const kind of CALLED) {
    assert.ok(UNITS[kind]?.summon, kind);
    const look = SUMMON_LOOKS[kind];
    assert.ok(look, `${kind} has a look`);
    assert.ok(HEROES.includes(look.caller), `${kind}'s caller ${look.caller} is a hero`);
    assert.equal(typeof summonMark(kind), 'number', `${kind} has a mark`);
  }
  assert.equal(summonSheet('knight'), undefined);
});

test('the summons\' sheets are cut with walk, attack, idle and dead rows, and are no hero\'s or foe\'s sheet', () => {
  const taken = new Set([...HEROES.flatMap((k) => [UNITS[k].sheet, ...(UNITS[k].forms ?? [])]), ...Object.values(FOES).map((f) => f.sheet)]);
  for (const id of SUMMON_SHEETS) {
    const l = sheets[id];
    assert.ok(l, `${id} is in sheets.json`);
    assert.ok(existsSync(`src/art/units/${id}.png`), `${id}.png`);
    for (const row of ['walk', 'attack', 'idle', 'dead']) assert.ok((l.counts[row] ?? 0) > 0, `${id} has ${row}`);
    assert.ok(!taken.has(id), `${id} is not a hero's or foe's sheet`);
  }
});

test('a summon\'s sheet follows its grade, and the last form holds above it', () => {
  assert.equal(summonSheet('wolf', 1), 'summon_wolf');
  assert.equal(summonSheet('wolf', 3), 'summon_wolf_white');
  assert.equal(summonSheet('wolf', 4), 'summon_wolf_white');
  assert.equal(summonSheet('treant', 2), 'cls_treant_2');
  assert.equal(summonSheet('direWolf', 3), 'summon_direwolf');
});
