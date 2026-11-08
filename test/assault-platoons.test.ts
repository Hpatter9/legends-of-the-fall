// ASSAULT-PLATOONS (docs/notes/assault-1.md; the design's section 3 and 7.6): every hero leads a troop kind whose sheet exists, the overrides
// hold, a soldier's numbers scale with its hero's level and its rank, a platoon is never over ten, and the formations put each soldier in its
// place round the hero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { lookOf, rankOf, RANKS, troopBoost, troopOf, troopStats, troopUnitOf, TROOP_UNITS, TROOPS, TROOP_KINDS } from '../src/sim/assault/troops';
import { slotAt, FORMATIONS } from '../src/sim/assault/platoons';
import { startAssault } from '../src/sim/assault/assault';
import { input } from './assaultKit';

const sheets: Record<string, unknown> = JSON.parse(readFileSync('src/art/units/sheets.json', 'utf8'));

test('every hero leads a troop kind, drawn from a sheet that exists', () => {
  for (const k of ALL_HEROES) {
    const id = troopUnitOf(k);
    const def = UNITS[id];
    assert.ok(def, `${k} leads ${id}`);
    assert.ok(sheets[def.sheet], `${id}'s sheet ${def.sheet} exists`);
    assert.ok(def.summon, `${id} is never counted as a hero`);
  }
  for (const def of Object.values(TROOP_UNITS)) assert.ok(sheets[def.sheet], `${def.id}'s sheet exists`);
});

test('the rule places the heroes as the design\'s table does, and the overrides hold', () => {
  const want: Record<string, string> = {
    knight: 'shieldguard', paladin: 'shieldguard', juggernaut: 'shieldguard', samurai: 'blades', barbarian: 'blades', lancer: 'lancers', dragoon: 'lancers',
    kunoichi: 'skirmishers', reaper: 'skirmishers', archer: 'archers', ranger: 'archers', gunslinger: 'gunners', rifleBot: 'gunners', wizard: 'battlemages',
    gorgon: 'battlemages', druid: 'battlemages', satyr: 'acolytes', cleric: 'acolytes', priestess: 'acolytes', werewolf: 'beasts', minotaur: 'beasts', beastmaster: 'beasts',
  };
  for (const [hero, kind] of Object.entries(want)) assert.equal(troopOf(hero), kind, hero);
  // (the looks: a Machine hero's soldiers are robots, an Undead hero's skeletons, where the kind has the look)
  assert.equal(lookOf('rifleBot'), 'machine');
  assert.equal(UNITS[troopUnitOf('rifleBot')].sheet, 'robot_infantry');
  assert.equal(lookOf('reaper'), 'undead');
  assert.equal(UNITS[troopUnitOf('reaper')].sheet, 'skeleton_warrior');
  assert.equal(lookOf('knight'), 'plain');
  assert.equal(TROOP_KINDS.length, 9);
});

test('a soldier\'s numbers scale with its hero\'s level and step up with its rank', () => {
  const lo = troopStats('shieldguard', 1);
  const hi = troopStats('shieldguard', 60);
  assert.ok(hi.hp > lo.hp && hi.atk >= lo.atk);
  assert.deepEqual(RANKS.map((r) => r.marks), [0, 1, 3, 6]);
  assert.equal(rankOf(0).rank, 'recruit');
  assert.equal(rankOf(2).rank, 'blooded');
  assert.equal(rankOf(5).rank, 'veteran');
  assert.equal(rankOf(40).rank, 'elite');
  const r = troopBoost(30, 0);
  const e = troopBoost(30, 6);
  assert.ok(Math.abs(e.hp / r.hp - 1.25) < 1e-9 && Math.abs(e.atk / r.atk - 1.25) < 1e-9);
  assert.equal(TROOPS.archers.range, 4);
});

test('a platoon is never over ten, whatever the save holds', () => {
  const b = startAssault(input({ troops: { knight: Array(14).fill(2) } }));
  const h = b.field!.hold!;
  assert.equal(h.platoons[0].soldiers.length, 10);
  assert.equal(h.platoons[1].soldiers.length, 0);
  // (and a hero with no soldiers still marches alone)
  assert.ok(b.field!.byId[h.platoons[1].heroId].alive);
});

test('the formations give ten different places round the hero, turned to its heading', () => {
  for (const form of FORMATIONS) {
    const at = new Set(Array.from({ length: 10 }, (_, k) => { const s = slotAt({ u: 50, v: 50 }, 0, form, k + 1); return `${s.u},${s.v}`; }));
    assert.equal(at.size, 10, form);
    assert.ok(!at.has('50,50'), `${form}: nobody stands on the hero`);
  }
  // (the wall stands before the hero: along its heading)
  assert.equal(slotAt({ u: 50, v: 50 }, 0, 'wall', 3).u, 51);
  assert.equal(slotAt({ u: 50, v: 50 }, 2, 'wall', 3).u, 49);
});
