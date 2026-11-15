// REMOVE-DYNASTY (docs/notes/remove-dynasty.md, the owner's "take out the plan of the characters having heirs and heroes dying off
// permanently. no houses or anything like that"): an old save holding the Dynasties (seasons, heirs, a bearer slain under the Legend Oath,
// a House in mourning, an heirloom, a Shade on the horn, a mentor seated as an elder) loads cleanly, its dynasty data dropped, and every
// hero is still there, at its level, ranks, talents and gear, and fights. A hero that falls is down for that fight only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { levelOfKind, xpFor } from '../src/sim/levels';
import { EQUIP_BASE_IDS, grantEquipment, equipItem, itemStats } from '../src/sim/equipment';
import { retired } from '../src/sim/legacy';
import { readEidolons } from '../src/sim/warHorn';
import { armyRun, canJoin, loadRun, recruit, saveRun, setSquad, startStage, type Run } from '../src/sim/run';
import { autoDeploy } from '../src/sim/autoplay';
import { fight, playOut } from '../src/sim/battle';

const store = () => {
  const d: Record<string, string> = {};
  return { d, getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => void (d[k] = v) };
};

/** A save from before the removal: the knight's line on its third bearer (two slain under the Oath, one a Shade, one in mourning), the
 *  samurai's elder seated in the Hall as a mentor with its line going on through an heir, an heirloom on the knight, a Shade chosen. */
function oldSave(): { raw: Record<string, unknown>; m: Meta; sword: number } {
  const m = startedMeta(41);
  m.xp.knight = xpFor(72);
  m.xp.samurai = xpFor(65);
  m.shards = { ...(m.shards ?? {}), knight: 40 };
  const sword = grantEquipment(m, { base: EQUIP_BASE_IDS.find((id) => id.length > 0)!, rarity: 3, level: 10 });
  equipItem(m, 'knight', sword.id);
  const raw = JSON.parse(JSON.stringify(m)) as Record<string, unknown>;
  // (the Dynasties' record, as phases 5 to 7 saved it)
  raw.dynasty = {
    v: 1,
    start: 20260801,
    told: 3,
    regulars: ['samurai'],
    guest: { kind: 'samurai', day: 20261110 },
    scenes: ['knight+samurai'],
    served: { knight: { season: 6, waves: 12 } },
    lines: {
      knight: {
        current: 2,
        mourning: 99999,
        heir: { doneAt: 1, partner: 'samurai', picks: [{ name: 'Kofi', look: 'ember', birthright: 'samurai' }] },
        bearers: [
          { name: 'Kwame', gen: 1, served: 11, fate: 'shade', memory: ['Became an Elder'] },
          { name: 'Ama', gen: 2, served: 4, fate: 'fallen', slainBy: 7, slayer: 'Gash, Kwame-Killer', legend: 3, birthright: 'samurai', look: 'gilt', parents: ['Kwame', 'Minh'] },
          { name: 'Yaw', gen: 3, served: 0, fate: 'fallen', foundling: true, grudge: 7 },
        ],
      },
      samurai: { current: 1, bearers: [{ name: 'Kenji', gen: 1, served: 12, fate: 'mentor' }, { name: 'Ren', gen: 2, served: 1, birthright: 'knight' }] },
    },
  };
  // (the samurai's elder in the Hall, its line going on through an heir: the kind stayed in the party)
  raw.mentors = { martial: { kind: 'samurai', since: 1, heir: true } };
  // (an heirloom on the knight's sword, +6% of its stats)
  const equipment = raw.equipment as { id: number; heirloom?: unknown }[];
  equipment.find((x) => x.id === sword.id)!.heirloom = { marks: 2, house: 'knight', bearer: 'Yaw' };
  // (a Shade chosen to answer the War Horn)
  raw.eidolons = { horn: 1000, bound: ['askel'], chosen: 'askel', shade: 'knight:0' };
  return { raw, m, sword: sword.id };
}

test('an old save with the Dynasties loads cleanly: the dynasty is dropped and every hero is kept, at its level, ranks and gear', () => {
  const { raw, m, sword } = oldSave();
  const s = store();
  s.d['legends.meta'] = JSON.stringify(raw);
  const back = loadMeta(1, s);
  assert.equal('dynasty' in back, false, 'the dynasty is dropped');
  // (every hero is there, in the party, at its level; the knight's slain bearers took nothing of the kind)
  assert.deepEqual([...back.unlocked].sort(), [...m.unlocked].sort());
  assert.deepEqual(back.party, m.party);
  assert.equal(levelOfKind(back, 'knight'), 72);
  assert.equal(levelOfKind(back, 'samurai'), 65);
  assert.deepEqual(back.xp, m.xp);
  assert.equal(back.shards?.knight, 40);
  // (its gear is still worn, an ordinary piece now: no heirloom's mark, so no +6%)
  assert.equal(back.equipped?.knight?.[Object.keys(back.equipped!.knight!)[0] as never], sword);
  const it = back.equipment!.find((x) => x.id === sword);
  assert.ok(it, 'the sword is kept');
  assert.equal('heirloom' in it!, false);
  assert.deepEqual(itemStats(it!, 'knight'), itemStats(m.equipment!.find((x) => x.id === sword)!, 'knight'));
  // (the mentor seated as an elder is let go from the Hall, with no wait on its seat: the samurai fights in the party)
  assert.equal(back.mentors?.martial, undefined);
  assert.equal(retired(back, 'samurai'), false);
  assert.ok(back.party.includes('samurai'));
  assert.equal(back.recalled?.martial, undefined, 'no wait on the seat');
  // (the War Horn keeps its fill and its Eidolon; the Shade is gone)
  assert.deepEqual(back.eidolons, { horn: 1000, bound: ['askel'], chosen: 'askel' });
  // (and it saves without any of it)
  const out = store();
  saveMeta(back, out);
  assert.doesNotMatch(out.d['legends.meta'], /dynasty|heirloom|"shade"|"heir"/);
});

test('a mentor seated in the Hall the old way (no heir) keeps its seat, and the War Horn reads an old Shade choice as nothing', () => {
  const { raw } = oldSave();
  raw.mentors = { martial: { kind: 'samurai', since: 5 } };
  const s = store();
  s.d['legends.meta'] = JSON.stringify(raw);
  const back = loadMeta(1, s);
  assert.deepEqual(back.mentors, { martial: { kind: 'samurai', since: 5 } });
  assert.equal(retired(back, 'samurai'), true);
  assert.equal('shade' in (readEidolons({ horn: 10, shade: 'knight:1' }) ?? {}), false);
});

test('a run saved under the Legend Oath marches on free of it: the slain hero is back in reach and fights', () => {
  const m = startedMeta(42);
  const run = armyRun(7, 'orcs', m.party, m.castle, 1);
  for (const k of m.party) recruit(run, k);
  const knight = run.roster.find((h) => h.kind === 'knight')!;
  const old = run as Run & Record<string, unknown>;
  old.oath = true;
  old.slain = [knight.id];
  old.oathFalls = { [String(knight.id)]: 2 };
  old.oathWave = [knight.id];
  const s = store();
  saveRun(run, s);
  const back = loadRun(s)!;
  for (const k of ['oath', 'slain', 'oathFalls', 'oathWave']) assert.equal(k in back, false, k);
  assert.equal(canJoin(back, knight.id), true);
  assert.ok(setSquad(back, knight.id, true));
  const b = startStage(back);
  autoDeploy(b, back, m);
  assert.ok(b.units.some((u) => u.side === 'hero' && u.def === 'knight'), 'the knight takes the field');
  fight(b);
  playOut(b);
});

test('no hero is lost for good: a hero down at a lost wave\'s end is still in the party and may join the next fight', () => {
  const m = startedMeta(43);
  const run = armyRun(9, 'orcs', m.party, m.castle, 4);
  for (const k of m.party) setSquad(run, recruit(run, k).id, true);
  const b = startStage(run);
  autoDeploy(b, run, m);
  fight(b);
  for (const u of b.units.filter((x) => x.side === 'hero')) u.hp = 0;
  playOut(b);
  for (const h of run.roster) assert.equal(canJoin(run, h.id) || run.squad.includes(h.id), true, h.kind);
  assert.deepEqual(m.party, startedMeta(43).party);
});

test('the Dynasties\' code, views and art are gone', () => {
  for (const f of ['src/sim/dynasty.ts', 'src/sim/heirs.ts', 'src/sim/oath.ts', 'src/sim/heirScenes.ts', 'src/sim/heirNames.ts', 'src/sim/dynastyWords.ts', 'src/housesView.ts', 'src/shadeView.ts', 'src/dynastyArt.ts', 'src/houses.css', 'src/art/dynasty/houses-backdrop.webp', 'src/art/dynasty/heirloom.webp'])
    assert.equal(existsSync(f), false, f);
});
