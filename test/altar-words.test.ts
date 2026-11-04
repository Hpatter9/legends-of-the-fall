// ALTAR-CLEAR: the altar's words come from the rules' numbers, and the fight does what the words say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, place, type BattleEvent } from '../src/sim/battle';
import { localBoost, hireHero } from '../src/sim/climb';
import { startedMeta } from '../src/sim/meta';
import { calamityRun } from '../src/sim/modes';
import { startStage } from '../src/sim/run';
import { chooseAltar, COMMANDMENTS, corruptionText, growStarter, OFFERINGS, PATRONS, pendingAltar } from '../src/sim/rift';
import { tickRift } from '../src/sim/riftBattle';
import { UNITS } from '../src/sim/units';
import { COMMAND_MULT, CORRUPT, EVOLUTION, OFFERING_MULT, PATRON_PULSE, PULSE } from '../src/sim/altarRules';
import {
  altarButtonLine, altarSummary, BLOCKED_LINE, commandmentLine, corruptionLines, evolutionLine, HOW_ALTAR_WORKS, nextLine, offeringLine, patronGrowth,
  patronLine, pulseAmount, sealChoices, sealOf, stepLabel, untilPulse,
} from '../src/sim/altarWords';
import { frontSpots } from '../tools/autoplay';

const fresh = () => calamityRun(14, startedMeta(1), 'knight');
function field(patron: string, ally = false, corrupt = false) {
  const run = fresh();
  growStarter(run);
  assert.equal(chooseAltar(run, patron, corrupt), true);
  if (ally) hireHero(run, 'paladin', 0);
  run.tower!.cur = { id: 0, kind: 'boss', fight: { band: ['calBoss1'], stage: { foes: { hp: 2, atk: 0.1 } } } };
  const b = startStage(run);
  const spots = frontSpots(b);
  run.roster.forEach((h, i) => assert.equal(place(b, h.kind, spots[i][0], spots[i][1], h.id, localBoost(h)), true));
  assert.equal(fight(b), true);
  return { run, b, starter: b.units.find((x) => x.tag === run.rift!.starter)! };
}

test('the words carry the rules’ own numbers', () => {
  assert.equal(pulseAmount('ember', 1), PATRON_PULSE.ember.base);
  assert.equal(pulseAmount('ember', 3), PATRON_PULSE.ember.base + 2 * PATRON_PULSE.ember.per);
  assert.match(patronLine('ember', 1), new RegExp(`Every ${PULSE.everyMs / 1000} s .* nearest foe.* ${Math.round(PATRON_PULSE.ember.base * 100)}% of their attack`));
  assert.match(patronLine('bastion', 2), new RegExp(`within ${PULSE.reach} tiles .* ${Math.round((PATRON_PULSE.bastion.base + PATRON_PULSE.bastion.per) * 100)}% of their own maximum health`));
  assert.match(patronLine('echo', 3), new RegExp(`${PATRON_PULSE.echo.base + 2 * PATRON_PULSE.echo.per} skill charge`));
  assert.equal(patronGrowth('ember', 1), 'Grows to 60% at evolution 2 and 75% at evolution 3.');
  assert.match(patronGrowth('echo', 3), /Fully grown/);
  assert.equal(offeringLine('vitality'), 'Your starter: +35% maximum health, −10% damage, for the rest of the run.');
  assert.equal(offeringLine('fury'), 'Your starter: −15% maximum health, +35% damage, for the rest of the run.');
  assert.ok(offeringLine('fury').includes(`+${Math.round((OFFERING_MULT.fury.dmg - 1) * 100)}%`));
  assert.match(commandmentLine('together', 'ember', 3), /50% stronger while at least one ally .* Ember: 75% becomes 113%/);
  assert.match(commandmentLine('solitude', 'echo', 2), /75% stronger while no ally .* Echo: 16 becomes 28/);
  assert.equal(evolutionLine(2), `Your starter evolves (2 of 3): +30% health and +40% attack in fights, and at least level ${EVOLUTION.levels[2]}.`);
  assert.deepEqual(corruptionLines(0), []);
  const two = corruptionLines(2, 'echo').join(' ');
  for (const bit of ['+30% attack', '+20% gold', '+16% health and +12% attack', 'every 8 s', 'warned 1 s', '6% of their maximum health', 'drains 16 skill charge']) assert.ok(two.includes(bit), bit);
  // (the old tables' words are built from the same constants, and say the same as before)
  assert.equal(PATRONS.ember.text, 'Every 4 seconds, your starter burns the nearest foe for 45% of their attack. Each evolution adds 15%.');
  assert.equal(OFFERINGS.vitality.text, 'Your starter gains 35% maximum health, but deals 10% less damage.');
  assert.equal(COMMANDMENTS.solitude.text, 'Altar pulses are 75% stronger while no ally stands within 2 tiles of your starter.');
  assert.equal(corruptionText(3), 'Corruption 3: enemies gain 24% health and 18% attack. Bosses pulse every 8 seconds for 9% of each hero\'s maximum health. Combat gold +30%.');
  assert.equal(HOW_ALTAR_WORKS.length, 5);
  assert.match(HOW_ALTAR_WORKS[3], /\+15% starter attack and \+10% gold, but foes get \+8% health and \+6% attack/);
});

test('consecrate and corrupt are set out side by side, with the patron’s own extra cost', () => {
  const r = fresh().rift!;
  const first = sealChoices(r, 'patron', 'bastion');
  assert.deepEqual(first.consecrate.costs, ['Nothing']);
  assert.deepEqual(first.corrupt.gains, ['Starter +15% attack', '+10% gold from won fights']);
  assert.equal(first.corrupt.costs[0], 'Foes +8% health, +6% attack');
  assert.match(first.corrupt.costs[1], /Guardians pulse every 8 s for 3% .*shields the guardian \(4% of its health\)/);
  r.corruption = 1;
  r.patron = 'echo';
  assert.match(sealChoices(r, 'offering').corrupt.costs[1], /3% → 6% .*drains 16 skill charge/);
  assert.equal(stepLabel('offering'), 'Altar 2 of 3 · Offering');
  assert.match(nextLine('patron'), /Altar 2 of 3 · Offering, after you beat the first guardian/);
  assert.match(nextLine('commandment'), /last altar step/);
  assert.match(BLOCKED_LINE, /until you choose/);
});

test('the summary tells each step, its seal and the starter; old saves without the seal list are told honestly', () => {
  const run = fresh();
  assert.equal(altarButtonLine(run.rift!), 'Altar · wakes after your first victory');
  growStarter(run);
  assert.equal(altarButtonLine(run.rift!, pendingAltar(run)), 'Altar 1 of 3 · choose now');
  chooseAltar(run, 'ember', true);
  run.tower!.bosses = 1;
  chooseAltar(run, 'vitality');
  const s = altarSummary(run)!;
  assert.equal(s.rank, 2);
  assert.deepEqual(s.starter, { level: EVOLUTION.levels[2], tier: run.roster[0].grade });
  assert.deepEqual(s.rows.map((x) => [x.chosen, x.seal]), [['Ember', 'corrupted'], ['Vital Offering', 'consecrated'], [undefined, undefined]]);
  assert.match(s.rows[0].lines[0], /60% of their attack/);
  assert.match(s.rows[2].lines[0], /after you beat the second guardian/);
  assert.equal(s.corruptionLines.length, 3);
  assert.deepEqual(run.rift!.corrupted, ['patron']);
  // (a save from before the seals were kept: all corrupted, none, or not known)
  delete run.rift!.corrupted;
  assert.equal(sealOf(run.rift!, 'patron'), 'unknown');
  run.rift!.corruption = 2;
  assert.equal(sealOf(run.rift!, 'offering'), 'corrupted');
  run.rift!.corruption = 0;
  assert.equal(sealOf(run.rift!, 'offering'), 'consecrated');
});

test('Ember burns for the share of attack its words name, on the beat the battle clock says', () => {
  const { b, starter } = field('ember');
  const foe = b.units.find((x) => x.side === 'foe')!;
  foe.shield = undefined;
  const hp = foe.hp;
  const out: BattleEvent[] = [];
  b.t = PULSE.everyMs - 100;
  assert.equal(untilPulse(b.t), 100);
  tickRift(b, out);
  assert.equal(out.length, 0);
  b.t = PULSE.everyMs;
  tickRift(b, out);
  assert.ok(out.some((e) => e.kind === 'skill' && e.name === 'Ember altar'));
  const words = patronLine('ember', 1);
  const share = Number(/for (\d+)% of their attack/.exec(words)![1]) / 100;
  assert.equal(hp - foe.hp, Math.round((starter.power ?? 1) * share * UNITS[starter.def].atk));
});

test('Bastion and Echo give what their words name; a commandment multiplies by its stated share', () => {
  const bastion = field('bastion', true);
  bastion.b.t = PULSE.everyMs;
  tickRift(bastion.b, []);
  const share = Number(/worth (\d+)%/.exec(patronLine('bastion', 1))![1]) / 100;
  assert.equal(bastion.starter.shield!.hp, Math.round(bastion.starter.maxHp * share));
  assert.equal(bastion.starter.shield!.until, PULSE.everyMs + PULSE.shieldMs);
  const echo = field('echo');
  echo.b.rift!.commandment = 'solitude';
  echo.starter.charge = 0;
  echo.b.t = PULSE.everyMs;
  tickRift(echo.b, []);
  const said = Number(/becomes (\d+)/.exec(commandmentLine('solitude', 'echo', 2))![1]);
  assert.equal(echo.starter.charge, said);
  assert.equal(said, pulseAmount('echo', 2) * COMMAND_MULT.solitude);
});

test('corruption’s stated costs are what a corrupted fight does', () => {
  const safe = field('ember');
  const risky = field('ember', false, true);
  const sf = safe.b.units.find((x) => x.side === 'foe')!, rf = risky.b.units.find((x) => x.side === 'foe')!;
  assert.equal(rf.maxHp, Math.round(sf.maxHp * (1 + CORRUPT.foeHp)));
  assert.ok(Math.abs(rf.power! / sf.power! - (1 + CORRUPT.foeAtk)) < 1e-9);
  assert.ok(corruptionLines(1)[1].includes(`+${CORRUPT.foeHp * 100}% health`));
  risky.starter.shield = undefined;
  const hp = risky.starter.hp;
  risky.b.t = CORRUPT.boss.everyMs;
  tickRift(risky.b, []);
  const share = Number(/for (\d+)% of their maximum health/.exec(corruptionLines(1)[2])![1]) / 100;
  // (the Ember pulse fires on the same beat, but hits the foe, not the starter)
  assert.equal(hp - risky.starter.hp, Math.max(1, Math.round(risky.starter.maxHp * share)));
  const warn: BattleEvent[] = [];
  risky.b.t = CORRUPT.boss.everyMs * 2 - CORRUPT.boss.warnMs;
  tickRift(risky.b, warn);
  assert.ok(warn.some((e) => e.kind === 'skill' && e.name === 'Calamity pulse'));
});
