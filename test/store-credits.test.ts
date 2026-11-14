// STORE-CREDITS (docs/notes/store-credits.md): the in-app Credits page is CREDITS.md, entry for entry, with each licence named.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import creditsMd from '../CREDITS.md' with { type: 'text' };
import { creditLicences, creditSections, licencesOf, plainText } from '../src/creditsRules';

const md = readFileSync('CREDITS.md', 'utf8');
const sections = creditSections(creditsMd);
const shown = sections.flatMap((s) => s.entries.flatMap((e) => e.lines)).join('\n');

test('the page is made from the file as it is now (the bundle takes CREDITS.md at build time)', () => {
  assert.equal(creditsMd, md);
});

test('every entry of CREDITS.md is on the page: each bullet, sub-bullet and paragraph, word for word', () => {
  // (each top-level bullet or paragraph of the file, with its continuation lines, read independently of the page's parser)
  const blocks: string[] = [];
  let cur = '';
  const flush = () => {
    if (cur.trim()) blocks.push(cur);
    cur = '';
  };
  for (const line of md.split('\n')) {
    if (!line.trim() || /^#/.test(line)) flush();
    else if (/^\s*- /.test(line)) {
      flush();
      cur = line.replace(/^\s*- /, '');
    } else cur += ` ${line.trim()}`;
  }
  flush();
  assert.ok(blocks.length > 200, `${blocks.length} entries read`);
  for (const b of blocks) assert.ok(shown.includes(plainText(b)), `missing from the page: ${plainText(b).slice(0, 100)}`);
});

test('every heading of the file is a section of the page', () => {
  const heads = [...md.matchAll(/^#{2,6}\s+(.*)$/gm)].map((m) => plainText(m[1]));
  const titles = sections.map((s) => s.title);
  for (const h of heads) assert.ok(titles.includes(h), h);
});

test('each licence asking for credit is named on its entry', () => {
  assert.deepEqual(licencesOf('Matthew Pablo (CC-BY 3.0)'), [{ name: 'CC-BY 3.0', credit: true }]);
  assert.deepEqual(licencesOf('LPC layers; CC-BY-SA 3.0 / GPL 3.0').map((l) => l.name), ['CC-BY-SA 3.0', 'GPL 3.0']);
  assert.deepEqual(licencesOf('all under the SIL Open Font Licence 1.1').map((l) => l.name), ['SIL Open Font Licence 1.1']);
  assert.deepEqual(licencesOf('by nene (OpenGameArt.org, CC0 Public Domain)'), [{ name: 'CC0', credit: false }]);
  // (in the file: the music, DawnLike, the LPC sprite and the fonts)
  const names = creditLicences(sections);
  for (const n of ['CC-BY 3.0', 'CC-BY 4.0', 'CC-BY-SA 3.0', 'SIL Open Font Licence 1.1']) assert.ok(names.includes(n), n);
  const pablo = sections.flatMap((s) => s.entries).filter((e) => e.lines.join(' ').includes('Blackmoor Colossus'));
  assert.ok(pablo.length && pablo.every((e) => e.licences.some((l) => l.name === 'CC-BY 3.0' && l.credit)));
});

test('the assets whose licence the owner has not confirmed are marked so, on the page too', () => {
  const marked = sections.flatMap((s) => s.entries).filter((e) => e.licences.some((l) => l.unconfirmed));
  const text = marked.map((e) => e.lines.join(' ')).join('\n');
  for (const what of ['combatAudioBank', 'golem_stone', 'cls_treant', 'goats.png', 'wolfdog.png']) assert.ok(text.includes(what), what);
});
