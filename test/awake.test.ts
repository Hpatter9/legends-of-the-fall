import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setSetting } from '../src/settings';
import { syncAwake } from '../src/render/awake';

/** A wake lock that counts what it was asked. */
function fakeLock() {
  const state = { requests: 0, released: 0 };
  const lock = {
    released: false,
    release: async () => {
      lock.released = true;
      state.released++;
    },
    addEventListener() {},
  };
  return { state, api: { request: async () => (state.requests++, lock) } };
}

const flush = () => new Promise((r) => setTimeout(r, 5));

test('the screen lock is taken while the setting is on and the page is visible, and let go when the setting goes off', async () => {
  const g = globalThis as unknown as Record<string, unknown>;
  const oldNav = Object.getOwnPropertyDescriptor(g, 'navigator');
  const oldDoc = g.document;
  const { state, api } = fakeLock();
  Object.defineProperty(g, 'navigator', { value: { wakeLock: api }, configurable: true });
  g.document = { visibilityState: 'visible', addEventListener() {} };
  try {
    setSetting('awake', true);
    syncAwake();
    await flush();
    assert.equal(state.requests, 1, 'asked once');
    syncAwake();
    await flush();
    assert.equal(state.requests, 1, 'a lock already held is not asked for again');
    setSetting('awake', false);
    syncAwake();
    await flush();
    assert.equal(state.released, 1, 'let go when the setting is turned off');
    // (hidden: nothing is asked for)
    g.document = { visibilityState: 'hidden', addEventListener() {} };
    setSetting('awake', true);
    syncAwake();
    await flush();
    assert.equal(state.requests, 1, 'no request while the page is hidden');
  } finally {
    setSetting('awake', true);
    if (oldNav) Object.defineProperty(g, 'navigator', oldNav);
    g.document = oldDoc;
  }
});

test('a browser with no wake lock is quietly ignored', async () => {
  const g = globalThis as unknown as Record<string, unknown>;
  const oldNav = Object.getOwnPropertyDescriptor(g, 'navigator');
  const oldDoc = g.document;
  Object.defineProperty(g, 'navigator', { value: {}, configurable: true });
  g.document = { visibilityState: 'visible', addEventListener() {} };
  try {
    syncAwake();
    await flush();
  } finally {
    if (oldNav) Object.defineProperty(g, 'navigator', oldNav);
    g.document = oldDoc;
  }
});
