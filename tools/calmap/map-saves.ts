// Saved calamity runs for the map/shop/rewards screenshots (`tools/calmap/cal-map-shots.mjs`). Built with the sim's own functions.
import { startedMeta } from '../../src/sim/meta';
import { calamityRun } from '../../src/sim/modes';
import { hireHero } from '../../src/sim/climb';
import { clearNode, enterNode, finishTower, leaveOpen, mapFor, settleTower, sideChoices, type MapNode } from '../../src/sim/tower';
import { sideSpots } from '../../src/sim/calLand';
import { startStage, type Run } from '../../src/sim/run';
import { HEROES } from '../../src/sim/units';
import { newCastle } from '../../src/sim/castle';

export const meta = () => {
  const m = startedMeta(5);
  m.unlocked = [...HEROES, 'paladin', 'cleric'];
  return m;
};
export function fresh(seed: number, extra = 2): Run {
  const run = calamityRun(seed, meta(), 'samurai', 0);
  const kinds = ['knight', 'archer', 'wizard', 'cleric'];
  for (let i = 0; i < extra; i++) hireHero(run, kinds[i], 0);
  run.gold = 220;
  return run;
}
const chainTo = (map: MapNode[], id: number): number[] => {
  const out: number[] = [];
  for (let at: number | undefined = id; at !== undefined; at = map.find((n) => n.next.includes(at!) && n.row === map[at!].row - 1)?.id) out.unshift(at);
  return out;
};
/** Clear the road up to and including `id` (fights settled as won, nothing placed). */
export function clearTo(r: Run, id: number): void {
  const t = r.tower!;
  for (const c of chainTo(t.map, id)) {
    if (t.path.includes(c)) continue;
    enterNode(r, c);
    const cur = t.cur!;
    if (cur.fight) finishTower(r, startStage(r), true);
    else if (cur.kind === 'recruit') {
      cur.hires![0].hired = true;
      hireHero(r, cur.hires![0].kind, 0);
      clearNode(r);
    } else clearNode(r);
  }
}
/** A map with a detour fight (an elite) off the road, the party standing at the node it hangs from. */
export function detour(seed0 = 1): { run: Run; id: number } {
  for (let seed = seed0; seed < seed0 + 3000; seed++) {
    const r = fresh(seed);
    const t = r.tower!;
    const s = sideSpots(seed, t.act, t.map).find((x) => x.kind === 'elite');
    if (!s) continue;
    clearTo(r, s.from);
    if (!sideChoices(r).some((x) => x.id === s.id)) continue;
    return { run: r, id: s.id };
  }
  throw new Error('no detour');
}
/** The party at the node before the boss, ready; and the same after the boss has fallen (the recap waiting). */
export function afterBoss(seed = 9): Run {
  const r = fresh(seed, 4);
  const t = r.tower!;
  const boss = t.map.find((n) => n.kind === 'boss')!;
  const door = t.map.find((n) => n.next.includes(boss.id))!;
  clearTo(r, door.id);
  enterNode(r, boss.id);
  finishTower(r, startStage(r), true);
  return r;
}
/** A shop run: the party stands at its cleared shop with gold. */
export function atShop(seed = 3): { run: Run; id: number } {
  for (let s = seed; ; s++) {
    const r = fresh(s);
    const t = r.tower!;
    const shop = t.map.find((n) => n.kind === 'shop');
    if (!shop) continue;
    clearTo(r, shop.id);
    t.here = shop.id;
    t.at = shop.id;
    r.gold = 30;
    return { run: r, id: shop.id };
  }
}
/** A recruit run: the party stands at the node before the recruit spot, which is lit. */
export function beforeRecruit(seed = 3): Run {
  const r = fresh(seed, 0);
  const t = r.tower!;
  const spot = t.map.find((n) => n.kind === 'recruit')!;
  const ids = chainTo(t.map, spot.id).slice(0, -1);
  clearTo(r, ids[ids.length - 1]);
  void leaveOpen;
  return r;
}
/** A finished calamity: the run, and the summary settled into a meta. */
export function victory(level = 3): { run: Run; summary: unknown } {
  const m = meta();
  m.castle = newCastle();
  const r = calamityRun(77, m, 'samurai', level);
  for (const k of ['knight', 'archer', 'wizard', 'cleric']) hireHero(r, k, 0);
  r.relics = ['sunCrown', 'whetstone', 'banner', 'emberRuby', 'thunderHorn'];
  r.over = true;
  r.cleared = true;
  r.tower!.bosses = 6;
  r.tower!.act = 6;
  r.tower!.spots = 71;
  r.tower!.recaps = [1, 2, 3, 4, 5, 6].map((k) => ({ map: k, spots: 12, total: 12, fights: 8, elites: 1, gold: 400, relics: ['whetstone'], gear: [], heroes: [], events: ['A quiet shrine'] }));
  const summary = settleTower(m, r);
  return { run: r, summary };
}
export { mapFor };
