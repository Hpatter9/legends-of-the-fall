// Dynasties, phase 5: seasons and the Houses (src/sim/dynasty.ts, docs/notes/dynasty-5.md). A season counts only at 20 waves fought in
// it; the bench never ages; the migration's credit stops at five seasons, so nobody is made old by an update; the stages and their pace;
// Elder's Counsel; lasting progress keyed by kind; the reader's caps and an old save playing on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { agingAtTurn, ageWords, counselXp, dayNumber, DYNASTY, lineWords, noteServed, openDynasty, readDynasty, seasonIndex, seasonLine, seasonOf, stageOf, stageOfKind, takeSeasonNews, toNextStage, bearerOf } from '../src/sim/dynasty';
import { BASE_AGE } from '../src/sim/dynastyWords';
import { HERO_NAMES } from '../src/sim/heroNames';
import { AGE_LOOKS, AGE_LOOKS_NOT_HUMAN } from '../src/sim/heroLooks';
import { loadMeta, saveMeta, startedMeta } from '../src/sim/meta';
import { levelOfKind } from '../src/sim/levels';

const START = 20261102;
/** The day key `n` days after `START`. */
const dayAfter = (n: number): number => {
  const d = new Date(Date.UTC(2026, 10, 2) + n * 86_400_000);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};
const opened = () => {
  const m = startedMeta(3);
  openDynasty(m, START);
  return m;
};

test('a season is fourteen days; four make a Year of the War; the Dynasties start on the day they open', () => {
  const m = opened();
  assert.equal(m.dynasty!.start, START);
  assert.equal(seasonIndex(m.dynasty!, dayAfter(13)), 0);
  assert.equal(seasonIndex(m.dynasty!, dayAfter(14)), 1);
  assert.deepEqual(seasonOf(m.dynasty!, START), { index: 0, name: 'spring', year: 1, daysLeft: 14 });
  assert.deepEqual(seasonOf(m.dynasty!, dayAfter(13)), { index: 0, name: 'spring', year: 1, daysLeft: 1 });
  assert.equal(seasonOf(m.dynasty!, dayAfter(42)).name, 'winter');
  assert.equal(seasonLine(m.dynasty!, dayAfter(56 + 28)), 'Year 2 of the War · Autumn');
  // (across a month's and a year's end)
  assert.equal(dayNumber(20261231) + 1, dayNumber(20270101));
  // (every owned kind has its line, its first bearer the hero as written)
  for (const k of m.unlocked) assert.deepEqual(m.dynasty!.lines[k], { bearers: [{ name: HERO_NAMES[k].name, gen: 1, served: 0 }], current: 0 });
  // (opening again changes nothing)
  const before = JSON.stringify(m.dynasty);
  openDynasty(m, START);
  assert.equal(JSON.stringify(m.dynasty), before);
});

test('a season counts only at 20 waves fought in it, settled when it has turned; auto-replays count half', () => {
  const m = opened();
  for (let i = 0; i < 19; i++) noteServed(m, ['knight'], 1, dayAfter(i % 14));
  for (let i = 0; i < 20; i++) noteServed(m, ['samurai'], 1, dayAfter(3));
  for (let i = 0; i < 39; i++) noteServed(m, ['archer'], 0.5, dayAfter(5));
  for (let i = 0; i < 40; i++) noteServed(m, ['wizard'], 0.5, dayAfter(5));
  // (nothing ages until the season turns)
  assert.equal(bearerOf(m, 'samurai')!.served, 0);
  assert.deepEqual(agingAtTurn(m, dayAfter(10)).map((a) => a.kind).sort(), ['samurai', 'wizard']);
  openDynasty(m, dayAfter(14));
  assert.equal(bearerOf(m, 'knight')!.served, 0, '19 waves do not serve a season');
  assert.equal(bearerOf(m, 'samurai')!.served, 1);
  assert.equal(bearerOf(m, 'archer')!.served, 0, '39 auto waves are 19.5');
  assert.equal(bearerOf(m, 'wizard')!.served, 1);
  // (a new season starts from nothing)
  assert.equal(m.dynasty!.served, undefined);
  // (a season's waves are its own: 19 in one and 19 in the next are not a season)
  noteServed(m, ['knight'], 1, dayAfter(15));
  assert.equal(m.dynasty!.served!.knight.waves, 1);
});

test('the bench never ages: only the heroes placed in a wave count it', () => {
  const m = opened();
  for (let day = 0; day < 140; day++) for (let w = 0; w < 3; w++) noteServed(m, ['knight', 'samurai'], 1, dayAfter(day));
  openDynasty(m, dayAfter(140));
  assert.equal(bearerOf(m, 'knight')!.served, 10);
  for (const k of ['kunoichi', 'archer', 'wizard']) assert.equal(bearerOf(m, k)!.served, 0, `${k} sat on the bench`);
  // (a kind not owned is never counted, and gains no line)
  noteServed(m, ['tyrant'], 1, dayAfter(141));
  assert.equal(m.dynasty!.lines.tyrant, undefined);
});

test('the stages: Youth 0 to 1, Prime 2 to 5, Veteran 6 to 9, Elder 10 or more; a season served is a year of story age', () => {
  assert.deepEqual([0, 1, 2, 5, 6, 9, 10, 30].map(stageOf), ['youth', 'youth', 'prime', 'prime', 'veteran', 'veteran', 'elder', 'elder']);
  assert.deepEqual([0, 3, 9, 10].map(toNextStage), [2, 3, 1, 0]);
  assert.equal(ageWords('knight', 0), '26');
  assert.equal(ageWords('knight', 10), '36', 'Kwame, 26, is 36 as he reaches Elder');
  assert.match(ageWords('rifleBot', 3), /service year 10/);
  // (every hero has an age)
  for (const k of Object.keys(HERO_NAMES)) assert.ok(BASE_AGE[k] > 0, `${k} has a story age`);
  // (the touch of the years is a steady grade: more silver for an Elder than a Veteran)
  for (const looks of [AGE_LOOKS, AGE_LOOKS_NOT_HUMAN]) assert.ok(looks.elder.grey > looks.veteran.grey && looks.veteran.grey > 0 && looks.elder.grey < 0.5);
});

test('the pace: a favourite played daily is a Veteran on day 84 and an Elder on day 140', () => {
  const m = opened();
  let veteran = -1;
  let elder = -1;
  for (let day = 0; day <= 150; day++) {
    openDynasty(m, dayAfter(day));
    const st = stageOfKind(m, 'knight');
    if (st === 'veteran' && veteran < 0) veteran = day;
    if (st === 'elder' && elder < 0) elder = day;
    // (a daily player's evening: two army runs of a few waves)
    for (let w = 0; w < 4; w++) noteServed(m, ['knight'], 1, dayAfter(day));
  }
  assert.equal(veteran, 84);
  assert.equal(elder, 140);
  assert.deepEqual(bearerOf(m, 'knight')!.memory, ['Came into the Prime of life · Year 1, Autumn', 'Became a Veteran · Year 2, Autumn', 'Became an Elder · Year 3, Autumn']);
});

test('the migration: a save from before is seeded with its past, at most five seasons, so nobody is made old by an update', () => {
  const m = startedMeta(4);
  m.wavesFought = { knight: 9000, samurai: 600, kunoichi: 249.5, archer: 1250 };
  const aged = openDynasty(m, START);
  assert.deepEqual(aged, [], 'an update tells no ageing');
  assert.equal(bearerOf(m, 'knight')!.served, DYNASTY.CREDIT_CAP);
  assert.equal(bearerOf(m, 'samurai')!.served, 2);
  assert.equal(bearerOf(m, 'kunoichi')!.served, 0);
  assert.equal(bearerOf(m, 'archer')!.served, 5);
  for (const k of m.unlocked) assert.ok(['youth', 'prime'].includes(stageOfKind(m, k)), `${k} is not made old`);
  // (and the long-time favourite reaches Veteran in about one season of play)
  for (let i = 0; i < 20; i++) noteServed(m, ['knight'], 1, START);
  openDynasty(m, dayAfter(14));
  assert.equal(stageOfKind(m, 'knight'), 'veteran');
  // (a hero who joins later has its line the next time the Dynasties open)
  m.unlocked.push('tyrant');
  openDynasty(m, dayAfter(15));
  assert.equal(bearerOf(m, 'tyrant')!.name, 'Edmund');
  // (a save with no heroes yet has nothing opened)
  const fresh = startedMeta(5);
  fresh.unlocked = [];
  openDynasty(fresh, START);
  assert.equal(fresh.dynasty, undefined);
});

test('the Hall of Legends\' mentors are bearer I with the mentor\'s fate, and keep their seats', () => {
  const m = startedMeta(6);
  m.mentors = { martial: { kind: 'knight', since: 0 } };
  openDynasty(m, START);
  assert.equal(bearerOf(m, 'knight')!.fate, 'mentor');
  assert.deepEqual(m.mentors, { martial: { kind: 'knight', since: 0 } });
  delete m.mentors;
  openDynasty(m, START);
  assert.equal(bearerOf(m, 'knight')!.fate, undefined, 'recalled, the fate is cleared');
});

test('ageing keeps every lasting thing: XP, level, ranks, talents and gear stay keyed by the kind', () => {
  const m = opened();
  m.xp.knight = 123456;
  m.shards.knight = 40;
  const level = levelOfKind(m, 'knight');
  const keep = JSON.stringify({ xp: m.xp, shards: m.shards, talents: m.talents, equipped: m.equipped, books: (m as { books?: unknown }).books });
  for (let day = 0; day < 141; day++) for (let w = 0; w < 2; w++) noteServed(m, ['knight'], 1, dayAfter(day));
  openDynasty(m, dayAfter(141));
  assert.equal(stageOfKind(m, 'knight'), 'elder');
  assert.equal(levelOfKind(m, 'knight'), level);
  assert.equal(JSON.stringify({ xp: m.xp, shards: m.shards, talents: m.talents, equipped: m.equipped, books: (m as { books?: unknown }).books }), keep);
});

test('Elder\'s Counsel: +5% XP to the rest of the party while an Elder is fielded, not stacking', () => {
  const m = opened();
  m.dynasty!.lines.knight.bearers[0].served = 10;
  m.dynasty!.lines.samurai.bearers[0].served = 12;
  m.dynasty!.lines.archer.bearers[0].served = 7;
  const gains = { knight: 1000, samurai: 1000, archer: 1000, wizard: 2000 };
  assert.deepEqual(counselXp(m, gains, ['archer', 'wizard']), gains, 'no Elder on the field, no Counsel');
  assert.deepEqual(counselXp(m, gains, ['knight', 'archer', 'wizard']), { knight: 1000, samurai: 1050, archer: 1050, wizard: 2100 });
  // (two Elders: each gives it to the other, and nobody has it twice)
  assert.deepEqual(counselXp(m, gains, ['knight', 'samurai', 'wizard']), { knight: 1050, samurai: 1050, archer: 1050, wizard: 2100 });
});

test('a season\'s turn is told once; the line\'s words for the hero sheet', () => {
  const m = opened();
  assert.equal(takeSeasonNews(m, START), null, 'the first Spring is not news');
  assert.deepEqual(takeSeasonNews(m, dayAfter(15)), { name: 'summer', year: 1 });
  assert.equal(takeSeasonNews(m, dayAfter(16)), null);
  assert.equal(lineWords(m, 'knight'), 'Kwame’s line · Gen I · 1 bearer');
});

test('the Dynasties are saved and read back; an old save plays on; the reader holds the caps', () => {
  const m = opened();
  for (let i = 0; i < 7; i++) noteServed(m, ['knight', 'archer'], 0.5, dayAfter(2));
  m.dynasty!.lines.knight.bearers[0].memory = ['Came into the Prime of life · Year 1, Autumn'];
  takeSeasonNews(m, dayAfter(20));
  const store: Record<string, string> = {};
  saveMeta(m, { setItem: (k, v) => void (store[k] = v) });
  assert.deepEqual(loadMeta(1, { getItem: (k) => store[k] ?? null }).dynasty, m.dynasty);
  // (an old save, from before the Dynasties: it loads as it was, with none, until the page opens them)
  const old = startedMeta(2);
  saveMeta(old, { setItem: (k, v) => void (store[k] = v) });
  assert.equal(loadMeta(1, { getItem: (k) => store[k] ?? null }).dynasty, undefined);
  // (a hand-edited save: unknown kinds dropped, numbers clamped, lists cut)
  const raw = {
    v: 1,
    start: START,
    lines: {
      knight: { bearers: [{ name: 'Kwame', gen: -3, served: 1e9, fate: 'king', memory: Array.from({ length: 30 }, (_, i) => `line ${i}`) }, ...Array.from({ length: 60 }, () => ({ name: 'Heir', gen: 2, served: 0 }))], current: 999 },
      nobody: { bearers: [{ name: 'Who', gen: 1, served: 1 }], current: 0 },
      samurai: { bearers: [{ name: '', gen: 1, served: 1 }], current: 0 },
    },
    served: { knight: { season: 2, waves: 1e9 }, nobody: { season: 0, waves: 3 }, archer: { season: 0, waves: 5 } },
    told: -1,
  };
  const d = readDynasty(raw)!;
  assert.deepEqual(Object.keys(d.lines), ['knight']);
  const k = d.lines.knight;
  assert.equal(k.bearers.length, DYNASTY.MAX_BEARERS);
  assert.equal(k.current, DYNASTY.MAX_BEARERS - 1);
  assert.equal(k.bearers[0].gen, 1);
  assert.equal(k.bearers[0].served, DYNASTY.MAX_SERVED);
  assert.equal(k.bearers[0].fate, undefined);
  assert.equal(k.bearers[0].memory!.length, DYNASTY.MAX_MEMORY);
  assert.deepEqual(Object.keys(d.served!), ['knight']);
  assert.ok(d.served!.knight.waves <= 1e4);
  assert.equal(d.told, undefined);
  assert.equal(readDynasty({ start: 'soon' }), undefined);
  assert.equal(readDynasty(null), undefined);
});

test('Dynasties never reach a fight: the battle, its AI and the run do not read them', () => {
  for (const f of ['src/sim/battle.ts', 'src/sim/run.ts', 'src/sim/armies.ts', 'src/sim/ailments.ts', 'src/sim/blow.ts']) assert.doesNotMatch(readFileSync(f, 'utf8'), /dynasty/i, `${f} reads the Dynasties`);
  // (the sim side of them uses no clock and no randomness: the page passes the day)
  for (const f of ['src/sim/dynasty.ts', 'src/sim/dynastyWords.ts']) {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /Math\.random|Date\.now|new Date\(|document|window/);
  }
});
