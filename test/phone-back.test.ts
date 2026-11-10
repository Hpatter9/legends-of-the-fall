// PHONE-BACK (docs/notes/phone-back.md, `src/backRules.ts`): what the phone's Back does, and the audit that every overlay the page can put up
// is one Back can close: a dialog built by hand, a layer of the page's own, a new one added later.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BACK_LAYERS, backAction, guardState, isGuard, wayOut, GUARD_KEY } from '../src/backRules';

test('Back: a cinematic is skipped, the top overlay closed, another tab goes to Battle, a fight pauses, the Battle tab stays', () => {
  assert.deepEqual(backAction({ top: 'cinematic', place: 'fight' }), { do: 'skip' });
  assert.deepEqual(backAction({ top: 'overlay', place: 'home', tab: 'castle' }), { do: 'close' }, 'a menu over a tab closes first');
  assert.deepEqual(backAction({ top: 'cinematic', place: 'home', tab: 'battle' }), { do: 'skip' });
  for (const tab of ['recruit', 'heroes', 'castle', 'spells']) assert.deepEqual(backAction({ top: null, place: 'home', tab }), { do: 'battleTab' }, tab);
  assert.deepEqual(backAction({ top: null, place: 'home', tab: 'battle' }), { do: 'none' }, 'never out of the game');
  for (const place of ['deploy', 'fight', 'assault'] as const) assert.deepEqual(backAction({ top: null, place }), { do: 'pause' }, place);
  assert.deepEqual(backAction({ top: 'overlay', place: 'assault' }), { do: 'close' }, 'the pause card open: Back closes it');
  assert.deepEqual(backAction({ top: null, place: 'other' }), { do: 'none' });
});

test('a layer with no control named is closed by the button that reads as its way out', () => {
  assert.equal(wayOut(['Fight!', '‹ Back']), 1);
  assert.equal(wayOut(['Rank up', 'Back']), 1);
  assert.equal(wayOut(['Continue', 'Close']), 1, 'Close before Continue');
  assert.equal(wayOut(['Bind at the Sanctum', 'Not now']), 1);
  assert.equal(wayOut(['Continue']), 0);
  assert.equal(wayOut(['Buy', 'Recycle for Gold']), -1, 'nothing that reads as a way out: the layer is tapped instead');
});

test('the history guard keeps the page’s own entry and is told apart from it', () => {
  assert.equal(isGuard(null), false);
  assert.equal(isGuard({ x: 1 }), false);
  const g = guardState({ x: 1 });
  assert.deepEqual(g, { x: 1, [GUARD_KEY]: 1 });
  assert.equal(isGuard(g), true);
  assert.deepEqual(guardState(null), { [GUARD_KEY]: 1 });
});

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? (f === 'sim' ? [] : sources(p)) : p.endsWith('.ts') ? [p] : [];
  });
const files = new Set(BACK_LAYERS.map((l) => l.file));

test('every layer Back knows is built where it says, and every dialog built by hand is one Back knows', () => {
  for (const f of files) assert.ok(existsSync(join('src', f)), `${f} (in BACK_LAYERS) is not a file`);
  // (a dialog of its own, not the standard ornate menu: its file must be in the table, so Back can close it)
  for (const p of sources('src')) {
    const src = readFileSync(p, 'utf8');
    if (p.endsWith('ornateMenu.ts') || !/setAttribute\(\s*'role',\s*'dialog'\s*\)/.test(src)) continue;
    const name = p.slice('src/'.length).replace(/\\/g, '/');
    assert.ok(files.has(name), `${name} builds a dialog of its own that Back does not know: add it to BACK_LAYERS (src/backRules.ts)`);
  }
});

/** The page's own layers that are not menus: banners and the bar, the loading screen, the places (Back on them is the place's own rule). */
const NOT_A_LAYER: Readonly<Record<string, string>> = {
  sky: 'the backdrop',
  stage: 'the board',
  top: 'the top bar',
  twistBanner: 'a banner, no control',
  hudSpells: 'the spell row',
  autoBar: 'the auto-replay bar: its Stop is a control, not a way out',
  bossBar: 'a bar',
  phaseBanner: 'a banner',
  panel: 'the bench',
  home: 'a place: its tabs are the rule’s own',
  loading: 'the loading screen',
  turnUp: 'the turn-upright notice',
  version: 'the version line',
};

test('every layer of the page’s own (the top-level elements of index.html) is one Back closes, or is named as not a menu', () => {
  const html = readFileSync('src/index.html', 'utf8');
  const body = html.slice(html.indexOf('<body'));
  // (the body's own children: their ids)
  const ids: string[] = [];
  let depth = 0;
  for (const m of body.matchAll(/<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/g)) {
    const [, close, tag, attrs, self] = m;
    if (['br', 'img', 'input', 'meta', 'link', 'hr', 'source'].includes(tag.toLowerCase()) || self) continue;
    if (close) {
      depth--;
      continue;
    }
    if (depth === 1) {
      const id = /\bid="([^"]+)"/.exec(attrs)?.[1];
      if (id) ids.push(id);
    }
    if (tag.toLowerCase() !== 'script' && tag.toLowerCase() !== 'style') depth++;
  }
  assert.ok(ids.includes('result') && ids.includes('settings'), `the page's layers were read: ${ids.join(', ')}`);
  const known = BACK_LAYERS.map((l) => l.sel);
  for (const id of ids) {
    if (NOT_A_LAYER[id]) continue;
    assert.ok(known.some((s) => s.startsWith(`#${id}`)), `#${id} is a layer of the page's own that Back does not know: add it to BACK_LAYERS, or to NOT_A_LAYER with why`);
  }
});

test('every ornate menu is one Back closes, whatever builds it', () => {
  // (the standard menu is one entry: its veil, its footer's way out, and its own close when it has none)
  const om = BACK_LAYERS.find((l) => l.sel === '.omVeil');
  assert.ok(om && om.kind === 'overlay' && om.act?.includes('.omFoot .omBack'));
  const src = readFileSync('src/ornateMenu.ts', 'utf8');
  assert.match(src, /root\.addEventListener\('omclose', close\)/, 'the veil closes on its omclose event, which Back sends when it has no way out');
});
