// BATTLE-PICK-FIX (docs/notes/battle-pick-fix.md): no stylesheet has a declaration left outside a rule. The Council's place on the Battle
// tab lost the first line of one of its rules, so its declarations stood bare; the browser read them, with the next rule's selector, as one
// broken selector and dropped both, and the Council's label sat under its medallion for as long as the file has had it. This reads every
// stylesheet the page is built from (src/*.css and the page's own <style>) and fails on any declaration (a "name: value;") outside a rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** The places in a stylesheet where text stands outside any rule: each a line number and the text, before a `{` or a `}`. */
export function orphans(css: string): { line: number; text: string }[] {
  // (comments and strings out, newlines kept, so the line numbers stay true)
  const blank = (s: string) => s.replace(/[^\n]/g, ' ');
  const src = css.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, blank);
  const out: { line: number; text: string }[] = [];
  // (each open block: true where it holds rules (the sheet itself, @media, @supports, @layer, @container, @document), false where it
  // holds declarations)
  const stack: boolean[] = [true];
  let from = 0;
  const lineAt = (i: number) => src.slice(0, i).split('\n').length;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c !== '{' && c !== '}' && c !== ';') continue;
    const text = src.slice(from, i).trim();
    const holdsRules = stack[stack.length - 1];
    if (c === ';') {
      // (in a rule's own block a ";" ends a declaration; among rules only an at-statement may end with one: @import, @charset, @layer a, b;)
      if (holdsRules && text && !text.startsWith('@')) out.push({ line: lineAt(from + src.slice(from).search(/\S/)), text: text.slice(0, 80) });
      from = i + 1;
      continue;
    }
    if (c === '{') {
      // (a selector holding a declaration's "name: value" with a ";" before it is the case above; here, a nested block opens)
      stack.push(holdsRules ? /^@(media|supports|layer|container|document)\b/.test(text) : false);
    } else {
      // (a "}" closing a block of rules with text still standing before it: a declaration with no rule)
      if (holdsRules && text && stack.length > 1) out.push({ line: lineAt(from + src.slice(from).search(/\S/)), text: text.slice(0, 80) });
      stack.pop();
      if (!stack.length) stack.push(true);
    }
    from = i + 1;
  }
  return out;
}

test('the check finds a rule that has lost its selector line, and passes a whole sheet', () => {
  const whole = '.a { color: red; }\n@media (max-width: 400px) { .b { top: 0; } }\n.c:hover:not(:disabled) { border: 0 }\n';
  assert.deepEqual(orphans(whole), []);
  const broken = '.a:hover { color: red; }\n  border: 1px solid #b58fcb; background: none; }\n.b { position: static; }\n';
  const found = orphans(broken);
  assert.ok(found.length > 0, 'the lost line is found');
  assert.equal(found[0].line, 2);
  assert.match(found[0].text, /^border: 1px solid/);
  assert.deepEqual(orphans('@import url(x.css);\n/* a comment; with a ; */ .a { content: "a;b{"; }\n'), []);
});

test('no stylesheet of the page has a declaration outside a rule', () => {
  const sheets: [string, string][] = readdirSync('src').filter((f) => f.endsWith('.css')).map((f) => [f, readFileSync(join('src', f), 'utf8')]);
  const html = readFileSync('src/index.html', 'utf8');
  for (const [, body] of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) sheets.push(['index.html <style>', body]);
  const bad = sheets.flatMap(([name, css]) => orphans(css).map((o) => `${name}:${o.line}: ${o.text}`));
  assert.deepEqual(bad, []);
});
