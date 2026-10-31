// SPELLS-RETUNE (`docs/notes/spells-retune.md`): the army cells the difficulty targets are written against, measured with the king's spells
// cast by Auto's chooser (`botSpells`, on by default; `BOT_SPELLS=0` is the spell-less bot every earlier table used), on the same seeds either
// way. One tool for the cells the earlier notes measured with three: `tools/curve` (the early Normals: no talents, the climb's castle),
// `tools/army-pace` (the later Normals: every talent row, the castle a climb has at that level, hearts on the late three) and the difficulty
// test (`--deep`: every talent, a maxed castle).
//
//   node tools/spells-retune/run.mjs cell orcs:1:0:c undead:8:0:c golems:65:0:tph      mean tries to clear each cell
//   node tools/spells-retune/run.mjs tune yokai:65:0:tph                              bisect the army's Normal `start` (or, with a tier, its
//                                                                                     `tierLift`) to TARGET tries
//
// A cell is army:level:tier:flags. Flags: `t` every talent row the level opens; `h` hearts (a lost wave is fought again, two a run, as the
// page does); the castle: `c` the curve's (none until the sixth army, `tools/curve`), `p` the army pace's (`castleAt`, `tools/army-pace`),
// `m` every building at its top, none of them no castle.
// Environment: SAVES (12), CAP (25), TARGET (2.8), START and LIFT (army:value / army:tier:value, as `tools/army-pace`), TIERK (as there).
import { ARMIES, armyById } from '../../src/sim/armies';
import { fight, playOut, type Boost } from '../../src/sim/battle';
import { BUILDINGS, maxLevel, newCastle, xpRate, type BuildingId, type Castle } from '../../src/sim/castle';
import { fightXp, gainXp, levelOfKind } from '../../src/sim/levels';
import { heroRank, type Meta } from '../../src/sim/meta';
import { mixSeed } from '../../src/sim/rng';
import { armyRun, boostOf, canRetry, finish, isBossRun, noteFight, retryWave, startStage, type Owned, type Run } from '../../src/sim/run';
import { autoDeploy, autoRound } from '../../src/sim/autoplay';
import { ratingOf } from '../../src/sim/stars';
import { heroStats, learn, tierNodes } from '../../src/sim/talents';
import { TIERS } from '../../src/sim/tiers';
import { botLoadout, botSpells, maybeSpells, savedAt } from '../autoplay';

const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const SAVES = Number(process.env.SAVES ?? 12);
const CAP = Number(process.env.CAP ?? 25);

// (the army pace's castle, `tools/army-pace/pace.ts`: none to level 30, 6 at 38, 13 at 40, 18 at 46, 22 at 52, then a level every two)
const SPREAD: BuildingId[] = ['barracks', 'armoury', 'library', 'treasury', 'stable'];
const CASTLE_MAX = (Object.keys(BUILDINGS) as BuildingId[]).reduce((n, id) => n + maxLevel(id), 0);
const castleLevels = (L: number): number => {
  const pts: [number, number][] = [[30, 0], [38, 6], [40, 13], [46, 18], [52, 22]];
  if (L <= 30) return 0;
  for (let i = 1; i < pts.length; i++) if (L <= pts[i][0]) return Math.round(pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (L - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0]));
  return Math.min(CASTLE_MAX, Math.round(22 + (L - 52) / 2));
};
function paceCastle(L: number): Castle {
  const c = newCastle();
  const ids = Object.keys(BUILDINGS) as BuildingId[];
  for (let n = 0; n < castleLevels(L); n++) {
    const open = [...SPREAD, ...ids.filter((id) => !SPREAD.includes(id))].filter((id) => c[id] < maxLevel(id));
    if (!open.length) break;
    c[open.sort((a, b) => c[a] - c[b])[0]]++;
  }
  return c;
}
// (the curve's castle, `tools/curve/curve.ts`: by the army's place in the road)
const CURVE_TOTAL = [0, 0, 0, 0, 0, 6, 13, 18, 22];
function curveCastle(i: number): Castle {
  const c = newCastle();
  for (let n = 0; n < CURVE_TOTAL[i]; n++) {
    const id = [...SPREAD].sort((a, b) => c[a] - c[b])[0];
    if (c[id] < maxLevel(id)) c[id]++;
  }
  return c;
}
function maxedCastle(): Castle {
  const c = newCastle();
  for (const id of Object.keys(BUILDINGS) as BuildingId[]) c[id] = maxLevel(id);
  return c;
}

// (tuning overrides, nothing is written)
for (const kv of (process.env.START ?? '').split(',').filter(Boolean)) {
  const [id, v] = kv.split(':');
  (armyById(id) as unknown as { start: number }).start = Number(v);
}
for (const kv of (process.env.LIFT ?? '').split(',').filter(Boolean)) {
  const [id, t, v] = kv.split(':');
  const a = armyById(id) as unknown as { tierLift?: number[] };
  a.tierLift = [...(a.tierLift ?? [1, 1, 1, 1, 1])];
  a.tierLift[+t] = Number(v);
}
for (const kv of (process.env.TIERK ?? '').split(',').filter(Boolean)) {
  const [i, hp, atk] = kv.split(':').map(Number);
  const t = TIERS[i] as { hp: number; atk: number };
  t.hp *= hp;
  t.atk *= atk ?? hp;
}

interface Cell {
  id: string;
  i: number;
  level: number;
  tier: number;
  talents: boolean;
  hearts: boolean;
  castle: Castle;
}
function parse(spec: string): Cell {
  const [id, lv, tier = '0', flags = ''] = spec.split(':');
  const i = ARMIES.findIndex((a) => a.id === id);
  if (i < 0) throw new Error(`no army ${id}`);
  const level = Number(lv);
  const castle = flags.includes('m') ? maxedCastle() : flags.includes('p') ? paceCastle(level) : flags.includes('c') ? curveCastle(i) : newCastle();
  return { id, i, level, tier: Number(tier), talents: flags.includes('t'), hearts: flags.includes('h'), castle };
}

function dress(meta: Meta): void {
  for (const k of party) {
    if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
    for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(meta, k, n.id);
  }
}

/** One attempt at the cell's army: whether it fell. Gains XP into `meta` (and learns the rows its levels open, with talents). */
function attempt(meta: Meta, c: Cell, seed: number): boolean {
  const army = ARMIES[c.i];
  if (c.talents) dress(meta);
  const bf = c.talents ? (h: Owned): Boost => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind)) : undefined;
  const run: Run = armyRun(seed, c.id, party, c.castle, c.tier);
  let won = 0;
  while (!run.over) {
    autoRound(run, meta, true);
    const b = startStage(run);
    autoDeploy(b, run, meta, bf);
    fight(b);
    maybeSpells(b, meta, c.castle);
    playOut(b);
    const ok = b.phase === 'won';
    if (!ok && c.hearts && canRetry(run)) {
      retryWave(run);
      continue;
    }
    if (ok) won = run.stage;
    noteFight(run, b);
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    gainXp(meta, fightXp(b, xpRate(c.castle)));
  }
  return !!run.cleared && won === army.waves.length;
}

/** Mean tries to clear (CAP + 1 for a save that never does) and the share of saves that cleared. The seeds are `tools/army-pace`'s. */
export function measure(c: Cell, saves = SAVES): { tries: number; share: number } {
  let total = 0;
  let cleared = 0;
  for (let save = 1; save <= saves; save++) {
    const meta = savedAt(c.level, party, save);
    let n = 0;
    let ok = false;
    while (n < CAP && !ok) ok = attempt(meta, c, mixSeed(save, 0xd33b, c.i * 100 + c.tier * 10 + n++));
    total += ok ? n : CAP + 1;
    if (ok) cleared++;
  }
  return { tries: total / saves, share: cleared / saves };
}

const fmt = (r: { tries: number; share: number }) => `${r.tries.toFixed(1)}${r.share < 1 ? ` (${Math.round(r.share * 100)}%)` : ''}`;
const [cmd = 'cell', ...specs] = process.argv.slice(2);
const spells = (c: Cell) => (botSpells.on ? botLoadout(c.castle).join('/') : 'no spells');
if (cmd === 'cell') {
  for (const s of specs) {
    const c = parse(s);
    console.log(`${s.padEnd(20)} ${fmt(measure(c)).padStart(10)}   [${spells(c)}, ${SAVES} saves]`);
  }
} else if (cmd === 'tune') {
  const target = Number(process.env.TARGET ?? 2.8);
  for (const s of specs) {
    const c = parse(s);
    const a = ARMIES[c.i] as unknown as { start: number; tierLift?: number[] };
    const get = () => (c.tier ? a.tierLift?.[c.tier] ?? 1 : a.start);
    const put = (v: number) => {
      if (!c.tier) a.start = v;
      else {
        a.tierLift = [...(a.tierLift ?? [1, 1, 1, 1, 1])];
        a.tierLift[c.tier] = v;
      }
    };
    const from = get();
    let lo = from * Number(process.env.LO ?? 0.9);
    let hi = from * Number(process.env.HI ?? 1.8);
    for (let step = 0; step < Number(process.env.STEPS ?? 6); step++) {
      const mid = (lo + hi) / 2;
      put(mid);
      const r = measure(c);
      console.log(`  ${s} ${c.tier ? `lift ${c.tier}` : 'start'} ${mid.toFixed(3)}: ${fmt(r)}`);
      r.tries > target ? (hi = mid) : (lo = mid);
    }
    console.log(`${s}: ${c.tier ? `lift ${c.tier}` : 'start'} ${from} -> about ${((lo + hi) / 2).toFixed(3)} for ${target} tries`);
  }
}
