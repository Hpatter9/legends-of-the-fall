// FX-PLACE's harness (docs/notes/fx-place.md): every hero's skills and ultimates in seeded fights (each hero in turn with four others, at a
// level with every skill and the ultimate open), and for each `area`, `zone` and `aura` event, the tiles the page draws for it (`fxPlace.ts`)
// against what the sim did there: the fighters the caster struck, healed or shielded from the event until its blow has landed.
//
//   node tools/fx-place/audit.mjs [--level 35] [--stage 40] [--fights 6]
//
// It prints, by skill: how many of its events were seen, the share of the fighters it struck that stood outside its drawn tiles (under-cover:
// the effect is not where the blow fell), and the share of the foes inside its drawn tiles of a harm that it did not strike (over-cover: it seems
// to hit fighters it does not). A skill whose blows fall away from its tiles is a placement bug; a little over-cover is a blow that missed or a
// foe that saved.

import { fight, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../../src/sim/battle';
import { FIELD_BANDS } from '../../src/sim/foes';
import { mixSeed, Rng } from '../../src/sim/rng';
import { ALL_HEROES, UNITS } from '../../src/sim/units';
import { areaSkill, areaTiles, auraTiles } from '../../src/render/fxPlace';
import { deploySpots, fieldBoost, sweepBoost } from '../heroSweep';
import type { At } from '../../src/sim/board';

const flag = (n: string, d: number) => (process.argv.includes(n) ? Number(process.argv[process.argv.indexOf(n) + 1]) : d);
const LEVEL = flag('--level', 35);
const STAGE = flag('--stage', 40);
const FIGHTS = flag('--fights', 6);

interface Tally { events: number; struck: number; outside: number; foesIn: number; missedIn: number; what: string }
const tally = new Map<string, Tally>();
const T = (k: string, what: string) => {
  if (!tally.has(k)) tally.set(k, { events: 0, struck: 0, outside: 0, foesIn: 0, missedIn: 0, what });
  return tally.get(k)!;
};

interface Open { key: string; by: number; side: string; tiles: Set<string>; help: boolean; until: number; landAt: number; struck: Set<number>; checked: boolean; laidAt: number }

const tileKey = (a: At) => `${a.u},${a.v}`;

for (const [hi, hero] of ALL_HEROES.entries()) {
  for (let f = 0; f < FIGHTS; f++) {
    const seed = 70000 + hi * 97 + f;
    const rng = new Rng(mixSeed(seed, 0x7ea4));
    // (the hero and four others, none of them a second Mythic)
    const pool = ALL_HEROES.filter((k) => k !== hero && !(['vael', 'astrax', 'ilyra', 'orrun', 'nyxara'].includes(k) && ['vael', 'astrax', 'ilyra', 'orrun', 'nyxara'].includes(hero)) && !['vael', 'astrax', 'ilyra', 'orrun', 'nyxara'].includes(k));
    const team = [hero];
    while (team.length < 5) team.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    const b: Battle = startBattle(seed, FIELD_BANDS[f % FIELD_BANDS.length], fieldBoost(STAGE));
    const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
    team.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, sweepBoost(1, LEVEL)));
    fight(b);
    const last = new Map<number, string>();
    const open: Open[] = [];
    while (b.phase === 'fight') {
      // (where each fighter stood before the tick: a blast throws the struck out of its tiles in the tick it lands)
      const was = new Map(b.units.map((x) => [x.id, { u: x.u, v: x.v }]));
      const evs: BattleEvent[] = stepBattle(b);
      const ticks = new Map<number, string>();
      for (const e of evs) if (e.kind === 'skill') ticks.set(e.by, e.name);
      const unit = (id: number): Unit | undefined => b.units.find((x) => x.id === id);
      for (const e of evs) {
        if (e.kind === 'area') {
          const by = unit(e.by);
          if (!by || by.side !== 'hero') continue;
          const skill = areaSkill(ticks.get(e.by), last.get(e.by), by, e) ?? '?';
          const a = areaTiles(b.board, e, process.env.OLD ? undefined : skill);
          open.push({ key: `${UNITS[by.def].name}: ${skill}`, by: e.by, side: by.side, tiles: new Set(a.tiles.map(tileKey)), help: a.help, until: b.t + e.ms + 200, landAt: b.t + e.ms, struck: new Set(), checked: false, laidAt: b.t });
          T(`${UNITS[by.def].name}: ${skill}`, 'area').events++;
        } else if (e.kind === 'aura') {
          const by = unit(e.by);
          if (!by || by.side !== 'hero') continue;
          const c = e.at ?? { u: by.u, v: by.v };
          open.push({ key: `${UNITS[by.def].name}: aura ${e.what}`, by: e.by, side: by.side, tiles: new Set(auraTiles(b.board, c, e.reach).map(tileKey)), help: false, until: b.t + 1200, landAt: b.t + 1000, struck: new Set(), checked: true, laidAt: b.t });
          T(`${UNITS[by.def].name}: aura ${e.what}`, 'aura').events++;
        }
      }
      // (what the open events' casters did this tick: their skill's blows and heals, where the struck stood; each held against the areas of its
      // caster that land this tick, or were laid this tick (a burst strikes as it is laid), and outside only if outside all of them)
      for (const e of evs) {
        let who: number | undefined;
        let toId = -1;
        let heal = false;
        if (e.kind === 'hit' && e.src === 'skill') [who, toId] = [e.by, e.to];
        else if (e.kind === 'heal' && e.amount > 0 && e.by !== undefined) [who, toId, heal] = [e.by, e.to, true];
        if (who === undefined) continue;
        const to = unit(toId);
        if (!to) continue;
        // (auras are held to the sim's own reach by `test/fx-place.test.ts`: their caster's other blows in the tick would muddle it here)
        const now = open.filter((o) => o.by === who && o.help === heal && !o.key.includes(': aura ') && (Math.abs(o.landAt - b.t) <= 100 || o.laidAt === b.t));
        if (!now.length) continue;
        const stood = was.get(to.id) ?? to;
        const inside = now.some((o) => o.tiles.has(tileKey(stood)));
        for (const o of now) {
          if (o.struck.has(to.id)) continue;
          o.struck.add(to.id);
        }
        const t = tally.get(now[0].key)!;
        t.struck++;
        if (!inside) {
          t.outside++;
          if (process.env.WHERE && t.outside <= 3) console.log(`  outside: ${now[0].key} at t ${b.t}, struck ${to.def} at ${stood.u},${stood.v}; laid at t ${now[0].laidAt}, lands ${now[0].landAt}, tiles ${[...now[0].tiles].join(' ')}`);
        }
      }
      // (as a harm lands: the foes standing in its tiles it did not strike)
      for (const o of open) {
        if (o.checked || o.help || b.t < o.landAt) continue;
        o.checked = true;
        const t = tally.get(o.key)!;
        for (const x of b.units) {
          if (!x.alive || x.side === o.side || !o.tiles.has(tileKey(x))) continue;
          t.foesIn++;
          if (!o.struck.has(x.id)) t.missedIn++;
        }
      }
      for (let i = open.length - 1; i >= 0; i--) if (b.t > open[i].until) open.splice(i, 1);
      for (const [by, name] of ticks) last.set(by, name);
    }
  }
}

const rows = [...tally.entries()].sort((a, c) => c[1].outside / Math.max(1, c[1].struck) - a[1].outside / Math.max(1, a[1].struck));
console.log(`FX-PLACE audit: level ${LEVEL}, stage ${STAGE}, ${FIGHTS} fights a hero`);
console.log(`${'skill'.padEnd(46)} ${'what'.padEnd(5)} ${'events'.padStart(6)} ${'struck'.padStart(6)} ${'outside'.padStart(8)} ${'missed in'.padStart(9)}`);
for (const [k, t] of rows) {
  const out = t.struck ? `${Math.round((100 * t.outside) / t.struck)}%` : '-';
  const miss = t.foesIn ? `${Math.round((100 * t.missedIn) / t.foesIn)}%` : '-';
  console.log(`${k.padEnd(46)} ${t.what.padEnd(5)} ${String(t.events).padStart(6)} ${String(t.struck).padStart(6)} ${out.padStart(8)} ${miss.padStart(9)}`);
}
