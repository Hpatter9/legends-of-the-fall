// CC0-SOUNDS: where every recorded sound effect comes from, and how each take is cut from its source. Every pack is CC0 1.0 (public
// domain), each checked on its own OpenGameArt page (the page's licence box shows CC0 alone; a pack offered under several licences
// was left out), and Kenney's packs come through his own OpenGameArt uploads. `fetch.mjs` downloads them, `render.mjs` cuts, levels
// and encodes the takes into src/sfx/cues/ and writes src/render/cueSampleManifest.ts (docs/notes/cc0-sounds.md).

/** The packs: the OpenGameArt page (its licence checked there), the file downloaded from it, its author, and how it is unpacked. */
export const PACKS = {
  kenneyRpg: { title: 'RPG Audio (50 RPG sound effects)', author: 'Kenney', page: 'https://opengameart.org/content/50-rpg-sound-effects', file: 'RPGsounds_Kenney.zip' },
  combat150: {
    title: '150 Combat Sound Effects', author: 'untamedpixels (gathering CC0 sounds by Kenney (Impact Sounds, RPG Audio, Sci-fi Sounds), Kronbits and lentikula)',
    page: 'https://opengameart.org/content/150-combat-sound-effects', file: '150gameeffectsounds.zip',
  },
  rpg80: { title: '80 CC0 RPG SFX', author: 'rubberduck', page: 'https://opengameart.org/content/80-cc0-rpg-sfx', file: '80-CC0-RPG-SFX_0.zip' },
  sfx100b: { title: '100 CC0 SFX #2', author: 'rubberduck', page: 'https://opengameart.org/content/100-cc0-sfx-2', file: 'sfx_100_v2.zip' },
  woodMetal: { title: '100 CC0 metal and wood SFX', author: 'rubberduck', page: 'https://opengameart.org/content/100-cc0-metal-and-wood-sfx', file: '100-CC0-wood-metal-SFX.zip' },
  breaking: { title: '75 CC0 breaking / falling / hit SFX', author: 'rubberduck', page: 'https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx', file: 'sfx_breaking_and_falling.zip' },
  bangs: { title: '25 CC0 bang / firework SFX', author: 'rubberduck', page: 'https://opengameart.org/content/25-cc0-bang-firework-sfx', file: '25-CC0-bang-sfx.zip' },
  creature: { title: '80 CC0 creature SFX', author: 'rubberduck', page: 'https://opengameart.org/content/80-cc0-creature-sfx', file: '80-CC0-creature-SFX_0.zip' },
  swords: { title: '20 sword sound effects (attacks and clashes)', author: 'StarNinjas', page: 'https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes', file: 'sword_-_starninjas_1.zip' },
  clashes: { title: '20 sword sound effects (attacks and clashes): the clashes', author: 'StarNinjas', page: 'https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes', file: 'sword_clash_-_starninjas_0.zip' },
  impacts: { title: '10 impact / shield blocks', author: 'StarNinjas', page: 'https://opengameart.org/content/10-impactshield-blocks', file: 'impact_-_starninjas.zip' },
  coins: { title: '12 coin sound effects', author: 'StarNinjas', page: 'https://opengameart.org/content/12-coin-sound-effects', file: 'coins_-_starninjas.zip' },
  dings: { title: '4 metal dings / rings', author: 'StarNinjas', page: 'https://opengameart.org/content/4-metal-dingsrings', file: 'ding_-_starninjas.zip' },
  caveIn: { title: 'Cave-in', author: 'StarNinjas', page: 'https://opengameart.org/content/cave-in', file: 'cave_in_-_starninjas.ogg' },
  crowd: { title: 'Crowd shouting / speaking ambience', author: 'StarNinjas', page: 'https://opengameart.org/content/crowd-shoutingspeaking-ambience', file: 'crowd_shouting.ogg' },
  swishes: { title: 'Swishes sound pack', author: 'artisticdude', page: 'https://opengameart.org/content/swishes-sound-pack', file: 'swishes.zip' },
  punch: { title: 'Punch', author: 'qubodup', page: 'https://opengameart.org/content/punch', file: 'qubodupPunch.7z' },
  impactQ: { title: 'Impact', author: 'qubodup', page: 'https://opengameart.org/content/impact', file: 'qubodupImpact.7z' },
  rustle: { title: '20 rustles (dry leaves)', author: 'qubodup', page: 'https://opengameart.org/content/20-rustles-dry-leaves', file: 'qubodup-rustle.7z' },
  darkMagic: { title: '3 dark magic spells', author: 'qubodup', page: 'https://opengameart.org/content/3-dark-magic-spells', file: 'dark_magic.7z' },
  drain: { title: 'Energy drain', author: 'qubodup', page: 'https://opengameart.org/content/energy-drain', file: 'qubodup-PowerDrain.ogg' },
  woodCrack: {
    title: '35 wooden cracks / hits / destructions (Independent.nu Ljudbank)', author: 'Independent.nu (uploaded by qubodup)',
    page: 'https://opengameart.org/content/35-wooden-crackshitsdestructions', file: 'independent_nu_ljudbank-wood_crack_hit_destruction.7z',
  },
  splat: {
    title: '8 wet squish / slurp impacts (Independent.nu Ljudbank)', author: 'Independent.nu (uploaded by qubodup)',
    page: 'https://opengameart.org/content/8-wet-squish-slurp-impacts', file: 'independent_nu_ljudbank-wet_squish_slurp_impacts.7z',
  },
  bones: { title: 'Bones rattle', author: 'congusbongus', page: 'https://opengameart.org/content/bones-rattle', file: 'bones_rattle.zip' },
  skeleton: { title: 'Skeleton SFX short pack', author: 'colodical', page: 'https://opengameart.org/content/skeletonsfxshortpack', file: 'skeleton1sfx_0.wav' },
  skeleton2: { title: 'Skeleton SFX short pack (second)', author: 'colodical', page: 'https://opengameart.org/content/skeletonsfxshortpack', file: 'skeleton2sfx_0.wav' },
  ice: { title: 'Ice breaking / shattering', author: 'IgnasD', page: 'https://opengameart.org/content/ice-breakingshattering', file: 'IceShatters_0.zip' },
  wind: { title: 'Wind', author: 'IgnasD', page: 'https://opengameart.org/content/wind', file: 'wind.zip' },
  tiny: { title: 'Tinysized SFX library', author: 'Vehicle (Jan Schupke)', page: 'https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx', file: 'tinysized.zip' },
  apparel: { title: 'Fantasy weapons and apparel SFX library', author: 'Vehicle (Jan Schupke)', page: 'https://opengameart.org/content/fantasy-weapons-and-apparel-sfx-library', file: 'weapons-apparel.zip' },
  bells: { title: 'Bell dings / chimes', author: 'pwl', page: 'https://opengameart.org/content/bell-dingschimes', file: 'bell_ding1.wav' },
  bubbles: { title: 'Bubble sound effects', author: 'bmaczero', page: 'https://opengameart.org/content/bubble-sound-effects', file: 'bubbles-single1.wav' },
  bubbles2: { title: 'Bubble sound effects (second)', author: 'bmaczero', page: 'https://opengameart.org/content/bubble-sound-effects', file: 'bubbles-single3.wav' },
  horn: { title: "They're coming (a generic horn sound)", author: 'stumpystrust', page: 'https://opengameart.org/content/their-coming-generic-horn-sound', file: 'theircoming.ogg' },
  wolf: { title: 'Wolf monster sound', author: 'caveboytup', page: 'https://opengameart.org/content/wolf-monster-sound', file: 'wolf_monster_5.mp3' },
  roar: { title: 'CC0 deep monster roar', author: 'trazzz123', page: 'https://opengameart.org/content/cc0-deep-monster-roar', file: 'monster_roar.wav' },
  shake: { title: 'Earthquake and open sesame', author: 'mieki256', page: 'https://opengameart.org/content/earthquake-and-open-sesame', file: 'shake.flac' },
  chunky: { title: 'Chunky explosion', author: 'Joth', page: 'https://opengameart.org/content/chunky-explosion', file: 'Chunky%20Explosion.mp3' },
  powder: { title: 'Gunshots (Black Powder)', author: 'Kurt', page: 'https://opengameart.org/content/gunshots', file: 'Black%20Powder.wav' },
  flame: { title: 'Catching fire', author: 'TheMightyGlider', page: 'https://opengameart.org/content/catching-fire', file: 'flame.ogg' },
  rock: { title: 'Breaking rock', author: 'TheMightyGlider', page: 'https://opengameart.org/content/breaking-rock', file: 'rock_break.ogg' },
  teleport: { title: 'Teleport spell', author: 'ogrebane', page: 'https://opengameart.org/content/teleport-spell', file: 'teleport.wav' },
  whoosh: { title: 'Air whoosh', author: 'pyranostudios', page: 'https://opengameart.org/content/air-whoosh', file: 'whoosh2_0.wav' },
  fuse: { title: 'Dynamite sound effect', author: 'listener', page: 'https://opengameart.org/content/dynamite-sound-effect', file: 'Dynamite%20with%20sensor.wav' },
};

/** The OpenGameArt file store every pack is downloaded from. */
export const FILES_AT = 'https://opengameart.org/sites/default/files/';

// A take: [pack, path inside the pack (or '' for a single file), options]. Options: `at` seconds into the source to start (after its
// leading silence is cut), `dur` seconds kept (faded out over its last fifth), `rate` a change of pitch and speed, `hp` a high-pass
// (Hz), `lp` a low-pass. A composite take is { mix: [[pack, path, options, startSeconds], ...] }: several cuts laid together.
const t = (pack, path, o = {}) => ({ pack, path, ...o });
const mix = (...layers) => ({ mix: layers.map(([pack, path, o, at]) => ({ ...t(pack, path, o), start: at })) });

const C150 = '';
const MELEE = `${C150}01_combat_melee/`, BLAST = `${C150}03_explosions_destruction/`, MAGIC = `${C150}04_magic_spells/`;
const K = 'OGG/';
const SW = 'swishes/swish-';
const FOOT = (n, at) => ['kenneyRpg', `${K}footstep0${n}.ogg`, { dur: 0.25 }, at];
const BOOT = (n, at) => ['apparel', `sfx/boots-leather-step-0${n}.wav`, { dur: 0.3, lp: 3000 }, at];

/** Every cue that plays a recording, with its takes (two or three for the frequent ones, so a run of them never repeats one). */
export const TAKES = {
  // the page's own
  coin: [t('rpg80', 'item_coins_01.ogg', { dur: 0.4 }), t('coins', 'coin.2.ogg', { dur: 0.35 }), t('coins', 'coin.7.ogg', { dur: 0.35 })],
  coinRecycle: [t('kenneyRpg', `${K}handleCoins2.ogg`, { dur: 0.55 }), t('rpg80', 'item_coins_02.ogg', { dur: 0.6 })],
  coinClaim: [t('kenneyRpg', `${K}handleCoins.ogg`, { dur: 0.8 }), t('rpg80', 'item_coins_04.ogg', { dur: 0.8 })],
  ledger: [t('kenneyRpg', `${K}bookFlip1.ogg`, { dur: 0.45 }), t('kenneyRpg', `${K}bookFlip2.ogg`, { dur: 0.4 }), t('kenneyRpg', `${K}bookFlip3.ogg`, { dur: 0.3 })],
  runeSlide: [t('rpg80', 'stones_04.ogg', { dur: 0.35 }), t('rpg80', 'item_stone_03.ogg', { dur: 0.35 })],
  slam: [t('woodMetal', 'wood_slam_01.ogg', { dur: 0.45 }), t('woodMetal', 'wood_slam_03.ogg', { dur: 0.45 })],
  steps: [mix(FOOT(0, 0), FOOT(3, 0.16), FOOT(6, 0.33)), mix(FOOT(1, 0), FOOT(4, 0.16), FOOT(8, 0.33))],
  kingHit: [t('combat150', `${MELEE}impact_punch_heavy_003_48kHz_16bit_0.47s_2546df80_s02.wav`, { dur: 0.45 }), t('impactQ', 'qubodupImpact/qubodupImpactMeat01.flac', { dur: 0.45 })],
  cineHit: [t('combat150', `${BLAST}low_frequency_explosion_001_48kHz_16bit_1s_a63b8c61_s04.wav`, { dur: 0.9 })],
  cineWhoosh: [t('whoosh', '', { at: 0.15, dur: 0.5 }), t('wind', 'wind/Wind3.ogg', { dur: 0.5, hp: 300 })],

  // blows: the swings
  swingLight: [t('swishes', `${SW}1.wav`), t('swishes', `${SW}4.wav`), t('swishes', `${SW}10.wav`)],
  swingSword: [t('swords', 'sword - StarNinjas/sword.3.ogg', { dur: 0.35 }), t('swords', 'sword - StarNinjas/sword.4.ogg', { dur: 0.35 }), t('swords', 'sword - StarNinjas/sword.6.ogg', { dur: 0.35 })],
  swingHeavy: [t('swishes', `${SW}7.wav`, { rate: 0.7 }), t('swishes', `${SW}8.wav`, { rate: 0.7 }), t('swishes', `${SW}9.wav`, { rate: 0.7 })],
  swingSpear: [t('swishes', `${SW}2.wav`, { rate: 1.15 }), t('swishes', `${SW}11.wav`, { rate: 1.15 }), t('swishes', `${SW}13.wav`, { rate: 1.15 })],
  swingFist: [t('swishes', `${SW}3.wav`, { rate: 0.85 }), t('swishes', `${SW}5.wav`, { rate: 0.85 }), t('swishes', `${SW}12.wav`, { rate: 0.85 })],
  // and what they land as
  hitLight: [
    t('combat150', `${MELEE}impact_punch_medium_000_48kHz_16bit_0.36s_bd322da3_s02.wav`, { dur: 0.25 }),
    t('combat150', `${MELEE}impact_punch_medium_001_48kHz_16bit_0.35s_bfeb7339_s02.wav`, { dur: 0.25 }),
    t('combat150', `${MELEE}impact_punch_medium_003_48kHz_16bit_0.36s_a434f34d_s02.wav`, { dur: 0.25 }),
  ],
  hitSword: [
    t('combat150', `${MELEE}knife_slice_48kHz_16bit_0.51s_9438a1db_s03.wav`, { dur: 0.3 }),
    t('combat150', `${MELEE}knife_slice2_48kHz_16bit_0.56s_d1b73212_s03.wav`, { dur: 0.3 }),
    t('kenneyRpg', `${K}knifeSlice2.ogg`, { dur: 0.3 }),
  ],
  hitHeavy: [
    t('combat150', `${MELEE}impact_punch_heavy_000_48kHz_16bit_0.65s_8fb58ba7_s02.wav`, { dur: 0.45 }),
    t('combat150', `${MELEE}impact_punch_heavy_001_48kHz_16bit_0.54s_fb104b0a_s02.wav`, { dur: 0.45 }),
    t('combat150', `${MELEE}impact_punch_heavy_004_48kHz_16bit_0.54s_b437d453_s02.wav`, { dur: 0.45 }),
  ],
  hitBone: [t('bones', '0.ogg'), t('bones', '3.ogg'), t('bones', '6.ogg')],
  hitFist: [t('punch', 'qubodupPunch/qubodupPunch01.flac', { dur: 0.3 }), t('punch', 'qubodupPunch/qubodupPunch03.flac', { dur: 0.3 }), t('punch', 'qubodupPunch/qubodupPunch05.flac', { dur: 0.3 })],
  hitSpear: [t('rpg80', 'blade_01.ogg', { dur: 0.25 }), t('rpg80', 'blade_02.ogg', { dur: 0.25 }), t('rpg80', 'blade_03.ogg', { dur: 0.25 })],
  crit: [t('impacts', 'impact.2.ogg', { dur: 0.5 }), t('impacts', 'impact.7.ogg', { dur: 0.5 })],
  block: [t('clashes', 'sword_clash.5.ogg', { dur: 0.45 }), t('clashes', 'sword_clash.2.ogg', { dur: 0.45 }), t('clashes', 'sword_clash.10.ogg', { dur: 0.45 })],

  // shots
  arrowFly: [t('swishes', `${SW}6.wav`, { rate: 1.4 }), t('swishes', `${SW}9.wav`, { rate: 1.4 })],
  arrowHit: [t('rpg80', 'wood_01.ogg', { dur: 0.2 }), t('rpg80', 'wood_02.ogg', { dur: 0.2 }), t('rpg80', 'wood_03.ogg', { dur: 0.2 })],
  gun: [t('powder', '', { dur: 0.6 }), t('bangs', 'shot_01.ogg', { dur: 0.45 }), t('bangs', 'shot_02.ogg', { dur: 0.4 })],
  bulletHit: [t('breaking', 'bfh1_hit_10.ogg', { dur: 0.25 }), t('breaking', 'bfh1_hit_11.ogg', { dur: 0.25 }), t('breaking', 'bfh1_hit_05.ogg', { dur: 0.25 })],
  throwBone: [t('swishes', `${SW}4.wav`, { rate: 0.8 }), t('swishes', `${SW}7.wav`, { rate: 0.8 })],
  boneClatter: [
    t('skeleton2', '', { dur: 0.4 }),
    mix(['bones', '1.ogg', {}, 0], ['bones', '4.ogg', {}, 0.05], ['bones', '7.ogg', {}, 0.1], ['bones', '9.ogg', {}, 0.16]),
  ],

  // the elements
  fireWhoosh: [t('rpg80', 'spell_fire_01.ogg', { dur: 0.45 }), t('rpg80', 'spell_fire_02.ogg', { dur: 0.45 }), t('rpg80', 'spell_fire_07.ogg', { dur: 0.45 })],
  fireBoom: [t('bangs', 'bang_01.ogg', { dur: 0.7 }), t('bangs', 'bang_02.ogg', { dur: 0.7 }), t('bangs', 'bang_07.ogg', { dur: 0.7 })],
  frostCrack: [t('ice', 'IceShatters/LedasLuzta2.ogg', { dur: 0.3 }), t('ice', 'IceShatters/LedasLuzta.ogg', { dur: 0.3 })],
  frostShatter: [t('breaking', 'bfh1_glass_breaking_02.ogg', { dur: 0.35 }), t('breaking', 'bfh1_glass_breaking_05.ogg', { dur: 0.35 })],
  crackle: [t('tiny', 'sfx-cc0/paralyzer-discharge-01.wav', { dur: 0.35 }), t('combat150', `${MAGIC}Lightning Spell Impact 2_s06.wav`, { dur: 0.35 })],
  thunder: [t('sfx100b', 'sfx100v2_thunder_01.ogg', { dur: 1.1 }), t('combat150', `${MAGIC}Lightning Spell Impact 1_s06.wav`, { dur: 1.1 })],
  holyChime: [t('bells', '', { dur: 1.0 }), t('dings', 'ding.3.ogg', { dur: 1.0 })],
  shadowHum: [t('darkMagic', 'dark_magic/fout-02.flac', { dur: 0.8 }), t('drain', '', { dur: 0.8 })],
  poisonHiss: [t('bubbles', '', { dur: 0.4 }), t('bubbles2', '', { dur: 0.4 })],
  rustle: [t('rustle', 'rustle/rustle01.flac', { dur: 0.35 }), t('rustle', 'rustle/rustle05.flac', { dur: 0.35 }), t('rustle', 'rustle/rustle09.flac', { dur: 0.35 })],
  windGust: [t('wind', 'wind/Wind3.ogg', { dur: 0.6 }), t('combat150', `${MAGIC}Wind Spell Impact 1_s07.wav`, { dur: 0.6 })],
  earthRumble: [t('shake', '', { dur: 0.9 }), t('combat150', `${MAGIC}Earth Spell Impact 1_s07.wav`, { dur: 0.9 })],
  arrowRain: [
    mix(['swishes', `${SW}6.wav`, { rate: 1.3 }, 0], ['swishes', `${SW}2.wav`, { rate: 1.2 }, 0.07], ['swishes', `${SW}9.wav`, { rate: 1.35 }, 0.15],
      ['swishes', `${SW}11.wav`, { rate: 1.25 }, 0.24], ['rpg80', 'wood_01.ogg', { dur: 0.15 }, 0.36], ['rpg80', 'wood_03.ogg', { dur: 0.15 }, 0.47]),
  ],

  // help
  heal: [t('combat150', `${MAGIC}Healing Spell Impact 1_s08.wav`, { dur: 0.6 }), t('combat150', `${MAGIC}Healing Spell Impact 4_s08.wav`, { dur: 0.6 })],
  horn: [t('horn', '', { dur: 0.75 }), t('horn', '', { at: 3.4, dur: 0.75 })],

  // moves and traps
  dash: [t('apparel', 'sfx/boots-leather-jump-01.wav', { dur: 0.25 }), t('apparel', 'sfx/boots-leather-jump-03.wav', { dur: 0.25 })],
  blink: [t('teleport', '', { dur: 0.35 })],
  trap: [t('tiny', 'sfx-cc0/handcuffs-metal-lock-01.wav', { dur: 0.3 }), t('kenneyRpg', `${K}metalLatch.ogg`, { dur: 0.3 })],

  // big moments
  ultSlash: [t('swords', 'sword - StarNinjas/sword.9.ogg', { dur: 0.7 })],
  ultImpact: [t('combat150', `${BLAST}low_frequency_explosion_000_48kHz_16bit_2s_84586419_s04.wav`, { dur: 1.4 })],
  bossSlash: [t('roar', '', { dur: 0.9, rate: 0.85 })],
  bossImpact: [t('combat150', `${BLAST}explosion_crunch_004_48kHz_16bit_1.98s_b6838d5c_s04.wav`, { dur: 1.6 })],
  bossSkill: [t('creature', 'roar_02.ogg', { dur: 0.9, rate: 0.8 })],

  // deaths
  deathBones: [t('skeleton', '', { dur: 0.6 }), mix(['bones', '2.ogg', {}, 0], ['bones', '5.ogg', {}, 0.05], ['bones', '8.ogg', {}, 0.09],
    ['bones', '0.ogg', {}, 0.15], ['bones', '6.ogg', {}, 0.22], ['bones', '3.ogg', {}, 0.3])],
  deathBurn: [t('flame', '', { dur: 0.5 }), t('combat150', `${MAGIC}Fire Spell Impact 2_s06.wav`, { dur: 0.9 })],
  deathThud: [t('breaking', 'bfh1_falling_02.ogg', { dur: 0.6 }), t('breaking', 'bfh1_falling_05.ogg', { dur: 0.6 })],
  deathStone: [t('breaking', 'bfh1_rock_breaking_01.ogg', { dur: 0.6 }), t('rock', '', { dur: 0.45 })],
  deathBlood: [t('splat', 'impsplat/impactsplat01.mp3.flac', { dur: 0.5 }), t('splat', 'impsplat/impactsplat03.mp3.flac', { dur: 0.5 })],

  // the Assault's holds
  gateHit: [t('woodMetal', 'wood_hit_01.ogg', { dur: 0.3 }), t('woodMetal', 'wood_hit_04.ogg', { dur: 0.3 }), t('woodMetal', 'wood_hit_08.ogg', { dur: 0.3 })],
  wallHit: [t('rpg80', 'item_stone_04.ogg', { dur: 0.3 }), t('rpg80', 'stones_01.ogg', { dur: 0.3 }), t('breaking', 'bfh1_rock_falling_04.ogg', { dur: 0.3 })],
  drumHit: [t('apparel', 'sfx/boots-leather-jump-02.wav', { dur: 0.3, rate: 0.6, lp: 1200 }), t('woodMetal', 'wood_slam_02.ogg', { dur: 0.35, rate: 0.7, lp: 1400 })],
  ramHit: [t('woodCrack', 'wood_impact/impactwood14.mp3.flac', { dur: 0.7 }), t('woodCrack', 'wood_impact/impactwood24.mp3.flac', { dur: 0.7 })],
  gateBreak: [t('woodCrack', 'wood_impact/crack01.mp3.flac', { dur: 1.4 }), t('woodCrack', 'wood_impact/impactwood07.mp3.flac', { dur: 1.4 })],
  wallBreak: [t('caveIn', '', { dur: 1.5 }), t('breaking', 'bfh1_rock_breaking_02.ogg', { dur: 0.9 })],
  ladderUp: [mix(['rpg80', 'wood_04.ogg', { dur: 0.2 }, 0.0], ['woodMetal', 'wood_hit_05.ogg', { dur: 0.25 }, 0.16], ['woodMetal', 'wood_hit_06.ogg', { dur: 0.2 }, 0.27])],
  ladderDown: [t('breaking', 'bfh1_wood_falling_01.ogg', { dur: 0.6 }), t('woodMetal', 'wood_falling_06.ogg', { dur: 0.6 })],
  trebLoose: [mix(['kenneyRpg', `${K}creak1.ogg`, { dur: 0.35 }, 0], ['whoosh', '', { at: 0.15, dur: 0.6 }, 0.24])],
  fuse: [t('fuse', '', { at: 0.0, dur: 1.1, hp: 1500 })],
  greatHorn: [t('horn', '', { at: 9.6, dur: 2.4 })],
  wolfHowl: [t('wolf', '', { dur: 1.5 }), t('creature', 'howl.ogg', { dur: 0.8, rate: 0.8 })],
  keepFall: [t('chunky', '', { dur: 2.8 })],
  duelWalk: [mix(BOOT(1, 0), BOOT(2, 0.3), BOOT(3, 0.58), BOOT(4, 0.84), BOOT(1, 1.08), BOOT(3, 1.3))],
  crowdCheer: [t('crowd', '', { at: 0.3, dur: 1.1 }), t('crowd', '', { at: 6.0, dur: 1.1 })],
  tugSwing: [t('kenneyRpg', `${K}creak3.ogg`, { dur: 0.4 }), t('kenneyRpg', `${K}creak2.ogg`, { dur: 0.5 })],
};

/** The cues kept synthesised, and why (the note's table is made from this; every other cue has takes above). */
export const KEPT = {
  tap: 'a 60 ms tick under every press: the synth is the smallest and crispest, and costs no file',
  summon: 'a tuned chime in the score\'s key', merge: 'a tuned chime in the score\'s key', star: 'a tuned chime', levelUp: 'a tuned fanfare',
  sparkle: 'a tuned glitter', autoStart: 'a tuned two-note cue', autoStop: 'a tuned two-note cue', autoDone: 'a tuned chord',
  setChime2: 'a tuned chord', setChime3: 'a tuned chord', runeMerge: 'a grind into a tuned chord', runeSet: 'a click into a tuned shimmer',
  boom: 'the page\'s rare generic blast, kept with the stingers it plays among',
  victory: 'a tuned stinger', defeat: 'a tuned stinger', skill: 'a tuned shimmer', spell: 'a tuned shimmer',
  twistCurse: 'a tuned stinger', twistBlessing: 'a tuned stinger', eliteSting: 'a tuned stinger', standBoss: 'a tuned stinger',
  sceneBoss: 'a scene\'s tuned stinger', sceneVictory: 'a scene\'s tuned fanfare', cineSwell: 'a tuned swell under a reveal',
  blipQuill: 'a voice\'s blip: must be a 50 ms texture under the words', blipHero: 'a voice\'s blip', blipBoss: 'a voice\'s blip',
  blipBeast: 'a voice\'s blip', blipKing: 'a voice\'s blip', blipGoat: 'a voice\'s blip',
  miss: 'a faint fwip under the blows: a recorded swish reads as another swing',
  bow: 'no CC0 recording of a bow\'s release in the allowed sources (the packs have only arrows drawn and put back)',
  shell: 'a casing\'s 140 ms tinkle: tiny and high, the synth fits',
  meteorFall: 'a falling whistle timed to the meteor\'s flight; no CC0 recording matches',
  shieldHum: 'a ward\'s hum: a tone, nothing to record', pipes: 'a tuned four-note phrase',
  ultimate: 'a tuned chord blast', kingCast: 'only holds voices for a spell\'s own files', kingSpell: 'only holds voices for a spell\'s own files',
  riseSummon: 'the summoning\'s tuned build-up', stingSummon: 'the summoning\'s tuned stinger',
  deathLight: 'two falling bell notes, tuned',
  weakPoint: 'a tap into two tuned notes', drumSilenced: 'a drum\'s note falling, tuned', hostMarch: 'drums under a tuned horn call',
  lastHold: 'a tuned bell and chord', warEnd: 'a tuned peal and chord',
  ultCharge: 'a riser timed to the ultimate\'s opening to the frame', ultSlow: 'the slow beat timed to the blow',
};
