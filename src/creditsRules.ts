// STORE-CREDITS (docs/notes/store-credits.md): the in-app Credits page's words, read from CREDITS.md itself, so the page and the file
// cannot drift apart. Pure: no DOM, no Pixi. `credits.ts` draws what this returns; `test/store-credits.test.ts` checks that every entry of
// the file is on the page.

/** A licence named in an entry, and whether it asks for the work's credit to be shown. */
export interface Licence {
  name: string;
  /** CC-BY, CC-BY-SA, GPL and the font licence ask for credit (or the licence's notice) where players can see it. */
  credit: boolean;
  /** The owner has not yet confirmed the licence (CREDITS.md says "licence unconfirmed"). */
  unconfirmed?: boolean;
}

/** One entry of the file: a bullet (with any bullets under it), or a paragraph. */
export interface CreditEntry {
  /** The lines as the page shows them: the first is the entry, the rest the bullets under it. Markdown's marks are taken out. */
  lines: string[];
  licences: Licence[];
}

/** One heading of the file and the entries under it. */
export interface CreditSection {
  title: string;
  entries: CreditEntry[];
}

/** The title of the entries before the file's first `##` heading. */
export const FIRST_SECTION = 'Art, music and sound';

/** Markdown's marks out of a line: bold, italics, code, links (kept as "text (address)"). */
export function plainText(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The licences an entry names, each once, in a fixed order. */
export function licencesOf(text: string): Licence[] {
  const out: Licence[] = [];
  const add = (l: Licence) => out.some((o) => o.name === l.name) || out.push(l);
  if (/licen[cs]e unconfirmed/i.test(text)) add({ name: 'Licence unconfirmed', credit: false, unconfirmed: true });
  for (const m of text.matchAll(/CC[- ]BY[- ]SA\s*(\d(?:\.\d)?)/gi)) add({ name: `CC-BY-SA ${m[1]}`, credit: true });
  for (const m of text.matchAll(/CC[- ]BY(?![- ]SA)\s*(\d(?:\.\d)?)/gi)) add({ name: `CC-BY ${m[1]}`, credit: true });
  for (const m of text.matchAll(/\bGPL\s*(\d(?:\.\d)?)/g)) add({ name: `GPL ${m[1]}`, credit: true });
  if (/SIL Open Font Licen[cs]e/i.test(text)) add({ name: 'SIL Open Font Licence 1.1', credit: true });
  if (/\bCC0\b/.test(text)) add({ name: 'CC0', credit: false });
  if (/craftpix[^.]*free licen[cs]e|free licen[cs]e[^.]*craftpix/i.test(text)) add({ name: 'Craftpix free licence', credit: false });
  return out;
}

/** The file read into sections and entries. Every bullet and paragraph becomes one entry; a heading starts a section. */
export function creditSections(md: string): CreditSection[] {
  const sections: CreditSection[] = [{ title: FIRST_SECTION, entries: [] }];
  // (an entry's raw lines: its first, then each bullet under it, each with its own continuation lines)
  let open: string[] | null = null;
  const close = () => {
    if (!open) return;
    const lines = open.map(plainText).filter((l) => l);
    if (lines.length) sections[sections.length - 1].entries.push({ lines, licences: licencesOf(lines.join(' ')) });
    open = null;
  };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      close();
      continue;
    }
    const head = /^(#{1,6})\s+(.*)$/.exec(line);
    if (head) {
      close();
      if (head[1].length === 1) continue; // (the file's own title, "Credits")
      sections.push({ title: plainText(head[2]), entries: [] });
      continue;
    }
    if (/^- /.test(line)) {
      close();
      open = [line.slice(2)];
    } else if (/^\s+- /.test(line) && open) {
      open.push(line.replace(/^\s+- /, ''));
    } else if (open) {
      open[open.length - 1] += ` ${line.trim()}`;
    } else {
      open = [line.trim()];
    }
  }
  close();
  return sections.filter((s) => s.entries.length);
}

/** Every licence asking for credit, each once, for the page's opening note. */
export function creditLicences(sections: readonly CreditSection[]): string[] {
  const names = new Set<string>();
  for (const s of sections) for (const e of s.entries) for (const l of e.licences) if (l.credit) names.add(l.name);
  return [...names].sort();
}
