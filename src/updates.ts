// What's new: the releases the Updates and notes page in Settings lists, newest first, in plain words for the player (no
// code talk). Pure data, so the tests can check it. Whoever merges a release adds its entry at the top of UPDATES with the
// same version as package.json (a test fails if the newest entry and package.json disagree), a date and two to five short
// lines of what changed. Older history is summed up a range at a time in EARLIER.

export interface Update {
  /** The release, as in package.json ("0.233.0"). */
  version: string;
  /** The day it came out (YYYY-MM-DD), when known. */
  date?: string;
  /** A few words naming the release. */
  title: string;
  /** Two to five short lines of what changed for the player. */
  notes: readonly string[];
}

/** A run of older releases, summed up in a line. */
export interface EarlierUpdates {
  /** The first and last versions of the range ("0.160.0", "0.189.0"). */
  from: string;
  to: string;
  /** When they came out, as a short phrase. */
  when?: string;
  summary: string;
}

/** Every release since 0.189.0, newest first. */
export const UPDATES: readonly Update[] = [
  {
    version: '0.233.0',
    date: '2026-10-29',
    title: 'A star for clearing without a heart',
    notes: ['An army’s third star is now earned by clearing it without using a heart.', 'The star goals on the army cards say so.'],
  },
  {
    version: '0.232.0',
    date: '2026-10-29',
    title: 'The Rift Sanctuary',
    notes: [
      'The Calamity is rebuilt around a sanctuary of altars and portals to six worlds.',
      'Three regions, each with a guardian to beat at its end.',
      'Your starting heroes grow as you go, and new ones can be recruited on the way.',
    ],
  },
  {
    version: '0.231.0',
    date: '2026-10-29',
    title: 'Hero power on the roster',
    notes: ['Each hero card in the roster shows the hero’s power, so the strongest are easy to spot.'],
  },
  {
    version: '0.230.0',
    date: '2026-10-29',
    title: 'A grander summoning reveal',
    notes: ['A newly summoned hero is shown with their painting behind and their moving sprite in front.'],
  },
  {
    version: '0.229.0',
    date: '2026-10-29',
    title: 'Painted ascension auras',
    notes: ['Every class has its own painted aura when a hero ascends, in place of the old pixel glow.'],
  },
  {
    version: '0.228.0',
    date: '2026-10-29',
    title: 'Tier skills do what they say',
    notes: ['A tier skill’s heal, shield, haste or charge now goes off with the skill it improves, as its words promise.'],
  },
  {
    version: '0.227.0',
    date: '2026-10-29',
    title: 'More faces, and every hero named',
    notes: ['Eleven heroes have new skin tones for a more varied cast.', 'Every hero now has a personal name.'],
  },
  {
    version: '0.226.0',
    date: '2026-10-29',
    title: 'Quick cards in the spire and the Calamity',
    notes: ['Spire floors and Calamity fights show the short see-through card after each fight.', 'Their summaries now hold the full detail: each hero’s part, the best fighter, XP and spoils.'],
  },
  {
    version: '0.225.0',
    date: '2026-10-29',
    title: 'Armies open in order',
    notes: ['Each army now needs the one before it beaten, as well as enough stars.'],
  },
  {
    version: '0.224.0',
    date: '2026-10-29',
    title: 'Merging by hand',
    notes: [
      'Heroes no longer merge on their own when hired: drag one onto its twin, or tap Auto merge.',
      'Two of a kind make one of the next rank, up to rank 4.',
      'A full bench refuses a hire.',
    ],
  },
  {
    version: '0.223.0',
    date: '2026-10-29',
    title: 'Wave cards on the march',
    notes: ['A won wave shows a short see-through card while the party walks on.', 'The end recap adds a wave-by-wave strip, the spoils found and the hearts used.'],
  },
  {
    version: '0.222.0',
    date: '2026-10-29',
    title: 'Clearer effects',
    notes: ['Effects over a fighter are drawn see-through, so you can still see who is hit.', 'The second skill’s pip stays greyed until that skill is unlocked.'],
  },
  {
    version: '0.221.0',
    date: '2026-10-29',
    title: 'Tier 4 skills',
    notes: ['Every hero has a fourth named skill, cast once they reach rank 4.', 'The hero card and the codex list it.'],
  },
  {
    version: '0.220.0',
    date: '2026-10-29',
    title: 'Steady battle music',
    notes: ['A battle keeps one track from its first wave to its last.', 'Winning plays victory music.'],
  },
  {
    version: '0.219.0',
    date: '2026-10-29',
    title: 'Spell sounds',
    notes: ['Each of the king’s spells has its own sound when cast and when it lands.'],
  },
  {
    version: '0.218.0',
    date: '2026-10-29',
    title: 'Painted ailments',
    notes: ['The eleven ailments have painted effects of their own on the fighters.'],
  },
  {
    version: '0.217.0',
    date: '2026-10-29',
    title: 'Status effects',
    notes: [
      'Eleven ailments, from burning and poison to freeze, stun, curse and fear.',
      'Foes resist some by their kind, and bosses shrug off the worst.',
    ],
  },
  {
    version: '0.216.0',
    date: '2026-10-29',
    title: 'The summoner comes alive',
    notes: ['The summoner in the chamber is animated, and new allies are revealed there.'],
  },
  {
    version: '0.215.0',
    date: '2026-10-29',
    title: 'A new loading screen',
    notes: ['The king and his guard stand on the loading screen, with drifting embers and mist.'],
  },
  {
    version: '0.214.0',
    date: '2026-10-28',
    title: 'The Last Stand’s rooms',
    notes: ['The Last Stand has new room art.', 'Your chosen ruler stands and defends in it.'],
  },
  {
    version: '0.213.0',
    date: '2026-10-28',
    title: 'Ultimates, retuned',
    notes: ['Ultimates go off once or twice a battle, at full strength.', 'Late foes are tougher to match.'],
  },
  {
    version: '0.212.0',
    date: '2026-10-28',
    title: 'Starter packs and The King',
    notes: ['Every new game picks one of two fixed starter packs of three heroes.', 'The King joins as a ninth ruler and is the default.'],
  },
  {
    version: '0.211.0',
    date: '2026-10-28',
    title: 'A tidier hero bar',
    notes: ['The hero bar shows no level 30 mark or ultimate ring until the ultimate is unlocked.'],
  },
  {
    version: '0.210.0',
    date: '2026-10-28',
    title: 'Tarot summoning',
    notes: ['Summoning shards are drawn as tarot cards.', 'Every hero has a first-time reveal when they join.'],
  },
  {
    version: '0.209.0',
    date: '2026-10-28',
    title: 'Hero art, top half first',
    notes: ['A hero’s artwork shows its top half until you open it in full.'],
  },
  {
    version: '0.208.0',
    date: '2026-10-28',
    title: 'Army pace',
    notes: ['The last five armies are steeper, so they come after the first army’s stars.'],
  },
  {
    version: '0.207.0',
    date: '2026-10-28',
    title: 'Summoning fix',
    notes: ['A quick tap can no longer skip a new hero’s unlock show.'],
  },
  {
    version: '0.206.0',
    date: '2026-10-28',
    title: 'Portraits for every hero',
    notes: ['All 45 heroes have new portraits and full-scene paintings.'],
  },
  {
    version: '0.205.0',
    date: '2026-10-28',
    title: 'Ruler and costume menus',
    notes: ['The ruler and Duchess’s costume are picked from a menu that opens on a tap.', 'The developer options can give summoning stones.'],
  },
  {
    version: '0.204.0',
    date: '2026-10-28',
    title: 'The Last Stand helps out',
    notes: ['In the Last Stand, heroes with nothing to fight go and help where the fighting is, and return when needed.'],
  },
  {
    version: '0.203.0',
    date: '2026-10-28',
    title: 'Four heroes redesigned',
    notes: ['The Kitsune, Gorgon, Illusionist and Time Witch have new looks.'],
  },
  {
    version: '0.202.0',
    date: '2026-10-28',
    title: 'Rulers to choose',
    notes: ['Choose your ruler from eight characters, each with their own art and actions.'],
  },
  {
    version: '0.201.0',
    date: '2026-10-28',
    title: 'Fight fixes',
    notes: ['Bosses stand mid-arena.', 'The camera moves freely, a revived hero gets up, and the boss trophy wall is fixed.'],
  },
  {
    version: '0.200.0',
    date: '2026-10-28',
    title: 'Effects the right way round',
    notes: ['Battle effects face the way they should and stay upright.'],
  },
  {
    version: '0.199.0',
    date: '2026-10-28',
    title: 'Developer options and chaos twists',
    notes: ['Settings has a developer row for testing.', 'Chaos twists begin at ascension 3.'],
  },
  {
    version: '0.198.0',
    date: '2026-10-28',
    title: 'Calamity encounters',
    notes: ['New mystery encounters in the Calamity and the spire.', 'Chaos twists such as Rolling Gales and Hot Coals in high ascensions.'],
  },
  {
    version: '0.197.0',
    date: '2026-10-28',
    title: 'Varied dailies',
    notes: ['Eighteen daily themes take turns, from 1 November.', 'Each sets the heroes, a featured trait, a goal for a bonus star and the land.'],
  },
  {
    version: '0.196.0',
    date: '2026-10-28',
    title: 'Duchess fights',
    notes: ['One fight in a thousand, Duchess the goat joins the party at level 100.'],
  },
  {
    version: '0.195.0',
    date: '2026-10-28',
    title: 'Duo combos',
    notes: ['Pairs of heroes have combos, with a Harmonic Resonance when both ultimates land together.', 'Trait bonuses grow at set numbers of heroes.'],
  },
  {
    version: '0.194.0',
    date: '2026-10-28',
    title: 'The Resonance look',
    notes: ['All heroes are drawn in the Resonance style.', 'Heroes walk in four directions.'],
  },
  {
    version: '0.193.0',
    date: '2026-10-28',
    title: 'Punchier fights',
    notes: ['More impact in the fighting, and heroes strike a pose when they win.', 'A trophy wall for the bosses beaten.'],
  },
  {
    version: '0.192.0',
    date: '2026-10-28',
    title: 'Duchess’s treats',
    notes: ['Duchess has a Lucky Bleat, a haystack treat and costumes to unlock.'],
  },
  {
    version: '0.191.0',
    date: '2026-10-28',
    title: 'Rift ores',
    notes: ['Awakening needs rift ores, one for each class, from the armies and the Calamity.'],
  },
  {
    version: '0.190.0',
    date: '2026-10-28',
    title: 'Battle reports',
    notes: ['The after-battle reports have the new battle look on every screen.'],
  },
  {
    version: '0.189.0',
    date: '2026-10-28',
    title: 'The Last Stand, overhauled',
    notes: ['The Last Stand has castle rooms, breaches and brass to earn.', 'It is harder as it goes on.'],
  },
];

/** The releases before UPDATES, a line a range, newest first. */
export const EARLIER: readonly EarlierUpdates[] = [
  {
    from: '0.160.0',
    to: '0.188.0',
    when: '26 to 28 October 2026',
    summary:
      'Ornate hero cards and dossiers, the Summoning Sanctum and summoning stones, the war council, the royal citadel, epic music and recorded combat sounds, hero kits with mana and ultimates you fire yourself, XP tomes, the army road with boss arenas, and spells earned rather than bought.',
  },
  {
    from: '0.130.0',
    to: '0.159.0',
    when: '23 to 26 October 2026',
    summary:
      'The game became Legends of the Last Keep; the Mythic tier, height and jumping, ultimates at level 30, rank up by choice, eleven new lands with weather, the Calamity map and shop, the Last Stand in place of the tower, gothic music, talking scenes and the Keep and Kingdom look.',
  },
  {
    from: '0.100.0',
    to: '0.129.0',
    when: '22 to 23 October 2026',
    summary:
      'Hero awakening and gear sets, the winding army road, camp places, the Calamity in the void, the Stone and Iron look, ultimates for all 45 heroes, heroes joining by shards, hearts for retries, the three-room tavern, and a daily with a goal.',
  },
  {
    from: '0.41.0',
    to: '0.99.0',
    when: '21 to 22 October 2026',
    summary:
      'Pixel-art menus, the armies campaign, the castle courtyard and its buildings, the summoning hall and the library, army stars and chests, hero equipment and talent trees, the roguelike tower, achievements, auto-deploy and x3 speed, 45 heroes, the Calamity mode and the codex.',
  },
  {
    from: '0.1.0',
    to: '0.40.0',
    when: '21 October 2026',
    summary:
      'The first battles: heroes placed on a height grid, skills and passives, the king’s spells, runs with gold and merging, music and sound, synergies, hero levels, events and relics, six areas, the daily challenge, the endless tower and rarity tiers.',
  },
];

/** The release a version line begins with ("0.233.0 · abc123" gives "0.233.0"). */
export const releaseOf = (version: string): string => version.split('·')[0].trim();

/** Compares two versions ("0.99.0" < "0.100.0"): negative, zero or positive. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** Whether the Updates entry shows its "New" dot: the game's release differs from the one last seen (`seen`, null if the
 *  page was never opened). */
export const updatesUnseen = (seen: string | null, current: string): boolean => releaseOf(current) !== (seen ?? '');
