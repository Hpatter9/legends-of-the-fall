// ARMIES-SWIPE (docs/notes/armies-swipe.md, `src/armySwipeRules.ts`): which army a drag of the card settles on, how far the card is
// drawn while dragged, and when the information under it may change.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { END_DRAG, FLICK_FAR, FLICK_SPEED, STILL_FAR, SWIPE_START, arrowsAt, dragShift, infoArmy, settleOn, stepTo, swipeAxis } from '../src/armySwipeRules';

const W = 393;
const N = 9;

test('a drag let go short of half-way springs back; past half-way it settles on the army beside it', () => {
  assert.equal(settleOn(3, N, -W / 2 + 1, W), 3, 'just short, going left');
  assert.equal(settleOn(3, N, W / 2 - 1, W), 3, 'just short, going right');
  assert.equal(settleOn(3, N, -W / 2, W), 3, 'half-way itself is not past it');
  assert.equal(settleOn(3, N, -W / 2 - 1, W), 4, 'a finger going left brings the next army');
  assert.equal(settleOn(3, N, W / 2 + 1, W), 2, 'a finger going right brings the one before');
  assert.equal(settleOn(3, N, -W * 3, W), 4, 'never more than one army a drag');
  assert.equal(settleOn(3, N, 0, W), 3);
});

test('a drag never settles off either end of the list', () => {
  assert.equal(settleOn(0, N, W, W), 0, 'nothing before the first');
  assert.equal(settleOn(N - 1, N, -W, W), N - 1, 'nothing after the last');
  assert.equal(settleOn(0, N, -W, W), 1);
  assert.equal(settleOn(N - 1, N, W, W), N - 2);
  assert.equal(settleOn(0, 1, -W, W), 0, 'one army: it stays');
  assert.equal(settleOn(0, 0, -W, W), 0);
});

test('a flick turns the card short of half-way, but only a real one, going the way the finger went', () => {
  assert.equal(settleOn(3, N, -60, W, -FLICK_SPEED), 4);
  assert.equal(settleOn(3, N, 60, W, FLICK_SPEED), 2);
  assert.equal(settleOn(3, N, -60, W, -FLICK_SPEED / 2), 3, 'too slow');
  assert.equal(settleOn(3, N, -(FLICK_FAR - 1), W, -3), 3, 'too short: a twitch is not a flick');
  assert.equal(settleOn(3, N, -60, W, FLICK_SPEED * 2), 3, 'the finger was coming back');
  assert.equal(settleOn(0, N, 60, W, 2), 0, 'a flick off the end stays');
});

test('with reduced motion a plain swipe is enough, as the card shows no half-way', () => {
  assert.equal(settleOn(3, N, -STILL_FAR, W, 0, true), 4);
  assert.equal(settleOn(3, N, STILL_FAR, W, 0, true), 2);
  assert.equal(settleOn(3, N, -(STILL_FAR - 1), W, 0, true), 3);
  assert.equal(settleOn(N - 1, N, -200, W, 0, true), N - 1);
});

test('the card follows the finger, by no more than its own width, and drags stiffly where there is no army', () => {
  assert.equal(dragShift(3, N, -100, W), -100);
  assert.equal(dragShift(3, N, 100, W), 100);
  assert.equal(dragShift(3, N, -W * 2, W), -W);
  assert.equal(dragShift(3, N, W * 2, W), W);
  assert.equal(dragShift(0, N, 100, W), 100 * END_DRAG, 'pulled before the first');
  assert.equal(dragShift(N - 1, N, -100, W), -100 * END_DRAG, 'pulled past the last');
  assert.equal(dragShift(0, N, -100, W), -100, 'the first army still goes on to the second');
  assert.ok(Math.abs(dragShift(0, N, W * 2, W)) < W / 2, 'an end can never be dragged half-way');
});

test('a touch is a swipe only once it has moved, and mostly sideways', () => {
  assert.equal(swipeAxis(SWIPE_START - 1, 0), null);
  assert.equal(swipeAxis(0, SWIPE_START - 1), null);
  assert.equal(swipeAxis(-SWIPE_START, 2), 'x');
  assert.equal(swipeAxis(3, SWIPE_START), 'y', 'a scroll of the information is left alone');
  assert.equal(swipeAxis(10, 10), 'y', 'a diagonal is not taken from the page');
});

test('the information keeps its army while the card moves, and takes the card\'s once it has settled', () => {
  assert.equal(infoArmy(3, 4, true), 3, 'mid-swipe: unchanged');
  assert.equal(infoArmy(3, 4, false), 4, 'settled on the next');
  assert.equal(infoArmy(3, 3, false), 3, 'sprung back: unchanged');
  // (a whole drag: dragged to just short of half-way and let go, then past it)
  let shown = 3;
  let card = settleOn(shown, N, -W / 2 + 5, W);
  shown = infoArmy(shown, card, false);
  assert.equal(shown, 3);
  card = settleOn(shown, N, -W / 2 - 5, W);
  assert.equal(infoArmy(shown, card, true), 3, 'still sliding home');
  assert.equal(infoArmy(shown, card, false), 4);
});

test('an arrow does the same move, kept on the list, and is off at the end it points to', () => {
  assert.equal(stepTo(-1, N), 0);
  assert.equal(stepTo(N, N), N - 1);
  assert.equal(stepTo(4, N), 4);
  assert.deepEqual(arrowsAt(0, N), { prev: false, next: true });
  assert.deepEqual(arrowsAt(4, N), { prev: true, next: true });
  assert.deepEqual(arrowsAt(N - 1, N), { prev: true, next: false });
  assert.deepEqual(arrowsAt(0, 1), { prev: false, next: false });
});

test('the rules stay free of the page, and the page reads them', () => {
  const rules = readFileSync('src/armySwipeRules.ts', 'utf8');
  assert.ok(!/\bdocument\b|\bwindow\b|pixi|Math\.random|Date\.now/.test(rules.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')));
  const view = readFileSync('src/armiesView.ts', 'utf8');
  for (const name of ['settleOn', 'dragShift', 'swipeAxis', 'infoArmy', 'arrowsAt', 'stepTo']) assert.ok(view.includes(name), `${name} is used by the page`);
  // (the old way, the whole page scrolled sideways with scroll-snap, is gone)
  assert.ok(!/scroll-snap/.test(readFileSync('src/pixel.css', 'utf8').split('\n').filter((l) => /^\.as(Track|Card|Slide)\b/.test(l)).join('\n')));
});
