// TACTIC-SIZE, TACTIC-ORB (docs/notes/tactic-size.md): the fight's tactic button is an orb the size of the Auto buttons beside it. The
// owner: "the tactic button is huge now for some reason in a wave", then "tactic button should be the size of the auto buttons next to
// it." Its size is set in the Auto buttons' own rule (one selector list, so the three cannot differ), and nothing else in the page's
// style sheets may size or scale it, so it cannot grow again by a rule added elsewhere. (`tools/tactic-size/shots.mjs` measures the
// same boxes in a real wave.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

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
const parts = (sel: string): string[] => sel.split(',').map((s) => s.trim());
/** The parts of a selector list that are the tactic button itself (not something inside it). */
const tactic = (sel: string): string[] => parts(sel).filter((s) => /(#tacticBtn|\.fhTactic)(?![\w-])(\.[\w-]+|\[[^\]]*\]|:[\w-]+(\([^)]*\))?)*$/.test(s));
/** Whether a selector list names the Auto buttons themselves. */
const autos = (sel: string): boolean => parts(sel).some((s) => /\.fhAuto(?![\w-])(:[\w-]+)?$/.test(s));

/** The rule that sizes the Auto buttons as they are drawn (the painted buttons' sheet). */
const sizeRule = sheets.find((s) => s.file === 'paintedButtons.css')!.rules.find((r) => autos(r.sel) && r.decls.width && r.decls.height);

test('the tactic orb is sized by the Auto buttons\' own rule: one selector list, so the three are always the same size', () => {
  assert.ok(sizeRule, 'src/paintedButtons.css has the rule that sizes .fhAuto');
  assert.ok(parts(sizeRule.sel).includes('#tacticDock #tacticBtn'), `the Auto buttons' size rule names the tactic button too: ${sizeRule.sel}`);
  // (a round orb, a thumb's size)
  assert.equal(sizeRule.decls.width, '48px');
  assert.equal(sizeRule.decls.height, '48px');
  assert.equal(sizeRule.decls['border-radius'], '50%');
  assert.equal(sizeRule.decls.padding, '0');
  // (its small label is the Auto buttons' label: the same rule gives both their lettering)
  const label = sheets.flatMap((s) => s.rules).find((r) => parts(r.sel).includes('.fhAuto em'));
  assert.ok(label && parts(label.sel).includes('#tacticBtn em'), 'the label under the tactic orb shares the Auto buttons\' label rule');
});

test('no other rule in any style sheet sizes or scales the tactic button', () => {
  const found: string[] = [];
  for (const s of sheets)
    for (const r of s.rules) {
      const hit = tactic(r.sel);
      if (!hit.length || r === sizeRule) continue;
      for (const [k, v] of Object.entries(r.decls)) {
        if (!SIZING.test(k)) continue;
        // (the press: the same small squeeze as the Auto buttons, in the rule they share)
        if (k === 'transform' && autos(r.sel)) continue;
        found.push(`${s.file}: ${hit.join(', ')} { ${k}: ${v} }`);
      }
    }
  assert.deepEqual(found, []);
});

test('nothing above the tactic button in the page is scaled: the dock, a child of the body, has no transform, zoom or scale of its own', () => {
  for (const s of sheets)
    for (const r of s.rules) {
      if (!/#tacticDock(?![\w-])[^,\s>+~]*$/.test(parts(r.sel).pop()!)) continue;
      for (const k of ['transform', 'zoom', 'scale']) assert.equal(r.decls[k], undefined, `${s.file}: ${r.sel} { ${k} }`);
    }
});
