// STORE-CREDITS (docs/notes/store-credits.md): what the Credits page must cover, read from CREDITS.md. Pure: no DOM, no Pixi.
// The page itself is the player-facing list in `data/credits.ts`; `test/store-credits.test.ts` uses these to check that every
// third-party creator, pack and licence the developers' record names is on it.

/** Markdown's marks out of a text: code spans (file paths) dropped, bold and italics taken off, links kept as their words. */
export function plainText(md: string): string {
  return md
    .replace(/`[^`]*`/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The licences a text names, each once, in a fixed order. */
export function licencesOf(text: string): string[] {
  const out = new Set<string>();
  if (/licen[cs]e unconfirmed/i.test(text)) out.add('licence unconfirmed');
  for (const m of text.matchAll(/CC[- ]BY[- ]SA\s*(\d(?:\.\d)?)/gi)) out.add(`CC-BY-SA ${m[1]}`);
  for (const m of text.matchAll(/CC[- ]BY(?![- ]SA)\s*(\d(?:\.\d)?)/gi)) out.add(`CC-BY ${m[1]}`);
  for (const m of text.matchAll(/\bGPL\s*(\d(?:\.\d)?)/g)) out.add(`GPL ${m[1]}`);
  if (/SIL Open Font\s+Licen[cs]e/i.test(text)) out.add('SIL Open Font Licence 1.1');
  if (/\bCC0\b/.test(text)) out.add('CC0');
  if (/craftpix[^.]*free licen[cs]e/i.test(text)) out.add('Craftpix free licence');
  return [...out];
}

/** The third-party names the record gives, each once: packs in bold or named "Free ..." (as Craftpix's are), each author after "by",
 *  and a work in bold with its author in brackets ("**Pixelify Sans** (Stefie Justprince; ..."). */
export function creditNames(md: string): string[] {
  const flat = md.replace(/`[^`]*`/g, ' ').replace(/\s+/g, ' ');
  const out = new Set<string>();
  const add = (s: string) => out.add(s.trim().replace(/[.,:;]+$/, '').replace(/['’]s$/, ''));
  for (const m of flat.matchAll(/\*\*([^*]+)\*\*/g)) {
    const t = m[1].trim();
    if (/^(Free|Fantasy|Super|5000|Universal|Golems|Himeko|PVFX|DawnLike|Pixel Champions|Craftpix|Tiny)\b/.test(t) || /(Pack|Tileset|Sheets|Backgrounds|Icons|Gigapack|Spritesheet|Foundry|share|Objects|Sprites)$/.test(t)) add(t);
  }
  for (const m of flat.matchAll(/\bFree(?: [A-Z0-9][\w'&-]*)+/g)) add(m[0]);
  for (const m of flat.matchAll(/\bby \**([A-Z@][\w.@'-]*(?: [A-Z][\w.'-]+)*)/g)) add(m[1]);
  for (const m of flat.matchAll(/\*\*([^*]+)\*\* \(([A-Z][^;(),]*);/g)) {
    add(m[1]);
    add(m[2]);
  }
  return [...out].filter((s) => s.length > 1);
}

const STOP = new Set(['free', 'the', 'and', 'of', 'for', 'a', 'an', 'by', 'to', 'in', 'on']);

/** A name's words as the coverage check compares them: lower case, no punctuation, without the small words. */
export function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .split(/[^a-z0-9#]+/)
    .filter((w) => w && !STOP.has(w));
}

/** Is a name covered by an entry's text: every word of the name among the entry's words? */
export function covers(entryText: string, name: string): boolean {
  const have = new Set(wordsOf(entryText));
  const need = wordsOf(name);
  return need.length > 0 && need.every((w) => have.has(w));
}
