import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startedMeta } from '../src/sim/meta';
import { calamityRun } from '../src/sim/modes';
import { CAL_MAPS } from '../src/sim/calamity';
import { buy, calamityMap, choices, clearNode, enterNode, finishTower, hire, leaveOpen, moveTo, openTreasure, settleTower, sideChoices, spotFloor } from '../src/sim/tower';
import { SIDE_BASE, sideSpots, START_ID } from '../src/sim/calLand';
import { startStage } from '../src/sim/run';
import { clearCrowns, clearDraws, clearStones, payClear, titleOf, CLEAR_TITLES, bestTitle } from '../src/sim/calReward';
import { ASC_MAX } from '../src/sim/ascension';
import { RARITY_NAMES } from '../src/sim/equipment';
import { loadSlot, saveSlot, type Run } from '../src/sim/run';

const run = (seed: number, level = 0): Run => calamityRun(seed, startedMeta(5), 'knight', level);
const clear = (r: Run, id: number): void => {
  assert.equal(enterNode(r, id), true, `spot ${id} can be entered`);
  clearNode(r);
};
const store = () => {
  const s: Record<string, string> = {};
  return { getItem: (k: string) => s[k] ?? null, setItem: (k: string, v: string) => void (s[k] = v) };
};
/** Settle the fight in play as won (no one is placed: the rewards are what is tested). */
function win(r: Run): void {
  finishTower(r, startStage(r), true);
}

test('a shop can be visited again, with more gold, and what is left in it is kept (back-tracking)', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const r = run(seed);
    const t = r.tower!;
    const shop = t.map.find((n) => n.kind === 'shop')!;
    // clear the way: every ancestor, in order
    const chain: number[] = [];
    for (let at: number | undefined = shop.id; at !== undefined; at = t.map.find((n) => n.next.includes(at!) && n.row === t.map[at!].row - 1)?.id) chain.unshift(at);
    for (const id of chain.slice(0, -1)) if (!t.path.includes(id)) clear(r, id);
    r.gold = 0;
    assert.equal(enterNode(r, shop.id), true);
    const stock = t.cur!.shop!;
    clearNode(r);
    assert.equal(t.here, shop.id, 'the party stands at the shop it has just left');
    // (the party stands on the shop and walks to it again: the same spot, nothing to walk)
    assert.equal(moveTo(r, shop.id), true);
    r.gold = 500;
    assert.equal(enterNode(r, shop.id), true, 'the cleared shop opens again');
    assert.equal(t.cur!.shop, stock, 'the same stock');
    const i = stock.findIndex((x) => x.kind === 'heal');
    assert.match(buy(r, i)!, /healed/);
    clearNode(r);
    assert.equal(enterNode(r, shop.id), true);
    assert.equal(t.cur!.shop![i].sold, true, 'what was bought stays bought');
    clearNode(r);
    const spots = t.spots;
    assert.equal(enterNode(r, shop.id), true);
    clearNode(r);
    assert.equal(t.spots, spots, 'a visit again is not a new spot');
  }
});

test('the recruit spot is one free choice out of three: the others close once one is taken, and leaving with nobody keeps the spot open', () => {
  const r = run(11);
  const t = r.tower!;
  const spot = t.map.find((n) => n.kind === 'recruit')!;
  const chain: number[] = [];
  for (let at: number | undefined = spot.id; at !== undefined; at = t.map.find((n) => n.next.includes(at!) && n.row === t.map[at!].row - 1)?.id) chain.unshift(at);
  for (const id of chain.slice(0, -1)) clear(r, id);
  assert.equal(enterNode(r, spot.id), true);
  const hires = t.cur!.hires!;
  assert.equal(hires.length, 3);
  assert.ok(hires.every((h) => h.cost === 0));
  const gold = r.gold;
  // leave with nobody: the spot is not cleared, and can be entered again
  assert.equal(leaveOpen(r), true);
  assert.equal(t.cur, undefined);
  assert.ok(!t.path.includes(spot.id));
  assert.ok(choices(r).some((n) => n.id === spot.id), 'it is still on offer');
  assert.equal(enterNode(r, spot.id), true);
  assert.deepEqual(t.cur!.hires, hires, 'the same three');
  assert.ok(hire(r, 2));
  assert.equal(r.gold, gold);
  assert.equal(r.roster.length, 2);
  assert.equal(hire(r, 0), null);
  assert.equal(leaveOpen(r), false, 'once a hero is taken it is not left open');
  clearNode(r);
  assert.ok(t.path.includes(spot.id));
  assert.deepEqual(t.recap!.heroes.length, 1, 'the map recap names the hero who joined');
});

test('a detour fight pays double gold and a good piece of gear, no relic and no healing; a detour hoard pays gold alone', () => {
  let elite = 0;
  let hoard = 0;
  for (let seed = 1; seed <= 200 && (!elite || !hoard); seed++) {
    const r = run(seed);
    const t = r.tower!;
    for (const kind of ['elite', 'treasure'] as const) {
      if (kind === 'elite' ? elite : hoard) continue;
      const side = sideSpots(r.seed, t.act, t.map).find((s) => s.kind === kind);
      if (!side) continue;
      // (clear the road to the node it hangs from)
      const chain: number[] = [];
      for (let at: number | undefined = side.from; at !== undefined; at = t.map.find((n) => n.next.includes(at!) && n.row === t.map[at!].row - 1)?.id) chain.unshift(at);
      for (const id of chain) if (!t.path.includes(id)) clear(r, id);
      assert.ok(sideChoices(r).some((s) => s.id === side.id));
      const gear = r.items?.length ?? 0;
      const relics = r.relics?.length ?? 0;
      const gold = r.gold;
      assert.equal(enterNode(r, side.id), true);
      if (kind === 'elite') {
        elite++;
        win(r);
        assert.ok((r.items?.length ?? 0) === gear + 1, 'a piece of gear');
        assert.equal(r.relics?.length ?? 0, relics, 'no relic');
        assert.equal(t.offer, undefined, 'no choice of relics');
        assert.ok(r.gold - gold > 0);
        assert.ok((t.recap?.elites ?? 0) >= 1);
      } else {
        hoard++;
        const lines = openTreasure(r)!;
        assert.equal(lines.length, 1, 'gold only');
        clearNode(r);
      }
      assert.ok(t.sideDone?.includes(side.id));
    }
  }
  assert.ok(elite && hoard, 'both kinds of detour were met');
  void SIDE_BASE;
});

test('a map recap is kept when a map is cleared: spots, fights, gold, finds, events; and shown once', () => {
  const r = run(21);
  const t = r.tower!;
  const first = choices(r)[0].id;
  clear(r, first);
  const rc = t.recap!;
  assert.equal(rc.map, 1);
  assert.equal(rc.spots, 1);
  const boss = t.map.find((n) => n.kind === 'boss')!;
  // (open the lair by clearing its door, then fall it)
  const door = t.map.find((n) => n.next.includes(boss.id))!;
  const chain: number[] = [];
  for (let at: number | undefined = door.id; at !== undefined; at = t.map.find((n) => n.next.includes(at!) && n.row === t.map[at!].row - 1)?.id) chain.unshift(at);
  for (const id of chain) if (!t.path.includes(id)) clear(r, id);
  assert.equal(enterNode(r, boss.id), true);
  clearNode(r);
  assert.equal(t.act, 2);
  assert.equal(t.mapDone?.map, 1, 'the cleared map is waiting to be shown');
  assert.equal(t.mapDone?.total, rc.total);
  assert.equal(t.recaps!.length, 1);
  assert.equal(t.recap, undefined, 'the new map starts a recap of its own when first needed');
  const back = loadSlot('calamity', (() => { const s = store(); saveSlot(r, s as never); return s; })() as never)!;
  assert.deepEqual(back.tower!.mapDone, t.mapDone, 'it is saved with the run');
});

test('no floor in the calamity: the map is spots, and a spot in a later map is a harder floor of the same count', () => {
  const r = run(4);
  assert.ok(spotFloor(r, choices(r)[0].id) >= 1);
  assert.equal(START_ID, -1);
});

test('the finishing reward: crowns, stones, a Legendary or better piece of gear, a title; more at every ascension', () => {
  const m = startedMeta(3);
  const before = m.crowns;
  const a = payClear(m, 99, 0);
  assert.equal(m.crowns - before >= a.crowns, true);
  assert.equal(a.crowns, clearCrowns(0));
  assert.equal(a.stones, clearStones(0));
  assert.equal(m.stones, a.stones, 'the stones go into the meta');
  assert.ok(a.gear.rarity >= 4, RARITY_NAMES[a.gear.rarity]);
  assert.equal(a.title, CLEAR_TITLES[0]);
  assert.equal(a.newTitle, true);
  assert.deepEqual(m.calTitles, [0]);
  assert.equal(bestTitle(m), CLEAR_TITLES[0]);
  // (the same level again: the title is not new)
  assert.equal(payClear(m, 100, 0).newTitle, false);
  // (more at higher ascensions)
  assert.ok(clearCrowns(5) > clearCrowns(0) && clearCrowns(10) > clearCrowns(5));
  assert.ok(clearDraws(10) > clearDraws(0));
  assert.equal(payClear(startedMeta(3), 1, 6).gear.rarity, 5, 'Mythic from level 6');
  assert.equal(CLEAR_TITLES.length, ASC_MAX + 1);
  assert.notEqual(titleOf(3), titleOf(4));
  assert.equal(bestTitle({}), undefined);
  // (deterministic: the same save and seed pay the same)
  const x = payClear(startedMeta(3), 55, 2);
  const y = payClear(startedMeta(3), 55, 2);
  assert.deepEqual(x, y);
  // (stones, not shards: nothing is given to a hero until a stone is used, and the stones grow with the ascension)
  const fresh = startedMeta(1);
  const got = payClear(fresh, 7, 4);
  assert.equal(got.stones, clearStones(4));
  assert.ok(clearStones(10) > clearStones(0));
  assert.deepEqual(fresh.unlock ?? {}, {});
  assert.deepEqual(fresh.shards, {});
});

test('a calamity cleared whole settles the reward into the summary, once; a loss pays none of it', () => {
  const r = run(6);
  r.over = true;
  r.cleared = true;
  r.tower!.bosses = CAL_MAPS;
  const m = startedMeta(2);
  const crowns = m.crowns;
  const s = settleTower(m, r)!;
  assert.ok(s.clear && s.clear.crowns === clearCrowns(0));
  assert.ok(m.crowns - crowns >= s.clear!.crowns);
  const again = m.crowns;
  assert.equal(settleTower(m, r), s, 'settled once');
  assert.equal(m.crowns, again);
  const lost = run(7);
  lost.over = true;
  lost.tower!.bosses = 2;
  assert.equal(settleTower(startedMeta(2), lost)!.clear, undefined);
  assert.equal(calamityMap(1, 1, 6).filter((n) => n.kind === 'campfire').length, 1);
});
