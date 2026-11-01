// The lost techniques (LOST-TECHNIQUES, docs/notes/lost-techniques.md): four Legendary books with skills of their own, each the end of a
// quest chain. The books (never sold, twenty fights of study, the right readers, a slot re-costed for the reader's pool); each skill doing what
// its words say; the chains (offered only once their hero or calling is owned, in order, the last a quest battle that pays the book); and
// the battles (a required hero from the real roster, every foe real, a story before and after).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, fight, hurt, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { BOOKS, BOOK_PRICE, READS, STUDY, bookById } from '../src/sim/bookData';
import { canRead, slotFor, studyLength } from '../src/sim/books';
import { LOST, hymnOfTheLongDawn, ninefoldCut, oldHunger, wordsOfUnmaking } from '../src/sim/kits/lost';
import { HERO_KITS, resMax } from '../src/sim/heroKits';
import { hasAil } from '../src/sim/ailments';
import { startedMeta, type Meta } from '../src/sim/meta';
import { ARMIES } from '../src/sim/armies';
import { LOST_QUESTS } from '../src/sim/questData/lost';
import { GIVERS, questById, type QuestDef } from '../src/sim/questData';
import { canOffer, handIn, offerTales, refreshOffers, takeQuest } from '../src/sim/quests';
import { LOST_BATTLES, castOf, questBattleById } from '../src/sim/questBattles';
import { rewardWords } from '../src/sim/rewardWords';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { bareBoard } from './bare';
import { emptyStats } from '../src/sim/equipment';

const DAY = 20260301;
const LOST_IDS = ['ninefoldCut', 'wordsOfUnmaking', 'longDawn', 'oldHunger'];

test('four Legendary books, one a calling, never sold, twenty fights of study', () => {
  const lost = BOOKS.filter((b) => b.lost);
  assert.deepEqual(lost.map((b) => b.id).sort(), [...LOST_IDS].sort());
  assert.deepEqual(lost.map((b) => b.kind).sort(), ['bestiary', 'grimoire', 'hymnal', 'manual']);
  for (const b of lost) {
    assert.equal(b.rarity, 'legendary', b.id);
    assert.ok(LOST[b.lost!], `${b.id} has a skill of its own`);
    assert.equal(STUDY[b.rarity], 20);
    assert.equal(studyLength(b, 0), 20);
  }
  assert.equal(BOOK_PRICE.legendary, undefined, 'nothing prices a Legendary book: it is never sold');
  assert.ok(lost.every((b) => !b.history.includes('  ')));
});

test('each calling reads its own lost technique, and its slot costs the same share of a mana or a stamina pool', () => {
  const m = startedMeta(3);
  m.unlocked = [...ALL_HEROES];
  for (const b of BOOKS.filter((x) => x.lost)) {
    const readers = ALL_HEROES.filter((k) => canRead(m, k, b));
    assert.deepEqual([...readers].sort(), [...READS[b.kind as keyof typeof READS]].sort(), b.id);
    for (const k of readers.slice(0, 6)) {
      const slot = slotFor(k, b.id)!;
      assert.ok(slot, `${k} makes a slot of ${b.id}`);
      const pool = HERO_KITS()[k].pool;
      assert.ok(Math.abs(slot.cost / resMax(pool) - LOST[b.lost!].share) < 0.01, `${k}: the same share of its pool`);
      assert.equal(slot.skill.name, LOST[b.lost!].skill.name);
      assert.equal(slot.revive, undefined, 'no revive face on a lost technique');
    }
  }
  // (half a pool is half a pool: the same share costs 30 stamina, or 50 mana, for the cuts and the words)
  assert.equal(slotFor('knight', 'ninefoldCut')!.cost, 30);
  assert.equal(slotFor('wizard', 'wordsOfUnmaking')!.cost, 50);
});

/** A bare board with a hero of `kind` at (3, 9) and a foe of each `kinds` at the given tiles. */
function field(kind: string, foes: [string, number, number][]): { b: Battle; me: Unit; foes: Unit[] } {
  const b = startBattle(7, 'orcs');
  bareBoard(b);
  b.units = [];
  const me = addUnit(b, kind, 3, 9, { level: 30 });
  const fs = foes.map(([k, u, v]) => addUnit(b, k, u, v, { hp: 4 }));
  return { b, me, foes: fs };
}

test('The Ninefold Cut: blinks from foe to foe, four at most, the last cut double and bleeding', () => {
  const { b, me, foes } = field('samurai', [['orcGrunt', 3, 7], ['orcGrunt', 4, 6], ['orcGrunt', 3, 5], ['orcGrunt', 4, 4], ['orcGrunt', 6, 0]]);
  const out: BattleEvent[] = [];
  const before = foes.map((f) => f.hp);
  assert.ok(ninefoldCut(b, me, out));
  const cuts = foes.filter((f, i) => f.hp < before[i] || !f.alive);
  assert.equal(cuts.length, 4, 'four foes cut, no more');
  assert.ok(out.filter((e) => e.kind === 'blink').length >= 3, 'a blink to each foe that was not already beside him');
  assert.ok(!cuts.includes(foes[4]), 'the far foe is out of reach');
  // (no foe within 3 of the start or of the last stop: nothing to cut)
  const lone = field('samurai', [['orcGrunt', 3, 0]]);
  assert.equal(ninefoldCut(lone.b, lone.me, []), false);
});

test('The Ninefold Cut: the last cut is the hardest and leaves a bleed', () => {
  const { b, me, foes } = field('samurai', [['orcBrute', 3, 8], ['orcBrute', 4, 8]]);
  foes.forEach((f) => { f.hp = f.maxHp = 5000; });
  assert.ok(ninefoldCut(b, me, []));
  const [first, last] = foes.map((f) => f.maxHp - f.hp);
  assert.ok(last > first * 1.5, `the last cut (${last}) is about double the first (${first})`);
  assert.ok(foes.some((f) => hasAil(f, 'bleed')), 'it bleeds');
});

test('Words of Unmaking: the foes in the line lose their shields and haste, are slowed and take a third more', () => {
  const { b, me, foes } = field('wizard', [['orcGrunt', 3, 6], ['orcGrunt', 4, 6], ['orcGrunt', 2, 6]]);
  for (const f of foes) {
    f.shield = { hp: 50, until: b.t + 9000 };
    f.hasteUntil = b.t + 9000;
  }
  const out: BattleEvent[] = [];
  assert.ok(wordsOfUnmaking(b, me, out));
  const marked = foes.filter((f) => !f.shield);
  assert.ok(marked.length >= 2, 'two or more foes are caught');
  for (const f of marked) {
    assert.ok(f.slowUntil && f.slowUntil > b.t, 'slowed');
    assert.ok(!f.hasteUntil, 'unhasted');
    assert.ok(f.kx?.exposed && f.kx.exposed.mult > 0.2, 'marked to take more');
  }
  // (nothing worth the cast: a lone foe)
  const lone = field('wizard', [['orcGrunt', 3, 6]]);
  assert.equal(wordsOfUnmaking(lone.b, lone.me, []), false);
});

test('The Hymn of the Long Dawn: the friends near heal, cannot fall below 1, and it is sung once a fight', () => {
  const { b, me, foes } = field('cleric', [['orcBrute', 4, 3]]);
  const ally = addUnit(b, 'knight', 4, 9, { level: 30 });
  ally.hp = Math.round(ally.maxHp * 0.3);
  assert.ok(hymnOfTheLongDawn(b, me, []));
  const hurtBy = foes[0];
  hurt(b, hurtBy, ally, 99999, false, false, [], 'blow');
  assert.ok(ally.alive && ally.hp >= 1, 'held at 1 health, not felled');
  assert.equal(hymnOfTheLongDawn(b, me, []), false, 'once a fight');
  // (and not when nobody near is hurt)
  const well = field('cleric', [['orcBrute', 4, 3]]);
  addUnit(well.b, 'knight', 4, 9, { level: 30 });
  assert.equal(hymnOfTheLongDawn(well.b, well.me, []), false);
});

test('The Old Hunger: leaps on the hardest hitter, pins it, shoves the rest and heals for each foe struck', () => {
  const { b, me, foes } = field('werewolf', [['orcBrute', 3, 6], ['orcGrunt', 4, 6], ['orcGrunt', 2, 6]]);
  foes.forEach((f) => { f.hp = f.maxHp = 5000; });
  me.hp = Math.round(me.maxHp * 0.5);
  const hp0 = me.hp;
  const strongest = [...foes].sort((x, y) => UNITS[y.def].atk - UNITS[x.def].atk)[0];
  assert.ok(oldHunger(b, me, []));
  assert.ok(strongest.stunUntil && strongest.stunUntil > b.t, 'pinned');
  assert.ok(foes.every((f) => f.hp < f.maxHp), 'every foe near is struck');
  assert.ok(me.hp > hp0, 'it heals');
  const none = field('werewolf', [['orcGrunt', 7, 0]]);
  assert.equal(oldHunger(none.b, none.me, []), false);
});

test('the chains: three parts each, in order, the last a quest battle that pays the book, none before level 30', () => {
  const chains = new Map<string, QuestDef[]>();
  for (const q of LOST_QUESTS) {
    assert.equal(GIVERS[q.giver].slot, 'tale', q.id);
    const key = q.id.replace(/^lost([A-Z][a-z]+).*/, '$1');
    chains.set(key, [...(chains.get(key) ?? []), q]);
  }
  assert.equal(chains.size, 4);
  for (const [key, parts] of chains) {
    assert.equal(parts.length, 3, key);
    parts.forEach((q, i) => assert.equal(q.after, i ? parts[i - 1].id : undefined, `${q.id} follows the part before`));
    const last = parts[2];
    assert.equal(last.goal.kind, 'battle', key);
    assert.ok(last.reward.book && bookById(last.reward.book)?.rarity === 'legendary', `${key} pays its book`);
    assert.ok(parts.slice(0, 2).every((q) => q.goal.kind !== 'battle' && !q.reward.book), key);
  }
  assert.deepEqual([...LOST_QUESTS.filter((q) => q.reward.book).map((q) => q.reward.book)].sort(), [...LOST_IDS].sort());
  for (const q of LOST_QUESTS) assert.match(JSON.stringify(q.needs), /"n":30/, `${q.id} opens at level 30`);
});

const clearAll = (m: Meta): void => {
  for (const a of ARMIES) m.armies[a.id] = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
};
/** A save whose best hero is at level 30, with the Last Stand and the Calamity open. */
function levelled(m: Meta): void {
  m.xp = { ...m.xp, knight: 900_000_000 };
  m.opened = [...new Set([...(m.opened ?? []), 'tower', 'calamity'])];
}

test('Kenji\'s chain is offered only when Kenji is owned, at level 30, part after part, and the last pays the book', () => {
  const m = startedMeta(41);
  clearAll(m);
  m.unlocked = m.unlocked.filter((k) => k !== 'samurai');
  levelled(m);
  refreshOffers(m, DAY);
  assert.ok(!m.quests!.offers.some((o) => o.id === 'lostNineScroll'), 'not without Kenji');
  m.unlocked.push('samurai');
  refreshOffers(m, DAY);
  const q1 = questById('lostNineScroll')!;
  if (!m.quests!.offers.some((o) => o.id === q1.id)) assert.fail('part 1 goes up at once when Kenji is owned and a hero is at level 30');
  assert.ok(!canOffer(m, questById('lostNineRoad')!), 'part 2 waits for part 1');
  assert.ok(takeQuest(m, 'lostNineScroll', DAY));
  m.quests!.active[0].progress = 15;
  assert.ok(handIn(m, 'lostNineScroll', DAY));
  offerTales(m, DAY);
  assert.ok(m.quests!.offers.some((o) => o.id === 'lostNineRoad'), 'part 2 follows');
  // (the last part, handed in: the book is in the bag)
  for (const id of ['lostNineRoad', 'lostNineDojo']) {
    if (!m.quests!.offers.some((o) => o.id === id)) offerTales(m, DAY);
    assert.ok(takeQuest(m, id, DAY), id);
    m.quests!.active.find((a) => a.id === id)!.progress = 99;
    assert.ok(handIn(m, id, DAY));
  }
  assert.equal(m.books?.ninefoldCut, 1, 'the Ninefold Cut is in the bag');
  assert.match(rewardWords(questById('lostNineDojo')!.reward, m), /The Ninefold Cut/);
});

test('a chain that needs a calling is not offered without one, and the last battle needs its hero', () => {
  const m = startedMeta(42);
  clearAll(m);
  levelled(m);
  m.unlocked = m.unlocked.filter((k) => k !== 'wizard');
  const lib = questById('lostWordsLibrary')!;
  m.quests = { active: [], offers: [], done: ['lostWordsCrossing', 'lostWordsGuardian'] };
  assert.ok(!canOffer(m, lib), 'no Ravi, no library');
  m.unlocked.push('wizard');
  assert.ok(canOffer(m, lib), 'with Ravi, the library opens');
  assert.equal(castOf(m, questBattleById('unwrittenLibrary')!)?.[0], 'wizard');
});

test('the four battles: a required hero, real foes, a boss with a name, a story before and after', () => {
  assert.equal(LOST_BATTLES.length, 4);
  for (const qb of LOST_BATTLES) {
    assert.ok(questBattleById(qb.id) === qb, qb.id);
    assert.ok(LOST_QUESTS.some((q) => q.goal.kind === 'battle' && q.goal.battle === qb.id), `${qb.id} is opened by a chain's last part`);
    for (const w of qb.waves) for (const f of w.foes) assert.ok(UNITS[f]?.side === 'foe', `${qb.id}: foe ${f}`);
    assert.ok(qb.boss?.name && qb.boss.title, qb.id);
    assert.ok(qb.waves.some((w) => w.boss), `${qb.id} has a boss wave`);
    assert.ok(qb.ease && qb.ease > 1, `${qb.id} is tuned (npm run quest-rate)`);
    const owned = castOf({ unlocked: ALL_HEROES.slice() }, qb)!;
    assert.ok(owned.length >= 1, qb.id);
    assert.equal(castOf({ unlocked: ['knight', 'peasant'] }, qb), null, `${qb.id} is not offered without its hero`);
    for (const sc of [qb.before(owned), qb.after(owned)]) {
      assert.ok(sc.shots.length >= 2 && sc.shots.every((sh) => (sh.lines ?? []).length > 0), sc.id);
      assert.doesNotMatch(JSON.stringify(sc.shots), /\b(color|armor|honor|favor|neighbor)\b/i, `${sc.id}: British spelling`);
    }
  }
  assert.deepEqual(castOf({ unlocked: ['cleric', 'priestess'] }, questBattleById('matinsChapel')!), ['cleric']);
  assert.deepEqual(castOf({ unlocked: ['priestess'] }, questBattleById('matinsChapel')!), ['priestess']);
});

test('in a fight the reader casts its lost technique on its own (the AI knows when)', () => {
  // (the Hymn is held for a hurt friend and sung once, so a fight of the easy orcs may never call for it: its own test casts it)
  const readers: Record<string, string> = { ninefoldCut: 'samurai', wordsOfUnmaking: 'wizard', oldHunger: 'werewolf' };
  for (const [id, kind] of Object.entries(readers)) {
    for (const slot of [1, 2] as const) {
      const b = startBattle(11, 'orcs');
      bareBoard(b);
      const book: [string, string] = slot === 1 ? [id, 'own2'] : ['own1', id];
      // (a full pool, so its first cast is not waited for; a party round it that outlasts the first foes)
      place(b, kind, 3, 9, undefined, { level: 30, charge: 100, equip: { ...emptyStats(), book } });
      for (const [k, u] of [['knight', 4], ['paladin', 2], ['archer', 5], ['peasant', 1]] as const) place(b, k, u, 9, undefined, { level: 30 });
      fight(b);
      let cast = 0;
      for (let i = 0; i < 1500 && b.phase === 'fight'; i++) for (const e of stepBattle(b)) if (e.kind === 'skill' && e.name === LOST[id].skill.key) cast++;
      assert.ok(cast >= 1, `${kind} casts ${id} in slot ${slot}`);
    }
  }
});
