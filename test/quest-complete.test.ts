// QUEST-COMPLETE (docs/notes/quest-complete.md): what the Quest complete card says: the story's close from the quest's own words, the
// recap of what was done, and the rewards, for every kind of quest and for a quest handed in from an old save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { battleLines, chainPartView, clockOf, daysLine, firstSentences, hasStory, nextPart, questCompleteView, recapOf, rewardRows, snapOf, storyOf, thanksOf } from '../src/questCompleteRules';
import { CHAINS } from '../src/sim/eidolonChainData';
import { startedMeta, type Meta } from '../src/sim/meta';
import { QUESTS, questById, type QuestDef } from '../src/sim/questData';
import { questBattleById } from '../src/sim/questBattles';
import { rewardOf } from '../src/sim/questPay';
import { battleOfQuest, noteBattleWon } from '../src/sim/questRun';
import { handIn, needOf, objectivesOf, readQuests, type QuestActive } from '../src/sim/quests';
import { rewardWords } from '../src/sim/rewardWords';
import { lengthOf, partsOf, storyParts } from '../src/sim/questStars';
import { plainText } from '../src/sim/sceneKit';
import { newRecap } from '../src/sim/runRecap';
import type { Run } from '../src/sim/run';

/** A save with `q` taken and done, as a save of today holds it. */
function ready(q: QuestDef, extra: Partial<QuestActive> = {}): Meta {
  const m = startedMeta(11);
  const objs = objectivesOf(q);
  m.quests = { active: [{ id: q.id, progress: needOf(q, 0), took: 20261101, v: 1, ...(objs.length > 1 ? { more: objs.slice(1).map((_, i) => needOf(q, i + 1)) } : {}), ...extra }], offers: [], done: [], day: 20261104 };
  return m;
}
const plain = QUESTS.find((q) => !hasStory(q) && !q.repeat)!;
const battleQuest = questById('twoBladesBridge')!;
const chainQuest = QUESTS.find((q) => q.after && !battleOfQuest(q.id) && storyParts(q) >= 3 && partsOf(q) === 2)!;

test('the first sentences of a line are cut at a sentence end, never mid-word', () => {
  assert.equal(firstSentences('One. Two! Three? Four.', 2), 'One. Two!');
  assert.equal(firstSentences('Only one sentence here', 2), 'Only one sentence here');
  assert.equal(firstSentences('He said "better". Then left. And more.', 2), 'He said "better". Then left.');
  assert.equal(firstSentences('Pays 1.5 crowns a head. Interested?', 1), 'Pays 1.5 crowns a head.');
});

test('a plain quest has no story block, only its giver\'s thanks; a story quest ends on the giver\'s closing line', () => {
  assert.equal(storyOf(plain), undefined);
  assert.equal(thanksOf(plain), plain.done[plain.done.length - 1]);
  const s = storyOf(chainQuest)!;
  assert.deepEqual(s.told, []);
  assert.equal(s.said.length, 2);
  assert.equal(s.said[1], chainQuest.done[chainQuest.done.length - 1], 'the closing line is the giver\'s own, whole');
  assert.ok(chainQuest.offer[chainQuest.offer.length - 1].startsWith(s.said[0]), 'the ask is the start of the offer\'s last line');
  assert.equal(thanksOf(chainQuest), undefined);
});

test('a quest battle\'s story is its blurb, the narration that ends the scene after it, and the giver\'s closing line', () => {
  const qb = battleOfQuest(battleQuest.id)!;
  const s = storyOf(battleQuest, ['samurai', 'samuraiCommander'])!;
  assert.deepEqual(s.told, [qb.blurb, 'The lanterns drift on downriver. Nobody collects the toll again.']);
  assert.deepEqual(s.said, [battleQuest.done[battleQuest.done.length - 1]]);
});

test('no story invents a word: every line of every quest\'s story is in the quest\'s own text, and none is long', () => {
  let stories = 0;
  for (const q of QUESTS) {
    const s = storyOf(q);
    assert.equal(!!s, hasStory(q), q.id);
    if (!s) {
      assert.ok(thanksOf(q) === undefined || q.done.includes(thanksOf(q)!), q.id);
      continue;
    }
    stories++;
    const qb = battleOfQuest(q.id);
    const own = [...q.offer, ...q.done].join('\n');
    for (const line of s.said) assert.ok(own.includes(line), `${q.id}: "${line}" is the giver's own`);
    if (qb) {
      const scene = qb.after(qb.cast.map((c) => c.heroes[0]));
      const after = scene.shots.flatMap((sh) => sh.lines ?? []).map((l) => plainText(l.text));
      assert.equal(s.told[0], qb.blurb, q.id);
      // (the scene's line may carry an actor's name filled in: its words, the names aside, are the scene's)
      if (s.told[1]) assert.ok(after.some((t) => t.replace(/\{\w+\}/g, '').split(/\s+/).filter((w) => w.length > 3).every((w) => s.told[1].includes(w))), `${q.id}: the line after the battle is the scene's`);
    } else assert.deepEqual(s.told, [], q.id);
    assert.ok(s.told.length + s.said.length <= 3, `${q.id}: three lines at most`);
    assert.ok(s.said.length >= 1, `${q.id}: it ends on the giver's words`);
  }
  assert.ok(stories > 100);
});

test('the recap: each objective with its final count, the part of a story and what comes next, the days', () => {
  const snap = snapOf(ready(chainQuest), chainQuest.id, 20261104)!;
  const lines = recapOf(snap);
  assert.deepEqual(lines[0], { kind: 'goal', text: chainQuest.text, count: `${needOf(chainQuest, 0).toLocaleString('en-GB')} of ${needOf(chainQuest, 0).toLocaleString('en-GB')}` });
  assert.deepEqual(lines.find((l) => l.kind === 'part'), { kind: 'part', text: `Part 2 of ${storyParts(chainQuest)}` });
  assert.equal(lines.find((l) => l.kind === 'next')!.text, `Next: ${nextPart(chainQuest)!.title}`);
  assert.equal(lines.find((l) => l.kind === 'time')!.text, 'Finished 3 days after you took it');
  // a quest of several objectives lists each with its own count
  const many = QUESTS.find((q) => (q.goals?.length ?? 0) >= 1 && q.steps && !battleOfQuest(q.id))!;
  const ml = recapOf(snapOf(ready(many), many.id, 20261104)!).filter((l) => l.kind === 'goal');
  assert.equal(ml.length, objectivesOf(many).length);
  ml.forEach((l, i) => assert.equal(l.text, many.steps![i]));
  // the last part of a story says so
  const last = QUESTS.find((q) => q.after && storyParts(q) === partsOf(q) && !nextPart(q))!;
  assert.equal(recapOf(snapOf(ready(last), last.id, 20261104)!).find((l) => l.kind === 'next')!.text, 'The last part: the story is told');
  // the days
  assert.equal(daysLine(20261104, 20261104), 'Finished the day you took it');
  assert.equal(daysLine(20261103, 20261104), 'Finished 1 day after you took it');
  assert.equal(daysLine(20261031, 20261104), 'Finished 4 days after you took it');
  assert.equal(daysLine(0, 20261104), undefined, 'a save that does not know the day says nothing');
  assert.equal(daysLine(20261104, undefined), undefined);
  assert.equal(daysLine(20261105, 20261104), undefined, 'nor a day that makes no sense');
  // a repeatable done before says how many times now
  const rep = QUESTS.find((q) => q.repeat && !battleOfQuest(q.id))!;
  const rm = ready(rep);
  rm.quests!.times = { [rep.id]: 2 };
  rm.quests!.done = [rep.id];
  assert.equal(recapOf(snapOf(rm, rep.id, 20261104)!).find((l) => l.kind === 'again')!.text, 'Done 3 times now');
});

test('a quest battle\'s recap says who fought and how it went where the save knows, and only what it knows where it does not', () => {
  const qb = battleOfQuest(battleQuest.id)!;
  const how = { heroes: ['samuraiCommander', 'samurai'], ms: 102_000, fights: 4, tries: 2 };
  assert.equal(clockOf(102_000), '1:42');
  assert.deepEqual(battleLines(qb, how, ['samurai', 'samuraiCommander']).map((l) => l.text), [
    'Two Blades on the Bridge: won on the second try, in 1:42 of battle',
    'Fought by Hideo and Kenji',
    `4 fights for its ${qb.waves.length} waves: a heart or two burned`,
  ]);
  // (a battle won before the card existed: the tries begun and the cast, no more)
  assert.deepEqual(battleLines(qb, undefined, ['samurai', 'samuraiCommander'], 3).map((l) => l.text), ['Two Blades on the Bridge: won on the third try', 'Fought by Kenji and Hideo']);
  assert.deepEqual(battleLines(qb, undefined, undefined).map((l) => l.text), ['Two Blades on the Bridge: won']);
  // the win is recorded from the run's own books, once
  const m = startedMeta(3);
  m.quests = { active: [], offers: [], done: [], tries: { [qb.id]: 2 } };
  const recap = newRecap();
  recap.ms = 61_500;
  recap.fights = 3;
  recap.heroes = { samurai: { dealt: 50, taken: 0, healed: 0, kills: 1, grade: 1 }, samuraiCommander: { dealt: 90, taken: 0, healed: 0, kills: 2, grade: 1 } };
  const run = { mode: { kind: 'quest', quest: qb.id }, cleared: true, recap } as unknown as Run;
  assert.equal(noteBattleWon(m, run), true);
  assert.deepEqual(m.quests.how, { [qb.id]: { heroes: ['samuraiCommander', 'samurai'], ms: 61_500, fights: 3, tries: 2 } });
  assert.equal(noteBattleWon(m, { ...run, recap: newRecap() } as Run), false, 'a replay does not rewrite it');
  assert.equal(m.quests.how![qb.id].ms, 61_500);
  // and it is read back safely
  const back = readQuests(JSON.parse(JSON.stringify({ ...m.quests, how: { ...m.quests.how, notABattle: { heroes: ['x'], ms: 1, fights: 1, tries: 1 }, [`${qb.id}x`]: null } })))!;
  assert.deepEqual(back.how, m.quests.how);
  assert.equal(readQuests({ active: [], offers: [], done: [], how: 'junk' })!.how, undefined);
});

test('the rewards: a row for each thing a quest can pay, in the order it is paid', () => {
  const rows = rewardRows({ crowns: 300, stones: 2, chest: 'silver', ores: [{ trait: 'blade', n: 4 }], tomes: { small: 3, large: 1 }, shards: { kind: 'knight', n: 5 }, book: 'nope', keepsake: 'A wheel' }, ['knight']);
  assert.deepEqual(rows.map((r) => r.kind), ['crowns', 'stones', 'chest', 'ore', 'tome', 'tome', 'shards', 'book', 'keepsake']);
  assert.deepEqual(rows[0], { kind: 'crowns', n: 300, text: 'crowns' });
  assert.deepEqual(rows[1], { kind: 'stones', n: 2, text: 'summoning stones' });
  assert.deepEqual(rows[2], { kind: 'chest', ref: 'silver', text: 'A silver chest, on the cart at the camp' });
  assert.equal(rows[3].n, 4);
  assert.equal(rows[3].ref, 'blade');
  assert.deepEqual(rows[4], { kind: 'tome', n: 3, ref: 'small', text: 'small XP tomes' });
  assert.deepEqual(rows[5], { kind: 'tome', n: 1, ref: 'large', text: 'large XP tome' });
  assert.deepEqual(rows[6], { kind: 'shards', n: 5, ref: 'knight', text: "of Kwame's shards" });
  assert.equal(rows[8].text, 'A keepsake: A wheel');
  assert.deepEqual(rewardRows({ stones: 1 }, []), [{ kind: 'stones', n: 1, text: 'summoning stone' }]);
  // a secret hero's shards are paid as stones, and read as stones
  assert.deepEqual(rewardRows({ stones: 1, shards: { kind: 'vael', n: 3 } }, [], ['vael']), [{ kind: 'stones', n: 4, text: 'summoning stones' }]);
  // a hero who joins is told as its tease, with no picture of who it is; a save that has it is paid the other reward, merged
  const hero = { crowns: 100, hero: { kind: 'werewolf', tease: 'the stranger joins your company', instead: { crowns: 400, stones: 4 } } };
  assert.deepEqual(rewardRows(hero, ['knight']), [{ kind: 'hero', text: 'The stranger joins your company' }, { kind: 'crowns', n: 100, text: 'crowns' }]);
  assert.deepEqual(rewardRows(hero, ['knight', 'werewolf']), [{ kind: 'crowns', n: 500, text: 'crowns' }, { kind: 'stones', n: 4, text: 'summoning stones' }]);
});

test('the rows are what the hand-in really pays, for every quest', () => {
  for (const q of QUESTS) {
    const m = ready(q);
    const snap = snapOf(m, q.id, 20261104)!;
    const view = questCompleteView(snap);
    const before = { crowns: m.crowns, stones: m.stones ?? 0, stash: m.stash.length, heroes: m.unlocked.length };
    assert.equal(handIn(m, q.id, 20261104), true, q.id);
    const n = (kind: string): number => view.rewards.filter((r) => r.kind === kind).reduce((a, r) => a + (r.n ?? 1), 0);
    assert.equal(m.crowns - before.crowns, n('crowns'), `${q.id}: crowns`);
    assert.equal((m.stones ?? 0) - before.stones, n('stones'), `${q.id}: stones`);
    assert.equal(m.stash.length - before.stash, n('chest'), `${q.id}: chests`);
    // (a hero's shards may fill its bar, so it joins too: the row names the shards, and its join reveal follows the card as any does)
    const joined = m.unlocked.length - before.heroes;
    assert.ok(joined === n('hero') || (joined === n('hero') + 1 && view.rewards.some((r) => r.kind === 'shards')), `${q.id}: a hero joins`);
    // (and every word the old hand-in line said of the reward is on the card)
    assert.equal(view.rewards.length > 0, rewardWords(rewardOf(q), { unlocked: snap.owned }).length > 0, q.id);
    assert.equal(view.title, q.title);
    assert.ok(view.recap.length >= 1, q.id);
    assert.ok(view.story || view.thanks || q.done.length === 0, `${q.id}: the giver has the last word`);
    assert.match(view.starLine, /^[★☆]{5} · \w+ · (Short|Long|Chain|Campaign)$/, q.id);
    assert.equal(view.next?.to, 'board');
  }
});

test('a quest handed in from an old save still has its card: no day taken, its goal from before a retune, a battle with no record', () => {
  // (a quest taken before a retune keeps what it asked then, `QuestDef.was`)
  const retuned = QUESTS.find((q) => q.was && q.was.goal.n !== q.goal.n && !battleOfQuest(q.id))!;
  const m = startedMeta(5);
  m.quests = { active: [{ id: retuned.id, progress: retuned.was!.goal.n, took: 0 }], offers: [], done: [] };
  const snap = snapOf(m, retuned.id)!;
  assert.equal(snap.def.text, retuned.was!.text, 'the goal it was taken with');
  const view = questCompleteView(snap);
  assert.equal(view.recap[0].text, retuned.was!.text);
  assert.equal(view.recap[0].count, `${retuned.was!.goal.n.toLocaleString('en-GB')} of ${retuned.was!.goal.n.toLocaleString('en-GB')}`);
  assert.ok(!view.recap.some((l) => l.kind === 'time'), 'no day known: no line');
  assert.equal(handIn(m, retuned.id), true);
  // a battle won before the record existed
  const bm = ready(battleQuest, { took: 0 });
  bm.unlocked.push('samurai', 'samuraiCommander');
  const bv = questCompleteView(snapOf(bm, battleQuest.id)!);
  assert.deepEqual(bv.recap.map((l) => l.text), ['Two Blades on the Bridge: won', 'Fought by Kenji and Hideo']);
  // not in the log: no snapshot
  assert.equal(snapOf(startedMeta(1), plain.id), null);
});

test('every part of every Eidolon chain has its card: the piece, the part, what comes next, its share of the pay', () => {
  for (const c of CHAINS) {
    c.parts.forEach((part, i) => {
      const v = chainPartView(c, i)!;
      assert.equal(v.title, part.title);
      assert.equal(v.giver.name, c.giver.name);
      assert.deepEqual(v.story!.told, [...part.piece.lines]);
      assert.ok(part.begin.startsWith(v.story!.said[0]), `${part.id}: the giver's own words`);
      assert.ok(v.recap.some((l) => l.kind === 'part' && l.text.startsWith(`Part ${i + 1} of `) && l.text.endsWith(c.title)));
      const next = v.recap.find((l) => l.kind === 'next')!.text;
      if (c.parts[i + 1]) assert.equal(next, `Next: ${c.parts[i + 1].title}`);
      else assert.match(next, /^Next: .*waits to test the keep$|^Every piece is found/);
      assert.equal(v.rewards[0].text, `A piece of the pact: ${part.piece.name}`);
      assert.ok(v.rewards.some((r) => r.kind === 'crowns' || r.kind === 'chest'), part.id);
      assert.deepEqual(v.next, { to: 'piece', label: 'See the piece' });
      if (part.goal.kind === 'battle') assert.ok(v.recap[0].text.startsWith(questBattleById(part.goal.battle)!.title));
    });
    assert.equal(chainPartView(c, c.parts.length), undefined);
  }
});

test('the card is a standard ornate menu, the toasts wait under it, and both hand-ins open it', async () => {
  const { readFileSync } = await import('node:fs');
  const card = readFileSync('src/questComplete.ts', 'utf8');
  assert.match(card, /ornateMenu\(\{/);
  assert.match(card, /menuFoot\(menu, \{\s*back: \{ word: 'close' \}/);
  assert.doesNotMatch(card, /setAttribute\(\s*'role',\s*'dialog'/, 'no dialog of its own');
  assert.match(card, /prefers-reduced-motion/);
  // (the toast queue holds while any ornate menu is up: `.om` is in its list of cards)
  assert.match(readFileSync('src/achievementsView.ts', 'utf8'), /const CARDS = '\.om,/);
  for (const f of ['src/questLog.ts', 'src/questCard.ts']) {
    const src = readFileSync(f, 'utf8');
    assert.match(src, /snapOf\(m, [\w.]+, todayKey\(\)\);\s*\n\s*if \(!handIn\(/, `${f} reads the quest before handing it in`);
    assert.match(src, /openQuestComplete\(questCompleteView\(snap\)/, f);
  }
  assert.match(readFileSync('src/main.ts', 'utf8'), /chainPartView\(chain, piece\.part/);
  assert.equal(lengthOf(plain) === 'short' || lengthOf(plain) === 'long', true);
});
