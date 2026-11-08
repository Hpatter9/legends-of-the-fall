// The ultimate's showcase (ULT-SHOW, docs/notes/ult-showcase-design.md, `src/ultShowRules.ts`): when the long version plays (the first use, every
// Nth after, never with Shorter ultimates), the x1 rule, the queue's show phase, and the pilot's three plans read from real casts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, ULT_LEVEL, keyOf, ultimateOf } from '../src/sim/abilities';
import { ULT_MOMENT, UltQueue } from '../src/ultMomentRules';
import { ALL_HEROES } from '../src/sim/units';
import { hasShowcase, momentSpeed, noteSeen, planShow, posesAt, readCast, seenOf, SHOW, SHOWCASES, showDue, wantsShow, type ShowPlan } from '../src/ultShowRules';
import { parseSettings } from '../src/settings';

test('the long version plays on the first use and every Nth after it, never with Shorter ultimates', () => {
  // (with 10: the 1st, 11th, 21st uses; seen counts the full moments already played)
  const due = [...Array(25).keys()].filter((seen) => showDue(seen, 10)).map((seen) => seen + 1);
  assert.deepEqual(due, [1, 11, 21]);
  assert.deepEqual([...Array(12).keys()].filter((seen) => showDue(seen, 0)), [0]);
  assert.ok(wantsShow('kunoichi', { full: true, short: false, seen: 0, every: 10 }));
  assert.ok(!wantsShow('kunoichi', { full: true, short: true, seen: 0, every: 10 }), 'Shorter ultimates: never');
  assert.ok(!wantsShow('kunoichi', { full: false, short: false, seen: 0, every: 10 }), 'the short scene (or Auto): never');
  assert.ok(!wantsShow('skeleton', { full: true, short: false, seen: 0, every: 10 }), 'a kind with no showcase');
  const m: { ultSeen?: Record<string, number> } = {};
  noteSeen(m, 'kunoichi');
  noteSeen(m, 'kunoichi');
  assert.equal(seenOf(m, 'kunoichi'), 2);
  assert.equal(seenOf(m, 'wizard'), 0);
});

test('the settings: Shorter ultimates off and every 10th by default; a wrong count falls back', () => {
  const d = parseSettings(null);
  assert.equal(d.ultShort, false);
  assert.equal(d.ultEvery, 10);
  assert.equal(parseSettings(JSON.stringify({ ultEvery: 5, ultShort: true })).ultEvery, 5);
  assert.equal(parseSettings(JSON.stringify({ ultEvery: 7 })).ultEvery, 10);
  assert.equal(parseSettings(JSON.stringify({ ultEvery: 0 })).ultEvery, 0);
});

test('the x1 rule: a full moment or call plays at x1, the short versions keep the speed', () => {
  assert.equal(momentSpeed(2, true), 1);
  assert.equal(momentSpeed(3, true), 1);
  assert.equal(momentSpeed(2, false), 2);
});

test('a showcase holds the battle and the effects after the opening, and its blow lands as it ends', () => {
  const q = new UltQueue();
  q.push({ unit: 1, kind: 'kunoichi', name: 'Assassinate', shape: 'instant', ms: 0, show: 3000 });
  q.step(ULT_MOMENT.OPEN_MS + 1);
  assert.equal(q.phase, 'show');
  assert.ok(q.holdsBattle && !q.runsEffects);
  assert.equal(q.strikes, 0, 'no blow before the showcase ends');
  assert.equal(Math.round(q.showT!), 1);
  q.step(2998);
  assert.equal(q.phase, 'show');
  q.step(5);
  assert.equal(q.strikes, 1);
  assert.equal(q.phase, 'impact');
  // (a tap skips a showcase to its fade)
  const r = new UltQueue();
  r.push({ unit: 1, kind: 'wizard', name: 'Meteor Swarm', shape: 'delayed', ms: 1500, show: 2000 });
  r.step(ULT_MOMENT.OPEN_MS + 500);
  r.skip();
  assert.equal(r.phase, 'fade');
  assert.equal(r.showT, null);
});

function arena(): Battle {
  const b = startBattle(5);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}

/** Fire `kind`'s ultimate in a small fight; the tick's cast, read as the page reads it, and the plan. */
function fire(kind: string): { b: Battle; me: Unit; plan: ShowPlan; events: BattleEvent[] } {
  const b = arena();
  const me = addUnit(b, kind, 3, 2, { level: ULT_LEVEL });
  const ally = addUnit(b, 'knight', 2, 2, { level: ULT_LEVEL });
  if (kind === 'ilyra' || kind === 'nyxara') ally.hp = Math.round(ally.maxHp * 0.4);
  if (kind === 'nyxara') me.mythic = { memories: [{ at: -4000, allies: [{ id: ally.id, hp: ally.maxHp, u: ally.u, v: ally.v }] }] };
  for (const [u, v] of [[3, 5], [4, 5], [2, 6], [5, 6], [1, 8]]) addUnit(b, 'skeleton', u, v);
  b.autoUlt = true;
  for (let i = 0; i < 400 && b.phase === 'fight'; i++) {
    me.charge2 = CHARGE_MAX;
    const born = b.units.length;
    // (as the page does: where everyone stood before the tick)
    const before = new Map(b.units.map((u) => [u.id, { u: u.u, v: u.v }]));
    const events = stepBattle(b);
    const ult = ultimateOf(me)!;
    if (events.some((e) => e.kind === 'skill' && e.by === me.id && e.name === keyOf(ult))) {
      const unit = (id: number) => b.units.find((u) => u.id === id);
      const origin = (id: number) => before.get(id);
      const touched = b.units.filter((x) => x.alive && x.side !== me.side && x.taunt?.to === me.id).map((x) => x.id);
      const allies = b.units.filter((x) => x.alive && x.side === me.side && x.id !== me.id).map((x) => x.id);
      const plan = planShow(kind, readCast(me, events, b.units.slice(born), unit, origin, touched, allies));
      assert.ok(plan, `${kind}: a plan`);
      return { b, me, plan, events };
    }
  }
  throw new Error(`${kind}: the ultimate never fired`);
}

test('every showcase runs about 4 to 6 s with its opening and fade', () => {
  for (const kind of Object.keys(SHOWCASES)) {
    const { plan } = fire(kind);
    const total = ULT_MOMENT.OPEN_MS + plan.ms + ULT_MOMENT.FADE_MS;
    assert.ok(total >= 4000 && total <= 6000, `${kind}: ${total} ms`);
    if (process.env.SHOW_MS) console.log(kind, total);
  }
});

test("Ayame's showcase: she cuts each foe she struck, in turn, and ends where the sim left her", () => {
  const { me, plan } = fire('kunoichi');
  const struck = plan.cast.hops.flatMap((h) => (h.struck === undefined ? [] : [h.struck]));
  assert.ok(struck.length >= 3, 'she blinks to several foes');
  const cuts = plan.beats.filter((b) => b.kind === 'cut').map((b) => b.foe);
  assert.deepEqual(cuts, struck);
  assert.equal(plan.beats.filter((b) => b.kind === 'vanish').length, plan.cast.hops.length, 'a puff of smoke at every hop');
  const end = posesAt(plan, plan.ms).get(me.id)!;
  assert.deepEqual(end.at, { u: me.u, v: me.v });
  assert.equal(end.alpha, 1);
  // (she stands where she cast from at the start, and each foe stands until its cut, then flinches)
  assert.deepEqual(posesAt(plan, 0).get(me.id)!.at, plan.cast.start);
  const first = struck[0];
  const cutAt = SHOW.LEAD + SHOW.CUT_AT;
  assert.equal(posesAt(plan, cutAt - 1).get(first)!.row, 'idle');
  assert.equal(posesAt(plan, cutAt + 1).get(first)!.row, 'hurt');
});

test("the Wizard's showcase marks each crowd his meteors fall on; the Beastmaster's wolves run in to the tiles they stand on", () => {
  const wiz = fire('wizard');
  const aims = wiz.events.flatMap((e) => (e.kind === 'area' && e.by === wiz.me.id ? [`${e.u},${e.v}`] : []));
  const marks = wiz.plan.beats.flatMap((b) => (b.kind === 'mark' ? [`${b.where.u},${b.where.v}`] : []));
  assert.ok(marks.length > 0);
  assert.deepEqual(marks, [...new Set(aims)]);
  const bm = fire('beastmaster');
  assert.equal(bm.plan.cast.born.length, 4);
  for (const w of bm.plan.cast.born) {
    assert.equal(posesAt(bm.plan, 0).get(w.id)!.alpha, 0, 'not seen before its run');
    const end = posesAt(bm.plan, bm.plan.ms).get(w.id)!;
    const u = bm.b.units.find((x) => x.id === w.id)!;
    assert.deepEqual(end.at, { u: u.u, v: u.v });
    assert.equal(end.alpha, 1);
    assert.equal(end.to, undefined);
  }
});

test('batch 1: each blade is seen to do it, every foe it struck reels, and everyone ends where the sim put them', () => {
  for (const kind of ['mercenary', 'arcBlade', 'samurai', 'lancer', 'minotaur', 'barbarian', 'ninjaMonk', 'buccaneer']) {
    const { b, me, plan } = fire(kind);
    const end = posesAt(plan, plan.ms);
    assert.deepEqual(end.get(me.id)!.at, { u: me.u, v: me.v }, `${kind}: the caster ends on its tile`);
    assert.equal(end.get(me.id)!.to, undefined);
    for (const id of plan.cast.struck) {
      const f = b.units.find((u) => u.id === id)!;
      const track = plan.tracks.get(id);
      assert.ok(track?.some((k) => k.row === 'hurt'), `${kind}: foe ${id} reels`);
      assert.deepEqual(end.get(id)!.at, { u: f.u, v: f.v }, `${kind}: foe ${id} ends on its tile`);
    }
    assert.ok(plan.beats.some((x) => x.kind === 'cut' || x.kind === 'crash'), `${kind}: a blow lands`);
  }
  // (the one cut: the samurai's foes split only after he has sheathed, after the run)
  const sam = fire('samurai').plan;
  const dash = sam.beats.find((x) => x.kind === 'dash')!;
  for (const c of sam.beats.filter((x) => x.kind === 'cut')) assert.ok(c.at > dash.at + 400);
  // (the buccaneer's hooked foes start where they stood before the pull)
  const buc = fire('buccaneer');
  assert.ok(buc.plan.cast.hooks.length >= 1);
  for (const id of buc.plan.cast.hooks) assert.notDeepEqual(posesAt(buc.plan, 0).get(id)!.at, buc.plan.cast.tiles.get(id));
});

test('a cast with nothing of its style\'s shape but foes struck still gets a showcase: its blows on each in turn', () => {
  const cast = readCast({ id: 1, u: 3, v: 2 }, [{ kind: 'hit', by: 1, to: 2, dmg: 10, heavy: true, splash: false, killed: false, src: 'skill' }], [], (id) => (id === 2 ? { u: 3, v: 3 } : undefined));
  const plan = planShow('minotaur', cast)!;
  assert.ok(plan);
  assert.ok(plan.beats.some((x) => x.kind === 'cut' && x.foe === 2));
  assert.equal(planShow('minotaur', readCast({ id: 1, u: 3, v: 2 }, [])), null, 'nothing struck, nothing to show');
});

test('batch 2: the sky marks every aim, each shot is seen at its foe, the net reaches every foe it held; all end where the sim put them', () => {
  for (const kind of ['archer', 'dreadPirate', 'siegeBot', 'lightningMage', 'gunslinger', 'rifleBot', 'dragoon', 'ranger']) {
    const { b, me, events, plan } = fire(kind);
    const end = posesAt(plan, plan.ms);
    assert.deepEqual(end.get(me.id)!.at, { u: me.u, v: me.v }, `${kind}: the caster ends on its tile`);
    if (plan.style === 'sky') {
      const aims = new Set(events.flatMap((e) => (e.kind === 'area' && e.by === me.id ? [`${e.u},${e.v}`] : [])));
      assert.deepEqual(new Set(plan.beats.flatMap((x) => (x.kind === 'mark' ? [`${x.where.u},${x.where.v}`] : []))), aims, kind);
    } else {
      const seen = plan.style === 'shots' ? 'shot' : 'snare';
      for (const id of plan.cast.struck) {
        assert.ok(plan.beats.some((x) => x.kind === seen && x.foe === id), `${kind}: foe ${id} is seen struck`);
        const f = b.units.find((u) => u.id === id)!;
        assert.deepEqual(end.get(id)!.at, { u: f.u, v: f.v }, `${kind}: foe ${id} ends on its tile`);
      }
    }
  }
  // (the dragoon's fire catches along the ground it left alight)
  assert.ok(fire('dragoon').plan.beats.some((x) => x.kind === 'burn'));
});

test('batch 3: each burst reaches every foe it struck or turned on itself, in turn; the shambler sinks and tunnels', () => {
  for (const kind of ['knight', 'paladin', 'yamabushi', 'gorgon', 'juggernaut', 'kraken', 'mummy', 'warlock', 'tyrant', 'reaper']) {
    const { b, me, plan } = fire(kind);
    const reached = [...plan.cast.struck, ...plan.cast.touched];
    assert.ok(reached.length > 0, `${kind}: it reaches someone`);
    const hit = SHOWCASES[kind].hit ?? 'smite';
    const end = posesAt(plan, plan.ms);
    assert.deepEqual(end.get(me.id)!.at, { u: me.u, v: me.v }, `${kind}: the caster ends on its tile`);
    for (const id of reached) {
      assert.ok(plan.beats.some((x) => x.kind === hit && x.foe === id), `${kind}: foe ${id} is reached`);
      const f = b.units.find((u) => u.id === id)!;
      assert.deepEqual(end.get(id)!.at, { u: f.u, v: f.v }, `${kind}: foe ${id} ends on its tile`);
    }
  }
  // (the knight strikes no one: the foes he taunted are what it reaches)
  assert.ok(fire('knight').plan.cast.touched.length > 0);
  const sh = fire('shambler').plan;
  assert.equal(sh.style, 'burrow');
  assert.equal(sh.beats.filter((x) => x.kind === 'tunnel').length, sh.cast.burrow!.path.length + 1);
  assert.equal(posesAt(sh, sh.ms).get(sh.cast.caster)!.alpha, 0, 'he is underground as the fight runs on');
});

test('batches 4 and 5: callers rise or run in, changers change, blessings reach each ally; every hero has a showcase that plays', () => {
  for (const kind of ['druid', 'illusionist', 'priestess', 'werewolf', 'demonSwordsman', 'kitsune', 'karasu', 'timeWitch', 'wanderer', 'satyr', 'samuraiCommander', 'sage', 'cleric', 'peasant', 'wolfBard']) {
    const { b, me, plan } = fire(kind);
    const end = posesAt(plan, plan.ms);
    assert.deepEqual(end.get(me.id)!.at, { u: me.u, v: me.v }, `${kind}: the caster ends on its tile`);
    if (plan.style === 'bless') for (const id of plan.cast.helped) assert.ok(plan.beats.some((x) => x.kind === 'bless' && x.foe === id), `${kind}: ally ${id} blessed`);
    if (plan.style === 'pack') for (const w of plan.cast.born) assert.equal(end.get(w.id)!.alpha, 1, `${kind}: ${w.id} is there at the end`);
    if (plan.style === 'change') assert.ok(plan.beats.some((x) => x.kind === 'transform'), kind);
    for (const [id, k] of end) {
      const u = b.units.find((x) => x.id === id)!;
      if (id !== me.id && (u.side !== me.side || plan.cast.born.some((w) => w.id === id))) assert.deepEqual(k.at, { u: u.u, v: u.v }, `${kind}: ${id} ends on its tile`);
    }
  }
  // (the kitsune's foxes and the time witch's stopped foes are reached though they took no blow)
  assert.ok(fire('kitsune').plan.cast.touched.length > 0);
  assert.ok(fire('timeWitch').plan.cast.touched.length > 0);
  // (all 54 heroes have one)
  for (const kind of ALL_HEROES) assert.ok(hasShowcase(kind), kind);
});
