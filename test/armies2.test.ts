import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARMIES, armyById, armyFoes, armyIndex, armyUnlocked, bossOf, bossesOf, firstClearTotal, nextArmy, replayTotal, settleWave } from '../src/sim/armies';
import { CHARGE_MAX, KITS, tryCast } from '../src/sim/abilities';
import { fight, type BattleEvent } from '../src/sim/battle';
import { isBoss } from '../src/sim/foes';
import { newMeta } from '../src/sim/meta';
import { BOSS_TITLES } from '../src/render/bossTitles';
import { HEROES, UNITS } from '../src/sim/units';
import { playArmy, savedAt } from '../tools/autoplay';
import { readyBattle } from './helpers';

const sheets: Record<string, { w: number; h: number; perRow: number; rows: string[]; counts: Record<string, number> }> = JSON.parse(readFileSync('src/art/units/sheets.json', 'utf8'));
const NEW = ['yokai', 'golems'].map((id) => armyById(id)!);

test('the Yokai Night Parade follows the Infernal Host and the Golem Forge the Yokai, each of ten waves with two bosses', () => {
  assert.equal(armyIndex('yokai'), armyIndex('infernal') + 1);
  assert.equal(armyIndex('golems'), armyIndex('yokai') + 1);
  assert.equal(nextArmy(armyById('infernal')!)!.id, 'yokai');
  assert.equal(nextArmy(armyById('yokai')!)!.id, 'golems');
  assert.equal(bossOf(armyById('infernal')!), 'demonLord');
  const m = newMeta(1);
  for (const a of ARMIES.slice(0, 7)) for (let n = 1; n <= a.waves.length; n++) settleWave(m, a.id, n, true, 0);
  assert.equal(armyUnlocked(m, 'yokai'), true);
  assert.equal(armyUnlocked(m, 'golems'), false);
  for (let n = 1; n <= 10; n++) settleWave(m, 'yokai', n, true, 0);
  assert.equal(armyUnlocked(m, 'golems'), true);
  for (const a of NEW) {
    assert.equal(a.waves.length, 10);
    assert.equal(bossesOf(a).length, 2);
    assert.ok(armyFoes(a).length >= 5, a.id);
  }
});

test('both new armies pay more than the Infernal Host, for a first clear and for a replay', () => {
  const inf = armyById('infernal')!;
  for (const a of NEW) {
    assert.ok(firstClearTotal(a) > firstClearTotal(inf), a.id);
    assert.ok(replayTotal(a) > replayTotal(inf), a.id);
  }
  assert.ok(firstClearTotal(armyById('golems')!) > firstClearTotal(armyById('yokai')!));
});

test('every new foe has a kit, its own sheet rows, and each boss a title', () => {
  for (const a of NEW) {
    for (const id of armyFoes(a)) {
      const def = UNITS[id];
      assert.ok(def && def.side === 'foe', id);
      assert.ok(KITS[id], `${id} has a skill`);
      const s = sheets[def.sheet];
      assert.ok(s, `${id}: sheet ${def.sheet}`);
      for (const row of ['walk', 'attack', 'idle', 'dead']) assert.ok(s.counts[row] > 0 && s.rows.includes(row), `${def.sheet} ${row}`);
    }
    for (const b of bossesOf(a)) {
      assert.ok(isBoss(b.id) && BOSS_TITLES[b.id], b.id);
      assert.ok(UNITS[b.id].scale >= 0.45, `${b.id} is drawn big`);
    }
  }
});

test('the new generated and cut sheets end their death lying down', () => {
  for (const k of ['oni_king', 'golem_stone', 'golem_crystal', 'golem_iron', 'golem_magma', 'golem_sapphire', 'golem_forge'] as const) {
    const s = sheets[k] as typeof sheets[string] & { lies?: boolean };
    assert.equal(s.lies, true, k);
    assert.ok(s.counts.dead >= 5, k);
  }
});

test('Shard Burst hurts and holds every hero within two tiles, and none beyond', () => {
  const b = readyBattle(4, ['crystalGolem', 'stoneGolem']);
  const golem = b.units.find((u) => u.def === 'crystalGolem')!;
  const heroes = b.units.filter((u) => u.side === 'hero');
  fight(b);
  golem.u = heroes[0].u;
  golem.v = heroes[0].v - 2;
  const far = heroes.find((h) => Math.abs(h.u - golem.u) + Math.abs(h.v - golem.v) > 2);
  const hp = new Map(heroes.map((h) => [h.id, h.hp]));
  golem.charge = CHARGE_MAX;
  const out: BattleEvent[] = [];
  assert.ok(tryCast(b, golem, out));
  assert.ok(out.some((e) => e.kind === 'skill' && e.name === 'Shard Burst'));
  assert.ok(heroes[0].hp < hp.get(heroes[0].id)!);
  assert.ok(heroes[0].stunUntil! > b.t);
  if (far) assert.equal(far.hp, hp.get(far.id));
});

test('the Oni King\'s Thunder Drum stuns the heroes round him, and his Kanabo Smash is his skill', () => {
  assert.equal(KITS.oniKing.skill.name, 'Kanabo Smash');
  assert.equal(KITS.oniKing.ultimate?.name, 'Thunder Drum');
  const b = readyBattle(5, ['oniKing', 'yokaiFox']);
  const oni = b.units.find((u) => u.def === 'oniKing')!;
  const hero = b.units.find((u) => u.side === 'hero')!;
  fight(b);
  oni.u = hero.u;
  oni.v = hero.v - 2;
  oni.charge2 = CHARGE_MAX;
  assert.ok(tryCast(b, oni, []));
  assert.ok(hero.stunUntil! > b.t);
});

test('the new armies are walls for a fresh party and need the levels the armies before earned', () => {
  for (const id of ['yokai', 'golems']) {
    let wins = 0;
    for (let i = 0; i < 6; i++) if (playArmy(savedAt(9, HEROES, i + 1), id, 700 + i, HEROES).cleared) wins++;
    assert.equal(wins, 0, `${id} at level 9 with the starting five`);
  }
});
