// Re-records the two identity fixtures (`test/fixtures/spells-identity.json`, `test/fixtures/ailment-logs.json`) by the tests' own
// computation and put-back strengths (`test/spells-identity.test.ts`, `test/ailments-identical.test.ts`), and prints which scenarios moved.
// For a batch that moves fights on purpose; say which in the tests' headers.
import { readFileSync, writeFileSync } from 'node:fs';
import { identityHashes } from '../spells/identity';
import { scenarioHashes } from '../status-fx/logs';
import { BOSS_BIG } from '../../src/sim/bossAttacks';
import { ARMIES, armyById } from '../../src/sim/armies';
import { CAL_SCALE } from '../../src/sim/calamity';
import { AILMENT_SWITCH } from '../../src/sim/ailments';
import { DAILY_ANSWER } from '../../src/sim/modes';
import { KITS } from '../../src/sim/abilities';

const write = process.argv.includes('--write');
const diff = (file: string, now: Record<string, string>) => {
  const was = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
  console.log(file, Object.keys(now).map((k) => `${k} ${now[k]}${was[k] === now[k] ? ' (kept)' : ''}`).join(', '));
  if (write) writeFileSync(file, JSON.stringify(now, null, 2) + '\n');
};

// (spells-identity: the armies' and the Calamity's recorded strengths, the bosses' signatures off)
{
  const RECORDED_START: Record<string, number> = { undead: 1.48, infernal: 12.5, yokai: 14.2, golems: 14.6 };
  const was = Object.fromEntries(Object.keys(RECORDED_START).map((id) => [id, armyById(id)!.start]));
  const calStart = CAL_SCALE.start;
  for (const [id, v] of Object.entries(RECORDED_START)) (armyById(id) as unknown as { start: number }).start = v;
  CAL_SCALE.start = 0.435;
  BOSS_BIG.on = false;
  const now = identityHashes();
  BOSS_BIG.on = true;
  for (const [id, v] of Object.entries(was)) (armyById(id) as unknown as { start: number }).start = v;
  CAL_SCALE.start = calStart;
  diff('test/fixtures/spells-identity.json', now);
}
// (ailments-identical: the ailments and the signatures off, the strengths it records put back)
{
  type Strength = { start: number; mid?: { hp: number; atk: number }; last?: { hp: number; atk: number } };
  const infernal = ARMIES.find((a) => a.id === 'infernal') as unknown as { start: number };
  const yokai = ARMIES.find((a) => a.id === 'yokai') as unknown as Strength;
  const golems = ARMIES.find((a) => a.id === 'golems') as unknown as Strength;
  const undead = ARMIES.find((a) => a.id === 'undead') as unknown as { start: number };
  const plague = KITS.shambler.ultimate!.tuned!;
  AILMENT_SWITCH.on = false;
  infernal.start = 10;
  Object.assign(yokai, { start: 12.5, mid: { hp: 2200, atk: 52 }, last: { hp: 2500, atk: 50 } });
  golems.start = 12.7;
  undead.start = 1.48;
  CAL_SCALE.start = 0.435;
  CAL_SCALE.bossHp = 1;
  DAILY_ANSWER.ult = 0.17;
  plague.power = 0.99;
  BOSS_BIG.on = false;
  diff('test/fixtures/ailment-logs.json', scenarioHashes());
}
