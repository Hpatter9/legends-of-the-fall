// The party's tactic as the player picks it (docs/notes/tactics.md): remembered per mode and per army in the save (`Meta.tactics`), Advance
// together when none was picked. The words the prep screen's sheet shows.
//
// Pure rules: no Pixi, no DOM, no randomness.

import type { RunMode } from './run';
import { TACTICS, TACTICS_LIST, type Tactic } from './tactics';
import type { Formation } from './formations';

/** The words for each tactic: its name, a short label for the chip, and one line for the sheet. */
export const TACTIC_WORDS: Record<Tactic, { name: string; short: string; line: string }> = {
  advance: { name: 'Advance together', short: 'Advance', line: 'Strikers and shooters stay behind the front line and save their leaps until it meets the foe.' },
  charge: { name: 'Charge', short: 'Charge', line: 'Everyone goes at once, quicker for a few seconds, and the first blows on archers land hard.' },
  hold: { name: 'Hold the line', short: 'Hold', line: 'Nobody leaves the deploy rows until the foe comes. Archers will shoot a line that waits.' },
};

/** The words for each formation: its name, a short label for the chip, and its bonus and weak point in a line. */
export const FORMATION_WORDS: Record<Formation, { name: string; short: string; line: string }> = {
  wall: { name: 'Shield Wall', short: 'Wall', line: 'Three side by side in front, two of them sturdy: +1 armour, a fifth less from blows. The ends are open.' },
  spear: { name: 'Spearhead', short: 'Spear', line: 'A tip with a wing behind each side: they march faster and their first blows strike hard. The tip stands alone.' },
  square: { name: 'Hollow Square', short: 'Square', line: 'Shooters at the back with friends round them: +2 armour, never struck from the side. Packed close, splash hurts more.' },
  skirmish: { name: 'Skirmish', short: 'Skirmish', line: 'Four or more, nobody touching: half the splash, less from their spells. Nobody guards a friend.' },
};

/** Where a pick is kept: by army in the army runs, by mode in the others. */
export const tacticKey = (mode?: RunMode): string => (!mode ? 'classic' : mode.kind === 'army' ? `army:${mode.army}` : mode.kind);

const isTactic = (t: unknown): t is Tactic => typeof t === 'string' && (TACTICS_LIST as readonly string[]).includes(t);

/** The tactic picked for this mode (or army), else the default. */
export function pickedTactic(tactics: Readonly<Record<string, string>> | undefined, mode?: RunMode): Tactic {
  const t = tactics?.[tacticKey(mode)];
  return isTactic(t) ? t : TACTICS.fallback;
}

/** Keep the pick for this mode (or army). */
export function pickTactic(meta: { tactics?: Record<string, string> }, mode: RunMode | undefined, t: Tactic): void {
  (meta.tactics ??= {})[tacticKey(mode)] = t;
}

/** A save's picks as read back: only known tactics under string keys (undefined when there are none). */
export function readTactics(raw: unknown): Record<string, Tactic> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, Tactic> = {};
  for (const [k, t] of Object.entries(raw as Record<string, unknown>)) if (isTactic(t)) out[k] = t;
  return Object.keys(out).length ? out : undefined;
}
