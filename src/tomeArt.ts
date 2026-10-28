// The three XP tomes' pictures (16x16 tiles cut from the DawnLike Book sheet by `tools/tome-icons.py`): a plain brown book, a
// blue-bound tome and the gold book with its sparkle. Shared by the chest reveals and the hero page's "Use tome".

import type { TomeSize } from './sim/tomes';
import { warmIcon } from './menuArt';
import tomeSmall from './art/ui/tome-small.png';
import tomeMedium from './art/ui/tome-medium.png';
import tomeLarge from './art/ui/tome-large.png';

export const TOME_ICON: Readonly<Record<TomeSize, string>> = { small: tomeSmall, medium: tomeMedium, large: tomeLarge };
for (const u of Object.values(TOME_ICON)) warmIcon(u);
