// HERO-LIVE-STATS (docs/notes/hero-live-stats.md, `src/heroLiveRules.ts`): a tap on a hero mid-fight shows its live stats in the HUD's
// place. Which hero a tap picks, what the panel reads (bars, this fight's numbers, the fighting numbers marked up or down, every buff and
// ailment with its time left), and that reading never changes the battle: a fight read every tick plays out exactly as one left alone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readyBattle } from './helpers';
import { addUnit, fight, stepBattle, type Battle, type Unit } from '../src/sim/battle';
import { startStats, tally } from '../src/sim/fightStats';
import { AILMENT_KEYS } from '../src/sim/ailmentKeys';
import { AILMENT_WORDS, effectsOf, leftWords, liveOf, nearestMark, pickNow, pickOnTap, pickable, shortNum, statLines, statNumbers } from '../src/heroLiveRules';

const heroes = (b: Battle) => b.units.filter((u) => u.side === 'hero');
const foes = (b: Battle) => b.units.filter((u) => u.side === 'foe');
function fighting(seed = 3): Battle {
  const b = readyBattle(seed);
  fight(b);
  return b;
}

test('a tap on a hero picks it; the same hero again, a foe, a summon or the empty board brings the skills back', () => {
  const b = fighting();
  const [h, h2] = heroes(b);
  const [f] = foes(b);
  assert.equal(pickOnTap(null, h), h.id);
  assert.equal(pickOnTap(h.id, h), null, 'the same hero again');
  assert.equal(pickOnTap(h.id, h2), h2.id, 'another hero switches to it');
  assert.equal(pickOnTap(h.id, f), null, 'a foe');
  assert.equal(pickOnTap(h.id, undefined), null, 'the empty board');
  const wolf = addUnit(b, 'wolf', 0, 0, {});
  wolf.side = 'hero';
  wolf.owner = h.id;
  assert.equal(pickable(wolf), false, 'a summon has no panel');
  assert.equal(pickOnTap(null, wolf), null);
});

test('the pick holds while its hero is in the fight, fallen too, and goes when the fight is over or the hero has left it', () => {
  const b = fighting();
  const [h] = heroes(b);
  assert.equal(pickNow(b, h.id), h.id);
  h.alive = false;
  h.diedAt = b.t;
  assert.equal(pickNow(b, h.id), h.id, 'a fallen hero stays picked: its panel says when a life raises it');
  assert.equal(pickNow(b, 9999), null, 'a unit no longer in the battle');
  b.phase = 'won';
  assert.equal(pickNow(b, h.id), null, 'the fight is over');
});

test('a tap picks the nearest hero whose reach it falls in, a small one beside a big one too', () => {
  const marks = [
    { id: 1, x: 0, y: 0, r: 40 },
    { id: 2, x: 30, y: 0, r: 18 },
  ];
  assert.equal(nearestMark(marks, 28, 2), 2, 'the small hero, though the big one reaches there too');
  assert.equal(nearestMark(marks, 2, 0), 1);
  assert.equal(nearestMark(marks, 200, 0), null, 'the empty board');
});

test('the panel reads the hero: bars, pool, shield, ultimate, this fight\'s tally and its casts', () => {
  const b = fighting();
  const [h] = heroes(b);
  const [f] = foes(b);
  const stats = startStats(b.units);
  tally(stats, [
    { kind: 'hit', by: h.id, to: f.id, dmg: 40, heavy: false, splash: false, killed: true, src: 'blow' },
    { kind: 'hit', by: f.id, to: h.id, dmg: 12, heavy: false, splash: false, killed: false, src: 'blow' },
    { kind: 'skill', by: h.id, name: 'x', ms: 300 },
    { kind: 'skill', by: h.id, name: 'y', ms: 300 },
  ]);
  h.hp = Math.floor(h.maxHp / 2);
  h.shield = { hp: 50, until: b.t + 3000 };
  const v = liveOf(b, h, stats.find((s) => s.id === h.id));
  assert.equal(v.hp.text, `${h.hp}/${h.maxHp}`);
  assert.ok(Math.abs(v.hp.share - h.hp / h.maxHp) < 1e-9);
  assert.match(v.pool.text, /^\d+\/\d+ (MP|SP)$/);
  assert.equal(v.shield?.text, '50 · 3.0s', 'a shield is a bar with its time left');
  assert.ok(!v.effects.some((e) => e.key === 'shield'), 'and not a chip as well');
  assert.deepEqual(v.fight, { dealt: 40, taken: 12, healed: 0, kills: 1, casts: 2 });
  assert.ok(v.ult.locked && v.ult.text === 'Opens at level 30', 'a level 1 hero has no ultimate yet');
  assert.equal(v.level, 1);
  assert.ok(v.notes.length === 0 || v.notes.every((n) => typeof n === 'string'));
});

test('a summon\'s cast counts for its caller, and a foe\'s for no one', () => {
  const b = fighting();
  const [h] = heroes(b);
  const [f] = foes(b);
  const wolf = addUnit(b, 'wolf', 0, 0, {});
  wolf.side = 'hero';
  wolf.owner = h.id;
  const stats = startStats(b.units);
  tally(stats, [{ kind: 'skill', by: wolf.id, name: 'bite', ms: 300 }, { kind: 'skill', by: f.id, name: 'z', ms: 300 }], b.units);
  assert.equal(stats.find((s) => s.id === h.id)!.casts, 1);
  assert.equal(stats.reduce((n, s) => n + (s.casts ?? 0), 0), 1);
});

test('every buff and ailment shows with its time left, the ailments first; a worn-off one shows nothing', () => {
  const b = fighting();
  const [h] = heroes(b);
  b.t = 1000;
  h.hasteUntil = 4000;
  h.wardUntil = 500;
  h.ail = [
    { kind: 'burn', until: 2500, by: 0 },
    { kind: 'poison', until: 6000, by: 0, stacks: 3 },
  ];
  h.kx = { pinned: 3000 };
  const fx = effectsOf(b, h);
  assert.deepEqual(fx.slice(0, 2).map((e) => e.key), ['poison', 'burn'], 'the latest ailment first');
  assert.equal(fx.find((e) => e.key === 'poison')!.stacks, 3);
  assert.equal(fx.find((e) => e.key === 'burn')!.left, 1500);
  assert.equal(leftWords(fx.find((e) => e.key === 'burn')!), '1.5s');
  const haste = fx.find((e) => e.key === 'haste')!;
  assert.ok(haste.good && haste.left === 3000);
  assert.ok(!fx.some((e) => e.key === 'ward'), 'a ward that has worn off');
  const pinned = fx.find((e) => e.key === 'pinned')!;
  assert.ok(!pinned.good);
  assert.ok(fx.indexOf(haste) < fx.indexOf(pinned), 'the helpful before the harmful');
  assert.ok(fx.every((e) => e.text.length > 0 && e.name.length > 0), 'each says what it does');
  h.alive = false;
  assert.deepEqual(effectsOf(b, h), [], 'the fallen carry nothing');
});

test('every ailment has a name and a meaning, and every motif an effect asks for is a painted combat icon', () => {
  for (const k of AILMENT_KEYS) assert.ok(AILMENT_WORDS[k].name && AILMENT_WORDS[k].text, k);
  const art = readFileSync('src/combatArtAssets.ts', 'utf8');
  const have = new Set([...art.matchAll(/^import (\w+) from/gm)].map((m) => m[1]));
  const src = readFileSync('src/heroLiveRules.ts', 'utf8');
  const asked = new Set([...src.matchAll(/(?:true|false), '(\w+)', '/g), ...src.matchAll(/motif: '(\w+)'/g)].map((m) => m[1]));
  assert.ok(asked.size > 20);
  for (const m of asked) assert.ok(have.has(m), `the motif ${m} is in COMBAT_ART`);
});

test('the fighting numbers are marked up or down against the fight\'s start: a haste quickens the blows, a cut to attack lowers it', () => {
  const b = fighting();
  const [h] = heroes(b);
  const base = statNumbers(b, h);
  assert.ok(statLines(base, base).every((s) => s.trend === ''), 'nothing changed');
  h.hasteUntil = b.t + 5000;
  h.power = (h.power ?? 1) * 0.7;
  const lines = statLines(statNumbers(b, h), base);
  const blows = lines.find((s) => s.key === 'blows')!;
  const attack = lines.find((s) => s.key === 'attack')!;
  assert.equal(blows.trend, 'up', 'quicker blows are better');
  assert.equal(attack.trend, 'down');
  assert.ok(attack.was, 'what it was as the fight began');
  assert.ok(lines.find((s) => s.key === 'walk')!.trend === 'up');
});

test('reading the panel never changes the battle: an old single damage over time is left as it was, and a fight read every tick plays out the same', () => {
  const b = fighting();
  const [h] = heroes(b);
  h.dot = { kind: 'burn', dmg: 3, every: 500, ms: 2000, by: 0, next: b.t + 500, until: b.t + 2000 } as Unit['dot'];
  const before = JSON.stringify(b);
  liveOf(b, h);
  assert.equal(JSON.stringify(b), before, 'liveOf wrote nothing');
  assert.ok(h.dot, 'the old field is not folded in by a read');
  assert.ok(effectsOf(b, h).some((e) => e.key === 'burn'), 'and it is shown');
  // (two fights from one seed: one read in full every tick, one left alone)
  const play = (read: boolean) => {
    const x = fighting(11);
    const stats = startStats(x.units);
    for (let i = 0; i < 3000 && x.phase === 'fight'; i++) {
      const ev = stepBattle(x);
      tally(stats, ev, x.units);
      if (read) for (const u of heroes(x)) if (pickable(u)) liveOf(x, u, stats.find((s) => s.id === u.id), statNumbers(x, u));
    }
    return JSON.stringify(x);
  };
  assert.equal(play(true), play(false));
});

test('big numbers are cut short enough for the narrow cells', () => {
  assert.equal(shortNum(980), '980');
  assert.equal(shortNum(12345), '12.3k');
  assert.equal(shortNum(123456), '123k');
  assert.equal(shortNum(1234567), '1.2M');
});
