// ARMY-WEAKNESS's words and marks on the page (docs/notes/army-weakness.md): the War Room's "Weak to" and "Resists", the deploy screen's chip
// for the army faced and its heroes' arrows, a blow's "Weak!" or "Resisted", the hero lists' flags and the codex's line. Pure: no DOM, no Pixi.

import { armyById } from './sim/armies';
import { ARMY_MATCH, ARMY_WEAKNESS, matchOf, RESIST_MULT, WEAK_MULT, type Match } from './sim/armyWeakness';
import { TRAITS } from './sim/traits';

export interface ClassTag {
  id: string;
  name: string;
}

const tag = (id: string): ClassTag => ({ id, name: TRAITS[id]?.name ?? id });

/** An army's weaknesses and resistances as the card shows them (none while the rule is off, or for no army). */
export function armyTags(army: string | undefined): { weak: ClassTag[]; resist: ClassTag[]; why: string } | undefined {
  const m = army && ARMY_WEAKNESS.on ? ARMY_MATCH[army] : undefined;
  if (!m) return undefined;
  return { weak: m.weak.map(tag), resist: m.resist.map(tag), why: m.why };
}

/** The share each makes, in words for the card (from `WEAK_MULT` and `RESIST_MULT`). */
export const WEAK_WORDS = `Their foes take ${Math.round((WEAK_MULT - 1) * 100)}% more harm from these heroes`;
export const RESIST_WORDS = `and ${Math.round((1 - RESIST_MULT) * 100)}% less from these`;

/** A hero's arrow against an army: up for a weakness it hits, down for a resistance, none else. */
export const arrowOf = (army: string | undefined, kind: string): '▲' | '▼' | '' => {
  if (!ARMY_WEAKNESS.on) return '';
  const m = matchOf(army, kind);
  return m === 'weak' ? '▲' : m === 'resist' ? '▼' : '';
};

/** The deploy chip for the army faced: its head ("vs Golem Forge ▲2 ▼1": the placed heroes on its weaknesses and on its resistances) and its
 *  line (each placed hero that counts, marked). */
export function deployChip(army: string | undefined, placed: readonly string[], name: (k: string) => string): { head: string; line: string; up: number; down: number } | undefined {
  const t = armyTags(army);
  if (!t || !army) return undefined;
  const up = placed.filter((k) => matchOf(army, k) === 'weak');
  const down = placed.filter((k) => matchOf(army, k) === 'resist');
  const head = `vs ${armyById(army)?.name ?? army}${up.length ? ` ▲${up.length}` : ''}${down.length ? ` ▼${down.length}` : ''}`;
  const marked = [...up.map((k) => `${name(k)} ▲`), ...down.map((k) => `${name(k)} ▼`)];
  const line = marked.length ? marked.join(' · ') : `Weak to ${t.weak.map((c) => c.name).join(' and ')}`;
  return { head, line, up: up.length, down: down.length };
}

/** The least time between two labels over the same foe (battle ms). */
export const MATCH_LABEL_MS = 900;

/** A blow's label over its number: "Weak!" on a weakness, "Resisted" on a resistance; and its colour. */
export function hitLabel(match: Match | undefined): { text: string; colour: number } | undefined {
  if (match === 'weak') return { text: 'Weak!', colour: 0x7dff6a };
  if (match === 'resist') return { text: 'Resisted', colour: 0x9aa4b2 };
  return undefined;
}

/** A hero list's flag for the army faced: "Strong vs Golems" on a weakness it hits (resistances are not flagged there: the lists invite). */
export function strongFlag(army: string | undefined, kind: string): string | undefined {
  if (!ARMY_WEAKNESS.on || !army || matchOf(army, kind) !== 'weak') return undefined;
  return `Strong vs ${shortArmy(army)}`;
}

/** An army's short name for a flag ("Golems", "Undead"). */
export const shortArmy = (army: string): string =>
  ({ orcs: 'Orcs', undead: 'Undead', beasts: 'Beasts', wildwood: 'Wildwood', labyrinth: 'Labyrinth', ogres: 'Ogres', infernal: 'Infernal', yokai: 'Yokai', golems: 'Golems' })[army] ??
  armyById(army)?.name ??
  army;

/** The army the lists look to: an army run in progress, else the furthest army opened (where the War Room opens). */
export function facedArmy(running: string | undefined, opened: readonly string[]): string | undefined {
  return running ?? opened[opened.length - 1];
}

/** The codex's line for an army ("Weak to Caster and Gunner; resists Blade and Marksman. Fire and blasting powder crack the stone..."). */
export function codexLine(army: string): string | undefined {
  const t = armyTags(army);
  if (!t) return undefined;
  return `Weak to ${t.weak.map((c) => c.name).join(' and ')}; resists ${t.resist.map((c) => c.name).join(' and ')}. ${t.why}`;
}

/** Auto place's and the suggester's reason, for the page's hint ("Picked for the Golem Forge: Wizard, Bombardier"). */
export function pickedFor(army: string | undefined, kinds: readonly string[], name: (k: string) => string): string | undefined {
  if (!ARMY_WEAKNESS.on || !army) return undefined;
  const up = kinds.filter((k) => matchOf(army, k) === 'weak');
  return up.length ? `Picked for ${theArmy(army)}: ${up.map(name).join(', ')}` : undefined;
}

/** An army's name after "for" or "against" ("the Golem Forge", "the Wildwood"). */
export function theArmy(army: string): string {
  const n = armyById(army)?.name ?? army;
  return n.startsWith('The ') ? `the ${n.slice(4)}` : `the ${n}`;
}
