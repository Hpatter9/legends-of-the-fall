// The cinematics' scripts (the owner's ask: "Let's explore adding some cinematics"; docs/notes/cinematics.md). The types, the
// timing and the shorthands are in `sceneKit.ts`; this file holds the two pilots and gathers every other scene into
// `SCENES` (the Calamity's reveal, the heralds, the endings and firsts in `sceneEvents.ts`; the scenes made once for many heroes, armies and
// buildings in `sceneFamilies.ts`). Pure data: no Pixi, no DOM, no randomness.

import { close, say, tell, wide, type Scene } from './sceneKit';
import type { Area } from './board';
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
    blurb: 'Your three brave pioneers meet the king, the court goat and the first army on the road.',
    moment: { kind: 'starter' },
    music: 'opening',
    trio: OPENING_TRIO,
    cast: {
      front: { role: 'party:0', x: 262, facing: 'right', hidden: true },
      striker: { role: 'party:1', x: 228, facing: 'right', hidden: true },
      back: { role: 'party:2', x: 194, facing: 'right', hidden: true },
      king: { role: 'unit:standKing', x: 150, facing: 'right', hidden: true, scale: 1.2 },
      duchess: { role: 'duchess', x: 300, facing: 'left', hidden: true },
      warlord: { role: 'unit:orcWarlord', x: 380, facing: 'left', hidden: true, scale: 1.4, shade: true },
    },
    shots: [
      {
        look: 'warcamp',
        cam: wide(300, 190),
        to: wide(300, 215),
        fx: ['fadeIn', 'darken', 'rumble'],
        cue: 'earthRumble',
        caption: 'A rather bleak dawn',
        lines: [tell('Every army in the land is marching on the Last Keep. Some brought packed lunches.')],
      },
      {
        look: 'highlands',
        cam: wide(250, 215),
        acts: [
          { who: 'front', enter: 262, from: 150 },
          { who: 'striker', enter: 228, from: 120 },
          { who: 'back', enter: 194, from: 90 },
        ],
        lines: [say('front', 'Right. Who gets the honour of the sharp end?'), say('striker', 'You do. You are literally standing on it.')],
      },
      {
        cam: close(['king', 'back'], 1.5),
        caption: 'The Crown',
        acts: [{ who: 'king', enter: 150, from: 60 }],
        lines: [tell('The king of the Last Keep places the heroes. That is you.'), tell('After that, they scrap. Applaud, or drop a meteor.'), say('back', 'Applause is lovely, majesty. We prefer the meteor.')],
      },
      {
        cam: close(['front', 'duchess'], 1.5),
        acts: [{ who: 'duchess', enter: 300, from: 380 }],
        lines: [say('duchess', 'Mehh.'), tell('Duchess, the court goat: Her Grace, not the king. She disagrees.')],
      },
      {
        look: 'warcamp',
        cam: wide(290, 215),
        acts: [{ who: 'warlord', enter: 380, from: 540 }, { who: 'back', face: 'right' }],
        fx: ['shake', 'darken'],
        cue: 'boom',
        lines: [say('back', 'I should like to stand three miles further back.'), tell('The first army was on the road.')],
      },
    ],
  },

  // ---------------------------------------------------------------- the first Calamity boss arrives
  gorvak: {
    id: 'gorvak',
    title: 'The Ashen Road',
    blurb: 'Gorvak the Ashen, the Calamity\'s first herald, keeps a very firm roadblock in the void.',
    moment: { kind: 'calBoss', map: 1 },
    calamity: true,
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
        lines: [tell('Past the portal lies the void, with a road of soot and something on it.')],
      },
      {
        cam: close(['hero', 'gorvak'], 1),
        acts: [{ who: 'gorvak', enter: 395, from: 550 }],
        fx: ['rumble'],
        cue: 'boom',
        lines: [say('gorvak', 'HALT! NONE PASS THE ASHEN ROAD!', 'shout'), say('hero', 'Is there a way round?'), say('gorvak', 'THERE IS. I AM STANDING ON THAT TOO.', 'shout')],
      },
      {
        cam: close(['gorvak', 'grunt', 'duchess'], 1.5),
        acts: [{ who: 'duchess', enter: 492, from: 570, line: 2 }],
        lines: [
          say('grunt', 'You did say watch the side lanes, boss.'),
          say('gorvak', 'AND?!'),
          say('grunt', 'We were a grunt short. Compassionate leave.'),
          say('duchess', 'Mehh.'),
          say('gorvak', 'THAT IS AN UNLICENSED GOAT!', 'shout'),
          say('grunt', 'She is covering the side lanes, boss.'),
        ],
      },
      {
        cam: close('gorvak', 1.5),
        acts: [{ who: 'gorvak', pose: 'strike' }],
        fx: ['flash', 'shake'],
        cue: 'slam',
        lines: [say('gorvak', 'THEN I SHALL BURN YOU ALL MYSELF!', 'shout'), tell('Behold the first herald. He has had no tea break since the war.')],
      },
    ],
  },
};

/* ------------------------------------------------------------ a hero earned in play */

/** The ten heroes earned by a milestone (`contentHeroes.ts`): the land the reveal stands in, what the narrator says of the milestone, and the hero's first words. */
const EARNED: Readonly<Record<string, { look: Area; title: string; blurb: string; why: string; says: string }>> = {
  werewolf: { look: 'forest', title: 'Werewolf Enlists', blurb: 'A formidable beast earned through conquest rather than recruitment.', why: 'The Beast Packs dispersed into the hills. One lingered behind to inspect who had achieved it.', says: 'Not half bad, for a couple of hairless bipeds in dented tin.' },
  reaper: { look: 'dungeon', title: 'Reaper Enlists', blurb: 'A collector of debts earned through persistence in the field.', why: 'The Undead Legion marched for an age. Someone has to sign the receipts.', says: 'Your host was overdue. I have merely come to tally the remains.' },
  demonSwordsman: { look: 'volcano', title: 'Demon Swordsman Enlists', blurb: 'A cursed blade changes masters after a dispute over wages.', why: 'The Infernal Host boasted of its vanguard. It was one swordsman short.', says: 'I have left my old employers. The pension was atrocious.' },
  samuraiCommander: { look: 'highlands', title: 'Samurai Commander Enlists', blurb: 'A decorated tactician decides to align his banner with a superior formation.', why: 'The Night Parade departed into the mist. Its commander stayed to propose an alliance.', says: 'A splendid drill. I claim the silk banner; you may keep the turf.' },
  juggernaut: { look: 'dungeon', title: 'Juggernaut Enlists', blurb: 'A walking fortress decides to lend its bulk to the keep\'s defence.', why: 'The Golem Forge went stone cold. One living rampart remained warm, largely out of stubborn habit.', says: 'Forge quiet now. Stone marches. I carry the luggage.' },
  dreadPirate: { look: 'snow', title: 'Dread Pirate Enlists', blurb: 'A ghost ship runs aground at the breach and its crew offer to hold the walls.', why: 'Twenty waves held at the Last Stand. A corsair crew came ashore to see who was holding.', says: 'Do not ask how we sailed a brigantine through a hole in your wall.' },
  tyrant: { look: 'dungeon', title: 'Tyrant Enlists', blurb: 'An imperial magistrate descends from his high dais to offer supervision.', why: 'Forty waves round one throne. Then a second throne arrived, with a tyrant on it.', says: 'Forty waves round your throne. I respect the stamina. Now cease hovering and bow.' },
  timeWitch: { look: 'desert', title: 'Time Witch Enlists', blurb: 'A temporal sorceress arrives precisely when she intended, which is yesterday.', why: 'The Calamity was subdued. Somebody noted the disturbance and arrived slightly ahead of time.', says: 'Fret not regarding the future. I have already read the final chapter.' },
  dragoon: { look: 'volcano', title: 'Queen Dragoon Enlists', blurb: 'An aerial monarch investigates a sudden plume of volcanic heat.', why: 'The Calamity reached ascension three. Something with scales came to see.', says: 'Adequately toasty. Shall we find something larger to annoy?' },
  sage: { look: 'forest', title: 'Great Sage Enlists', blurb: 'A senior scholar reviews the bestiary and points out several errors.', why: 'Half the monsters of the known world catalogued. An academic read the notes.', says: 'Fascinating. You have three beasts in completely the wrong genus.' },
};

/** The reveal of a hero earned in play: a silhouette comes on in the dark, then the hero steps into the light (one flash, once). A few seconds. */
function earnedScene(kind: string, e: { look: Area; title: string; blurb: string; why: string; says: string }): Scene {
  return {
    id: `earned:${kind}`,
    title: e.title,
    blurb: e.blurb,
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
  opening: 'opening', calamityOpens: 'gorvak', gorvak: 'gorvak', thornWarden: 'herald2', malphas: 'herald3', hrungar: 'herald4', vorgrath: 'herald5', karnok: 'herald6',
  calamityEnds: 'triumph', firstLoss: 'comic', eliteMet: 'spire', ascensionOne: 'triumph', dailyBoss: 'spire', mythicOpens: 'triumph', duchessJoins: 'comic',
};
const STING: Record<string, Scene['sting']> = { calamityOpens: 'sceneBoss', gorvak: 'sceneBoss', thornWarden: 'sceneBoss', malphas: 'sceneBoss', hrungar: 'sceneBoss', vorgrath: 'sceneBoss', karnok: 'sceneBoss', calamityEnds: 'sceneVictory' };
const FAMILY_MUSIC: Record<string, string> = { oath: 'triumph', clear: 'triumph', awaken: 'solemn', earned: 'triumph', castle: 'comic', spire: 'spire' };

const ALL: Scene[] = [...Object.values(PILOTS), ...EVENT_SCENES, ...FAMILY_SCENES, ...EARNED_SCENES].map((c) => {
  const music = c.music ?? MUSIC[c.id] ?? (c.family ? FAMILY_MUSIC[c.family] : undefined);
  const sting = c.sting ?? (STING[c.id] ?? (c.family === 'clear' ? 'sceneVictory' : c.family === 'oath' || c.family === 'oathcut' ? 'sceneBoss' : undefined));
  return { ...c, ...(music ? { music } : {}), ...(sting ? { sting } : {}) };
});

export const SCENES: Record<string, Scene> = Object.fromEntries(ALL.map((c) => [c.id, c]));

/** Every scene in the order the Scenes list shows them. */
export const SCENE_ORDER: readonly string[] = ALL.map((c) => c.id);
