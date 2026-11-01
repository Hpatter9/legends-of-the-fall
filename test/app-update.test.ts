import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inApp, newerThan } from '../src/appUpdate';

test('a newer release tag is told from an older or equal one', () => {
  assert.equal(newerThan('v0.320.0', '0.319.0'), true);
  assert.equal(newerThan('v0.319.0', '0.319.0 · abc1234'), false);
  assert.equal(newerThan('v0.318.5', '0.319.0'), false);
  assert.equal(newerThan('v1.0.0', '0.999.9'), true);
  assert.equal(newerThan('0.319.1', '0.319.0'), true);
});

test('a plain browser is not the app', () => {
  assert.equal(inApp(), false);
});
