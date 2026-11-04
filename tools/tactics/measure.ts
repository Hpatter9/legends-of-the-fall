// The tactics design's measurement (docs/notes/tactics-design.md): in seeded field fights, how often and by how much the strikers
// (and the back line) come to blows before the front line does, and what it costs them. Read-only: it plays fights through the sim's
// own functions and changes no rule. The `--hold` and `--pace` prototypes hold a hero by its `busyUntil` from outside the sim (a crude
// stand-in for the designed rule, which would still let a held hero cast its buffs and heals): only for measuring.
//
//   node tools/tactics/run.mjs [--games 600] [--level 10 --stage 27] [--placed sensible|random] [--hold|--pace]
import { DEPLOY_ROWS, standable, tileAt } from '../../src/sim/board';
import { fight, place, startBattle, stepBattle, type Battle } from '../../src/sim/battle';
import { FIELD_BANDS } from '../../src/sim/foes';
import { mixSeed, Rng } from '../../src/sim/rng';
import { roleOf, type PartyRole } from '../../src/sim/suggest';
import { UNITS } from '../../src/sim/units';
import { fieldBoost, pickTeam, sweepBoost } from '../heroSweep';

const flag = (n: string, d: string) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const GAMES = Number(flag('--games', '600'));
const LEVEL = Number(flag('--level', '10'));
const STAGE = Number(flag('--stage', '27'));
const PLACED = flag('--placed', 'sensible');
const MODE = process.argv.includes('--hold') ? 'hold' : process.argv.includes('--pace') ? 'pace' : 'none';
/** Released when a foe comes this near (tiles), whatever the front line is doing. */
const NEAR = 3;
/** The longest a hero is held (ms). */
const HOLD_CAP = 8000;

/** The heroes' rows, front first (the heroes stand on the last `DEPLOY_ROWS` rows; the foes come from row 0). */
function rows(b: Battle): [number, number][][] {
  const out: [number, number][][] = [];
  for (let v = b.board.d - DEPLOY_ROWS; v < b.board.d; v++) {
    const r: [number, number][] = [];
    for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) r.push([u, v]);
    out.push(r);
  }
  return out;
}

/** A sensible player's placing: front-liners on the front row, strikers on the middle, the back line and support at the back, each row
 *  filled from the middle outward (a full row spills to the next). */
function sensible(b: Battle, team: string[]): [number, number][] {
  const rs = rows(b).map((r) => [...r].sort((x, y) => Math.abs(x[0] - 3.5) - Math.abs(y[0] - 3.5) || x[0] - y[0]));
  const want: Record<PartyRole, number> = { front: 0, striker: 1, back: 2, support: 2 };
  return team.map((k) => {
    const pref = want[roleOf(k)];
    for (const d of [0, 1, -1, 2, -2]) {
      const r = rs[pref + d];
      if (r?.length) return r.shift()!;
    }
    throw new Error('no room');
  });
}

function random(b: Battle, seed: number): [number, number][] {
  const spots = rows(b).flat();
  const rng = new Rng(mixSeed(seed, 0xba1a));
  for (let i = spots.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  return spots;
}

interface Tally {
  fights: number;
  won: number;
  withFront: number;
  early: number; // a striker or back-liner came to blows before any front-liner
  earlyStriker: number;
  strikers: number;
  strikerEarly: number;
  strikerLead: number[]; // ms ahead of the front line, for those early
  strikerBlinkFirst: number; // early strikers whose first contact followed a blink/dash of their own
  strikerTakenEarly: number; // damage strikers took before the front line engaged
  strikerHp: number;
  strikerDiedBeforeFront: number;
  strikerDied: number;
  wonEarly: number;
  wonNotEarly: number;
  fightsEarly: number;
  frontFirst: number[]; // ms to the front line's first blow
  byKind: Map<string, { n: number; early: number; lead: number }>;
}

const BAND = new Map<string, { n: number; won: number }>();
const LEN: number[] = [];
const T: Tally = { fights: 0, won: 0, withFront: 0, early: 0, earlyStriker: 0, strikers: 0, strikerEarly: 0, strikerLead: [], strikerBlinkFirst: 0, strikerTakenEarly: 0, strikerHp: 0, strikerDiedBeforeFront: 0, strikerDied: 0, wonEarly: 0, wonNotEarly: 0, fightsEarly: 0, frontFirst: [], byKind: new Map() };

for (let g = 0; g < GAMES; g++) {
  const seed = g + 1;
  const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
  const b = startBattle(seed, FIELD_BANDS[g % FIELD_BANDS.length], fieldBoost(STAGE));
  const spots = PLACED === 'random' ? random(b, seed) : sensible(b, team);
  team.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, sweepBoost(1, LEVEL)));
  const role = new Map<number, PartyRole>();
  for (const u of b.units) if (u.side === 'hero') role.set(u.id, roleOf(u.def));
  const fronts = [...role].filter(([, r]) => r === 'front').map(([id]) => id);
  const contact = new Map<number, number>(); // first blow struck or taken
  const moved = new Map<number, number>(); // last blink/dash of its own
  const blinkFirst = new Set<number>();
  const takenBefore = new Map<number, number>();
  const diedAt = new Map<number, number>();
  let frontAt = Infinity;
  fight(b);
  while (b.phase === 'fight') {
    // (the prototypes: hold the strikers and the back line until the front line is at the foe)
    if (MODE !== 'none' && frontAt === Infinity && fronts.length && b.t < HOLD_CAP) {
      const frontAlive = b.units.filter((x) => fronts.includes(x.id) && x.alive);
      const frontV = Math.min(...frontAlive.map((x) => x.v));
      const foes = b.units.filter((x) => x.alive && x.side === 'foe');
      for (const u of b.units) {
        const r = role.get(u.id);
        if (!u.alive || !r || r === 'front') continue;
        if (foes.some((f) => Math.abs(f.u - u.u) + Math.abs(f.v - u.v) <= NEAR)) continue;
        if (MODE === 'hold' || u.v <= frontV) u.busyUntil = Math.max(u.busyUntil, b.t + 101);
      }
    }
    for (const e of stepBattle(b)) {
      if ((e.kind === 'blink' || e.kind === 'dash') && role.has(e.by)) moved.set(e.by, b.t);
      if (e.kind === 'hit' && e.by !== e.to) {
        if (e.killed && role.has(e.to) && !diedAt.has(e.to)) diedAt.set(e.to, b.t);
        for (const id of [e.by, e.to]) {
          if (!role.has(id) || contact.has(id)) continue;
          contact.set(id, b.t);
          if ((moved.get(id) ?? -1e9) >= b.t - 1500) blinkFirst.add(id);
          if (fronts.includes(id)) frontAt = Math.min(frontAt, b.t);
        }
        if (role.has(e.to) && frontAt === Infinity) takenBefore.set(e.to, (takenBefore.get(e.to) ?? 0) + e.dmg);
      }
    }
  }
  T.fights++;
  const won = b.phase === 'won';
  const band = FIELD_BANDS[g % FIELD_BANDS.length];
  const bt = BAND.get(band) ?? { n: 0, won: 0 };
  bt.n++;
  if (won) bt.won++;
  BAND.set(band, bt);
  if (won) LEN.push(b.t);
  if (won) T.won++;
  if (!fronts.length || frontAt === Infinity) continue;
  T.withFront++;
  T.frontFirst.push(frontAt);
  let early = false;
  for (const [id, r] of role) {
    if (r === 'front') continue;
    const at = contact.get(id) ?? Infinity;
    const isEarly = at < frontAt;
    if (r !== 'striker') continue;
    if (isEarly) early = true;
    const u = b.units.find((x) => x.id === id)!;
    T.strikers++;
    T.strikerHp += u.maxHp;
    const k = T.byKind.get(u.def) ?? { n: 0, early: 0, lead: 0 };
    k.n++;
    if (isEarly) {
      T.strikerEarly++;
      T.strikerLead.push(frontAt - at);
      k.early++;
      k.lead += frontAt - at;
      if (blinkFirst.has(id)) T.strikerBlinkFirst++;
    }
    T.byKind.set(u.def, k);
    T.strikerTakenEarly += takenBefore.get(id) ?? 0;
    if (diedAt.has(id)) T.strikerDied++;
    if ((diedAt.get(id) ?? Infinity) < frontAt + 3000) T.strikerDiedBeforeFront++;
  }
  if (early) {
    T.fightsEarly++;
    if (won) T.wonEarly++;
  } else if (won) T.wonNotEarly++;
}

const pc = (a: number, n: number) => `${((100 * a) / Math.max(1, n)).toFixed(1)}%`;
const med = (xs: number[]) => (xs.length ? [...xs].sort((a, c) => a - c)[Math.floor(xs.length / 2)] : 0);
console.log(`\nlevel ${LEVEL}, stage ${STAGE}, ${GAMES} field fights, random teams, placed ${PLACED}, prototype ${MODE}`);
console.log(`won ${pc(T.won, T.fights)}; with a front-liner that came to blows: ${T.withFront}`);
console.log(`front line's first blow: median ${(med(T.frontFirst) / 1000).toFixed(1)} s`);
console.log(`fights where a striker was at blows first: ${pc(T.fightsEarly, T.withFront)} (won ${pc(T.wonEarly, T.fightsEarly)}; the rest won ${pc(T.wonNotEarly, T.withFront - T.fightsEarly)})`);
console.log(`strikers at blows before the front line: ${pc(T.strikerEarly, T.strikers)} of ${T.strikers}; lead median ${(med(T.strikerLead) / 1000).toFixed(1)} s, mean ${(T.strikerLead.reduce((a, c) => a + c, 0) / Math.max(1, T.strikerLead.length) / 1000).toFixed(1)} s; just after a blink or dash: ${pc(T.strikerBlinkFirst, T.strikerEarly)}`);
console.log(`strikers' damage taken before the front line engaged: ${pc(T.strikerTakenEarly, T.strikerHp)} of their health; died by 3 s after the front engaged: ${pc(T.strikerDiedBeforeFront, T.strikers)}; died at all: ${pc(T.strikerDied, T.strikers)}`);
const kinds = [...T.byKind].filter(([, k]) => k.n >= 15).sort((a, c) => c[1].early / c[1].n - a[1].early / a[1].n);
console.log('strikers by kind (in fights, early %, mean lead s):');
for (const [kind, k] of kinds) console.log(`  ${UNITS[kind].name.padEnd(20)} ${String(k.n).padStart(4)}  ${pc(k.early, k.n).padStart(6)}  ${(k.lead / Math.max(1, k.early) / 1000).toFixed(1)}`);
console.log(`won fights' median length ${(med(LEN) / 1000).toFixed(1)} s; won by band: ${[...BAND].map(([k, v]) => `${k} ${pc(v.won, v.n)}`).join(', ')}`);
