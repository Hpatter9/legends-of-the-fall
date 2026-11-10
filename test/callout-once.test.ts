// CALLOUT-ONCE (docs/notes/callout-twice.md; the owner: "When an enemy calls out a hero, the call out plays twice"): a nemesis standing in
// a wave where it also challenges a hero to a duel had two cut-ins queued, its wave's taunt and then the challenge, each naming the hero and
// each with the hero's answer. A foe calls out once a wave: the challenge takes the taunt's place.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armyRun, recruit, type Run } from '../src/sim/run';
import { startedMeta } from '../src/sim/meta';
import { newWar, snapOf, type Nemesis } from '../src/sim/nemesis';
import { decorate } from '../src/sim/revenge';
import { duelOffer, offerSnap } from '../src/sim/duel';
import { onceEach, tauntFor, wavesTaunts, type Taunt } from '../src/tauntCutRules';
import { duelTaunt } from '../src/duelRules';

/** An Undead Legion run at wave 3 with two nemeses standing in it: one dreads the knight (it challenges him), the other only taunts. */
function wave(): { run: Run; dreads: Nemesis; other: Nemesis } {
  const m = startedMeta(3);
  m.war = newWar();
  const mk = (extra: Partial<Nemesis>): Nemesis => {
    const n: Nemesis = { id: m.war!.nextId++, base: 'skeleton', army: 'undead', name: `Rattle${m.war!.nextId}`, epithet: 'the Bony', rank: 'lieutenant', loyalty: 60, might: 3, scars: 0, traits: ['scarred'], weak: [], known: [], memory: [], met: 1, lost: 0, born: 0, ...extra };
    m.war!.members.push(n);
    return n;
  };
  const dreads = mk({ weak: ['dread:knight'] });
  const other = mk({ base: 'spearman' });
  const run = armyRun(11, 'undead', ['knight', 'wizard', 'cleric'], undefined, 0);
  run.roster = [];
  run.squad = [];
  for (const k of ['knight', 'wizard', 'cleric']) run.squad.push(recruit(run, k).id);
  run.stage = 3;
  run.nemesis = { members: [decorate(m, snapOf(dreads), dreads), decorate(m, snapOf(other), other)], waves: { '3': [dreads.id, other.id] } };
  return { run, dreads, other };
}

/** What the page queues at a wave's start: the wave's taunts, then the challenge's cut-in, with a foe once. */
function queued(run: Run, shown = new Set<number>()): Taunt[] {
  const field = ['knight', 'wizard', 'cleric'];
  const taunts = wavesTaunts(run.nemesis, run.stage, shown).map((s) => ({ t: tauntFor(s, field, run.seed) }));
  const o = duelOffer(run);
  const s = o && offerSnap(run, o);
  return onceEach(taunts, o && s ? [{ t: duelTaunt(o, s, run.seed) }] : []).map((x) => x.t);
}

test('a nemesis that challenges a hero calls out once: the challenge takes the place of its taunt', () => {
  const { run, dreads, other } = wave();
  const o = duelOffer(run)!;
  assert.equal(o.id, dreads.id, 'the knight is challenged');
  // (the cause: both its taunt and the challenge name the knight)
  assert.equal(tauntFor(offerSnap(run, o)!, ['knight', 'wizard', 'cleric'], run.seed).hero, 'knight');
  const q = queued(run);
  assert.deepEqual(q.map((t) => t.id), [dreads.id, other.id], 'each foe once, in the order they stand');
  assert.equal(q[0].line, duelTaunt(o, offerSnap(run, o)!, run.seed).line, 'the one left is the challenge');
  const lines = q.flatMap((t) => [t.line, t.reply]).filter(Boolean);
  assert.equal(lines.length, new Set(lines).size, 'no line said twice');
});

test('a call-out is offered once per foe per wave', () => {
  const t = (id: number, line: string) => ({ t: { id, line } });
  assert.deepEqual(onceEach([t(1, 'a'), t(2, 'b')], [t(1, 'c')]).map((x) => x.t.line), ['c', 'b'], 'a later one for the same foe takes its place');
  assert.deepEqual(onceEach([t(1, 'a'), t(1, 'b')], []).length, 2, 'the queue as it was is kept as given');
  assert.deepEqual(onceEach([], [t(1, 'a'), t(1, 'b')]).map((x) => x.t.line), ['b'], 'two at once for one foe: one');
  assert.deepEqual(onceEach([t(2, 'b')], [t(1, 'c')], { id: 1 }).map((x) => x.t.line), ['b'], 'the foe showing now has had its say');
  assert.deepEqual(onceEach([], [t(3, 'd')]).map((x) => x.t.line), ['d']);
});

test('a wave with no challenge keeps every taunt, each once; one already met this run is not called again', () => {
  const { run, dreads, other } = wave();
  run.duel = { id: dreads.id, wave: 1, hero: 0, outcome: 'refused' } as unknown as Run['duel'];
  assert.equal(duelOffer(run), undefined);
  assert.deepEqual(queued(run).map((t) => t.id), [dreads.id, other.id]);
  assert.deepEqual(queued(run, new Set([dreads.id])).map((t) => t.id), [other.id]);
});
