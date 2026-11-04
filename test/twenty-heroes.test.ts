import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_HEROES, UNITS } from '../src/sim/units.js';
import { TRAITS, membersOf } from '../src/sim/traits.js';
import { COMBOS } from '../src/sim/combos.js';
import { HERO_KITS, skill2Open, skill3Open, SKILL2_LEVEL, SKILL3_LEVEL } from '../src/sim/heroKits.js';
import { ULT_LEVEL } from '../src/sim/abilities.js';
import { DEEP_KITS } from '../src/sim/talentsDeep.js';
import { TREES } from '../src/sim/talents.js';
import { TIER_SKILLS } from '../src/sim/tierSkills.js';
import { PASSIVES } from '../src/sim/awaken.js';
import { HERO_STORY } from '../src/sim/codexLore.js';
import { HERO_QUIPS } from '../src/quipData.js';
import layout from '../src/art/units/sheets.json';
import awakenedManifest from '../src/art/awakened/manifest.json';

const TWENTY_NEW = [
  'vampireLord',
  'hemomancer',
  'nightstalker',
  'bloodGargoyle',
  'dhampir',
  'warDrummer',
  'banneret',
  'geomancer',
  'bellWarden',
  'falconer',
  'astralSphinx',
  'mirageDancer',
  'plagueDoctor',
  'bombardier',
  'astrologer',
  'inquisitor',
  'seraph',
  'corsairSurgeon',
  'harpooner',
  'seaReaver',
];

test('roster expansion to 65 heroes with 20 new heroes', () => {
  assert.equal(ALL_HEROES.length, 65, 'total hero roster must be exactly 65');
  for (const id of TWENTY_NEW) {
    assert.ok(ALL_HEROES.includes(id), `ALL_HEROES must include ${id}`);
    assert.ok(UNITS[id], `UNITS must define ${id}`);
  }
});

test('every origin and class has exactly 5 heroes and a 5-hero tier', () => {
  const originTraits = Object.keys(TRAITS).filter((k) => TRAITS[k].kind === 'origin');
  const classTraits = Object.keys(TRAITS).filter((k) => TRAITS[k].kind === 'class');

  assert.equal(originTraits.length, 13, 'must have 13 origins');
  assert.equal(classTraits.length, 13, 'must have 13 classes');
  assert.ok(originTraits.includes('vampire'), 'origins must include vampire');

  for (const t of [...originTraits, ...classTraits]) {
    const members = membersOf(t);
    assert.equal(members.length, 5, `trait ${t} must have exactly 5 heroes, but has ${members.length}: ${members.join(', ')}`);
    const tier5 = TRAITS[t].tiers.find((tier) => tier.need === 5);
    assert.ok(tier5, `trait ${t} must have a 5-hero tier`);
  }
});

test('vampire trait tiers and effects', () => {
  const vTrait = TRAITS.vampire;
  assert.ok(vTrait);
  assert.deepEqual(vTrait.tiers.map((t) => t.need), [2, 4, 5]);
  const t2 = vTrait.tiers.find((t) => t.need === 2);
  const t4 = vTrait.tiers.find((t) => t.need === 4);
  const t5 = vTrait.tiers.find((t) => t.need === 5);
  assert.ok(t2 && t2.effects.leech === 0.06);
  assert.ok(t4 && t4.effects.leech === 0.12 && t4.effects.atk === 1.06);
  assert.ok(t5 && t5.effects.leech === 0.18 && t5.effects.atk === 1.14 && t5.effects.vampireSwarm);
});

test('Last Oath includes bloodCourt combo for vampire origin', () => {
  const bc = COMBOS.find((c) => c.id === 'bloodCourt');
  assert.ok(bc, 'bloodCourt combo must exist');
  assert.equal(bc.heroes.length, 5);
  assert.deepEqual(bc.heroes, ['vampireLord', 'hemomancer', 'nightstalker', 'bloodGargoyle', 'dhampir']);
});

test('3-skill engine unlock levels and hero kits', () => {
  assert.equal(SKILL2_LEVEL, 10);
  assert.equal(SKILL3_LEVEL, 20);
  assert.equal(ULT_LEVEL, 30);

  const u1 = { side: 'hero', def: 'vampireLord', level: 1 } as any;
  const u10 = { side: 'hero', def: 'vampireLord', level: 10 } as any;
  const u20 = { side: 'hero', def: 'vampireLord', level: 20 } as any;

  assert.equal(skill2Open(u1), false);
  assert.equal(skill2Open(u10), true);
  assert.equal(skill3Open(u1), false);
  assert.equal(skill3Open(u10), false);
  assert.equal(skill3Open(u20), true);

  const kits = HERO_KITS();
  for (const id of TWENTY_NEW) {
    const kit = kits[id];
    assert.ok(kit, `HERO_KITS must have an entry for ${id}`);
    assert.ok(kit.s1, `${id} must have skill 1`);
    assert.ok(kit.s2, `${id} must have skill 2`);
    assert.ok(kit.s3, `${id} must have skill 3`);
  }
});

test('talent trees, tier skills, awakenings, lore, and quips for all 20 new heroes', () => {
  for (const id of TWENTY_NEW) {
    assert.ok(DEEP_KITS[id], `DEEP_KITS must have ${id}`);
    assert.ok(TREES[id], `TREES must have ${id}`);
    assert.equal(TREES[id].nodes.length, 16, `${id} tree must have 16 nodes`);

    assert.ok(TIER_SKILLS[id], `TIER_SKILLS must have ${id}`);
    assert.equal(TIER_SKILLS[id].length, 3, `${id} must have 3 tier skills (T2, T3, T4)`);

    assert.ok(PASSIVES[id], `PASSIVES must have ${id}`);
    assert.ok((awakenedManifest as any).forms[UNITS[id].sheet], `awakenedManifest.forms must have ${UNITS[id].sheet}`);

    assert.ok(HERO_STORY[id], `HERO_STORY must have ${id}`);
    assert.ok(HERO_QUIPS[id], `HERO_QUIPS must have quips for ${id}`);
  }
});

test('art assets exist and are non-empty for all 20 new heroes', () => {
  for (const id of TWENTY_NEW) {
    const sheetKey = UNITS[id].sheet;
    const l = (layout as any)[sheetKey];
    assert.ok(l, `layout must have sheet entry for ${sheetKey}`);
    assert.ok(l.rear, `sheet ${sheetKey} must have rear facing defined`);

    const frontSprite = join('src', 'art', 'units', `${sheetKey}.png`);
    const rearSprite = join('src', 'art', 'units', `${l.rear}.png`);
    const awkFront = join('src', 'art', 'awakened', `awakened_${id}.png`);
    const awkRear = join('src', 'art', 'awakened', `awakened_${id}_back.png`);
    const illust = join('src', 'art', 'heroes', `${id}.webp`);
    const portrait = join('src', 'art', 'heroes', `${id}-portrait.webp`);
    const awkGear = join('src', 'art', 'heroes', `awakened-${id}.webp`);

    for (const [desc, file] of [
      ['front sprite', frontSprite],
      ['rear sprite', rearSprite],
      ['awakened front sprite', awkFront],
      ['awakened rear sprite', awkRear],
      ['illustration', illust],
      ['portrait', portrait],
      ['awakened gear', awkGear],
    ]) {
      assert.ok(existsSync(file), `${id} ${desc} missing at ${file}`);
      const sz = statSync(file).size;
      assert.ok(sz > 1000, `${id} ${desc} file too small: ${sz} bytes`);
    }

    for (const r of ['walk', 'attack', 'idle', 'hurt', 'dead']) {
      assert.ok(l.rows.includes(r), `${sheetKey} missing row ${r}`);
      assert.ok(l.counts[r] > 1, `${sheetKey} row ${r} count too small`);
    }
  }
});
