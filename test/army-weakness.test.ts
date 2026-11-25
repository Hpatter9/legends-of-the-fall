// ARMY-WEAKNESS (docs/notes/army-weakness.md): every army is weak to one or two hero classes and resists one or two.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, hurt, startBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { ARMIES } from '../src/sim/armies';
import { ARMY_MATCH, ARMY_WEAKNESS, classOf, fightMatch, matchMult, matchOf, matchScore, RESIST_MULT, teamMatch, WEAK_MULT } from '../src/sim/armyWeakness';
import { TRAITS } from '../src/sim/traits';
import { FIXED_PACKS } from '../src/sim/starter';
import { armyRun, startStage } from '../src/sim/run';

const CLASSES = Object.values(TRAITS).filter((t) => t.kind === 'class').map((t) => t.id);

test('every army has one or two weaknesses and one or two resistances, all classes, none both', () => {
  assert.equal(CLASSES.length, 13);
  for (const a of ARMIES) {
    const m = ARMY_MATCH[a.id];
    assert.ok(m, `${a.id} has its match`);
    assert.ok(m.weak.length >= 1 && m.weak.length <= 2, `${a.id} weak`);
    assert.ok(m.resist.length >= 1 && m.resist.length <= 2, `${a.id} resist`);
    for (const c of [...m.weak, ...m.resist]) assert.ok(CLASSES.includes(c), `${a.id}: ${c} is a class`);
    assert.ok(!m.weak.some((c) => m.resist.includes(c)), `${a.id}: no class both`);
    assert.ok(m.why.length > 20);
  }
});

test('every class is some army’s weakness, so every hero is wanted somewhere', () => {
  const weak = new Set(Object.values(ARMY_MATCH).flatMap((m) => m.weak));
  for (const c of CLASSES) assert.ok(weak.has(c), `${c} is a weakness somewhere`);
});

test('the first two armies’ weaknesses are covered by either starter pack', () => {
  for (const id of ['orcs', 'undead'])
    for (const p of FIXED_PACKS) assert.ok(p.heroes.some((k) => matchOf(id, k) === 'weak'), `${p.id} has a hero for the ${id}`);
});

test('a hero’s match is read from its class', () => {
  assert.equal(classOf('wizard'), 'caster');
  assert.equal(matchOf('golems', 'wizard'), 'weak');
  assert.equal(matchOf('golems', 'samurai'), 'resist');
  assert.equal(matchOf('golems', 'knight'), undefined);
  assert.equal(matchOf(undefined, 'wizard'), undefined);
  assert.equal(matchOf('nowhere', 'wizard'), undefined);
  assert.equal(matchMult('weak'), WEAK_MULT);
  assert.equal(matchMult('resist'), RESIST_MULT);
  assert.equal(matchMult(undefined), 1);
  assert.deepEqual(teamMatch('golems', ['wizard', 'samurai', 'knight']), { weak: ['wizard'], resist: ['samurai'] });
  assert.deepEqual(['wizard', 'samurai', 'knight'].map((k) => matchScore('golems', k)), [1, -1, 0]);
});

/** One blow of `dmg` from each hero on the same foe, in a fight of the army (or of none); the harm each dealt and the hit events. */
function blows(army: string | undefined, kinds: string[], dmg = 200, duel = false): { dealt: number[]; hits: BattleEvent[] } {
  const b: Battle = bareBoard(startBattle(7, 'skeletons', army ? { foeArmy: army } : {}));
  if (duel) (b as { duel?: unknown }).duel = { r: 3 };
  const foe = b.units.find((u) => u.side === 'foe')!;
  foe.maxHp = foe.hp = 100_000;
  const dealt: number[] = [];
  const hits: BattleEvent[] = [];
  kinds.forEach((k, i) => {
    const h = addUnit(b, k, i, 0);
    const before = foe.hp;
    hurt(b, h, foe, dmg, false, false, hits, 'skill');
    dealt.push(before - foe.hp);
  });
  return { dealt, hits: hits.filter((e) => e.kind === 'hit') };
}

test('the army’s foes take more from a class it is weak to, less from one it resists', () => {
  const plain = blows(undefined, ['wizard', 'samurai', 'knight']).dealt;
  const { dealt, hits } = blows('golems', ['wizard', 'samurai', 'knight']);
  assert.equal(dealt[0], Math.round(plain[0] * WEAK_MULT));
  assert.equal(dealt[1], Math.round(plain[1] * RESIST_MULT));
  assert.equal(dealt[2], plain[2]);
  assert.deepEqual(hits.map((e) => (e as { match?: string }).match), ['weak', 'resist', undefined]);
});

test('the switch off, and a duel, leave every blow as it was', () => {
  const plain = blows(undefined, ['wizard', 'samurai']).dealt;
  ARMY_WEAKNESS.on = false;
  try {
    assert.deepEqual(blows('golems', ['wizard', 'samurai']).dealt, plain);
  } finally {
    ARMY_WEAKNESS.on = true;
  }
  assert.deepEqual(blows('golems', ['wizard', 'samurai'], 200, true).dealt, blows(undefined, ['wizard', 'samurai'], 200, true).dealt);
});

test('a summon’s blows count as its owner’s class; the foes’ own blows and the heroes’ healing are untouched', () => {
  const b = { foeArmy: 'golems' };
  assert.equal(fightMatch(b, { side: 'hero', def: 'wizard' }, { side: 'foe' }), 'weak');
  assert.equal(fightMatch(b, { side: 'foe', def: 'wizard' }, { side: 'hero' }), undefined);
  assert.equal(fightMatch(b, { side: 'hero', def: 'wizard' }, { side: 'hero' }), undefined);
  assert.equal(fightMatch({}, { side: 'hero', def: 'wizard' }, { side: 'foe' }), undefined);
});

test('an army run’s waves keep their army; a fight of no army has none', () => {
  const run = armyRun(3, 'golems', ['knight', 'wizard', 'samurai'], undefined, 0);
  assert.equal(startStage(run).foeArmy, 'golems');
  assert.equal(startBattle(3, 'skeletons').foeArmy, undefined);
});

// ---- the page's rules (`src/armyWeaknessRules.ts`) and the pickers' preference

import { armyTags, arrowOf, codexLine, deployChip, facedArmy, hitLabel, pickedFor, shortArmy, strongFlag, theArmy } from '../src/armyWeaknessRules';
import { CLASS_SIGIL_ORDER } from '../src/classSigilOrder';
import { ARMY_SCORE, partyScore, suggestParty } from '../src/sim/suggest';
import { pickSquad } from '../src/sim/autoplay';
import { startedMeta } from '../src/sim/meta';
import { ALL_HEROES, UNITS } from '../src/sim/units';

const nm = (k: string): string => UNITS[k]?.name ?? k;

test('the War Room card’s rows: the class names, and none while the rule is off', () => {
  const t = armyTags('golems')!;
  assert.deepEqual(t.weak.map((c) => c.name), ['Caster', 'Gunner']);
  assert.deepEqual(t.resist.map((c) => c.name), ['Blade', 'Marksman']);
  assert.equal(armyTags(undefined), undefined);
  ARMY_WEAKNESS.on = false;
  try {
    assert.equal(armyTags('golems'), undefined);
    assert.equal(arrowOf('golems', 'wizard'), '');
  } finally {
    ARMY_WEAKNESS.on = true;
  }
  // (every class has a sigil in the sheet)
  for (const c of CLASSES) assert.ok(CLASS_SIGIL_ORDER.includes(c), `${c} has a sigil`);
});

test('the deploy chip counts the placed heroes on a weakness and on a resistance, and marks each', () => {
  const c = deployChip('golems', ['wizard', 'samurai', 'knight'], nm)!;
  assert.equal(c.up, 1);
  assert.equal(c.down, 1);
  assert.match(c.head, /^vs Golem Forge ▲1 ▼1$/);
  assert.match(c.line, /▲/);
  assert.match(c.line, /▼/);
  const none = deployChip('golems', ['knight'], nm)!;
  assert.equal(none.head, 'vs Golem Forge');
  assert.equal(none.line, 'Weak to Caster and Gunner');
  assert.equal(deployChip(undefined, ['wizard'], nm), undefined);
  assert.equal(arrowOf('golems', 'wizard'), '▲');
  assert.equal(arrowOf('golems', 'samurai'), '▼');
  assert.equal(arrowOf('golems', 'knight'), '');
});

test('a blow’s label: "Weak!" and "Resisted", nothing on a plain blow', () => {
  assert.equal(hitLabel('weak')?.text, 'Weak!');
  assert.equal(hitLabel('resist')?.text, 'Resisted');
  assert.notEqual(hitLabel('weak')?.colour, hitLabel('resist')?.colour);
  assert.equal(hitLabel(undefined), undefined);
});

test('the lists’ flag, the codex line, and the army the lists look to', () => {
  assert.equal(strongFlag('golems', 'wizard'), 'Strong vs Golems');
  assert.equal(strongFlag('golems', 'samurai'), undefined);
  assert.equal(strongFlag(undefined, 'wizard'), undefined);
  for (const a of ARMIES) {
    assert.ok(shortArmy(a.id).length <= 9, `${a.id}'s short name fits a card`);
    assert.match(codexLine(a.id)!, /^Weak to .+; resists .+\. /);
  }
  assert.equal(theArmy('wildwood'), 'the Wildwood');
  assert.equal(theArmy('golems'), 'the Golem Forge');
  assert.equal(facedArmy('yokai', ['orcs', 'undead']), 'yokai');
  assert.equal(facedArmy(undefined, ['orcs', 'undead']), 'undead');
  assert.equal(facedArmy(undefined, []), undefined);
  assert.equal(pickedFor('golems', ['wizard', 'knight'], nm), `Picked for the Golem Forge: ${nm('wizard')}`);
  assert.equal(pickedFor('golems', ['knight'], nm), undefined);
});

test('the suggester prefers heroes on the army’s weakness, and keeps its roles', () => {
  assert.equal(partyScore(['wizard'], 'golems') - partyScore(['wizard']), ARMY_SCORE);
  assert.equal(partyScore(['samurai'], 'golems') - partyScore(['samurai']), -ARMY_SCORE);
  const owned = ALL_HEROES.filter((k) => UNITS[k]).slice(0, 24);
  const plain = suggestParty(owned, 5);
  const vs = suggestParty(owned, 5, () => 0, 'golems');
  const up = (p: string[]) => p.filter((k) => matchOf('golems', k) === 'weak').length - p.filter((k) => matchOf('golems', k) === 'resist').length;
  assert.ok(up(vs) > up(plain), `${vs.join()} against ${plain.join()}`);
  assert.equal(vs.length, 5);
  // (with the rule off it suggests as before)
  ARMY_WEAKNESS.on = false;
  try {
    assert.deepEqual(suggestParty(owned, 5, () => 0, 'golems'), plain);
  } finally {
    ARMY_WEAKNESS.on = true;
  }
});

test('auto place ranks a hero on the army’s weakness higher, and one it resists lower', () => {
  const meta = startedMeta(5);
  const kinds = ['knight', 'paladin', 'archer', 'cleric', 'samurai', 'wizard'];
  for (const k of kinds) if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
  const run = armyRun(5, 'golems', kinds, undefined, 0);
  run.roster = kinds.map((kind, i) => ({ id: i + 1, kind, grade: 1 }));
  const squad = pickSquad(run, meta).map((h) => h.kind);
  assert.equal(squad.length, 5);
  assert.ok(squad.includes('wizard'), `the wizard is in: ${squad.join()}`);
  ARMY_WEAKNESS.on = false;
  try {
    const before = pickSquad(run, meta).map((h) => h.kind);
    assert.equal(before.length, 5);
    // (the order is the pick's: the Wizard, on the weakness, climbs; the Samurai, resisted, falls)
    assert.ok(squad.indexOf('wizard') < before.indexOf('wizard'), `${squad.join()} against ${before.join()}`);
    assert.ok(squad.indexOf('samurai') > before.indexOf('samurai'));
  } finally {
    ARMY_WEAKNESS.on = true;
  }
});
