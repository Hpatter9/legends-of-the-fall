import { bareBoard } from './bare';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { addUnit, startBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { castSpell, METEOR_MS, SHOWER_GAP, SPELL_IDS, SPELLS, type SpellId } from '../src/sim/spells';
import { CUES, cuesFor, spellCues } from '../src/render/soundRules';
import { NO_TILE_SPELLS, panOfEvent } from '../src/render/audioRules';
import { SPELL_SFX_FILES, type SpellSfxId } from '../src/render/spellSfxManifest';
import { EFFECT_DELAY, HOP_MS, SPELL_FILES, WHOOMP_MS, castOf, coveredBySpells, effectOf, spellParts } from '../src/render/spellSfx';

/** A flat board mid-fight: three wounded heroes, one fallen, and a band of foes around (3, 3), with room to spare. */
function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.spells.mana = 10;
  for (const [u, v] of [[3, 6], [4, 6], [2, 6]] as const) {
    const h = addUnit(b, 'knight', u, v);
    h.hp = Math.round(h.maxHp / 3);
  }
  const fallen = addUnit(b, 'archer', 3, 5);
  fallen.alive = false;
  fallen.hp = 0;
  for (const [u, v] of [[3, 3], [4, 3], [2, 2], [5, 2], [3, 1]] as const) {
    const f = addUnit(b, 'skeleton', u, v);
    f.hp = f.maxHp = 5000;
  }
  return b;
}

/** Where to cast each: on the foes for harm, the heroes for help, the fallen for Resurrect, an empty tile for Blink and the wolves. */
const TILE: Partial<Record<SpellId, [number, number]>> = {
  heal: [3, 6], shield: [3, 6], haste: [3, 6], cleanse: [3, 6], renewal: [3, 6], resurrect: [3, 5], blink: [6, 4], wolves: [6, 4],
};

/** Casts `id` and returns the events it leaves for the next tick. */
function cast(id: SpellId): { b: Battle; e: Extract<BattleEvent, { kind: 'spell' }>; events: BattleEvent[] } {
  const b = arena();
  const [u, v] = TILE[id] ?? [3, 3];
  assert.ok(castSpell(b, id, u, v), `${id} cast`);
  const events = b.spells.events.splice(0);
  const e = events.find((x): x is Extract<BattleEvent, { kind: 'spell' }> => x.kind === 'spell')!;
  return { b, e, events };
}

const landing = (file: SpellSfxId) => ((SPELL_SFX_FILES[file] as { impact?: number }).impact ?? 0) * 1000;

test('every king\'s spell has its own cast and its own effect, and both files exist', () => {
  const casts = new Set<string>();
  const effects = new Set<string>();
  for (const id of SPELL_IDS) {
    const { b, e, events } = cast(id);
    const parts = spellParts(b, e, events);
    const c = parts.filter((p) => p.role === 'cast');
    const fx = parts.filter((p) => p.role === 'effect');
    assert.equal(c.length, 1, `${id}: one cast`);
    assert.equal(c[0].file, castOf(id));
    assert.equal(c[0].delay, 0, `${id}: the cast goes off with the spell`);
    assert.ok(fx.length >= 1, `${id}: an effect`);
    for (const p of parts) assert.ok(p.file in SPELL_SFX_FILES, `${p.file} is in the manifest`);
    casts.add(c[0].file);
    effects.add(id === 'meteor' ? 'fx-meteor' : effectOf(id));
    // (in the stereo field, never past the engine's limit)
    for (const p of parts) assert.ok(Math.abs(p.pan) <= 0.6, `${id} pan`);
  }
  assert.equal(casts.size, SPELL_IDS.length, 'no two spells share a cast');
  assert.equal(effects.size, SPELL_IDS.length, 'no two spells share an effect');
});

test('the effects are timed to the spells: the meteor lands on its fall, each of the shower\'s five on its own', () => {
  {
    const { b, e, events } = cast('meteor');
    const fx = spellParts(b, e, events).filter((p) => p.role === 'effect');
    assert.equal(fx.length, 1);
    assert.equal(fx[0].file, 'fx-meteor');
    assert.equal(fx[0].delay + landing('fx-meteor'), METEOR_MS, 'the blast in the file lands when the meteor does');
  }
  {
    const { b, e, events } = cast('starfall');
    const stars = spellParts(b, e, events).filter((p) => p.file === 'fx-star');
    const falls = events.filter((x) => x.kind === 'area');
    assert.equal(stars.length, falls.length);
    assert.equal(stars.length, 5);
    stars.forEach((p, i) => assert.equal(p.delay + landing('fx-star'), METEOR_MS + i * SHOWER_GAP, `star ${i}`));
  }
  {
    // (a zap for each leap, one after another)
    const { b, e, events } = cast('chain');
    const hops = spellParts(b, e, events).filter((p) => p.file === 'fx-chain-hop');
    const arcs = events.filter((x) => x.kind === 'arc');
    assert.ok(arcs.length >= 1);
    assert.equal(hops.length, arcs.length);
    hops.forEach((p, i) => assert.equal(p.delay, HOP_MS * (i + 1)));
  }
  // (the rest burst with the spell's look: within the cast's whoomp and a little after)
  for (const id of SPELL_IDS) {
    if (id === 'meteor' || id === 'starfall') continue;
    assert.ok(EFFECT_DELAY[id] >= 0 && EFFECT_DELAY[id] <= WHOOMP_MS + 40, `${id}: ${EFFECT_DELAY[id]} ms`);
  }
});

test('the spell\'s own sound stands in for the plain cues it would double, and the old cues remain as the fallback', () => {
  const { events } = cast('meteor');
  const area = events.find((x) => x.kind === 'area')!;
  assert.ok(coveredBySpells(events).has(area), 'the king\'s meteor is the spell\'s');
  const heal = cast('heal').events;
  assert.ok(heal.filter((x) => x.kind === 'heal').every((x) => coveredBySpells(heal).has(x)));
  // (a tick with no spell leaves everything alone)
  assert.equal(coveredBySpells([{ kind: 'heal', to: 1, amount: 5 }]).size, 0);
  // (without the files, a meteor's fall is heard once, from its area event, not twice)
  assert.deepEqual(spellCues('meteor'), []);
  const b = arena();
  assert.deepEqual(cuesFor(b, area).map((q) => q.cue), ['meteorFall', 'fireBoom', 'thunder']);
  // (every fallback names a real cue)
  for (const id of SPELL_IDS) {
    const { b: bb, e, events: ev } = cast(id);
    for (const p of spellParts(bb, e, ev)) for (const q of p.fallback) assert.ok(CUES[q.cue], q.cue);
  }
  // (a spell cast on no tile is heard in the middle, not at the board's corner)
  assert.deepEqual([...NO_TILE_SPELLS].sort(), SPELL_IDS.filter((x) => SPELLS[x].target === 'all').sort());
  for (const id of SPELL_IDS.filter((x) => SPELLS[x].target === 'all')) {
    const { b: bb, e, events: ev } = cast(id);
    assert.equal(panOfEvent(bb, e), 0);
    assert.ok(spellParts(bb, e, ev).every((p) => p.pan === 0), id);
  }
});

test('the files on disk match the manifest, are listed for the offline cache, and stay small', () => {
  const onDisk = readdirSync('src/sfx').filter((f) => f.endsWith('.opus')).map((f) => f.replace('.opus', '')).sort();
  assert.deepEqual(onDisk, [...SPELL_FILES].sort());
  let total = 0;
  for (const id of SPELL_FILES) {
    const bytes = statSync(`src/sfx/${id}.opus`).size;
    assert.equal(bytes, SPELL_SFX_FILES[id].bytes, id);
    total += bytes;
  }
  assert.ok(total < 600 * 1024, `${Math.round(total / 1024)} KB`);
  // (build.mjs copies src/sfx into sfx/ and adds each to the service worker's list, as it does the music)
  const build = readFileSync('build.mjs', 'utf8');
  assert.match(build, /readdirSync\('src\/sfx'\)/);
  assert.match(build, /AUDIO_FILES\.push\(`sfx\/\$\{f\}`\)/);
});
