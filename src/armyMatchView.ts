// ARMY-WEAKNESS's block on the page (docs/notes/army-weakness.md): an army's "Weak to" and "Resists" rows with the classes' sigils, and why;
// the War Room's card and the deploy chip's card show it. The words are `armyWeaknessRules.ts`'s.

import { armyTags, facedArmy, MATCH_WORDS, RESIST_WORDS, strongFlag, WEAK_WORDS } from './armyWeaknessRules';
import { ARMIES, armyUnlocked } from './sim/armies';
import type { Meta } from './sim/meta';
import { loadRun } from './sim/run';
import { menuFoot, menuNote, menuSection, menuWell, ornateMenu } from './ornateMenu';
import { matchOf } from './sim/armyWeakness';
import { classSigil } from './classSigil';

/** The block for an army, or undefined while the rule is off. `why`: the army's line under the rows. */
export function matchBlock(army: string, why = true): HTMLElement | undefined {
  const t = armyTags(army);
  if (!t) return undefined;
  const box = document.createElement('div');
  box.className = 'asMatch';
  box.dataset.army = army;
  const row = (label: string, cls: string, tags: { id: string; name: string }[], title: string): HTMLElement => {
    const r = document.createElement('div');
    r.className = `asMatchRow ${cls}`;
    r.title = title;
    const l = document.createElement('span');
    l.className = 'asMatchLabel';
    l.textContent = label;
    r.append(l);
    for (const c of tags) {
      const chip = document.createElement('span');
      chip.className = 'asMatchClass';
      chip.dataset.trait = c.id;
      chip.append(classSigil(c.id, 20), document.createTextNode(c.name));
      r.append(chip);
    }
    return r;
  };
  box.append(row('Weak to', 'weak', t.weak, WEAK_WORDS), row('Resists', 'resist', t.resist, RESIST_WORDS));
  if (why) {
    const p = document.createElement('p');
    p.className = 'asMatchWhy';
    p.textContent = t.why;
    box.append(p);
  }
  return box;
}

/** The deploy chip's card: the army's block and the heroes placed that hit a weakness or a resistance (a standard card, "Close"). */
export function openArmyMatchCard(army: string, placed: readonly string[], name: (k: string) => string, armyName: string): void {
  const menu = ornateMenu({ id: 'armyMatchCard', eyebrow: 'The army you face', title: armyName, sub: MATCH_WORDS, asked: true });
  const grid = menuSection(menu.body, 'Weaknesses and resistances', undefined, 2);
  const sec = grid.parentElement!;
  grid.remove();
  const well = menuWell(sec);
  const block = matchBlock(army);
  if (block) well.append(block);
  const up = placed.filter((k) => matchOf(army, k) === 'weak');
  const down = placed.filter((k) => matchOf(army, k) === 'resist');
  const g2 = menuSection(menu.body, 'Your heroes on the field', undefined, 2);
  const sec2 = g2.parentElement!;
  g2.remove();
  menuNote(sec2, up.length || down.length ? [...up.map((k) => `▲ ${name(k)} hits a weakness`), ...down.map((k) => `▼ ${name(k)} is resisted`)].join(' · ') : 'None of the heroes placed hits a weakness or a resistance.');
  menuFoot(menu, { back: { word: 'close' } });
}

/** The army the lists look to: the army run in progress, else the furthest army opened (`facedArmy`). */
export function facedNow(m: Meta): string | undefined {
  let running: string | undefined;
  try {
    const r = loadRun();
    running = r && !r.over && r.mode?.kind === 'army' ? r.mode.army : undefined;
  } catch {
    running = undefined;
  }
  return facedArmy(running, ARMIES.filter((a) => armyUnlocked(m, a.id)).map((a) => a.id));
}

/** A hero list's flag: "Strong vs Golems" over a hero that hits the army faced's weakness, if it does. */
export function strongTag(army: string | undefined, kind: string): HTMLElement | undefined {
  const text = strongFlag(army, kind);
  if (!text) return undefined;
  const t = document.createElement('small');
  t.className = 'strongTag';
  t.textContent = `▲ ${text}`;
  return t;
}
