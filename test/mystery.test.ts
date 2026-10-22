import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseOption, drawEvent, MYSTERY_KINDS, TOWER_EVENT_KINDS, type EventKind } from '../src/sim/events';
import { applyMystery, IMP_ODDS, type MysteryAct } from '../src/sim/mystery';
import { startBattle } from '../src/sim/battle';
import { hpShare, hurtParty } from '../src/sim/health';
import { makeGear } from '../src/sim/gear';
import { GREAT_RELIC_IDS, RELICS, RELIC_IDS, relicEffects } from '../src/sim/relics';
import { newMeta } from '../src/sim/meta';
import { towerRun } from '../src/sim/modes';
import { boostOf, startStage, type Run } from '../src/sim/run';
import { clearNode, finishMystery, finishTower, inBattle, takeXp } from '../src/sim/tower';

/** A tower run standing on a mystery floor whose card is `kind`'s. */
function onFloor(kind: EventKind, seed = 3, floor = 4): Run {
  const run = towerRun(seed, newMeta(1));
  run.stage = floor;
  run.tower!.cur = { id: 0, kind: 'mystery' };
  run.event = drawEvent(run, floor, [kind]);
  run.gold = 500;
  return run;
}
const pick = (run: Run, label: RegExp) => run.event!.options.findIndex((o) => label.test(o.label));
const take = (run: Run, label: RegExp) => {
  const i = pick(run, label);
  assert.ok(i >= 0, `an option ${label}`);
  return chooseOption(run, i)!;
};
const act = (run: Run, label: RegExp): MysteryAct => {
  const fx = run.event!.options[pick(run, label)].effect;
  assert.equal(fx.t, 'mystery');
  return (fx as { act: MysteryAct }).act;
};

test('eleven new mystery events join the tower\'s pool, each with two to four options', () => {
  assert.equal(MYSTERY_KINDS.length, 11);
  for (const k of MYSTERY_KINDS) assert.ok(TOWER_EVENT_KINDS.includes(k));
  for (const k of MYSTERY_KINDS)
    for (let seed = 1; seed <= 20; seed++) {
      const run = onFloor(k, seed, 2 + seed);
      const ev = run.event!;
      assert.equal(ev.kind, k);
      assert.ok(ev.options.length >= 2 && ev.options.length <= 4, `${k}: ${ev.options.length}`);
      assert.ok(ev.title && ev.text && ev.options.every((o) => o.label && o.text));
      assert.ok(ev.options.some((o) => o.effect.t === 'leave'), `${k} can be left`);
    }
});

test('every event is the same from the same seed, and every option can be taken without breaking the run', () => {
  for (const k of MYSTERY_KINDS)
    for (let seed = 1; seed <= 12; seed++) {
      const a = onFloor(k, seed).event!;
      assert.deepEqual(a, onFloor(k, seed).event!, `${k} seed ${seed}`);
      for (let i = 0; i < a.options.length; i++) {
        const run = onFloor(k, seed);
        const line = chooseOption(run, i);
        assert.equal(typeof line, 'string', `${k} option ${i}`);
        assert.ok(run.roster.length >= 1 && run.squad.length >= 1);
        assert.ok(run.gold >= 0);
        assert.ok(!Number.isNaN(run.gold));
        for (const h of run.roster) assert.ok(hpShare(run, h.id) > 0 && hpShare(run, h.id) <= 1);
      }
    }
});

test('the events join the draw: a long climb meets them all, and the old kinds are still there', () => {
  const run = towerRun(9, newMeta(1));
  const seen = new Set<string>();
  for (let floor = 1; floor < 600; floor++) seen.add(drawEvent(run, floor, TOWER_EVENT_KINDS).kind);
  assert.equal(seen.size, TOWER_EVENT_KINDS.length);
});

test('legendary relics are kept out of the ordinary draws and each does something', () => {
  assert.equal(GREAT_RELIC_IDS.length, 4);
  for (const id of GREAT_RELIC_IDS) {
    assert.ok(!RELIC_IDS.includes(id));
    assert.ok(RELICS[id].text.startsWith('LEGENDARY'));
    assert.ok(Object.keys(relicEffects([id])).length > 0);
  }
  assert.equal(RELIC_IDS.length, 12);
});

test('black altar: a hero is lost for good and a legendary relic is gained', () => {
  const run = onFloor('blackAltar');
  run.roster.push({ id: 99, kind: 'wizard', grade: 1 });
  run.event = drawEvent(run, 4, ['blackAltar']);
  const heroes = run.roster.length;
  const a = act(run, /^Offer/);
  assert.equal(a.k, 'sacrifice');
  const line = take(run, /^Offer/);
  assert.equal(run.roster.length, heroes - 1);
  assert.ok(run.squad.length >= 1 && run.squad.every((id) => run.roster.some((h) => h.id === id)));
  assert.ok(run.relics!.some((id) => GREAT_RELIC_IDS.includes(id)));
  assert.ok(line.includes('Sun Crown') || line.includes('Dragon Heart') || line.includes('Storm Ring') || line.includes('Void Lens'));
  assert.equal(run.event, undefined);
});

test('black altar: the lost hero\'s gear goes back to the pack, and a lone hero is never offered', () => {
  const run = onFloor('blackAltar');
  const a = act(run, /^Offer/) as Extract<MysteryAct, { k: 'sacrifice' }>;
  run.roster.find((h) => h.id === a.hero)!.gear = { weapon: makeGear(77, 'weapon', 2) };
  chooseOption(run, pick(run, /^Offer/));
  assert.ok(run.items!.some((g) => g.id === 77));
  const lone = onFloor('blackAltar');
  lone.roster = lone.roster.slice(0, 1);
  lone.squad = [lone.roster[0].id];
  lone.event = drawEvent(lone, 4, ['blackAltar']);
  assert.equal(pick(lone, /^Offer/), -1);
  assert.equal(lone.roster.length, 1);
});

test('gambling imp: a win pays about double, a loss is the stake; the roll is fixed with the card, and the odds are near 46%', () => {
  let wins = 0;
  let n = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const run = onFloor('imp', seed);
    const a = act(run, /^A small/) as Extract<MysteryAct, { k: 'bet' }>;
    const stake = run.event!.options[pick(run, /^A small/)].cost;
    const before = run.gold;
    take(run, /^A small/);
    assert.equal(run.gold, before - stake + (a.win ? a.n : 0));
    if (a.win) assert.ok(a.n >= stake * 2 && a.n <= stake * 2.4);
    n++;
    if (a.win) wins++;
  }
  assert.ok(Math.abs(wins / n - IMP_ODDS) < 0.09, `${wins}/${n}`);
  const poor = onFloor('imp');
  poor.gold = 0;
  assert.equal(chooseOption(poor, pick(poor, /^A big/)), null, 'cannot stake what you do not have');
});

test('prisoner: freeing him adds a hero and hurts the party; robbing him pays gold', () => {
  const run = onFloor('prisoner', 5);
  const heroes = run.roster.length;
  const squad = run.squad.length;
  const a = act(run, /^Free/) as Extract<MysteryAct, { k: 'free' }>;
  take(run, /^Free/);
  assert.equal(run.roster.length, heroes + 1);
  assert.equal(run.squad.length, squad + 1);
  assert.ok(run.roster.some((h) => h.kind === a.kind));
  for (const h of run.roster.slice(0, heroes)) assert.ok(hpShare(run, h.id) < 1);
  const rob = onFloor('prisoner', 5);
  const gold = rob.gold;
  take(rob, /^Rob/);
  assert.ok(rob.gold > gold);
  assert.equal(rob.roster.length, heroes);
});

test('fountain: a clean drink heals everyone, a foul one poisons one hero; the flask is safe', () => {
  let pure = 0;
  let foul = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const run = onFloor('fountain', seed);
    hurtParty(run, 0.5);
    const a = act(run, /^Drink/) as Extract<MysteryAct, { k: 'drink' }>;
    take(run, /^Drink/);
    if (a.pure) {
      pure++;
      for (const h of run.roster) assert.ok(Math.abs(hpShare(run, h.id) - 1) < 1e-9, 'healed 50% from half');
    } else {
      foul++;
      const worse = run.roster.filter((h) => hpShare(run, h.id) < 0.5);
      assert.equal(worse.length, 1);
      assert.equal(worse[0].id, a.hero);
    }
  }
  assert.ok(pure > 10 && foul > 5, `${pure} clean, ${foul} foul`);
  const run = onFloor('fountain');
  hurtParty(run, 0.5);
  take(run, /^Fill/);
  for (const h of run.roster) assert.ok(Math.abs(hpShare(run, h.id) - 0.65) < 1e-9);
});

test('forge: reforge raises a piece a tier for gold, or melt it for gold; with no gear, hammer out a new piece', () => {
  const run = onFloor('forge');
  run.items = [makeGear(40, 'weapon', 1)];
  run.event = drawEvent(run, 4, ['forge']);
  const before = run.gold;
  const cost = run.event!.options[pick(run, /^Reforge/)].cost;
  take(run, /^Reforge/);
  assert.equal(run.gold, before - cost);
  assert.equal(run.items![0].id, 40);
  assert.equal(run.items![0].tier, 2);
  assert.equal(run.items![0].atk, makeGear(40, 'weapon', 2).atk);
  const melt = onFloor('forge');
  melt.items = [makeGear(41, 'armour', 2)];
  melt.event = drawEvent(melt, 4, ['forge']);
  const gold = melt.gold;
  take(melt, /^Melt/);
  assert.equal(melt.items!.length, 0);
  assert.ok(melt.gold > gold);
  // (worn gear is found too, and kept in its slot when reforged)
  const worn = onFloor('forge');
  worn.roster[0].gear = { charm: makeGear(42, 'charm', 1) };
  worn.event = drawEvent(worn, 4, ['forge']);
  take(worn, /^Reforge/);
  assert.equal(worn.roster[0].gear!.charm!.tier, 2);
  const none = onFloor('forge');
  assert.equal(none.items, undefined);
  take(none, /^Hammer/);
  assert.equal(none.items!.length, 1);
});

test('forge: a piece at the top tier can only be melted', () => {
  const run = onFloor('forge');
  run.items = [makeGear(50, 'weapon', 3)];
  run.event = drawEvent(run, 4, ['forge']);
  assert.equal(pick(run, /^Reforge/), -1);
  assert.ok(pick(run, /^Melt/) >= 0);
});

test('trainer: gold buys XP for one hero kind, kept for the page to add to the meta', () => {
  const run = onFloor('trainer', 6);
  const a = act(run, /^Teach/) as Extract<MysteryAct, { k: 'lesson' }>;
  const cost = run.event!.options[pick(run, /^Teach/)].cost;
  const gold = run.gold;
  take(run, /^Teach/);
  assert.equal(run.gold, gold - cost);
  assert.deepEqual(takeXp(run), { [a.kind]: a.xp });
  assert.equal(takeXp(run), null, 'taken once');
});

test('shrine of blood and iron: max hp for attack, for one hero or all', () => {
  const run = onFloor('oath');
  const before = run.roster.map((h) => boostOf(h));
  const a = act(run, /^Swear it for the/) as Extract<MysteryAct, { k: 'oath' }>;
  take(run, /^Swear it for the/);
  const after = run.roster.map((h) => boostOf(h));
  run.roster.forEach((h, i) => {
    if (h.id === a.hero) {
      assert.ok(after[i].hp! < before[i].hp! && after[i].atk! > before[i].atk!);
    } else assert.deepEqual(after[i], before[i]);
  });
  const all = onFloor('oath');
  const was = all.roster.map((h) => boostOf(h));
  take(all, /^Swear it for everyone/);
  all.roster.forEach((h, i) => assert.ok(boostOf(h).hp! < was[i].hp! && boostOf(h).atk! > was[i].atk!));
  for (let i = 0; i < 20; i++) applyMystery(all, { k: 'oath', hero: 0, hp: 0.2, atk: 0.1 });
  for (const h of all.roster) assert.ok(boostOf(h).hp! >= 0.5, 'hp is never bumped away');
});

test('mimic chest: opening it brings a fight, and winning pays a great chest', () => {
  const run = onFloor('mimic', 2, 6);
  take(run, /^Open/);
  assert.equal(run.event, undefined);
  assert.equal(inBattle(run), false, 'made when the card closes');
  finishMystery(run);
  assert.equal(inBattle(run), true);
  const spec = run.tower!.cur!.fight!;
  assert.ok(spec.mimic && spec.band.length >= 2);
  assert.equal(run.tower!.cur!.kind, 'mystery');
  finishMystery(run);
  assert.equal(run.stage, 6, 'a node with a fight is not cleared by closing the card again');
  const b = startStage(run);
  assert.equal(b.units.filter((u) => u.side === 'foe').length, spec.band.length);
  const gold = run.gold;
  const relics = run.relics?.length ?? 0;
  const items = run.items?.length ?? 0;
  finishTower(run, b, true);
  assert.equal(run.stage, 7);
  assert.equal(run.tower!.cur, undefined);
  assert.ok(run.gold - gold >= 40 + 8 * 6);
  assert.equal(run.relics!.length, relics + 1);
  assert.ok(run.items!.length > items);
  assert.ok(run.found!.some((l) => l.includes('mimic')));
  // (losing it ends the run)
  const lost = onFloor('mimic', 2, 6);
  take(lost, /^Open/);
  finishMystery(lost);
  finishTower(lost, startBattle(1), false);
  assert.equal(lost.over, true);
});

test('mimic chest: prodding it is a fixed gamble', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const run = onFloor('mimic', seed);
    const a = act(run, /^Prod/) as Extract<MysteryAct, { k: 'prod' }>;
    const gold = run.gold;
    take(run, /^Prod/);
    if (a.real) {
      assert.equal(run.gold, gold + a.gold);
      assert.ok(run.items!.some((g) => g.id === a.gear.id));
    } else for (const h of run.roster) assert.ok(hpShare(run, h.id) < 1);
    assert.equal(inBattle(run), false);
  }
});

test('black book: a lasting attack bump or a hurt party, fixed with the card; the shelves are safe gold', () => {
  let good = 0;
  let bad = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const run = onFloor('tome', seed);
    const a = act(run, /^Read/) as Extract<MysteryAct, { k: 'tome' }>;
    const before = boostOf(run.roster[0]).atk!;
    take(run, /^Read/);
    if (a.good) {
      good++;
      assert.ok(boostOf(run.roster[0]).atk! > before);
    } else {
      bad++;
      assert.ok(hpShare(run, run.roster[0].id) < 1);
    }
  }
  assert.ok(good > 8 && bad > 4);
  const shelves = onFloor('tome');
  const gold = shelves.gold;
  take(shelves, /^Search/);
  assert.ok(shelves.gold > gold);
});

test('knight\'s cairn: gear now and tougher foes next, or a healed party', () => {
  const run = onFloor('cairn');
  const items = run.items?.length ?? 0;
  take(run, /^Take the/);
  assert.equal(run.items!.length, items + 1);
  assert.equal(run.buff!.foes, 1.25);
  run.tower!.cur = { id: 0, kind: 'fight', fight: { band: ['skeleton'], stage: { foes: { hp: 1, atk: 1 } } } };
  const hard = startStage(run).units.find((u) => u.side === 'foe')!;
  run.buff = undefined;
  const easy = startStage(run).units.find((u) => u.side === 'foe')!;
  assert.ok(hard.maxHp > easy.maxHp);
  const kind = onFloor('cairn');
  hurtParty(kind, 0.6);
  take(kind, /^Pay/);
  for (const h of kind.roster) assert.ok(Math.abs(hpShare(kind, h.id) - 0.65) < 1e-9);
  assert.equal(kind.buff, undefined);
});

test('bandits: pay, brawl for loot, or sneak (fixed with the card)', () => {
  const pay = onFloor('bandits');
  const toll = pay.event!.options[pick(pay, /^Pay/)].cost;
  const gold = pay.gold;
  take(pay, /^Pay/);
  assert.equal(pay.gold, gold - toll);
  const brawl = onFloor('bandits');
  take(brawl, /^Fight/);
  assert.ok(brawl.gold > gold);
  for (const h of brawl.roster) assert.ok(hpShare(brawl, h.id) < 1);
  let caught = 0;
  let free = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const run = onFloor('bandits', seed);
    const a = act(run, /^Slip/) as Extract<MysteryAct, { k: 'sneak' }>;
    const before = run.gold;
    take(run, /^Slip/);
    if (a.ok) (free++, assert.equal(run.gold, before));
    else (caught++, assert.equal(run.gold, before - a.lose));
  }
  assert.ok(caught > 8 && free > 8);
});

test('a mystery floor is cleared once its card is closed, a mimic\'s only after its fight', () => {
  const run = onFloor('spring' as EventKind);
  take(run, /^Drink/);
  finishMystery(run);
  assert.equal(run.stage, 5);
  const again = onFloor('bandits');
  take(again, /^Pay/);
  finishMystery(again);
  assert.equal(again.tower!.cur, undefined);
  clearNode(again);
});
