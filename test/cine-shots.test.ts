// CINE-001: the shot language (the director's cuts, the camera's framings and moves, cuts and endings, the typed words and their
// voices, skipping, reduced motion and the battery saver), and the scenes written in it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneSeconds, SCENES, SCENE_ORDER, type Scene } from '../src/sim/sceneScripts';
import { direct, linesOf, MAX_REACTS, REACT_S, WEATHER_OF } from '../src/sim/cineDirector';
import { actScene, arrivalScene, ARRIVAL_LINES } from '../src/sim/cineMoments';
import { QUEST_BATTLES } from '../src/sim/questBattleData';
import { ARMIES } from '../src/sim/armies';
import { BOSS_TITLES } from '../src/render/bossTitles';
import { dueScene, markSeen } from '../src/sim/sceneRules';
import { newMeta } from '../src/sim/meta';
import { UNITS } from '../src/sim/units';
import { next, start, tick } from '../src/render/sceneClock';
import { blipsBetween, cutVeil, emphasis, frame, outVeil, PAUSE, pressOf, HOLD_SKIP_MS, sharpScale, TILT, typedCount, typeLength, typeTimes, weightOf, ZOOM_OF } from '../src/render/cineShots';

const ANGLES = ['wide', 'medium', 'two', 'close', 'extreme', 'ots', 'low', 'high', 'dutch'];
const CUTS = ['cut', 'match', 'fade', 'smash', 'flash', 'dissolve'];

/** Every scene there is: the table, the quest stories before and after, the arrivals and the act cards. */
function everyScene(): Scene[] {
  const out = SCENE_ORDER.map((id) => SCENES[id]);
  for (const qb of QUEST_BATTLES) {
    const cast = qb.cast.map((s) => s.heroes[0]);
    out.push(qb.before(cast), qb.after(cast));
  }
  for (const boss of Object.keys(BOSS_TITLES)) out.push(arrivalScene(boss, UNITS[boss]?.name ?? boss, BOSS_TITLES[boss], 'volcano'));
  out.push(actScene('II', 'The Library', 'ruins', 'Mind the candles.', null, 2, false), actScene('IV', 'The Throne Room', 'dungeon', 'Here we hold.', 'Mehh.', 1, true));
  return out;
}

test('the director keeps every line in its order, and adds no more than a couple of seconds of reactions', () => {
  for (const sc of everyScene()) {
    const d = direct(sc);
    assert.deepEqual(linesOf(d).map((l) => l.text), linesOf(sc).map((l) => l.text), sc.id);
    const extra = sceneSeconds(d) - sceneSeconds(sc);
    assert.ok(extra >= -1e-9 && extra <= MAX_REACTS * REACT_S + 1e-9, `${sc.id}: +${extra}`);
    assert.ok(d.shots.filter((s) => s.react).length <= MAX_REACTS);
  }
});

test('every directed shot has a framing, a move, a cut and its air; the first comes up from black', () => {
  for (const sc of everyScene()) {
    const d = direct(sc);
    d.shots.forEach((s, i) => {
      assert.ok(ANGLES.includes(s.angle!), `${sc.id} ${i}: ${s.angle}`);
      assert.ok(s.move, `${sc.id} ${i}`);
      assert.ok(CUTS.includes(s.cut!), `${sc.id} ${i}: ${s.cut}`);
      assert.ok(s.weather, `${sc.id} ${i}`);
      if (s.subject) assert.ok(sc.cast[s.subject], `${sc.id} ${i}: ${s.subject}`);
      for (const a of s.acts ?? []) assert.ok(a.line === undefined || a.line < (s.lines?.length ?? 0), `${sc.id} ${i}: an act waits for a line it has`);
    });
    // (an authored first cut is kept; else the scene fades up)
    if (!sc.shots[0].cut) assert.equal(d.shots[0].cut, 'fade', sc.id);
  }
});

test('a shot of several lines is cut into one a line: the speaker in close-up, a big foe shouting seen from below or tilted', () => {
  const sc = SCENES.gorvak;
  const d = direct(sc);
  assert.ok(d.shots.length > sc.shots.length, 'more shots than written');
  for (const s of d.shots) {
    const l = s.lines?.[0];
    if (!l || l.who === 'narrator' || s.react) continue;
    if (s.angle === 'close' || s.angle === 'ots' || s.angle === 'extreme') assert.ok(s.subject, 'a close framing has a subject');
  }
  const shout = d.shots.find((s) => s.lines?.[0]?.who === 'gorvak' && s.lines[0].tone === 'shout' && s.subject === 'gorvak' && s !== d.shots[0]);
  assert.ok(shout && ['low', 'dutch'].includes(shout.angle!), 'the herald shouts from below, or tilted');
  // (a boss coming on is seen from the ground, through a hard cut, with its name on a card)
  const arrives = d.shots.find((s) => (s.acts ?? []).some((a) => 'enter' in a && a.who === 'gorvak'));
  assert.equal(arrives?.angle, 'low');
  assert.ok(arrives?.cut === 'smash' || arrives?.cut === 'flash');
  assert.ok(d.shots.some((s) => s.title?.name === '{gorvak}'), 'the herald is named on a title card');
  // (a reaction: a held look at the hero after the herald roars)
  assert.ok(d.shots.some((s) => s.react && s.subject === 'hero'));
  assert.equal(d.out, 'smash', 'a boss scene smash-cuts into the fight');
});

test('a framed shot is kept as written; a pose held over a split shot is held on each part', () => {
  const sc: Scene = {
    id: 't', title: 't', blurb: '', moment: { kind: 'elite' },
    cast: { a: { role: 'party:0', x: 200, facing: 'right' }, b: { role: 'unit:orcGrunt', x: 300, facing: 'left' } },
    shots: [
      { look: 'snow', cam: { on: ['a', 'b'] }, angle: 'dutch', move: 'shake', cut: 'flash', lines: [{ who: 'a', text: 'One.' }, { who: 'b', text: 'Two.' }] },
      { cam: { on: ['a', 'b'] }, acts: [{ who: 'a', pose: 'strike' }, { who: 'b', exit: 'right', line: 1 }], lines: [{ who: 'a', text: 'Three.' }, { who: 'b', text: 'Four.' }] },
    ],
  };
  const d = direct(sc);
  assert.equal(d.shots[0].angle, 'dutch');
  assert.equal(d.shots[0].move, 'shake');
  assert.equal(d.shots[0].cut, 'flash');
  assert.equal(d.shots[0].lines?.length, 2, 'a framed shot is not split');
  assert.equal(d.shots.length, 3);
  assert.deepEqual(d.shots[2].acts?.map((a) => ('pose' in a ? 'pose' : 'exit' in a ? 'exit' : '?')), ['pose', 'exit'], 'the pose is held on, the exit comes with its line');
  assert.equal(d.shots[2].subject, 'b');
  assert.equal(d.shots[0].weather, WEATHER_OF.snow);
});

test('reduced motion: every move held still, no tilt, every cut a cross-fade (the first a fade), and no smash at the end', () => {
  for (const sc of everyScene()) {
    const d = direct(sc, { calm: true });
    d.shots.forEach((s, i) => {
      assert.equal(s.move, 'still', sc.id);
      assert.notEqual(s.angle, 'dutch', sc.id);
      assert.ok(i === 0 ? ['fade', 'dissolve'].includes(s.cut!) : ['dissolve', 'fade'].includes(s.cut!), `${sc.id} ${i}: ${s.cut}`);
    });
    assert.notEqual(d.out, 'smash');
  }
  // (the camera itself: held where the shot begins, no judder, no tilt)
  const aim = { x: 300, feet: 262, height: 50, facing: 'left' as const };
  for (const move of ['pushIn', 'pullOut', 'pan', 'snapZoom', 'shake', 'drift'] as const) {
    const a = frame('dutch', move, { x: 0, y: 0, zoom: 1 }, aim, 0, 3, true);
    const b = frame('dutch', move, { x: 0, y: 0, zoom: 1 }, aim, 2.5, 3, true);
    assert.deepEqual(a, b, move);
    assert.equal(a.tilt, 0);
  }
});

test('the camera: framings close in on the subject\'s head, a push in grows over the shot, a Dutch angle tilts, a rack pulls focus', () => {
  const aim = { x: 300, feet: 262, height: 50, facing: 'right' as const };
  const base = { x: 100, y: 200, zoom: 1 };
  const wide = frame('wide', 'still', base, null, 0, 3);
  assert.deepEqual([wide.x, wide.y, wide.zoom], [100, 200, 1], 'a wide view is the written camera');
  const close = frame('close', 'still', base, aim, 0, 3);
  assert.equal(close.zoom, ZOOM_OF.close);
  assert.ok(close.y < aim.feet - aim.height * 0.7, 'on the head');
  assert.ok(ZOOM_OF.extreme > ZOOM_OF.close && ZOOM_OF.close > ZOOM_OF.medium && ZOOM_OF.medium > ZOOM_OF.wide);
  const p0 = frame('close', 'pushIn', base, aim, 0, 3).zoom;
  const p1 = frame('close', 'pushIn', base, aim, 3, 3).zoom;
  assert.ok(p1 > p0, 'a push in closes in');
  assert.ok(frame('close', 'pullOut', base, aim, 3, 3).zoom < frame('close', 'pullOut', base, aim, 0, 3).zoom);
  assert.ok(Math.abs(frame('dutch', 'still', base, aim, 1, 3).tilt) > TILT * 0.8);
  assert.ok(frame('close', 'rack', base, aim, 0, 3).blur < frame('close', 'rack', base, aim, 1.5, 3).blur, 'the land goes out of focus');
  assert.ok(frame('close', 'snapZoom', base, aim, 0, 3).zoom < frame('close', 'snapZoom', base, aim, 0.5, 3).zoom, 'a snap zoom lunges in');
  assert.equal(sharpScale(4.2), 5);
  assert.equal(sharpScale(4), 4);
});

test('cuts and endings: a smash is black then gone at once, a fade eases, a flash is white, a dissolve holds the last picture', () => {
  assert.equal(cutVeil('smash', 0.1).black, 1);
  assert.equal(cutVeil('smash', 0.3).black, 0);
  assert.ok(cutVeil('fade', 0).black > cutVeil('fade', 0.4).black && cutVeil('fade', 1).black === 0);
  assert.ok(cutVeil('flash', 0).white > 0 && cutVeil('flash', 0).white <= 0.85);
  assert.ok(cutVeil('dissolve', 0).prev === 1 && cutVeil('dissolve', 0.6).prev === 0);
  assert.deepEqual(cutVeil('cut', 0), { black: 0, white: 0, prev: 0 });
  assert.equal(outVeil('smash', 0.2), 1);
  assert.equal(outVeil('smash', 0.5), 0);
  assert.ok(outVeil('fade', 0.1) > outVeil('fade', 0.8));
  assert.equal(outVeil(undefined, 0), 0);
});

test('the words: typed at a steady pace, pausing after punctuation, slower through a word said with weight', () => {
  const t = typeTimes('Hi, you. Go');
  // (the pause after the comma and after the full stop)
  assert.ok(t[3] - t[2] > PAUSE.comma, 'a breath after the comma');
  assert.ok(t[8] - t[7] > PAUSE.stop, 'a stop after the full stop');
  assert.ok(t[2] - t[1] < PAUSE.comma, 'no pause mid-word');
  assert.deepEqual(emphasis('a *big* b'), [{ text: 'a ', em: false }, { text: 'big', em: true }, { text: ' b', em: false }]);
  assert.deepEqual(emphasis('no *pair'), [{ text: 'no pair', em: false }], 'an unpaired mark is dropped');
  assert.ok(typeLength('a *big* b') > typeLength('a big b'));
  assert.equal(typedCount('a *big* b', 0, true), 7, 'reduced motion shows it whole, marks left out');
  assert.equal(typedCount('abc', 0), 1);
  assert.equal(typedCount('abc', 99), 3);
  assert.ok(blipsBetween('hello', 0, 4, 3));
  assert.ok(!blipsBetween('. . .', 0, 5, 1), 'no blip on marks and spaces');
});

test('skipping: a short press is a tap, a press held long enough skips, and the ring fills meanwhile', () => {
  assert.equal(pressOf(100, true).kind, 'tap');
  assert.equal(pressOf(HOLD_SKIP_MS, false).kind, 'skip');
  assert.equal(pressOf(HOLD_SKIP_MS + 50, true).kind, 'skip');
  const mid = pressOf(HOLD_SKIP_MS * 0.7, false);
  assert.equal(mid.kind, 'holding');
  assert.ok(mid.ring > 0 && mid.ring < 1);
  assert.equal(pressOf(80, false).ring, 0, 'a tap shows no ring');
});

test('a battery saver draws less, reduced motion moves nothing', () => {
  const full = weightOf(false, false, 'snow');
  const saver = weightOf(true, false, 'snow');
  const still = weightOf(false, true, 'snow');
  assert.ok(saver.motes < full.motes && saver.motes > 0);
  assert.ok(!saver.blur && !saver.rays && full.blur && full.rays);
  assert.ok(!still.moves && !still.tilt && !still.drift);
  assert.equal(weightOf(false, false, 'none').motes, 0);
});

test('sequencing: a directed scene plays every beat in order to its end, and taps walk it shot by shot', () => {
  for (const id of ['opening', 'gorvak', 'intro:orcs', 'clear:orcs', 'awaken:knight']) {
    const d = direct(SCENES[id]);
    let c = start();
    let n = 0;
    let shots = 0;
    for (let k = start(); ; ) {
      const m = next(k, d);
      if (!m) break;
      if (m.shot !== k.shot) shots++;
      k = m;
      if (++n > 500) break;
    }
    assert.equal(shots, d.shots.length - 1, id);
    let t = 0;
    while (c && t < 200) {
      const m = tick(c, d, 0.25);
      if (!m) break;
      c = m;
      t += 0.25;
    }
    assert.ok(Math.abs(t - sceneSeconds(d)) < 0.5, `${id}: ${t} vs ${sceneSeconds(d)}`);
  }
});

test('every army has its first march, with its warlord, a title card and a smash cut into the fight; it comes once', () => {
  for (const a of ARMIES) {
    const sc = SCENES[`intro:${a.id}`];
    assert.ok(sc, a.id);
    assert.equal(sc.family, 'intro');
    assert.equal(sc.out, 'smash');
    assert.ok(sc.shots.some((s) => s.angle === 'low' && s.title), `${a.id}: the warlord's entrance`);
    const m = newMeta(3);
    assert.equal(dueScene(m, { kind: 'armyIntro', army: a.id }), `intro:${a.id}`);
    markSeen(m, `intro:${a.id}`);
    assert.equal(dueScene(m, { kind: 'armyIntro', army: a.id }), null);
  }
});

test('the arrivals and the act cards are short films that end in a smash cut; every boss with a title has its own line', () => {
  for (const boss of Object.keys(BOSS_TITLES)) {
    assert.ok(ARRIVAL_LINES[boss], boss);
    assert.ok(ARRIVAL_LINES[boss].length <= 100);
    const sc = arrivalScene(boss, 'Name', 'Title', 'forest');
    const secs = sceneSeconds(sc);
    assert.ok(secs >= 4 && secs <= 8, `${boss}: ${secs}`);
    assert.ok(sc.shots.some((s) => s.angle === 'low' && s.title?.name === 'Name'));
    assert.equal(sc.out, 'smash');
  }
  const act = actScene('III', 'The Chapel', 'temple', 'Kneel later.', null, 2, false);
  assert.equal(act.shots[0].title?.over, 'Act III');
  assert.ok(sceneSeconds(act) <= 10);
  assert.ok(actScene('II', 'The Library', 'ruins', null, null, 0, false).shots.length >= 1, 'with nobody left standing, still a card');
});

test('the quest stories are cut as films: an opening, a boss from below with its title, every line framed', () => {
  for (const qb of QUEST_BATTLES) {
    const cast = qb.cast.map((s) => s.heroes[0]);
    const before = qb.before(cast);
    assert.equal(before.out, 'smash', qb.id);
    assert.ok(before.shots.some((s) => s.angle === 'low' && s.title?.name === qb.boss?.name), `${qb.id}: the boss's entrance`);
    assert.ok(before.shots.some((s) => s.angle === 'close' || s.angle === 'extreme'), `${qb.id}: a close-up`);
    const secs = sceneSeconds(before);
    assert.ok(secs >= 10 && secs <= 40, `${qb.id}: ${secs}`);
  }
});
