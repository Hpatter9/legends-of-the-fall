// When a cinematic comes up, and who plays it (`sceneScripts.ts` holds the scripts; docs/notes/cinematics.md). A scene
// plays once at its moment: it is marked seen as it begins (skipped or not, a closed page does not bring it back), and
// the Scenes list in the codex can play a seen one again. Seen scenes are kept on the meta as `scenes` (optional: a
// save from before has none, and one that had already picked its heroes counts the opening as seen, so no old save is
// greeted with a new save's opening). Pure rules: no Pixi, no DOM.

import type { Meta } from './meta';
import { momentKey, SCENES, SCENE_ORDER, type CastMember, type Moment, type Scene } from './sceneScripts';
import { FAMILY_NAMES } from './sceneFamilies';
import { modeOpen } from './modeUnlock';
import { UNITS } from './units';

/** The scenes seen, from what was saved: only known ids, each once. A save with no list that has picked its heroes has seen the opening. */
export function readScenes(raw: unknown, picked: boolean): string[] {
  if (!Array.isArray(raw)) return picked ? ['opening'] : [];
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && !!SCENES[id]))];
}

export const seenScene = (m: Meta, id: string): boolean => !!m.scenes?.includes(id);

/** Mark a scene seen (it stays so). */
export function markSeen(m: Meta, id: string): void {
  if (SCENES[id] && !seenScene(m, id)) (m.scenes ??= []).push(id);
}

/** The scene waiting at a moment: one the save has not seen, or one that plays every time (the short Last Oath). A scene of the
 *  Calamity's story waits until the Calamity has opened. */
export function dueScene(m: Meta, moment: Moment): string | null {
  const key = momentKey(moment);
  for (const id of SCENE_ORDER) {
    const s = SCENES[id];
    if (s.calamity && !modeOpen(m, 'calamity')) continue;
    if (momentKey(s.moment) === key && (s.again || !seenScene(m, id))) return id;
  }
  return null;
}

/** The moments a fight lost brings: the first-loss scene only on a real, final defeat (no heart left, or a mode with none), never
 *  on a fall a heart then revives (`fallOutcome` in `run.ts`). */
export const lossMoments = (outcome: 'heart' | 'end'): Moment[] => (outcome === 'end' ? [{ kind: 'firstLoss' }] : []);

/* ------------------------------------------------------------ the boss's card */

/** The key of a boss's card (its slam-down ribbon as the fight begins): a named elite by its own id, a boss by its fighter. */
export const cardKey = (boss: string, elite?: string): string => (elite ? `elite:${elite}` : boss);

/** Whether a boss's card is still to be shown: once a save, the first time that boss is met (the heralds' and bosses' own
 *  introductions play once, as the scenes do; new runs, retries and new days do not bring it back). */
export const cardDue = (m: Meta, key: string): boolean => !m.bossCards?.includes(key);

/** Mark a boss's card shown. */
export function markCard(m: Meta, key: string): void {
  if (cardDue(m, key)) (m.bossCards ??= []).push(key);
}

/** The boss cards shown, from what was saved: strings, each once (a save from before has none). */
export function readCards(raw: unknown): string[] {
  return Array.isArray(raw) ? [...new Set(raw.filter((k): k is string => typeof k === 'string' && k.length > 0 && k.length < 80))] : [];
}

/** Who plays a scene: the player's party and the run's lead hero, and the fighters it names. */
export interface Players {
  party: readonly string[];
  /** The hero the Calamity run began with (the party's first when there is none). */
  lead?: string;
}

/** An actor as played: the fighter's id in `UNITS` and the name the lines call it; `kind` is null for the goat (no art yet) and for one the party cannot fill. */
export interface Cast {
  kind: string | null;
  name: string;
}

/** The kind of fighter a cast member is, or null when there is none to draw. */
export function kindOf(role: CastMember['role'], p: Players): string | null {
  if (role === 'duchess') return null;
  if (role === 'hero') return p.lead ?? p.party[0] ?? null;
  if (role.startsWith('unit:')) return UNITS[role.slice(5)] ? role.slice(5) : null;
  const i = Number(role.slice(6));
  return p.party[i] ?? null;
}

/** The whole cast of a scene by actor id. */
export function castOf(scene: Scene, p: Players): Record<string, Cast> {
  const out: Record<string, Cast> = {};
  for (const [id, m] of Object.entries(scene.cast)) {
    const kind = kindOf(m.role, p);
    out[id] = { kind, name: m.name ?? (kind ? UNITS[kind].name : m.role === 'duchess' ? 'Duchess' : id) };
  }
  return out;
}

/** The names the lines are filled with: each actor's own. */
export const namesOf = (cast: Record<string, Cast>): Record<string, string> => Object.fromEntries(Object.entries(cast).map(([id, c]) => [id, c.name]));

/** Where a scene comes up, for the Scenes list when it has not been seen. */
export function momentText(mo: Moment): string {
  switch (mo.kind) {
    case 'starter':
      return 'A new save, before its first heroes are picked.';
    case 'calOpen':
      return 'The Calamity opens.';
    case 'calBoss':
      return `The Calamity's map ${mo.map} boss, as the fight is set up.`;
    case 'calVictory':
      return "The Calamity's last herald falls.";
    case 'armyClear':
      return 'The first time an army is cleared.';
    case 'awaken':
      return 'A hero awakens.';
    case 'earned':
      return 'A hero earned in play, the moment it joins.';
    case 'combo':
      return 'A set of five fires its Last Oath for the first time.';
    case 'comboCut':
      return 'A set of five fires its Last Oath.';
    case 'firstLoss':
      return 'Your first defeat.';
    case 'duchessJoins':
      return 'Duchess joins a fight.';
    case 'castle':
      return 'A building of the castle is raised.';
    case 'spire':
      return `The Last Stand, at wave ${mo.floor}.`;
    case 'bossForm':
      return 'A boss changes form.';
    case 'mythic':
      return 'An army opened on Mythic.';
    case 'elite':
      return 'The first elite you meet.';
    case 'ascension':
      return 'The first Ascension.';
    case 'dailyBoss':
      return "The first daily's boss.";
    case 'questBattle':
      return 'A quest battle, before it begins and after it is won.';
  }
}

export interface SceneRow {
  id: string;
  title: string;
  text: string;
  seen: boolean;
  /** For a line that stands for the scenes of a family not yet seen: how many. */
  more?: number;
}

/** The scenes the list shows, in order: each seen one with Watch, each lone unseen one a mystery, and a family's unseen ones folded into one line saying how many are left. */
export function sceneList(m: Meta): SceneRow[] {
  const rows: SceneRow[] = [];
  const folded = new Map<string, SceneRow>();
  for (const id of SCENE_ORDER) {
    const s = SCENES[id];
    const seen = seenScene(m, id);
    if (seen) rows.push({ id, title: s.title, text: s.blurb, seen });
    else if (!s.family) rows.push({ id, title: '???', text: momentText(s.moment), seen });
    else {
      let row = folded.get(s.family);
      if (!row) {
        row = { id, title: '???', text: `${FAMILY_NAMES[s.family] ?? s.family}: ${momentText(s.moment)}`, seen: false, more: 0 };
        folded.set(s.family, row);
        rows.push(row);
      }
      row.more = (row.more ?? 0) + 1;
    }
  }
  return rows;
}
