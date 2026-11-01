import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// HERO-SHEET-GLITCH (docs/notes/hero-sheet-glitch.md): a hero's sheet opened on the party screen came up with its tabs but an empty
// page under them, the art cut off and the board's sprites through it. The phone ran out of graphics memory: once the party screen
// had taken over from the home screen, the home was `hidden`, so the rule that keeps the fight's sky, board and bench from being
// drawn under the home let go, and they were all drawn again under the opaque party screen; and under the sheet's see-through
// backdrop the party's own page was still drawn, its cards each a layer of their own. These rules keep both from being drawn.

const css = readFileSync('src/pixel.css', 'utf8');
/** The screens a rule hides, as the list inside `> :is(...)` after the given condition. */
const hiddenUnder = (cond: string): string[] => {
  const at = css.indexOf(`body:has(> ${cond}) > :is(`);
  assert.ok(at >= 0, `no rule hides the game's screens under ${cond}`);
  const open = css.indexOf(':is(', at) + 4;
  return css.slice(open, css.indexOf(')', open)).split(',').map((s) => s.trim()).sort();
};

test('the game\'s own screens are not drawn under the party screen, as under the home screen', () => {
  const home = hiddenUnder('#home:not([hidden])');
  const party = hiddenUnder('#party:not([hidden])');
  assert.deepEqual(party, home);
  for (const id of ['#sky', '#stage', '#panel', '#top']) assert.ok(party.includes(id), `${id} is drawn under the party screen`);
  // (the rule covers the screens and everything in them: a child that sets its own visibility would otherwise show)
  assert.match(css, /body:has\(> #party:not\(\[hidden\]\)\) > :is\([^)]*\) \* \{ visibility: hidden !important; \}/);
});

test('the party screen\'s own page is not drawn under a hero\'s sheet opened on it', () => {
  assert.match(css, /#party:has\(> #ptSheet:not\(\[hidden\]\)\) > :not\(#ptSheet\),\s*#party:has\(> #ptSheet:not\(\[hidden\]\)\) > :not\(#ptSheet\) \* \{ visibility: hidden !important; \}/);
  // (the sheet is a child of the party screen, so the rule finds it)
  const html = readFileSync('src/index.html', 'utf8');
  const party = html.slice(html.indexOf('<div id="party"'), html.indexOf('<div id="settings"'));
  assert.match(party, /<div id="ptSheet" hidden><div id="ptSheetBox"><\/div><\/div>\s*<\/div>\s*$/);
});
