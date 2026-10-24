import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_HEROES } from '../src/sim/units';
import { TRAITS, traitsOf } from '../src/sim/traits';
import { Rng } from '../src/sim/rng';
import {
  BANTER, DUCHESS_LINES, FOE_GRUMBLES, HERO_QUIPS, KING_LINES, LOADING_TIPS, AWARD_JOKES, QUIP_KINDS, QUIP_MAX, RECAP_LOSS, RECAP_WIN, RESULT_LOSS, RESULT_WIN, STAND_FOE_LINES,
  type KingKind, type QuipKind,
} from '../src/quipData';
import { ACHIEVEMENTS } from '../src/sim/achievements';
import { SCENES, SCENE_ORDER } from '../src/sim/sceneScripts';
import { addUnit, startBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { KITS, tryCast, ULT_LEVEL } from '../src/sim/abilities';
import { gradeBoost } from '../src/sim/run';
import {
  closeCalls, GAP_MS, KING_HURT_GAP_MS, KIND_MAX, KING_MAX, LOW_HP, pickPair, QuipBox, SCENE_MAX, ultimatesCast,
} from '../src/render/quipRules';
import { DEFAULTS, parseSettings } from '../src/settings';

const KINDS: readonly QuipKind[] = ['hired', 'placed', 'won', 'lost', 'levelUp', 'ultimate', 'revived', 'lowHp'];
const KING_KINDS: readonly KingKind[] = ['waveStart', 'bossWave', 'hurt', 'lowHp', 'waveCleared', 'fallen'];

test('every hero has three short lines for each of the eight moments', () => {
  assert.deepEqual([...QUIP_KINDS], [...KINDS]);
  for (const k of ALL_HEROES) {
    assert.ok(HERO_QUIPS[k], `no quips for ${k}`);
    assert.deepEqual(Object.keys(HERO_QUIPS[k]).sort(), [...KINDS].sort(), `${k} has exactly the eight moments`);
    for (const kind of KINDS) {
      const lines = HERO_QUIPS[k][kind];
      assert.equal(lines.length, 3, `${k} ${kind} has three lines`);
      assert.equal(new Set(lines).size, 3, `${k} ${kind} repeats itself`);
      for (const t of lines) assert.ok(t.length >= 8 && t.length <= QUIP_MAX, `${k} ${kind}: ${t}`);
    }
  }
  assert.deepEqual(Object.keys(HERO_QUIPS).filter((k) => !ALL_HEROES.includes(k)), []);
});

test('banter is for real traits, five pairs each, and short', () => {
  for (const [t, lines] of Object.entries(BANTER)) {
    assert.ok(TRAITS[t], `${t} is not a trait`);
    assert.equal(lines.length, 5, `${t} has five pairs`);
    for (const [a, b] of lines) assert.ok(a.length <= 70 && b.length <= 70 && a && b, `${t}: ${a} / ${b}`);
  }
});

test('the funny text is there and short enough for a bubble or a line', () => {
  const limits: [readonly string[], number, number][] = [
    [FOE_GRUMBLES, 40, 90], [LOADING_TIPS, 30, 130], [RECAP_WIN, 12, 90], [RECAP_LOSS, 12, 90], [RESULT_WIN, 12, 90], [RESULT_LOSS, 12, 90],
  ];
  for (const [list, n, max] of limits) {
    assert.equal(list.length, n);
    assert.equal(new Set(list).size, n, 'no line twice');
    for (const t of list) assert.ok(t.length > 5 && t.length <= max, t);
  }
  for (const t of Object.values(AWARD_JOKES)) assert.ok(t.length <= 90, t);
  for (const id of Object.keys(AWARD_JOKES)) assert.ok(ACHIEVEMENTS.some((a) => a.id === id), `${id} is no achievement`);
  for (const a of ACHIEVEMENTS) assert.ok(AWARD_JOKES[a.id], `${a.id} has no aside`);
});

test('the king and the foes of the Last Stand have six and eight lines a moment, short enough for a bubble', () => {
  for (const k of KING_KINDS) {
    assert.equal(KING_LINES[k].length, 6, k);
    for (const t of KING_LINES[k]) assert.ok(t.length >= 8 && t.length <= 70, `${k}: ${t}`);
  }
  assert.deepEqual(Object.keys(KING_LINES).sort(), [...KING_KINDS].sort());
  for (const k of ['waveStart', 'bossWave'] as const) {
    assert.equal(STAND_FOE_LINES[k].length, 8, k);
    for (const t of STAND_FOE_LINES[k]) assert.ok(t.length >= 8 && t.length <= 90, `${k}: ${t}`);
  }
});

test('Duchess says only Mehh and Nom (and, in brackets, what she means)', () => {
  const word = /^(?:m+e+h+(?:-heh)*|meh-meh|n+o+m+)[.!?,]*$/i;
  const check = (t: string, where: string) => {
    const spoken = t.replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean);
    assert.ok(spoken.length > 0, where);
    for (const w of spoken) assert.match(w.replace(/\.{2,}$/, '.'), word, `${where}: ${t}`);
  };
  for (const kind of ['tap', 'nibble', 'bigHit', 'boss', 'wipe'] as const) {
    assert.ok(DUCHESS_LINES[kind].length >= 6, kind);
    for (const t of DUCHESS_LINES[kind]) {
      assert.ok(t.length <= 40, t);
      check(t, kind);
    }
  }
  assert.equal(DUCHESS_LINES.ate.length, 25);
  for (const id of SCENE_ORDER) for (const sh of SCENES[id].shots) for (const l of sh.lines ?? []) if (l.who === 'duchess') assert.equal(l.text, 'Mehh.', id);
});

test('the machines and Gorvak shout in capitals, and the shambler hrrngh', () => {
  for (const hero of ['rifleBot', 'siegeBot']) for (const kind of KINDS) for (const t of HERO_QUIPS[hero][kind]) assert.equal(t, t.toUpperCase(), `${hero} ${kind}: ${t}`);
  for (const [a, b] of BANTER.machine) {
    assert.equal(a, a.toUpperCase(), a);
    assert.equal(b, b.toUpperCase(), b);
  }
  for (const kind of KINDS) for (const t of HERO_QUIPS.shambler[kind]) assert.match(t, /hrrngh/i, t);
  let gorvak = 0;
  for (const id of SCENE_ORDER) {
    const cast = SCENES[id].cast;
    for (const sh of SCENES[id].shots) for (const l of sh.lines ?? []) {
      if (l.who === 'gorvak' || cast[l.who]?.role === 'unit:calBoss1') {
        gorvak++;
        assert.equal(l.text, l.text.toUpperCase(), `${id}: ${l.text}`);
      }
    }
  }
  assert.ok(gorvak > 8);
});

test('no new line has curly quotes, dashes, markdown, or the awakening called an ascension', () => {
  const all = [HERO_QUIPS, BANTER, DUCHESS_LINES, FOE_GRUMBLES, LOADING_TIPS, RECAP_WIN, RECAP_LOSS, RESULT_WIN, RESULT_LOSS, AWARD_JOKES, KING_LINES, STAND_FOE_LINES];
  const text = JSON.stringify(all);
  assert.doesNotMatch(text, /[\u2018\u2019\u201c\u201d\u2013\u2014]|\*/);
  for (const id of SCENE_ORDER) {
    if (!id.startsWith('awaken:')) continue;
    const sc = SCENES[id];
    const words = [sc.title, sc.blurb, ...sc.shots.flatMap((sh) => [sh.caption ?? '', ...(sh.lines ?? []).map((l) => l.text)])].join(' ');
    assert.doesNotMatch(words, /ascen/i, id);
    assert.match(sc.title, /Awakening$/, id);
  }
});

test('no new text names a model', () => {
  const all = JSON.stringify([HERO_QUIPS, BANTER, DUCHESS_LINES, FOE_GRUMBLES, LOADING_TIPS, RECAP_WIN, RECAP_LOSS, RESULT_WIN, RESULT_LOSS, AWARD_JOKES, KING_LINES, STAND_FOE_LINES]);
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
      assert.ok(HERO_QUIPS[q.hero].won.includes(q.text));
    }
  }
  assert.ok(banter > 0 && single > 0);
});

test('the line a moment says is one of its three, and the pick follows the seed', () => {
  const said = new Set<string>();
  for (let seed = 1; seed < 200; seed++) {
    const q = new QuipBox(seed).say('knight', 'won', 0);
    if (!q) continue;
    assert.ok(HERO_QUIPS.knight.won.includes(q.text));
    said.add(q.text);
  }
  assert.equal(said.size, 3, 'over many seeds all three are heard');
  const run = (seed: number) => {
    const b = new QuipBox(seed);
    return [
      b.say('wizard', 'levelUp', 0)?.text, b.say('archer', 'ultimate', GAP_MS)?.text, b.revive(['knight', 'wizard'], GAP_MS)?.hero, b.king('waveStart', 3 * GAP_MS), b.king('hurt', 5 * GAP_MS),
      b.standFoe(true, 9 * GAP_MS), b.say('wanderer', 'lowHp', 12 * GAP_MS)?.text,
    ];
  };
  for (let seed = 1; seed < 20; seed++) assert.deepEqual(run(seed), run(seed));
  assert.ok([...Array(30).keys()].some((i) => JSON.stringify(run(i + 1)) !== JSON.stringify(run(i + 2))));
});

/** Every roll that can pass, passed: the least a box has to go through before one new kind speaks, counted over many seeds and many tries. */
const tries = <T>(make: (seed: number) => QuipBox, go: (b: QuipBox, i: number) => T | null, n: number): T[][] => {
  const out: T[][] = [];
  for (let seed = 1; seed < 80; seed++) {
    const b = make(seed);
    const got: T[] = [];
    for (let i = 0; i < n; i++) {
      const r = go(b, i);
      if (r) got.push(r);
    }
    out.push(got);
  }
  return out;
};

test('an ultimate, a level gained and a close call are rare and capped a scene; a heart\'s revival speaks once', () => {
  const widely = (i: number) => i * GAP_MS;
  for (const [kind, cap] of [['ultimate', KIND_MAX.ultimate!], ['levelUp', KIND_MAX.levelUp!]] as const) {
    const heard = tries((s) => new QuipBox(s), (b, i) => b.say('wizard', kind, widely(i)), 60);
    assert.ok(heard.every((g) => g.length <= cap), `${kind}: at most ${cap} a scene`);
    assert.ok(heard.some((g) => g.length === cap), `${kind} does get said`);
    const once = tries((s) => new QuipBox(s), (b) => b.say('wizard', kind, 0), 1);
    assert.ok(once.some((g) => g.length === 0) && once.some((g) => g.length === 1), `${kind} is not said every time`);
  }
  // (a close call: once for each hero a scene, however often they dip)
  const lows = tries((s) => new QuipBox(s), (b, i) => b.say(i % 2 ? 'knight' : 'archer', 'lowHp', widely(i)), 40);
  assert.ok(lows.every((g) => g.length <= 2));
  const again = new QuipBox(3);
  let onceEach = 0;
  for (let i = 0; i < 40; i++) if (again.say('knight', 'lowHp', widely(i))) onceEach++;
  assert.ok(onceEach <= 1);
  again.newScene();
  let after = 0;
  for (let seed = 1; seed < 60 && !after; seed++) {
    const b = new QuipBox(seed);
    for (let i = 0; i < 6; i++) b.say('knight', 'lowHp', widely(i));
    b.newScene();
    for (let i = 0; i < 6; i++) if (b.say('knight', 'lowHp', 1e7 + widely(i))) after++;
  }
  assert.ok(after > 0, 'a new scene lets the same hero have another close call');
  // (the revival: inside the gap, once a scene)
  const talk = talker();
  assert.ok(talk.say('knight', 'hired', 0));
  const revived = talk.revive(['knight', 'wizard'], 100);
  assert.ok(revived, 'a revival is not held back by a bubble that has just gone up');
  assert.ok(HERO_QUIPS[revived!.hero].revived.includes(revived!.text));
  assert.equal(talk.revive(['knight', 'wizard'], 200), null, 'one revival line a scene');
  assert.equal(new QuipBox(1).revive([], 0), null);
});

test('the new moments obey the scene cap and the gap, and the settings switch', () => {
  const b = talker();
  let said = 0;
  for (let i = 0; i < 300; i++) {
    const kind = (['levelUp', 'ultimate', 'lowHp', 'hired'] as const)[i % 4];
    if (b.say(ALL_HEROES[i % 40], kind, i * GAP_MS)) said++;
  }
  assert.ok(said <= SCENE_MAX);
  const quick = talker();
  assert.ok(quick.say('knight', 'hired', 0));
  for (let t = 1; t < GAP_MS; t += 250) for (const kind of ['levelUp', 'ultimate', 'lowHp'] as const) assert.equal(quick.say('samurai', kind, t), null, `${kind} waits for the gap`);
  const off = talker(() => false);
  for (let i = 0; i < 50; i++) for (const kind of KINDS) assert.equal(off.say('knight', kind, i * GAP_MS), null);
  assert.equal(off.revive(['knight'], 0), null);
  for (const kind of KING_KINDS) assert.equal(off.king(kind, 0), null);
  assert.equal(off.standFoe(true, 0), null);
});

test('the king speaks at a wave\'s start and a boss, thinly when hurt, once when low, and at his fall', () => {
  const wave = (kind: KingKind, seeds = 80) => {
    let n = 0;
    for (let s = 1; s < seeds; s++) if (new QuipBox(s).king(kind, 0)) n++;
    return n;
  };
  assert.equal(wave('bossWave'), 79, 'a boss wave always gets a line');
  assert.equal(wave('fallen'), 79, 'the fall always gets one');
  assert.ok(wave('waveStart') > 20 && wave('waveStart') < 79, 'a wave start sometimes does');
  assert.ok(wave('waveCleared') < wave('waveStart'));
  for (const kind of KING_KINDS) for (let s = 1; s < 30; s++) {
    const t = new QuipBox(s).king(kind, 0);
    if (t) assert.ok(KING_LINES[kind].includes(t));
  }
  // (a hurt king: at most two a wave, and not within the throttle of the last)
  const hurts = tries((s) => new QuipBox(s), (b, i) => b.king('hurt', i * (KING_HURT_GAP_MS + 100)), 50);
  assert.ok(hurts.every((g) => g.length <= KING_MAX.hurt!));
  const close = tries((s) => new QuipBox(s), (b, i) => b.king('hurt', i * 1000), 50);
  assert.ok(close.every((g) => g.length <= 2));
  const lows = tries((s) => new QuipBox(s), (b, i) => b.king('lowHp', i * GAP_MS), 30);
  assert.ok(lows.every((g) => g.length <= 1) && lows.some((g) => g.length === 1));
  // (the start of a wave speaks inside the gap, but a hit does not)
  let inside = 0;
  for (let s = 1; s < 80; s++) {
    const b = new QuipBox(s);
    if (!b.say('knight', 'hired', 0)) continue;
    if (b.king('hurt', 100)) assert.fail('a hit waits for the gap');
    if (b.king('waveStart', 200)) inside++;
  }
  assert.ok(inside > 0);
  // (a new wave starts the count again)
  const b = new QuipBox(5);
  for (let i = 0; i < 20; i++) b.king('hurt', i * 20000);
  b.newScene();
  let more = 0;
  for (let s = 1; s < 60; s++) {
    const c = new QuipBox(s);
    for (let i = 0; i < 20; i++) c.king('hurt', i * 20000);
    c.newScene();
    for (let i = 0; i < 20; i++) if (c.king('hurt', 1e8 + i * 20000)) more++;
  }
  assert.ok(more > 0);
});

test('a foe grumbles once a Last Stand wave, more often at a boss', () => {
  let normal = 0;
  let boss = 0;
  for (let s = 1; s < 300; s++) {
    const a = new QuipBox(s);
    const n = a.standFoe(false, 0);
    if (n) {
      normal++;
      assert.ok(STAND_FOE_LINES.waveStart.includes(n));
    }
    assert.equal(a.standFoe(false, 1e6), null, 'once a wave');
    const b = new QuipBox(s);
    const t = b.standFoe(true, 0);
    if (t) {
      boss++;
      assert.ok(STAND_FOE_LINES.bossWave.includes(t));
    }
  }
  assert.ok(boss > normal && normal > 0);
  const a = new QuipBox(4);
  a.standFoe(false, 0);
  a.newScene();
  let again = false;
  for (let s = 1; s < 60 && !again; s++) {
    const c = new QuipBox(s);
    c.standFoe(false, 0);
    c.newScene();
    again = !!c.standFoe(false, 1e6);
  }
  assert.ok(again);
});

function arena(): Battle {
  const b = startBattle(3);
  b.units = [];
  b.phase = 'fight';
  return b;
}
const hit = (to: number, by: number): BattleEvent => ({ kind: 'hit', by, to, dmg: 1, heavy: false, splash: false, killed: false, src: 'blow' as never });

test('a close call is a hero left alive under a quarter of their health, and a summon or the named one does not count', () => {
  const b = arena();
  const knight = addUnit(b, 'knight', 2, 8);
  const archer = addUnit(b, 'archer', 3, 8);
  const foe = addUnit(b, 'skeleton', 4, 4);
  knight.hp = Math.floor(knight.maxHp * LOW_HP) - 1;
  archer.hp = Math.ceil(archer.maxHp * LOW_HP) + 1;
  assert.deepEqual(closeCalls(b, [hit(knight.id, foe.id), hit(archer.id, foe.id), hit(foe.id, knight.id)]).map((u) => u.def), ['knight']);
  assert.equal(closeCalls(b, [hit(knight.id, foe.id), hit(knight.id, foe.id)]).length, 1, 'each once');
  assert.equal(closeCalls(b, [hit(knight.id, foe.id)], knight.id).length, 0, 'not the one left out (the king)');
  knight.alive = false;
  assert.equal(closeCalls(b, [hit(knight.id, foe.id)]).length, 0, 'a fallen hero is past it');
  knight.alive = true;
  knight.owner = archer.id;
  assert.equal(closeCalls(b, [hit(knight.id, foe.id)]).length, 0, 'a summon is not a hero');
});

test('an ultimate is told from the skill, and only a hero\'s own counts', () => {
  const b = arena();
  const up = addUnit(b, 'knight', 5, 8, gradeBoost(1, 0, ULT_LEVEL));
  const out: BattleEvent[] = [];
  up.charge2 = 1e9;
  up.charge = 0;
  addUnit(b, 'skeleton', 5, 5);
  assert.ok(tryCast(b, up, out));
  assert.deepEqual(ultimatesCast(b, out), ['knight']);
  assert.deepEqual(ultimatesCast(b, [{ kind: 'skill', by: up.id, name: KITS.knight.skill.name, ms: 500 }]), [], 'the ordinary skill is no ultimate');
  const foe = b.units.find((u) => u.side === 'foe')!;
  assert.deepEqual(ultimatesCast(b, [{ kind: 'skill', by: foe.id, name: KITS.knight.ultimate!.name, ms: 500 }]), [], 'a foe is not a hero');
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
