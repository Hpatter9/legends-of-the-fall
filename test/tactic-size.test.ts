// TACTIC-SIZE (docs/notes/tactic-size.md): the fight's tactic plaque keeps one fixed, compact size. The owner: "the tactic button is huge
// now for some reason in a wave". Its size is set in one rule of src/tactics.css and nothing else in the page's style sheets may size or
// scale it, so it cannot grow again by a rule added elsewhere. (`tools/tactic-size/shots.mjs` measures the same in a real wave.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

/** The plaque's size, px. */
const W = 92;
const H = 44;
/** The declarations that size or scale a box. */
const SIZING = /^(width|height|min-width|min-height|max-width|max-height|zoom|scale|transform|font-size|padding|flex|flex-grow|flex-basis|aspect-ratio)$/;

/** Every rule of a style sheet as its selector and its declarations (comments taken out; one level of @media or @supports opened). */
function rules(css: string): { sel: string; decls: Record<string, string> }[] {
  const out: { sel: string; decls: Record<string, string> }[] = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const sel = m[1].replace(/^[^{]*@[^{]*\{/, '').trim();
    const decls: Record<string, string> = {};
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    }
    out.push({ sel, decls });
  }
  return out;
}

const sheets = readdirSync('src').filter((f) => f.endsWith('.css')).map((f) => ({ file: f, rules: rules(readFileSync(`src/${f}`, 'utf8')) }));
/** The parts of a selector list that are the plaque itself (not something inside it). */
const plaque = (sel: string): string[] => sel.split(',').map((s) => s.trim()).filter((s) => /(#tacticBtn|\.fhTactic)(?![\w-])(\[[^\]]*\]|:[\w-]+(\([^)]*\))?)*$/.test(s));

test('the tactic plaque is 92 x 44 px, fixed: its own rule pins the width and the height, with nothing left to stretch it', () => {
  const own = sheets.find((s) => s.file === 'tactics.css')!.rules.find((r) => r.sel === '#tacticDock #tacticBtn');
  assert.ok(own, 'src/tactics.css has the rule #tacticDock #tacticBtn');
  const d = own.decls;
  assert.equal(d.width, `${W}px`);
  assert.equal(d.height, `${H}px`);
  assert.equal(d['max-width'], `${W}px`);
  assert.equal(d['max-height'], `${H}px`);
  assert.equal(d['min-width'], '0');
  assert.equal(d['min-height'], '0');
  assert.equal(d['box-sizing'], 'border-box');
  // (what is inside cannot push it out: one line, cut at its edge)
  assert.equal(d.overflow, 'hidden');
  assert.equal(d['white-space'], 'nowrap');
  // (a thumb's height, and smaller than the Formation button's 95 x 71 it once copied)
  assert.ok(H >= 44 && W * H < 95 * 71 * 0.65);
});

test('no other rule in any style sheet sizes or scales the tactic plaque', () => {
  const found: string[] = [];
  for (const s of sheets)
    for (const r of s.rules) {
      const hit = plaque(r.sel);
      if (!hit.length || (s.file === 'tactics.css' && r.sel === '#tacticDock #tacticBtn')) continue;
      for (const [k, v] of Object.entries(r.decls)) {
        if (!SIZING.test(k)) continue;
        // (a rule that the plaque shares with the deploy's buttons may ask for a least height no taller than the plaque: its own rule,
        // an id deeper, sets it to none anyway; a press may nudge it down a px)
        if (k === 'min-height' && parseFloat(v) <= H) continue;
        if (k === 'transform' && /^translateY\(1px\)$/.test(v)) continue;
        found.push(`${s.file}: ${hit.join(', ')} { ${k}: ${v} }`);
      }
    }
  assert.deepEqual(found, []);
});

test('nothing above the plaque in the page is scaled: the dock, a child of the body, has no transform, zoom or scale of its own', () => {
  for (const s of sheets)
    for (const r of s.rules) {
      if (!/#tacticDock(?![\w-])[^,\s>+~]*$/.test(r.sel.split(',').pop()!.trim())) continue;
      for (const k of ['transform', 'zoom', 'scale']) assert.equal(r.decls[k], undefined, `${s.file}: ${r.sel} { ${k} }`);
    }
});
