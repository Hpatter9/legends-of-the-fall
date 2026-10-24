import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// The owner's rule: no flashing. Nothing loops a change of brightness (opacity, filter, glow); the one-shot flashes are short.
const css = ['src/index.html', ...readdirSync('src').filter((f) => f.endsWith('.css')).map((f) => `src/${f}`)];

/** Every `@keyframes name { ... }` body in a stylesheet, by name. */
function keyframes(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    let depth = 1;
    let i = m.index! + m[0].length;
    const from = i;
    while (depth > 0 && i < text.length) depth += text[i] === '{' ? 1 : text[i] === '}' ? -1 : 0, i++;
    out.set(m[1], text.slice(from, i - 1));
  }
  return out;
}

test('no looping css animation changes brightness (opacity, filter, shadows, colour)', () => {
  const bright = /opacity|filter|brightness|box-shadow|text-shadow|color|background(?!-position)/;
  const bad: string[] = [];
  for (const f of css) {
    const text = readFileSync(f, 'utf8');
    const frames = keyframes(text);
    for (const m of text.matchAll(/animation(?:-name)?\s*:([^;}]*)/g)) {
      if (!/\binfinite\b/.test(m[1])) continue;
      for (const [name, body] of frames) if (new RegExp(`\\b${name}\\b`).test(m[1]) && bright.test(body)) bad.push(`${f}: ${name}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('the lights are steady: no sine on a canvas light level', () => {
  const lights = ['src/camp.ts', 'src/tavern.ts', 'src/castle.ts', 'src/hall.ts'];
  for (const f of lights) {
    const lines = readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => assert.ok(!(/globalAlpha\s*=/.test(l) && /Math\.sin/.test(l)), `${f}:${i + 1} varies a light with a sine`));
  }
});
