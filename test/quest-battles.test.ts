// Quest battles (batch 2 of the quests design): the data, the required cast (the owner's rule: not offered until owned), the
// fight's readiness, the army each battle is, its own run slot (an army run is never touched), its seeds, Duchess, completion
// through `settleRun`, practice replays, and the save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, armyById, recordOf, waveBoost } from '../src/sim/armies';
import { AREAS } from '../src/sim/board';
import { FOES, isBoss } from '../src/sim/foes';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { lineLen, type Scene } from '../src/sim/sceneKit';
import { startedMeta, type Meta } from '../src/sim/meta';
import { settleRun } from '../src/sim/modes';
import { armyRun, finish, loadRun, loadSlot, recycle, saveRun, saveSlot, SLOT_KEYS, startStage, waveArmyOf, wavesOf } from '../src/sim/run';
import { castOf, castWords, mayFight, notReady, notReadyWords, QB_WAVES, QUEST_BATTLES, questArmy, questBattleById, questSeed } from '../src/sim/questBattles';
import { battleOfQuest, canFightBattle, markTold, questForBattle, startQuestBattle, storyDue, triesOf } from '../src/sim/questRun';
import { canOffer, heroesOwnedFor, readQuests, readyQuests, refreshOffers, takeQuest } from '../src/sim/quests';
import { QUESTS, questById } from '../src/sim/questData';

const DAY = 20261030;
const clear = (m: Meta, ...ids: string[]) => ids.forEach((id) => (m.armies[id] = { ...recordOf(m, id), clears: 1 }));
// (the eleven battles' quests; the hero quests' battles, SECRET-HEROES, are tested in secret-heroes.test.ts)
const battleQuests = QUESTS.filter((q) => q.goal.kind === 'battle' && QUEST_BATTLES.some((b) => b.id === (q.goal as { battle: string }).battle));
/** A save that owns these heroes (and the starters it began with). */
const owning = (seed: number, ...kinds: string[]): Meta => {
  const m = startedMeta(seed);
  for (const k of kinds) if (!m.unlocked.includes(k)) m.unlocked.push(k);
  return m;
};
/** A store in memory, standing in for the page's localStorage. */
const memory = () => {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k), map };
};
/** Take a battle's quest by hand (as the board's Take does), with it put on offer first. */
const takeBattle = (m: Meta, questId: string) => {
  m.quests ??= { active: [], offers: [], done: [] };
  m.quests.offers.push({ id: questId, giver: questById(questId)!.giver, day: DAY });
  assert.ok(takeQuest(m, questId, DAY), questId);
};

/* ------------------------------------------------------------------ the data */

test('eleven quest battles, each with its own land, one to five waves, a boss of its own and a cast of real heroes', () => {
  assert.equal(QUEST_BATTLES.length, 11);
  assert.equal(new Set(QUEST_BATTLES.map((q) => q.id)).size, QUEST_BATTLES.length);
  assert.equal(new Set(QUEST_BATTLES.map((q) => q.land)).size, QUEST_BATTLES.length, 'every battle on a land of its own');
  for (const qb of QUEST_BATTLES) {
    assert.ok((AREAS as readonly string[]).includes(qb.land), qb.id);
    assert.ok(qb.waves.length >= QB_WAVES.min && qb.waves.length <= QB_WAVES.max, qb.id);
    assert.ok(armyById(qb.like.army) && qb.like.wave >= 1 && qb.like.wave <= 15, qb.id);
    for (const w of qb.waves) for (const f of w.foes) assert.ok(UNITS[f] && UNITS[f].side === 'foe', `${qb.id}: ${f}`);
    // (a boss wave starts with a boss the armies know, whose stats the wave's boost reads)
    for (const w of qb.waves.filter((x) => x.boss)) assert.ok(isBoss(w.foes[0]) && FOES[w.foes[0]], `${qb.id}: ${w.foes[0]}`);
    assert.equal(qb.waves[qb.waves.length - 1].boss, 'final', `${qb.id} ends on its boss`);
    assert.ok(qb.boss?.name && qb.boss.title, qb.id);
    assert.ok(qb.cast.length >= 1 && qb.cast.length <= 3, qb.id);
    for (const s of qb.cast) for (const k of s.heroes) assert.ok(ALL_HEROES.includes(k), `${qb.id}: ${k}`);
    // (stand-ins are the Eidolon chains' (a later batch): none of these ordinary battles has them)
    assert.ok(qb.cast.every((s) => !s.standIns), qb.id);
  }
  // (varied: their lengths, their bosses)
  assert.ok(new Set(QUEST_BATTLES.map((q) => q.waves.length)).size >= 4);
  assert.ok(new Set(QUEST_BATTLES.map((q) => q.waves[q.waves.length - 1].foes[0])).size >= 9);
});

test('each battle is opened by exactly one quest, from a giver, whose words name its cast', () => {
  for (const qb of QUEST_BATTLES) {
    const qs = battleQuests.filter((q) => q.goal.kind === 'battle' && q.goal.battle === qb.id);
    assert.equal(qs.length, 1, qb.id);
    assert.equal(battleOfQuest(qs[0].id), qb);
    assert.ok(!qs[0].repeat, `${qb.id}: a battle quest is done once`);
  }
  assert.equal(battleQuests.length, QUEST_BATTLES.length);
  assert.ok(new Set(battleQuests.map((q) => q.giver)).size >= 7, 'from many givers');
});

test('the stories: a scene before and a beat after, every line short and spoken by someone on the stage', () => {
  for (const qb of QUEST_BATTLES) {
    const cast = qb.cast.map((s) => s.heroes[0]);
    for (const sc of [qb.before(cast), qb.after(cast)] as Scene[]) {
      assert.ok(sc.shots.length >= 1, sc.id);
      assert.equal(sc.shots[0].look, qb.land, `${sc.id} is set on the battle's land`);
      for (const s of sc.shots)
        for (const l of s.lines ?? []) {
          assert.ok(l.text.length <= 100, `${sc.id}: ${l.text}`);
          assert.ok(l.who === 'narrator' || sc.cast[l.who], `${sc.id}: ${l.who}`);
          assert.ok(lineLen(l) > 0);
        }
      for (const c of Object.values(sc.cast)) if (c.role.startsWith('unit:')) assert.ok(UNITS[c.role.slice(5)], `${sc.id}: ${c.role}`);
    }
    // (the scene before stars the cast: each of them is on its stage)
    const roles = Object.values(qb.before(cast).cast).map((c) => c.role);
    for (const k of cast) assert.ok(roles.includes(`unit:${k}`), `${qb.id}: ${k} in the story`);
  }
});

/* ------------------------------------------------------------------ the required cast */

test('the cast rule: each slot takes its first owned hero, a hero fills one slot only, and an unowned slot leaves no cast', () => {
  const meadow = questBattleById('frozenMeadow')!;
  assert.equal(castOf(owning(1), meadow), null, 'no werewolf, no cast');
  assert.equal(castOf(owning(1, 'werewolf'), meadow), null, 'the second slot still empty');
  assert.deepEqual(castOf(owning(1, 'werewolf', 'ranger'), meadow), ['werewolf', 'ranger']);
  assert.deepEqual(castOf(owning(1, 'werewolf', 'ranger', 'beastmaster'), meadow), ['werewolf', 'beastmaster']);
  // (one of either starter pack fills Gwen's cellar)
  const cellar = questBattleById('cellarTenant')!;
  const packs = [['knight', 'samurai', 'archer'], ['peasant', 'kunoichi', 'wizard']];
  for (const p of packs) {
    const m = startedMeta(2);
    m.unlocked = [...p];
    assert.ok(castOf(m, cellar), p.join());
  }
});

test('hidden until owned: a battle quest is not offered, nor drawn, until its whole cast is owned (the owner\'s rule)', () => {
  for (const q of battleQuests) {
    const qb = battleOfQuest(q.id)!;
    const bare = startedMeta(3);
    bare.unlocked = ['knight'];
    if (!castOf(bare, qb)) assert.equal(heroesOwnedFor(bare, q), false, q.id);
    const all = owning(3, ...qb.cast.flatMap((s) => s.heroes), ...(q.hero ? [q.hero] : []));
    assert.equal(heroesOwnedFor(all, q), true, q.id);
  }
  // (a late save that owns none of the casts is never offered one, day after day)
  const m = startedMeta(4);
  m.unlocked = ['knight'];
  m.party = ['knight'];
  clear(m, ...ARMIES.map((a) => a.id));
  for (let d = 0; d < 40; d++) {
    refreshOffers(m, 20261101 + (d % 28) + 100 * Math.floor(d / 28));
    for (const o of m.quests!.offers) assert.notEqual(questById(o.id)!.goal.kind, 'battle', o.id);
    m.quests!.offers = [];
  }
  // (once owned, and its needs met, it can be)
  const own = owning(4, 'samurai', 'samuraiCommander');
  clear(own, ...ARMIES.map((a) => a.id));
  assert.ok(canOffer(own, questById('twoBladesBridge')!, DAY));
});

test('the fight waits for the cast: every required hero on the board, the battle\'s rule kept, no more than its limit', () => {
  const bridge = questBattleById('bridgeBlades')!;
  assert.deepEqual(notReady(bridge, ['samurai', 'samuraiCommander'], []), { kind: 'none' });
  assert.deepEqual(notReady(bridge, ['samurai', 'samuraiCommander'], ['samurai', 'knight']), { kind: 'missing', heroes: ['samuraiCommander'] });
  assert.equal(notReady(bridge, ['samurai', 'samuraiCommander'], ['samurai', 'samuraiCommander', 'knight']), null);
  const audit = questBattleById('theAudit')!;
  assert.deepEqual(notReady(audit, ['warlock'], ['warlock', 'knight']), { kind: 'only', heroes: ['knight'] });
  assert.equal(notReady(audit, ['warlock'], ['warlock', 'wizard']), null);
  const cellar = questBattleById('cellarTenant')!;
  assert.deepEqual(notReady(cellar, ['archer'], ['archer', 'knight', 'samurai']), { kind: 'most', most: 2 });
  assert.equal(notReady(cellar, ['archer'], ['archer', 'knight']), null);
});

/* ------------------------------------------------------------------ the army it is */

test('each battle is an army in shape: its waves on its land, its last wave as strong as its army\'s wave (eased), no crowns by the wave', () => {
  for (const qb of QUEST_BATTLES) {
    const a = questArmy(qb.id)!;
    const like = armyById(qb.like.army)!;
    assert.equal(a.waves, qb.waves);
    assert.deepEqual(a.lands, [qb.land]);
    assert.equal(a.pay, 0);
    assert.equal(a.clear, 0);
    const last = waveBoost(a, qb.waves.length).foes!.hp!;
    // (times its own `ease`, tuned by `npm run quest-rate`)
    const want = waveBoost(like, qb.like.wave).foes!.hp! * (qb.ease ?? 1);
    assert.ok(qb.ease === undefined || (qb.ease > 0.3 && qb.ease < 2.5), qb.id);
    assert.ok(Math.abs(last - want) < 1e-9, `${qb.id}: ${last} vs ${want}`);
    // (each wave before is a little weaker)
    for (let n = 2; n <= qb.waves.length; n++) assert.ok(waveBoost(a, n).foes!.hp! > waveBoost(a, n - 1).foes!.hp!, qb.id);
  }
  assert.equal(questArmy('nope'), undefined);
});

/* ------------------------------------------------------------------ a try */

test('a try: only while its quest is taken (or once won), with its own seed, the cast on the bench, and the saved party untouched', () => {
  const m = owning(5, 'samurai', 'samuraiCommander');
  clear(m, ...ARMIES.map((a) => a.id));
  const party = [...m.party];
  assert.equal(canFightBattle(m, 'bridgeBlades'), false, 'no quest taken');
  assert.equal(startQuestBattle(m, 'bridgeBlades', m.party), null);
  takeBattle(m, 'twoBladesBridge');
  assert.equal(questForBattle(m, 'bridgeBlades'), 'twoBladesBridge');
  const run = startQuestBattle(m, 'bridgeBlades', ['knight', 'archer', 'samurai'])!;
  assert.ok(run);
  assert.deepEqual(run.mode, { kind: 'quest', quest: 'bridgeBlades', cast: ['samurai', 'samuraiCommander'] });
  assert.equal(run.seed, questSeed(m.seed, 'bridgeBlades', 1));
  assert.equal(triesOf(m, 'bridgeBlades'), 1);
  assert.deepEqual(run.roster.map((h) => h.kind), ['samurai', 'samuraiCommander'], 'the cast waits on the bench');
  assert.deepEqual(run.squad, [], 'nobody placed yet');
  assert.ok(['samurai', 'samuraiCommander', 'knight', 'archer'].every((k) => run.pool!.includes(k)));
  assert.equal(run.area, 'shrine');
  assert.deepEqual(m.party, party, 'the saved party is the same');
  assert.equal(waveArmyOf(run), questArmy('bridgeBlades'));
  assert.equal(wavesOf(run), 3);
  // (the next try is a new seed; the same save's same try is the same fight)
  const run2 = startQuestBattle(m, 'bridgeBlades', m.party)!;
  assert.equal(run2.seed, questSeed(m.seed, 'bridgeBlades', 2));
  assert.notEqual(run2.seed, run.seed);
  assert.notEqual(questSeed(m.seed, 'bridgeBlades', 1), questSeed(m.seed, 'kilnRoad', 1));
  const twin = owning(5, 'samurai', 'samuraiCommander');
  clear(twin, ...ARMIES.map((a) => a.id));
  takeBattle(twin, 'twoBladesBridge');
  const again = startQuestBattle(twin, 'bridgeBlades', ['knight', 'archer', 'samurai'])!;
  assert.deepEqual(again, run);
  const b1 = startStage(run);
  const b2 = startStage(again);
  assert.deepEqual(b1.units.map((u) => [u.def, u.u, u.v, u.hp]), b2.units.map((u) => [u.def, u.u, u.v, u.hp]));
  assert.equal(b1.board.area, 'shrine');
});

test('the required hero cannot be recycled while it is the last of its kind', () => {
  const m = owning(6, 'werewolf', 'ranger');
  clear(m, 'orcs', 'undead', 'beasts');
  takeBattle(m, 'frostOnTheirBacks');
  const run = startQuestBattle(m, 'frozenMeadow', m.party)!;
  run.gold = 500;
  const vuk = run.roster.find((h) => h.kind === 'werewolf')!;
  assert.equal(recycle(run, vuk.id), null);
  run.roster.push({ id: run.nextId++, kind: 'knight', grade: 1 });
  assert.ok(recycle(run, run.roster[run.roster.length - 1].id));
});

test('Duchess fights in Under the Courtyard every time, and in no other quest battle', () => {
  for (const qb of QUEST_BATTLES) {
    const m = owning(7, ...qb.cast.map((s) => s.heroes[0]));
    m.duchessTaps = 1;
    clear(m, ...ARMIES.map((a) => a.id));
    m.quests = { active: [], offers: [], done: [], won: [qb.id] };
    const run = startQuestBattle(m, qb.id, m.party)!;
    assert.equal(!!startStage(run, 'always').duchess, !!qb.duchess, qb.id);
  }
});

/* ------------------------------------------------------------------ the run slot */

test('a quest battle keeps its own save slot: a saved army run is never touched, and the quest run comes back from its own', () => {
  const store = memory();
  const m = owning(8, 'wizard');
  clear(m, 'orcs');
  const army = armyRun(99, 'undead', m.party, m.castle);
  army.stage = 4;
  saveRun(army, store);
  const before = store.getItem('legends.run');
  takeBattle(m, 'cinderCrown');
  const run = startQuestBattle(m, 'kilnRoad', m.party)!;
  saveSlot(run, store);
  assert.equal(SLOT_KEYS.quest, 'legends.questRun');
  assert.equal(store.getItem('legends.run'), before, 'the army run is as it was');
  assert.equal(loadRun(store)!.mode?.kind, 'army');
  assert.equal(loadSlot('quest', store)!.mode?.kind, 'quest');
  assert.equal(loadSlot('tower', store), null);
  // (lost or won, it is no run to carry on; and a saved battle no longer in the game is dropped)
  run.over = true;
  saveSlot(run, store);
  assert.equal(loadSlot('quest', store), null);
  store.setItem('legends.questRun', JSON.stringify({ ...run, over: false, mode: { kind: 'quest', quest: 'gone', cast: [] } }));
  assert.equal(loadSlot('quest', store), null);
});

/* ------------------------------------------------------------------ winning it */

test('winning the last wave completes the quest; a replay after is practice and counts for nothing', () => {
  const m = owning(9, 'wizard');
  clear(m, 'orcs');
  takeBattle(m, 'cinderCrown');
  const run = startQuestBattle(m, 'kilnRoad', m.party)!;
  // (the first two waves won: nothing done yet)
  for (const stage of [1, 2]) {
    finish(run, true);
    settleRun(m, run, { won: true, stage, stars: 3, battle: startStage(run) });
    assert.deepEqual(readyQuests(m), []);
  }
  const b = startStage(run);
  for (const u of b.units) if (u.side === 'foe') u.alive = false;
  b.phase = 'won';
  finish(run, true);
  assert.ok(run.cleared && run.over);
  settleRun(m, run, { won: true, stage: 3, stars: 3, battle: b });
  assert.deepEqual(readyQuests(m), ['cinderCrown']);
  assert.deepEqual(m.quests!.won, ['kilnRoad']);
  assert.ok(!m.bosses.includes('devilLeader'), 'the Ash Warden is not the Devil Leader beaten');
  // (handed in, the battle may be replayed: practice)
  assert.ok(canFightBattle(m, 'kilnRoad'));
  const replay = startQuestBattle(m, 'kilnRoad', m.party)!;
  assert.equal(replay.mode?.kind === 'quest' && replay.mode.practice, true);
});

test('a lost try costs nothing: the quest stays, and Try again is a new seed', () => {
  const m = owning(10, 'archer');
  clear(m, 'orcs', 'undead');
  m.quests = { active: [], offers: [], done: ['knockingCellar'] };
  takeBattle(m, 'whatKnocksBelow');
  const run = startQuestBattle(m, 'cellarTenant', m.party)!;
  const crowns = m.crowns;
  finish(run, false);
  settleRun(m, run, { won: false, stage: 1, stars: 0, battle: startStage(run) });
  assert.equal(m.crowns, crowns);
  assert.ok(m.quests!.active.some((a) => a.id === 'whatKnocksBelow'));
  assert.ok(canFightBattle(m, 'cellarTenant'));
  assert.notEqual(startQuestBattle(m, 'cellarTenant', m.party)!.seed, run.seed);
});

/* ------------------------------------------------------------------ the save */

test('the save: tries, battles won and stories told are kept; junk and battles no longer in the game are dropped', () => {
  const m = startedMeta(11);
  assert.ok(storyDue(m, 'kilnRoad'));
  markTold(m, 'kilnRoad');
  assert.ok(!storyDue(m, 'kilnRoad'));
  const s = readQuests({ active: [], offers: [], done: [], tries: { kilnRoad: 3, gone: 2, wolfDen: -1, bridgeBlades: 1.5 }, won: ['kilnRoad', 'gone', 7], told: ['kilnRoad', 'kilnRoad'] })!;
  assert.deepEqual(s.tries, { kilnRoad: 3 });
  assert.deepEqual(s.won, ['kilnRoad']);
  assert.deepEqual(s.told, ['kilnRoad']);
  // (a batch 1b save has none of them, and loads as it was)
  const old = readQuests({ active: [], offers: [], done: ['knockingCellar'] })!;
  assert.equal(old.tries, undefined);
  assert.equal(old.won, undefined);
  assert.deepEqual(old.done, ['knockingCellar']);
});

test('the cast and the rule in words, and why the fight waits, for the party screen and the deploy line', () => {
  const audit = questBattleById('theAudit')!;
  assert.equal(castWords(audit, ['warlock']), 'Zofia must fight · only Caster, Arcanist or Mystic heroes');
  assert.equal(castWords(questBattleById('bridgeBlades')!, ['samurai', 'samuraiCommander']), 'Kenji and Hideo must fight');
  assert.equal(castWords(questBattleById('cellarTenant')!, ['kunoichi']), 'Ayame must fight · 2 heroes at most');
  assert.equal(notReadyWords(notReady(audit, ['warlock'], []), ['warlock']), 'Place Zofia to begin');
  assert.equal(notReadyWords(notReady(audit, ['warlock'], ['warlock', 'knight']), ['warlock']), 'Only spellcasters fight here: take Kwame off');
  assert.equal(notReadyWords(null, ['warlock']), null);
  assert.ok(mayFight(audit, 'wizard') && !mayFight(audit, 'knight'));
});

test('a quest battle has no road events between its waves: its story is its own', () => {
  const m = owning(12, 'werewolf', 'ranger');
  clear(m, 'orcs', 'undead', 'beasts');
  takeBattle(m, 'frostOnTheirBacks');
  const run = startQuestBattle(m, 'frozenMeadow', m.party)!;
  for (let i = 0; i < 3; i++) {
    finish(run, true);
    assert.equal(run.event, undefined);
  }
});
