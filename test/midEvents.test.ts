// The road's events and the passing cart (MID-EVENTS, `docs/notes/mid-events.md`): the cards between an army's or the daily's waves.
import { relicPriceOf } from '../src/sim/relics';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseOption, drawEvent, EVENT_KINDS, type EventCard } from '../src/sim/events';
import { applyRoad, drawRoad, FOLLOW_KINDS, KEPT_FACES, KEPT_KINDS, kindWeight, OWED_AFTER, pickRoadKind, ROAD_KINDS, scoutReport, type RoadAct, type RoadKind } from '../src/sim/midEvents';
import { gearPrice, HIRE_EXTRA, MARKET_BUYS, POTIONS, relicPrice, rummagePrice, stockMarket } from '../src/sim/market';
import { armyRun, BENCH_MAX, finish, loadRun, MAX_RETRIES, newRun, recruit, saveRun, startStage, summonCost, type Run } from '../src/sim/run';
import { dailyRun } from '../src/sim/modes';
import { makeGear } from '../src/sim/gear';
import { Rng } from '../src/sim/rng';
import { TWISTS } from '../src/sim/twists';
import { autoEvent, eventPick } from '../src/sim/autoplay';

/** An army run with two heroes, at a stage (its gaps follow even stages). */
function army(seed = 7, id = 'orcs'): Run {
  const run = armyRun(seed, id);
  recruit(run, 'knight');
  recruit(run, 'archer');
  run.squad = run.roster.map((h) => h.id);
  return run;
}

/** A road card of a kind, set as the run's event. */
function withCard(run: Run, kind: RoadKind, stage = 4): EventCard {
  run.event = drawRoad(run, stage, kind, new Rng(99 + stage));
  return run.event;
}

/** The first army run (by seed) whose first gap is a passing cart. */
function marketRun(): Run {
  for (let seed = 1; seed < 500; seed++) {
    const run = army(seed);
    const ev = drawEvent(run, 2);
    if (ev.kind === 'merchant') {
      run.event = ev;
      return run;
    }
  }
  throw new Error('no market');
}

const road = (o: { effect: { t: string } }) => (o.effect as unknown as { act: RoadAct }).act;

test('an army run and the daily draw the road’s kinds too; an ordinary run draws only the old five', () => {
  const kinds = new Set<string>();
  for (let seed = 1; seed < 80; seed++) kinds.add(drawEvent(army(seed), 2).kind);
  for (const k of ROAD_KINDS) assert.ok(kinds.has(k), k);
  for (const k of EVENT_KINDS) assert.ok(kinds.has(k), k);
  const daily = new Set<string>();
  for (let d = 1; d < 40; d++) daily.add(drawEvent(dailyRun(20260100 + d), 2).kind);
  assert.ok([...daily].some((k) => (ROAD_KINDS as readonly string[]).includes(k)));
  for (let s = 2; s < 80; s += 2) assert.ok(EVENT_KINDS.includes(drawEvent(newRun(11), s).kind));
});

test('a card is the same from the same run; no road card, cart or old kind comes twice in a run, and a shrine or chest that does wears another face', () => {
  assert.deepEqual(drawEvent(army(5), 4), drawEvent(army(5), 4));
  let faces = 0;
  for (let seed = 1; seed < 30; seed++) {
    const run = army(seed);
    const seen: string[] = [];
    const titles = new Map<string, string[]>();
    for (let stage = 2; stage <= 30; stage += 2) {
      const ev = drawEvent(run, stage);
      if (KEPT_KINDS.includes(ev.kind)) titles.set(ev.kind, [...(titles.get(ev.kind) ?? []), ev.title]);
      else if (!(FOLLOW_KINDS as readonly string[]).includes(ev.kind)) seen.push(ev.kind);
    }
    assert.equal(new Set(seen).size, seen.length, `seed ${seed}: ${seen.join()}`);
    for (const [kind, ts] of titles) {
      assert.equal(new Set(ts.slice(0, 1 + KEPT_FACES[kind].length)).size, Math.min(ts.length, 1 + KEPT_FACES[kind].length), `${kind}: ${ts.join()}`);
      if (ts.length > 1) faces++;
    }
  }
  assert.ok(faces > 0);
});

test('a shrine or a chest is drawn just where the old five put one, so the greedy player’s free blessings come as often as ever', () => {
  for (let seed = 1; seed < 40; seed++) {
    const run = army(seed);
    const old = newRun(seed);
    old.seed = run.seed;
    for (let stage = 2; stage <= 14; stage += 2) {
      const a = drawEvent(run, stage);
      const b = drawEvent(old, stage);
      if (KEPT_KINDS.includes(b.kind) && !run.road?.owed?.length) assert.equal(a.kind, b.kind, `seed ${seed} stage ${stage}`);
      if (KEPT_KINDS.includes(a.kind)) assert.deepEqual(a.options.map((o) => o.effect.t), b.options.map((o) => o.effect.t));
    }
  }
});

test('the land and the army weight the draw: deserters are rare among the dead, the witch is common in the woods', () => {
  assert.ok(kindWeight(army(1, 'undead'), 'deserters') < kindWeight(army(1, 'orcs'), 'deserters'));
  assert.ok(kindWeight(army(1, 'wildwood'), 'witch') > kindWeight(army(1, 'orcs'), 'witch'));
  assert.ok(kindWeight(army(1), 'merchant') > kindWeight(army(1), 'shrine'));
});

test('every road card has two or three options, and every option resolves and closes the card', () => {
  for (const kind of [...ROAD_KINDS, ...FOLLOW_KINDS]) {
    for (let i = 0; i < 3; i++) {
      const run = army(3 + i);
      run.gold = 999;
      run.items = [makeGear(90, 'weapon', 1)];
      if (kind === 'ladyDue') run.road = { owed: [{ kind: 'ladyDue', due: 4, relic: 'banner' }] };
      if (kind === 'refugeesReturn') run.road = { owed: [{ kind: 'refugeesReturn', due: 4, big: true }] };
      const card = withCard(run, kind as RoadKind);
      assert.ok(card.options.length >= 2 && card.options.length <= 3, `${kind}: ${card.options.length}`);
      for (const o of card.options) assert.ok(o.label && o.text && o.cost >= 0, kind);
      assert.ok(typeof chooseOption(run, i % card.options.length) === 'string', kind);
      assert.equal(run.event, undefined, kind);
    }
  }
});

test('the scout names the next three waves', () => {
  const run = army();
  const line = scoutReport(run, 4);
  assert.match(line, /^Wave 5: .* · Wave 6: .* · Wave 7: /);
  assert.match(scoutReport(run, 13), /Wave 15 \(a boss\)/);
});

test('a twist from the road lies over the next fight only', () => {
  const run = army();
  withCard(run, 'ambush');
  const spring = run.event!.options.findIndex((o) => road(o)?.buff?.twist === 'ambush');
  chooseOption(run, spring);
  assert.equal(run.buff?.twist, 'ambush');
  const b = startStage(run);
  assert.deepEqual(b.twist, TWISTS.ambush.fx);
  const gold = run.gold;
  const purse = run.buff!.gold!;
  finish(run, true);
  assert.ok(run.gold > gold + purse);
  assert.equal(run.buff?.twist, undefined);
  assert.equal(startStage(run).twist, undefined);
});

test('the Pale Lady comes back for her due two gaps on, and refusing her curses the next fight', () => {
  const run = army();
  withCard(run, 'pact', 2);
  chooseOption(run, 0);
  assert.equal(run.relics?.length, 1);
  assert.deepEqual(run.road?.owed?.map((o) => [o.kind, o.due]), [['ladyDue', 2 + OWED_AFTER]]);
  assert.notEqual(pickRoadKind(run, 4), 'ladyDue');
  assert.equal(pickRoadKind(run, 6), 'ladyDue');
  const due = drawEvent(run, 6);
  assert.equal(due.kind, 'ladyDue');
  assert.equal(run.road?.owed?.length, 0, 'the debt is the card now');
  run.event = due;
  const give = due.options.findIndex((o) => !!road(o)?.drop);
  chooseOption(run, give);
  assert.equal(run.relics?.length, 0);
  const again = army();
  again.road = { owed: [{ kind: 'ladyDue', due: 4 }] };
  const card = withCard(again, 'ladyDue');
  chooseOption(again, card.options.length - 1);
  assert.equal(again.buff?.twist, 'cursed');
  assert.equal(again.buff?.foes, 1.2);
});

test('the refugees remember a shared purse: a burned heart kindles again', () => {
  const run = army();
  run.gold = 999;
  withCard(run, 'refugees', 2);
  chooseOption(run, 0);
  run.retries = 1;
  assert.equal(pickRoadKind(run, 6), 'refugeesReturn');
  run.event = drawEvent(run, 6);
  chooseOption(run, 0);
  assert.equal(run.retries, 0);
});

test('the cursed crown burns a heart for a legendary relic, never past the last', () => {
  const run = army();
  withCard(run, 'crown');
  chooseOption(run, 0);
  assert.equal(run.retries, 1);
  assert.equal(run.relics?.length, 1);
  run.retries = MAX_RETRIES;
  withCard(run, 'crown', 6);
  chooseOption(run, 0);
  assert.equal(run.retries, MAX_RETRIES);
  assert.equal(run.buff?.foes, 1.3);
});

test('a duel, a gamble and the forge settle what was rolled with the card', () => {
  const run = army();
  const hero = run.roster[0];
  withCard(run, 'duel');
  const act = road(run.event!.options[0]);
  chooseOption(run, 0);
  assert.deepEqual(hero.bump, { hp: act.bump!.hp, atk: act.bump!.atk });
  // (a run on the old rules, saved before RUN-GEAR: its simple gear)
  const forge = army();
  delete forge.real;
  forge.gold = 999;
  forge.items = [makeGear(50, 'armour', 1)];
  withCard(forge, 'temper');
  chooseOption(forge, 0);
  assert.equal(forge.items[0].tier, 2);
  assert.equal(applyRoad(army(), { line: 'x', lose: 50 }), 'x');
});

test('the passing cart: four to six wares within their prices, a sellsword of the party, stock by seed and stage', () => {
  for (let seed = 1; seed < 40; seed++) {
    for (const stage of [2, 6, 12]) {
      const run = army(seed);
      const wares = stockMarket(run, stage);
      assert.ok(wares.length >= 5 && wares.length <= 6);
      for (const w of wares) {
        const fx = w.effect;
        if (fx.t === 'gear') assert.equal(w.cost, gearPrice(fx.gear, stage));
        // (RELICS-2: a Rare costs half as much again)
        else if (fx.t === 'relic') assert.equal(w.cost, relicPriceOf(fx.id, relicPrice(stage)));
        else if (fx.t === 'hire') {
          assert.equal(w.cost, summonCost(run) + HIRE_EXTRA);
          assert.ok(run.pool!.includes(fx.kind));
        } else if (fx.t === 'buff') assert.ok(POTIONS.some((p) => p.cost(stage) === w.cost));
        else assert.fail(fx.t);
        assert.ok(w.cost > 0 && w.cost <= (fx.t === 'relic' ? 225 : 150), `${w.label} ${w.cost}`);
      }
      assert.equal(new Set(wares.filter((w) => w.effect.t === 'gear').map((w) => (w.effect as { gear: { slot: string } }).gear.slot)).size, 2);
    }
  }
  assert.notDeepEqual(stockMarket(army(1), 2).map((w) => w.label), stockMarket(army(1), 4).map((w) => w.label));
  // (an army further on sells a better tier)
  const far = armyRun(1, 'golems');
  assert.ok((stockMarket(far, 2)[0].effect as { gear: { tier: number } }).gear.tier > (stockMarket(army(1), 2)[0].effect as { gear: { tier: number } }).gear.tier);
});

test('the cart sells a few wares a visit, rummages once, and stays open until left', () => {
  const run = marketRun();
  run.gold = 2000;
  const ev = run.event!;
  assert.equal(ev.buys, MARKET_BUYS);
  const wares = () => ev.options.map((o, i) => [o, i] as const).filter(([o]) => o.effect.t !== 'reroll' && o.effect.t !== 'leave' && !o.done);
  const rummage = ev.options.findIndex((o) => o.effect.t === 'reroll');
  assert.equal(ev.options[rummage].cost, rummagePrice(ev.stage));
  const before = ev.options.map((o) => o.label).join();
  assert.ok(chooseOption(run, rummage));
  assert.notEqual(ev.options.map((o) => o.label).join(), before);
  assert.equal(chooseOption(run, rummage), null, 'once a visit');
  for (let n = 0; n < MARKET_BUYS; n++) assert.ok(chooseOption(run, wares()[0][1]), `buy ${n}`);
  assert.equal(ev.buys, 0);
  assert.equal(chooseOption(run, wares()[0][1]), null, 'the pedlar is packing up');
  assert.ok(run.event, 'still open');
  assert.ok(chooseOption(run, ev.options.length - 1) !== null);
  assert.equal(run.event, undefined);
});

test('a sellsword with no room on the bench is paid back', () => {
  const run = army();
  while (run.roster.length - run.squad.length < BENCH_MAX) recruit(run, 'knight');
  run.gold = 500;
  run.event = { kind: 'merchant', stage: 2, title: '', text: '', options: [{ label: 'x', text: '', cost: 40, effect: { t: 'hire', kind: 'archer' } }], buys: 3 };
  const n = run.roster.length;
  assert.ok(chooseOption(run, 0));
  assert.equal(run.gold, 500);
  assert.equal(run.roster.length, n);
});

test('the greedy player leaves a road card alone, but on a card with no way off takes the first free choice, as the page would make it', () => {
  const run = army();
  assert.equal(eventPick(withCard(run, 'pact').options, run.gold), -1);
  autoEvent(run);
  assert.equal(run.event, undefined);
  assert.equal(run.relics, undefined);
  withCard(run, 'ambush');
  autoEvent(run);
  assert.equal(run.buff?.twist, 'ambush');
});

test('an older save mid-run loads, its merchant card with no limit, and no road to remember', () => {
  const run = army();
  delete run.road;
  run.event = { kind: 'merchant', stage: 2, title: 'A travelling merchant', text: '', options: [{ label: 'Iron Blade', text: '', cost: 30, effect: { t: 'gear', gear: makeGear(9, 'weapon', 1) } }, { label: 'Leave', text: '', cost: 0, effect: { t: 'leave' } }] };
  const store: Record<string, string> = {};
  saveRun(run, { setItem: (k, v) => void (store[k] = v) });
  const back = loadRun({ getItem: (k) => store[k] ?? null })!;
  back.gold = 100;
  assert.ok(chooseOption(back, 0));
  assert.ok(back.event, 'stays open');
  assert.ok(drawEvent(back, 4));
  assert.equal(back.road?.seen?.length, 1);
});
