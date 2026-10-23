import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_HEROES } from '../src/sim/units';
import { TRAITS, traitsOf } from '../src/sim/traits';
import { Rng } from '../src/sim/rng';
import { BANTER, FOE_GRUMBLES, HERO_QUIPS, LOADING_TIPS, AWARD_JOKES, RECAP_LOSS, RECAP_WIN, RESULT_LOSS, RESULT_WIN } from '../src/quipData';
import { ACHIEVEMENTS } from '../src/sim/achievements';
import { GAP_MS, pickPair, QuipBox, SCENE_MAX } from '../src/render/quipRules';
import { DEFAULTS, parseSettings } from '../src/settings';

const KINDS = ['hired', 'placed', 'won', 'lost'] as const;

test('every hero has a short line for each moment', () => {
  for (const k of ALL_HEROES) {
    assert.ok(HERO_QUIPS[k], `no quips for ${k}`);
    for (const kind of KINDS) {
      const t = HERO_QUIPS[k][kind];
      assert.ok(t && t.length >= 8 && t.length <= 70, `${k} ${kind}: ${t}`);
    }
  }
  assert.deepEqual(Object.keys(HERO_QUIPS).filter((k) => !ALL_HEROES.includes(k)), []);
});

test('banter is for real traits, and short', () => {
  for (const [t, lines] of Object.entries(BANTER)) {
    assert.ok(TRAITS[t], `${t} is not a trait`);
    for (const [a, b] of lines) assert.ok(a.length <= 60 && b.length <= 60 && a && b);
  }
});

test('the funny text is there and short enough for a bubble or a line', () => {
  for (const list of [FOE_GRUMBLES, LOADING_TIPS, RECAP_WIN, RECAP_LOSS, RESULT_WIN, RESULT_LOSS]) {
    assert.ok(list.length >= 3);
    for (const t of list) assert.ok(t.length > 5 && t.length <= 120, t);
  }
  for (const id of Object.keys(AWARD_JOKES)) assert.ok(ACHIEVEMENTS.some((a) => a.id === id), `${id} is no achievement`);
  for (const a of ACHIEVEMENTS) assert.ok(AWARD_JOKES[a.id], `${a.id} has no aside`);
});

test('no new text names a model', () => {
  const all = JSON.stringify([HERO_QUIPS, BANTER, FOE_GRUMBLES, LOADING_TIPS, RECAP_WIN, RECAP_LOSS, RESULT_WIN, RESULT_LOSS, AWARD_JOKES]);
  assert.ok(!/claude|opus|sonnet|haiku|gpt/i.test(all));
});

/** A box whose every roll passes (so only the rules decide): try a handful of seeds and keep one that talks. */
const talker = (enabled = () => true) => {
  for (let seed = 1; seed < 500; seed++) {
    if (new QuipBox(seed).say('knight', 'hired', 0)) return new QuipBox(seed, enabled);
  }
  throw new Error('no seed talks');
};

test('a quip is held back inside the gap and let through after it', () => {
  const b = talker();
  assert.ok(b.say('knight', 'hired', 0));
  for (let t = 1; t < GAP_MS; t += 500) assert.equal(b.say('samurai', 'hired', t), null);
  let spoke = false;
  for (let i = 0; i < 40 && !spoke; i++) spoke = !!b.say('samurai', 'hired', GAP_MS + i * GAP_MS);
  assert.ok(spoke);
});

test('a scene has a cap, and a new scene resets it', () => {
  const b = talker();
  let said = 0;
  for (let i = 0; i < 400; i++) if (b.say('knight', 'hired', i * GAP_MS)) said++;
  assert.equal(said, SCENE_MAX);
  b.newScene();
  let again = 0;
  for (let i = 0; i < 400; i++) if (b.say('knight', 'hired', 1e7 + i * GAP_MS)) again++;
  assert.equal(again, SCENE_MAX);
});

test('nothing is said when quips are off', () => {
  const b = talker(() => false);
  for (let i = 0; i < 100; i++) assert.equal(b.say('knight', 'won', i * GAP_MS), null);
  assert.equal(b.ending(['knight', 'samurai'], true, 0), null);
  assert.equal(b.grumble(2, 0), null);
});

test('a hero is placed for the first time once a scene', () => {
  let again = 0;
  for (let seed = 1; seed < 200; seed++) {
    const b = new QuipBox(seed);
    let n = 0;
    for (let i = 0; i < 5; i++) if (b.say('archer', 'placed', i * GAP_MS)) n++;
    assert.ok(n <= 1, 'once a scene');
    b.newScene();
    for (let i = 0; i < 5; i++) if (b.say('archer', 'placed', 1e7 + i * GAP_MS)) again++;
  }
  assert.ok(again > 0, 'a new scene lets them speak again');
});

test('the same seed gives the same quips', () => {
  const run = (seed: number) => {
    const b = new QuipBox(seed);
    const out: (string | null)[] = [];
    for (let i = 0; i < 30; i++) out.push(b.say(ALL_HEROES[i], 'hired', i * GAP_MS)?.text ?? null);
    return out;
  };
  assert.deepEqual(run(7), run(7));
  assert.notDeepEqual(run(7), run(8));
});

test('an ending is one hero, or two who share a trait', () => {
  const heroes = ['knight', 'peasant', 'samurai', 'wizard'];
  let banter = 0;
  let single = 0;
  for (let seed = 1; seed < 300; seed++) {
    const b = new QuipBox(seed);
    const q = b.ending(heroes, true, 0);
    if (!q) continue;
    assert.ok(heroes.includes(q.hero));
    if (q.reply) {
      banter++;
      assert.ok(heroes.includes(q.reply.hero) && q.reply.hero !== q.hero);
      assert.ok(traitsOf(q.hero).some((t) => traitsOf(q.reply!.hero).includes(t)));
    } else {
      single++;
      assert.equal(q.text, HERO_QUIPS[q.hero].won);
    }
  }
  assert.ok(banter > 0 && single > 0);
});

test('pickPair finds nothing for heroes with no trait in common', () => {
  assert.equal(pickPair(['knight'], new Rng(1)), null);
  assert.equal(pickPair(['knight', 'knight'], new Rng(1)), null);
  assert.ok(pickPair(['knight', 'peasant'], new Rng(1)));
});

test('a foe grumbles at most once a scene, and less often than not in a big band', () => {
  let big = 0;
  let small = 0;
  for (let seed = 1; seed < 400; seed++) {
    const a = new QuipBox(seed);
    if (a.grumble(8, 0)) big++;
    assert.equal(a.grumble(8, 100000), null);
    const b = new QuipBox(seed);
    if (b.grumble(2, 0)) small++;
  }
  assert.ok(small > big && big < 200);
});

test('the settings carry a quips switch, on by default and kept when saved', () => {
  assert.equal(DEFAULTS.quips, true);
  assert.equal(parseSettings(null).quips, true);
  assert.equal(parseSettings('{"quips":false}').quips, false);
  assert.equal(parseSettings('{"quips":"no"}').quips, true);
});
