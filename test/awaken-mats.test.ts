import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  ARMY_ORES, AWAKEN_ORES, BACK_PAY_CACHES, BOSS_DROP, BOSS_ORES, CACHE_ORES, CHEST_ORES, ELITE_ORES, FINAL_CHANCE, FIRST_CLEAR_ORES, MID_CHANCE, ORES, ORE_TRAITS, REALM_ORES, STAND_ORES,
  armyOres, ascOres, bossOres, cachesOf, chestOres, eliteOres, grantOres, openCache, oreOf, oresOf, readCaches, readOres, realmOres, settleArmyOres, standOres, sumOres,
} from '../src/sim/awakenMats';
import { awaken, awakenPlan, awakenedOf, canAwaken } from '../src/sim/awaken';
import { AURAS } from '../src/render/auraStyles';
import { HERO_TRAITS, TRAITS } from '../src/sim/traits';
import { ALL_HEROES } from '../src/sim/units';
import { ARMIES } from '../src/sim/armies';
import { CAL_MAPS } from '../src/sim/calamity';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { calamityRun } from '../src/sim/modes';
import { clearNode, enterNode, finishTower, settleTower } from '../src/sim/tower';
import { startStage, type Run } from '../src/sim/run';
import { payClear } from '../src/sim/calReward';
import { chestKind, openChest, rollChest, sumLoot } from '../src/sim/armyStars';
import { afterFight, type AutoReplay } from '../src/sim/autoReplay';
import { newStandRun, settleStand } from '../src/sim/stand';

const classes = Object.values(TRAITS).filter((t) => t.kind === 'class').map((t) => t.id);
const ready = (kind = 'knight', shards = 16): Meta => {
  const m = startedMeta(3);
  m.shards[kind] = shards;
  return m;
};
const store = () => {
  let v = '';
  return { setItem: (_: string, s: string) => (v = s), getItem: () => v };
};

test('every class trait has its own ore, in its aura colour, with an icon and a name of its own', () => {
  assert.deepEqual([...ORE_TRAITS].sort(), [...classes].sort());
  assert.equal(new Set(ORE_TRAITS.map((t) => ORES[t].name)).size, ORE_TRAITS.length, 'names differ');
  for (const t of ORE_TRAITS) {
    assert.equal(ORES[t].colour, AURAS[t].colour, t);
    assert.ok(existsSync(`src/art/ui/ore/${ORES[t].icon}`), t);
    assert.ok(ORES[t].line.length > 10);
  }
  for (const kind of ALL_HEROES) assert.equal(oreOf(kind)?.trait, HERO_TRAITS[kind][1], kind);
});

test('each army drops two or three kinds of its own, and the armies between them all thirteen', () => {
  assert.deepEqual(Object.keys(ARMY_ORES).sort(), ARMIES.map((a) => a.id).sort());
  for (const [id, kinds] of Object.entries(ARMY_ORES)) {
    assert.ok(kinds.length >= 2 && kinds.length <= 3, id);
    assert.equal(new Set(kinds).size, kinds.length, id);
    for (const k of kinds) assert.ok(ORES[k], `${id}: ${k}`);
  }
  assert.deepEqual([...new Set(Object.values(ARMY_ORES).flat())].sort(), [...ORE_TRAITS].sort());
  // (the owner's examples)
  assert.ok(ARMY_ORES.orcs.includes('blade') && ARMY_ORES.orcs.includes('vanguard'));
  assert.ok(ARMY_ORES.undead.includes('arcanist') && ARMY_ORES.undead.includes('assassin'));
});

test('each Calamity map drops its own kinds, all thirteen between them', () => {
  assert.equal(REALM_ORES.length, CAL_MAPS);
  for (const kinds of REALM_ORES) assert.ok(kinds.length >= 2 && kinds.length <= 3);
  assert.deepEqual([...new Set(REALM_ORES.flat())].sort(), [...ORE_TRAITS].sort());
  assert.deepEqual(realmOres(99), REALM_ORES[CAL_MAPS - 1]);
});

test('a calamity boss and mini-boss pay their map\'s kinds, the same for the same seed, more at a higher ascension', () => {
  for (let map = 1; map <= CAL_MAPS; map++)
    for (let seed = 1; seed <= 20; seed++) {
      const a = bossOres(seed, map, 0);
      assert.deepEqual(a, bossOres(seed, map, 0));
      assert.ok(REALM_ORES[map - 1].includes(a.trait), `${map}: ${a.trait}`);
      assert.equal(a.n, BOSS_ORES[map - 1]);
      assert.ok(bossOres(seed, map, 10).n > a.n);
      const e = eliteOres(seed, map, 9, 0);
      assert.ok(REALM_ORES[map - 1].includes(e.trait));
      assert.equal(e.n, ELITE_ORES);
    }
  assert.equal(ascOres(2, 0), 2);
  assert.equal(ascOres(8, 10), 16);
  // (every kind of a map comes up, over enough seeds)
  for (let map = 1; map <= CAL_MAPS; map++) assert.equal(new Set(Array.from({ length: 60 }, (_, s) => bossOres(s, map, 0).trait)).size, REALM_ORES[map - 1].length);
});

test('a calamity\'s boss drops its ores on the run, the recap shows them, and the end pays them, a loss too', () => {
  const r: Run = calamityRun(8, startedMeta(5), 'knight', 0);
  const t = r.tower!;
  const boss = t.map.find((n) => n.kind === 'boss')!;
  const door = t.map.find((n) => n.next.includes(boss.id))!;
  const chain: number[] = [];
  for (let at: number | undefined = door.id; at !== undefined; at = t.map.find((n) => n.next.includes(at!) && n.row === t.map[at!].row - 1)?.id) chain.unshift(at);
  for (const id of chain) if (!t.path.includes(id)) {
    assert.equal(enterNode(r, id), true);
    clearNode(r);
  }
  const before = (t.ores ?? []).length;
  assert.equal(enterNode(r, boss.id), true);
  finishTower(r, startStage(r), true);
  const drop = t.ores!.at(-1)!;
  assert.equal(t.ores!.length, before + 1);
  assert.deepEqual(drop, bossOres(r.seed, 1, 0));
  assert.ok(t.recaps?.at(-1)?.ores?.some((d) => d.trait === drop.trait) || t.recap?.ores?.some((d) => d.trait === drop.trait) || t.mapDone?.ores?.some((d) => d.trait === drop.trait));
  // (the run falls later: it still pays what it won)
  r.over = true;
  const m = startedMeta(2);
  const s = settleTower(m, r)!;
  const want = sumOres(t.ores!);
  assert.deepEqual(s.ores, want);
  for (const d of want) assert.equal(oresOf(m, d.trait), d.n);
  assert.equal(cachesOf(m), 0, 'no cache without a clear');
  // (settled once)
  settleTower(m, r);
  for (const d of want) assert.equal(oresOf(m, d.trait), d.n);
});

test('a calamity clear pays a Rift Cache, opened on a hero\'s panel for its class\'s ores', () => {
  const m = startedMeta(3);
  const c = payClear(m, 9, 0);
  assert.equal(c.cache, 1);
  assert.equal(cachesOf(m), 1);
  assert.equal(openCache(m, 'nobody'), null, 'a kind without a class opens nothing');
  assert.equal(cachesOf(m), 1);
  const d = openCache(m, 'cleric')!;
  assert.deepEqual(d, { trait: 'warden', n: CACHE_ORES });
  assert.equal(oresOf(m, 'warden'), CACHE_ORES);
  assert.equal(cachesOf(m), 0);
  assert.equal(openCache(m, 'cleric'), null, 'none left');
});

test('an army\'s boss waves now and then drop its ores, more often on its last boss and a harder tier; a field wave or a loss none', () => {
  assert.deepEqual(armyOres('orcs', undefined, 0, true, false, 1, 3), { drops: [], cache: 0 });
  assert.deepEqual(armyOres('orcs', 'final', 0, false, true, 1, 15), { drops: [], cache: 0 });
  for (let t = 0; t < 5; t++) {
    assert.ok(FINAL_CHANCE[t] > MID_CHANCE[t]);
    if (t) assert.ok(FINAL_CHANCE[t] > FINAL_CHANCE[t - 1] && MID_CHANCE[t] > MID_CHANCE[t - 1]);
  }
  const rate = (boss: 'mid' | 'final', tier: number) => {
    let n = 0;
    for (let s = 0; s < 4000; s++) {
      const r = armyOres('undead', boss, tier, true, false, s, 8);
      for (const d of r.drops) assert.ok(ARMY_ORES.undead.includes(d.trait));
      n += r.drops.length;
    }
    return n / 4000;
  };
  assert.ok(Math.abs(rate('final', 0) - FINAL_CHANCE[0]) < 0.012);
  assert.ok(Math.abs(rate('mid', 0) - MID_CHANCE[0]) < 0.008);
  assert.ok(rate('final', 4) > rate('final', 0));
  assert.deepEqual(armyOres('orcs', 'final', 2, true, false, 77, 15), armyOres('orcs', 'final', 2, true, false, 77, 15), 'deterministic');
});

test('a tier\'s first clear always pays its army\'s ores; a first Mythic clear pays a Rift Cache', () => {
  for (let t = 0; t < 4; t++) {
    const r = armyOres('golems', 'final', t, true, true, 5, 15);
    const first = r.drops.at(-1)!;
    assert.equal(first.n, FIRST_CLEAR_ORES[t]);
    assert.ok(ARMY_ORES.golems.includes(first.trait));
    assert.equal(r.cache, 0);
  }
  const mythic = armyOres('golems', 'final', 4, true, true, 5, 15);
  assert.equal(mythic.cache, 1);
  // (a mid boss is no clear)
  for (let seed = 0; seed < 50; seed++) {
    const mid = armyOres('golems', 'mid', 0, true, true, seed, 8);
    assert.ok(mid.drops.length <= 1 && mid.drops.every((d) => d.n === BOSS_DROP[0]));
  }
  const m = startedMeta(4);
  const paid = settleArmyOres(m, 'golems', 'final', 4, true, true, 5, 15);
  assert.equal(cachesOf(m), 1);
  for (const d of paid.drops) assert.equal(oresOf(m, d.trait), d.n);
});

test('the auto-replay totals count the ores', () => {
  const a: AutoReplay = { army: 'orcs', tier: 0, count: 2, run: 1, totals: { runs: 0, crowns: 0, xp: 0, chests: 0, gear: 0 } };
  afterFight(a, { won: true, cleared: false, wave: 8, crowns: 10, xp: 5, ores: 2 });
  afterFight(a, { won: true, cleared: false, wave: 9, crowns: 10, xp: 5 });
  assert.equal(a.totals.ores, 2);
});

test('an awakening asks for its class\'s ores on top of the shards: 10 for the first step, 20 for the second', () => {
  assert.deepEqual([...AWAKEN_ORES], [10, 20]);
  const m = ready('knight', 26);
  const p = awakenPlan(m, 'knight');
  assert.equal(p.ore, 'guardian');
  assert.equal(p.oreCost, 10);
  assert.equal(p.shardsReady, true);
  assert.equal(p.can, false, 'shards alone are not enough');
  assert.equal(awaken(m, 'knight'), 0);
  grantOres(m, [{ trait: 'blade', n: 50 }]);
  assert.equal(canAwaken(m, 'knight'), false, 'another class\'s ores do not count');
  grantOres(m, [{ trait: 'guardian', n: 25 }]);
  assert.equal(awaken(m, 'knight'), 1);
  assert.equal(oresOf(m, 'guardian'), 15);
  assert.equal(awakenPlan(m, 'knight').oreCost, 20);
  assert.equal(awaken(m, 'knight'), 0, '15 of 20');
  grantOres(m, [{ trait: 'guardian', n: 5 }]);
  assert.equal(awaken(m, 'knight'), 2);
  assert.equal(oresOf(m, 'guardian'), 0);
  assert.equal(m.ores?.guardian, undefined, 'a spent kind leaves the save');
  assert.equal(oresOf(m, 'blade'), 50, 'untouched');
  // (ores without the shards do nothing)
  const n = ready('knight', 12);
  grantOres(n, [{ trait: 'guardian', n: 99 }]);
  assert.equal(awakenPlan(n, 'knight').shardsReady, false);
  assert.equal(awaken(n, 'knight'), 0);
});

test('now and then a gold or Mythic chest holds a few of its army\'s ores; other chests none, and the rest of a chest is unchanged', () => {
  assert.equal(chestOres(1, 'bronze', 'orcs'), null);
  assert.equal(chestOres(1, 'silver', 'orcs'), null);
  const share = (kind: string) => {
    let n = 0;
    for (let s = 0; s < 2000; s++) {
      const d = chestOres(s, kind, 'infernal');
      if (d) {
        n++;
        assert.ok(ARMY_ORES.infernal.includes(d.trait));
        assert.equal(d.n, CHEST_ORES[kind].n);
      }
    }
    return n / 2000;
  };
  assert.ok(Math.abs(share('gold') - CHEST_ORES.gold.chance) < 0.04);
  assert.ok(Math.abs(share('mythic') - CHEST_ORES.mythic.chance) < 0.04);
  // (a chest of no army draws from every kind)
  for (let s = 0; s < 200; s++) {
    const d = chestOres(s, 'gold', 'tower?');
    if (d) assert.ok(ORE_TRAITS.includes(d.trait));
  }
  // (a gold chest that holds ores pays them on opening, and the summary adds them; its crowns are as rolled before)
  const army = ARMIES[2];
  let seed = 0;
  while (!chestOres(seed, 'gold', army.id)) seed++;
  const m = startedMeta(6);
  m.stash.push({ army: army.id, at: 10, tier: 0, seed });
  const crowns = m.crowns;
  const loot = openChest(m, 0)!;
  const d = chestOres(seed, chestKind(10), army.id)!;
  assert.equal(oresOf(m, d.trait), d.n);
  assert.equal(m.crowns - crowns, rollChest(seed, army, 10, 0).crowns);
  assert.deepEqual(sumLoot([loot]).ores, [d]);
});

test('a Last Stand record pays a couple of ores for each tenth wave it passes for the first time', () => {
  assert.deepEqual(standOres(1, 0, 9), []);
  assert.equal(standOres(1, 0, 10).length, 1);
  assert.equal(standOres(1, 0, 34).length, 3);
  assert.equal(standOres(1, 12, 34).length, 2, 'the 20th and 30th');
  assert.deepEqual(standOres(1, 40, 39), []);
  for (const d of standOres(5, 0, 50)) assert.equal(d.n, STAND_ORES);
  assert.deepEqual(standOres(5, 0, 50), standOres(5, 0, 50));
  const m = startedMeta(2);
  m.stand = 8;
  const run = newStandRun(42, ['knight', 'samurai'], ['orcs'], m.stand);
  run.over = true;
  run.best = 21;
  run.wave = 21;
  const s = settleStand(m, run)!;
  assert.equal(s.ores?.length, 2);
  assert.equal(ORE_TRAITS.reduce((n, t) => n + oresOf(m, t), 0), 2 * STAND_ORES);
  // (no record, no ores)
  const again = newStandRun(43, ['knight'], ['orcs'], m.stand);
  again.over = true;
  again.best = 15;
  again.wave = 15;
  assert.equal(settleStand(m, again)!.ores, undefined);
});

test('saves: ores and caches are optional and read sane; a save from before is paid a cache a Calamity clear, up to five, once; awakened heroes keep their steps', () => {
  assert.deepEqual(readOres({ blade: 3, nope: 4, warden: -1, caster: 'x', guardian: 2.7 }), { blade: 3, guardian: 2 });
  assert.equal(readOres(null), undefined);
  assert.equal(readOres({}), undefined);
  assert.equal(readCaches(undefined, 3), 3);
  assert.equal(readCaches(undefined, 12), BACK_PAY_CACHES);
  assert.equal(readCaches(2, 12), 2, 'kept once set');
  assert.equal(readCaches(undefined, 0), 0);
  // (an old save: two clears, a hero awakened twice, no ores at all)
  const old = startedMeta(5) as Meta & Record<string, unknown>;
  old.shards.knight = 26;
  old.awakened = { knight: 2 };
  old.calamity = { best: 6, clears: 2 };
  delete old.ores;
  delete old.caches;
  const s = store();
  saveMeta(old, s);
  const back = loadMeta(5, s);
  assert.equal(awakenedOf(back, 'knight'), 2, 'kept without ores');
  assert.equal(cachesOf(back), 2);
  assert.equal(back.ores, undefined);
  // (once used, the back pay is not paid again)
  openCache(back, 'knight');
  saveMeta(back, s);
  const later = loadMeta(5, s);
  assert.equal(cachesOf(later), 1);
  assert.equal(oresOf(later, 'guardian'), CACHE_ORES);
});
