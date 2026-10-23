// The cinematics made once for many: the first clear of each army (nine), a hero awakening (all 45), a hero earned
// through play (the ten content heroes), a castle build (each building), the endless tower's milestone floors, and a
// boss changing form (a cut-in of a few seconds, each time). Each family is one shape filled in from a table, so a new
// army, hero or building is a row, not a script. Pure data; it imports only the kit, the fighters' table and the lore
// (not the armies or the battle, which load this file's way round).

import { HERO_STORY } from './codexLore';
import { say, tell, wide, close, type Scene } from './sceneKit';
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
    army: 'orcs', name: 'Orc Warband', area: 'highlands', boss: 'orcWarlord', escort: 'orcGrunt',
    setup: 'The Orc Warlord went down on one knee, which is the orcish for “a setback”.',
    last: 'THIS IS NOT THE END. WRITE THAT DOWN.',
    remark: 'Who has the pen, boss?',
    gloat: ['He will need a bigger pen.', 'Shall we tell his mother, or will the grunts?'],
    tail: 'The orcs held a meeting about who would tell the Warlord’s mother. The heroes waited politely.',
  },
  {
    army: 'undead', name: 'Undead Legion', area: 'dungeon', boss: 'lichKing', escort: 'skeleton',
    setup: 'The Lich King fell apart with great dignity, and then a little more.',
    last: 'DEATH IS NOT THE END. ...HOLD ON, I AM ON HOLD WITH THE AFTERLIFE.',
    remark: 'Press one for “defeated”, my liege.',
    gloat: ['I always thought he sounded busy.', 'Is it rude to hang up on a skeleton?'],
    tail: 'The legion filed away in good order. Several kept their appointments with the afterlife.',
  },
  {
    army: 'beasts', name: 'Beast Packs', area: 'snow', boss: 'boarKing', escort: 'wolfWhite',
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
    army: 'labyrinth', name: 'The Labyrinth', area: 'dungeon', boss: 'minotaurChampion', escort: 'mazeMino1',
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
    army: 'yokai', name: 'Yokai Night Parade', area: 'forest', boss: 'oniKing', escort: 'yokaiFox',
    setup: 'The Oni King lifted his drum, hit it once, and nothing happened.',
    last: 'THE THUNDER DRUM... HAS LOST ITS STICKS.',
    remark: 'We lent them to the tengu, my king.',
    gloat: ['A drum is only as good as its sticks.', 'The parade was lovely, and now it is over.'],
    tail: 'The night parade packed up its lanterns and went home by the long way, singing a little.',
  },
  {
    army: 'golems', name: 'Golem Forge', area: 'desert', boss: 'forgeTitan', escort: 'stoneGolem',
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

/* ------------------------------------------------------------ a hero earned through play */

interface Earned {
  kind: string;
  /** The deed, as the narrator puts it. */
  how: string;
  arrive: string;
  reply: string;
}

const EARNED: Earned[] = [
  { kind: 'werewolf', how: 'For clearing the Beast Packs, {hero} has joined.', arrive: 'I was the one in the pack who bit people. Do you need that?', reply: 'Constantly.' },
  { kind: 'reaper', how: 'For clearing the Undead Legion on Hard, {hero} has joined.', arrive: 'I am told there is a vacancy at the front.', reply: 'It is the whole job.' },
  { kind: 'demonSwordsman', how: 'For clearing the Infernal Host on Hard, {hero} has joined.', arrive: 'Hell was overstaffed. I took a sideways step.', reply: 'We have a sideways step spare.' },
  { kind: 'samuraiCommander', how: 'For clearing the Yokai Night Parade on Elite, {hero} has joined.', arrive: 'I have come to command. Who is first?', reply: 'The goat does not take orders.' },
  { kind: 'juggernaut', how: 'For clearing the Golem Forge on Hard, {hero} has joined.', arrive: 'I used to be a forge. I got up and left. Is that all right?', reply: 'As long as you leave the door the way you found it.' },
  { kind: 'dreadPirate', how: 'For climbing twenty floors, {hero} has joined.', arrive: 'I hear there is a tower. I have come about the treasure.', reply: 'There is no treasure. There are floors.' },
  { kind: 'tyrant', how: 'For climbing forty floors, {hero} has joined.', arrive: 'Forty floors. I was above all of them. It was lonely.', reply: 'We have a spare chair.' },
  { kind: 'timeWitch', how: 'For ending a Calamity, {hero} has joined.', arrive: 'I have been here before. I am about to be late.', reply: 'You are on time, as it happens.' },
  { kind: 'dragoon', how: 'For ending a Calamity at ascension three, {hero} has joined.', arrive: 'Three ascents. I only came for the view.', reply: 'How was it?' },
  { kind: 'sage', how: 'For meeting half the bestiary, {hero} has joined.', arrive: 'I have read about everyone in this room.', reply: 'Is it flattering?' },
];

const earnedScene = (e: Earned, i: number): Scene => ({
  id: `earned:${e.kind}`,
  title: `${UNITS[e.kind].name}: Arrival`,
  blurb: 'A hero earned through play walks in, and the others make room.',
  moment: { kind: 'earned', hero: e.kind },
  family: 'earned',
  cast: {
    hero: { role: `unit:${e.kind}`, x: 285, facing: 'left', hidden: true },
    a: { role: 'party:0', x: 215, facing: 'right', hidden: true },
    b: { role: 'party:1', x: 175, facing: 'right', hidden: true },
    duchess: { role: 'duchess', x: 130, facing: 'right', hidden: true },
  },
  shots: [
    {
      look: AWAKE_AREAS[i % AWAKE_AREAS.length],
      cam: wide(240, 205),
      fx: ['fadeIn'],
      caption: 'A new hero',
      acts: [{ who: 'a', enter: 215, from: 130 }, { who: 'b', enter: 175, from: 90 }, { who: 'hero', enter: 285, from: 450 }],
      lines: [tell(e.how)],
    },
    {
      cam: close(['hero', 'a', 'b'], 1.5),
      acts: [{ who: 'a', face: 'right' }, { who: 'b', walk: 160, line: 1 }],
      lines: [say('hero', e.arrive), say('a', e.reply)],
    },
    {
      cam: close(['a', 'hero', 'duchess'], 1.5),
      acts: [{ who: 'duchess', enter: 130, from: 40 }],
      lines: [say('b', 'Someone make room. Someone ask about the sandwiches.'), say('duchess', 'Mehh.'), tell('The sandwiches were, in the end, adequate.')],
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
  { boss: 'orcWarlord', area: 'highlands', line: 'WAAAGH! Burn it all down!' },
  { boss: 'lichKing', area: 'dungeon', line: 'Rise, my legion, and take them!' },
  { boss: 'boarKing', area: 'snow', line: 'Out of my way, little ones!' },
  { boss: 'forestBoss3', area: 'forest', line: 'The grove answers me!' },
  { boss: 'minotaurChampion', area: 'dungeon', line: 'The maze closes. There is no way out.' },
  { boss: 'hornedOgre', area: 'highlands', line: 'The mountain does not fall!' },
  { boss: 'demonLord', area: 'volcano', line: 'Burn, all of you!' },
  { boss: 'oniKing', area: 'forest', line: 'Hear the thunder drum!' },
  { boss: 'forgeTitan', area: 'desert', line: 'The forge runs white-hot!' },
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

/* ------------------------------------------------------------ the lot */

export const FAMILY_SCENES: Scene[] = [
  ...CLEARS.map(clearScene),
  ...ALL_HEROES.map((k, i) => awakenScene(k, i)),
  ...EARNED.map(earnedScene),
  ...BUILDS.map(buildScene),
  ...SPIRES.map(spireScene),
  ...FORMS.map(formScene),
];

/** The names of the families, for the Scenes list. */
export const FAMILY_NAMES: Record<string, string> = {
  clear: 'The armies’ last stands',
  awaken: 'Awakenings',
  earned: 'Heroes earned',
  castle: 'The castle going up',
  spire: 'The tower’s milestones',
  form: 'Bosses changing form',
};
