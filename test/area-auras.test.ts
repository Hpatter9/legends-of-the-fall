// AURAS-BLENDER, the area auras (docs/notes/auras-blender.md): the eleven auras on the ground are rendered in Blender and packed as
// one small session of the spell atlases; what drifts in a field is in its ground's picture, under whoever stands in it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { SPELL_SESSIONS, spellPart } from '../src/render/spellLooks';
import { AURA_ALPHA, AURA_MOTES } from '../src/render/movePaints';
import { auraLook } from '../src/render/toolkitLooks';

const AREA = ['aura-protection', 'spirit-guardians', 'aura-rot', 'storm-cloud', 'mana-font', 'healing-mist', 'cloud-of-daggers', 'slow-field', 'spike-growth', 'bardic-notes', 'circle-of-death'];

test('every area aura has its rendered ground, a whole loop, in the one small session', () => {
  const s = SPELL_SESSIONS['b-auras'];
  for (const k of AREA) {
    const g = spellPart(`${k}.ground`);
    assert.ok(g, `${k} has a ground`);
    assert.equal(g!.session, 'b-auras', `${k} is packed with the rest`);
    assert.equal(g!.frames, 8, `${k}: a loop of eight`);
    assert.equal(g!.loop, true);
    assert.ok(s.parts[`${k}.motes`] || s.parts[`${k}.impact`], `${k} has its motes or its strike`);
  }
  // (no other session still holds a painted copy of one)
  for (const [name, m] of Object.entries(SPELL_SESSIONS)) if (name !== 'b-auras') for (const key of Object.keys(m.parts)) assert.ok(!AREA.includes(key.split('.')[0]), `${key} in ${name}`);
  assert.ok(statSync('src/art/fx/spells/b-auras.webp').size < 200_000, 'the atlas stays small (the painted one was 257,824 bytes)');
  // (every look an aura's name can ask for is one of them)
  for (const what of ['Aura of Protection', 'contagion rot', 'storm cloud', 'font of magic', 'Spirit Guardians', 'Healing Mist', 'cloud of daggers', 'slow field', 'circle of death', 'spike growth', 'anthem', 'anything else'])
    assert.ok(AREA.includes(auraLook(what).paint!), what);
});

test('what drifts in a field lies in its ground, under the fighters: only a sheet with motes of its own to say circles them in the air', () => {
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  const at = fx.indexOf('private paintAura(');
  const body = fx.slice(at, fx.indexOf('private lookOnce(', at));
  assert.match(body, /if \(!own\) return true;/);
  assert.ok(body.indexOf('if (!own) return true;') < body.indexOf('this.paintLoop(`${sheet}.motes`'), 'before any mote is laid in the air');
  assert.deepEqual(Object.keys(AURA_MOTES), ['spirit-guardians']);
  // (the ground is laid on the tiles under the fighters, and holds its first frame under reduced motion)
  assert.match(body, /ground: o\.hang \? undefined : o\.ground/);
  assert.ok(AURA_ALPHA > 0.7 && AURA_ALPHA <= 1);
  // (the builder renders effects only, and the painted importer leaves the rendered session alone)
  const builder = readFileSync('tools/blender-fx/auras/area.py', 'utf8');
  for (const k of AREA) assert.ok(builder.includes(`'${k}': dict(ground=`), k);
  assert.match(readFileSync('tools/spell-fx/import-spell-art.py', 'utf8'), /RENDERED_SESSIONS = \{'b-auras'\}/);
});
