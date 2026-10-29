// The heroes' looks and names (docs/notes/heritage-looks.md): the re-toned sheets, the tone table and every hero's name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ALL_HEROES, UNITS, formOf } from '../src/sim/units';
import { HAIRS, HERO_LOOKS, NOT_HUMAN, TONES } from '../src/sim/heroLooks';
import { HERO_NAMES, heroClassLabel, heroName } from '../src/sim/heroNames';
import layout from '../src/art/units/sheets.json';

const LAYOUT = layout as Record<string, { w: number; h: number; perRow: number; rows: string[]; counts: Record<string, number>; rear?: string }>;
/** A PNG's width and height, from its header. */
const size = (file: string): [number, number] => {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
/** Every sheet a hero is drawn from: its grades' forms and their rear views. */
const sheetsOf = (kind: string): string[] => {
  const fronts = [...new Set([1, 2, 3].map((g) => formOf(UNITS[kind], g)))];
  return [...fronts, ...fronts.map((s) => LAYOUT[s].rear).filter((s): s is string => !!s)];
};

test('every re-toned hero is a real human hero, with a known tone and hair', () => {
  for (const [kind, look] of Object.entries(HERO_LOOKS)) {
    assert.ok(ALL_HEROES.includes(kind), `${kind} is a hero`);
    assert.ok(!NOT_HUMAN.includes(kind), `${kind} is a person`);
    assert.ok(look.tone !== 'source' && TONES[look.tone], `${kind} tone`);
    if (look.hair) assert.ok(HAIRS[look.hair], `${kind} hair`);
  }
  for (const k of NOT_HUMAN) assert.ok(ALL_HEROES.includes(k), k);
  // (roughly half the people among the heroes are drawn in a re-toned look, so the cast a new player meets is varied)
  const people = ALL_HEROES.filter((k) => !NOT_HUMAN.includes(k));
  assert.ok(Object.keys(HERO_LOOKS).length >= people.length / 3, 'a good share of the cast re-toned');
});

test('every sheet of a re-toned hero is bundled from its re-toned file, the same size as the source, and the source is not bundled', () => {
  const bundle = readFileSync('src/render/resonanceArt.ts', 'utf8');
  const tool = JSON.parse(readFileSync('tools/heritage/heroes.json', 'utf8')) as Record<string, { sheets: string[] }>;
  const retoned = JSON.parse(readFileSync('tools/heritage/sheets.json', 'utf8')) as Record<string, string>;
  assert.deepEqual(Object.keys(tool).sort(), Object.keys(HERO_LOOKS).sort(), 'the tool and the table name the same heroes');
  for (const [kind, look] of Object.entries(HERO_LOOKS)) {
    const sheets = sheetsOf(kind);
    assert.deepEqual([...tool[kind].sheets].sort(), [...sheets].sort(), `${kind}: the tool re-tones every sheet the hero is drawn from`);
    // (the front is always re-toned; a rear where no skin shows, the Cleric's, is drawn from the source as it is)
    assert.ok(retoned[sheets[0]], `${kind}: its front sheet is re-toned`);
    for (const s of sheets) {
      const src = `src/art/units/${s}.png`;
      assert.ok(existsSync(src), src);
      const out = `src/art/units/${s}_${look.tone}.png`;
      if (!retoned[s]) {
        assert.ok(!existsSync(out), `${out}: an unchanged copy is not kept`);
        assert.ok(bundle.includes(`'../art/units/${s}.png'`), `${s} bundled from its source`);
        continue;
      }
      assert.equal(retoned[s], `${s}_${look.tone}`, s);
      assert.ok(existsSync(out), out);
      assert.deepEqual(size(out), size(src), `${out} matches its source`);
      const l = LAYOUT[s];
      const [w, h] = size(out);
      const cells = l.rows.reduce((n, r) => n + Math.ceil((l.counts[r] ?? 0) / l.perRow), 0);
      assert.ok(w >= l.w * l.perRow && h >= l.h * cells, `${out} holds every frame`);
      assert.ok(bundle.includes(`'../art/units/${s}_${look.tone}.png'`), `${s} bundled from ${out}`);
      assert.ok(!bundle.includes(`'../art/units/${s}.png'`), `${src} is no longer bundled`);
    }
  }
});

test('every hero has its own name, short enough for the hero bar', () => {
  const seen = new Set<string>();
  for (const k of ALL_HEROES) {
    const n = HERO_NAMES[k];
    assert.ok(n && n.name && n.heritage, `${k} is named`);
    assert.ok(/^[A-Z][A-Za-z'-]*[A-Za-z0-9]$/.test(n.name), `${k}: "${n.name}" is one plain word`);
    assert.ok(n.name.length <= 9, `${k}: "${n.name}" fits the hero bar`);
    assert.ok(!seen.has(n.name.toLowerCase()), `${n.name} is used once`);
    assert.notEqual(n.name, UNITS[k].name, `${k}'s name is not its class`);
    seen.add(n.name.toLowerCase());
    assert.equal(heroName(k), n.name);
    assert.equal(heroClassLabel(k), `${n.name} · ${UNITS[k].name}`);
  }
  assert.deepEqual(Object.keys(HERO_NAMES).sort(), [...ALL_HEROES].sort(), 'no names for heroes that are not there');
  // (anything else keeps the name it had)
  assert.equal(heroName('skeleton'), UNITS.skeleton.name);
  assert.equal(heroClassLabel('skeleton'), UNITS.skeleton.name);
});
