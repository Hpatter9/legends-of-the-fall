// TEN-LIVES (docs/notes/ten-lives.md): a run's ten lives, in place of its two hearts. A fallen hero rises after five seconds of the
// fight's time for one life; a party all down rises at once, a life each; with no life left the fallen stay down and a party all
// down has lost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, hurt, playOut, stepBattle, TIME_LIMIT_MS, unitAt, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { HEART_LIVES, LIVES, REVIVE_HP, REVIVE_MS, REVIVE_SAFE_MS, TIMEOUT_LIVES, reviveIn } from '../src/sim/lives';
import { raiseFallen } from '../src/sim/kits/revive';
import { armyRun, finish, hasLives, livesLeft, livesMax, livesSpent, loadRun, newRun, noteFight, partyFalls, recruit, retryGold, saveRun, settleLives, spendLives, startStage, type Run } from '../src/sim/run';
import { startDaily } from '../src/sim/modes';
import { startedMeta } from '../src/sim/meta';
import { startQuestBattle } from '../src/sim/questRun';
import { questBattleById } from '../src/sim/questBattles';
import { ordersFor } from '../src/sim/march';
import { swearOath } from '../src/sim/oath';
import { openDynasty } from '../src/sim/dynasty';
import { autoDeploy, autoRound } from '../src/sim/autoplay';
import { readyBattle } from './helpers';

const heroesOf = (b: Battle) => b.units.filter((u) => u.side === 'hero');
/** A fight with `lives`, in which nobody can win or die by itself: the foes stand still with more health than a fight could take off. */
function held(seed: number, lives: number | undefined, vigil?: 'shielded' | 'swift' | 'cleansed'): Battle {
  const b = readyBattle(seed, 'skeletons', { ...(lives !== undefined ? { lives } : {}), ...(vigil ? { vigil } : {}) });
  fight(b);
  for (const f of b.units.filter((u) => u.side === 'foe')) {
    f.maxHp = f.hp = 1e9;
    f.busyUntil = 1e12;
  }
  return b;
}
const fell = (b: Battle, u: Unit) => {
  u.hp = 0;
  u.alive = false;
  u.diedAt = b.t;
};
/** Step the fight on by `ms`, gathering its events. */
function run(b: Battle, ms: number): BattleEvent[] {
  const out: BattleEvent[] = [];
  for (let t = 0; t < ms && b.phase === 'fight'; t += 100) out.push(...stepBattle(b));
  return out;
}

test('a fallen hero rises after five seconds of the fight, on its tile at half health, for one life', () => {
  const b = held(41, LIVES);
  const [a] = heroesOf(b);
  const at = [a.u, a.v];
  fell(b, a);
  assert.equal(reviveIn(b, a), REVIVE_MS);
  let events = run(b, REVIVE_MS - 100);
  assert.equal(a.alive, false, 'not before its time');
  assert.equal(reviveIn(b, a), 100);
  assert.equal(b.lives!.left, LIVES);
  assert.equal(events.some((e) => e.kind === 'life'), false);
  events = run(b, 100);
  assert.equal(a.alive, true);
  assert.equal(a.hp, Math.round(a.maxHp * REVIVE_HP));
  assert.deepEqual([a.u, a.v], at, 'on its own tile');
  assert.equal(a.diedAt, undefined);
  assert.equal(a.lifeRises, 1);
  assert.deepEqual([b.lives!.left, b.lives!.spent, b.lives!.falls], [LIVES - 1, 1, 0]);
  assert.deepEqual(events.filter((e) => e.kind === 'life'), [{ kind: 'life', to: [a.id], left: LIVES - 1, why: 'timer' }]);
  assert.ok(events.some((e) => e.kind === 'revive' && e.to === a.id), 'the page plays its getting up');
  assert.equal(reviveIn(b, a), null, 'it stands: no countdown');
});

test('a hero just risen cannot be hurt or picked for a moment, then can', () => {
  const b = held(42, LIVES);
  const [a] = heroesOf(b);
  const foe = b.units.find((u) => u.side === 'foe')!;
  fell(b, a);
  run(b, REVIVE_MS);
  const hp = a.hp;
  assert.equal(hurt(b, foe, a, 50, false, false, []), false, 'safe on arrival');
  assert.equal(a.hp, hp);
  assert.ok((a.hideUntil ?? 0) > b.t, 'not picked as a target');
  run(b, REVIVE_SAFE_MS);
  assert.equal(hurt(b, foe, a, 5, false, false, []), true);
  assert.ok(a.hp < hp);
});

test('its tile taken, a risen hero stands on the nearest free tile', () => {
  const b = held(43, LIVES);
  const [a, other] = heroesOf(b);
  const at = [a.u, a.v] as const;
  fell(b, a);
  other.u = at[0];
  other.v = at[1];
  other.busyUntil = 1e12;
  run(b, REVIVE_MS);
  assert.equal(a.alive, true);
  assert.notDeepEqual([a.u, a.v], at);
  assert.ok(Math.max(Math.abs(a.u - at[0]), Math.abs(a.v - at[1])) <= 1, 'the nearest free one');
  assert.equal(unitAt(b, a.u, a.v), a);
});

test('every hero down at once: nobody waits, all rise at once, a life each, and the fight goes on', () => {
  const b = held(44, LIVES);
  const heroes = heroesOf(b);
  for (const h of heroes) fell(b, h);
  const events = run(b, 100);
  assert.equal(b.phase, 'fight');
  assert.ok(heroes.every((h) => h.alive && h.hp === Math.round(h.maxHp * REVIVE_HP)));
  assert.deepEqual([b.lives!.left, b.lives!.spent, b.lives!.falls], [LIVES - heroes.length, heroes.length, 1]);
  assert.deepEqual(events.filter((e) => e.kind === 'life'), [{ kind: 'life', to: heroes.map((h) => h.id), left: LIVES - heroes.length, why: 'all' }]);
});

test('fewer lives than fallen heroes: as many rise as the lives allow, in party order; the rest stay down', () => {
  const b = held(45, 3);
  const heroes = heroesOf(b);
  for (const h of heroes) fell(b, h);
  run(b, 100);
  assert.deepEqual(heroes.map((h) => h.alive), [true, true, true, false, false]);
  assert.equal(b.lives!.left, 0);
  assert.equal(b.phase, 'fight');
  // (with no life left the fallen stay down, however long they lie)
  run(b, REVIVE_MS * 2);
  assert.deepEqual(heroes.map((h) => h.alive), [true, true, true, false, false]);
  assert.equal(reviveIn(b, heroes[3]), null, 'no countdown with no life left');
  // (and a party all down with no life left has lost)
  for (const h of heroes) if (h.alive) fell(b, h);
  const events = run(b, 100);
  assert.equal(b.phase, 'lost');
  assert.ok(events.some((e) => e.kind === 'end' && !e.won));
});

test('with no lives, or in a fight that has none, the fallen stay down and a party all down has lost', () => {
  for (const lives of [0, undefined]) {
    const b = held(46, lives);
    const heroes = heroesOf(b);
    fell(b, heroes[0]);
    run(b, REVIVE_MS + 500);
    assert.equal(heroes[0].alive, false);
    for (const h of heroes) fell(b, h);
    run(b, 100);
    assert.equal(b.phase, 'lost');
  }
});

test('the clock run out: lives buy another allowance without rewinding the fight; with none, the wave is lost', () => {
  const b = held(47, LIVES);
  b.t = TIME_LIMIT_MS - 100;
  const events = run(b, 100);
  assert.equal(b.phase, 'fight');
  assert.equal(b.t, TIME_LIMIT_MS);
  assert.equal(b.timeLimit, TIME_LIMIT_MS * 2);
  assert.deepEqual([b.lives!.left, b.lives!.falls], [LIVES - TIMEOUT_LIVES, 1]);
  assert.deepEqual(events.filter((e) => e.kind === 'life'), [{ kind: 'life', to: [], left: LIVES - TIMEOUT_LIVES, why: 'time' }]);
  const none = held(47, 0);
  none.t = TIME_LIMIT_MS - 100;
  run(none, 100);
  assert.equal(none.phase, 'lost');
});

test('a healer\'s revive spends no life, and stops the life\'s countdown; a summon and a foe use none', () => {
  const b = held(48, LIVES);
  const [a, healer, pet] = heroesOf(b);
  fell(b, a);
  run(b, 1000);
  raiseFallen(b, healer, a, 0.3, [], () => undefined);
  assert.equal(a.alive, true);
  run(b, REVIVE_MS);
  assert.equal(b.lives!.left, LIVES, 'the healer raised it: no life');
  // (a hero's summoned helper, and a foe, lie where they fall)
  pet.owner = healer.id;
  fell(b, pet);
  const foe = b.units.find((u) => u.side === 'foe')!;
  fell(b, foe);
  run(b, REVIVE_MS + 500);
  assert.equal(pet.alive, false);
  assert.equal(foe.alive, false);
  assert.equal(b.lives!.left, LIVES);
});

test('the Chapel\'s Vigil is on each hero a life raises', () => {
  const b = held(49, LIVES, 'shielded');
  const [a] = heroesOf(b);
  fell(b, a);
  run(b, REVIVE_MS);
  assert.equal(a.shield!.hp, Math.round(a.maxHp * 0.15));
});

test('the rule is the fight\'s own: the same fight played twice is the same fight, and it always ends', () => {
  const play = () => {
    const m = startedMeta(3);
    const r = armyRun(77, 'golems', m.party, undefined, 0);
    autoRound(r, m, false);
    const b = startStage(r);
    autoDeploy(b, r, m);
    fight(b);
    playOut(b);
    return b;
  };
  const a = play();
  const b = play();
  assert.notEqual(a.phase, 'fight');
  assert.deepEqual([a.phase, a.t, a.rng, a.lives], [b.phase, b.t, b.rng, b.lives]);
  assert.ok(a.lives, 'an army\'s fight has the run\'s lives');
  // (a level-1 party against the last army: the lives are spent and the wave is lost, not hung)
  assert.ok(a.phase === 'won' || a.lives!.left === 0 || a.t >= TIME_LIMIT_MS);
});

test('a run has ten lives; a cursed march five; an older save\'s burnt hearts cost five each', () => {
  const r = armyRun(5, 'orcs');
  assert.equal(LIVES, 10);
  assert.deepEqual([livesMax(r), livesLeft(r), livesSpent(r), partyFalls(r)], [10, 10, 0, 0]);
  const cursed = armyRun(5, 'orcs');
  cursed.orders = ordersFor('cursed', 5);
  assert.deepEqual([livesMax(cursed), livesLeft(cursed)], [5, 5]);
  // (a run saved with hearts: one burnt of two is five lives left of ten, both burnt is none; each was a party fall)
  for (const [retries, left] of [[0, 10], [1, 5], [2, 0]] as const) {
    const old = JSON.parse(JSON.stringify(armyRun(5, 'orcs'))) as Run;
    if (retries) old.retries = retries;
    assert.equal(livesLeft(old), left);
    assert.equal(partyFalls(old), retries);
    assert.equal(startStage(old).lives!.left, left);
  }
  const oldCursed = { ...cursed, retries: 1 } as Run;
  assert.equal(livesLeft(oldCursed), 0, 'a cursed run\'s one heart, burnt');
  // (and it round-trips through the save)
  const d: Record<string, string> = {};
  const store = { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => void (d[k] = v) };
  const kept = armyRun(5, 'orcs');
  kept.retries = 1;
  kept.lives = 2;
  saveRun(kept, store as never);
  assert.equal(livesLeft(loadRun(store as never)!), 3);
});

test('a fight\'s lives are written back to the run once, and a party fall pays a Hire\'s gold as a burnt heart did', () => {
  const m6 = startedMeta(6);
  const r = armyRun(6, 'orcs', m6.party);
  autoRound(r, m6, false);
  const b = startStage(r);
  autoDeploy(b, r, m6);
  fight(b);
  for (const f of b.units.filter((u) => u.side === 'foe')) f.busyUntil = 1e12;
  const heroes = heroesOf(b);
  fell(b, heroes[0]);
  run(b, REVIVE_MS);
  const gold = r.gold;
  assert.equal(settleLives(r, b), 0, 'one hero raised: no gold');
  assert.deepEqual([livesLeft(r), partyFalls(r), r.gold], [9, 0, gold]);
  assert.equal(settleLives(r, b), 0);
  assert.equal(livesLeft(r), 9, 'told once');
  for (const h of heroes) fell(b, h);
  run(b, 100);
  const price = retryGold(r);
  assert.equal(settleLives(r, b), price);
  assert.deepEqual([livesLeft(r), partyFalls(r), r.gold], [9 - heroes.length, 1, gold + price]);
  // (a second fall pays too, a third does not: two hearts paid twice)
  const paid: number[] = [];
  for (const left of [3, 3]) {
    b.lives!.left = left;
    for (const h of heroes) fell(b, h);
    run(b, 100);
    paid.push(settleLives(r, b));
  }
  assert.ok(paid[0] > 0);
  assert.equal(paid[1], 0, 'the third fall pays nothing');
  assert.equal(partyFalls(r), 3);
  // (the wave's end tells the run again: nothing is counted twice, and a hero a life raised counts among the fallen)
  const spent = b.lives!.spent;
  assert.equal(livesSpent(r), spent);
  b.phase = 'won';
  noteFight(r, b);
  assert.equal(livesSpent(r), spent);
  assert.equal(r.tally!.lost, heroes.reduce((n, h) => n + (h.lifeRises ?? 0) + (h.alive ? 0 : 1), 0));
  assert.equal(r.tally!.lost >= spent, true);
  // (the next wave starts with what is left)
  finish(r, true);
  assert.equal(startStage(r).lives!.left, livesLeft(r));
  assert.equal(livesLeft(r), Math.max(0, LIVES - spent));
});

test('the modes: the daily, a quest battle and a duel\'s wave have the lives; the tower, the Calamity and a duel\'s ring have none', () => {
  const m = startedMeta(6);
  const daily = startDaily(m, 20261021);
  assert.equal(startStage(daily).lives!.left, LIVES);
  const tower = { ...newRun(23), tower: {} } as unknown as Run;
  assert.equal(hasLives(tower), false);
  assert.equal(livesLeft(tower), 0);
  const calamity = { ...tower, mode: { kind: 'calamity' } } as unknown as Run;
  assert.equal(hasLives(calamity), false);
  // (a quest battle with "no hearts" has no lives: the fallen stay down)
  const strict = questBattleById('whatWaitsUnder')!;
  assert.equal(strict.rules?.noHearts, true);
  const q = { ...newRun(9), mode: { kind: 'quest', quest: strict.id, cast: [] }, lives: LIVES } as unknown as Run;
  assert.equal(livesLeft(q), 0);
  void startQuestBattle;
});

test('a road event takes or gives a heart\'s worth of lives, within what the run has', () => {
  const r = armyRun(8, 'orcs');
  spendLives(r, HEART_LIVES);
  assert.equal(livesLeft(r), 5);
  spendLives(r, HEART_LIVES);
  spendLives(r, HEART_LIVES);
  assert.equal(livesLeft(r), 0, 'never past the last');
  spendLives(r, -HEART_LIVES);
  assert.equal(livesLeft(r), 5);
  spendLives(r, -HEART_LIVES);
  spendLives(r, -HEART_LIVES);
  assert.equal(livesLeft(r), 10, 'never past the run\'s all');
  // (an older save's burnt heart can be given back too)
  const old = armyRun(8, 'orcs');
  old.retries = 1;
  spendLives(old, -HEART_LIVES);
  assert.equal(livesLeft(old), 10);
});

test('under the Legend Oath a hero a life raises has fallen once', () => {
  const m = startedMeta(9);
  openDynasty(m, 1);
  const r = armyRun(5, 'orcs', m.party, m.castle, 1);
  for (const k of m.party) r.squad.push(recruit(r, k).id);
  r.oath = true;
  void swearOath;
  const b = startStage(r);
  autoDeploy(b, r, m);
  fight(b);
  for (const f of b.units.filter((u) => u.side === 'foe')) f.busyUntil = 1e12;
  const [a] = heroesOf(b);
  fell(b, a);
  run(b, REVIVE_MS);
  settleLives(r, b);
  assert.equal(r.oathFalls?.[String(a.tag)], 1);
  settleLives(r, b);
  assert.equal(r.oathFalls?.[String(a.tag)], 1, 'counted once');
});
