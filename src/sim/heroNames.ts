// Every hero's own name (docs/notes/heritage-looks.md): a fixed character name for each kind of hero, shown with its
// class as the title ("Kwame · Knight"). Display only: ids, save keys and the sim never use it. The human heroes'
// names fit the heritage their look is drawn in (`heroLooks.ts`, and the painted art in
// docs/notes/heritage-art-prompt.md); the others' fit their lore. Kept short so the hero bar shows them whole.

import { UNITS } from './units';

export interface HeroName {
  /** The hero's own name. */
  name: string;
  /** Where the name, and the hero's look, come from (for the notes and the art brief; not shown in the game). */
  heritage: string;
}

export const HERO_NAMES: Record<string, HeroName> = {
  knight: { name: 'Kwame', heritage: 'Ghanaian (Akan)' },
  samurai: { name: 'Kenji', heritage: 'Japanese' },
  kunoichi: { name: 'Ayame', heritage: 'Japanese' },
  archer: { name: 'Natsu', heritage: 'Japanese' },
  wizard: { name: 'Ravi', heritage: 'Indian (Tamil)' },
  peasant: { name: 'Minh', heritage: 'Vietnamese' },
  ninjaMonk: { name: 'Jiro', heritage: 'Japanese' },
  wanderer: { name: 'Rhys', heritage: 'Welsh' },
  lightningMage: { name: 'Malia', heritage: 'Samoan' },
  kitsune: { name: 'Kohaku', heritage: 'a Japanese fox spirit' },
  karasu: { name: 'Kurogane', heritage: 'a Japanese crow tengu' },
  yamabushi: { name: 'Kazan', heritage: 'a Japanese mountain tengu' },
  werewolf: { name: 'Vuk', heritage: 'a Serbian wolf legend' },
  minotaur: { name: 'Asterion', heritage: 'Cretan myth' },
  satyr: { name: 'Dorion', heritage: 'Greek myth' },
  gorgon: { name: 'Xanthe', heritage: 'Greek myth' },
  samuraiCommander: { name: 'Hideo', heritage: 'Japanese' },
  paladin: { name: 'Karim', heritage: 'Lebanese' },
  cleric: { name: 'Selam', heritage: 'Ethiopian (Amhara)' },
  druid: { name: 'Isla', heritage: 'Scottish' },
  barbarian: { name: 'Eirik', heritage: 'Norwegian' },
  ranger: { name: 'Inti', heritage: 'Quechua (Peruvian Andes)' },
  warlock: { name: 'Zofia', heritage: 'Polish' },
  illusionist: { name: 'Luana', heritage: 'Afro-Brazilian' },
  gunslinger: { name: 'Maeve', heritage: 'Irish' },
  shambler: { name: 'Hobb', heritage: 'English folk tale' },
  rifleBot: { name: 'Rook-7', heritage: 'a clockwork designation' },
  mercenary: { name: 'Kian', heritage: 'Persian (Iranian)' },
  mummy: { name: 'Seneb', heritage: 'Ancient Egyptian' },
  buccaneer: { name: 'Tiago', heritage: 'Cape Verdean' },
  wolfBard: { name: 'Lovell', heritage: 'an old English name meaning wolf cub' },
  beastmaster: { name: 'Itzel', heritage: 'Maya (Mexican)' },
  kraken: { name: 'Skerry', heritage: 'sea lore (a skerry is a sea rock)' },
  lancer: { name: 'Bataar', heritage: 'Mongolian' },
  reaper: { name: 'Vesper', heritage: 'Latin, the evening' },
  timeWitch: { name: 'Adaeze', heritage: 'Nigerian (Igbo)' },
  arcBlade: { name: 'Minjun', heritage: 'Korean' },
  dreadPirate: { name: 'Harrow', heritage: 'a drowned crew\'s legend' },
  siegeBot: { name: 'Bastion', heritage: 'a siege engine\'s designation' },
  priestess: { name: 'Linnea', heritage: 'Swedish' },
  dragoon: { name: 'Tiziri', heritage: 'Amazigh (Moroccan)' },
  juggernaut: { name: 'Kerem', heritage: 'Turkish' },
  sage: { name: 'Seydou', heritage: 'Malian' },
  demonSwordsman: { name: 'Aram', heritage: 'Armenian' },
  tyrant: { name: 'Edmund', heritage: 'English' },
};

/** A fighter's own name: a hero's personal name, or the unit's name for anything else (foes, summons). */
export const heroName = (kind: string): string => HERO_NAMES[kind]?.name ?? UNITS[kind]?.name ?? kind;

/** A hero's name with its class as the title, as the menus present it: "Kwame · Knight". */
export const heroTitle = (kind: string): string => (HERO_NAMES[kind] ? `${HERO_NAMES[kind].name} · ${UNITS[kind].name}` : UNITS[kind]?.name ?? kind);
