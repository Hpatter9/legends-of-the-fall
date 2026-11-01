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
    version: '0.326.0',
    date: '2026-11-01',
    title: 'The Iron Stag leads',
    notes: ['The Iron Stag is now the default ruler. The old King is retired: saves that chose him now follow the Iron Stag, in the new art everywhere.'],
  },
  {
    version: '0.325.0',
    date: '2026-11-01',
    title: 'Every score counts',
    notes: ['CON and the casting score size pools, INT shortens cooldowns, CHA fills ultimates, WIS sees through cover, STR climbs; quick heroes flank and kite.'],
  },
  {
    version: '0.324.0',
    date: '2026-11-01',
    title: 'Saving throws',
    notes: ['Ailments, shoves and blasts now allow a save against the caster\'s skill DC: a save halves the effect and shows \'Saved\'. Strong heroes shove further.'],
  },
  {
    version: '0.323.0',
    date: '2026-11-01',
    title: 'Armour and the d20',
    notes: ['Blows roll a d20 against Armour Class: misses, glancing blows, crits on a natural 20. DEX speeds blows and decides who acts first; armour counts from level 1.'],
  },
  {
    version: '0.322.0',
    date: '2026-11-01',
    title: 'Rulers, levels and finds',
    notes: ['The Crown\'s herald in the Eidolon stories now shows the ruler you chose in Settings, not a stock messenger.', 'The end-of-run recap shows each hero\'s level from the run\'s start to its end when they levelled up, beside their stat gains.', 'A line between waves when a find waits in your pack, a red \'full\' tag on the cart, the stash count on the gear panel, and finds on the auto-replay recap.'],
  },
  {
    version: '0.321.0',
    date: '2026-11-01',
    title: 'Real gear in runs',
    notes: ['Runs now drop real gear you keep: worn on the spot with a field boost, and brought home after. The early armies are a touch tougher to match.'],
  },
  {
    version: '0.320.0',
    date: '2026-11-01',
    title: 'An Android app',
    notes: ['The game can now be installed as an Android app from the GitHub Releases page; inside the app, Settings shows when a newer version is out.'],
  },
  {
    version: '0.319.0',
    date: '2026-11-01',
    title: 'The Stats panel',
    notes: ['Each hero\'s sheet shows the six D&D scores, AC, to hit, skill DC and saves; the unit card and level-up recap show them, and gear compares by score.'],
  },
  {
    version: '0.318.0',
    date: '2026-11-01',
    title: 'Vaelkhar\'s Heart returned',
    notes: ['If you have ever held Vaelkhar\'s Heart, binding him returns it to him, and he pays the debt: his War Horn drain gives back 30% of the damage dealt, not 25%.'],
  },
  {
    version: '0.317.0',
    date: '2026-11-01',
    title: 'Lost techniques',
    notes: ['Four Legendary skill books, each won through a hero\'s own three-part quest from level 30: the Ninefold Cut, Words of Unmaking, the Long Dawn and Old Hunger.'],
  },
  {
    version: '0.316.0',
    date: '2026-11-01',
    title: 'D&D scores drive power',
    notes: ['Health grows with CON, blows and skills with their ability; level-ups raise scores, and ranks, talents and gear add points. Average power is unchanged.'],
  },
  {
    version: '0.315.0',
    date: '2026-11-01',
    title: 'Three book slots',
    notes: ['Every hero has three skill slots from the start (the third opens at level 20). A book\'s skill levels up with use like any other, and its cost fits the reader.'],
  },
  {
    version: '0.314.0',
    date: '2026-11-01',
    title: 'Gorm\'s and Vaelkhar\'s chains',
    notes: ['The last two Eidolon stories: Duchess the goat brings Gorm\'s, a voice in the rift brings Vaelkhar\'s. Each ends in a trial; the Dragon King\'s is the hardest.'],
  },
  {
    version: '0.313.0',
    date: '2026-11-01',
    title: 'Skills grow with use',
    notes: ['A hero\'s skills now level up with use in army runs (half under auto-replay). The daily, quests, the spire, the Calamity and the Last Stand don\'t count.'],
  },
  {
    version: '0.312.0',
    date: '2026-11-01',
    title: 'The Eidolons\' reliquaries',
    notes: ['18 new Calamity relics in six Eidolon reliquaries. Hold all three of one and its Eidolon answers sooner and stays longer: the War Horn fills faster.'],
  },
  {
    version: '0.311.0',
    date: '2026-11-01',
    title: 'Three skill buttons in battle',
    notes: ['Every hero\'s row in battle now shows all three skills, with their cost and cooldown; the Last Stand and Calamity get compact rows.'],
  },
  {
    version: '0.310.0',
    date: '2026-11-01',
    title: 'Eidolon quest: The Dry Storm',
    notes: ['Once Aurelan is bound and the Labyrinth falls, a royal courier brings Voltara\'s tale: three pieces, then a trial on the Lightning Heights.'],
  },
  {
    version: '0.309.0',
    date: '2026-11-01',
    title: 'The caravan and the Gloaming Dealer',
    notes: ['Rustam Saffar\'s caravan visits once a week with rare books, Epic gear and ore. After Calamity guardians fall, the Gloaming Dealer opens for a day.'],
  },
  {
    version: '0.308.0',
    date: '2026-11-01',
    title: 'Daily goals you can always meet',
    notes: ['Every daily theme\'s star goal now asks only for what the day\'s starting five can field, so no goal needs a lucky hire or two of one hero.'],
  },
  {
    version: '0.307.0',
    date: '2026-11-01',
    title: 'Eidolon quest: The Late Dawn',
    notes: ['Once Nivra is bound and the Wildwood falls, Gwen Tallow climbs to the Sanctum: three pieces, then a trial against Aurelan, the Lion of Dawn.'],
  },
  {
    version: '0.306.0',
    date: '2026-11-01',
    title: 'Every hero\'s third skill',
    notes: ['At level 20 every hero learns a third skill, often a quick jab or a guard that fits their calling. See them on the skill sheet\'s new Skill 3 tab.'],
  },
  {
    version: '0.305.0',
    date: '2026-11-01',
    title: 'Fewer screen glitches',
    notes: ['Chests, summons and full artwork now draw fully on sharp phone screens: hidden screens stop being painted and the big light effects cost far less.'],
  },
  {
    version: '0.304.0',
    date: '2026-10-31',
    title: 'Skills with cooldowns; ranks give stats',
    notes: ['Every skill now has a cost and a cooldown by its type, so heroes cast more often. Ranking up gives more health and attack instead of upgraded skills.'],
  },
  {
    version: '0.303.0',
    date: '2026-10-31',
    title: 'The Eidolons\' calls, redone',
    notes: ['Each Eidolon crosses the screen its own way, then its sprite strikes with its own attack: wildfire, frost, falling light, chain lightning, a quake, shadow fire.'],
  },
  {
    version: '0.302.0',
    date: '2026-10-31',
    title: 'Relics become the keep\'s lost artefacts',
    notes: ['30 relics in six Chapters of the keep\'s history plus six Storied ones, each with lore and its own rule: prices, conditions, powers that grow. Old runs convert.'],
  },
  {
    version: '0.301.0',
    date: '2026-10-31',
    title: 'Armies retuned for Auto spells',
    notes: ['Now that Auto casts your spells, the armies, the daily, the Last Stand and the Calamity are retuned to match. The late three armies are harder again.'],
  },
  {
    version: '0.300.0',
    date: '2026-10-31',
    title: 'Clearer marks, one unlock card, auto talents',
    notes: ['Skill and boss marks sit under the heroes. Each unlock is told once. Auto spends a hero\'s talent points, or everyone\'s from the Upgrades list.'],
  },
  {
    version: '0.299.0',
    date: '2026-10-31',
    title: 'One battle theme, and a boss theme',
    notes: ['Every fight now plays one strong battle track, and a heavier boss track takes over when a boss arrives. All music is levelled to the same loudness.'],
  },
  {
    version: '0.298.0',
    date: '2026-10-31',
    title: 'Eidolon quest: What Sleeps Under the Mere',
    notes: ['Once Askel is bound and the Beast Packs fall, a frost-bitten hunter brings Nivra\'s tale: three pieces, then a trial against Nivra herself.'],
  },
  {
    version: '0.297.0',
    date: '2026-10-31',
    title: 'The Last Stand\'s tower',
    notes: ['The Last Stand now opens from the tower on the overlook\'s left, with its record and a short entry. A lost run\'s message no longer covers the Daily.'],
  },
  {
    version: '0.296.0',
    date: '2026-10-31',
    title: 'Secret heroes and ten tavern tales',
    notes: ['The ten heroes earned in play are secret until they join. Each now comes from its own tale in the tavern, told by a giver and ending in a hard battle.'],
  },
  {
    version: '0.295.0',
    date: '2026-10-31',
    title: 'A clearer summoning room',
    notes: ['Shop and Pacts are small corner buttons, the Summoner\'s line is one short row and the shards panel folds, so the room shows. No leftover Askel message.'],
  },
  {
    version: '0.294.0',
    date: '2026-10-31',
    title: 'Kill XP is shared with the party',
    notes: ['The hero who lands a kill keeps half its XP; the rest is shared by everyone who fought, so weaker heroes level up faster beside a strong one.'],
  },
  {
    version: '0.293.0',
    date: '2026-10-31',
    title: 'D&D ability scores, behind the scenes',
    notes: ['Every hero now has D&D ability scores (STR, DEX, CON, INT, WIS, CHA) that grow by level, rank and awakening. They don\'t change fights yet.'],
  },
  {
    version: '0.292.0',
    date: '2026-10-31',
    title: 'Relics stay on the prep screen',
    notes: ['The run\'s relics now show only while you prepare a wave, not during the fight. Tap one to read it; set relics show their set count.'],
  },
  {
    version: '0.291.0',
    date: '2026-10-31',
    title: 'Auto casts your spells too',
    notes: ['The battle Auto switch now fires your spells as well as ultimates: heals when hurt, blasts on crowds and bosses, buffs early. The War Horn stays yours.'],
  },
  {
    version: '0.290.0',
    date: '2026-10-31',
    title: 'Painted faces, and the spoils page',
    notes: ['Battle rows and unit cards show each hero\'s painted face. A run\'s final recap adds a spoils page (crowns, gear, items) and drops the wave-by-wave strip.'],
  },
  {
    version: '0.289.0',
    date: '2026-10-31',
    title: 'Guest heroes, and talent arrows',
    notes: ['The passing cart may offer a guest hero: a 6th fighter for that run only. Tavern arrows now also mark heroes with talent points to spend.'],
  },
  {
    version: '0.288.0',
    date: '2026-10-31',
    title: 'Summons and shapes last across waves',
    notes: ['Summons and shapeshifts now run on a timer that carries from wave to wave (wolves and treants 60 s, werewolf form 40 s); a ring shows the time left.'],
  },
  {
    version: '0.287.0',
    date: '2026-10-31',
    title: 'New summon sprites',
    notes: ['Summons have new sprites: leaner wolves, real treants, a blue spirit wraith, a war standard with pennants and a glass decoy, each ringed in its caller\'s colour.'],
  },
  {
    version: '0.286.0',
    date: '2026-10-31',
    title: 'Hester\'s Stall: books, gear and repairs',
    notes: ['Hester\'s Stall opens at the camp: skill books to study, gear, tomes and chests. Sell what you don\'t need; gear now wears in battle and is repaired here.'],
  },
  {
    version: '0.285.0',
    date: '2026-10-31',
    title: 'The Calamity\'s battlefields come alive',
    notes: ['Six new Calamity battlefields (a fallen nave, crystal chasm, crypt rows, void bridge, ritual circle, flooded vault) with braziers, fog, runes and bats.'],
  },
  {
    version: '0.284.0',
    date: '2026-10-31',
    title: 'One of each hero on the field',
    notes: ['Only one of each hero fights at a time; a bench copy swaps in for its twin, or merges. The cursed mirror\'s clone fights in its original\'s place.'],
  },
  {
    version: '0.283.0',
    date: '2026-10-31',
    title: 'The War Horn, given at the binding',
    notes: ['The War Horn now comes in the story: when Askel is bound, the Summoner hands you the first kings\' horn, full, to blow in your next fight.'],
  },
  {
    version: '0.282.0',
    date: '2026-10-31',
    title: 'Guardians pulse from themselves',
    notes: ['A corrupted Calamity guardian\'s pulse now comes from the guardian itself, and stops the moment it falls, even with its escort still standing.'],
  },
  {
    version: '0.281.0',
    date: '2026-10-31',
    title: 'The Calamity altar made clear',
    notes: ['Each altar choice now shows what it does in numbers, consecrate and corrupt side by side. A How it works box, a Your altar summary and an altar chip in battle.'],
  },
  {
    version: '0.280.0',
    date: '2026-10-31',
    title: 'A JRPG results screen',
    notes: ['Runs end on a results screen: XP bars filling, LEVEL UP with each stat\'s gain, spoils counted up and the MVP. Between waves stays a short card.'],
  },
  {
    version: '0.279.0',
    date: '2026-10-31',
    title: 'Cinematics show what they unlocked',
    notes: ['A cinematic that opens something now ends with a card: what was unlocked, built or awakened, and where to find it. Skipping still shows it.'],
  },
  {
    version: '0.278.0',
    date: '2026-10-31',
    title: 'The Calamity\'s room comes alive',
    notes: ['Rifts swirl in the Calamity\'s room. Pick one and the party walks in through a bright flash; after a win they walk back out as the rift cards rise.'],
  },
  {
    version: '0.277.0',
    date: '2026-10-31',
    title: 'Eidolon quest: The Hound Comes Home',
    notes: ['After the Orc Warband, the Summoner at the Sanctum asks you to call Askel home: three parts, three pieces, a binding, then he answers your War Horn.'],
  },
  {
    version: '0.276.0',
    date: '2026-10-31',
    title: 'Map, walk and Paladin fixes',
    notes: ['The Calamity map no longer stays over a new fight. Heroes all walk briskly to the next section, uphill too. The Paladin\'s sprite now matches his awakened form.'],
  },
  {
    version: '0.275.0',
    date: '2026-10-31',
    title: 'Upgrades at a glance',
    notes: ['Tavern heroes ready to rank up or awaken show a gold arrow. A new Upgrades list upgrades each in one tap, or all at once; the hero sheet hops to the next.'],
  },
  {
    version: '0.274.0',
    date: '2026-10-31',
    title: 'Boss attacks without the pause',
    notes: ['A boss\'s big attack now shows a slim banner over the running fight instead of stopping it.'],
  },
  {
    version: '0.273.0',
    date: '2026-10-31',
    title: 'Story scenes, filmed',
    notes: ['Every story scene is now cut like a film: wide shots, close-ups on whoever speaks, bosses seen from below, camera moves and spoken-feeling lines.', 'New army intros and boss entrances, and each Last Stand room opens with its own short film.'],
  },
  {
    version: '0.272.0',
    date: '2026-10-31',
    title: 'The War Horn and the Eidolons',
    notes: ['The War Horn fills as you fight: boss waves and fallen foes. Blow it once a fight to call your Eidolon.', 'Each Eidolon arrives in a full scene: the circle, the tear in the sky, its face, its line, then one great attack.'],
  },
  {
    version: '0.271.0',
    date: '2026-10-31',
    title: 'Quest battles',
    notes: ['Eleven story battles from quests: named heroes must fight, a scene before and after, and losing costs nothing. They appear once you own the heroes.'],
  },
  {
    version: '0.270.0',
    date: '2026-10-31',
    title: 'Bosses hit back',
    notes: ['Bosses now unleash huge named attacks: red marks warn where they\'ll land, your heroes try to step out, and Shield, Blink and Heal can answer.', 'Bosses enrage if a fight drags on: faster, harder, wider.'],
  },
  {
    version: '0.269.0',
    date: '2026-10-31',
    title: 'Painted equipment',
    notes: ['Every weapon, armour and trinket now has a painted icon, with a frame and glow for its grade and its own look at Mythic.'],
  },
  {
    version: '0.268.0',
    date: '2026-10-30',
    title: 'Life in the tavern',
    notes: ['Every hero now has a fixed spot and pastime in the tavern: darts, cards, singing on the stage, dancing, arm-wrestling, a pint at the bar.'],
  },
  {
    version: '0.267.0',
    date: '2026-10-30',
    title: 'Hold a unit to see its card',
    notes: ['Between waves, press and hold any hero, bench card or foe to see its stats, traits, gear and every skill; bosses show their second form.'],
  },
  {
    version: '0.266.0',
    date: '2026-10-30',
    title: 'Battle music stays in battle',
    notes: ['Fight music no longer follows you to the camp: leaving mid-fight, or the victory music after a won run, now gives way to the camp\'s own music.'],
  },
  {
    version: '0.265.0',
    date: '2026-10-30',
    title: 'Kwame the Knight redrawn',
    notes: ['Kwame\'s everyday sprite now matches his awakened form: the same face and curly hair, in plain steel and blue, so awakening reads as an upgrade.'],
  },
  {
    version: '0.264.0',
    date: '2026-10-30',
    title: '130 new quests',
    notes: ['100 one-off quests and 30 that come back, from Gwen, the board, passing travellers, your heroes, the ruler, Duchess, spoils and the rift.', 'Quests can now be dropped from the log. Many have short follow-ups, and Gwen remembers what you did.'],
  },
  {
    version: '0.263.0',
    date: '2026-10-30',
    title: 'The tavern and the first quests',
    notes: ['The Heroes tab opens the tavern again. Gwen Tallow, the keeper, has quests for you, and so do passing travellers.', 'Take up to three quests from Gwen or the quest board, track one on the Battle tab, and hand them in for crowns, stones and chests.'],
  },
  {
    version: '0.262.0',
    date: '2026-10-30',
    title: 'More spell effects repainted',
    notes: ['A proper powder keg, a curling Tidal Wave, a darker Reign of Terror, and a distinct burst for twelve more moves.', 'The ultimate banner\'s speed lines run as one even band.'],
  },
  {
    version: '0.261.0',
    date: '2026-10-30',
    title: 'Skill names out of the way',
    notes: ['Skill names now show as slim banners at the left edge above the hero rows, so they no longer cover the fight.'],
  },
  {
    version: '0.260.0',
    date: '2026-10-30',
    title: 'Ultimates hit harder',
    notes: ['Ultimates land big: twice the size, a burst of their element, a freeze on the hit, a shake and new sound.', 'The banner moves now, with speed lines and the name stamping in. The camera leans in on the hero and the struck stay lit.'],
  },
  {
    version: '0.259.0',
    date: '2026-10-30',
    title: 'Bolder spell effects',
    notes: ['26 spell effects repainted to read better in a fight: the Aura of Protection, rot, daggers, storm cloud, bard\'s notes, and many moves.'],
  },
  {
    version: '0.258.0',
    date: '2026-10-30',
    title: 'Every spell painted',
    notes: ['All 131 painted spell sheets are in: the auras, the casters\' spells, and the martial, ranged and monster moves.', 'Auras show painted rings and motes instead of plain rings. Fireballs, meteors and volleys fly painted shots.'],
  },
  {
    version: '0.257.0',
    date: '2026-10-30',
    title: 'Auto keeps ultimates short',
    notes: ['With Auto on, ultimates show the quick banner instead of pausing the fight for the full scene.'],
  },
  {
    version: '0.256.0',
    date: '2026-10-30',
    title: 'A new battle screen and ultimate scenes',
    notes: ['Each hero has a row: health, SP or MP, both skills with cost and cooldown, and a pearl glow as the ultimate fills. Tap a skill to read it.', 'The fight pauses while you read a skill. The king\'s spells are now orbs under the top bar.', 'An ultimate stops the fight: the hero\'s portrait slashes across, its name pops up, the board darkens round the hero.', 'Settings, Gameplay: turn off Full ultimate scenes for a short banner with no pause.'],
  },
  {
    version: '0.255.0',
    date: '2026-10-30',
    title: 'Holding the line pays a relic',
    notes: ['Holding one more wave in the Last Stand now pays its gold and a free relic the run doesn\'t own yet.', 'The Last Stand\'s plate at the camp names the room the run is in, e.g. Wave 6 · Library.'],
  },
  {
    version: '0.254.0',
    date: '2026-10-30',
    title: 'Monsters join the spell rework',
    notes: ['The Kitsune turns foes into foxes with Mass Polymorph, the Kraken drags shooters in, and the Shambler burrows up through the crowd.', 'Every hero\'s skills now play like classic RPG spells and moves.'],
  },
  {
    version: '0.253.0',
    date: '2026-10-30',
    title: 'Casters cast like casters',
    notes: ['The Fire Wizard throws Fireballs, lays a Wall of Fire and calls a Meteor Swarm; the Lightning Mage calls a storm cloud with Call Lightning.', 'The Warlock\'s Eldritch Blast shoves foes back, the Sage raises a Font of Magic, and the Illusionist swaps places with a friend in trouble.'],
  },
  {
    version: '0.252.0',
    date: '2026-10-30',
    title: 'Archers, guns and summoners move',
    notes: ['The Archer leaps back for her Aimed Shot, the Gunslinger rolls clear, and the Rifle Bot jets to high ground.', 'Siege Bot shells and the Dread Pirate\'s Powder Keg launch foes; the Reaper drags them in before his Harvest of Souls.'],
  },
  {
    version: '0.251.0',
    date: '2026-10-30',
    title: 'Melee heroes on the move',
    notes: ['The Kunoichi blinks away in smoke, the Barbarian leaps into crowds, and the Lancer\'s Cavalry Charge rides through every foe in a line.', 'The Arc Blade\'s Lightning Storm slashes through six foes, and the Dragoon\'s Dragon Dive throws foes outward.'],
  },
  {
    version: '0.250.0',
    date: '2026-10-30',
    title: 'Tanks and supports learn new moves',
    notes: ['The Knight charges with Shield Rush, the Paladin strikes with Divine Smite and shields allies with an Aura of Protection.', 'The Juggernaut burrows and erupts with Tunnel Strike, the Peasant raises a Spear Wall, and the Tyrant drags foes in with Bane.'],
  },
  {
    version: '0.249.0',
    date: '2026-10-30',
    title: 'Healers can raise the fallen',
    notes: ['From level 10, the Cleric, High Priestess, Wanderer and Druid can revive a fallen ally mid-fight (Revivify, Resurrection, Elixir of Life, Reincarnate).', 'New healer spells: Spirit Guardians, Mass Resurrection with a Wall of Light, Healing Mist and a Wall of Thorns.'],
  },
  {
    version: '0.248.0',
    date: '2026-10-30',
    title: 'Painted spell effects, first wave',
    notes: ['Launches, shoves, pulls, burrows, walls, blinks, dashes and teleport slashes now use hand-painted effects.', 'The healers\' new spell art is loaded and ready for their coming spells.'],
  },
  {
    version: '0.247.0',
    date: '2026-10-30',
    title: 'A main theme, and a battle song for every army',
    notes: ['New battle music built on one catchy main theme, in the style of classic JRPG battle songs.', 'Every army fights to its own arrangement: orc war drums, undead organ, yokai taiko and more.', 'The victory fanfare, the results and the camp now play the theme too.'],
  },
  {
    version: '0.246.0',
    date: '2026-10-30',
    title: 'The Last Stand falls back to the throne',
    notes: ['The Last Stand now retreats through four rooms: the courtyard, the library, the chapel, and from wave 16 the throne room.', 'After waves 5, 10 and 15, fall back or hold one more, harder wave for gold.', 'Your best room reached is recorded, and the throne room earns a badge.'],
  },
  {
    version: '0.245.0',
    date: '2026-10-30',
    title: 'Heroes of many lands, and new awakened forms',
    notes: ['Fourteen heroes have new paintings to match their looks, and Kwame the Knight and Karim the Paladin no longer look alike.', 'Awakening gives each hero an upgraded form with new gear, and combat tiers show painted class auras.'],
  },
  {
    version: '0.244.0',
    date: '2026-10-30',
    title: 'The late armies fight harder',
    notes: ['The Infernal Host, the Yokai and the Golem Forge are much tougher, so they come after the first army\'s eleven stars, even when you use hearts.', 'The Tyrant\'s and the Juggernaut\'s tier 4 skills are toned down.'],
  },
  {
    version: '0.243.0',
    date: '2026-10-30',
    title: 'Groundwork for the new spells',
    notes: ['Behind the scenes: charges, teleports, pulls, knockbacks, burrowing, walls and auras are built for the heroes\' new spells.', 'Fights play exactly as before.'],
  },
  {
    version: '0.242.0',
    date: '2026-10-30',
    title: 'Every find on the wave card; earned heroes ride in',
    notes: ['The wave card lists everything a wave brought in: gear, relics, chests, shards, tomes, stones and new heroes.', 'The end recap no longer lists the run\'s spoils, which leave with the run.', 'Heroes earned by a deed now ride in on their own, with the deed named, not through the summoner.'],
  },
  {
    version: '0.241.0',
    date: '2026-10-30',
    title: 'A closer look at placement; earned helpers',
    notes: ['Each wave opens zoomed in on your placement rows, so heroes are easy to place. Pan or pinch away any time.', 'Auto merge unlocks once the second army is beaten, and Auto place once the fourth is. Until then, merge and place by hand.'],
  },
  {
    version: '0.240.0',
    date: '2026-10-30',
    title: 'Rare shards and tomes from armies',
    notes: ['Very rarely, a won army wave drops hero shards or an XP tome. Bosses and harder tiers are a little more generous.', 'A find shows as a gold line on the wave card and in the recap.'],
  },
  {
    version: '0.239.0',
    date: '2026-10-30',
    title: 'Music and sound effects in balance',
    notes: ['Every music track now plays at a matched loudness, and battle music sits under the fighting instead of over it.', 'The king\'s spells are all equally loud, quiet skill sounds are audible, and taps are a small click.'],
  },
  {
    version: '0.238.0',
    date: '2026-10-30',
    title: 'A real market and new roadside events',
    notes: ['The passing cart is a small market: gear, fight potions, a sellsword and sometimes a relic, up to three buys a visit.', 'Twelve new events between waves: a wounded scout, the Pale Lady\'s shrine, deserters, a dice game, an ambush, a forge, a cursed crown and more.', 'Some choices come back a couple of waves later.', 'Shrines and cursed paths now really change the next fight.'],
  },
  {
    version: '0.237.0',
    date: '2026-10-30',
    title: 'Night no longer darkens the battle',
    notes: ['Night, rain and ash used to dim the whole board; now the board stays bright and the mood moves to the screen\'s edges.', 'A dim from an ultimate no longer lingers after a heart restarts the wave.'],
  },
  {
    version: '0.236.0',
    date: '2026-10-29',
    title: 'Settings in submenus, and this page',
    notes: ['Settings is now a short list: Sound, Display and motion, Gameplay, Ruler and Duchess, Save and data, Developer, Updates and notes, About.', 'Updates and notes lists what changed in each version, newest first.'],
  },
  {
    version: '0.235.0',
    date: '2026-10-29',
    title: 'Titles, and an easy way back to the bench',
    notes: ['Every hero has a title, such as Kwame, Shield of the Dawn, shown on their page, the summon reveal and the codex.', 'Dragging a placed hero lights up the bench: let go anywhere over it, or flick down, to send them back.'],
  },
  {
    version: '0.234.0',
    date: '2026-10-29',
    title: 'Three army stars',
    notes: ['An army’s three stars: clear it, clear it without using a heart, and clear it within the time target.'],
  },
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
