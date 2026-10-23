// The cinematics made once for many: the first clear of each army (nine), a hero awakening (all 45), a castle build (each building), the endless tower's milestone floors, and a
// boss changing form (a cut-in of a few seconds, each time). Each family is one shape filled in from a table, so a new
// army, hero or building is a row, not a script. Pure data; it imports only the kit, the fighters' table and the lore
// (not the armies or the battle, which load this file's way round).

import { HERO_STORY } from './codexLore';
import { say, tell, wide, close, type Scene, type Shot } from './sceneKit';
import type { Area } from './board';
import { ALL_HEROES, UNITS } from './units';

/* ------------------------------------------------------------ the first clear of each army */

interface ArmyClear {
  army: string;
  name: string;
  area: Area;
  /** The army's last boss, and one of its escort (fighter ids). */
  boss: string;
  escort: string;
  /** What the narrator says as the boss kneels, the boss's last words, the escort's remark, the heroes' gloat, the closing line. */
  setup: string;
  last: string;
  remark: string;
  gloat: [string, string];
  tail: string;
}

const CLEARS: ArmyClear[] = [
  {
    army: 'orcs', name: 'Orc Warband', area: 'warcamp', boss: 'orcWarlord', escort: 'orcGrunt',
    setup: 'The Orc Warlord went down on one knee, which is the orcish for “a setback”.',
    last: 'THIS IS NOT THE END. WRITE THAT DOWN.',
    remark: 'Who has the pen, boss?',
    gloat: ['He will need a bigger pen.', 'Shall we tell his mother, or will the grunts?'],
    tail: 'The orcs held a meeting about who would tell the Warlord’s mother. The heroes waited politely.',
  },
  {
    army: 'undead', name: 'Undead Legion', area: 'graveyard', boss: 'lichKing', escort: 'skeleton',
    setup: 'The Lich King fell apart with great dignity, and then a little more.',
    last: 'DEATH IS NOT THE END. ...HOLD ON, I AM ON HOLD WITH THE AFTERLIFE.',
    remark: 'Press one for “defeated”, my liege.',
    gloat: ['I always thought he sounded busy.', 'Is it rude to hang up on a skeleton?'],
    tail: 'The legion filed away in good order. Several kept their appointments with the afterlife.',
  },
  {
    army: 'beasts', name: 'Beast Packs', area: 'plains', boss: 'boarKing', escort: 'wolfWhite',
    setup: 'The Boar King does not kneel. He was simply examining the ground very closely.',
    last: 'A BOAR KING NEVER FALLS. HE ONLY... INSPECTS.',
    remark: 'The pack would like a word about the inspection.',
    gloat: ['Good boy. Stay.', 'He is a very large boar to be so sorry for himself.'],
    tail: 'The pack drifted off across the snow, looking over their shoulders, a bit embarrassed.',
  },
  {
    army: 'wildwood', name: 'The Wildwood', area: 'forest', boss: 'forestBoss3', escort: 'groveSatyr1',
    setup: 'The Grove Spearlord leant on his spear, which was not what it was for.',
    last: 'THE GROVE WILL HAVE WORDS WITH YOU.',
    remark: 'The grove is out. Can I take a message?',
    gloat: ['Tell the grove we left a note.', 'It was a very nice grove, though.'],
    tail: 'Somewhere in the wood, a tree took it personally. The rest of the leaves rustled in agreement.',
  },
  {
    army: 'labyrinth', name: 'The Labyrinth', area: 'temple', boss: 'minotaurChampion', escort: 'mazeMino1',
    setup: 'The Minotaur Champion sat down heavily at the centre of his labyrinth.',
    last: 'THE MAZE... YOU WALKED STRAIGHT THROUGH IT.',
    remark: 'We did put up a sign, boss. It said “this way”.',
    gloat: ['It did say “this way”.', 'We did not like to be rude and go the other.'],
    tail: 'The maze was handed a new sign. It reads: “Under new management, mostly lost”.',
  },
  {
    army: 'ogres', name: 'Ogre Clans', area: 'highlands', boss: 'hornedOgre', escort: 'clanOgre',
    setup: 'The Horned Ogre swayed once, like a mountain thinking about it, and sat.',
    last: 'THE MOUNTAIN DOES NOT... WHAT IS FOR LUNCH?',
    remark: 'It is soup, boss. We argued about it earlier.',
    gloat: ['I vote we call lunch a draw.', 'The soup was a bit of a distraction.'],
    tail: 'The ogres broke for lunch. It lasted until quite late in the afternoon.',
  },
  {
    army: 'infernal', name: 'Infernal Host', area: 'volcano', boss: 'demonLord', escort: 'hellImp',
    setup: 'The Demon Lord was beaten, and was the sort of beaten that has a contract.',
    last: 'I SHALL BE BACK. I HAVE IT IN WRITING.',
    remark: 'The small print says Thursday, my lord.',
    gloat: ['Terms and conditions apply.', 'He always did read the footnotes.'],
    tail: 'The imps filed an appeal. It was stamped, signed and thrown in the lava.',
  },
  {
    army: 'yokai', name: 'Yokai Night Parade', area: 'shrine', boss: 'oniKing', escort: 'yokaiFox',
    setup: 'The Oni King lifted his drum, hit it once, and nothing happened.',
    last: 'THE THUNDER DRUM... HAS LOST ITS STICKS.',
    remark: 'We lent them to the tengu, my king.',
    gloat: ['A drum is only as good as its sticks.', 'The parade was lovely, and now it is over.'],
    tail: 'The night parade packed up its lanterns and went home by the long way, singing a little.',
  },
  {
    army: 'golems', name: 'Golem Forge', area: 'forge', boss: 'forgeTitan', escort: 'stoneGolem',
    setup: 'The Forge Titan stood up very slowly, then stopped, as a kettle does.',
    last: 'FORGE... COOLING. PLEASE DO NOT TOUCH. IT IS STILL HOT.',
    remark: 'He means it, he is quite warm.',
    gloat: ['We will let it cool, then.', 'Mind the sparks. Mind the floor, also.'],
    tail: 'The golems stood very still. It was hard to say whether this was grief or a power cut.',
  },
];

const clearScene = (c: ArmyClear): Scene => ({
  id: `clear:${c.army}`,
  title: `${c.name}: The Last Stand`,
  blurb: `The first time the ${c.name} fall, with their boss’s last words and the heroes’ reply.`,
  moment: { kind: 'armyClear', army: c.army },
  family: 'clear',
  cast: {
    boss: { role: `unit:${c.boss}`, x: 400, facing: 'left', scale: 1.5 },
    escort: { role: `unit:${c.escort}`, x: 480, facing: 'left', hidden: true },
    hero: { role: 'party:0', x: 280, facing: 'right', hidden: true },
    mate: { role: 'party:1', x: 240, facing: 'right', hidden: true },
    duchess: { role: 'duchess', x: 190, facing: 'right', hidden: true },
  },
  shots: [
    {
      look: c.area,
      cam: close(['hero', 'boss'], 1),
      fx: ['fadeIn', 'darken'],
      caption: `${c.name} cleared`,
      acts: [{ who: 'hero', enter: 280, from: 200 }, { who: 'mate', enter: 240, from: 160 }, { who: 'boss', pose: 'hurt' }],
      lines: [tell(c.setup), say('boss', c.last, 'shout')],
    },
    {
      cam: close(['boss', 'escort'], 1.5),
      acts: [{ who: 'escort', enter: 480, from: 575 }],
      fx: ['rumble'],
      lines: [say('escort', c.remark)],
    },
    {
      cam: close(['hero', 'mate', 'duchess'], 1.5),
      acts: [{ who: 'duchess', enter: 190, from: 90, line: 2 }, { who: 'hero', pose: 'strike', line: 0 }],
      lines: [say('hero', c.gloat[0]), say('mate', c.gloat[1]), say('duchess', 'Mehh.')],
    },
    {
      cam: wide(330, 205),
      acts: [{ who: 'boss', pose: 'down' }],
      fx: ['fadeOut'],
      cue: 'boom',
      lines: [tell(c.tail)],
    },
  ],
});

/* ------------------------------------------------------------ a hero awakened */

/** What the awakened one says: one pool, handed round by the hero's place in the roster so no two neighbours repeat. */
const AWAKE_QUIPS = [
  'I feel taller. I may be wrong about that.',
  'Is it meant to be this bright?',
  'I think my hair has done something.',
  'Was that the light, or was that me?',
  'I have a feeling I should say something grand.',
  'The same as before, but with more drama.',
  'Does anyone have a mirror? Asking for a friend.',
  'That tickled.',
];

/** A hero's story trimmed to its first sentence, for a line (the whole story is too long to read in a scene). */
const firstSentence = (kind: string): string => {
  const first = (HERO_STORY[kind] ?? '').split(/(?<=[.!?])\s/)[0] ?? '';
  return first.length >= 20 && first.length <= 100 ? first : '{hero} has a story. It is a good one, and it is not short.';
};

const AWAKE_AREAS: Area[] = ['highlands', 'forest', 'snow', 'desert', 'volcano', 'dungeon'];

const awakenScene = (kind: string, i: number): Scene => ({
  id: `awaken:${kind}`,
  title: `${UNITS[kind].name}: Awakening`,
  blurb: 'A hero’s awakening: the light, the new look, and a word in character.',
  moment: { kind: 'awaken', hero: kind },
  family: 'awaken',
  cast: {
    hero: { role: `unit:${kind}`, x: 285, facing: 'right', hidden: true },
    duchess: { role: 'duchess', x: 215, facing: 'right', hidden: true },
  },
  shots: [
    {
      look: AWAKE_AREAS[i % AWAKE_AREAS.length],
      cam: close('hero', 1.5),
      fx: ['fadeIn', 'darken'],
      caption: 'Awakening',
      acts: [{ who: 'hero', enter: 285, from: 215 }],
      lines: [tell(firstSentence(kind))],
    },
    {
      cam: close('hero', 2),
      fx: ['glow', 'flash'],
      cue: 'boom',
      acts: [{ who: 'hero', look: 1 }, { who: 'hero', pose: 'cast' }],
      lines: [say('hero', AWAKE_QUIPS[i % AWAKE_QUIPS.length])],
    },
    {
      cam: close(['hero', 'duchess'], 1.5),
      fx: ['glow'],
      acts: [{ who: 'hero', look: 1 }, { who: 'duchess', enter: 215, from: 130 }],
      lines: [tell('{hero} is awakened. The new look is not for the faint-hearted.'), say('duchess', 'Mehh.')],
    },
  ],
});

/* ------------------------------------------------------------ a castle build */

interface Build {
  site: string;
  name: string;
  joke: string;
}

const BUILDS: Build[] = [
  { site: 'treasury', name: 'Treasury', joke: 'The coins were counted twice. It came to more the second time.' },
  { site: 'barracks', name: 'Barracks', joke: 'There is room for everyone, so long as everyone is friendly.' },
  { site: 'armoury', name: 'Armoury', joke: 'Every hook is labelled. The labels are on a hook.' },
  { site: 'mageTower', name: 'Mage Tower', joke: 'It came out taller than the plans. The stairs take the blame.' },
  { site: 'stable', name: 'Stable', joke: 'Duchess has inspected it, and found it to be an acceptable stable.' },
  { site: 'library', name: 'Library', joke: 'Silence, please. That is a request, not a rule.' },
  { site: 'chapel', name: 'Chapel', joke: 'A very small bell, but a sincere one.' },
];

const buildScene = (b: Build): Scene => ({
  id: `castle:${b.site}`,
  title: `The ${b.name} Goes Up`,
  blurb: `The builders finish the ${b.name}, and begin a long argument about the roof.`,
  moment: { kind: 'castle', site: b.site },
  family: 'castle',
  cast: {
    mason: { role: 'unit:peasant', x: 250, facing: 'right', hidden: true },
    sawyer: { role: 'unit:peasant', x: 310, facing: 'left', hidden: true },
    duchess: { role: 'duchess', x: 360, facing: 'left', hidden: true },
  },
  shots: [
    {
      look: 'highlands',
      cam: wide(290, 205),
      fx: ['fadeIn'],
      caption: `${b.name} raised`,
      acts: [{ who: 'mason', enter: 250, from: 150 }, { who: 'sawyer', enter: 310, from: 440 }],
      lines: [tell(`After a great deal of hammering, the ${b.name} stood.`), say('mason', `That is the ${b.name} done.`)],
    },
    {
      cam: close(['mason', 'sawyer'], 1.5),
      lines: [say('sawyer', 'The roof is crooked.'), say('mason', 'It is a statement.'), say('sawyer', 'It is a very leaky statement.')],
    },
    {
      cam: close(['sawyer', 'duchess'], 1.5),
      acts: [{ who: 'duchess', enter: 360, from: 450 }],
      lines: [tell(b.joke), say('duchess', 'Mehh.')],
    },
  ],
});

/* ------------------------------------------------------------ the endless tower */

const SPIRES: { floor: number; title: string; lines: [string, string, string] }[] = [
  { floor: 10, title: 'It Was Shorter From Outside', lines: ['The tower opens its tenth floor, and it is a good deal taller on the inside.', 'It was shorter from outside.', 'Everything is, from outside.'] },
  { floor: 25, title: 'A Taller Hat', lines: ['Twenty-five floors, and the tower has built itself a taller hat.', 'I thought we were nearly at the top.', 'The top has been moved. It sends its regrets.'] },
  { floor: 50, title: 'The Stairs Wave', lines: ['Fifty floors. The stairs have started to wave at people.', 'I do not think the stairs should be doing that.', 'It is only being friendly. I think.'] },
];

const spireScene = (f: (typeof SPIRES)[number]): Scene => ({
  id: `spire:${f.floor}`,
  title: `Floor ${f.floor}: ${f.title}`,
  blurb: `The endless tower, at floor ${f.floor}.`,
  moment: { kind: 'spire', floor: f.floor },
  family: 'spire',
  cast: {
    hero: { role: 'hero', x: 275, facing: 'right', hidden: true },
    mate: { role: 'party:1', x: 235, facing: 'right', hidden: true },
    duchess: { role: 'duchess', x: 190, facing: 'right', hidden: true },
  },
  shots: [
    {
      look: 'dungeon',
      cam: wide(260, 195),
      to: wide(260, 215),
      fx: ['fadeIn', 'darken', 'rumble'],
      caption: `Floor ${f.floor}`,
      acts: [{ who: 'hero', enter: 275, from: 190 }, { who: 'mate', enter: 235, from: 150 }],
      lines: [tell(f.lines[0])],
    },
    {
      cam: close(['hero', 'mate'], 1.5),
      lines: [say('hero', f.lines[1]), say('mate', f.lines[2])],
    },
    {
      cam: close(['mate', 'duchess'], 1.5),
      acts: [{ who: 'duchess', enter: 190, from: 100 }],
      lines: [say('duchess', 'Mehh.'), tell('The goat had, as ever, been up this far before.')],
    },
  ],
});

/* ------------------------------------------------------------ a boss changes form */

interface Form {
  boss: string;
  area: Area;
  /** The words of the boss's second form: the same as `PHASE2` in `bossPhases.ts` (a test holds them equal). */
  line: string;
}

const FORMS: Form[] = [
  { boss: 'orcWarlord', area: 'warcamp', line: 'WAAAGH! Burn it all down!' },
  { boss: 'lichKing', area: 'graveyard', line: 'Rise, my legion, and take them!' },
  { boss: 'boarKing', area: 'plains', line: 'Out of my way, little ones!' },
  { boss: 'forestBoss3', area: 'forest', line: 'The grove answers me!' },
  { boss: 'minotaurChampion', area: 'temple', line: 'The maze closes. There is no way out.' },
  { boss: 'hornedOgre', area: 'highlands', line: 'The mountain does not fall!' },
  { boss: 'demonLord', area: 'volcano', line: 'Burn, all of you!' },
  { boss: 'oniKing', area: 'shrine', line: 'Hear the thunder drum!' },
  { boss: 'forgeTitan', area: 'forge', line: 'The forge runs white-hot!' },
  { boss: 'calBoss1', area: 'volcano', line: 'The ashes remember!' },
  { boss: 'calBoss2', area: 'forest', line: 'The thorns bloom!' },
  { boss: 'calBoss3', area: 'dungeon', line: 'Come, my court!' },
  { boss: 'calBoss4', area: 'snow', line: 'The mountain walks!' },
  { boss: 'calBoss5', area: 'desert', line: 'Let the last flame take you!' },
  { boss: 'calBoss6', area: 'volcano', line: 'There is no end but me.' },
];

/** The beat before a boss's new form, slowed to half pace, then its words. About three seconds all told; the page holds the fight meanwhile. */
const SLOW_BEAT = 0.7;

const formScene = (f: Form): Scene => ({
  id: `form:${f.boss}`,
  title: `${UNITS[f.boss].name}: Second Form`,
  blurb: 'A boss changes form, a few seconds in slow motion.',
  moment: { kind: 'bossForm', boss: f.boss },
  family: 'form',
  short: true,
  again: true,
  cast: { boss: { role: `unit:${f.boss}`, x: 290, facing: 'left', scale: 1.6 } },
  shots: [
    { look: f.area, cam: close('boss', 1.5), to: close('boss', 2), acts: [{ who: 'boss', pose: 'hurt' }], fx: ['darken'], cue: 'boom', hold: SLOW_BEAT, slow: 0.5 },
    { cam: close('boss', 2), acts: [{ who: 'boss', pose: 'cast' }], fx: ['flash', 'glow'], lines: [say('boss', f.line, 'shout')] },
  ],
});

/* ------------------------------------------------------------ the Last Oath: a set of five's mega move */

interface Oath {
  /** The set's id in `combos.ts` and its name (a test holds them equal). */
  set: string;
  name: string;
  area: Area;
  /** One line from each of the five, in the order of the set's heroes, and one the five say together. */
  oaths: [string, string, string, string, string];
  shared: string;
}

const OATHS: Oath[] = [
  { set: 'holyOrder', name: 'The Holy Order', area: 'highlands', oaths: ['I hold the line. Again.', 'I swear, and I mean it.', 'I swear, but gently.', 'The light keeps its word.', 'I was only passing. Fine.'], shared: 'By the light, together.' },
  { set: 'arcaneCouncil', name: 'The Arcane Council', area: 'dungeon', oaths: ['I swear. Nothing is on fire.', 'I swear, with a bang.', 'I swear. It is footnoted.', 'I swear. Terms apply.', 'I swore this already. Soon.'], shared: 'By star and storm, as one.' },
  { set: 'shadowClan', name: 'The Shadow Clan', area: 'forest', oaths: ['My blade, my word.', 'You will not see me swear.', 'I swear. No weapon needed.', 'Caw. That means yes.', 'I swear, for the usual fee.'], shared: 'Unseen, unbroken, together.' },
  { set: 'fleet', name: 'The Black Fleet', area: 'snow', oaths: ['Yo ho. I swear it.', 'I swear on my best hat.', 'Aye, by the tide.', 'OATH. LOADED.', 'I swear. Quickly, mind.'], shared: 'One fleet, one flag.' },
  { set: 'wildHunt', name: 'The Wild Hunt', area: 'forest', oaths: ['The pack swears with me.', 'Awoo. Yes. That is an oath.', 'I swear by root and rain.', 'I swear. Quietly.', 'I swear, and here is a verse.'], shared: 'One pack, one hunt.' },
  { set: 'nightParade', name: 'The Night Parade', area: 'forest', oaths: ['I swear. Mostly.', 'I swear on the mountain.', 'Look me in the eye. I swear.', 'I swear. Pass the wine.', 'I swear. Or do I?'], shared: 'One parade, a hundred spirits.' },
  { set: 'ironVanguard', name: 'The Iron Vanguard', area: 'highlands', oaths: ['I swear. I do not stop.', 'I swear. Also, charge.', 'I swear, point first.', 'I SWEAR LOUDLY.', 'I command it. We swear.'], shared: 'Shoulder to shoulder, forward.' },
  { set: 'dreadCourt', name: 'The Dread Court', area: 'dungeon', oaths: ['I swear. I rule the oath.', 'I swear. It is on the list.', 'I swear. Hell is overstaffed.', 'Uhhhh.', 'I swore this long ago.'], shared: 'The court is in session.' },
];

/** The five, in a line-up: the cast of both versions (the page fills them with the five who cast the move). */
const FIVE = ['a', 'b', 'c', 'd', 'e'] as const;
const lineUp = (): Scene['cast'] => Object.fromEntries(FIVE.map((k, i) => [k, { role: `party:${i}` as const, x: 224 + i * 28, facing: 'right' as const }]));
const OATH_SECS = 1.8;

/** The fuller version, the first time a set fires: the line-up, then a line from each of the five (about ten seconds). */
const oathScene = (o: Oath): Scene => ({
  id: `oath:${o.set}`,
  title: `${o.name}: Last Oath`,
  blurb: `The first time ${o.name} fire their Last Oath, each of the five swears.`,
  moment: { kind: 'combo', set: o.set },
  family: 'oath',
  cast: lineUp(),
  shots: [
    { look: o.area, cam: wide(280, 205, 1), fx: ['fadeIn', 'darken'], caption: `${o.name} · Last Oath`, cue: 'boom', hold: 1.2 },
    ...FIVE.map((k, i): Shot => ({
      cam: close(k, 1.5),
      acts: [{ who: k, pose: 'cast' }],
      lines: [{ who: k, text: o.oaths[i], secs: OATH_SECS }],
    })),
  ],
});

/** The short version, every later time: the line-up and the five swearing as one (about three seconds). The fight is held while it plays. */
const oathCut = (o: Oath): Scene => ({
  id: `oathcut:${o.set}`,
  title: `${o.name}: Last Oath (short)`,
  blurb: `${o.name} fire their Last Oath: a few seconds, every time.`,
  moment: { kind: 'comboCut', set: o.set },
  family: 'oathcut',
  short: true,
  again: true,
  cast: lineUp(),
  shots: [
    { look: o.area, cam: wide(280, 205, 1), fx: ['darken'], caption: `${o.name} · Last Oath`, hold: 1.2 },
    { cam: wide(280, 205, 1), to: wide(280, 200, 1.5), acts: FIVE.map((k) => ({ who: k, pose: 'cast' as const })), fx: ['flash', 'glow'], lines: [{ who: 'c', text: o.shared, secs: OATH_SECS }] },
  ],
});

/* ------------------------------------------------------------ the lot */

export const FAMILY_SCENES: Scene[] = [
  ...CLEARS.map(clearScene),
  ...ALL_HEROES.map((k, i) => awakenScene(k, i)),
  ...BUILDS.map(buildScene),
  ...SPIRES.map(spireScene),
  ...FORMS.map(formScene),
  ...OATHS.map(oathScene),
  ...OATHS.map(oathCut),
];

/** The sets' oaths, for the test that holds them to `combos.ts`. */
export const OATH_SETS: readonly { set: string; name: string }[] = OATHS;

/** The names of the families, for the Scenes list. */
export const FAMILY_NAMES: Record<string, string> = {
  clear: 'The armies’ last stands',
  awaken: 'Awakenings',
  earned: 'Heroes earned',
  castle: 'The castle going up',
  spire: 'The tower’s milestones',
  form: 'Bosses changing form',
  oath: 'The Last Oaths',
  oathcut: 'The Last Oaths, in short',
};
