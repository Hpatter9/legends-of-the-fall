// The heroes of each calling, from who reads what (`READS` in `bookData.ts`), for the legacy rules (`legacy.ts`).
import { READS } from './bookData';
import type { Calling } from './weakness';

const BOOK_OF: Record<Calling, keyof typeof READS> = { martial: 'manual', arcane: 'grimoire', devout: 'hymnal', wild: 'bestiary' };
export const HERO_KINDS_OF_CALLING = (c: Calling): readonly string[] => READS[BOOK_OF[c]];
