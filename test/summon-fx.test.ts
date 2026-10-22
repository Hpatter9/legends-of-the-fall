import test from 'node:test';
import assert from 'node:assert/strict';
import { cardAt, dimAt, shakeAt, showcaseAt, showTier, starOf, summonPlan, MAX_EXTRAS } from '../src/render/summonRules';
import type { Pull } from '../src/sim/meta';

// A pull has no rarity: the show depends only on whether the pull holds a new hero.
const pull = (isNew = true, kind = 'x'): Pull => ({ kind, isNew, shards: isNew ? 0 : 1 });

test('the tier of a show follows only whether the pull holds a new hero', () => {
  assert.equal(showTier([pull(false), pull(false)]), 'plain');
  assert.equal(showTier([pull(false), pull(true)]), 'grand');
  assert.equal(showTier([pull(true)]), 'grand');
});

test('the star is the first new hero, else the first hero', () => {
  assert.equal(starOf([pull(false), pull(true, 'a'), pull(true, 'b')]), 1);
  assert.equal(starOf([pull(false), pull(false)]), 0);
  assert.equal(starOf([pull(true), pull(true)]), 0);
});

test('a pull of repeats keeps the plain hall show: no ribbon, no darkness, no shake, no showcase', () => {
  const p = summonPlan([pull(false), pull(false)]);
  assert.equal(p.tier, 'plain');
  assert.equal(p.full, false);
  assert.equal(p.ribbonAt, -1);
  assert.equal(p.dim, 0);
  assert.equal(p.shakeAmp, 0);
  assert.equal(p.showcase.length, 0);
  assert.equal(p.cues.length, 0);
});

test('a new hero gets the one strong show: a ribbon, a banner card and a showcase, longer than the plain show', () => {
  const n = summonPlan([pull(true)]);
  const d = summonPlan([pull(false)]);
  assert.equal(n.tier, 'grand');
  assert.ok(n.full);
  assert.equal(n.showcase.length, 1);
  assert.ok(n.cards[0].fresh);
  assert.ok(n.ribbonAt > 0);
  assert.ok(n.dim > 0 && n.shakeAmp > 0);
  assert.ok(n.tl.done > d.tl.done, 'the plain show is shorter');
  assert.ok(n.tl.done < 6000, 'and the grand one does not make the player wait');
});

test('the grand show is the same for every new hero (no hero is grander than another)', () => {
  const a = summonPlan([pull(true, 'knight')]);
  const b = summonPlan([pull(true, 'tyrant')]);
  assert.deepEqual({ ...a }, { ...b });
});

test('nothing flashes: the plan has no flash, no heartbeat and no silhouette', () => {
  const p = summonPlan([pull(true)]) as unknown as Record<string, unknown>;
  for (const k of ['flashAt', 'thumps', 'silhouetteUntil']) assert.equal(k in p, false, k);
  assert.ok(summonPlan([pull(true)]).cues.every((c) => ['riseSummon', 'stingSummon', 'slam'].includes(c.cue)));
});

test('a ten pull is built round its first new hero, with the other new heroes in quick showcases', () => {
  const got = [pull(false, 'a'), pull(false, 'b'), pull(true, 'c'), pull(true, 'd'), pull(false, 'e'), pull(false, 'f'), pull(true, 'g'), pull(false), pull(false), pull(false)];
  const p = summonPlan(got);
  assert.equal(p.tier, 'grand');
  assert.equal(p.star, 2);
  assert.deepEqual(p.showcase.map((s) => [s.idx, s.mini]), [[2, false], [3, true], [6, true]], 'the repeats get no showcase');
  const [a, b] = p.showcase;
  assert.ok(b.at >= a.at + a.dur, 'one after another');
  assert.ok(b.dur < a.dur, 'the extra is quick');
  assert.ok(p.tl.done >= p.showcase[2].at + p.showcase[2].dur);
  assert.ok(p.tl.heroAt[2] > Math.max(...p.tl.heroAt.filter((_, i) => i !== 2)), 'the star steps out last');
  assert.ok(p.tl.done < 9000);
});

test('extra showcases are capped so a ten pull of new heroes still moves along', () => {
  const p = summonPlan(Array.from({ length: 10 }, () => pull(true)));
  assert.equal(p.showcase.length, 1 + MAX_EXTRAS);
});

test('lookups at a time: the showcase, the card, the darkness and the shake', () => {
  const p = summonPlan([pull(true)]);
  const s = p.showcase[0];
  assert.equal(showcaseAt(p, s.at - 1), null);
  assert.equal(showcaseAt(p, s.at)?.idx, 0);
  assert.equal(showcaseAt(p, s.at + s.dur), null);
  assert.equal(cardAt(p, p.cards[0].at)?.fresh, true);
  assert.equal(cardAt(p, p.tl.done + 1), null);
  assert.equal(dimAt(p, 0), 0);
  assert.equal(dimAt(p, p.tl.flare - 1), p.dim);
  assert.ok(dimAt(p, p.tl.beam + 1) < 0.01, 'the room lifts to full light');
  assert.ok(shakeAt(p, p.shakeAt) === 1 && shakeAt(p, p.shakeAt + p.shakeMs) === 0 && shakeAt(p, 0) === 0);
});

test('the cues come in time order and start with a rise', () => {
  const p = summonPlan([pull(true)]);
  assert.ok(p.cues[0].cue.startsWith('rise') && p.cues[0].at === 0);
  assert.ok(p.cues.some((c) => c.cue.startsWith('sting') && c.at === p.tl.flare));
  for (let i = 1; i < p.cues.length; i++) assert.ok(p.cues[i].at >= p.cues[i - 1].at - 1e-9 || p.cues[i].cue === 'slam');
});

test('reduced motion keeps the ribbon and the showcase but has no shake or darkness, and is short', () => {
  const p = summonPlan([pull(true)], true);
  assert.equal(p.shakeAmp, 0);
  assert.equal(p.dim, 0);
  assert.equal(p.showcase.length, 1);
  assert.ok(p.ribbonAt >= 0);
  assert.ok(p.tl.done < 3500);
});

test('the plans are deterministic', () => {
  const got = [pull(true, 'a'), pull(true, 'b')];
  assert.deepEqual(summonPlan(got), summonPlan(got));
});
