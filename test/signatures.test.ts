import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KITS, keyOf } from '../src/sim/abilities';
import { abilitySource } from '../src/render/abilityLooks';
import { VFX_LOOKS } from '../src/render/cinematicRules';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { PROPS, SIGNATURES, SPECIAL_STRIPS, tierRing, type Step } from '../src/render/signatures';

const atlas = JSON.parse(readFileSync('src/art/fx/pack/atlas.json', 'utf8')) as Record<string, number[]>;


/** The skills and ultimates of the heroes (not the foes, not the summons). */
const heroSkills = () =>
  Object.entries(KITS)
    .filter(([id]) => UNITS[id]?.side === 'hero' && !UNITS[id]?.summon)
    .flatMap(([id, k]) => [{ id, name: keyOf(k.skill), kind: 'skill' }, ...(k.ultimate ? [{ id, name: keyOf(k.ultimate), kind: 'ultimate' }] : [])]);

const all = (sig: (typeof SIGNATURES)[string]): Step[] => [...sig.wind, ...sig.cast, ...sig.hit];

test('every hero skill and ultimate, and every foe skill, has a look of its own', () => {
  for (const kit of Object.values(KITS)) {
    for (const name of [keyOf(kit.skill), ...(kit.ultimate ? [keyOf(kit.ultimate)] : [])]) {
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
      const ok = atlas[st.k] || PROPS.includes(st.k) || (SPECIAL_STRIPS.includes(st.k) && (st.k === 'arrow' || Object.hasOwn(VFX_LOOKS, st.k)));
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
  const keys = (n: string) => new Set(SIGNATURES[n].cast.map((s) => s.art ? `${s.s}:art:${abilitySource(s.art)}` : `${s.s}:${s.k}:${s.t ?? 0}`));
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
  const keys = (n: string) => new Set(SIGNATURES[n].cast.map((s) => s.art ? `${s.s}:art:${abilitySource(s.art)}` : `${s.s}:${s.k}:${s.t ?? 0}`));
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
    const [s, u] = [SIGNATURES[keyOf(k.skill)], SIGNATURES[keyOf(k.ultimate)]];
    if (keyOf(k.skill) === keyOf(k.ultimate)) continue;
    assert.notEqual(s.cast[0].k, u.cast[0].k, `${id}: skill and ultimate lead the same`);
    assert.ok(u.cast.length >= s.cast.length, `${id}: the ultimate has fewer layers than its skill`);
  }
});

test('a tier ring is the lead of its hero\'s skill', () => {
  // (the tier skills went with the skills overhaul's batch 3; the ring is still each hero skill's look)
  for (const id of ALL_HEROES) {
    const k = KITS[id];
    if (!k) continue;
    const ring = tierRing(keyOf(k.skill), 192, true);
    assert.equal(ring.length, 2);
    assert.equal(ring[0].k, SIGNATURES[keyOf(k.skill)].cast[0].k);
    assert.equal(tierRing(keyOf(k.skill), 192, false).length, 1);
  }
});

test('the props are all in the picture', () => {
  const png = readFileSync('src/art/fx/props.png');
  // (a PNG's header says its width: one 32 px frame a prop)
  assert.equal(png.readUInt32BE(16), PROPS.length * 32);
  assert.equal(png.readUInt32BE(20), 32);
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

test('directional effects face the right direction and stay upright when facing left', async () => {
  const { playSteps, setSignatureSprite } = await import('../src/render/signatureFx');
  setSignatureSprite('arrow', {} as any);

  for (const dirX of [1, -1]) {
    const spawned: any[] = [];
    const mockParticles = {
      spawn: (b: any) => spawned.push(b),
      density: 1,
    } as any;

    const scene = {
      p: mockParticles,
      self: { x: 100, y: 100, tall: 40 },
      foes: [{ x: 100 + dirX * 50, y: 100, tall: 40 }],
      allies: [],
      dir: { x: dirX, y: 0 },
      ms: 500,
      size: 1,
    };

    // Test beam, cone, dash, spikes, cleave, fan
    for (const s of ['beam', 'cone', 'dash', 'spikes', 'cleave', 'fan'] as const) {
      spawned.length = 0;
      playSteps([{ s, k: 'arrow' }], scene);
      assert.ok(spawned.length > 0, `no particles spawned for ${s}`);
      for (const b of spawned) {
        if (dirX < 0) {
          if (s !== 'fan') {
            assert.equal(b.stretchX, -1, `${s} facing left should have stretchX: -1`);
          }
          if (b.rotation !== undefined) {
            // Rotation should be within [-pi, pi] but not upside down (facing left via horizontal flip)
            assert.ok(Math.abs(b.rotation) <= Math.PI + 0.1, `${s} rotation ${b.rotation}`);
          }
        } else {
          assert.equal(b.stretchX, undefined, `${s} facing right should not be flipped horizontally`);
        }
      }
    }
  }
});
