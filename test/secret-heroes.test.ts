// SECRET-HEROES: the heroes earned in play are secrets until they join (no screen's words name them), and three hero quests, each a
// tale in two or three parts ending in a quest battle of its own, bring three of them in. See docs/notes/secret-heroes.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordOf } from '../src/sim/armies';
import { startedMeta, type Meta } from '../src/sim/meta';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { heroName, heroTitle } from '../src/sim/heroNames';
import { CONTENT_KINDS } from '../src/sim/unlockRules';
import { CONTENT_HEROES, grantContent, lockInfo } from '../src/sim/contentHeroes';
import { comboHint, isSecret, secretHint, secretsOf, TALE_HEROES } from '../src/sim/secretHeroes';
import { COMBOS } from '../src/sim/combos';
import { sceneList } from '../src/sim/sceneRules';
import { rewardWords } from '../src/sim/rewardWords';
import { GIVERS, QUESTS, questById, type QuestDef } from '../src/sim/questData';
import { TALE_QUESTS } from '../src/sim/questData/tales';
import { canOffer, handIn, heroesOwnedFor, noteQuests, offerTales, refreshOffers, standFight, takeQuest, type QuestFight } from '../src/sim/quests';
import { castOf, questBattleById, TALE_BATTLES } from '../src/sim/questBattles';
import { guestKinds } from '../src/sim/guest';
import { hireable } from '../src/sim/climb';
import { armyRun } from '../src/sim/run';
import { calamityRun } from '../src/sim/modes';
import type { Scene } from '../src/sim/sceneKit';

const DAY = 20261101;
const clear = (m: Meta, ...ids: string[]) => ids.forEach((id) => (m.armies[id] = { ...recordOf(m, id), clears: 1 }));
/** Every word a hero could be known by: its own name, its title, and its class (the Juggernaut ...; a foe of the same kind, the Alpha
 *  Werewolf, is a foe's name, not the hero's). */
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const namesOf = (kind: string): RegExp => new RegExp(`\\b(${esc(heroName(kind))}|${esc(heroTitle(kind))})\\b|(?<!Alpha )\\b${esc(UNITS[kind].name)}\\b`, 'i');
const words = (q: QuestDef): string[] => [q.title, q.text, ...q.offer, q.going];
const sceneWords = (s: Scene): string[] => [s.title, s.blurb, ...s.shots.flatMap((sh) => [sh.caption ?? '', ...(sh.lines ?? []).map((l) => l.text)]), ...Object.values(s.cast).map((c) => c.name ?? '')];
const won = (battle: string): QuestFight => ({ won: true, waves: 1, boss: true, heroes: ['knight'], flawless: false, kills: [], dailyCleared: false, battle });

test('the secret heroes are the ten earned in play, each by a tale', () => {
  assert.deepEqual([...CONTENT_KINDS].sort(), CONTENT_HEROES.map((c) => c.kind).sort());
  const m = startedMeta(3);
  assert.deepEqual(secretsOf(m), [...CONTENT_KINDS]);
  for (const k of CONTENT_KINDS) assert.ok(isSecret(m, k), k);
  for (const k of ALL_HEROES.filter((x) => !CONTENT_KINDS.includes(x))) assert.ok(!isSecret(m, k), `${k} is collected by shards, no secret`);
  m.unlocked.push('reaper');
  assert.ok(!isSecret(m, 'reaper'), 'a hero who has joined is no secret');
  assert.deepEqual([...TALE_HEROES].sort(), TALE_QUESTS.flatMap((q) => (q.reward.hero ? [q.reward.hero.kind] : [])).sort());
});

test("no screen's words name a secret hero: the lock line, the hint, the codex's combos, the scenes list", () => {
  const m = startedMeta(5);
  for (const k of CONTENT_KINDS) {
    const lock = lockInfo(m, k)!;
    for (const s of [lock.line, lock.short, secretHint(k)]) assert.doesNotMatch(s, namesOf(k), `${k}: ${s}`);
    assert.deepEqual([lock.named, lock.need], [false, 0], `${k}: no name, no bar`);
  }
  // (a combo's hint never names a secret hero, even one that leads the five)
  for (const c of COMBOS) for (const k of CONTENT_KINDS) assert.doesNotMatch(comboHint(m, c.heroes), new RegExp(`\\b${UNITS[k].name}\\b`), `${c.id}: ${k}`);
  assert.ok(COMBOS.some((c) => CONTENT_KINDS.includes(c.heroes[0])), 'the rule is tested on a combo led by a secret hero');
  // (the scenes not seen are "???")
  const rows = sceneList(m).filter((r) => !r.seen);
  for (const r of rows) for (const k of CONTENT_KINDS) assert.doesNotMatch(`${r.title} ${r.text}`, namesOf(k), r.id);
});

test('no quest offered to a save without a secret hero names it, nor does its pay or its battle story', () => {
  let checked = 0;
  for (const k of CONTENT_KINDS) {
    const m = startedMeta(9);
    m.unlocked = ALL_HEROES.filter((x) => x !== k);
    const re = namesOf(k);
    for (const q of QUESTS) {
      if (!heroesOwnedFor(m, q)) continue;
      checked++;
      for (const s of [...words(q), rewardWords(q.reward, m)]) assert.doesNotMatch(s, re, `${q.id} names ${k}: ${s}`);
      if (q.goal.kind !== 'battle') continue;
      const qb = questBattleById(q.goal.battle)!;
      const cast = castOf(m, qb)!;
      for (const s of [...sceneWords(qb.before(cast)), qb.title, qb.blurb]) assert.doesNotMatch(s, re, `${qb.id} names ${k}: ${s}`);
    }
  }
  assert.ok(checked > 1000);
});

test('a secret hero is never a guest or a Calamity hire while it is hidden', () => {
  const m = startedMeta(11);
  const run = armyRun(77, 'orcs', m.party);
  run.hide = secretsOf(m);
  for (const k of guestKinds(run)) assert.ok(!isSecret(m, k), k);
  const cal = calamityRun(78, m, m.unlocked[0], 0);
  cal.hide = secretsOf(m);
  for (const k of hireable(cal)) assert.ok(!isSecret(m, k), k);
  // (a run without the field, an old save's or a tool's, draws from every hero as before)
  delete run.hide;
  assert.ok(guestKinds(run).some((k) => isSecret(m, k)));
});

test('the tales: givers by the fire, two or three parts each in order, one battle of their own, a hero at the end', () => {
  const tales = new Map<string, QuestDef[]>();
  for (const q of TALE_QUESTS) {
    assert.equal(GIVERS[q.giver].slot, 'tale', q.id);
    tales.set(q.giver, [...(tales.get(q.giver) ?? []), q]);
  }
  assert.equal(tales.size, TALE_HEROES.length, 'one tale a hero');
  for (const [giver, parts] of tales) {
    assert.ok(parts.length >= 2 && parts.length <= 3, giver);
    parts.forEach((q, i) => assert.equal(q.after, i ? parts[i - 1].id : undefined, `${q.id} follows the part before`));
    const last = parts[parts.length - 1];
    assert.equal(last.goal.kind, 'battle');
    assert.ok(last.reward.hero && TALE_HEROES.includes(last.reward.hero.kind), `${giver}: a hero joins`);
    assert.ok(parts.slice(0, -1).every((q) => q.goal.kind !== 'battle' && !q.reward.hero), `${giver}: the parts before use the game's own goals`);
    // (the tease never names the hero, and no part's words do)
    const re = namesOf(last.reward.hero!.kind);
    for (const q of parts) for (const s of [...words(q), q.reward.hero?.tease ?? '']) assert.doesNotMatch(s, re, `${q.id}: ${s}`);
  }
  assert.equal(TALE_BATTLES.length, TALE_HEROES.length, 'one battle a tale');
  for (const qb of TALE_BATTLES) {
    assert.ok(TALE_QUESTS.some((q) => q.goal.kind === 'battle' && q.goal.battle === qb.id), qb.id);
    // (the chains' cast rule: any starter pack fields it)
    for (const pack of [['knight', 'samurai', 'archer'], ['peasant', 'kunoichi', 'wizard']]) assert.ok(castOf({ unlocked: pack }, qb), `${qb.id} with ${pack}`);
    // (the stranger is in the story, dark and unnamed, never in a close-up)
    for (const sc of [qb.before(['knight']), qb.after(['knight'])]) {
      const who = Object.entries(sc.cast).find(([, c]) => c.name === 'The stranger');
      assert.ok(who && who[1].shade, `${sc.id}: the stranger, in shadow`);
      for (const sh of sc.shots) assert.ok(sh.angle && !['close', 'extreme', 'ots', 'dutch'].includes(sh.angle), `${sc.id}: no close-up shows a portrait`);
    }
  }
});

test('a tale is offered when its story opens, part after part, and its hero joins once', () => {
  const m = startedMeta(21);
  refreshOffers(m, DAY);
  assert.ok(!m.quests!.offers.some((o) => o.id === 'taleFoldTracks'), 'not before the Beast Packs fall');
  clear(m, 'orcs', 'undead', 'beasts');
  refreshOffers(m, DAY);
  assert.ok(m.quests!.offers.some((o) => o.id === 'taleFoldTracks'), 'on the board the same day, no draw needed');
  assert.ok(!canOffer(m, questById('taleFoldNight')!), 'part 2 waits for part 1');
  assert.ok(takeQuest(m, 'taleFoldTracks', DAY));
  noteQuests(m, { ...won(''), army: 'beasts', mode: 'army', waves: 5 });
  assert.ok(handIn(m, 'taleFoldTracks', DAY));
  assert.ok(isSecret(m, 'werewolf'), 'still a secret after part 1');
  assert.ok(offerTales(m, DAY));
  assert.ok(takeQuest(m, 'taleFoldNight', DAY));
  noteQuests(m, won('moonFold'));
  const before = m.unlocked.length;
  const stones = m.stones ?? 0;
  assert.ok(handIn(m, 'taleFoldNight', DAY));
  assert.ok(m.unlocked.includes('werewolf'), 'Vuk joins at the hand-in');
  assert.equal(m.unlocked.length, before + 1);
  assert.equal(m.stones ?? 0, stones, 'the hero is the pay');
  assert.ok(!isSecret(m, 'werewolf'));
  // (once: the tale is done, nothing offers it again, and the milestone check agrees)
  assert.ok(!canOffer(m, questById('taleFoldTracks')!) && !canOffer(m, questById('taleFoldNight')!));
  assert.deepEqual(grantContent(m), []);
  assert.equal(m.unlocked.filter((k) => k === 'werewolf').length, 1);
});

test('the Last Stand and the Golem Forge tales: their goals count, in order', () => {
  const m = startedMeta(22);
  clear(m, 'orcs', 'undead', 'beasts');
  // (the Last Stand open)
  m.opened = ['tower'];
  refreshOffers(m, DAY);
  assert.ok(m.quests!.offers.some((o) => o.id === 'taleChainsWorth'));
  takeQuest(m, 'taleChainsWorth', DAY);
  noteQuests(m, standFight(10, { best: 10, act: 1, held: 0 }));
  assert.ok(handIn(m, 'taleChainsWorth', DAY));
  offerTales(m, DAY);
  takeQuest(m, 'taleChainsCrew', DAY);
  noteQuests(m, { ...won(''), kills: Array(40).fill('skeleton') });
  assert.ok(handIn(m, 'taleChainsCrew', DAY));
  offerTales(m, DAY);
  takeQuest(m, 'taleChainsTide', DAY);
  noteQuests(m, won('chainsTide'));
  assert.ok(handIn(m, 'taleChainsTide', DAY));
  assert.ok(m.unlocked.includes('dreadPirate'));
  // (the Forge's tale opens with the Golem Forge, and asks for its waves on Hard)
  const g = startedMeta(23);
  refreshOffers(g, DAY);
  assert.ok(!g.quests!.offers.some((o) => o.id === 'taleIronSlag'));
  clear(g, 'golems');
  refreshOffers(g, DAY);
  takeQuest(g, 'taleIronSlag', DAY);
  noteQuests(g, { ...won(''), army: 'golems', mode: 'army', tier: 0, waves: 6 });
  assert.equal(g.quests!.active[0].progress, 0, 'Normal does not count');
  noteQuests(g, { ...won(''), army: 'golems', mode: 'army', tier: 1, waves: 6 });
  assert.ok(handIn(g, 'taleIronSlag', DAY));
});

test('a save that has the hero already hears the tale and is paid something else', () => {
  const m = startedMeta(31);
  clear(m, 'orcs', 'undead', 'beasts');
  m.unlocked.push('werewolf');
  const q = questById('taleFoldNight')!;
  assert.match(rewardWords(q.reward, m), /400 crowns · 4 stones/);
  assert.match(rewardWords(q.reward, startedMeta(32)), /the stranger joins your company/);
  m.quests = { active: [{ id: 'taleFoldNight', progress: 1, took: DAY }], offers: [], done: ['taleFoldTracks'] };
  const crowns = m.crowns;
  const n = m.unlocked.length;
  assert.ok(handIn(m, 'taleFoldNight', DAY));
  assert.equal(m.crowns, crowns + 400);
  assert.equal(m.unlocked.length, n, 'no second Vuk');
});

test("a secret hero's shards in a quest's pay are stones until it joins, and the words say so", () => {
  const m = startedMeta(41);
  const q = questById('emptyDen')!;
  assert.equal(q.reward.shards?.kind, 'werewolf');
  assert.doesNotMatch(rewardWords(q.reward, m), /Vuk/);
  assert.match(rewardWords(q.reward, m), /2 stones/);
  m.unlocked.push('werewolf');
  assert.match(rewardWords(q.reward, m), /2 of Vuk's shards/);
});

test('an old save loads: a tale already begun or done is kept, and the hero joins on load if the tale was done', () => {
  const m = startedMeta(51);
  m.quests = { active: [], offers: [], done: ['taleIronSlag', 'taleIronMarch'] };
  assert.deepEqual(grantContent(m), ['juggernaut']);
  assert.ok(TALE_BATTLES.every((qb) => questBattleById(qb.id) === qb));
});
