import test from 'node:test';
import assert from 'node:assert/strict';
import { cardAt, dimAt, shakeAt, showcaseAt, showTier, starOf, summonPlan, MAX_EXTRAS } from '../src/render/summonRules';
import type { Pull } from '../src/sim/meta';

const pull = (rarity: number, isNew = true, kind = 'x'): Pull => ({ kind, rarity: rarity as Pull['rarity'], isNew, shards: isNew ? 0 : 3 });

test('the best rarity sets the tier of the show', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(showTier), ['plain', 'plain', 'epic', 'legendary', 'mythic']);
});

test('the star is the best rarity, a new hero before a repeat, then the first', () => {
  assert.equal(starOf([pull(1), pull(4, false), pull(2)]), 1);
  assert.equal(starOf([pull(4, false), pull(4, true)]), 1);
  assert.equal(starOf([pull(5), pull(5)]), 0);
  assert.equal(starOf([pull(2), pull(5, false), pull(5, true)]), 2);
});

test('a plain pull keeps the old show: no ribbon, no darkness, no shake, no showcase', () => {
  const p = summonPlan([pull(1), pull(2)]);
  assert.equal(p.tier, 'plain');
  assert.equal(p.ribbonAt, -1);
  assert.equal(p.dim, 0);
  assert.equal(p.shakeAmp, 0);
  assert.equal(p.showcase.length, 0);
});

test('the show grows with the rarity of a new hero', () => {
  const [e, l, m] = [3, 4, 5].map((r) => summonPlan([pull(r)]));
  assert.ok(e.tl.done < l.tl.done && l.tl.done < m.tl.done);
  assert.ok(e.tl.charge < l.tl.charge && l.tl.charge < m.tl.charge);
  assert.ok(e.dim < l.dim && l.dim < m.dim);
  assert.ok(e.shakeAmp < l.shakeAmp && l.shakeAmp < m.shakeAmp);
  assert.equal(e.ribbonAt, -1, 'an Epic has no ribbon');
  assert.ok(l.ribbonAt > 0 && m.ribbonAt > 0);
  assert.ok(e.flashAt < 0 && l.flashAt > 0 && m.flashAt > 0);
  assert.equal(m.thumps.length > 0, true, 'a Mythic has a heartbeat');
  assert.equal(l.thumps.length, 0);
});

test('the Mythic show is about 3 to 4 seconds to the reveal, and the hero is a silhouette until then', () => {
  const m = summonPlan([pull(5)]);
  assert.ok(m.revealAt >= 3000 && m.revealAt <= 4200, `reveal at ${m.revealAt}`);
  assert.equal(m.silhouetteUntil, m.revealAt);
  assert.equal(m.ribbonAt, m.revealAt, 'the ribbon slams in at the reveal');
});

test('a new Epic or better hero gets the banner and a showcase; a repeat gets half the show and its shards', () => {
  for (const r of [3, 4, 5]) {
    const n = summonPlan([pull(r, true)]);
    const d = summonPlan([pull(r, false)]);
    assert.ok(n.full && !d.full);
    assert.equal(n.showcase.length, 1);
    assert.equal(d.showcase.length, 0);
    assert.ok(n.cards[0].fresh && !d.cards[0].fresh);
    assert.ok(d.tl.charge <= n.tl.charge * 0.55, 'the charge is about half');
    assert.ok(d.tl.done < n.tl.done * 0.8, 'a repeat is shorter');
    assert.ok(d.cards[0].end > d.revealAt, 'the shards stay up after the reveal');
  }
});

test('a ten pull shows the best result, with the other new Legendary and Mythic heroes in quick showcases', () => {
  const got = [pull(1), pull(2), pull(5, true, 'a'), pull(4, true, 'b'), pull(4, false, 'c'), pull(3), pull(1), pull(1), pull(1), pull(1)];
  const p = summonPlan(got);
  assert.equal(p.tier, 'mythic');
  assert.equal(p.star, 2);
  assert.deepEqual(p.showcase.map((s) => [s.idx, s.mini]), [[2, false], [3, true]], 'the repeat Legendary gets no showcase');
  const [a, b] = p.showcase;
  assert.ok(b.at >= a.at + a.dur, 'one after another');
  assert.ok(b.dur < a.dur, 'the extra is quick');
  assert.ok(p.tl.done >= b.at + b.dur);
  assert.ok(p.tl.heroAt[2] > Math.max(...p.tl.heroAt.filter((_, i) => i !== 2)), 'the star steps out last');
  assert.ok(p.tl.done < 9000);
});

test('extra showcases are capped so a ten pull of Legendaries still moves along', () => {
  const p = summonPlan(Array.from({ length: 10 }, () => pull(4, true)));
  assert.equal(p.showcase.length, 1 + MAX_EXTRAS);
});

test('an Epic best result has no extras', () => {
  const p = summonPlan([pull(3), pull(3), pull(3)]);
  assert.equal(p.showcase.length, 1);
});

test('lookups at a time: the showcase, the card, the darkness and the shake', () => {
  const p = summonPlan([pull(4)]);
  const s = p.showcase[0];
  assert.equal(showcaseAt(p, s.at - 1), null);
  assert.equal(showcaseAt(p, s.at)?.idx, 0);
  assert.equal(showcaseAt(p, s.at + s.dur), null);
  assert.equal(cardAt(p, p.cards[0].at)?.fresh, true);
  assert.equal(cardAt(p, p.tl.done + 1), null);
  assert.equal(dimAt(p, 0), 0);
  assert.equal(dimAt(p, p.tl.flare - 1), p.dim);
  assert.ok(dimAt(p, p.tl.beam + 1) < 0.01);
  assert.ok(shakeAt(p, p.shakeAt) === 1 && shakeAt(p, p.shakeAt + p.shakeMs) === 0 && shakeAt(p, 0) === 0);
  const m = summonPlan([pull(5)]);
  assert.ok(dimAt(m, m.tl.beam + 1) > 0.2, 'a Mythic leaves a dusk');
});

test('the cues come in time order and start with a rise', () => {
  for (const r of [3, 4, 5]) {
    const p = summonPlan([pull(r)]);
    assert.ok(p.cues[0].cue.startsWith('rise') && p.cues[0].at === 0);
    assert.ok(p.cues.some((c) => c.cue.startsWith('sting') && c.at === p.tl.flare));
    for (let i = 1; i < p.cues.length; i++) assert.ok(p.cues[i].at >= p.cues[i - 1].at - 1e-9 || p.cues[i].cue === 'slam');
  }
  assert.ok(summonPlan([pull(5)]).cues.some((c) => c.cue === 'heartbeat'));
});

test('reduced motion keeps the ribbons and the showcase but has no shake, flash, darkness or thumps, and is short', () => {
  for (const r of [3, 4, 5]) {
    const p = summonPlan([pull(r)], true);
    assert.equal(p.shakeAmp, 0);
    assert.equal(p.flashAt, -1);
    assert.equal(p.dim, 0);
    assert.equal(p.thumps.length, 0);
    assert.equal(p.silhouetteUntil, 0);
    assert.equal(p.showcase.length, 1);
    assert.equal(r >= 4, p.ribbonAt >= 0);
    assert.ok(p.tl.done < 3500);
  }
});

test('the plans are deterministic', () => {
  const got = [pull(5, true, 'a'), pull(4, true, 'b')];
  assert.deepEqual(summonPlan(got), summonPlan(got));
});
