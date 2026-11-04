// SEVEN-SLOT GEAR batch 2: the 21 named legends (`legendBases.ts`, `legends.ts`, `legendRenown.ts`): three a slot, each from its own
// source, one copy a save for good, never rolled, bought, combined or sold, and growing with renown.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { EQUIP_BASES, EQUIP_BASE_IDS, EQUIP_LIST, EQUIP_SLOTS, combineGroups, equipItem, equipStats, grantEquipment, itemStats, salvageItem, spareEquipment } from '../src/sim/equipment';
import { LEGEND_LIST } from '../src/sim/equipBases';
import { LEGEND_SOURCES, claimLegends, dailyStreak, legendsEarned, nextVerseAt, takeLegendNews, versesOpen } from '../src/sim/legends';
import { legendStrength, renownStep } from '../src/sim/legendRenown';
import { settleWear } from '../src/sim/wear';
import { sellPiece } from '../src/sim/stall';

const memory = () => {
  const box: Record<string, string> = {};
  return { setItem: (k: string, v: string) => void (box[k] = v), getItem: (k: string) => box[k] ?? null };
};

test('21 legends, three a slot, each with its story of four verses, its power and its source; none in the rolled catalogue', () => {
  assert.equal(LEGEND_LIST.length, 21);
  for (const slot of EQUIP_SLOTS) assert.equal(LEGEND_LIST.filter((l) => l.slot === slot).length, 3, slot);
  assert.equal(new Set(LEGEND_LIST.map((l) => l.legend!.power)).size, 21);
  for (const l of LEGEND_LIST) {
    assert.equal(EQUIP_BASES[l.id], l);
    assert.ok(!EQUIP_BASE_IDS.includes(l.id) && !EQUIP_LIST.includes(l), `${l.id} is never rolled or bought`);
    assert.equal(l.legend!.verses.length, 4);
    assert.ok(l.legend!.source && l.legend!.text);
    assert.ok(LEGEND_SOURCES[l.id], `${l.id} has a source`);
  }
  // (with the legends every slot holds thirty)
  for (const slot of EQUIP_SLOTS) assert.equal(Object.values(EQUIP_BASES).filter((b) => b.slot === slot).length, 30, slot);
});

test('a source met gives its legend once, as a Legendary piece, and the page says so once', () => {
  const m = startedMeta(1);
  assert.deepEqual(legendsEarned(m), []);
  m.stand = 40;
  m.armies.ogres = { best: 0, won: 0, clears: 0, stars: {}, hard: { '1': { won: 10, clears: 1 } } };
  const got = claimLegends(m);
  assert.deepEqual(got.map((x) => x.base).sort(), ['gravesong', 'shieldHundredNames']);
  assert.ok(got.every((x) => x.rarity === 4));
  assert.deepEqual(claimLegends(m), [], 'one copy each');
  assert.deepEqual(takeLegendNews(m).sort(), ['A legend is yours: Gravesong', 'A legend is yours: Shield of a Hundred Names']);
  assert.deepEqual(takeLegendNews(m), []);
  // (a legend is never sold or combined)
  const song = got.find((x) => x.base === 'gravesong')!;
  assert.equal(salvageItem(m, song.id), 0);
  assert.equal(sellPiece(m, song.id, 20260101), 0);
  assert.ok(spareEquipment(m).some((x) => x.id === song.id));
  for (let i = 0; i < 2; i++) grantEquipment(m, { base: 'gravesong', rarity: 4, level: 12 });
  assert.ok(!combineGroups(m).some((g) => g.base === 'gravesong'));
  // (a harder tier's clear counts for an easier tier's legend; a save from before that met a source finds it on load)
  const n = startedMeta(2);
  n.armies.infernal = { best: 0, won: 0, clears: 0, stars: {}, hard: { '4': { won: 10, clears: 1 } } };
  const s = memory();
  saveMeta(n, s);
  const back = loadMeta(2, s);
  assert.ok(back.legends?.lastLight !== undefined);
  assert.equal(back.equipment!.find((x) => x.id === back.legends!.lastLight)!.base, 'lastLight');
});

test('a 30-day daily streak, the spire\'s guardians and a hero\'s hundred waves are each a source', () => {
  const m = startedMeta(3);
  for (let d = 1; d <= 29; d++) m.daily[String(20260500 + d)] = { best: 0, plays: 1, cleared: true };
  assert.equal(dailyStreak(m), 29);
  m.daily['20260601'] = { best: 0, plays: 1, cleared: true };
  m.daily['20260530'] = { best: 0, plays: 1, cleared: true };
  assert.equal(dailyStreak(m), 30, 'a day missed (the 31st) breaks it');
  m.daily['20260531'] = { best: 0, plays: 1, cleared: true };
  assert.equal(dailyStreak(m), 32, 'across the end of a month');
  m.tower = 52;
  m.wavesFought = { knight: 99.5 };
  const ids = legendsEarned(m);
  assert.ok(ids.includes('widowsBow') && ids.includes('sevenLeagueBoots') && !ids.includes('helmSevenWinters') && !ids.includes('pilgrimsCord'));
  m.wavesFought.knight = 100;
  assert.ok(legendsEarned(m).includes('pilgrimsCord'));
});

test('renown: the waves a worn legend fights; its verses open and its power grows at 25, 100 and 300', () => {
  assert.deepEqual([0, 24, 25, 99, 100, 300].map(renownStep), [0, 0, 1, 1, 2, 3]);
  assert.deepEqual([0, 25, 100, 300].map(legendStrength), [0.75, 1, 1.25, 1.5]);
  assert.equal(versesOpen(0), 1);
  assert.equal(versesOpen(300), 4);
  assert.equal(nextVerseAt(30), 100);
  assert.equal(nextVerseAt(300), null);
  const m: Meta = startedMeta(4);
  const coat = grantEquipment(m, { base: 'ferrymansCoat', rarity: 4, level: 12 });
  equipItem(m, 'knight', coat.id);
  assert.equal(equipStats(m, 'knight')!.powers![0].s, 0.75);
  for (let i = 0; i < 25; i++) settleWear(m, [{ kind: 'knight', fell: false }]);
  assert.equal(coat.renown, 25);
  assert.equal(equipStats(m, 'knight')!.powers![0].s, 1);
  settleWear(m, [{ kind: 'knight', fell: false }], true);
  assert.equal(coat.renown, 25.5, 'half under auto-replay');
  assert.equal(m.wavesFought!.knight, 25.5);
  // (a legend has no signature ability of its own, and its flat stats are not scaled)
  assert.equal(itemStats({ base: 'girdleGiantKing', rarity: 4, level: 12 }).abilities.length, 0);
  assert.ok(itemStats({ base: 'girdleGiantKing', rarity: 4, level: 12 }).hp > 0.12);
  // (renown survives a save)
  const s = memory();
  saveMeta(m, s);
  assert.equal(loadMeta(4, s).equipment!.find((x) => x.id === coat.id)!.renown, 25.5);
});
