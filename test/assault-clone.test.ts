// The Assault's battle can always be cloned (HOLD-SOUND round 2, docs/notes/hold-sound.md): the worker posts it to the page every batch
// and keeps it for a resume every twenty seconds, both by structured clone, which fails on a function anywhere in it. A boss's second form
// used to put a kit (whose skills are functions) on its unit: from the lord's change of form on, no batch reached the page (its battle
// froze) and no snapshot was kept. So did a Sure-footed nemesis, from the first tick.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES } from '../src/sim/armies';
import { blueprintOf, startAssault, stepAssault } from '../src/sim/assault/assault';
import { applyMirror, packMirror } from '../src/sim/assault/mirror';
import { enterPhase } from '../src/sim/bossPhases';
import { kitOf, kitOfRef, refOfKind, KITS } from '../src/sim/abilities';
import { nemStart } from '../src/sim/nemesisTraits';
import type { Battle, Unit } from '../src/sim/battle';
import { input } from './assaultKit';

/** Where the first function in `x` is (null for none): what a failed clone would have choked on. */
function functionIn(x: unknown, path = 'battle', seen = new Set<unknown>()): string | null {
  if (typeof x === 'function') return path;
  if (!x || typeof x !== 'object' || seen.has(x) || ArrayBuffer.isView(x)) return null;
  seen.add(x);
  const entries: [string, unknown][] = x instanceof Map ? [...x.entries()].map(([k, v]) => [String(k), v]) : Object.entries(x);
  for (const [k, v] of entries) {
    const at = functionIn(v, `${path}.${k}`, seen);
    if (at) return at;
  }
  return null;
}

const HOLDS = ARMIES.filter((a) => blueprintOf(a.id)).map((a) => a.id);

test('every hold\'s battle can be cloned as it starts and after its lord has changed form, and each batch reaches the page', () => {
  assert.equal(HOLDS.length, 9);
  for (const army of HOLDS) {
    const b = startAssault(input({ army, auto: true }));
    assert.equal(functionIn(b), null, `${army}: no function in the battle as it starts`);
    assert.doesNotThrow(() => structuredClone(b), `${army} starts`);
    const copy = structuredClone(b);
    const sent = new Set(b.units.map((x) => x.id));
    const lord = b.field!.byId[b.field!.hold!.lord];
    assert.ok(lord, `${army} has a lord`);
    // (the lord changes form, as he does when his health falls to the mark)
    if (lord.phase && !lord.phase.done) enterPhase(b, lord, []);
    assert.equal(lord.kit, undefined, `${army}: no kit of functions on the lord`);
    for (let n = 0; n < 30 && b.phase === 'fight'; n++) {
      const ev = stepAssault(b);
      const msg = packMirror(b, [{ ev, hold: b.field!.hold!.events.slice() }], [], sent);
      assert.equal(functionIn(msg), null, `${army}: no function in a batch`);
      applyMirror(copy, structuredClone(msg));
    }
    assert.equal(functionIn(b), null, `${army}: no function in the battle after the change of form`);
    // (what the snapshot for a resume does, and the page's copy stands where the worker's does)
    const kept = structuredClone(b);
    assert.equal(kept.t, b.t);
    assert.equal(copy.field!.byId[lord.id].hp, lord.hp);
    // (the kept battle's lord still fights in his second form: the kit is found again from the plain data)
    const again = kept.field!.byId[lord.id];
    assert.equal(kitOf(again)?.skill.name, kitOf(lord)?.skill.name, `${army}: the resumed lord has the same skill`);
    assert.equal(kitOf(again)?.ultimate?.name, kitOf(lord)?.ultimate?.name, `${army}: and the same ultimate`);
  }
});

test('a kit carried as plain data is the kit it names, the same object each time, and survives a clone', () => {
  const ref = refOfKind('lichKing', { steady: true })!;
  const kit = kitOfRef(ref)!;
  assert.equal(kit.skill, KITS.lichKing.skill);
  assert.equal(kit.ultimate, KITS.lichKing.ultimate);
  assert.equal(kit.passive.steady, true);
  assert.equal(kitOfRef(ref), kit, 'made once');
  const back = kitOfRef(structuredClone(ref))!;
  assert.equal(back.skill, kit.skill);
  assert.deepEqual(back.passive, kit.passive);
  assert.equal(refOfKind('no such fighter'), undefined);
});

test('a Sure-footed nemesis keeps its feet without a function on its unit', () => {
  const u = { id: 1, def: 'orcWarlord', nem: { traits: ['sureFooted'] } } as unknown as Unit;
  nemStart(u, kitOf(u));
  assert.equal(u.kit, undefined);
  assert.equal(kitOf(u)?.passive.steady, true);
  assert.equal(kitOf(u)?.skill, KITS.orcWarlord.skill);
  assert.equal(functionIn(u), null);
  assert.doesNotThrow(() => structuredClone({ units: [u] } as unknown as Battle));
});
