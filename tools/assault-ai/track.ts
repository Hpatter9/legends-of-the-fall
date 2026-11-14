// ASSAULT-AI (`docs/notes/assault-skills.md`, "The heroes' movement"): how stuck the heroes get in an assault. The owner: "the assaults
// don't seem to have good AI in them. my guys were pretty dumb": the heroes bunched up and got stuck. Every hold's conquest is stormed as
// the developer's Try an Assault storms it ("As expected", the balance party, the muster's default plan, Auto), and each tick each hero is
// looked at:
//
// - STILL: standing (not stepping, striking or casting) with a foe within six tiles but none within its reach (not fighting anyone);
// - BLOCKED: standing with three or more of its own round it (of its eight neighbours), with no foe in its reach;
// - LOOPING: in the last six seconds it stepped twelve tiles or more but is within two of where it was, with no foe in its reach;
// - QUEUE: our fighters (heroes and soldiers) standing within four tiles of a gate's front or the middle of an approach's way, while no foe
//   is within their reach: the mean of them over the battle;
// - NEVER: heroes that never struck, cast or were struck all battle.
//
// STILL, BLOCKED and LOOPING are shares of the heroes' time alive.
//
//   node tools/assault-ai/run.mjs [--seeds 8] [--only orcs,undead] [--kind hold|last|regroup]
import { startedMeta } from '../../src/sim/meta';
import { mixSeed } from '../../src/sim/rng';
import { assaultInput, assaultParty, defaultPlan } from '../../src/sim/assault/assaultMode';
import { playAssault, startAssault } from '../../src/sim/assault/assault';
import { trialArmies, trialMeta, type TrialKind } from '../../src/sim/assault/devTrial';
import { canStrike, strikeDef, type Battle, type Unit } from '../../src/sim/battle';

const flag = (name: string): string | undefined => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const seeds = Number(flag('--seeds') ?? 8);
const only = flag('--only')?.split(',');
const kind = (flag('--kind') ?? 'hold') as TrialKind;
const save = startedMeta(20261114);
const NEAR = 6;
const WINDOW = 60;
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '-');

const doing = (b: Battle, u: Unit, moved: boolean, acted: Set<number>): boolean =>
  moved || acted.has(u.id) || (!!u.swing && b.t < u.swing.at + u.swing.ms) || (!!u.cast && b.t < u.cast.at + u.cast.ms) || (!!u.step && b.t < u.step.at + u.step.ms);

console.log(`\nASSAULT-AI: how stuck the heroes get (${kind}, "As expected", the balance party, Auto; ${seeds} seeds a hold)\n`);
console.log('hold        wins  still   blocked  looping  queue  never  time');
const totals = { still: 0, blocked: 0, loop: 0, alive: 0, queue: 0, ticks: 0, never: 0, heroes: 0 };
for (const army of trialArmies().filter((a) => !only || only.includes(a))) {
  const t = { wins: 0, still: 0, blocked: 0, loop: 0, alive: 0, queue: 0, ticks: 0, never: 0, heroes: 0, ms: 0 };
  for (let s = 1; s <= seeds; s++) {
    const m = trialMeta(save, { army, kind, strength: 'expected', heroes: 'design' });
    const input = assaultInput(m, army, mixSeed(s, 0xa55a, army.length), { ...defaultPlan(assaultParty(m)), ...(kind === 'regroup' ? { restorm: true } : {}) });
    input.auto = true;
    const b = startAssault(input);
    const f = b.field!;
    const h = f.hold!;
    const heroes = h.platoons.map((p) => f.byId[p.heroId]);
    const ours = (u: Unit) => u.side === 'hero';
    const chokes = [...h.forts.filter((x) => x.spec.kind !== 'palisade' && x.spec.kind !== 'drum').map((x) => x.spec.front), ...h.bp.approaches.map((a) => a.way[Math.floor(a.way.length / 2)])];
    const engaged = new Set<number>();
    const trail = new Map<number, { u: number; v: number; moved: boolean }[]>();
    const last = new Map<number, number>();
    for (const u of b.units) last.set(u.id, u.v * b.board.w + u.u);
    playAssault(b, [], (_b, ev) => {
      const acted = new Set<number>();
      for (const e of ev as { kind: string; by?: number; to?: number }[]) {
        if ((e.kind === 'swing' || e.kind === 'skill' || e.kind === 'shot') && e.by !== undefined) acted.add(e.by);
        if (e.kind === 'hit' && e.to !== undefined) engaged.add(e.to);
        if ((e.kind === 'swing' || e.kind === 'skill') && e.by !== undefined) engaged.add(e.by);
      }
      const movedNow = new Set<number>();
      for (const u of b.units) {
        const at = u.v * b.board.w + u.u;
        if (last.get(u.id) !== at) movedNow.add(u.id);
        last.set(u.id, at);
      }
      t.ticks++;
      for (const x of heroes) {
        if (!x.alive) continue;
        t.alive++;
        const busy = doing(b, x, movedNow.has(x.id), acted);
        let foeNear = false;
        let inReach = false;
        const def = strikeDef(b, x);
        for (const y of b.units) {
          if (!y.alive || y.side === x.side) continue;
          const d = Math.max(Math.abs(y.u - x.u), Math.abs(y.v - x.v));
          if (d <= NEAR) foeNear = true;
          if (d <= def.range + 1 && canStrike(b.board, def, x, y)) inReach = true;
          if (foeNear && inReach) break;
        }
        if (!busy && foeNear && !inReach) { t.still++; }
        let friends = 0;
        for (let du = -1; du <= 1; du++)
          for (let dv = -1; dv <= 1; dv++) {
            if (!du && !dv) continue;
            const u = x.u + du;
            const v = x.v + dv;
            if (u < 0 || v < 0 || u >= f.w || v >= f.d) continue;
            const o = f.occ[v * f.w + u];
            if (o >= 0 && f.byId[o]?.side === x.side) friends++;
          }
        if (!busy && !inReach && friends >= 3) t.blocked++;
        const tr = trail.get(x.id) ?? [];
        tr.push({ u: x.u, v: x.v, moved: movedNow.has(x.id) });
        if (tr.length > WINDOW) tr.shift();
        trail.set(x.id, tr);
        if (tr.length === WINDOW && !inReach) {
          const steps = tr.filter((p) => p.moved).length;
          if (steps >= 12 && Math.max(Math.abs(tr[0].u - x.u), Math.abs(tr[0].v - x.v)) <= 2) t.loop++;
        }
      }
      // (the queue: ours standing near a chokepoint with no foe in their reach)
      for (const c of chokes)
        for (const u of b.units) {
          if (!u.alive || !ours(u) || Math.max(Math.abs(u.u - c.u), Math.abs(u.v - c.v)) > 4) continue;
          if (doing(b, u, movedNow.has(u.id), acted)) continue;
          const def = strikeDef(b, u);
          let reach = false;
          for (const y of b.units) if (y.alive && y.side !== u.side && Math.max(Math.abs(y.u - u.u), Math.abs(y.v - u.v)) <= def.range + 1) { reach = true; break; }
          if (!reach) t.queue++;
        }
    });
    if (h.outcome === 'won') t.wins++;
    t.ms += b.t;
    t.heroes += heroes.length;
    t.never += heroes.filter((x) => !engaged.has(x.id)).length;
  }
  const time = Math.round(t.ms / seeds / 1000);
  console.log(`${army.padEnd(12)}${`${Math.round((100 * t.wins) / seeds)}%`.padEnd(6)}${pct(t.still, t.alive).padEnd(8)}${pct(t.blocked, t.alive).padEnd(9)}${pct(t.loop, t.alive).padEnd(9)}${(t.queue / t.ticks).toFixed(1).padEnd(7)}${`${t.never}/${t.heroes}`.padEnd(7)}${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`);
  for (const k of ['still', 'blocked', 'loop', 'alive', 'queue', 'ticks', 'never', 'heroes'] as const) totals[k] += t[k];
}
console.log(`${'all'.padEnd(12)}${''.padEnd(6)}${pct(totals.still, totals.alive).padEnd(8)}${pct(totals.blocked, totals.alive).padEnd(9)}${pct(totals.loop, totals.alive).padEnd(9)}${(totals.queue / totals.ticks).toFixed(1).padEnd(7)}${totals.never}/${totals.heroes}`);
