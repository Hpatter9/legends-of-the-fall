import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KITS } from '../src/sim/abilities';
import { UNITS } from '../src/sim/units';
import { TIER_SKILLS } from '../src/sim/tierSkills';
import { SIGNATURES, SPECIAL_STRIPS, tierRing, type Step } from '../src/render/signatures';

const atlas = JSON.parse(readFileSync('src/art/fx/pack/atlas.json', 'utf8')) as Record<string, number[]>;
const vfx = readFileSync('src/render/vfxArt.ts', 'utf8');

/** The skills and ultimates of the heroes (not the foes, not the summons). */
const heroSkills = () =>
  Object.entries(KITS)
    .filter(([id]) => UNITS[id]?.side === 'hero' && !UNITS[id]?.summon)
    .flatMap(([id, k]) => [{ id, name: k.skill.name, kind: 'skill' }, ...(k.ultimate ? [{ id, name: k.ultimate.name, kind: 'ultimate' }] : [])]);

const all = (sig: (typeof SIGNATURES)[string]): Step[] => [...sig.wind, ...sig.cast, ...sig.hit];

test('every hero skill and ultimate, and every foe skill, has a look of its own', () => {
  for (const kit of Object.values(KITS)) {
    for (const name of [kit.skill.name, ...(kit.ultimate ? [kit.ultimate.name] : [])]) {
      const sig = SIGNATURES[name];
      assert.ok(sig, `no signature for ${name}`);
      assert.ok(sig.cast.length >= 1, `${name} casts nothing`);
      assert.ok(sig.hit.length >= 1, `${name} has no hit`);
    }
  }
});

test('every strip a signature names exists', () => {
  for (const [name, sig] of Object.entries(SIGNATURES))
    for (const st of all(sig)) {
      const ok = atlas[st.k] || (SPECIAL_STRIPS.includes(st.k) && (st.k === 'arrow' || vfx.includes(`${st.k},`)));
      assert.ok(ok, `${name} names a strip that is not there: ${st.k}`);
      if (st.l) assert.ok(atlas[st.l], `${name} lands in ${st.l}, not in the atlas`);
    }
});

test('no two heroes share a lead: the first strip of a skill or an ultimate is its own', () => {
  const seen = new Map<string, string>();
  for (const h of heroSkills()) {
    const lead = SIGNATURES[h.name].cast[0];
    // (a hero's skill that a foe or another form also casts is the same skill, not a second look)
    const prev = seen.get(lead.k);
    assert.ok(!prev || prev === h.name, `${h.name} and ${prev} both lead with ${lead.k}`);
    seen.set(lead.k, h.name);
  }
});

test('no foe leads with a hero\'s strip', () => {
  const hero = new Set(heroSkills().map((h) => h.name));
  const lead = new Map(heroSkills().map((h) => [SIGNATURES[h.name].cast[0].k, h.name]));
  const bad: string[] = [];
  for (const [name, sig] of Object.entries(SIGNATURES)) {
    const other = lead.get(sig.cast[0].k);
    if (!hero.has(name) && other) bad.push(`${name} leads with ${sig.cast[0].k}, as ${other} does`);
  }
  assert.deepEqual(bad, []);
});

test('no two heroes\' casts share a layer (the same shape in the same strip and colour)', () => {
  const names = [...new Set(heroSkills().map((h) => h.name))];
  const keys = (n: string) => new Set(SIGNATURES[n].cast.map((s) => `${s.s}:${s.k}:${s.t ?? 0}`));
  const bad: string[] = [];
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) {
      const [a, b] = [keys(names[i]), keys(names[j])];
      const same = [...a].filter((x) => b.has(x)).length;
      if (same > 0) bad.push(`${names[i]} / ${names[j]}: ${same} of ${Math.min(a.size, b.size)}`);
    }
  assert.deepEqual(bad, []);
});

test('no foe look is a copy of a hero\'s', () => {
  const hero = new Set(heroSkills().map((h) => h.name));
  const keys = (n: string) => new Set(SIGNATURES[n].cast.map((s) => `${s.s}:${s.k}:${s.t ?? 0}`));
  const bad: string[] = [];
  for (const f of Object.keys(SIGNATURES).filter((n) => !hero.has(n)))
    for (const h of hero) {
      const [a, b] = [keys(f), keys(h)];
      const same = [...a].filter((x) => b.has(x)).length;
      if (same > 0) bad.push(`${f} / ${h}`);
    }
  assert.deepEqual(bad, []);
});

test('a hero\'s skill and its ultimate look different, and the ultimate is the bigger', () => {
  for (const [id, k] of Object.entries(KITS)) {
    if (!k.ultimate || UNITS[id]?.side !== 'hero') continue;
    const [s, u] = [SIGNATURES[k.skill.name], SIGNATURES[k.ultimate.name]];
    if (k.skill.name === k.ultimate.name) continue;
    assert.notEqual(s.cast[0].k, u.cast[0].k, `${id}: skill and ultimate lead the same`);
    assert.ok(u.cast.length >= s.cast.length, `${id}: the ultimate has fewer layers than its skill`);
  }
});

test('a tier ring is the lead of its hero\'s skill', () => {
  for (const id of Object.keys(TIER_SKILLS)) {
    const k = KITS[id];
    if (!k) continue;
    const ring = tierRing(k.skill.name, 192, true);
    assert.equal(ring.length, 2);
    assert.equal(ring[0].k, SIGNATURES[k.skill.name].cast[0].k);
    assert.equal(tierRing(k.skill.name, 192, false).length, 1);
  }
});

test('sizes and counts are sane (a phone has to draw them)', () => {
  let layers = 0;
  for (const [name, sig] of Object.entries(SIGNATURES))
    for (const st of all(sig)) {
      layers++;
      assert.ok((st.z ?? 1) > 0 && (st.z ?? 1) <= 6.5, `${name}: size ${st.z}`);
      assert.ok((st.n ?? 1) <= 24, `${name}: ${st.n} bits`);
      assert.ok((st.a ?? 1) > 0 && (st.a ?? 1) <= 1);
    }
  assert.ok(layers > 300);
});
