// The Legend Oath's pay against its risk (Dynasties, phase 7; the design's section 8: "crowns a day, Oath against no Oath, under 1.3× for
// the bot (which loses heroes)"; docs/notes/dynasty-7.md). The greedy bot of `tools/autoplay.ts` plays a save's army runs for 14 days,
// RUNS a day, each army in ONLY in turn, at a level and tier, once with no Oath and once with every run sworn. Under the Oath every wave is
// settled as the page settles it (`settleOath`): a hero slain leaves the run, its House mourns three days (it marches with no army run
// until then: `armyParty`), and a foundling takes up the mantle after. Crowns are the waves' pay (`settleWave`, ×`OATH.PAY` under the Oath). The
// bot fights without hearts, as every figure in the notes, so a lost wave ends the run (and slays its fallen under the Oath).
//
//   node tools/dynasty/oathPay.mjs [--saves 6] [--runs 4] [--cells 60:1,65:2,90:3] [--only orcs,undead,beasts]
import { ARMIES, armyById, settleWave } from '../../src/sim/armies';
import { fight, playOut } from '../../src/sim/battle';
import { newCastle } from '../../src/sim/castle';
import { openDynasty } from '../../src/sim/dynasty';
import { armyParty, oathPay, settleMourning, settleOath } from '../../src/sim/oath';
import { armyRun, finish, isBossRun, noteFight, startStage, type Run } from '../../src/sim/run';
import { autoDeploy, autoRound } from '../../src/sim/autoplay';
import { ratingOf } from '../../src/sim/stars';
import { savedAt } from '../autoplay';
import type { Meta } from '../../src/sim/meta';

const arg = (k: string, d: string): string => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const SAVES = Number(arg('--saves', '6'));
const RUNS = Number(arg('--runs', '4'));
const DAYS = 14;
const CELLS = arg('--cells', '60:1,65:2,90:3').split(',').map((c) => c.split(':').map(Number) as [number, number]);
const ONLY = arg('--only', 'orcs,undead,beasts').split(',');
const PARTY = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 2);
const dayKey = (n: number): number => {
  const d = new Date(T0 + n * DAY);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};

/** One army run as the greedy bot: the crowns it paid, its heroes slain, and whether it was cleared. */
function playRun(m: Meta, army: string, seed: number, tier: number, oath: boolean, day: number): { crowns: number; slain: number; cleared: boolean } {
  const party = armyParty(m, dayKey(day));
  const run: Run = armyRun(seed, army, party.length ? party : m.party, m.castle ?? newCastle(), tier);
  if (oath) run.oath = true;
  let crowns = 0;
  let slain = 0;
  const a = armyById(army)!;
  while (!run.over) {
    autoRound(run, m, true);
    if (!run.squad.length) break;
    const b = startStage(run);
    autoDeploy(b, run, m);
    fight(b);
    playOut(b);
    const ok = b.phase === 'won';
    const stage = run.stage;
    noteFight(run, b);
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    const pay = settleWave(m, a.id, stage, ok, ratingOf(b, isBossRun(run)).stars, tier);
    crowns += Math.round(pay.crowns * oathPay(run));
    if (oath) slain += settleOath(m, run, b, ok, { now: T0 + day * DAY, day: dayKey(day) })?.slain.length ?? 0;
  }
  return { crowns, slain, cleared: !!run.cleared };
}

console.log(`The Legend Oath's pay: ${SAVES} saves, ${RUNS} runs a day for ${DAYS} days, armies ${ONLY.join(', ')}; crowns a day, no Oath against the Oath`);
console.log('| Level · tier | no Oath: crowns/day | clears/day | Oath: crowns/day | clears/day | slain/day | ratio |');
console.log('|---|---|---|---|---|---|---|');
for (const [level, tier] of CELLS) {
  const tot = { free: 0, freeC: 0, oath: 0, oathC: 0, slain: 0 };
  for (let s = 0; s < SAVES; s++) {
    for (const oath of [false, true]) {
      const m = savedAt(level, PARTY, 100 + s);
      m.unlocked = [...PARTY];
      m.party = [...PARTY];
      openDynasty(m, dayKey(0));
      // (the Oath is open: one House has passed its mantle; it is not a fight's matter)
      m.dynasty!.lines.knight.bearers.push({ name: 'Ama', gen: 2, served: 0 });
      m.dynasty!.lines.knight.current = 1;
      for (let day = 0; day < DAYS; day++) {
        settleMourning(m, T0 + day * DAY, dayKey(day));
        for (let r = 0; r < RUNS; r++) {
          const army = ONLY[(day * RUNS + r) % ONLY.length];
          if (!ARMIES.some((x) => x.id === army)) continue;
          const out = playRun(m, army, 1000 * s + 10 * day + r + 1, tier, oath, day);
          if (oath) (tot.oath += out.crowns), (tot.oathC += Number(out.cleared)), (tot.slain += out.slain);
          else (tot.free += out.crowns), (tot.freeC += Number(out.cleared));
        }
      }
    }
  }
  const per = (x: number): string => (x / (SAVES * DAYS)).toFixed(1);
  console.log(`| ${level} · ${['Normal', 'Hard', 'Elite', 'Legendary', 'Mythic'][tier]} | ${per(tot.free)} | ${per(tot.freeC)} | ${per(tot.oath)} | ${per(tot.oathC)} | ${per(tot.slain)} | ${(tot.oath / Math.max(1, tot.free)).toFixed(2)}× |`);
}
