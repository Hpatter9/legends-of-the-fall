import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneSeconds, SCENES, SCENE_ORDER } from '../src/sim/sceneScripts';
import { dueScene, markSeen, sceneList } from '../src/sim/sceneRules';
import { newMeta, pickStarter } from '../src/sim/meta';
import { ARMIES, bossesOf } from '../src/sim/armies';
import { CHIEF_PHASE, PHASE2 } from '../src/sim/bossPhases';
import { UNITS } from '../src/sim/units';
import { FAMILY_NAMES, WARCHIEF_FORM, warchiefForm } from '../src/sim/sceneFamilies';
import { FIRST_BOSS_OF, firstBossArmy } from '../src/sim/firstBossScenes';

// CINE-1110 (docs/notes/cinematics-1110.md): a boss's second form named on a title card with a flash and a roar, for any boss that
// changes form (the warchief too); the first army's last toll; each army's first boss; the first loss, short and kind.

const picked = () => {
  const m = newMeta(5);
  pickStarter(m, 0);
  return m;
};

test('a boss changing form: its name over its new form on a title card, a flash and a roar, then its own words', () => {
  for (const boss of [...Object.keys(PHASE2), WARCHIEF_FORM.boss]) {
    const sc = SCENES[`form:${boss}`];
    assert.ok(sc, boss);
    const card = sc.shots.find((s) => s.title);
    assert.ok(card, `${boss}: a title card`);
    assert.ok(card!.title!.over.length > 0 && card!.title!.name.length > 0);
    assert.ok(card!.fx?.includes('flash'), `${boss}: a flash`);
    assert.equal(card!.cue, 'bossSlash', `${boss}: a roar`);
    const real = sc.shots.reduce((n, s) => n + sceneSeconds({ ...sc, shots: [s] }) / (s.slow ?? 1), 0);
    assert.ok(real >= 2 && real <= 5, `${boss}: about three seconds (${real.toFixed(1)})`);
  }
  assert.equal(SCENES['form:orcWarlord'].shots[1].title!.over, UNITS.orcWarlord.name);
});

test('the warchief’s form: one cut-in for every warchief, drawn as the warchief himself with his own name, in his land', () => {
  assert.equal(SCENES['form:warchief'].shots.flatMap((s) => s.lines ?? []).map((l) => l.text).join(), CHIEF_PHASE.line);
  const sc = warchiefForm('Grubnak the Unwashed', 'clanBrute', 'highlands');
  assert.equal(sc.id, 'form:warchief');
  assert.equal(sc.cast.boss.role, 'unit:clanBrute');
  assert.equal(sc.cast.boss.name, 'Grubnak the Unwashed');
  assert.equal(sc.shots[0].look, 'highlands');
  assert.equal(sc.shots[1].title!.over, 'Grubnak the Unwashed');
  const m = picked();
  assert.equal(dueScene(m, { kind: 'bossForm', boss: 'warchief' }), 'form:warchief');
});

test('each army’s first boss has its film, played the first time it is met, once a save', () => {
  const m = picked();
  for (const a of ARMIES) {
    const first = bossesOf(a)[0].id;
    assert.equal(FIRST_BOSS_OF[a.id], first, `${a.id}: the first boss of its waves`);
    assert.equal(firstBossArmy(first), a.id);
    const id = dueScene(m, { kind: 'armyBoss', army: a.id });
    assert.equal(id, `boss:${a.id}`);
    const sc = SCENES[id!];
    assert.equal(sc.family, 'firstBoss');
    assert.equal(sc.cast.boss.role, `unit:${first}`);
    assert.equal(sc.shots[0].look, a.area, `${a.id}: filmed in the army's own land`);
    assert.ok(sc.shots.some((s) => s.title?.name === UNITS[first].name), `${a.id}: the boss named on a card`);
    assert.equal(sc.out, 'smash');
    const secs = sceneSeconds(sc);
    assert.ok(secs >= 10 && secs <= 16, `${a.id}: ${secs.toFixed(1)} s`);
    markSeen(m, id!);
    assert.equal(dueScene(m, { kind: 'armyBoss', army: a.id }), null, 'once');
  }
  assert.equal(firstBossArmy('orcWarlord'), undefined, 'an army’s last boss is not its first');
  assert.ok(FAMILY_NAMES.firstBoss);
  // (in the Scenes list: unseen they fold into one line, seen each has Watch)
  const rows = sceneList(picked());
  assert.ok(rows.some((r) => r.more && r.title.includes(FAMILY_NAMES.firstBoss)) || rows.some((r) => r.more && r.text.includes(FAMILY_NAMES.firstBoss)));
  assert.ok(sceneList(m).some((r) => r.id === 'boss:orcs' && r.seen));
});

test('the first army cleared: the Orc Warlord’s last toll, closing on a title card', () => {
  const sc = SCENES['clear:orcs'];
  assert.equal(sc.title, 'The Last Toll');
  assert.deepEqual(sc.moment, { kind: 'armyClear', army: 'orcs' });
  assert.equal(ARMIES[0].id, 'orcs', 'the orcs are the first army');
  assert.ok(sc.shots[sc.shots.length - 1].title, 'a title card on the closing shot');
  assert.ok(!SCENES['clear:undead'].shots.some((s) => s.title), 'the other armies keep their shape');
});

test('the first loss: short and kind, handing over to the come-back-stronger tips', () => {
  const sc = SCENES.firstLoss;
  const secs = sceneSeconds(sc);
  assert.ok(secs >= 10 && secs <= 20, `${secs.toFixed(1)} s`);
  assert.notEqual(sc.music, 'comic');
  const last = sc.shots[sc.shots.length - 1].lines!.at(-1)!.text;
  assert.match(last, /come back \*?stronger/);
  assert.ok(SCENE_ORDER.includes('firstLoss'));
});
