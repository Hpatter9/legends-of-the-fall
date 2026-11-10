// BATTLE-FEEL: replays a battle the page dumped (probe.mjs with DUMP=file) headless, logging one fighter's every decision in a window.
import { readFileSync } from 'node:fs';
import { canStrike, fight, stepBattle, strikeDef, type Battle } from '../../src/sim/battle';
const [file, who, from, to] = process.argv.slice(2);
const b = JSON.parse(readFileSync(file, 'utf8'), (_k, v) => (v && v.__map ? new Map(v.__map) : v && v.__set ? new Set(v.__set) : v)) as Battle;
fight(b);
const H = (u: number, v: number) => b.board.tiles[v * b.board.w + u].h;
while (b.phase === 'fight' && b.t < Number(to)) {
  const ev = stepBattle(b);
  if (b.t < Number(from)) continue;
  const u = b.units.find((x) => x.def === who)!;
  const foes = b.units.filter((x) => x.alive && x.side !== u.side);
  console.log(b.t, `${u.def}@${u.u},${u.v} h${H(u.u, u.v)} busy ${u.busyUntil} jump ${strikeDef(b, u).jump}`, foes.map((f) => `${f.def}@${f.u},${f.v} h${H(f.u, f.v)} ${canStrike(b.board, strikeDef(b, u), u, f) ? 'REACH' : ''}`).join(' | '), ev.filter((e) => (e as any).by === u.id).map((e) => e.kind).join(','));
}
if (process.env.MAP) {
  for (let v = 0; v < b.board.d; v++) {
    let r = '';
    for (let u = 0; u < b.board.w; u++) {
      const x = b.units.find((y) => y.alive && y.u === u && y.v === v);
      r += (x ? (x.def === who ? '@' : x.side === 'hero' ? 'H' : 'F') : '.') + String(H(u, v)).padEnd(3);
    }
    console.log(r);
  }
}
// (WHY=1: at each of the fighter's decisions in the window, the walk part of `decide` worked again: each foe's best spot and its score)
import { firstStep, walkFrom } from '../../src/sim/path';
export function why(bb: Battle, name: string): string {
  const me = bb.units.find((x) => x.def === name)!;
  const def = strikeDef(bb, me);
  const blocked = new Set<number>();
  for (const x of bb.units) if (x.alive && x !== me) blocked.add(x.v * bb.board.w + x.u);
  const walk = walkFrom(bb.board, me, def.jump, blocked, me.side);
  const foes = bb.units.filter((x) => x.alive && x.side !== me.side).sort((x, y) => Math.abs(me.u - x.u) + Math.abs(me.v - x.v) - (Math.abs(me.u - y.u) + Math.abs(me.v - y.v)) || x.id - y.id);
  const out: string[] = [];
  for (const f of foes) {
    const hf = bb.board.tiles[f.v * bb.board.w + f.u].h;
    let nearest = Infinity;
    const spots: number[] = [];
    for (let i = 0; i < walk.cost.length; i++) {
      if (walk.cost[i] === Infinity || walk.cost[i] === 0 || !canStrike(bb.board, def, { u: i % bb.board.w, v: Math.floor(i / bb.board.w) }, f)) continue;
      spots.push(i);
      nearest = Math.min(nearest, walk.cost[i]);
    }
    const list = spots.map((i) => {
      const h = bb.board.tiles[i].h;
      const sc = walk.cost[i] - 1.2 * Math.max(-3, Math.min(3, h - hf));
      const fs = firstStep(walk, i)!;
      return `${i % bb.board.w},${Math.floor(i / bb.board.w)} c${walk.cost[i].toFixed(1)} s${sc.toFixed(1)}${walk.cost[i] > nearest + 4 ? ' FAR' : ''} via ${fs % bb.board.w},${Math.floor(fs / bb.board.w)}`;
    });
    out.push(`  ${f.def}@${f.u},${f.v}: ${list.join('; ') || 'no spot'}`);
  }
  return out.join('\n');
}
if (process.env.WHY) {
  const b2 = JSON.parse(readFileSync(file, 'utf8'), (_k, v) => (v && v.__map ? new Map(v.__map) : v && v.__set ? new Set(v.__set) : v)) as Battle;
  fight(b2);
  let lastBusy = -1;
  while (b2.phase === 'fight' && b2.t < Number(to)) {
    const me = b2.units.find((x) => x.def === who)!;
    // (the tick it decides: its busy time has run out)
    if (b2.t >= Number(from) && me.busyUntil <= b2.t + 100 && me.busyUntil !== lastBusy) {
      lastBusy = me.busyUntil;
      console.log(`${b2.t + 100}: ${who}@${me.u},${me.v} decides`);
      console.log(why(b2, who));
    }
    stepBattle(b2);
  }
}
