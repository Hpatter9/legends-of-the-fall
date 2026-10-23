import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEET, fillLine, holdOf, lineLen, lineSeconds, sceneSeconds, SCENES, SCENE_ORDER, STAGE_H, STAGE_W, summonScene, type Scene } from '../src/sim/sceneScripts';
import { castOf, dueScene, kindOf, markSeen, namesOf, readScenes, seenScene } from '../src/sim/sceneRules';
import { actorsAt, beats, BASE_SCALE, cameraAt, keepInside, lineNow, lineStart, lookAt, next, scaleOf, shotLength, start, tick, typedChars, TYPE_RATE } from '../src/render/sceneClock';
import { loadMeta, newMeta, pickStarter, saveMeta } from '../src/sim/meta';
import { UNITS } from '../src/sim/units';
import { AREAS } from '../src/sim/board';

const store = () => {
  const data: Record<string, string> = {};
  return { setItem: (k: string, v: string) => void (data[k] = v), getItem: (k: string) => data[k] ?? null, data };
};

const shotSeconds = (s: Scene['shots'][number]): number => (s.lines?.reduce((n, l) => n + lineLen(l), 0) ?? 0) + holdOf(s);

/** A tiny scene for the clock: one actor walks in, then a line, then a hold. */
const mini: Scene = {
  id: 'mini',
  title: 'Mini',
  blurb: '',
  moment: { kind: 'starter' },
  cast: { a: { role: 'hero', x: 200, facing: 'right', hidden: true }, b: { role: 'unit:orcGrunt', x: 400, facing: 'left' } },
  shots: [
    { cam: { x: 100 }, to: { x: 300, zoom: 2 }, acts: [{ who: 'a', enter: 200, from: 'left' }], lines: [{ who: 'a', text: 'Hello there.' }, { who: 'b', text: 'Hm.' }], hold: 1 },
    { look: 'volcano', cam: { on: ['a', 'b'] }, acts: [{ who: 'a', pose: 'strike' }, { who: 'b', exit: 'right', line: 1 }], lines: [{ who: 'a', text: 'Bye.' }, { who: 'a', text: 'Bye again.' }] },
  ],
};

test('every scene is 10 to 40 seconds as played untouched (a cut-in 2 to 6), with brief lines', () => {
  for (const id of SCENE_ORDER) {
    const secs = sceneSeconds(SCENES[id]);
    const cutIn = !!SCENES[id].again;
    const reveal = !!SCENES[id].short && !cutIn;
    const oath = SCENES[id].family === 'oath';
    // (a slowed shot takes longer than its beats: the cut-in's real length counts it)
    const real = SCENES[id].shots.reduce((n, s) => n + (shotSeconds(s) / (s.slow ?? 1)), 0);
    if (cutIn) assert.ok(real >= 2 && real <= 6, `${id}: ${real.toFixed(1)} s`);
    else if (reveal) assert.ok(secs >= 5 && secs <= 14, `${id}: ${secs.toFixed(1)} s`);
    else if (oath) assert.ok(secs >= 8 && secs <= 12, `${id}: ${secs.toFixed(1)} s`);
    else assert.ok(secs >= 10 && secs <= 40, `${id}: ${secs.toFixed(1)} s`);
    for (const s of SCENES[id].shots) for (const l of s.lines ?? []) assert.ok(l.text.length <= 100, `${id}: ${l.text}`);
  }
});

test('the scenes are well formed: known actors, lines, areas, cues, effects within the rules', () => {
  assert.deepEqual([...SCENE_ORDER].sort(), Object.keys(SCENES).sort());
  for (const id of SCENE_ORDER) {
    const sc = SCENES[id];
    assert.equal(sc.id, id);
    const actors = new Set(Object.keys(sc.cast));
    for (const m of Object.values(sc.cast)) {
      assert.ok(m.x >= -50 && m.x <= STAGE_W + 50);
      if (m.role.startsWith('unit:')) assert.ok(UNITS[m.role.slice(5)], m.role);
    }
    for (const s of sc.shots) {
      if (s.look) assert.ok((AREAS as readonly string[]).includes(s.look), s.look);
      for (const a of s.acts ?? []) assert.ok(actors.has(a.who), a.who);
      for (const l of s.lines ?? []) assert.ok(l.who === 'narrator' || actors.has(l.who), l.who);
      for (const w of [s.cam.on, s.to?.on].flat()) if (w) assert.ok(actors.has(w), w);
      // (every `{name}` in a line is an actor)
      for (const l of s.lines ?? []) for (const m of l.text.matchAll(/\{(\w+)\}/g)) assert.ok(actors.has(m[1]), m[1]);
      // (no looping blink: the only flashing effect is the one-shot `flash`, and a shot has at most one)
      assert.ok((s.fx ?? []).filter((f) => f === 'flash').length <= 1);
    }
    assert.ok(sc.shots[0].look, 'the first shot sets the backdrop');
  }
});

test('line time grows with its length, within bounds; a line types out at a steady rate, or whole when still', () => {
  assert.ok(lineSeconds('Hi.') < lineSeconds('A much longer line than the first one is.'));
  assert.equal(lineSeconds('x'.repeat(500)), 9);
  assert.equal(typedChars('abcdef', 0), 0);
  assert.equal(typedChars('abcdef', 2 / TYPE_RATE), 2);
  assert.equal(typedChars('abcdef', 99), 6);
  assert.equal(typedChars('abcdef', 0, true), 6);
  assert.equal(fillLine('{a} meets {b} and {z}', { a: 'Knight', b: 'Orc' }), 'Knight meets Orc and {z}');
});

test('beats: a line each, then the hold; a shot with nothing in it holds 2.5 s', () => {
  assert.equal(beats(mini.shots[0]).length, 3);
  assert.equal(beats(mini.shots[0])[2], 1);
  assert.deepEqual(beats({ cam: {} }), [2.5]);
  assert.equal(lineStart(mini.shots[0], 1), beats(mini.shots[0])[0]);
  assert.equal(shotLength(mini.shots[0]), beats(mini.shots[0]).reduce((n, v) => n + v, 0));
});

test('the clock runs through every beat and shot to the end, and a tap moves straight on', () => {
  let c = start();
  const seen: string[] = [];
  for (let i = 0; i < 4000; i++) {
    const l = lineNow(c, mini);
    if (l && seen[seen.length - 1] !== l.text) seen.push(l.text);
    const n = tick(c, mini, 0.05);
    if (!n) break;
    c = n;
  }
  assert.deepEqual(seen, ['Hello there.', 'Hm.', 'Bye.', 'Bye again.']);
  assert.equal(tick({ shot: 1, beat: 1, t: 0, shotT: 0 }, mini, 99), null);
  // (a tap from the first line is the second; from the hold the next shot; from the last beat the end)
  assert.deepEqual(next(start(), mini), { shot: 0, beat: 1, t: 0, shotT: beats(mini.shots[0])[0] });
  assert.deepEqual(next({ shot: 0, beat: 2, t: 0, shotT: 0 }, mini), { shot: 1, beat: 0, t: 0, shotT: 0 });
  assert.equal(next({ shot: 1, beat: 1, t: 0, shotT: 0 }, mini), null);
  assert.equal(lineNow({ shot: 0, beat: 2, t: 0, shotT: 0 }, mini), null, 'no line in a hold');
});

test('actors: one who is hidden comes on walking, stops where cast, and one leaves when its line comes', () => {
  const at = (shot: number, shotT: number, beat = 0) => actorsAt(mini, { shot, beat, t: 0, shotT });
  assert.equal(at(0, 0).a.visible, true, 'the act begins at once');
  assert.equal(at(0, 0).a.x, -50);
  const mid = at(0, 1).a;
  assert.ok(mid.x > -50 && mid.x < 200 && mid.walking && mid.facing === 'right');
  const there = at(0, 6).a;
  assert.equal(there.x, 200);
  assert.equal(there.walking, false);
  assert.equal(at(1, 0).a.pose, 'strike');
  assert.equal(at(0, 6).a.pose, 'idle');
  // (b waits for the second line of the second shot, then walks off the right and is gone)
  assert.equal(at(1, 0).b.x, 400);
  assert.equal(at(1, 0).b.visible, true);
  const after = at(1, lineStart(mini.shots[1], 1) + 30, 1);
  assert.equal(after.b.visible, false);
});

test('an actor can come on from an x just out of the picture, as well as from a side', () => {
  const near: Scene = { ...mini, shots: [{ cam: {}, acts: [{ who: 'a', enter: 200, from: 120 }], lines: [{ who: 'a', text: 'Here I am, finally arrived.' }] }] };
  const at = (t: number) => actorsAt(near, { shot: 0, beat: 0, t, shotT: t }).a;
  assert.equal(at(0).x, 120);
  assert.ok(at(0.5).x > 120 && at(0.5).x < 200 && at(0.5).walking);
  assert.equal(at(3).x, 200);
});

test('the camera drifts from its start to its `to` over the shot, eased, following actors; the zoom is drawn at whole scales', () => {
  const cam = (shotT: number) => cameraAt(mini, { shot: 0, beat: 0, t: 0, shotT });
  assert.equal(cam(0).x, 100);
  assert.equal(cam(0).zoom, 1);
  const len = shotLength(mini.shots[0]);
  assert.ok(Math.abs(cam(len).x - 300) < 1e-9 && cam(len).zoom === 2);
  assert.ok(cam(len / 2).x > 100 && cam(len / 2).x < 300);
  // (on two actors: the middle between them)
  const two = cameraAt(mini, { shot: 1, beat: 0, t: 0, shotT: 0 });
  assert.equal(two.x, 300, 'between the two (a at 200, b at 400)');
  for (let z = 1; z <= 2.01; z += 0.013) assert.ok(Number.isInteger(scaleOf(z)) && scaleOf(z) >= BASE_SCALE);
  assert.equal(scaleOf(1), 2);
  assert.equal(scaleOf(1.5), 3);
  assert.equal(scaleOf(2), 4);
  assert.equal(scaleOf(1, 3), 3, 'never below what makes the stage cover the picture');
});

test('the camera is kept inside the stage', () => {
  const k = 2;
  const c = keepInside({ x: -300, y: 9999 }, k, 393, 412);
  assert.equal(c.x, 393 / 2 / k);
  assert.equal(c.y, STAGE_H - 412 / 2 / k);
  assert.deepEqual(keepInside({ x: 288, y: 190 }, 2, 393, 412), { x: 288, y: 190 });
  assert.ok(FEET < STAGE_H);
});

test('the backdrop of a shot is its own, else the last one set', () => {
  assert.equal(lookAt(mini, 0), 'highlands');
  assert.equal(lookAt(mini, 1), 'volcano');
  assert.equal(lookAt(SCENES.opening, 2), 'highlands');
});

test('who plays: the party fills the party roles, the hero is the run\'s lead, foes are by id, the goat has no art yet', () => {
  const players = { party: ['knight', 'samurai', 'archer'], lead: 'wizard' };
  assert.equal(kindOf('party:0', players), 'knight');
  assert.equal(kindOf('party:2', players), 'archer');
  assert.equal(kindOf('party:3', players), null);
  assert.equal(kindOf('hero', players), 'wizard');
  assert.equal(kindOf('hero', { party: ['samurai'] }), 'samurai');
  assert.equal(kindOf('unit:calBoss1', players), 'calBoss1');
  assert.equal(kindOf('unit:noSuchFoe', players), null);
  assert.equal(kindOf('duchess', players), null);
  const cast = castOf(SCENES.opening, players);
  assert.equal(cast.front.name, 'Knight');
  assert.equal(cast.herald.name, UNITS.calBoss1.name);
  assert.equal(namesOf(cast).back, 'Archer');
  // (a scene that casts her plays on: she has no kind to draw, and her own name)
  const withGoat: Scene = { ...mini, cast: { ...mini.cast, goat: { role: 'duchess', x: 100, facing: 'right' } } };
  assert.deepEqual(castOf(withGoat, players).goat, { kind: null, name: 'Duchess' });
});

test('every scene that casts Duchess gives her a line, as an actor with no fighter to draw; the pilots cast her', () => {
  for (const id of SCENE_ORDER) {
    const sc = SCENES[id];
    const goat = Object.entries(sc.cast).find(([, m]) => m.role === 'duchess');
    if (!goat) {
      assert.ok(!['opening', 'gorvak'].includes(id), id);
      continue;
    }
    assert.ok(sc.shots.some((s) => s.lines?.some((l) => l.who === goat[0] && l.text === 'Mehh.')), id);
    assert.equal(castOf(sc, { party: ['knight', 'samurai', 'archer'] })[goat[0]].kind, null);
  }
});

test('the opening is due for a new save that has picked, once; the first Calamity boss on map 1 only', () => {
  const m = newMeta(12);
  pickStarter(m, 0);
  assert.equal(dueScene(m, { kind: 'starter' }), 'opening');
  assert.equal(dueScene(m, { kind: 'calBoss', map: 1 }), 'gorvak');
  assert.equal(dueScene(m, { kind: 'calBoss', map: 2 }), 'thornWarden', 'each map has its own herald');
  assert.equal(dueScene(m, { kind: 'calBoss', map: 7 }), null, 'there are six');
  markSeen(m, 'opening');
  assert.equal(seenScene(m, 'opening'), true);
  assert.equal(dueScene(m, { kind: 'starter' }), null, 'once');
  assert.equal(dueScene(m, { kind: 'calBoss', map: 1 }), 'gorvak', 'the other is still waiting');
  markSeen(m, 'gorvak');
  markSeen(m, 'gorvak');
  markSeen(m, 'noSuchScene');
  assert.deepEqual(m.scenes, ['opening', 'gorvak']);
  assert.equal(dueScene(m, { kind: 'calBoss', map: 1 }), null);
});

test('seen scenes are saved and read back; an old save that had picked its heroes has seen the opening; a new one has not', () => {
  const s = store();
  const m = newMeta(3);
  saveMeta(m, s as unknown as Storage);
  assert.equal(loadMeta(1, s).scenes, undefined, 'a new save waiting for its pick has seen nothing');
  pickStarter(m, 1);
  markSeen(m, 'gorvak');
  saveMeta(m, s as unknown as Storage);
  assert.deepEqual(loadMeta(1, s).scenes, ['gorvak']);
  // (a save written before the cinematics: no `scenes`, heroes picked)
  const old = JSON.parse(s.data[Object.keys(s.data)[0]]);
  delete old.scenes;
  const t = store();
  t.setItem(Object.keys(s.data)[0], JSON.stringify(old));
  assert.deepEqual(loadMeta(1, t).scenes, ['opening']);
  // (and one from before the starter pick at all)
  delete old.starter;
  t.setItem(Object.keys(s.data)[0], JSON.stringify(old));
  assert.deepEqual(loadMeta(1, t).scenes, ['opening']);
  // (junk is dropped)
  assert.deepEqual(readScenes(['gorvak', 'gorvak', 7, 'nope'], true), ['gorvak']);
  assert.deepEqual(readScenes('x', false), []);
});

/* ------------------------------------------------------------ the rest of the scenes */

import { ARMIES, bossOf } from '../src/sim/armies';
import { ALL_HEROES } from '../src/sim/units';
import { CONTENT_HEROES } from '../src/sim/contentHeroes';
import { PHASE2 } from '../src/sim/bossPhases';
import { BUILDING_IDS } from '../src/sim/castle';
import { momentKey, type Moment } from '../src/sim/sceneScripts';
import { momentText, sceneList } from '../src/sim/sceneRules';
import { FAMILY_NAMES } from '../src/sim/sceneFamilies';

const picked = () => {
  const m = newMeta(21);
  pickStarter(m, 0);
  return m;
};

test('each Calamity map has its herald, and the Calamity’s end has its own scene', () => {
  const m = picked();
  const ids = [1, 2, 3, 4, 5, 6].map((map) => dueScene(m, { kind: 'calBoss', map }));
  assert.equal(new Set(ids).size, 6);
  assert.ok(ids.every((id) => id));
  assert.equal(dueScene(m, { kind: 'calVictory' }), 'calamityEnds');
  // (each herald is its own boss, drawn from its fighter)
  ids.forEach((id, i) => assert.ok(Object.values(SCENES[id!].cast).some((c) => c.role === `unit:calBoss${i + 1}`)));
});

test('every army has a first-clear scene with its own boss, and it is due once', () => {
  const m = picked();
  for (const a of ARMIES) {
    const id = dueScene(m, { kind: 'armyClear', army: a.id });
    assert.equal(id, `clear:${a.id}`);
    assert.equal(SCENES[id!].cast.boss.role, `unit:${bossOf(a)}`, a.id);
    assert.equal(SCENES[id!].shots[0].look, a.area, a.id);
  }
  markSeen(m, 'clear:orcs');
  assert.equal(dueScene(m, { kind: 'armyClear', army: 'orcs' }), null);
  assert.equal(dueScene(m, { kind: 'armyClear', army: 'undead' }), 'clear:undead', 'another army is unaffected');
});

test('every hero has an awakening scene (their own sheet, their new look), and the ten content heroes an arrival', () => {
  const m = picked();
  for (const k of ALL_HEROES) {
    const id = dueScene(m, { kind: 'awaken', hero: k });
    assert.equal(id, `awaken:${k}`);
    const sc = SCENES[id!];
    assert.equal(sc.cast.hero.role, `unit:${k}`);
    // (the new look is switched on in the scene, once the light comes)
    assert.ok(sc.shots.some((s) => s.acts?.some((a) => 'look' in a && a.look === 1)), k);
  }
  assert.equal(ALL_HEROES.filter((k) => dueScene(m, { kind: 'awaken', hero: k })).length, 45);
  for (const c of CONTENT_HEROES) assert.equal(dueScene(m, { kind: 'earned', hero: c.kind }), `earned:${c.kind}`);
  assert.equal(dueScene(m, { kind: 'earned', hero: 'knight' }), null, 'a hero not earned by play has no arrival');
});

test('a boss changing form: a short cut-in with a slow beat, whose words are the boss’s own, and it plays every time', () => {
  const m = picked();
  for (const [boss, kit] of Object.entries(PHASE2)) {
    const id = dueScene(m, { kind: 'bossForm', boss });
    assert.equal(id, `form:${boss}`);
    const sc = SCENES[id!];
    assert.ok(sc.short && sc.again);
    assert.ok(sc.shots.some((s) => s.slow && s.slow < 1), 'a slow-motion beat');
    assert.equal(sc.shots.flatMap((s) => s.lines ?? []).map((l) => l.text).join(), kit.line, `${boss} says what its phase banner says`);
    markSeen(m, id!);
    assert.equal(dueScene(m, { kind: 'bossForm', boss }), id, 'seen, and due again');
  }
  assert.equal(dueScene(m, { kind: 'bossForm', boss: 'orcGrunt' }), null);
});

test('the castle, the tower and the firsts each have their scene', () => {
  const m = picked();
  for (const site of [...BUILDING_IDS, 'chapel']) assert.equal(dueScene(m, { kind: 'castle', site }), `castle:${site}`);
  for (const floor of [10, 25, 50]) assert.equal(dueScene(m, { kind: 'spire', floor }), `spire:${floor}`);
  assert.equal(dueScene(m, { kind: 'spire', floor: 11 }), null);
  const firsts: Moment['kind'][] = ['firstLoss', 'duchess', 'mythic', 'elite', 'ascension', 'dailyBoss'];
  for (const kind of firsts) {
    const id = dueScene(m, { kind } as Moment);
    assert.ok(id, kind);
    markSeen(m, id!);
    assert.equal(dueScene(m, { kind } as Moment), null, `${kind} plays once`);
  }
});

test('no two scenes share a moment, every moment has words for the list, and the cut-ins and families are marked', () => {
  const seen = new Map<string, string>();
  for (const id of SCENE_ORDER) {
    const key = momentKey(SCENES[id].moment);
    assert.ok(!seen.has(key), `${id} and ${seen.get(key)} both come at ${key}`);
    seen.set(key, id);
    assert.ok(momentText(SCENES[id].moment).length > 5);
    const f = SCENES[id].family;
    if (f) assert.ok(FAMILY_NAMES[f], f);
    if (SCENES[id].again) assert.ok(SCENES[id].short, `${id}: only a cut-in repeats`);
  }
});

test('the Scenes list shows a seen scene, hides an unseen one, and folds a family’s unseen scenes into one line', () => {
  const m = picked();
  const all = sceneList(m);
  assert.ok(all.every((r) => !r.seen || r.title !== '???'));
  assert.equal(all.filter((r) => r.more).length, Object.keys(FAMILY_NAMES).length, 'one folded line a family');
  assert.ok(all.length < 40, 'the list is short');
  markSeen(m, 'awaken:knight');
  markSeen(m, 'karnok');
  const after = sceneList(m);
  assert.ok(after.find((r) => r.id === 'awaken:knight')?.seen);
  assert.ok(after.find((r) => r.id === 'karnok')?.seen);
  const folded = after.find((r) => r.more && /Awakenings/.test(r.text));
  assert.equal(folded?.more, 44);
  assert.equal(after.some((r) => r.id === 'awaken:knight' && r.more), false);
});

test('the awakened look is switched on by an act, held after it, and the slow beat is a share of the pace', () => {
  const sc = SCENES['awaken:knight'];
  const before = actorsAt(sc, start()).hero;
  assert.equal(before.look, 0);
  const later = actorsAt(sc, { shot: 1, beat: 0, t: 0.1, shotT: 0.1 }).hero;
  assert.equal(later.look, 1);
  assert.equal(actorsAt(sc, { shot: 2, beat: 0, t: 0.1, shotT: 0.1 }).hero.look, 1, 'it stays');
  for (const id of SCENE_ORDER) for (const s of SCENES[id].shots) if (s.slow !== undefined) assert.ok(s.slow > 0 && s.slow <= 1);
});

test('no scene flashes more than once a shot or loops a blink; the flash-free ones keep the rules for cut-ins', () => {
  for (const id of SCENE_ORDER) for (const s of SCENES[id].shots) assert.ok((s.fx ?? []).filter((f) => f === 'flash').length <= 1, id);
});

import { SCENE_TRACKS } from '../src/render/musicScore';

test('a scene’s music is one of the audio worker’s tracks; the heralds have their own, and a cut-in has none', () => {
  for (const id of SCENE_ORDER) {
    const m = SCENES[id].music;
    if (m) assert.ok((SCENE_TRACKS as readonly string[]).includes(m), `${id}: ${m}`);
    if (SCENES[id].again) assert.equal(m, undefined, `${id}: the fight's own music goes on`);
  }
  assert.deepEqual(['gorvak', 'thornWarden', 'malphas', 'hrungar', 'vorgrath', 'karnok'].map((id) => SCENES[id].music), ['gorvak', 'herald2', 'herald3', 'herald4', 'herald5', 'herald6']);
});

import { previewFrames } from '../src/render/sceneClock';

test('the preview frames name a real moment of each shot, for the screenshot strips', () => {
  for (const id of SCENE_ORDER) {
    const sc = SCENES[id];
    const frames = previewFrames(sc);
    assert.ok(frames.length >= sc.shots.length, id);
    for (const [shot, beat, sec] of frames) {
      assert.ok(sc.shots[shot], id);
      assert.ok(beat < beats(sc.shots[shot]).length && sec >= 0 && sec <= beats(sc.shots[shot])[beat], `${id} ${shot}/${beat}/${sec}`);
    }
  }
});

import { COMBOS } from '../src/sim/combos';
import { OATH_SETS } from '../src/sim/sceneFamilies';

test('every set of five has its Last Oath: the fuller scene the first time, the short one after, with a line from each of the five', () => {
  assert.deepEqual(OATH_SETS.map((o) => [o.set, o.name]), COMBOS.map((c) => [c.id, c.name]));
  const m = picked();
  for (const c of COMBOS) {
    const full = dueScene(m, { kind: 'combo', set: c.id });
    assert.equal(full, `oath:${c.id}`);
    const speakers = SCENES[full!].shots.flatMap((s) => s.lines ?? []).map((l) => l.who);
    assert.deepEqual(speakers, ['a', 'b', 'c', 'd', 'e'], 'a line from each of the five');
    const cut = dueScene(m, { kind: 'comboCut', set: c.id });
    assert.equal(cut, `oathcut:${c.id}`);
    assert.ok(SCENES[cut!].short && SCENES[cut!].again);
    const secs = SCENES[cut!].shots.reduce((n, s) => n + shotSeconds(s), 0);
    assert.ok(secs >= 2.5 && secs <= 4, `${c.id}: ${secs}`);
    // (played with the five who cast it, in the set's order)
    const cast = castOf(SCENES[full!], { party: [...c.heroes] });
    assert.deepEqual(['a', 'b', 'c', 'd', 'e'].map((k) => cast[k].kind), [...c.heroes]);
    markSeen(m, full!);
    assert.equal(dueScene(m, { kind: 'combo', set: c.id }), null, 'the fuller one plays once');
    markSeen(m, cut!);
    assert.equal(dueScene(m, { kind: 'comboCut', set: c.id }), cut, 'the short one every time');
  }
});

test('every hero earned in play has its own short reveal, due the moment it joins and only once', () => {
  for (const c of CONTENT_HEROES) {
    const id = `earned:${c.kind}`;
    assert.ok(SCENES[id]?.short, `${c.kind} has a reveal`);
    const m = newMeta(1);
    assert.equal(dueScene(m, { kind: 'earned', hero: c.kind }), id);
    assert.equal(dueScene(m, { kind: 'earned', hero: c.kind === 'sage' ? 'tyrant' : 'sage' }) === id, false, 'only for its own hero');
    markSeen(m, id);
    assert.equal(dueScene(m, { kind: 'earned', hero: c.kind }), null);
  }
  assert.equal(dueScene(newMeta(1), { kind: 'starter' }), 'opening', 'the earlier moments are as they were');
});

test('the silhouette steps aside and the hero steps into the light in the same place (the hide act)', () => {
  const sc = SCENES['earned:werewolf'];
  const before = actorsAt(sc, { shot: 0, beat: 0, t: 2, shotT: 2 });
  assert.ok(before.figure.visible && !before.hero.visible);
  const after = actorsAt(sc, { shot: 1, beat: 0, t: 0.5, shotT: 0.5 });
  assert.ok(!after.figure.visible && after.hero.visible);
  assert.equal(after.hero.x, sc.cast.hero.x);
});

test('the summoning cinematic is about three seconds, is not listed or marked seen, and ends on the hero', () => {
  const sc = summonScene('knight', 'Knight');
  const secs = sceneSeconds(sc);
  assert.ok(secs >= 2 && secs <= 4, `${secs}`);
  assert.equal(SCENE_ORDER.includes(sc.id), false);
  assert.equal(SCENES[sc.id], undefined);
  const end = actorsAt(sc, { shot: 1, beat: 0, t: 1, shotT: 1 });
  assert.ok(end.hero.visible && !end.figure.visible);
  assert.equal(sc.shots.filter((s) => s.fx?.includes('flash')).length, 1, 'one flash, once');
  assert.equal(castOf(sc, { party: [] }).hero.kind, 'knight');
});

test('the opening plays before the starter pick with a fixed trio, and each scene can name its music', () => {
  const o = SCENES.opening;
  assert.equal(o.trio?.length, 3);
  const cast = castOf(o, { party: [...o.trio!] });
  for (const id of ['front', 'striker', 'back']) assert.ok(cast[id].kind && o.trio!.includes(cast[id].kind!), id);
  assert.ok(Object.values(o.cast).some((m) => m.role === 'duchess'), 'Duchess keeps her beat');
  assert.equal(dueScene(newMeta(1), { kind: 'starter' }), 'opening', 'due with no heroes picked');
  assert.equal(o.music, 'opening');
  assert.equal(SCENES.gorvak.music, 'gorvak');
});

test('the Cinematics setting is on by default and kept when saved', async () => {
  const { DEFAULTS, parseSettings } = await import('../src/settings');
  assert.equal(DEFAULTS.cinematics, true);
  assert.equal(parseSettings(null).cinematics, true);
  assert.equal(parseSettings('{"cinematics":false}').cinematics, false);
  assert.equal(parseSettings('{"cinematics":1}').cinematics, true);
});
