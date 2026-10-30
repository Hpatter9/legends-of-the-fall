// Every hero's own name (docs/notes/heritage-looks.md): a fixed character name for each kind of hero, and a longer title
// (docs/notes/bench-titles.md) that the big places show with it ("Kwame, Shield of the Dawn"); the small boxes keep the name
// alone, and the menus' small labels "Kwame · Knight". Display only: ids, save keys and the sim never use it. The human heroes'
// names fit the heritage their look is drawn in (`heroLooks.ts`, and the painted art in
// docs/notes/heritage-art-prompt.md); the others' fit their lore. Kept short so the hero bar shows them whole.

import { UNITS } from './units';

export interface HeroName {
  /** The hero's own name. */
  name: string;
  /** The hero's epithet, fitting its class, kit and lore ("Shield of the Dawn"); shown after the name in the big places. */
  title: string;
  /** Where the name, and the hero's look, come from (for the notes and the art brief; not shown in the game). */
  heritage: string;
}

export const HERO_NAMES: Record<string, HeroName> = {
  knight: { name: 'Kwame', title: 'Shield of the Dawn', heritage: 'Ghanaian (Akan)' },
  samurai: { name: 'Kenji', title: 'Sword of the Eastern Sea', heritage: 'Japanese' },
  kunoichi: { name: 'Ayame', title: 'Smoke on the Rooftops', heritage: 'Japanese' },
  archer: { name: 'Natsu', title: 'Eye of the High Crags', heritage: 'Japanese' },
  wizard: { name: 'Ravi', title: 'Kindler of Pyres', heritage: 'Indian (Tamil)' },
  peasant: { name: 'Minh', title: 'Banner of the Commons', heritage: 'Vietnamese' },
  ninjaMonk: { name: 'Jiro', title: 'Fist of the Quiet Vow', heritage: 'Japanese' },
  wanderer: { name: 'Rhys', title: 'Brewer of the Long Road', heritage: 'Welsh' },
  lightningMage: { name: 'Malia', title: 'Herald of the Storm', heritage: 'Samoan' },
  kitsune: { name: 'Kohaku', title: 'Amber Fox of Many Faces', heritage: 'a Japanese fox spirit' },
  karasu: { name: 'Kurogane', title: 'Iron-Beaked Raider', heritage: 'a Japanese crow tengu' },
  yamabushi: { name: 'Kazan', title: 'Master of the Gale', heritage: 'a Japanese mountain tengu' },
  werewolf: { name: 'Vuk', title: 'Hunter of the Full Moon', heritage: 'a Serbian wolf legend' },
  minotaur: { name: 'Asterion', title: 'Horn of the Labyrinth', heritage: 'Cretan myth' },
  satyr: { name: 'Dorion', title: 'Piper of the Revel', heritage: 'Greek myth' },
  gorgon: { name: 'Xanthe', title: 'Lady of the Stone Gaze', heritage: 'Greek myth' },
  samuraiCommander: { name: 'Hideo', title: 'Holder of the Bridge', heritage: 'Japanese' },
  paladin: { name: 'Karim', title: 'Bearer of Wounds', heritage: 'Lebanese' },
  cleric: { name: 'Selam', title: 'Lantern of Mercy', heritage: 'Ethiopian (Amhara)' },
  druid: { name: 'Isla', title: 'Voice of the Old Oaks', heritage: 'Scottish' },
  barbarian: { name: 'Eirik', title: 'Red Axe of the North', heritage: 'Norwegian' },
  ranger: { name: 'Inti', title: 'Warden of the Snares', heritage: 'Quechua (Peruvian Andes)' },
  warlock: { name: 'Zofia', title: 'Black-Pact Warlock', heritage: 'Polish' },
  illusionist: { name: 'Luana', title: 'Weaver of Mirrors', heritage: 'Afro-Brazilian' },
  gunslinger: { name: 'Maeve', title: 'Deadeye of the Marches', heritage: 'Irish' },
  shambler: { name: 'Hobb', title: 'the Unburied', heritage: 'English folk tale' },
  rifleBot: { name: 'Rook-7', title: 'Brass Sentinel', heritage: 'a clockwork designation' },
  mercenary: { name: 'Kian', title: 'Bane of the Mighty', heritage: 'Persian (Iranian)' },
  mummy: { name: 'Seneb', title: 'Binder of the Sands', heritage: 'Ancient Egyptian' },
  buccaneer: { name: 'Tiago', title: 'Hook of the Salt Isles', heritage: 'Cape Verdean' },
  wolfBard: { name: 'Lovell', title: 'Wolfsbane Bard', heritage: 'an old English name meaning wolf cub' },
  beastmaster: { name: 'Itzel', title: 'Caller of the Grey Pack', heritage: 'Maya (Mexican)' },
  kraken: { name: 'Skerry', title: 'Child of the Undertow', heritage: 'sea lore (a skerry is a sea rock)' },
  lancer: { name: 'Bataar', title: 'Thunder of the Steppe', heritage: 'Mongolian' },
  reaper: { name: 'Vesper', title: 'Keeper of the Last Hour', heritage: 'Latin, the evening' },
  timeWitch: { name: 'Adaeze', title: 'Starlit Hourglass', heritage: 'Nigerian (Igbo)' },
  arcBlade: { name: 'Minjun', title: 'Spark-Forged Blade', heritage: 'Korean' },
  dreadPirate: { name: 'Harrow', title: 'Twice-Drowned Captain', heritage: 'a drowned crew\'s legend' },
  siegeBot: { name: 'Bastion', title: 'Clocktower Cannon', heritage: 'a siege engine\'s designation' },
  priestess: { name: 'Linnea', title: 'Halo of the Undying', heritage: 'Swedish' },
  dragoon: { name: 'Tiziri', title: 'Crowned Wyvern Rider', heritage: 'Amazigh (Moroccan)' },
  juggernaut: { name: 'Kerem', title: 'the Marching Wall', heritage: 'Turkish' },
  sage: { name: 'Seydou', title: 'Reader of the Stars', heritage: 'Malian' },
  demonSwordsman: { name: 'Aram', title: 'Host of the Hungry Steel', heritage: 'Armenian' },
  tyrant: { name: 'Edmund', title: 'the Unbending Verdict', heritage: 'English' },
};

/** A fighter's own name: a hero's personal name, or the unit's name for anything else (foes, summons). */
export const heroName = (kind: string): string => HERO_NAMES[kind]?.name ?? UNITS[kind]?.name ?? kind;

/** A hero's epithet alone ("Shield of the Dawn"), or '' for anything that is not a hero. */
export const heroEpithet = (kind: string): string => HERO_NAMES[kind]?.title ?? '';

/** A hero's name and title, for the big places (the dossier, the reveals, the codex, the MVP): "Kwame, Shield of the Dawn".
 *  Anything that is not a hero has the unit's name. */
export const heroTitle = (kind: string): string => (HERO_NAMES[kind] ? `${HERO_NAMES[kind].name}, ${HERO_NAMES[kind].title}` : UNITS[kind]?.name ?? kind);

/** A hero's name with its class, as the menus' small labels and the accessible labels present it: "Kwame · Knight". */
export const heroClassLabel = (kind: string): string => (HERO_NAMES[kind] ? `${HERO_NAMES[kind].name} · ${UNITS[kind].name}` : UNITS[kind]?.name ?? kind);
