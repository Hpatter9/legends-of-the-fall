// "How to come back stronger" after a real defeat (docs/notes/ux-fixes.md): pointers drawn from the save itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comebackTips, meantLevel, partyLevel, type ComebackTip } from '../src/sim/comeback';
import { startedMeta, type Meta } from '../src/sim/meta';
import { armyById } from '../src/sim/armies';
import { xpFor } from '../src/sim/levels';
import { grantEquipment } from '../src/sim/equipment';
import { roleOf } from '../src/sim/suggest';

const ids = (tips: ComebackTip[]) => tips.map((t) => t.id);
/** A save past the pick with every hero of the party at `level`, no crowns, nothing in the stash and every talent point spent (none earned at level 1). */
const save = (level = 1): Meta => {
  const m = startedMeta(7);
  m.ranked = {};
  for (const k of m.party) m.xp[k] = xpFor(level);
  return m;
};

test('a party under the army\'s level is told to train first, with the levels named, and pointed at an easier army', () => {
  const m = save(1);
  m.armies.orcs = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7 } };
  const tips = comebackTips(m, { army: 'undead', tier: 0, party: m.party });
  assert.equal(tips[0].id, 'train');
  assert.match(tips[0].text, /the Undead Legion is meant for level 8, and your party averages level 1/);
  assert.deepEqual(tips[0].go, { to: 'heroes' });
  const easier = tips.find((t) => t.id === 'easier');
  assert.ok(easier, 'an easier army is offered');
  assert.deepEqual(easier!.go, { to: 'armies', army: 'orcs' });
  assert.ok(tips.length >= 2 && tips.length <= 4);
});

test('a party at the army\'s level is not told to train', () => {
  const m = save(10);
  const tips = comebackTips(m, { army: 'undead', tier: 0, party: m.party });
  assert.ok(!ids(tips).includes('train'));
  assert.equal(partyLevel(m, m.party), 10);
});

test('a harder tier is meant for a higher level, and the advice is to drop a tier', () => {
  const a = armyById('orcs')!;
  assert.equal(meantLevel(a, 0), 1);
  assert.equal(meantLevel(a, 1), 25);
  assert.ok(meantLevel(armyById('golems')!, 1) >= armyById('golems')!.level);
  const m = save(10);
  const tips = comebackTips(m, { army: 'orcs', tier: 1, party: m.party });
  assert.deepEqual(ids(tips).slice(0, 2), ['train', 'easier']);
  assert.match(tips[1].text, /Normal/);
});

test('earned strength not taken is pointed out: a rank, talent points, better gear', () => {
  const m = save(12);
  const [a] = m.party;
  m.shards[a] = 1;
  grantEquipment(m, { base: 'ironSword', rarity: 3, level: 10 });
  const tips = comebackTips(m, { army: 'orcs', party: m.party }, 10);
  const rank = tips.find((t) => t.id === 'rank');
  assert.deepEqual(rank?.go, { to: 'heroes', hero: a, tab: 'progression' });
  assert.ok(ids(tips).includes('talents'), 'level 12 has talent points to spend');
  assert.equal(tips.find((t) => t.id === 'gear')?.go?.to, 'heroes');
});

test('crowns, chests and the castle: each pointed at its screen', () => {
  const m = save(30);
  m.crowns = 5000;
  m.stash = [{ army: 'orcs', at: 3, tier: 0, seed: 1 }];
  m.opened = ['castle'];
  const tips = comebackTips(m, { army: 'orcs', party: m.party }, 12);
  const go = Object.fromEntries(tips.map((t) => [t.id, t.go?.to]));
  assert.equal(go.chests, 'chests');
  assert.equal(go.castle, 'castle');
  assert.equal(go.summon, 'recruit');
  // (the builders busy: no castle pointer)
  m.works = { id: 'treasury', doneAt: 1 } as Meta['works'];
  assert.ok(!ids(comebackTips(m, { army: 'orcs', party: m.party }, 12)).includes('castle'));
});

test('a party with nobody at the front is told to bring a sturdy hero', () => {
  const m = save(30);
  const backs = m.unlocked.filter((k) => roleOf(k) !== 'front');
  m.party = backs.slice(0, 5);
  const tips = comebackTips(m, { army: 'orcs', party: m.party }, 12);
  assert.deepEqual(tips.find((t) => t.id === 'front')?.go, { to: 'party' });
});

test('there are always two to four pointers, the same for the same save', () => {
  const m = save(40);
  const a = comebackTips(m, { party: m.party });
  assert.ok(a.length >= 2 && a.length <= 4);
  assert.deepEqual(a, comebackTips(m, { party: m.party }));
  const many = save(1);
  many.crowns = 5000;
  many.stash = [{ army: 'orcs', at: 3, tier: 0, seed: 1 }];
  assert.ok(comebackTips(many, { army: 'golems', party: many.party }).length <= 4);
  for (const t of [...a, ...comebackTips(many, { army: 'golems', party: many.party })]) assert.ok(t.text.length < 140, `short: ${t.text}`);
});
