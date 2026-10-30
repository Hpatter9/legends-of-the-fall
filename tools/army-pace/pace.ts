// The pace of the armies against the first army's stars (ARMY-PACE, `docs/notes/army-pace.md`). The owner's ask: the final armies should not
// be clearable on Normal before a typical player has every star of the first army, Mythic included. The player: the recruits' party
// (Knight, Paladin, Archer, Warlock, Cleric) at a level, every talent row that level opens (the first of each pair, as `npm run balance --
// --deep --talents`), gear dressed, the castle a climb has at that level (`castleAt`), XP carried between tries (talents learned again as rows open).
//
//   node tools/army-pace/run.mjs stars 30,45,60          the first army's stars, tier by tier, chased at each level: mean tries a tier and the share with all 11
//   node tools/army-pace/run.mjs normal 30,45,60         mean tries to clear each army's Normal at each level (this player)
//   node tools/army-pace/run.mjs tiers 55,70,85,100     each tier of the armies in ONLY on its own: mean tries to clear
//   node tools/army-pace/run.mjs tune golems:64          bisect an army's Normal `start` so this player at that level takes TARGET (2.8) tries
//   node tools/army-pace/run.mjs cell golems:60 yokai:55 one army:level Normal cell
//   node tools/army-pace/run.mjs gate 55,65              the armies' Normals in order, each tried only once the one before is beaten (the army
//                                                        gate, `docs/notes/army-gate.md`): FROM (infernal) on, the armies before it beaten
//
// Environment: SAVES (default 12), CAP (25 tries a tier, or to clear), ONLY (army ids), START, GROWTH (army:value,...), ARMY (the army `stars` chases: orcs),
// HEARTS=1 (a lost wave burns a heart and is fought again, as the page does; by default a loss ends the try, as every figure in the notes was
// measured; the star "clear without using a heart" is then met by every clear).
import { ARMIES, ARMY_WAVES, armyById, armyUnlocked } from '../../src/sim/armies';
import { armyRules } from '../../src/sim/armyStars';
import { fight, playOut, type Boost } from '../../src/sim/battle';
import { BUILDINGS, maxLevel, newCastle, xpRate, type BuildingId, type Castle } from '../../src/sim/castle';
import { fightXp, gainXp, levelOfKind } from '../../src/sim/levels';
import { heroRank, type Meta } from '../../src/sim/meta';
import { mixSeed } from '../../src/sim/rng';
import { armyRun, boostOf, canRetry, finish, isBossRun, noteFight, retryWave, startStage, tierOfRun, type Owned, type Run } from '../../src/sim/run';
import { autoDeploy, autoRound } from '../../src/sim/autoplay';
import { ratingOf } from '../../src/sim/stars';
import { heroStats, learn, tierNodes } from '../../src/sim/talents';
import { TIERS } from '../../src/sim/tiers';
import { savedAt } from '../autoplay';

const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const SAVES = Number(process.env.SAVES ?? 12);
const CAP = Number(process.env.CAP ?? 25);
const HEARTS = process.env.HEARTS === '1';
const SPREAD: BuildingId[] = ['barracks', 'armoury', 'library', 'treasury', 'stable', 'mage'].filter((id) => id in BUILDINGS) as BuildingId[];
const CASTLE_MAX = (Object.keys(BUILDINGS) as BuildingId[]).reduce((n, id) => n + maxLevel(id), 0);
/** The castle levels a player has at a hero level: the climb's (`tools/curve`: none to level 30, 6 at 38, 13 at 40, 18 at 46, 22 at 52), then a level more every two hero levels to the top. */
const castleLevels = (L: number): number => {
  const pts: [number, number][] = [[30, 0], [38, 6], [40, 13], [46, 18], [52, 22]];
  if (L <= 30) return 0;
  for (let i = 1; i < pts.length; i++) if (L <= pts[i][0]) return Math.round(pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (L - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0]));
  return Math.min(CASTLE_MAX, Math.round(22 + (L - 52) / 2));
};
export function castleAt(L: number): Castle {
  const c = newCastle();
  const ids = Object.keys(BUILDINGS) as BuildingId[];
  for (let n = 0; n < castleLevels(L); n++) {
    const open = [...SPREAD, ...ids.filter((id) => !SPREAD.includes(id))].filter((id) => c[id] < maxLevel(id));
    if (!open.length) break;
    const id = open.sort((a, b) => c[a] - c[b])[0];
    c[id]++;
  }
  return c;
}
const set = (env: string | undefined, key: 'start' | 'growth') => {
  for (const kv of (env ?? '').split(',').filter(Boolean)) {
    const [id, v] = kv.split(':');
    (ARMIES.find((a) => a.id === id) as unknown as Record<string, number>)[key] = Number(v);
  }
};
set(process.env.START, 'start');
// (TIERK=3:1.5,4:2 scales a tier's hp and attack, or 3:1.5:1.3 each on its own: a tuning run, nothing is written)
for (const kv of (process.env.TIERK ?? '').split(',').filter(Boolean)) {
  const [i, hp, atk] = kv.split(':').map(Number);
  const t = TIERS[i] as { hp: number; atk: number };
  t.hp *= hp;
  t.atk *= atk ?? hp;
}
// (LIFT=golems:1:1.3,golems:2:1.2 sets an army's `tierLift` for a tier)
for (const kv of (process.env.LIFT ?? '').split(',').filter(Boolean)) {
  const [id, t, v] = kv.split(':');
  const a = ARMIES.find((x) => x.id === id) as unknown as { tierLift?: number[] };
  const lift = [...(a.tierLift ?? [1, 1, 1, 1, 1])];
  lift[+t] = Number(v);
  a.tierLift = lift;
}
set(process.env.GROWTH, 'growth');

/** Learn every talent the party's levels open (the first of each pair); called again as the party levels. */
function dress(meta: Meta): void {
  for (const k of party) {
    if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
    for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(meta, k, n.id);
  }
}
const boostFor = (meta: Meta) => (h: Owned): Boost => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind));

/** One attempt at an army on a tier: whether it fell, and the mask of the tier's star conditions met. */
function attempt(meta: Meta, id: string, seed: number, castle: Castle, tier: number): { cleared: boolean; mask: number } {
  const army = armyById(id)!;
  dress(meta);
  const run: Run = armyRun(seed, id, party, castle, tier);
  const bf = boostFor(meta);
  let won = 0;
  while (!run.over) {
    autoRound(run, meta, true);
    const b = startStage(run);
    autoDeploy(b, run, meta, bf);
    fight(b);
    playOut(b);
    const ok = b.phase === 'won';
    if (!ok && HEARTS && canRetry(run)) {
      retryWave(run);
      continue;
    }
    if (ok) won = run.stage;
    noteFight(run, b);
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    gainXp(meta, fightXp(b, xpRate(castle)));
  }
  const cleared = !!run.cleared && won === army.waves.length;
  let mask = 0;
  if (cleared) armyRules(army, tierOfRun(run), run).forEach((r, i) => r.earned && (mask |= 1 << i));
  return { cleared, mask };
}

const levelOfParty = (m: Meta) => Math.round(party.reduce((n, k) => n + levelOfKind(m, k), 0) / party.length);

/** Chase every star of an army at a level, tier by tier (a tier is tried until its stars are all met, at most CAP tries). */
function chase(id: string, L: number, save: number): { tries: number[]; done: number; endLevel: number } {
  const meta = savedAt(L, party, save);
  const castle = castleAt(L);
  const tries: number[] = [];
  let done = 0;
  for (let t = 0; t < TIERS.length; t++) {
    const full = (1 << TIERS[t].stars) - 1;
    let mask = 0;
    let n = 0;
    while (n < CAP && mask !== full) {
      mask |= attempt(meta, id, mixSeed(save, 0x5ace, t * 100 + n), castle, t).mask;
      n++;
    }
    tries.push(n);
    if (mask !== full) break;
    done = t + 1;
  }
  return { tries, done, endLevel: levelOfParty(meta) };
}

/** Mean tries to clear an army on a tier at a level (CAP + 1 when never), and the share that cleared. */
export function normalTries(i: number, L: number, saves = SAVES, tier = 0): { tries: number; share: number } {
  const a = ARMIES[i];
  const castle = castleAt(L);
  let total = 0;
  let cleared = 0;
  for (let save = 1; save <= saves; save++) {
    const meta = savedAt(L, party, save);
    let n = 0;
    let ok = false;
    while (n < CAP && !ok) {
      ok = attempt(meta, a.id, mixSeed(save, 0xd33b, i * 100 + tier * 10 + n), castle, tier).cleared;
      n++;
    }
    total += ok ? n : CAP + 1;
    if (ok) cleared++;
  }
  return { tries: total / saves, share: cleared / saves };
}

const [cmd = 'normal', ...rest] = process.argv.slice(2);
const levels = (rest[0] ?? '30,45,60').split(',').map(Number);
const only = process.env.ONLY?.split(',');
if (cmd === 'stars') {
  const id = process.env.ARMY ?? 'orcs';
  console.log(`${armyById(id)!.name}: tries a tier until all its stars are met (${SAVES} saves, at most ${CAP} a tier), the share with every star, the party's level at the end`);
  for (const L of levels) {
    const rows = Array.from({ length: SAVES }, (_, s) => chase(id, L, s + 1));
    const mean = TIERS.map((_, t) => {
      const got = rows.filter((r) => r.tries.length > t);
      return got.length ? (got.reduce((n, r) => n + r.tries[t], 0) / got.length).toFixed(1) : '-';
    });
    const all = rows.filter((r) => r.done === TIERS.length).length;
    const endL = rows.reduce((n, r) => n + r.endLevel, 0) / rows.length;
    console.log(`Lv ${String(L).padStart(3)}  castle ${String(castleLevels(L)).padStart(2)}  ${TIERS.map((t, k) => `${t.name} ${mean[k]}`).join('  ')}  all stars ${all}/${SAVES}  ends Lv ${endL.toFixed(0)}`);
  }
} else if (cmd === 'normal') {
  console.log(['army (rec)'.padEnd(26), ...levels.map((l) => `Lv${l}`.padStart(12))].join(''));
  ARMIES.forEach((a, i) => {
    if (only && !only.includes(a.id)) return;
    console.log([`${a.name} (${a.level})`.padEnd(26), ...levels.map((l) => {
      const r = normalTries(i, l);
      return `${r.tries.toFixed(1)} (${Math.round(r.share * 100)}%)`.padStart(12);
    })].join(''));
  });
} else if (cmd === 'tiers') {
  // (each tier of the armies in ONLY on its own, at each level: mean tries to clear)
  ARMIES.forEach((a, i) => {
    if (only && !only.includes(a.id)) return;
    console.log(a.name);
    TIERS.forEach((t, k) => console.log([`  ${t.name}`.padEnd(14), ...levels.map((l) => {
      const r = normalTries(i, l, SAVES, k);
      return `${r.tries.toFixed(1)} (${Math.round(r.share * 100)}%)`.padStart(12);
    })].join('')));
  });
} else if (cmd === 'tune') {
  // (bisect each named army's Normal `start` until this player at the level given takes TARGET tries: tune labyrinth:35 golems:64)
  const target = Number(process.env.TARGET ?? 2.8);
  for (const c of rest) {
    const [id, lv] = c.split(':');
    const i = ARMIES.findIndex((a) => a.id === id);
    const a = ARMIES[i] as unknown as { start: number; tierLift?: number[] };
    // (with TIER set above Normal, the tier's `tierLift` is bisected instead, from 1)
    const tier = Number(process.env.TIER ?? 0);
    const get = () => (tier ? a.tierLift?.[tier] ?? 1 : a.start);
    const put = (v: number) => {
      if (!tier) a.start = v;
      else {
        a.tierLift = [...(a.tierLift ?? [1, 1, 1, 1, 1])];
        a.tierLift[tier] = v;
      }
    };
    let lo = get() * Number(process.env.LO ?? 0.8);
    let hi = get() * Number(process.env.HI ?? 2.5);
    for (let step = 0; step < Number(process.env.STEPS ?? 7); step++) {
      const mid = (lo + hi) / 2;
      put(mid);
      const t = normalTries(i, +lv, SAVES, tier).tries;
      console.log(`  ${id} ${tier ? `tier ${tier} lift` : 'start'} ${mid.toFixed(3)}: ${t.toFixed(2)}`);
      t > target ? (hi = mid) : (lo = mid);
    }
    put(Math.round(((lo + hi) / 2) * 100) / 100);
    console.log(`${id}: ${tier ? `tier ${tier} lift` : 'start'} ${get()} -> ${normalTries(i, +lv, SAVES, tier).tries.toFixed(2)} tries at Lv ${lv}`);
  }
} else if (cmd === 'gate') {
  // (LATE-RETUNE: an army opens only once the army before it is beaten, ARMY-GATE. Each save starts at a level with the armies before FROM
  // beaten (their Normal's clear star and one more, as the stars' pace has it); it tries FROM's Normal until it falls (at most CAP tries), then
  // the next army's once `armyUnlocked` says so, carrying XP. An army never beaten keeps the rest shut. Per army: the mean tries of the saves
  // that reached it, the share of saves that beat it, the mean tries from FROM to beating it, and the party's level then.)
  const from = Math.max(0, ARMIES.findIndex((a) => a.id === (process.env.FROM ?? 'infernal')));
  const beat = (m: Meta, id: string, mask: number) => {
    const r = (m.armies[id] ??= { waves: ARMY_WAVES, best: 0, won: 0, clears: 0, stars: {} });
    r.best = r.won = ARMY_WAVES;
    r.clears++;
    r.met = { ...(r.met ?? {}), 0: (r.met?.[0] ?? 0) | mask };
  };
  for (const L of levels) {
    const reach = ARMIES.map(() => ({ saves: 0, tries: 0, beat: 0, sum: 0, level: 0 }));
    for (let save = 1; save <= SAVES; save++) {
      const meta = savedAt(L, party, save);
      for (let i = 0; i < from; i++) beat(meta, ARMIES[i].id, 0b11);
      const castle = castleAt(L);
      let sum = 0;
      for (let i = from; i < ARMIES.length && armyUnlocked(meta, ARMIES[i].id); i++) {
        reach[i].saves++;
        let n = 0;
        let won: { cleared: boolean; mask: number } = { cleared: false, mask: 0 };
        while (n < CAP && !won.cleared) won = attempt(meta, ARMIES[i].id, mixSeed(save, 0x6a7e, i * 100 + n++), castle, 0);
        reach[i].tries += n;
        sum += n;
        if (!won.cleared) break;
        beat(meta, ARMIES[i].id, won.mask);
        reach[i].beat++;
        reach[i].sum += sum;
        reach[i].level += levelOfParty(meta);
      }
    }
    console.log(`Lv ${L} (${SAVES} saves, from ${ARMIES[from].name}; at most ${CAP} tries an army)`);
    ARMIES.forEach((a, i) => {
      const r = reach[i];
      if (i < from) return;
      console.log(`  ${a.name.padEnd(22)} ${r.saves ? `reached ${r.saves}/${SAVES}  tries ${(r.tries / r.saves).toFixed(1)}  beaten ${r.beat}/${SAVES}` : 'never reached'}${r.beat ? `  tries from ${ARMIES[from].name} ${(r.sum / r.beat).toFixed(1)}  at Lv ${(r.level / r.beat).toFixed(0)}` : ''}`);
    });
  }
} else if (cmd === 'cell') {
  for (const c of rest) {
    const [id, lv] = c.split(':');
    const i = ARMIES.findIndex((a) => a.id === id);
    const r = normalTries(i, +lv);
    console.log(`${id} L${lv}: ${r.tries.toFixed(1)} tries (${Math.round(r.share * 100)}% cleared)`);
  }
}
