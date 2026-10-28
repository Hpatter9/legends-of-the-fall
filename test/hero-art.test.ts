import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import layout from '../src/art/units/sheets.json';

const LAYOUT = layout as Record<string, { w: number; h: number; perRow: number; rows: string[]; counts: Record<string, number>; figure: number; lies?: boolean }>;
const REMADE = ['mercenary', 'wolfBard', 'beastmaster', 'timeWitch', 'priestess', 'dragoon', 'sage', 'demonSwordsman', 'buccaneer', 'dreadPirate', 'kraken', 'lancer', 'mummy', 'juggernaut', 'tyrant', 'shambler'];
const CAST = ['wolfBard', 'beastmaster', 'timeWitch', 'priestess', 'sage', 'dreadPirate', 'kraken', 'mummy', 'juggernaut', 'tyrant'];

test('the remade heroes are drawn from their own generated sheet, with every row the game plays', () => {
  for (const id of REMADE) {
    const d = UNITS[id];
    assert.ok(d.sheet.startsWith('hero_'), id);
    assert.equal(d.forms, undefined, `${id} has one look`);
    const l = LAYOUT[d.sheet];
    assert.ok(l && existsSync(`src/art/units/${d.sheet}.png`), d.sheet);
    for (const r of ['walk', 'attack', 'idle', 'hurt', 'dead']) assert.ok(l.rows.includes(r) && l.counts[r] > 1, `${d.sheet} ${r}`);
    if (CAST.includes(id)) assert.ok(l.counts.attack2 > 1, `${d.sheet} attack2`);
    // (the last death frame is the idle figure turned 90 degrees, by lie.py)
    assert.ok(l.lies, `${d.sheet} lies down`);
    for (const r of l.rows) {
      const start = l.rows.indexOf(r), span = Math.ceil(l.counts[r] / l.perRow);
      assert.ok(start + span <= l.rows.length, `${d.sheet} ${r} fits its sheet`);
      if (span > 1) assert.equal(l.rows[start + 1], '_walk', `${d.sheet}: the extended stride has a reserved continuation row`);
    }
  }
});

test('the old Pixel Champions and pirate-pack hero sheets are gone', () => {
  for (const f of ['pc_ouzo_1', 'pc_prime_3', 'pirate_leader', 'pirate_zombie', 'squidman', 'horde_2', 'hk_tyrant', 'hk_juggernaut', 'hk_mummy', 'hk_zombie_bare']) {
    assert.equal(LAYOUT[f], undefined, f);
    assert.ok(!existsSync(`src/art/units/${f}.png`), f);
  }
});

test('every hero stands in one of three height bands (small 42, medium 50, large 60)', () => {
  const bands = [42, 50, 60];
  const seen = new Set<number>();
  for (const id of ALL_HEROES) {
    const d = UNITS[id];
    if (d.summon) continue;
    // (the figure box also counts a tall tip: the Archer's arrow makes her sheet's figure taller than her body)
    const fig = LAYOUT[d.sheet].figure * d.scale;
    const near = bands.find((b) => Math.abs(fig - b) <= 4);
    if (near !== undefined) seen.add(near);
    else assert.equal(id, 'archer', `${id} ${fig}`);
  }
  assert.equal(seen.size, 3);
});
