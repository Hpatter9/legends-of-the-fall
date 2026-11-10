// BATTLE-FEEL's yardstick (docs/notes/battle-feel.md): the hero sweep's seeded fights (random five-hero teams on the field bands,
// `tools/heroSweep.ts`) played headless, reading what the win tables do not: how often each skill is cast and how often a cast reached
// nobody, how many foes an area skill reaches, how long the fighters stand waiting, how often they step back and forth, and how long a fight is.
//
//   node tools/battle-feel/audit.mjs <level>:<stage> [...]     GAMES fights a cell (default 600); SKILLS=1 prints every skill's line
//
// A cast "reached nobody" when, from its cast to 1.5 s after its cast time, its caster struck no foe with a skill's hit, healed nobody, and
// laid, shoved, hastened or called up nothing the events show (a buff that shows no event of its own is listed, so read the skill before calling
// it a misfire).

import { canStrike, fight, place, startBattle, stepBattle, strikeDef, WAIT_MS, type BattleEvent, type Unit } from '../../src/sim/battle';
import { FIELD_BANDS } from '../../src/sim/foes';
import { mixSeed, Rng } from '../../src/sim/rng';
import { UNITS } from '../../src/sim/units';
import { isFeared } from '../../src/sim/ailments';
import { formationSpots, setFormations, type Formation } from '../../src/sim/formations';
import { heldBy } from '../../src/sim/tactics';
import { roleOf } from '../../src/sim/suggest';
import { deploySpots, fieldBoost, pickTeam, sweepBoost } from '../heroSweep';

const GAMES = Number(process.env.GAMES ?? 600);
const AFTER_MS = 1500;

interface SkillTally { side: string; casts: number; empty: number; foesHit: number[]; healed: number; dmg: number; tiny: number; hits: number }
interface Open { key: string; by: number; until: number; foes: Set<number>; touched: boolean; healed: number; at: number; dmg: number; tiny: number }

const REACH: BattleEvent['kind'][] = ['shove', 'launch', 'haste', 'song', 'banner', 'terrain', 'zone', 'trap', 'area', 'arc', 'gaze', 'swap', 'blink', 'dash', 'burst', 'look', 'saved', 'immune', 'dodge', 'mark', 'aura', 'revive', 'hazard', 'wisp'];

function cell(level: number, stage: number, print: boolean) {
  const skills = new Map<string, SkillTally>();
  let won = 0;
  const lengths: number[] = [];
  // fighters' time: alive, waiting (WAIT_MS with nothing to do), back-and-forth steps, by role
  const time = new Map<string, { alive: number; wait: number; steps: number; zigzag: number; chaseHit: number }>();
  const roleT = (k: string) => {
    const r = UNITS[k].side === 'hero' ? roleOf(k) : 'foe';
    if (!time.has(r)) time.set(r, { alive: 0, wait: 0, steps: 0, zigzag: 0, chaseHit: 0 });
    return time.get(r)!;
  };
  // where the front line stands: rows from the nearest foe, for front-liners and back-liners, sampled each second
  const waits = new Map<string, number>();
  const formed = { n: 0, held: 0, fw: 0, nw: 0 };
  const backs = new Map<string, number>();
  const gap = new Map<string, { n: number; sum: number }>();
  for (let g = 0; g < GAMES; g++) {
    const seed = g + 1 + 50000;
    const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
    const b = startBattle(seed, FIELD_BANDS[g % FIELD_BANDS.length], fieldBoost(stage));
    const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
    // (FORM=wall|spear|square|skirmish: the team stands in that shape, with the formations on)
    const form = process.env.FORM as Formation | undefined;
    if (form) {
      setFormations(b, true, form);
      formationSpots(b.board, team, form).forEach((at, i) => place(b, team[i], at.u, at.v, undefined, sweepBoost(1, level)));
    } else team.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, sweepBoost(1, level)));
    if (form) formed.n++;
    fight(b);
    if (form && b.formation?.kind === form) formed.held++;
    const open: Open[] = [];
    const trail = new Map<number, number[]>();
    const lastBusy = new Map<number, number>();
    const hitAt = new Map<number, number>();
    const swungAt = new Map<number, number>();
    const hitBy = new Map<number, number>();
    const byId = new Map<number, Unit>();
    while (b.phase === 'fight') {
      const events = stepBattle(b);
      for (const u of b.units) byId.set(u.id, u);
      // (a skill's own hits come in the same tick, before its 'skill' event: open the tick's casts first)
      for (const e of events) {
        if (e.kind === 'skill') {
          const u = byId.get(e.by);
          if (!u) continue;
          const key = `${u.side === 'hero' ? UNITS[u.def].name : 'foe ' + UNITS[u.def].name}: ${e.name}`;
          if (!skills.has(key)) skills.set(key, { side: u.side, casts: 0, empty: 0, foesHit: [], healed: 0, dmg: 0, tiny: 0, hits: 0 });
          open.push({ key, by: u.id, until: b.t + e.ms + AFTER_MS, foes: new Set(), touched: false, healed: 0, at: b.t, dmg: 0, tiny: 0 });
          skills.get(key)!.casts++;
        }
      }
      for (const e of events) {
        if (e.kind === 'skill') continue;
        if (e.kind === 'swing') swungAt.set(e.by, b.t);
        // (a skill's blows mostly carry the 'blow' source: a hit by the caster before it swings again is the skill's)
        if (e.kind === 'hit' && e.src !== 'dot' && e.by !== undefined) for (const o of open) if (o.by === e.by && (swungAt.get(e.by) ?? -1) < o.at && byId.get(e.to)?.side !== byId.get(e.by)?.side) {
          o.foes.add(e.to);
          o.dmg += e.dmg;
          if (e.dmg <= 2) o.tiny++;
        }
        if (e.kind === 'hit') {
          hitAt.set(e.to, b.t);
          if (e.by !== undefined) hitBy.set(e.to, e.by);
        }
        if (e.kind === 'heal' && e.by !== undefined && e.amount > 0) for (const o of open) if (o.by === e.by) o.healed += e.amount;
        const who = (e as { by?: number }).by;
        if (REACH.includes(e.kind)) for (const o of open) if (who === undefined || o.by === who) o.touched = true;
      }
      // settle the casts whose window has closed
      for (let i = open.length - 1; i >= 0; i--) {
        const o = open[i];
        if (b.t < o.until && b.phase === 'fight') continue;
        const s = skills.get(o.key)!;
        if (!o.foes.size && !o.healed && !o.touched) s.empty++;
        if (o.foes.size) s.foesHit.push(o.foes.size);
        s.healed += o.healed;
        s.dmg += o.dmg;
        s.tiny += o.tiny;
        s.hits += o.foes.size;
        open.splice(i, 1);
      }
      // the fighters' time
      const heroes = b.units.filter((x) => x.alive && x.side === 'hero');
      const foes = b.units.filter((x) => x.alive && x.side === 'foe');
      for (const u of b.units) {
        if (!u.alive) continue;
        const t = roleT(u.def);
        t.alive += 100;
        const prev = lastBusy.get(u.id);
        if (u.busyUntil !== prev) {
          lastBusy.set(u.id, u.busyUntil);
          if (u.busyUntil - b.t === WAIT_MS && !u.cast && !(u.swing && u.swing.at === b.t) && !(u.step && u.step.at === b.t)) {
            t.wait += WAIT_MS;
            // (why it waits: a foe it could strike, the way to every foe blocked, or held back by its tactic)
            const def = strikeDef(b, u);
            const them = b.units.filter((x) => x.alive && x.side !== u.side);
            const why = them.some((f) => canStrike(b.board, def, u, f)) ? 'a foe in reach' : b.tactic && heldBy(b, u) ? 'held by the tactic' : 'no way to a foe';
            const k = `${u.side === 'hero' ? roleOf(u.def) : 'foe'}: ${why}`;
            waits.set(k, (waits.get(k) ?? 0) + 1);
            if (process.env.WAITS && why === 'no way to a foe' && u.side === 'hero' && waits.get(k)! % 150 === 1) console.log(`    waits: seed ${seed} t ${b.t} ${u.def} at ${u.u},${u.v}`);
          }
          if (u.step && u.step.at === b.t) {
            t.steps++;
            const tr = trail.get(u.id) ?? [];
            const here = u.v * b.board.w + u.u;
            if (tr.length >= 2 && tr[tr.length - 2] === here) t.zigzag++;
            // (it walked off while a foe had just struck it, and no foe stood within its reach: a chase while being hit)
            if ((hitAt.get(u.id) ?? -1e9) >= b.t - 600) {
              t.chaseHit++;
              // (turned its back: a melee foe beside it struck it, it could strike back from where it stood, and it walked off out of that foe's reach)
              const a = byId.get(hitBy.get(u.id) ?? -1);
              const from = { u: u.step.u, v: u.step.v };
              if (a && a.alive && a.side !== u.side && !(u.cast && u.cast.at === b.t) && !isFeared(b, u) && !(u.taunt && u.taunt.until > b.t) && !strikeDef(b, a).shot && Math.abs(a.u - from.u) + Math.abs(a.v - from.v) === 1 && Math.abs(a.u - u.u) + Math.abs(a.v - u.v) > 1 && canStrike(b.board, strikeDef(b, u), from, a)) {
                const why = `${u.side === 'hero' ? roleOf(u.def) : 'foe'} ${strikeDef(b, u).shot ? 'shooter' : 'melee'}`;
                backs.set(why, (backs.get(why) ?? 0) + 1);
                if (process.env.BACKS && backs.get(why)! <= 3) console.log(`    back turned: seed ${seed} t ${b.t} ${u.side} ${u.def} from ${from.u},${from.v} to ${u.u},${u.v}, struck by ${a.def} at ${a.u},${a.v}`);
              }
            }
            tr.push(here);
            if (tr.length > 4) tr.shift();
            trail.set(u.id, tr);
          }
        }
      }
      if (b.t % 1000 === 0 && foes.length) {
        for (const h of heroes) {
          const r = roleOf(h.def);
          const d = Math.min(...foes.map((f) => Math.abs(f.u - h.u) + Math.abs(f.v - h.v)));
          const gg = gap.get(r) ?? { n: 0, sum: 0 };
          gg.n++;
          gg.sum += d;
          gap.set(r, gg);
        }
      }
    }
    if (b.phase === 'won') won++;
    if (form) {
      const f = b.formation?.kind === form;
      formed[f ? 'fw' : 'nw'] += b.phase === 'won' ? 1 : 0;
    }
    lengths.push(b.t);
  }
  lengths.sort((a, c) => a - c);
  const q = (p: number) => (lengths[Math.floor(p * (lengths.length - 1))] / 1000).toFixed(1);
  if (formed.n) console.log(`\n(formation ${process.env.FORM}: read as that shape in ${formed.held} of ${formed.n} fights; won ${formed.fw} of those, ${formed.nw} of the rest)`);
  console.log(`\n== level ${level}, stage ${stage}: ${GAMES} fights, won ${((100 * won) / GAMES).toFixed(1)}%, fight length s: p10 ${q(0.1)}, median ${q(0.5)}, p90 ${q(0.9)}`);
  for (const [r, t] of time) console.log(`  ${r.padEnd(8)} waiting ${((100 * t.wait) / t.alive).toFixed(1)}% of its time; steps ${((t.steps * 60000) / t.alive).toFixed(1)}/min, back-and-forth ${((100 * t.zigzag) / Math.max(1, t.steps)).toFixed(1)}% of steps, walked off when just struck ${((100 * t.chaseHit) / Math.max(1, t.steps)).toFixed(1)}%`);
  console.log('  why they wait: ' + [...waits.entries()].sort((a, c) => c[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', '));
  console.log('  turned its back on a melee foe striking it: ' + [...backs.entries()].map(([k, n]) => `${k} ${n}`).join(', '));
  for (const [r, gg] of gap) console.log(`  ${r.padEnd(8)} mean tiles to the nearest foe ${(gg.sum / gg.n).toFixed(2)}`);
  const rows = [...skills.entries()].filter(([, s]) => s.side === 'hero').sort((a, c) => c[1].empty / c[1].casts - a[1].empty / a[1].casts);
  const total = rows.reduce((a, [, s]) => a + s.casts, 0);
  const empty = rows.reduce((a, [, s]) => a + s.empty, 0);
  console.log(`  hero casts ${total}, reached nobody ${((100 * empty) / total).toFixed(1)}%`);
  for (const [k, s] of print ? rows : rows.slice(0, 25)) {
    const area = s.foesHit.length ? (s.foesHit.reduce((a, c) => a + c, 0) / s.foesHit.length).toFixed(2) : '-';
    console.log(`    ${k.padEnd(48)} casts ${String(s.casts).padStart(5)}  nobody ${((100 * s.empty) / s.casts).toFixed(0).padStart(3)}%  foes a cast ${area}  dmg a cast ${(s.dmg / s.casts).toFixed(0)}  heal a cast ${(s.healed / s.casts).toFixed(0)}  hits of 2 or less ${s.tiny}`);
  }
}

for (const a of process.argv.slice(2).filter((x) => x.includes(':'))) {
  const [level, stage] = a.split(':').map(Number);
  cell(level, stage, process.env.SKILLS === '1');
}
