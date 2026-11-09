// ASSAULT-WAR (docs/notes/assault-3.md; the design's 1.4, 4.2 and Q1, phase 3): the warchief's flight to the strongest hold still standing,
// the captains' taunts as our heroes come near, and the War News's conquest lines.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startAssault } from '../src/sim/assault/assault';
import { orderPlatoon } from '../src/sim/assault/platoons';
import { settleAssault } from '../src/sim/assault/assaultMode';
import { CHIEF_FLIGHT, conquestNews, hasScore, strongestHold, TAUNT_NEAR } from '../src/sim/assault/warAnswer';
import { stepBattle, type Battle } from '../src/sim/battle';
import { newWar, type Nemesis, type NemSnap } from '../src/sim/nemesis';
import { startedMeta, type Meta } from '../src/sim/meta';
import type { HoldEvent } from '../src/sim/assault/holdTypes';
import { input, PARTY, steps } from './assaultKit';

const mk = (id: number, army: string, rank: Nemesis['rank'], might: number, base = 'orcBrute'): Nemesis => ({ id, base, army, name: `N${id}`, epithet: 'the Test', rank, loyalty: 50, might, scars: 0, traits: [], weak: [], known: [], memory: [], met: 0, lost: 0, born: 0 });
const snap = (n: Nemesis, more: Partial<NemSnap> = {}): NemSnap => ({ id: n.id, base: n.base, army: n.army, name: n.name, epithet: n.epithet, rank: n.rank, might: n.might, scars: 0, traits: [], weak: [], ...more });

/** A save with the first three armies open and a War. */
function saveWar(): Meta {
  const m = startedMeta(9);
  m.opened = ['undead', 'beasts'];
  m.war = newWar();
  return m;
}

/** An assault held at the Landing whose throne the warchief holds, with somewhere to flee to (or not). */
function chiefAssault(seed: number, flightTo?: string): Battle {
  const chief = mk(9, 'orcs', 'warchief', 8, 'orcWarlord');
  const b = startAssault(input({ seed, warchief: snap(chief), ...(flightTo ? { flightTo } : {}) }));
  b.field!.hold!.platoons.forEach((_p, k) => orderPlatoon(b, k, { kind: 'hold', at: { u: 0, v: 0 } }));
  stepBattle(b);
  return b;
}

test('the strongest hold still standing: the opened, unconquered army with the mightiest Council, a later one on a tie; none at the last', () => {
  const m = saveWar();
  m.war!.members.push(mk(1, 'undead', 'captain', 3), mk(2, 'beasts', 'captain', 2), mk(3, 'beasts', 'lieutenant', 1), mk(4, 'ogres', 'captain', 9), mk(5, 'undead', 'warchief', 10));
  // (the Undead's 3 against the Beasts' 3: the later army; the Ogres are not open; the warchief's own Might does not count)
  assert.equal(strongestHold(m, 'orcs'), 'beasts');
  m.war!.members.push(mk(6, 'undead', 'lieutenant', 1));
  assert.equal(strongestHold(m, 'orcs'), 'undead');
  m.assault = { v: 1, troops: {}, conquered: { undead: { day: 1, tier: 3, wins: 1 } }, tries: {} };
  assert.equal(strongestHold(m, 'orcs'), 'beasts');
  assert.equal(strongestHold(m, 'beasts'), 'orcs', 'the Orcs still stand when another is stormed');
  m.assault.conquered.beasts = { day: 1, tier: 3, wins: 1 };
  m.assault.conquered.orcs = { day: 1, tier: 3, wins: 1 };
  assert.equal(strongestHold(m, 'orcs'), undefined);
});

test('brought under a fifth of his health with another hold standing, the warchief is asked once whether he flees; fled, the hold falls', () => {
  const outcomes: boolean[] = [];
  for (let seed = 1; seed <= 12; seed++) {
    const b = chiefAssault(seed, 'undead');
    const h = b.field!.hold!;
    const lord = b.field!.byId[h.lord];
    assert.equal(lord.nem?.id, 9);
    lord.hp = Math.floor(lord.maxHp * CHIEF_FLIGHT.at) - 1;
    const ev: HoldEvent[] = [];
    for (let i = 0; i < 3; i++) {
      stepBattle(b);
      ev.push(...h.events);
    }
    assert.ok(h.flight, 'asked');
    const asked = h.flight.asked;
    stepBattle(b);
    assert.equal(h.flight.asked, asked, 'asked once');
    outcomes.push(!!h.flight.fled);
    if (h.flight.fled) {
      assert.ok(ev.some((e) => e.kind === 'chiefFled' && e.to === 'undead'));
      assert.ok(!lord.alive && lord.fled);
      steps(b, 80);
      assert.equal(h.outcome, 'won', 'the hold falls as if he had');
    } else assert.ok(lord.alive);
  }
  assert.ok(outcomes.includes(true) && outcomes.includes(false), `${outcomes}`);
  // (at the last hold standing he is never asked)
  const last = chiefAssault(1);
  const lord = last.field!.byId[last.field!.hold!.lord];
  lord.hp = 1;
  steps(last, 3);
  assert.equal(last.field!.hold!.flight, undefined);
});

test('a fled warchief rides for the strongest hold, now his home, and the News says so; the hold\'s fall writes the conquest line', () => {
  const m = saveWar();
  m.party = [...PARTY];
  const chief = mk(9, 'orcs', 'warchief', 8, 'orcWarlord');
  m.war!.members.push(chief, mk(1, 'undead', 'captain', 3));
  let b: Battle | null = null;
  for (let seed = 1; seed <= 12 && !b; seed++) {
    const t = chiefAssault(seed, 'undead');
    const h = t.field!.hold!;
    const lord = t.field!.byId[h.lord];
    lord.hp = 1;
    steps(t, 3);
    if (h.flight?.fled) b = t;
  }
  assert.ok(b, 'a battle where he fled');
  steps(b, 80);
  const r = settleAssault(m, b, 20261109);
  assert.ok(r.won && r.first);
  assert.equal(m.war!.members.find((n) => n.id === 9)?.army, 'undead', 'his home is the hold he rode for');
  assert.ok(r.news.some((l) => /flees Bloodtusk Hold and rides for the Undead Legion/.test(l)), r.news.join(' | '));
  assert.ok(r.news.some((l) => /Bloodtusk Hold falls\. The Orc Warband is broken/.test(l)));
  assert.equal(m.war!.news[0].kind, 'conquest');
  assert.ok(m.war!.news.some((n) => n.kind === 'fled'));
  // (an assault lost writes no conquest line)
  const lost = chiefAssault(2, 'undead');
  lost.field!.hold!.outcome = 'lost';
  assert.deepEqual(conquestNews(saveWar(), lost.field!.hold!, false, false), []);
});

test('a captain with a score taunts that hero once, as it comes within ten tiles; one without a score does not', () => {
  const grudge = snap(mk(1, 'orcs', 'captain', 6), { slew: ['knight'] });
  const plain = snap(mk(2, 'orcs', 'captain', 2));
  assert.ok(hasScore(grudge, 'knight') && !hasScore(grudge, 'samurai') && !hasScore(plain, 'knight'));
  assert.ok(hasScore({ ...plain, weak: ['dread:samurai'] }, 'samurai'), 'the hero it dreads');
  assert.ok(hasScore({ ...plain, trophies: [{ kind: 'archer', slot: 'weapon', item: 1, base: 'x', rarity: 2 }] }, 'archer'), 'a trophy taken');
  const b = startAssault(input({ council: [grudge, plain] }));
  const f = b.field!;
  const h = f.hold!;
  h.platoons.forEach((_p, k) => orderPlatoon(b, k, { kind: 'hold', at: { u: 0, v: 0 } }));
  // (the South Gate's captain: the mightier, with the score; the knight walks up within reach, the samurai beside it)
  const post = h.posts.find((p) => p.council === 1)!;
  const cap = f.byId[f.groups[post.group].leader];
  const taunts: HoldEvent[] = [];
  // (two tiles inside the reach: the captain, woken, may take a step meanwhile)
  for (const [k, du] of [[0, TAUNT_NEAR - 2], [1, TAUNT_NEAR - 3]] as const) {
    const x = f.byId[h.platoons[k].heroId];
    f.occ[x.v * f.w + x.u] = -1;
    x.u = cap.u + du;
    x.v = cap.v;
    while (f.occ[x.v * f.w + x.u] >= 0) x.v++;
    f.occ[x.v * f.w + x.u] = x.id;
  }
  for (let i = 0; i < 20; i++) {
    stepBattle(b);
    taunts.push(...h.events.filter((e) => e.kind === 'taunt'));
  }
  assert.deepEqual(taunts.map((e) => e.kind === 'taunt' && [e.member, e.hero]), [[1, 'knight']]);
});
