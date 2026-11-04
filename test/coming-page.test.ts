// The twenty coming heroes' page-side rows (docs/notes/twenty-heroes.md): names, stories, lines, starter classes, legacy perks, callings,
// talent trees and awakened passives, kept in each table's coming twin until the hero joins the roster. Each is held to the rules the
// roster's own rows are held to (`heritage-looks`, `codex`, `quips`, `starter`, `legacy`, `talents` and `awaken` tests), so that joining is
// only moving the rows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { COMING_NAMES, HERO_NAMES } from '../src/sim/heroNames';
import { COMING_STORY } from '../src/sim/codexLore';
import { COMING_QUIPS, QUIP_KINDS, QUIP_MAX } from '../src/quipData';
import { CLASS_NAMES, COMING_CLASS_OF } from '../src/sim/starter';
import { COMING_PERKS, PERKS } from '../src/sim/legacy';
import { COMING_DEEP_KITS, CALLING_NAMES } from '../src/sim/talentsDeep';
import { COMING_TREES, TAL_KEYS, TALENT_ABILITIES } from '../src/sim/talents';
import { COMING_PASSIVES, PASSIVES } from '../src/sim/awaken';
import { ABILITIES } from '../src/sim/equipBases';
import { EQUIP_ICONS } from '../src/equipArt';
import { comingHeroKits, comingKits } from '../src/sim/kits/coming';
import { ALL_HEROES, COMING_HEROES, UNITS } from '../src/sim/units';

const sorted = (o: object) => Object.keys(o).sort();
const COMING = [...COMING_HEROES].sort();

test('every coming table has a row for each of the twenty and no other, and none is a roster hero\'s', () => {
  for (const [name, t] of Object.entries({ COMING_NAMES, COMING_STORY, COMING_QUIPS, COMING_CLASS_OF, COMING_PERKS, COMING_DEEP_KITS, COMING_TREES, COMING_PASSIVES })) {
    assert.deepEqual(sorted(t), COMING, name);
    for (const k of Object.keys(t)) assert.ok(!ALL_HEROES.includes(k), `${name}: ${k}`);
  }
});

test('each name is one plain word that fits the hero bar, used once across the roster and the twenty, and not its class', () => {
  const seen = new Set(Object.values(HERO_NAMES).map((n) => n.name.toLowerCase()));
  for (const k of COMING) {
    const n = COMING_NAMES[k];
    assert.ok(n.name && n.title && n.heritage, k);
    assert.ok(/^[A-Z][A-Za-z'-]*[A-Za-z0-9]$/.test(n.name), `${k}: "${n.name}" is one plain word`);
    assert.ok(n.name.length <= 9, `${k}: "${n.name}" fits the hero bar`);
    assert.ok(!seen.has(n.name.toLowerCase()), `${n.name} is used once`);
    assert.notEqual(n.name, UNITS[k].name);
    seen.add(n.name.toLowerCase());
  }
});

test('each story is two or three sentences, names its hero, and has no model names', () => {
  for (const k of COMING) {
    const s = COMING_STORY[k];
    const n = s.split(/[.!?](?:\s|$)/).filter(Boolean).length;
    assert.ok(n >= 2 && n <= 3, `${k} has ${n} sentences`);
    assert.ok(s.includes(COMING_NAMES[k].name), `${k}'s story names ${COMING_NAMES[k].name}`);
    assert.doesNotMatch(s, /claude|sonnet|opus|haiku|anthropic/i);
    assert.ok(!/\b(armor|color|center|defense|favor)\b/i.test(s), `British spelling: ${k}`);
  }
});

test('each hero has three short lines for each of the eight moments', () => {
  for (const k of COMING) {
    const q = COMING_QUIPS[k];
    assert.deepEqual(Object.keys(q).sort(), [...QUIP_KINDS].sort(), k);
    for (const kind of QUIP_KINDS) {
      const lines = q[kind];
      assert.equal(lines.length, 3, `${k} ${kind}`);
      assert.equal(new Set(lines).size, 3, `${k} ${kind} repeats itself`);
      for (const t of lines) assert.ok(t.length >= 8 && t.length <= QUIP_MAX, `${k} ${kind}: ${t}`);
    }
  }
});

test('each hero has a starter class, and a legacy perk, small and rising, its name its own', () => {
  for (const k of COMING) assert.ok(CLASS_NAMES[COMING_CLASS_OF[k]], k);
  const names = new Set(Object.values(PERKS).map((p) => p.name));
  for (const k of COMING) {
    const p = COMING_PERKS[k];
    assert.ok(p.steps[0] < p.steps[1] && p.steps[1] < p.steps[2] && p.steps[2] <= 0.08, k);
    assert.ok(!names.has(p.name), `${p.name} is used once`);
    names.add(p.name);
  }
});

test('each calling names the hero\'s own skill 1 and ultimate, as its kit has them', () => {
  for (const k of COMING) {
    const d = COMING_DEEP_KITS[k];
    assert.ok(CALLING_NAMES[d.calling], k);
    assert.equal(d.skill, comingKits()[k].skill.name, `${k} skill name`);
    assert.equal(d.ult, comingKits()[k].ultimate?.name, `${k} ultimate name`);
  }
});

// (the twenty's casts read `reach` through `reachOf`, `dur` through `ms`, and the cast's own heal, shield and haste through `powered`; they
// do not read `extra`, `skillStun` or `skillSlow`, which only some of the roster's skills read, so their trees do not use them)
const READ = new Set(['pow', 'reach', 'dur', 'castHeal', 'castShield', 'castHaste', 'leech', 'block', 'thorns', 'huddle', 'rage', 'ultRate', 'ultPow', 'refund', 'frenzyMax']);

test('each tree is sixteen nodes in seven tiers, with icons, words and modifiers the twenty\'s casts read, fitted to the hero\'s own kit', () => {
  const known = new Set(Object.keys(TAL_KEYS));
  for (const k of COMING) {
    const t = COMING_TREES[k];
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((tier) => t.nodes.filter((n) => n.tier === tier).length), [4, 2, 2, 2, 2, 2, 2], k);
    assert.equal(new Set(t.nodes.map((n) => n.id)).size, 16, k);
    assert.equal(new Set(t.nodes.map((n) => n.name)).size, 16, `${k} names`);
    const own = new Set([...comingHeroKits()[k].slots.map((s) => s.skill.name), comingKits()[k].ultimate!.name]);
    for (const n of t.nodes) {
      assert.ok(n.id.startsWith(`${k}:`) && n.name.length > 2 && n.text.length > 5, n.id);
      assert.ok(!own.has(n.name), `${n.id}: "${n.name}" is not one of the hero's skills`);
      assert.ok(existsSync(`src/art/equip/${n.icon}.png`) && EQUIP_ICONS[n.icon], `${n.id} icon ${n.icon}`);
      assert.ok(!/\b(armor|color|center|defense|favor)\b/i.test(`${n.name} ${n.text}`), `British spelling: ${n.id}`);
      if (n.tier === 1) assert.ok((n.stats || n.scores) && !n.tal && !n.abilities, `${n.id} is a stat node`);
      else assert.ok(n.tal || n.abilities || n.stats, `${n.id} does something`);
      if (n.tier === 2) assert.ok(n.tal, `${n.id} changes the skill`);
      for (const key of Object.keys(n.tal ?? {})) {
        assert.ok(known.has(key), `${n.id} key ${key}`);
        assert.ok(READ.has(key), `${n.id}: ${key} is read by the twenty's casts`);
      }
      for (const id of n.abilities ?? []) assert.ok(TALENT_ABILITIES[id] && ABILITIES[id] === undefined, id);
      if (n.tier >= 4) assert.ok(!/\b(he|she|his|her|him)\b/i.test(n.text), `${n.id} words: ${n.text}`);
    }
    // (a tier-2 node that names a skill names the hero's own skill 1)
    for (const n of t.nodes.filter((x) => x.tier === 2)) assert.ok(n.text.includes(comingKits()[k].skill.name), `${n.id}: ${n.text}`);
    const deep = t.nodes.filter((n) => n.tier >= 4);
    assert.ok(deep.some((n) => n.text.includes(COMING_DEEP_KITS[k].skill)), `${k} skill row`);
    assert.ok(deep.some((n) => n.text.includes(COMING_DEEP_KITS[k].ult)), `${k} ultimate row`);
    const sum = (key: 'hp' | 'atk', from: number, to: number) => t.nodes.filter((n) => n.tier >= from && n.tier <= to).reduce((s, n) => s + (n.stats?.[key] ?? 0), 0);
    assert.ok(sum('hp', 1, 3) <= 0.2 && sum('atk', 1, 3) <= 0.2, k);
    assert.ok(sum('hp', 4, 7) <= 0.5 && sum('atk', 4, 7) <= 0.5, `${k} deep rows`);
  }
});

test('each awakened passive is an ability of the equipment, a different one for every hero of the roster and the twenty', () => {
  const used = new Set(Object.values(PASSIVES).map((p) => p.ability));
  const names = new Set(Object.values(PASSIVES).map((p) => p.name));
  for (const k of COMING) {
    const p = COMING_PASSIVES[k];
    assert.ok(ABILITIES[p.ability], `${k}: ${p.ability}`);
    assert.ok(!used.has(p.ability), `${k}: ${p.ability} is its own`);
    assert.ok(!names.has(p.name), `${k}: ${p.name} is its own`);
    assert.ok(p.text.length > 10, k);
    used.add(p.ability);
    names.add(p.name);
  }
});
