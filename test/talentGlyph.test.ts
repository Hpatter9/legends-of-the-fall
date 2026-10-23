// Every talent wears a generic glyph for its kind of effect (docs/notes/hero-progress.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { TALENT_ABILITIES, TREES } from '../src/sim/talents';
import { GLYPHS, glyphOf } from '../src/sim/talentGlyph';

test('every talent has a glyph with a picture, and every glyph is used', () => {
  const used = new Set<string>();
  for (const t of Object.values(TREES))
    for (const n of t.nodes) {
      const g = glyphOf(n);
      assert.ok(GLYPHS[g], `${n.id}: ${g} is a known glyph`);
      assert.ok(existsSync(`src/art/talent/${g}.png`), `${n.id}: ${g} has a picture`);
      used.add(g);
    }
  for (const g of Object.keys(GLYPHS)) assert.ok(used.has(g), `glyph ${g} is used`);
  assert.ok(used.size <= 40, 'one icon for every talent of a kind: a small set');
});

test('the glyphs mean what the owner asked: attack a weapon, defence armour, life a heart, crit an eye, speed a boot, execute a pickaxe, healing a cross', () => {
  const node = (id: string) => Object.values(TREES).flatMap((t) => t.nodes).find((n) => n.id === id)!;
  assert.equal(glyphOf({ ...node('knight:1a'), stats: { atk: 0.05 }, tal: undefined, abilities: undefined }), 'sword');
  assert.equal(glyphOf({ ...node('knight:1a'), stats: { def: 1 }, tal: undefined, abilities: undefined }), 'armour');
  assert.equal(glyphOf({ ...node('knight:1a'), stats: { hp: 0.05 }, tal: undefined, abilities: undefined }), 'heart');
  assert.equal(glyphOf({ ...node('knight:1a'), stats: { crit: 0.05 }, tal: undefined, abilities: undefined }), 'eye');
  assert.equal(glyphOf({ ...node('knight:1a'), stats: { moveSpeed: 0.05 }, tal: undefined, abilities: undefined }), 'boot');
  assert.equal(glyphOf({ ...node('knight:1a'), stats: { regen: 0.004 }, tal: undefined, abilities: undefined }), 'cross');
  const executes = Object.values(TREES).flatMap((t) => t.nodes).filter((n) => n.abilities?.some((a) => TALENT_ABILITIES[a].kind === 'execute'));
  assert.ok(executes.length > 0);
  for (const n of executes) assert.equal(glyphOf(n), 'pickaxe');
});
