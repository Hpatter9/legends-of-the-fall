// QUEST-POSSIBLE (docs/notes/quest-possible.md): the quest audit in the suite. Every quest, Eidolon chain part, campaign and patron quest is
// checked against the game as it stands (`tools/quest-audit/rules.ts`): a goal that cannot be done fails here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditQuests } from '../tools/quest-audit/rules';
import { QUESTS } from '../src/sim/questData';
import { CHAINS } from '../src/sim/eidolonChainData';

test('every quest and chain part can be done as the game stands (or waits with the hidden modes)', () => {
  const rows = auditQuests();
  assert.equal(rows.length, QUESTS.length + CHAINS.reduce((n, c) => n + c.parts.length, 0), 'every one checked');
  const broken = rows.filter((r) => r.state === 'broken').map((r) => `${r.id}: ${r.why.join('; ')}`);
  assert.deepEqual(broken, []);
});

test('no quest is left waiting on a spell or a level it is offered before (the calls answered)', () => {
  const calls = auditQuests().filter((r) => r.state === 'call').map((r) => `${r.id}: ${r.why.join('; ')}`);
  assert.deepEqual(calls, []);
});
