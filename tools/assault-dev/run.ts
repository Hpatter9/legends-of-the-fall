// ASSAULT-DEV (`docs/notes/assault-dev.md`): every storming the developer's Try an Assault offers, started as the dev entry starts it
// (`trialMeta`, then the muster's default plan, `assaultInput`, `startAssault`) and played out by Auto to its end, then settled on the throwaway
// copy (`settleAssault`). It reports each one's win or loss and its length, and checks the save it was copied from is unchanged. A first
// balance read: a storming Auto never wins is flagged "unwinnable?", one it wins with little lost "trivial?".
//
//   node tools/assault-dev/run.mjs [--strength expected|strong|weak] [--heroes design|recruits] [--seeds 1] [--only orcs,undead] [--kinds hold,last,regroup] [--tactical]
import { startedMeta } from '../../src/sim/meta';
import { mixSeed } from '../../src/sim/rng';
import { assaultInput, assaultParty, defaultPlan, settleAssault } from '../../src/sim/assault/assaultMode';
import { assaultScore, playAssault, startAssault } from '../../src/sim/assault/assault';
import { fullCastle, forceLine, trialArmies, trialMeta, type TrialHeroes, type TrialKind, type TrialStrength } from '../../src/sim/assault/devTrial';

const flag = (name: string): string | undefined => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const strength = (flag('--strength') ?? 'expected') as TrialStrength;
const heroes = (flag('--heroes') ?? 'design') as TrialHeroes;
const seeds = Number(flag('--seeds') ?? 1);
const only = flag('--only')?.split(',');
const kinds = (flag('--kinds')?.split(',') ?? ['hold', 'last', 'regroup']) as TrialKind[];
const tactical = process.argv.includes('--tactical');
// (ablations, for the balance read: what each part of the force is worth; `--bare` is all three, the hold balance's own party)
const bare = process.argv.includes('--bare');
const noTalents = bare || process.argv.includes('--no-talents');
const noSkills = bare || process.argv.includes('--no-skills');
const rankFlag = bare ? 0 : flag('--rank') !== undefined ? Number(flag('--rank')) : undefined;
const maxCastle = process.argv.includes('--max-castle');

const save = startedMeta(20261114);
const before = JSON.stringify(save);
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
console.log(`\nTRY AN ASSAULT: every storming at "${strength}"${bare ? ' (BARE: rank 0, no talents, skills at Level 1)' : `${noTalents ? ', no talents' : ''}${noSkills ? ', skills at Level 1' : ''}${rankFlag !== undefined ? `, rank ${rankFlag}` : ''}`}${maxCastle ? ', a full castle' : ''}, the ${heroes} party, ${tactical ? 'Tactical (every platoon over the Old Bridge)' : 'Auto (the muster\'s default plan)'}; ${seeds} seed${seeds === 1 ? '' : 's'} each\n`);
console.log('hold              kind      force                                              wins   host lost  length (each)          flag');
const flags: string[] = [];
for (const army of trialArmies().filter((a) => !only || only.includes(a)))
  for (const kind of kinds) {
    let wins = 0;
    let lost = 0;
    const lens: string[] = [];
    let ended = 0;
    for (let s = 1; s <= seeds; s++) {
      const m = trialMeta(save, { army, kind, strength, heroes });
      const party = assaultParty(m);
      for (const k of party) {
        if (noTalents && m.talents) delete m.talents[k];
        if (noSkills && m.skillUse) delete m.skillUse[k];
        if (rankFlag !== undefined) {
          m.ranked![k] = Math.min(4, rankFlag);
          m.shards[k] = rankFlag ? [1, 3, 6, 10][Math.min(4, rankFlag) - 1] : 0;
          if (rankFlag > 4) m.awakened![k] = rankFlag - 4;
          else delete m.awakened?.[k];
        }
      }
      if (maxCastle) m.castle = { ...m.castle, ...fullCastle() };
      const plan = tactical ? { approaches: Object.fromEntries(party.map((k) => [k, 'bridge' as const])) } : defaultPlan(party);
      const input = assaultInput(m, army, mixSeed(s, 0xa55a, army.length), { ...plan, ...(kind === 'regroup' ? { restorm: true } : {}) });
      input.auto = true;
      input.tactical = tactical;
      const b = startAssault(input);
      playAssault(b);
      const sc = assaultScore(b);
      const r = settleAssault(m, b, 1);
      if (r.won) wins++;
      if (r.warEnded) ended++;
      lost += sc.platoons.reduce((n, p) => n + (10 - p.soldiers), 0);
      lens.push(`${r.won ? 'W' : 'L'} ${mmss(b.t)}`);
    }
    const lostPct = Math.round((100 * lost) / (50 * seeds));
    const winPct = Math.round((100 * wins) / seeds);
    const flag = wins === 0 ? 'unwinnable?' : winPct === 100 && lostPct < 20 ? 'trivial?' : '';
    if (flag) flags.push(`${army} ${kind}: ${flag}`);
    console.log(`${army.padEnd(18)}${kind.padEnd(10)}${forceLine(army, kind, strength).padEnd(51)}${`${winPct}%`.padEnd(7)}${`${lostPct}%`.padEnd(11)}${lens.join(', ').padEnd(23)}${flag}${kind === 'last' && ended ? `  (the War ended ${ended}x)` : ''}`);
  }
console.log(`\nthe save copied from: ${JSON.stringify(save) === before ? 'unchanged' : 'CHANGED'}`);
if (flags.length) console.log(`flagged: ${flags.join('; ')}`);
