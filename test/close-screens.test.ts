import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closeOnOpen, closeOnPlace, type ScreenEntry } from '../src/screenRules';
import { closeFinished, openScreen, openScreens } from '../src/screens';

// CLOSE-SCREENS: when the player leaves a screen it is closed, and a finished screen is never left under the next one.
const flow = (name: string, over?: string[]): ScreenEntry => ({ name, kind: 'flow', over });
const moment = (name: string): ScreenEntry => ({ name, kind: 'moment' });

test('a flow screen opening closes the finished flow screens under it, top first', () => {
  // (the owner's case: a chest opened after a run, with its result card and recap still up)
  assert.deepEqual(closeOnOpen([flow('result'), flow('recap')], flow('chest')), ['recap', 'result']);
});

test('a flow screen meant to sit over another keeps it open', () => {
  assert.deepEqual(closeOnOpen([flow('result'), flow('recap')], flow('card', ['result'])), ['recap']);
});

test('moments stay under a flow screen, and a moment closes nothing as it opens', () => {
  assert.deepEqual(closeOnOpen([moment('tarot'), flow('result')], flow('recap')), ['result']);
  // (a film's unlock card over a result card the player still has to leave)
  assert.deepEqual(closeOnOpen([flow('result')], moment('endCard')), []);
});

test('a screen opened again replaces the old one, whatever its kind', () => {
  assert.deepEqual(closeOnOpen([flow('chest')], flow('chest')), ['chest']);
  assert.deepEqual(closeOnOpen([flow('result'), moment('endCard')], moment('endCard')), ['endCard']);
});

test('going back to a place closes every flow screen, and leaves the moments', () => {
  assert.deepEqual(closeOnPlace([flow('result'), moment('tarot'), flow('recap')]), ['recap', 'result']);
  assert.deepEqual(closeOnPlace([]), []);
});

test('the stack closes each screen once, however it is reached', () => {
  const shut: string[] = [];
  const closeResult = openScreen('result', () => shut.push('result'));
  const closeRecap = openScreen('recap', () => shut.push('recap'));
  assert.deepEqual(shut, ['result'], 'the recap closes the result card under it');
  assert.deepEqual(openScreens(), ['recap']);
  closeResult();
  assert.deepEqual(shut, ['result'], 'a closer called again does nothing');
  const leave = openScreen('tarot', () => shut.push('tarot'), { kind: 'moment' });
  assert.deepEqual(openScreens(), ['recap', 'tarot']);
  closeFinished();
  assert.deepEqual(shut, ['result', 'recap'], 'back home: the recap goes, the moment stays');
  closeRecap();
  leave();
  assert.deepEqual(shut, ['result', 'recap', 'tarot'], 'a moment is closed by its own way out, once');
  leave();
  assert.equal(shut.length, 3);
  assert.deepEqual(openScreens(), []);
});

test('a close that calls its own closer does not run twice', () => {
  let n = 0;
  let closer: () => void = () => undefined;
  closer = openScreen('chest', () => {
    n++;
    closer();
  });
  closeFinished();
  closer();
  assert.equal(n, 1);
  assert.deepEqual(openScreens(), []);
});
