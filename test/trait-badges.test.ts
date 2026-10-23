import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRAITS, HERO_TRAITS } from '../src/sim/traits';
import { TRAIT_COLOURS } from '../src/traitColours';
import { pipsOf, raisedBy } from '../src/traitHelp';

const css = readFileSync('src/tokens.css', 'utf8');
const hex = (name: string): [number, number, number] => {
  const m = new RegExp(`--${name}: #([0-9a-f]{6})`).exec(css);
  if (!m) throw new Error(`no token ${name}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = ([r, g, b]: number[]) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

{
  test('every trait has a colour, and none is shared within its kind', () => {
    for (const kind of ['origin', 'class'] as const) {
      const ids = Object.values(TRAITS).filter((t) => t.kind === kind).map((t) => t.id);
      for (const id of ids) assert.ok(TRAIT_COLOURS[id], id);
      const fills = ids.map((id) => TRAIT_COLOURS[id].fill);
      assert.equal(new Set(fills).size, fills.length);
    }
  });
  test('the letters read on the fill', () => {
    for (const [id, c] of Object.entries(TRAIT_COLOURS)) assert.ok(contrast(c.fill, c.ink) >= 4.5, id);
  });
  test('the shorts are two letters and unique', () => {
    const shorts = Object.values(TRAITS).map((t) => t.short);
    assert.ok(shorts.every((s) => s.length === 2));
    assert.equal(new Set(shorts).size, shorts.length);
  });
}

{
  test('a second Samurai wakes Samurai', () => {
    assert.ok(raisedBy(['samurai'], 'kunoichi').includes('samurai'));
  });
  test('a hero already picked raises nothing', () => {
    assert.deepEqual(raisedBy(['samurai'], 'samurai'), []);
  });
  test('the first of a trait wakes nothing; the fourth raises a second tier', () => {
    assert.deepEqual(raisedBy([], 'samurai'), []);
    const four = Object.keys(HERO_TRAITS).filter((k) => HERO_TRAITS[k].includes('samurai'));
    assert.ok(raisedBy(four.slice(0, 3), four[3]).includes('samurai'));
  });
  test('a trait at its top tier is not raised again', () => {
    const wild = Object.keys(HERO_TRAITS).filter((k) => HERO_TRAITS[k].includes('knightly'));
    assert.ok(wild.length > 2);
    assert.ok(!raisedBy(wild.slice(0, 2), wild[2]).includes('knightly'));
  });
}

{
  test('fills toward the goal', () => {
    assert.equal(pipsOf(1, 2), '●○');
    assert.equal(pipsOf(3, 4), '●●●○');
    assert.equal(pipsOf(5, 4), '●●●●');
  });
}
