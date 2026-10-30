// Every hero's longer title (docs/notes/bench-titles.md): "Name, Title" in the big places, the short name in the small boxes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { HERO_NAMES, heroClassLabel, heroEpithet, heroName, heroTitle } from '../src/sim/heroNames';

test('every hero has a title of its own', () => {
  const seen = new Set<string>();
  for (const k of ALL_HEROES) {
    const t = HERO_NAMES[k].title;
    assert.ok(t && t.trim() === t, `${k} has a title`);
    assert.ok(!seen.has(t.toLowerCase()), `"${t}" is used once`);
    seen.add(t.toLowerCase());
    assert.equal(heroEpithet(k), t);
    assert.equal(heroTitle(k), `${heroName(k)}, ${t}`);
    // (the title is not the name again, nor the bare class)
    assert.ok(!t.includes(heroName(k)), `${k}'s title does not repeat its name`);
    assert.notEqual(t, UNITS[k].name, `${k}'s title is more than its class`);
  }
  assert.equal(seen.size, ALL_HEROES.length);
});

test('a title is short enough for the summon reveal on a 360px phone', () => {
  // (the reveal's heading holds about 22 letters a line at 360px; two lines at most, so 32 letters with the name)
  for (const k of ALL_HEROES) {
    assert.ok(HERO_NAMES[k].title.length <= 24, `${k}: "${HERO_NAMES[k].title}" is 24 letters at most`);
    assert.ok(heroTitle(k).length <= 32, `${k}: "${heroTitle(k)}" is 32 letters at most`);
  }
});

test('a title is written in plain words, British style', () => {
  for (const k of ALL_HEROES) {
    const t = HERO_NAMES[k].title;
    assert.ok(/^[A-Za-z][A-Za-z' -]*[A-Za-z]$/.test(t), `${k}: "${t}" is plain words`);
    assert.ok(!/(color|armor|honor|center|gray)\b/i.test(t), `${k}: "${t}" is spelt the British way`);
  }
});

test('anything that is not a hero keeps its unit name', () => {
  assert.equal(heroTitle('skeleton'), UNITS.skeleton.name);
  assert.equal(heroEpithet('skeleton'), '');
  assert.equal(heroClassLabel('skeleton'), UNITS.skeleton.name);
});
