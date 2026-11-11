// ULT-EPIC 2 (docs/notes/ult-epic.md, `src/ultStageRules.ts`): the owner's lengths and the three stages. An ultimate fired by hand takes 4 to
// 6 s and an Eidolon's call 4 to 10 s, each in a wind-up, a strike and an aftermath; the fight is at x1 for the show and at the set speed
// again however the show ends; on Auto both run short.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALL_HEROES } from '../src/sim/units';
import { EIDOLONS } from '../src/sim/eidolons';
import { fullScene, ULT_MOMENT, UltQueue, ultCues, type UltMoment, type UltShape } from '../src/ultMomentRules';
import { ULT_EPIC } from '../src/ultEpicRules';
import { momentSpeed, SHOWCASES, SHOW } from '../src/ultShowRules';
import { beatTimes, callMs, CHOREO, fullOf, momentOf, SHORT } from '../src/eidolonRules';
import { FIGHT_DUCKS, DUCKS } from '../src/render/audioRules';
import { EIDOLON_LIMITS, EIDOLON_MS, eidolonMs, eidolonStages, STAGE_ART, STAGE_NAMES, stageArt, stageAt, stageFrame, stagesFor, ULT_LIMITS, ULT_STAGES, ultStages, ultWeight, type Stages } from '../src/ultStageRules';

/** The stages follow one another with no gap, each has a length, and they add up to the total. */
function whole(s: Stages, what: string): void {
  assert.equal(s.windup.at, 0, what);
  assert.equal(s.strike.at, s.windup.ms, what);
  assert.equal(s.aftermath.at, s.windup.ms + s.strike.ms, what);
  assert.equal(s.total, s.windup.ms + s.strike.ms + s.aftermath.ms, what);
  for (const n of STAGE_NAMES) assert.ok(s[n].ms >= 500, `${what}: a ${n} long enough to read (${s[n].ms})`);
}

/** Step a queue to its end at 60 frames a second; the real ms it took. */
function play(q: UltQueue, each?: (t: number) => void): number {
  let t = 0;
  while (q.current && t < 20_000) {
    q.step(16);
    t += 16;
    each?.(t);
  }
  return t;
}

test('every hero ultimate has its three stages, 4 to 6 s in all, a single blow the shortest and a storm or a summoning the longest', () => {
  const heroes = ALL_HEROES;
  assert.ok(heroes.length >= 45);
  for (const h of heroes) {
    const s = ultStages(h);
    whole(s, h);
    assert.ok(s.total >= ULT_LIMITS.MIN && s.total <= ULT_LIMITS.MAX, `${h}: ${s.total}`);
    // (its further bursts all go off inside the strike, after the freeze on the first)
    for (const e of s.echoes) assert.ok(e > 0 && e + ULT_EPIC.HIT_STOP_MS < s.strike.ms - 100, `${h}: ${e}`);
    // (every hero with a showcase is in the table art is made against)
    if (SHOWCASES[h]) assert.deepEqual(ULT_STAGES[h], s);
  }
  const len = (kind: string) => ultStages(kind).total;
  assert.equal(ultWeight('samurai'), 'blow');
  assert.equal(ultWeight('kunoichi'), 'flurry');
  assert.equal(ultWeight('minotaur'), 'flurry', 'three charges in a row');
  assert.equal(ultWeight('knight'), 'wave');
  assert.equal(ultWeight('wizard'), 'storm');
  assert.equal(ultWeight('beastmaster'), 'summon');
  assert.equal(ultWeight('priestess'), 'summon', 'the fallen raised');
  assert.ok(len('samurai') < len('kunoichi') && len('kunoichi') < len('knight') && len('knight') < len('wizard') && len('wizard') <= len('beastmaster'));
  assert.ok(len('samurai') <= 4400, 'a single blow is nearer 4 s');
  assert.ok(len('wizard') >= 5500 && len('beastmaster') >= 5500, 'a storm and a summoning are nearer 6 s');
  assert.ok(ultStages('samurai').echoes.length === 0 && ultStages('wizard').echoes.length >= 2);
});

test('a salvo in the air and a showcase are inside the strike, and the whole stays within 4 to 6 s whatever they take', () => {
  for (const h of Object.keys(SHOWCASES)) {
    for (let wait = 150; wait <= ULT_MOMENT.MAX_DELAY_MS; wait += 150) {
      const s = stagesFor(h, { wait });
      whole(s, `${h} wait ${wait}`);
      assert.ok(s.total >= ULT_LIMITS.MIN && s.total <= ULT_LIMITS.MAX, `${h} wait ${wait}: ${s.total}`);
      assert.ok(s.strike.ms >= wait + ULT_EPIC.HIT_STOP_MS + 200, 'the salvo has landed, and its burst bloomed, before the aftermath');
      assert.equal(s.echoes.length, 0);
    }
    // (a showcase plays 2.5 s at least; the longest the plans make is under 4 s, `test/ult-show.test.ts`)
    for (let show = SHOW.MIN; show <= 3900; show += 100) {
      const s = stagesFor(h, { show });
      whole(s, `${h} show ${show}`);
      assert.ok(s.total >= ULT_LIMITS.MIN && s.total <= ULT_LIMITS.MAX, `${h} show ${show}: ${s.total}`);
      assert.ok(s.strike.ms >= show + ULT_EPIC.HIT_STOP_MS);
      assert.equal(s.show, show, 'a showcase alone plays at its own pace');
      // (with a salvo to land after it, both are inside the strike; the showcase is quickened by a third at most to fit)
      for (const wait of [450, 900, 1500]) {
        const d = stagesFor(h, { show, wait });
        whole(d, `${h} show ${show} wait ${wait}`);
        assert.ok(d.total >= ULT_LIMITS.MIN && d.total <= ULT_LIMITS.MAX, `${h} show ${show} wait ${wait}: ${d.total}`);
        assert.ok(d.strike.ms >= d.show! + wait + ULT_EPIC.HIT_STOP_MS);
        if (show <= 3200) assert.ok(show / d.show! <= 1.34, `${h} show ${show} wait ${wait}: played ${d.show}`);
      }
    }
  }
});

test('the queue plays a use for exactly its stages, whatever its shape, with the screen kept still too; the stages come in order', () => {
  const uses: { kind: string; shape: UltShape; ms: number; show?: number; land?: number }[] = [
    { kind: 'samurai', shape: 'instant', ms: 0 },
    { kind: 'kunoichi', shape: 'instant', ms: 0 },
    { kind: 'knight', shape: 'lingering', ms: 0 },
    { kind: 'beastmaster', shape: 'lingering', ms: 0 },
    { kind: 'wizard', shape: 'delayed', ms: 1500 },
    { kind: 'wizard', shape: 'delayed', ms: 1500, land: 400 },
    { kind: 'archer', shape: 'delayed', ms: 700, land: 5000 },
    { kind: 'kunoichi', shape: 'instant', ms: 0, show: 3300 },
    { kind: 'beastmaster', shape: 'lingering', ms: 0, show: 3000 },
    { kind: 'wizard', shape: 'delayed', ms: 1500, show: 2800 },
  ];
  for (const calm of [false, true])
    for (const u of uses) {
      const what = `${u.kind} ${u.shape}${u.show ? ' show' : ''}${u.land ? ` lands ${u.land}` : ''}${calm ? ' calm' : ''}`;
      // (as the page does: a salvo's wait and a showcase are both given)
      const stages = stagesFor(u.kind, { show: u.show, wait: u.ms });
      const q = new UltQueue();
      q.calm = calm;
      q.push({ unit: 1, kind: u.kind, name: 'X', shape: u.shape, ms: u.ms, show: stages.show, stages });
      const seen: string[] = [];
      let lastK = 0;
      let settleT = 0;
      const took = play(q, () => {
        const st = q.stageNow;
        if (!st) return;
        if (seen[seen.length - 1] !== st.name) {
          seen.push(st.name);
          lastK = 0;
        }
        assert.ok(st.k >= lastK && st.k <= 1, `${what}: ${st.name} runs forward (${st.k} after ${lastK})`);
        lastK = st.k;
        if (st.name === 'windup') assert.ok(q.holdsBattle && !q.runsEffects, `${what}: held through the wind-up`);
        if (st.name === 'aftermath') assert.ok(!q.holdsBattle && q.since !== null, `${what}: the fight runs through the aftermath, the blow landed`);
        if (q.phase === 'settle' && u.land && (settleT += 16) >= u.land) q.land();
      });
      assert.ok(took >= stages.total - 16 && took <= stages.total + 16, `${what}: ${took} vs ${stages.total}`);
      assert.ok(took >= ULT_LIMITS.MIN - 16 && took <= ULT_LIMITS.MAX + 16, `${what}: ${took}`);
      assert.deepEqual(seen, ['windup', 'strike', 'aftermath'], what);
      assert.equal(q.strikes, 1, `${what}: one blow`);
      assert.equal(q.stageNow, null);
    }
});

test('a flurry or a storm bursts again in beats through its strike; a single blow, a salvo and a skipped moment do not', () => {
  const run = (kind: string, more: Partial<UltMoment> = {}, skipAt?: number): number => {
    const q = new UltQueue();
    q.push({ unit: 1, kind, name: 'X', shape: 'instant', ms: 0, stages: stagesFor(kind), ...more });
    play(q, (t) => {
      if (skipAt !== undefined && t >= skipAt && q.phase !== 'fade') q.skip();
    });
    return q.echoes;
  };
  assert.equal(run('samurai'), 0);
  assert.equal(run('kunoichi'), ultStages('kunoichi').echoes.length);
  assert.equal(run('wizard'), ultStages('wizard').echoes.length);
  assert.ok(ultStages('wizard').echoes.length === 3);
  assert.equal(run('wizard', { shape: 'delayed', ms: 900, stages: stagesFor('wizard', { wait: 900 }) }), 0, "a salvo's own blows land live");
  assert.equal(run('wizard', {}, 2100), 0, 'a tap in the wind-up or on the blow cuts the rest');
  // (a moment with no stages plays the old lengths and has none)
  const old = new UltQueue();
  old.push({ unit: 1, kind: 'wizard', name: 'X', shape: 'instant', ms: 0 });
  play(old);
  assert.equal(old.echoes, 0);
});

test('the fight is at x1 for the whole show and at the set speed again however it ends: played out, skipped, the fight over, paused, a second one begun', () => {
  const set = 3;
  const speed = (q: UltQueue) => momentSpeed(set, !!q.current);
  const m = (kind: string, shape: UltShape = 'instant'): UltMoment => ({ unit: 1, kind, name: 'X', shape, ms: shape === 'delayed' ? 900 : 0, stages: stagesFor(kind, { wait: shape === 'delayed' ? 900 : 0 }) });
  // (played out: x1 on every frame of it, the set speed on the first frame after)
  for (const shape of ['instant', 'lingering', 'delayed'] as const) {
    const q = new UltQueue();
    assert.equal(speed(q), set);
    q.push(m('wizard', shape));
    assert.equal(speed(q), 1, 'from the frame it fires');
    while (q.current) {
      assert.equal(speed(q), 1, shape);
      q.step(16);
    }
    assert.equal(speed(q), set, shape);
  }
  // (a tap skips it: x1 through the short fade, then back)
  const s = new UltQueue();
  s.push(m('samurai'));
  s.step(700);
  s.skip();
  assert.equal(speed(s), 1);
  s.step(ULT_MOMENT.FADE_MS);
  assert.equal(speed(s), set);
  // (the fight ends, or the screen is left, part-way: the page clears the queue)
  for (const at of [100, 1700, 2600, 3900]) {
    const q = new UltQueue();
    q.push(m('knight'));
    q.push(m('wizard'));
    q.step(at);
    q.clear();
    assert.equal(speed(q), set, `cleared at ${at}`);
    assert.equal(q.rate, 1, 'and nothing is left slowed');
    assert.ok(!q.holdsBattle && q.stageNow === null && q.waiting === 0);
  }
  // (paused: a sheet or a scene holds everything and the queue is not stepped; it is still the show, then it plays out and the speed is back)
  const p = new UltQueue();
  p.push(m('kunoichi'));
  p.step(1000);
  const held = { phase: p.phase, left: p.left };
  assert.equal(speed(p), 1, 'still x1 while paused');
  assert.deepEqual({ phase: p.phase, left: p.left }, held, 'nothing moves unless it is stepped');
  play(p);
  assert.equal(speed(p), set);
  // (a second ultimate fired during the first: x1 across both, each its whole length, and back after the second)
  const two = new UltQueue();
  two.push(m('samurai'));
  two.step(2000);
  two.push(m('wizard'));
  let t = 2000;
  while (two.current) {
    assert.equal(speed(two), 1);
    two.step(16);
    t += 16;
  }
  assert.equal(speed(two), set);
  const both = ultStages('samurai').total + ultStages('wizard').total;
  assert.ok(Math.abs(t - both) <= 48, `${t} vs ${both}`);
  // (and the slow beat after a blow never outlives its moment)
  assert.equal(two.rate, 1);
});

test('nothing in the shows writes the fight\'s speed: it is read each frame, so there is nothing to put back', () => {
  for (const f of ['src/ultMoment.ts', 'src/ultShow.ts', 'src/ultMomentRules.ts', 'src/ultStageRules.ts', 'src/eidolonCall.ts']) {
    const code = readFileSync(f, 'utf8');
    assert.ok(!/\.speed\s*=[^=]/.test(code) && !/setSpeed\(/.test(code), f);
  }
  // (the page reads the set speed through the rule on each frame it steps the fight)
  for (const f of ['src/main.ts', 'src/standView.ts']) assert.match(readFileSync(f, 'utf8'), /momentSpeed\(this\.speed, !!this\.ultm\.queue\.current \|\| this\.eid\.long\)/, f);
});

test('on Auto both run short: an ultimate is its banner over a fight that never stops, an Eidolon its short call (after its first)', () => {
  assert.equal(fullScene(true, true), false);
  assert.equal(ULT_LIMITS.AUTO, ULT_MOMENT.SHORT_MS);
  assert.ok(ULT_LIMITS.AUTO < ULT_LIMITS.MIN / 2);
  for (const e of EIDOLONS) {
    assert.equal(momentOf(false, true, e.id, true), SHORT, e.id);
    assert.equal(momentOf(false, true, e.id, false), fullOf(e.id), e.id);
    assert.equal(momentOf(false, false, e.id, false), SHORT, 'the setting off is the short call too');
    assert.equal(momentOf(true, false, e.id, true), fullOf(e.id), 'its first call is always in full');
  }
  assert.equal(SHORT.RESUME, EIDOLON_LIMITS.AUTO);
  assert.ok(callMs(SHORT) < EIDOLON_LIMITS.MIN);
  // (a short call does not hold the fight to x1: `EidolonCall.long` is the full one only, which has the letterbox)
  assert.ok(!SHORT.BARS);
});

test("every Eidolon's full call takes 4 to 10 s by its weight, in the same three stages", () => {
  for (const e of EIDOLONS) {
    assert.ok(EIDOLON_MS[e.id], `${e.id} has its own length`);
    const m = fullOf(e.id);
    assert.equal(callMs(m), eidolonMs(e.id), e.id);
    assert.ok(callMs(m) >= EIDOLON_LIMITS.MIN && callMs(m) <= EIDOLON_LIMITS.MAX, `${e.id}: ${callMs(m)}`);
    assert.ok(m.BARS, 'the full call: the fight is at x1 under it');
    const s = eidolonStages(m);
    whole(s, e.id);
    assert.equal(s.total, callMs(m), e.id);
    // (its beats all land inside the strike)
    const beats = beatTimes(m, CHOREO[e.id].length);
    assert.equal(beats.length, CHOREO[e.id].length);
    assert.ok(beats[0] === s.strike.at && beats[beats.length - 1] < m.AFTER, e.id);
    // (the freeze on its first blow grows with it, a little)
    assert.ok(m.HIT_STOP >= 250 && m.HIT_STOP <= 360, `${e.id}: ${m.HIT_STOP}`);
  }
  // (the six by weight: the hound the quickest, the Dragon King the longest and near the limit)
  const order = ['askel', 'voltara', 'nivra', 'aurelan', 'gorm', 'vaelkhar'].map(eidolonMs);
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1]);
  assert.ok(eidolonMs('askel') <= 5200 && eidolonMs('vaelkhar') >= 9000);
  assert.ok(eidolonMs('someone-new') >= EIDOLON_LIMITS.MIN && eidolonMs('someone-new') <= EIDOLON_LIMITS.MAX);
});

test('the stage at a time, and a sheet hung on a stage: which frame shows', () => {
  const s = ultStages('wizard');
  assert.equal(stageAt(s, -1), null);
  assert.deepEqual(stageAt(s, 0), { name: 'windup', k: 0 });
  assert.equal(stageAt(s, s.strike.at)?.name, 'strike');
  assert.equal(stageAt(s, s.strike.at + s.strike.ms / 2)?.k, 0.5);
  assert.equal(stageAt(s, s.aftermath.at)?.name, 'aftermath');
  assert.equal(stageAt(s, s.total), null);
  // (once across the stage, holding its last frame; or looping)
  const once = { frames: 8 };
  assert.equal(stageFrame(once, 0, 2000), 0);
  assert.equal(stageFrame(once, 0.5, 2000), 4);
  assert.equal(stageFrame(once, 1, 2000), 7);
  assert.equal(stageFrame(once, 7, 2000), 7);
  const loop = { frames: 6, loop: true, loopMs: 600 };
  assert.equal(stageFrame(loop, 0, 1800), 0);
  assert.equal(stageFrame(loop, 0.5, 1800), 3);
  assert.equal(stageFrame(loop, 650 / 1800, 1800), 0, 'round again');
  // (nothing is attached yet: the page plays what the game has; an entry names a real stage)
  for (const [kind, arts] of Object.entries(STAGE_ART)) for (const name of Object.keys(arts)) assert.ok(STAGE_NAMES.includes(name as never), `${kind}.${name}`);
  assert.equal(stageArt('samurai', 'strike'), STAGE_ART.samurai?.strike);
});

test("the sound: a long wind-up's charge still ends on the blow, a further burst is the sting again but softer, and the music stands back", () => {
  const open = ultCues('open', false, 2000);
  assert.deepEqual(open.map((q) => q.cue), ['ultSlash', 'ultCharge']);
  assert.equal(open[1].delay, 2000 - ULT_MOMENT.OPEN_MS);
  assert.equal(ultCues('open', false)[1].delay, undefined);
  const echo = ultCues('echo', false);
  assert.deepEqual(echo.map((q) => q.cue), ['ultImpact']);
  assert.ok(echo[0].gain! < 1);
  assert.ok(DUCKS.ult && DUCKS.ult.db < 0);
  assert.ok(FIGHT_DUCKS.includes('ult'), 'a fight starting or ending lets it go, so the music can never be left held down');
});
