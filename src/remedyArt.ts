// The remedies' icons (SEVEN-SLOT GEAR batch 6): the rogue pack's potion and elixir sprites stand in until the five remedies' paintings are
// made (docs/notes/gear-art-todo.md). Bundled, so they play offline.

import potion from './art/rogue/potion.png';
import elixir from './art/rogue/elixir.png';
import type { RemedyId } from './sim/remedies';

export const REMEDY_ICON: Readonly<Record<RemedyId, string>> = { bandage: potion, draught: potion, stew: potion, phoenix: elixir, elixir };
