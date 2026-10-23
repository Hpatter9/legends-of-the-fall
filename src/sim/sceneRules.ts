// When a cinematic comes up, and who plays it (`sceneScripts.ts` holds the scripts; docs/notes/cinematics.md). A scene
// plays once at its moment: it is marked seen as it begins (skipped or not, a closed page does not bring it back), and
// the Scenes list in the codex can play a seen one again. Seen scenes are kept on the meta as `scenes` (optional: a
// save from before has none, and one that had already picked its heroes counts the opening as seen, so no old save is
// greeted with a new save's opening). Pure rules: no Pixi, no DOM.

import type { Meta } from './meta';
import { SCENES, SCENE_ORDER, type CastMember, type Moment, type Scene } from './sceneScripts';
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

const same = (a: Moment, b: Moment): boolean => a.kind === b.kind && (a.kind !== 'calBoss' || a.map === (b as { map: number }).map) && (a.kind !== 'earned' || a.hero === (b as { hero: string }).hero);

/** The scene waiting at a moment, if there is one the save has not seen. */
export function dueScene(m: Meta, moment: Moment): string | null {
  for (const id of SCENE_ORDER) {
    const s = SCENES[id];
    if (same(s.moment, moment) && !seenScene(m, id)) return id;
  }
  return null;
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
    out[id] = { kind, name: kind ? UNITS[kind].name : m.role === 'duchess' ? 'Duchess' : id };
  }
  return out;
}

/** The names the lines are filled with: each actor's own. */
export const namesOf = (cast: Record<string, Cast>): Record<string, string> => Object.fromEntries(Object.entries(cast).map(([id, c]) => [id, c.name]));

/** Where a scene comes up, for the Scenes list when it has not been seen. */
export const momentText = (m: Moment): string =>
  m.kind === 'starter' ? 'A new save, once its first heroes are picked.' : m.kind === 'calBoss' ? `The Calamity's map ${m.map} boss, as the fight is set up.` : m.kind === 'earned' ? 'A hero earned in play, the moment it joins.' : 'Every pull in the summoning hall.';

/** The scenes the list shows, in order: each with whether it has been seen (an unseen one stays a mystery). */
export const sceneList = (m: Meta): { id: string; title: string; text: string; seen: boolean }[] =>
  SCENE_ORDER.map((id) => {
    const s = SCENES[id];
    const seen = seenScene(m, id);
    return { id, title: seen ? s.title : '???', text: seen ? s.blurb : momentText(s.moment), seen };
  });
