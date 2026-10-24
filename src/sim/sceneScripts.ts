// The cinematics' scripts (the owner's ask: "Let's explore adding some cinematics"; docs/notes/cinematics.md). The types, the
// timing and the shorthands are in `sceneKit.ts`; this file holds the two pilots and gathers every other scene into
// `SCENES` (the heralds, the endings and firsts in `sceneEvents.ts`; the scenes made once for many heroes, armies and
// buildings in `sceneFamilies.ts`). Pure data: no Pixi, no DOM, no randomness.

import { close, say, tell, wide, type Scene } from './sceneKit';
import type { Area } from './board';
import { UNITS } from './units';
import { EVENT_SCENES } from './sceneEvents';
import { FAMILY_SCENES } from './sceneFamilies';

export * from './sceneKit';


/** The heroes that play the opening, which comes before the starter pick (the player has none yet): a fixed trio. */
export const OPENING_TRIO: readonly string[] = ['knight', 'samurai', 'archer'];

const PILOTS: Record<string, Scene> = {
  // ---------------------------------------------------------------- the opening: after a new save has picked its heroes
  opening: {
    id: 'opening',
    title: 'The Road Begins',
    blurb: 'Your first three heroes, and the Calamity that wants a word.',
    moment: { kind: 'starter' },
    music: 'opening',
    trio: OPENING_TRIO,
    cast: {
      front: { role: 'party:0', x: 262, facing: 'right', hidden: true },
      striker: { role: 'party:1', x: 228, facing: 'right', hidden: true },
      back: { role: 'party:2', x: 194, facing: 'right', hidden: true },
      duchess: { role: 'duchess', x: 172, facing: 'right', hidden: true },
      herald: { role: 'unit:calBoss1', x: 350, facing: 'left', hidden: true, scale: 1.4, shade: true },
    },
    shots: [
      {
        look: 'volcano',
        cam: wide(300, 190),
        to: wide(300, 215),
        fx: ['fadeIn', 'darken', 'rumble'],
        cue: 'earthRumble',
        caption: 'Long ago, and not far',
        lines: [tell('Beyond the last road, something very old woke up in a temper.'), tell('It is called the Calamity. It did not choose the name.')],
      },
      {
        look: 'highlands',
        cam: wide(250, 215),
        acts: [
          { who: 'front', enter: 262, from: 150 },
          { who: 'striker', enter: 228, from: 120 },
          { who: 'back', enter: 194, from: 90 },
        ],
        lines: [say('front', 'Right. Who is standing at the front?'), say('striker', 'You are. You are already standing there.')],
      },
      {
        cam: close(['front', 'back'], 1.5),
        caption: 'You',
        acts: [{ who: 'duchess', enter: 172, from: 110 }],
        lines: [tell('The king places them. That is you.'), tell('After that they get on with it. You may cheer, or drop a meteor.'), say('front', 'Cheering is optional. The meteors are not.'), say('duchess', 'Mehh.')],
      },
      {
        look: 'volcano',
        cam: wide(275, 215),
        acts: [{ who: 'herald', enter: 350, from: 520 }, { who: 'back', face: 'right' }],
        fx: ['shake', 'darken'],
        cue: 'boom',
        lines: [say('back', 'I should like to stand further back.'), tell('The first of six heralds was already on the road.')],
      },
    ],
  },

  // ---------------------------------------------------------------- the first Calamity boss arrives
  gorvak: {
    id: 'gorvak',
    title: 'The Ashen Road',
    blurb: 'Gorvak the Ashen, the Calamity’s first herald, keeps a very firm roadblock.',
    moment: { kind: 'calBoss', map: 1 },
    music: 'gorvak',
    cast: {
      hero: { role: 'hero', x: 285, facing: 'right', hidden: true },
      gorvak: { role: 'unit:calBoss1', x: 395, facing: 'left', hidden: true, scale: 1.5 },
      grunt: { role: 'unit:orcGrunt', x: 455, facing: 'left' },
      duchess: { role: 'duchess', x: 492, facing: 'left', hidden: true },
    },
    shots: [
      {
        look: 'volcano',
        cam: wide(335, 205),
        to: wide(325, 205),
        fx: ['fadeIn', 'darken'],
        caption: 'The first herald',
        acts: [{ who: 'hero', enter: 285, from: 185 }],
        lines: [tell('The road out of the green land runs through ash, and something sits in the middle of it.')],
      },
      {
        cam: close(['hero', 'gorvak'], 1),
        acts: [{ who: 'gorvak', enter: 395, from: 550 }],
        fx: ['rumble'],
        cue: 'boom',
        lines: [say('gorvak', 'HALT. NONE PASS THE ASHEN ROAD.', 'shout'), say('hero', 'Is there a way round?'), say('gorvak', 'THERE IS. I AM ALSO STANDING ON IT.', 'shout')],
      },
      {
        cam: close(['gorvak', 'grunt', 'duchess'], 1.5),
        acts: [{ who: 'duchess', enter: 492, from: 570, line: 2 }],
        lines: [
          say('grunt', 'You did ask us to watch the other roads, boss.'),
          say('gorvak', 'AND?'),
          say('grunt', 'We were a grunt short.'),
          say('duchess', 'Mehh.'),
          say('gorvak', 'THAT IS A GOAT.', 'shout'),
          say('grunt', 'She is covering the other roads, boss.'),
        ],
      },
      {
        cam: close('gorvak', 1.5),
        acts: [{ who: 'gorvak', pose: 'strike' }],
        fx: ['flash', 'shake'],
        cue: 'slam',
        lines: [say('gorvak', 'THEN I SHALL BURN YOU MYSELF.', 'shout'), tell('Behold the first herald. He has not had a day off since the war.')],
      },
    ],
  },
};

/* ------------------------------------------------------------ a hero earned in play */

/** The ten heroes earned by a milestone (`contentHeroes.ts`): the land the reveal stands in, what the narrator says of the milestone, and the hero's first words. */
const EARNED: Readonly<Record<string, { look: Area; why: string; says: string }>> = {
  werewolf: { look: 'forest', why: 'The Beast Packs have gone quiet. One did not run away: it came to see who had done it.', says: 'Not bad, for a pair of two-legs.' },
  reaper: { look: 'dungeon', why: 'The Undead Legion marched for a thousand years. Someone has to do the paperwork.', says: 'Your legion was due. I have merely come to collect.' },
  demonSwordsman: { look: 'volcano', why: 'The Infernal Host was very sure of itself. It was one swordsman short of being right.', says: 'I have left my old employers. The pension was dreadful.' },
  samuraiCommander: { look: 'highlands', why: 'The Night Parade has gone home. Its commander has not: he has had an idea.', says: 'A fine battle. I shall take the banner. You may keep the field.' },
  juggernaut: { look: 'dungeon', why: 'The Forge went cold. One golem stayed warm, mostly out of habit.', says: 'Forge quiet now. I carry.' },
  dreadPirate: { look: 'snow', why: 'Twenty floors up the tower, a ship’s crew came out of the stairwell.', says: 'Do not ask how we got a ship up the tower.' },
  tyrant: { look: 'dungeon', why: 'Forty floors up, the lights were on. So was a throne.', says: 'You climbed. I admire that. Now do stop hovering.' },
  timeWitch: { look: 'desert', why: 'The Calamity is over. Somebody noticed, and arrived a little late, and also a little early.', says: 'Do not worry. I have already seen how this ends.' },
  dragoon: { look: 'volcano', why: 'A Calamity at ascension three. Something with scales noticed the heat and came to compare.', says: 'Hot enough. Shall we go and bother something bigger?' },
  sage: { look: 'forest', why: 'Half the foes of the bestiary, met and noted. The notes were read by someone who disagrees.', says: 'Fascinating. You have the monsters in the wrong order.' },
};

/** The reveal of a hero earned in play: a silhouette comes on in the dark, then the hero steps into the light (one flash, once). A few seconds. */
function earnedScene(kind: string, e: { look: Area; why: string; says: string }): Scene {
  return {
    id: `earned:${kind}`,
    title: `${UNITS[kind].name} joins`,
    blurb: 'A hero earned in play, not pulled.',
    moment: { kind: 'earned', hero: kind },
    short: true,
    music: 'triumph',
    family: 'earned',
    cast: {
      figure: { role: `unit:${kind}`, x: 330, facing: 'left', hidden: true, shade: true },
      hero: { role: `unit:${kind}`, x: 330, facing: 'left', hidden: true },
    },
    shots: [
      { look: e.look, cam: wide(300, 205), to: wide(315, 208), fx: ['fadeIn', 'darken'], caption: 'A new hero', acts: [{ who: 'figure', enter: 330, from: 520 }], lines: [tell(e.why)] },
      { cam: close('hero', 1.5), acts: [{ who: 'figure', hide: true }, { who: 'hero', enter: 330, from: 330 }], fx: ['flash', 'glow'], cue: 'eliteSting', lines: [say('hero', e.says), tell('{hero} joins you.')] },
    ],
  };
}

/** The scenes of the heroes earned in play, in the roster's order. */
const EARNED_SCENES: Scene[] = Object.entries(EARNED).map(([k, e]) => earnedScene(k, e));

/** The score each scene plays under (the audio worker's tracks, `musicScore.ts`): a herald its own, the rest a shared mood. A cut-in has none: the fight's music goes on. */
const MUSIC: Record<string, string> = {
  opening: 'opening', gorvak: 'gorvak', thornWarden: 'herald2', malphas: 'herald3', hrungar: 'herald4', vorgrath: 'herald5', karnok: 'herald6',
  calamityEnds: 'triumph', firstLoss: 'comic', eliteMet: 'spire', ascensionOne: 'triumph', dailyBoss: 'spire', mythicOpens: 'triumph', duchessInFight: 'comic',
};
const STING: Record<string, Scene['sting']> = { gorvak: 'sceneBoss', thornWarden: 'sceneBoss', malphas: 'sceneBoss', hrungar: 'sceneBoss', vorgrath: 'sceneBoss', karnok: 'sceneBoss', calamityEnds: 'sceneVictory' };
const FAMILY_MUSIC: Record<string, string> = { oath: 'triumph', clear: 'triumph', awaken: 'solemn', earned: 'triumph', castle: 'comic', spire: 'spire' };

const ALL: Scene[] = [...Object.values(PILOTS), ...EVENT_SCENES, ...FAMILY_SCENES, ...EARNED_SCENES].map((c) => {
  const music = c.music ?? MUSIC[c.id] ?? (c.family ? FAMILY_MUSIC[c.family] : undefined);
  const sting = c.sting ?? (STING[c.id] ?? (c.family === 'clear' ? 'sceneVictory' : c.family === 'oath' || c.family === 'oathcut' ? 'sceneBoss' : undefined));
  return { ...c, ...(music ? { music } : {}), ...(sting ? { sting } : {}) };
});

export const SCENES: Record<string, Scene> = Object.fromEntries(ALL.map((c) => [c.id, c]));

/** Every scene in the order the Scenes list shows them. */
export const SCENE_ORDER: readonly string[] = ALL.map((c) => c.id);
