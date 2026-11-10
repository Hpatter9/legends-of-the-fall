// The Last Stand and the Calamity are hidden for now (the owner's call: they are to be reworked as part of Assault mode). One flag
// turns them off for the player: no camp place, no quest, achievement, tip or scene that sends anyone there. The code, the saves and the
// modes' own sim tests all stay, so a run begun in either mode sits untouched in its slot until the flag is lifted.
// Pure rules: no Pixi, no DOM.

import type { Goal, Need, QuestDef } from './questData';

/** The one switch (true: both modes hidden). Flip the default to false to show both modes again; a test of the modes' own rules
 *  turns it off for its own file with `setModesHidden(false)` (each test file runs in its own process). */
let hidden = true;
export const modesHidden = (): boolean => hidden;
const listeners: (() => void)[] = [];
/** Something derived from the flag (the quest list) asks to be told when it changes. */
export const onModesHiddenChange = (fn: () => void): void => void listeners.push(fn);
export const setModesHidden = (on: boolean): void => {
  if (hidden === on) return;
  hidden = on;
  for (const fn of listeners) fn();
};

export type HideableMode = 'tower' | 'calamity';

/** Whether a mode is shown to the player (the Last Stand is `tower` in the unlock rules). */
export const modeShown = (k: HideableMode): boolean => !hidden || (k !== 'tower' && k !== 'calamity');

/** Goal kinds that are only done inside a hidden mode. */
const MODE_GOALS: ReadonlySet<string> = new Set(['standWave', 'standRoom', 'holdLine', 'calGuardian', 'calClear']);

const goalHidden = (g: Goal): boolean => {
  if (MODE_GOALS.has(g.kind)) return true;
  const mode = (g as { mode?: string }).mode;
  return mode === 'tower' || mode === 'stand' || mode === 'calamity';
};

const needHidden = (n: Need): boolean => (n.kind === 'mode' ? true : n.kind === 'ascension' ? true : n.kind === 'all' ? n.of.some(needHidden) : false);

/** Whether a quest asks for either hidden mode (in its needs or any objective): while hidden it is never offered. */
export function questNeedsHiddenMode(q: QuestDef): boolean {
  if (needHidden(q.needs)) return true;
  return [q.goal, ...(q.goals ?? [])].some(goalHidden);
}

/** Whether a quest may be shown or offered right now. */
export const questShown = (q: QuestDef): boolean => !hidden || !questNeedsHiddenMode(q);

/** The achievements only a hidden mode can earn. One already earned stays on the list (and claimable); the rest are not shown or checked. */
// (FIRST-HOUR 2: 'Twenty Waves' and 'Thirty Waves' ask for wave 20 and 30 of one run. Every army is 15 waves and the daily ten, so only the
// endless mode ever reached them: they wait with it.)
export const HIDDEN_MODE_ACHIEVEMENTS: readonly string[] = ['tower1', 'tower20', 'stage20', 'stage30'];

/** Whether a line of the page's words names a hidden mode, so a list of tips or sources can leave it out while the modes are hidden. */
export const namesHiddenMode = (text: string): boolean => hidden && /Last Stand|Calamity/.test(text);

/** Whether an achievement shows (and can be earned) for a save that holds `earned`. */
export const achievementShown = (id: string, earned: readonly string[]): boolean => !hidden || !HIDDEN_MODE_ACHIEVEMENTS.includes(id) || earned.includes(id);

/** Whether a boss's trophy hangs on the Trophy wall (FIRST-HOUR 2): the Calamity's heralds can only be beaten in the Calamity, so their
 *  empty plaques wait with it; one already won stays. The other twelve are the armies' bosses, whatever the wall's old chip called them. */
export const trophyShown = (origin: string, earned: boolean): boolean => !hidden || origin !== 'calamity' || earned;

/** The named Legendary pieces whose only source is in a hidden mode (FIRST-HOUR 2): the spire's act guardians, the Calamity, a wave of the
 *  Last Stand, Vaelkhar's heart (his chain opens with the Calamity cleared) and a quest that needs a mode (`lostWordsLibrary`). */
export const HIDDEN_MODE_LEGENDS: readonly string[] = ['helmSevenWinters', 'ferrymansCoat', 'wyrmhideVaelkhar', 'gravesong', 'unwrittenBook', 'sevenLeagueBoots', 'ashwalkerSabatons'];

/** Whether a legend is listed in the codex: one that waits in a hidden mode is not, until the mode is back; one already found stays. */
export const legendShown = (id: string, found: boolean): boolean => !hidden || found || !HIDDEN_MODE_LEGENDS.includes(id);
