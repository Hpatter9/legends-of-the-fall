import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startBattle } from '../src/sim/battle';
import { CODEX_STONES, crownsClaimed, crownsTotal, crownsWaiting, FOE_ENTRIES, stonesClaimed, stonesTotal, stonesWaiting, claimCodex, codexWaiting, entryOfDef, gotOf, isMet, killsOf, milestonesOf, noteFoes, progressLine, readCodex, tipsOf, totalOf, whereMet, kitOfEntry } from '../src/sim/codex';
import { FOE_LORE, HERO_STORY } from '../src/sim/codexLore';
import { loadMeta, saveMeta, startedMeta } from '../src/sim/meta';
import { settleRun } from '../src/sim/modes';
import { newRun } from '../src/sim/run';
import { ALL_HEROES, UNITS } from '../src/sim/units';

const store = () => {
  const data: Record<string, string> = {};
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
};

test('every foe look is in exactly one entry, and every entry has lore, a place and tips', () => {
  const seen = new Set<string>();
  for (const e of FOE_ENTRIES) {
    for (const d of e.defs) {
      assert.ok(UNITS[d]?.side === 'foe', d);
      assert.ok(!seen.has(d), `${d} twice`);
      seen.add(d);
    }
    assert.ok(FOE_LORE[e.id], `lore for ${e.id}`);
    assert.ok(whereMet(e).length > 0, `where ${e.id} is met`);
    assert.ok(tipsOf(UNITS[e.defs[0]], kitOfEntry(e)).length > 0, e.id);
  }
  for (const d of Object.values(UNITS).filter((u) => u.side === 'foe')) assert.ok(seen.has(d.id), `${d.id} has an entry`);
  assert.deepEqual(Object.keys(FOE_LORE).filter((k) => !FOE_ENTRIES.some((e) => e.id === k)), []);
});

test('every hero has a story of two or three sentences, with no model names', () => {
  for (const k of ALL_HEROES) {
    const s = HERO_STORY[k];
    assert.ok(s, k);
    const n = s.split(/[.!?](?:\s|$)/).filter(Boolean).length;
    assert.ok(n >= 2 && n <= 3, `${k} has ${n} sentences`);
  }
  assert.equal(ALL_HEROES.length, Object.keys(HERO_STORY).length);
  for (const t of [...Object.values(HERO_STORY), ...Object.values(FOE_LORE)]) assert.doesNotMatch(t, /claude|sonnet|opus|haiku|anthropic/i);
});

test('tips read the kit: slow, flying, shooting and healing foes are told apart', () => {
  assert.ok(tipsOf(UNITS.ogre, undefined).some((t) => /Slow/.test(t)));
  assert.ok(tipsOf(UNITS.demon, undefined).some((t) => /Flies/.test(t)));
  assert.ok(tipsOf(UNITS.orcArcher, undefined).some((t) => /afar/.test(t)));
  const lord = entryOfDef('demonLord')!;
  assert.ok(tipsOf(UNITS.demonLord, kitOfEntry(lord)).some((t) => /Calls helpers|Heals/.test(t)));
});

test('a settled fight notes the foes met and the kills, from the units alone', () => {
  const m = startedMeta(1);
  const b = startBattle(3, 'skeletons');
  const foes = b.units.filter((u) => u.side === 'foe');
  foes[0].alive = false;
  foes[1].alive = false;
  const fresh = noteFoes(m, b);
  assert.ok(fresh.some((e) => e.id === 'skeleton'));
  assert.equal(killsOf(m, entryOfDef('skeleton')!), foes.slice(0, 2).filter((u) => u.def === 'skeleton').length);
  assert.ok(isMet(m, entryOfDef('boneArcher')!));
  assert.ok(!isMet(m, entryOfDef('ogre')!));
  // (a second fight adds to the count, and meets nothing new)
  assert.equal(noteFoes(m, b).length, 0);
  assert.equal(killsOf(m, entryOfDef('skeleton')!), 2 * foes.slice(0, 2).filter((u) => u.def === 'skeleton').length);
});

test('settleRun records the codex when it follows a fight, and not without one', () => {
  const m = startedMeta(1);
  const run = newRun(2);
  settleRun(m, run, { won: false, stage: 1, stars: 0 });
  assert.equal(m.codex, undefined);
  const b = startBattle(3, 'orcs');
  b.units.filter((u) => u.side === 'foe')[0].alive = false;
  settleRun(m, run, { won: true, stage: 1, stars: 1, battle: b });
  assert.ok(m.codex!.met.includes('orcGrunt'));
  assert.equal(m.codex!.kills.orcGrunt, 1);
});

test('the same battle always notes the same', () => {
  const a = startedMeta(1);
  const c = startedMeta(2);
  for (const m of [a, c]) {
    const b = startBattle(9, 'minotaurs');
    b.units.filter((u) => u.side === 'foe').forEach((u, i) => (u.alive = i % 2 === 0));
    noteFoes(m, b);
  }
  assert.deepEqual(a.codex, c.codex);
});

test('a boss beaten before the codex counts as met', () => {
  const m = startedMeta(1);
  m.bosses.push('orcWarlord');
  assert.ok(isMet(m, entryOfDef('orcWarlord')!));
});

test('the codex survives a save, and an old save without it loads', () => {
  const m = startedMeta(1);
  const b = startBattle(3, 'demons');
  b.units.filter((u) => u.side === 'foe')[0].alive = false;
  noteFoes(m, b);
  m.codexClaimed = [];
  const s = store();
  saveMeta(m, s as never);
  const back = loadMeta(1, s as never);
  assert.deepEqual(back.codex, m.codex);
  const old = JSON.parse(JSON.stringify(m));
  delete old.codex;
  delete old.codexClaimed;
  s.setItem('legends.meta', JSON.stringify(old));
  const loaded = loadMeta(1, s as never);
  assert.deepEqual(loaded.codex, { met: [], kills: {} });
  assert.deepEqual(loaded.codexClaimed, []);
});

test('a hand-edited record is cleaned up', () => {
  const r = readCodex({ met: ['orcGrunt', 'orcGrunt', 'nonsense', 4], kills: { orcGrunt: 3.7, nonsense: 5, imp: -1, demon: 'x' } });
  assert.deepEqual(r, { met: ['orcGrunt'], kills: { orcGrunt: 3 } });
  assert.deepEqual(readCodex(null), { met: [], kills: {} });
});

test('the progress line counts the two collections', () => {
  const m = startedMeta(1);
  assert.equal(progressLine(m, 'heroes'), `Heroes 5/${ALL_HEROES.length}`);
  assert.equal(progressLine(m, 'bestiary'), `Bestiary 0/${FOE_ENTRIES.length}`);
  assert.equal(gotOf(m, 'heroes'), 5);
});

test('milestones sit at 25, 50, 75 and 100 per cent, each paid once on a claim', () => {
  assert.deepEqual(milestonesOf('heroes').map((x) => x.percent), [25, 50, 75, 100]);
  const m = startedMeta(1);
  // (5 of 45 heroes: no milestone yet)
  assert.equal(codexWaiting(m).length, 0);
  assert.equal(claimCodex(m, 'heroes25'), 0);
  m.unlocked = ALL_HEROES.slice(0, Math.ceil(totalOf('heroes') / 4));
  assert.deepEqual(codexWaiting(m).map((x) => x.id), ['heroes25']);
  const before = m.crowns;
  const paid = claimCodex(m, 'heroes25');
  assert.ok(paid > 0);
  assert.equal(m.crowns, before + paid);
  assert.equal(claimCodex(m, 'heroes25'), 0, 'not twice');
  assert.equal(m.crowns, before + paid);
  assert.equal(claimCodex(m, 'nonsense'), 0);
  // (the bestiary's, once enough are met)
  for (const e of FOE_ENTRIES.slice(0, Math.ceil(FOE_ENTRIES.length / 2))) (m.codex ??= { met: [], kills: {} }).met.push(e.defs[0]);
  assert.deepEqual(codexWaiting(m).map((x) => x.id), ['bestiary25', 'bestiary50']);
  m.unlocked = [...ALL_HEROES];
  assert.deepEqual(codexWaiting(m).map((x) => x.id).sort(), ['bestiary25', 'bestiary50', 'heroes100', 'heroes50', 'heroes75'].sort());
});

test('a claimed milestone stays claimed through a save', () => {
  const m = startedMeta(1);
  m.unlocked = [...ALL_HEROES];
  for (const ms of milestonesOf('heroes')) claimCodex(m, ms.id);
  const s = store();
  saveMeta(m, s as never);
  const back = loadMeta(1, s as never);
  assert.equal(codexWaiting(back).filter((x) => x.collection === 'heroes').length, 0);
  assert.equal(claimCodex(back, 'heroes100'), 0);
});

test('the rewards add up: what each collection pays in all, what is taken and what waits', () => {
  const m = startedMeta(1);
  assert.equal(crownsTotal('bestiary'), 10 + 20 + 35 + 60);
  assert.equal(crownsTotal('heroes'), 15 + 30 + 50 + 80);
  assert.equal(crownsClaimed(m, 'bestiary'), 0);
  assert.equal(crownsWaiting(m), 0);
  m.codexClaimed = ['bestiary25'];
  assert.equal(crownsClaimed(m, 'bestiary'), 10);
});

test('a codex reward pays a summoning stone beside its crowns, once, and an old claim is not paid again', () => {
  assert.equal(CODEX_STONES, 1);
  for (const ms of [...milestonesOf('bestiary'), ...milestonesOf('heroes')]) assert.equal(ms.stones, 1, ms.id);
  assert.equal(stonesTotal('bestiary'), 4);
  assert.equal(stonesTotal('heroes'), 4);
  const m = startedMeta(1);
  m.unlocked = ALL_HEROES.slice(0, Math.ceil(totalOf('heroes') / 2));
  assert.equal(stonesWaiting(m), 2);
  const stones = m.stones ?? 0;
  claimCodex(m, 'heroes25');
  assert.equal(m.stones, stones + 1);
  assert.equal(stonesClaimed(m, 'heroes'), 1);
  assert.equal(claimCodex(m, 'heroes25'), 0);
  assert.equal(m.stones, stones + 1, 'not twice');
  // (a save that claimed milestones before the stones keeps its stones as they are: those claims pay nothing more)
  const old = { ...startedMeta(2), unlocked: [...ALL_HEROES], codexClaimed: milestonesOf('heroes').map((x) => x.id), stones: 4 } as Record<string, unknown>;
  const back = loadMeta(1, { getItem: () => JSON.stringify(old) } as never);
  for (const ms of milestonesOf('heroes')) assert.equal(claimCodex(back, ms.id), 0);
  assert.equal(back.stones, 4);
  assert.equal(stonesWaiting(back), 0);
});
