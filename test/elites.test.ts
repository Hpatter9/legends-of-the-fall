import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, place, playOut, stepBattle } from '../src/sim/battle';
import { boostOf, newRun, saveRun, loadRun, SQUAD, startStage } from '../src/sim/run';
import { newMeta } from '../src/sim/meta';
import { towerRun } from '../src/sim/modes';
import { kitOf } from '../src/sim/abilities';
import { drawOffer, ELITES, ELITE_BY_ID, eliteAt, eliteOrder, eliteOfDef, OFFER_SIZE, takeRelic, tierOf } from '../src/sim/elites';
import { ALL_RELIC_IDS, RELIC_IDS, RELICS, relicEffects } from '../src/sim/relics';
import { SETS, SET_IDS, setBonus, setOf } from '../src/sim/relicSets';
import { enterNode, fightSpec, finishTower, makeMap, type NodeKind } from '../src/sim/tower';
import { UNITS } from '../src/sim/units';
import { frontSpots } from '../tools/autoplay';

const store = () => {
  const s: Record<string, string> = {};
  return { getItem: (k: string) => s[k] ?? null, setItem: (k: string, v: string) => void (s[k] = v) };
};

test('there are twelve elites, four to a tier, each a fighter with a kit, a title and an escort that exist', () => {
  assert.equal(ELITES.length, 12);
  for (const tier of [1, 2, 3]) assert.equal(ELITES.filter((e) => e.tier === tier).length, 4);
  for (const e of ELITES) {
    assert.ok(UNITS[e.def] && UNITS[e.def].side === 'foe', `${e.id} is a foe`);
    assert.ok(kitOf({ def: e.def } as never), `${e.id} has a kit`);
    assert.ok(e.name && e.epithet && e.trait);
    assert.ok(e.escort.length >= 3 && e.escort.length <= 4);
    for (const id of e.escort) assert.ok(UNITS[id], `${e.id}'s escort ${id}`);
    assert.equal(ELITE_BY_ID[e.id], e);
    assert.equal(eliteOfDef(e.def), e);
  }
  assert.equal(new Set(ELITES.map((e) => e.id)).size, 12);
});

test('which elite waits at a node is the same from the same seed, and the map itself is untouched', () => {
  for (let seed = 1; seed <= 60; seed++) {
    for (const act of [1, 2, 3, 4]) {
      const map = makeMap(seed, act);
      const before = JSON.stringify(map);
      assert.deepEqual(eliteOrder(seed, act).map((e) => e.id), eliteOrder(seed, act).map((e) => e.id));
      for (const n of map) {
        const e = eliteAt(seed, act, map, n.id);
        if (n.kind !== 'elite') assert.equal(e, undefined);
        else {
          assert.ok(e && e.tier === tierOf(act), `seed ${seed} act ${act}: a tier ${tierOf(act)} elite`);
          assert.equal(eliteAt(seed, act, map, n.id), e);
        }
      }
      assert.equal(JSON.stringify(makeMap(seed, act)), before);
      assert.equal(JSON.stringify(map), before, 'picking elites does not touch the map');
    }
  }
  const orders = new Set<string>();
  for (let seed = 1; seed <= 40; seed++) orders.add(eliteOrder(seed, 1).map((e) => e.id).join());
  assert.ok(orders.size > 4, 'the seed decides the order');
});

/** A tower run standing at its first elite node. */
const atElite = (seed: number) => {
  const run = towerRun(seed, newMeta(1));
  const t = run.tower!;
  const node = t.map.find((n) => n.kind === 'elite')!;
  // (walk the run to the elite's row: only the pick matters here)
  run.stage = node.row + 1;
  t.row = node.row;
  t.at = -1;
  const rowNodes = t.map.filter((n) => n.row === node.row);
  assert.ok(rowNodes.includes(node));
  return { run, node };
};

test('an elite node brings its named elite: its fighter leads, its escort follows, and it is boosted', () => {
  for (const seed of [3, 7, 21]) {
    const { run, node } = atElite(seed);
    assert.ok(enterNode(run, node.id));
    const spec = run.tower!.cur!.fight!;
    const e = eliteAt(run.seed, run.tower!.act, run.tower!.map, node.id)!;
    assert.equal(spec.elite, e.id);
    assert.deepEqual(spec.band, [e.def, ...e.escort]);
    assert.deepEqual(spec.stage.boss, e.boost);
    assert.ok(spec.stage.foes!.hp! > fightSpec(run, 'fight', run.stage).stage.foes!.hp!, 'the elite band is stronger');
    const b = startStage(run);
    const lead = b.units.find((u) => u.side === 'foe' && u.def === e.def)!;
    assert.ok(lead && lead.maxHp > UNITS[e.def].hp, 'the leader stands in the band, boosted');
    assert.equal(UNITS[e.def].name.length > 0, true);
  }
});

/** A won elite fight, settled. */
const wonElite = (seed = 4) => {
  const run = towerRun(seed, newMeta(1));
  for (const h of run.roster) h.bump = { hp: 6, atk: 6 };
  const node = run.tower!.map.find((n) => n.row === 0 && n.kind === 'fight')!;
  assert.ok(enterNode(run, node.id));
  run.tower!.cur!.kind = 'elite' as NodeKind;
  const b = startStage(run);
  const spots = frontSpots(b);
  run.squad.slice(0, SQUAD).forEach((id, i) => {
    const h = run.roster.find((x) => x.id === id)!;
    place(b, h.kind, spots[i][0], spots[i][1], h.id, boostOf(h));
  });
  fight(b);
  playOut(b);
  assert.equal(b.phase, 'won');
  return { run, b };
};

test('beating an elite pays a choice of three relics, one at least from a set, and more gold', () => {
  const { run, b } = wonElite();
  const plain = wonElite();
  plain.run.tower!.cur!.kind = 'fight';
  finishTower(plain.run, plain.b, true);
  finishTower(run, b, true);
  const offer = run.tower!.offer!;
  assert.equal(offer.length, OFFER_SIZE);
  assert.equal(new Set(offer).size, OFFER_SIZE);
  assert.ok(offer.some((id) => setOf(id)), 'one at least is from a set');
  for (const id of offer) assert.ok(RELICS[id] && !run.relics?.includes(id));
  assert.equal(plain.run.tower!.offer, undefined, 'a plain fight offers none');
  assert.ok(run.gold > plain.run.gold, 'an elite pays more gold');
  assert.equal(run.relics, undefined, 'none is owned until one is taken');
  // (the offer survives a save)
  const io = store();
  saveRun(run, io);
  assert.deepEqual(loadRun(io)!.tower!.offer, offer);
  assert.equal(takeRelic(run, 'nope'), null);
  assert.equal(takeRelic(run, offer[1]) !== null, true);
  assert.deepEqual(run.relics, [offer[1]]);
  assert.equal(run.tower!.offer, undefined);
  assert.equal(takeRelic(run, offer[0]), null, 'only one is taken');
});

test('the offer is the same from the same run, and leans to a set already begun', () => {
  const { run } = atElite(5);
  assert.deepEqual(drawOffer(run, 9), drawOffer(run, 9));
  for (const set of SET_IDS) {
    const r = towerRun(5, newMeta(1));
    r.relics = [SETS[set].relics[0]];
    for (let floor = 1; floor <= 30; floor++) {
      const o = drawOffer(r, floor);
      assert.ok(setOf(o[0])?.id === set, `${set}: the first relic offered continues the set`);
      assert.ok(!o.includes(SETS[set].relics[0]));
    }
  }
  const all = towerRun(5, newMeta(1));
  all.relics = [...ALL_RELIC_IDS];
  assert.deepEqual(drawOffer(all, 3), [], 'nothing left, nothing offered');
});

test('the sets: five of three or four relics each, every relic in one set at most, with art', () => {
  assert.ok(SET_IDS.length >= 4 && SET_IDS.length <= 6);
  const seen = new Set<string>();
  for (const id of SET_IDS) {
    const s = SETS[id];
    assert.ok(s.relics.length >= 3 && s.relics.length <= 4);
    for (const r of s.relics) {
      assert.ok(RELICS[r], `${r} exists`);
      assert.ok(!seen.has(r), `${r} is in one set`);
      seen.add(r);
    }
  }
  assert.equal(RELIC_IDS.length, 12, 'the older relics are the old pool');
  assert.ok(ALL_RELIC_IDS.length > 12);
});

test('set bonuses switch on at two and three pieces', () => {
  for (const id of SET_IDS) {
    const s = SETS[id];
    const [a, b, c] = s.relics;
    const own = (...ids: string[]) => relicEffects(ids);
    const none = setBonus([a]);
    assert.deepEqual(none, { fx: {}, hooks: {} }, `${id}: one piece gives no bonus`);
    const two = setBonus([a, b]);
    assert.deepEqual(two.hooks, {}, `${id}: two give no hook`);
    assert.ok(Object.keys(two.fx).length > 0, `${id}: two give a small bonus`);
    const three = setBonus([a, b, c]);
    assert.ok(Object.keys(three.hooks).length + Object.keys(three.fx).length > Object.keys(two.fx).length, `${id}: three give more`);
    assert.equal(own(a).set, undefined);
    assert.equal(own(a, b).set, undefined);
    assert.ok(own(a, b, c).set || id === 'beast', `${id}: three switch the fight hook on`);
    // (a repeat is not a second piece)
    assert.deepEqual(setBonus([a, a, a]), none);
  }
  // the numbers, two sets at once
  const fx = relicEffects(['phoenix', 'warDrum', 'ironShield', 'hourglass']);
  assert.ok(Math.abs(fx.crit! - 0.05) < 1e-9 && Math.abs(fx.guard! - (0.06 + 0.04)) < 1e-9);
  assert.equal(relicEffects(['phoenix', 'warDrum', 'emberRuby']).set!.burn, 0.15);
  assert.equal(relicEffects(['ironShield', 'hourglass', 'frostSapphire']).set!.chill, 3000);
  assert.equal(relicEffects(['banner', 'scholarScroll', 'holyChalice']).set!.regen, 0.02);
  assert.ok(relicEffects(['featherCharm', 'hawkEye', 'shadowCloak']).set!.bleed! > 0);
  assert.ok(Math.abs(relicEffects(['whetstone', 'swiftBoots', 'wolfFang']).atk! - 1.08 * 1.05 * 1.1) < 1e-9);
});

const battleWith = (relics: string[]) => {
  const run = newRun(5);
  run.relics = relics;
  const b = startStage(run);
  place(b, 'knight', 3, 8, 1);
  place(b, 'samurai', 4, 8, 2);
  fight(b);
  return b;
};

test('Fire 3: a hero blow sets the foe burning; Frost 3: the first blow on a foe chills it, once', () => {
  const burnt = (b: ReturnType<typeof battleWith>) => {
    let seen = 0;
    for (let i = 0; i < 600; i++) {
      stepBattle(b);
      if (b.units.some((u) => u.side === 'foe' && u.alive && u.dot?.kind === 'burn')) seen++;
    }
    return seen;
  };
  assert.ok(burnt(battleWith(['phoenix', 'warDrum', 'emberRuby'])) > 0, 'foes burn');
  assert.equal(burnt(battleWith(['phoenix', 'warDrum'])), 0, 'two pieces do not');

  const frost = battleWith(['ironShield', 'hourglass', 'frostSapphire']);
  for (let i = 0; i < 600; i++) stepBattle(frost);
  const hit = frost.units.filter((u) => u.side === 'foe' && u.hp < u.maxHp);
  assert.ok(hit.length > 0 && hit.every((u) => u.chilled && (u.slowUntil ?? 0) > 0), 'every foe that was hit was chilled');
  const cold = battleWith(['ironShield', 'hourglass']);
  for (let i = 0; i < 600; i++) stepBattle(cold);
  assert.ok(cold.units.every((u) => !u.chilled && u.slowUntil === undefined));
});

test('Holy 3: heroes heal a little each second; two pieces do not', () => {
  const heal = (relics: string[]) => {
    const b = battleWith(relics);
    const x = b.units.find((u) => u.side === 'hero')!;
    x.hp = Math.round(x.maxHp / 2);
    const start = x.hp / x.maxHp;
    for (let i = 0; i < 20; i++) stepBattle(b);
    return x.hp / x.maxHp - start;
  };
  const three = heal(['banner', 'scholarScroll', 'holyChalice']);
  const two = heal(['banner', 'scholarScroll']);
  assert.ok(three > 0.03, `healed ${three}`);
  assert.ok(two < 0.005, 'no heal with two');
});

test('no set pieces, no change: a run plays out exactly as before', () => {
  assert.equal(relicEffects(['luckyCoin', 'spyglass', 'whetstone', 'banner']).set, undefined);
  assert.equal(setBonus(['luckyCoin', 'spyglass']).fx.crit, undefined);
  const play = (relics: string[] | undefined) => {
    const run = newRun(9);
    run.relics = relics;
    const b = startStage(run);
    [['knight', 3, 8], ['archer', 4, 8], ['wizard', 2, 8]].forEach(([k, u, v], i) => place(b, k as string, u as number, v as number, i + 1));
    fight(b);
    playOut(b);
    return JSON.stringify([b.phase, b.t, b.units.map((u) => [u.def, u.hp, u.alive])]);
  };
  // (a relic of gold changes nothing of the fight; a lone piece of a set, only its own numbers)
  assert.equal(play(['luckyCoin']), play(undefined));
  assert.equal(play([]), play(undefined));
  assert.equal(startStage((() => { const r = newRun(9); r.relics = ['luckyCoin']; return r; })()).relics, undefined);
});
