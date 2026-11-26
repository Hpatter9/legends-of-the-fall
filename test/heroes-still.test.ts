// HEROES-STILL (docs/notes/heroes-still.md): the Heroes tab's screens hold still (the owner: "The heroes overview screens don't need a
// moving animation behind the art. It slows the game down when scrolling there."). The tavern's light layer is made still, and the CSS
// that stops the tavern's room, the roster's and Hall's card motes, a hero page's halo, motes and atmosphere is last in the cascade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the tavern\'s light layer is painted at rest and never joins the moving loop', () => {
  const src = readFileSync('src/paintedTavern.ts', 'utf8');
  assert.match(src, /new AmbientLayer\(SCENE_LIFE\.tavern, backdrop\.src, \{ fit: 'fill' \}, 'ptLife', true\)/);
  const layer = readFileSync('src/render/ambientLayer.ts', 'utf8');
  assert.match(layer, /this\.showing = !this\.still && /, 'a still layer is never counted as showing, so the loop never paints it');
});

test('every moving background on the Heroes screens is stopped by a rule loaded after the rules that start it', () => {
  const alive = readFileSync('src/alive.css', 'utf8');
  const block = alive.slice(alive.indexOf('HEROES-STILL'));
  for (const sel of ['.ptTavern .ptScene *', '.heroRoster .hcard .heroCardMotes', '.heroDetail .hpic .heroCardHalo', '.heroDetail .hpic .heroCardMotes', '.dossierAtmosphere::before', '.dossierAtmosphere::after'])
    assert.ok(block.includes(sel), sel);
  assert.match(block, /animation: none !important/);
  // (alive.css comes after keepKingdom.css and paintedTavern.css in the page's styles, where the animations are set)
  const build = readFileSync('build.mjs', 'utf8');
  const at = (f: string) => build.indexOf(`src/${f}`);
  assert.ok(at('alive.css') > at('keepKingdom.css') && at('alive.css') > at('paintedTavern.css'));
});
