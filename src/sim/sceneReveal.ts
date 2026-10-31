// The end card of a film that reveals something (REVEAL, the owner: "At the end of a cinematic, if it was revealing something, it should
// come up at the end to show what happened or was unlocked"; docs/notes/cinematic-reveal-vault.md). A film names what it reveals
// (`Scene.reveal`, `sceneKit.ts`); `revealOf` reads the save and says what the card shows: a ribbon word ("Unlocked", "Built" ...), the
// thing's name, one line on what it is, one on where to find it, the art to draw and where its button may go. Null when the film reveals
// nothing, or when the save shows nothing was opened after all (an army cleared whose next army still wants stars, say), so that film
// ends as before. Pure: no Pixi, no DOM.

import type { Meta } from './meta';
import type { Reveal, Scene } from './sceneKit';
import { SCENES } from './sceneScripts';
import { modeOpen } from './modeUnlock';
import { ARMIES, armyIndex, armyUnlocked, bossOf } from './armies';
import { ascCrowns, ascUnlocked, ASC_MAX } from './ascension';
import { BUILDINGS, chapelBuilt, GOLD_PER_LEVEL, maxLevel, type BuildingId } from './castle';
import { awakenedOf, PASSIVES } from './awaken';
import { boundOf, hornFull, hornHeld } from './warHorn';
import { eidolonById } from './eidolons';
import { UNITS } from './units';

/** What the card draws: the Calamity's portal, a fighter's portrait (an army's warlord), a hero's painted portrait (awakened), a castle
 *  building, an Eidolon's card, the War Horn's painting (full). */
export type RevealArt =
  | { kind: 'portal' }
  | { kind: 'unit'; unit: string }
  | { kind: 'hero'; hero: string; step: number }
  | { kind: 'building'; site: string }
  | { kind: 'eidolon'; id: string }
  | { kind: 'horn' };

/** Where the card's button can take the player (the page offers it only where leaving is safe: on the home screen). */
export type RevealGo = { to: 'calamity' } | { to: 'armies'; army: string } | { to: 'castle' } | { to: 'spells' } | { to: 'heroes'; hero: string };

export interface EndCard {
  /** The same thing revealed twice is one key (`army:undead`): the page shows each once a session, and the older banner stands aside for it. */
  key: string;
  /** The ribbon's word. */
  label: 'Unlocked' | 'Built' | 'Awakened' | 'Bound' | 'Received';
  name: string;
  /** What it is, in one line. */
  line: string;
  /** Where to find it. */
  where: string;
  art: RevealArt;
  /** Where the button goes, and its words; none: the card has Continue only. */
  go?: { to: RevealGo; label: string };
}

/** What the castle's buildings do, for the card (one line each; the castle's own sheets have the numbers by level). */
const BUILT_LINE: Readonly<Record<BuildingId, string>> = {
  treasury: `Every run you start now begins with +${GOLD_PER_LEVEL} gold a level in the purse, for hiring heroes.`,
  barracks: 'Every hero now fights with more health.',
  armoury: 'Every hero now hits harder.',
  mageTower: "The king's mana fills faster, and new spells are taught.",
  stable: 'Every hero now crosses the field faster.',
  library: 'Every hero now earns more XP from every fight.',
};

/** The card a reveal makes, given the save, or null when the save shows nothing to reveal. */
export function revealCard(r: Reveal, m: Meta): EndCard | null {
  switch (r.kind) {
    case 'mode':
      if (!modeOpen(m, r.mode)) return null;
      return {
        key: 'mode:calamity',
        label: 'Unlocked',
        name: 'The Calamity',
        line: 'A new kind of run: one hero to start, heroes hired along the way, six heralds to beat across the void.',
        where: 'On the Battle tab: The Calamity, the citadel in the distance.',
        art: { kind: 'portal' },
        go: { to: { to: 'calamity' }, label: 'Into the portal' },
      };
    case 'nextArmy': {
      const i = armyIndex(r.after);
      const next = i >= 0 ? ARMIES[i + 1] : undefined;
      if (!next || !armyUnlocked(m, next.id)) return null;
      const boss = bossOf(next);
      return {
        key: `army:${next.id}`,
        label: 'Unlocked',
        name: next.name,
        line: `A new army marches: ${next.blurb.replace(/\.$/, '')}. Led by the ${UNITS[boss]?.name ?? 'warlord'}.`,
        where: 'On the Battle tab: Armies.',
        art: { kind: 'unit', unit: boss },
        go: { to: { to: 'armies', army: next.id }, label: 'To the armies' },
      };
    }
    case 'ascension': {
      const level = ascUnlocked(m);
      if (level < 1) return null;
      return {
        key: `ascension:${level}`,
        label: 'Unlocked',
        name: `Ascension ${level}`,
        line: `A harder Calamity that pays more (crowns x${ascCrowns(level).toFixed(1)}, more chests). Clear a level to open the next, up to ${ASC_MAX}.`,
        where: 'Pick the level as you begin a Calamity run, on the Battle tab.',
        art: { kind: 'portal' },
        go: { to: { to: 'calamity' }, label: 'To the Calamity' },
      };
    }
    case 'building': {
      if (r.site === 'chapel') {
        if (!chapelBuilt(m)) return null;
        return {
          key: 'building:chapel',
          label: 'Unlocked',
          name: 'The Spellbook',
          line: "The Chapel is raised: study the king's spells and choose which ones go to war.",
          where: 'The Spells tab.',
          art: { kind: 'building', site: 'chapel' },
          go: { to: { to: 'spells' }, label: 'To the spells' },
        };
      }
      const id = r.site as BuildingId;
      const b = BUILDINGS[id];
      if (!b || !(m.castle[id] > 0)) return null;
      return {
        key: `building:${id}`,
        label: 'Built',
        name: b.name,
        line: BUILT_LINE[id],
        where: `The Castle tab: raise it further, up to level ${maxLevel(id)}.`,
        art: { kind: 'building', site: id },
        go: { to: { to: 'castle' }, label: 'To the castle' },
      };
    }
    case 'awaken': {
      const step = awakenedOf(m, r.hero);
      const p = PASSIVES[r.hero];
      if (step < 1 || !UNITS[r.hero]) return null;
      return {
        key: `awaken:${r.hero}`,
        label: 'Awakened',
        name: UNITS[r.hero].name,
        line: p ? `A new look, stronger stats and a passive of its own: ${p.name}. ${p.text}.` : 'A new look and stronger stats.',
        where: "The hero's page: Awakening.",
        art: { kind: 'hero', hero: r.hero, step },
      };
    }
    case 'eidolon': {
      const e = eidolonById(r.id);
      if (!e || !boundOf(m).includes(r.id)) return null;
      return {
        key: `eidolon:${r.id}`,
        label: 'Bound',
        name: `${e.name}, ${e.title}`,
        line: `An Eidolon answers the War Horn: ${e.rider}.`,
        // (EIDOLON-CHAIN-2: with more than one bound, the newest answers, and the Pact Gallery chooses)
        where: boundOf(m).length > 1 ? `${e.name} answers the War Horn now. Choose who answers in the Pact Gallery.` : 'Fill the War Horn in fights, then tap it to call.',
        art: { kind: 'eidolon', id: r.id },
      };
    }
    case 'horn':
      // (HORN-GIFT: the horn handed over at the first binding; none before an Eidolon is bound)
      if (!hornHeld(m)) return null;
      return {
        key: 'horn',
        label: 'Received',
        name: 'The War Horn',
        line: `It fills as you fight: every boss wave won, every foe slain. Blow it when it is full and your Eidolon answers, once a fight.${
          hornFull(m) ? ' It is full now: blow it in your next fight.' : ''
        }`,
        where: 'In battle, at the left of the spell orbs; at the camp, beside the stones.',
        art: { kind: 'horn' },
      };
  }
}

/** The end card of a film (a scene, or its id), given the save: null for a film that reveals nothing. */
export function revealOf(film: string | Pick<Scene, 'reveal'>, m: Meta): EndCard | null {
  const s = typeof film === 'string' ? SCENES[film] : film;
  return s?.reveal ? revealCard(s.reveal, m) : null;
}
