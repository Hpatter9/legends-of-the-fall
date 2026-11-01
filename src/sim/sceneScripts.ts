// The cinematics' scripts (the owner's ask: "Let's explore adding some cinematics"; docs/notes/cinematics.md). The types, the
// timing and the shorthands are in `sceneKit.ts`; this file holds the two pilots and gathers every other scene into
// `SCENES` (the Calamity's reveal, the heralds, the endings and firsts in `sceneEvents.ts`; the scenes made once for many heroes, armies and
// buildings in `sceneFamilies.ts`). Pure data: no Pixi, no DOM, no randomness.

import { close, say, shoot, tell, wide, type Scene } from './sceneKit';
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
    blurb: 'The Last Keep stands alone. Three defenders, one desperate crown, and a strategic goat.',
    moment: { kind: 'starter' },
    music: 'opening',
    trio: OPENING_TRIO,
    // (v2, docs/notes/opening-v2.md: one backdrop, the highlands over the warcamp, from the first shot to the last; the ruler commands
    // from the rear while the three hold the pass, so the placing is told in the story and not as a lesson. The king's lines are the
    // player's ruler's, whoever that is: "majesty" and "Rulers" fit any, and `rulerWords` turns the rest.)
    cast: {
      front: { role: 'party:0', x: 260, facing: 'right', hidden: true },
      striker: { role: 'party:1', x: 220, facing: 'right', hidden: true },
      back: { role: 'party:2', x: 180, facing: 'right', hidden: true },
      king: { role: 'unit:standKing', x: 120, facing: 'right', hidden: true, scale: 1.2 },
      duchess: { role: 'duchess', x: 155, facing: 'right', hidden: true },
      warlord: { role: 'unit:orcWarlord', x: 390, facing: 'left', hidden: true, scale: 1.4, shade: true },
    },
    shots: [
      {
        look: 'highlands',
        cam: wide(300, 195),
        to: wide(300, 220),
        fx: ['fadeIn', 'darken', 'rumble'],
        cue: 'earthRumble',
        caption: 'The Outer Marches',
        ...shoot('wide', undefined, 'pan'),
        title: { over: 'Legends of', name: 'The Last Keep' },
        lines: [
          tell('Every kingdom has fallen. Every fortress has burned.'),
          { ...tell('Only the Last Keep remains standing. And the road to its gate is wide open.'), beat: 0.8 },
        ],
      },
      {
        look: 'highlands',
        cam: wide(240, 215),
        acts: [
          { who: 'front', enter: 260, from: 80 },
          { who: 'striker', enter: 220, from: 50 },
          { who: 'back', enter: 180, from: 20 },
        ],
        lines: [
          say('front', 'Good news: the view from the ridge is magnificent.', undefined),
          say('back', 'Bad news: thirty thousand orcs are marching through the view.', undefined),
          say('striker', 'Then we do not need to aim. Every strike finds flesh.', undefined),
        ],
      },
      {
        cam: close(['king', 'duchess'], 1.4),
        caption: 'The Crown',
        acts: [{ who: 'king', enter: 120, from: 20 }, { who: 'duchess', enter: 155, from: 55 }],
        lines: [
          say('king', 'Hold this pass, soldiers! The entire realm rests upon your shoulders!', 'shout'),
          say('duchess', 'Baaaah.', undefined),
          say('king', '...Her Grace Duchess reminds me that the realm is already gone. Just hold the road.', undefined),
        ],
      },
      {
        cam: close(['king', 'front'], 1.3),
        ...shoot('ots', 'front', 'drift'),
        lines: [
          say('king', 'I will direct your positions from the rear. Standard tactical doctrine.', undefined),
          say('front', 'You take the point, majesty. We will applaud from the ramparts.', undefined),
          say('king', 'Rulers are not aerodynamically designed for frontline combat.', undefined),
        ],
      },
      {
        look: 'highlands',
        cam: wide(290, 215),
        acts: [{ who: 'warlord', enter: 390, from: 540 }, { who: 'front', face: 'right' }, { who: 'striker', face: 'right' }, { who: 'back', face: 'right' }],
        ...shoot('low', 'warlord', 'pushIn', 'smash'),
        fx: ['shake', 'darken'],
        cue: 'boom',
        hold: 2,
      },
      { cam: close('back'), ...shoot('close', 'back', 'snapZoom'), lines: [say('back', 'That one is roughly the size of a tavern.', undefined)] },
      {
        cam: wide(290, 205),
        ...shoot('high', undefined, 'pullOut', 'dissolve'),
        lines: [say('striker', 'Steel ready.', undefined), say('front', 'Brace the line!', 'shout'), { ...tell('Place your champions.'), beat: 0.8 }],
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
        ...shoot('wide', undefined, 'track'),
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
        ...shoot('low', 'gorvak', 'snapZoom', 'flash'),
        acts: [{ who: 'gorvak', pose: 'strike' }],
        fx: ['flash', 'shake'],
        cue: 'slam',
        lines: [say('gorvak', 'THEN I SHALL BURN YOU ALL MYSELF!', 'shout'), tell('Behold the first herald. He has had no tea break since the war.')],
      },
    ],
  },
};

/* ------------------------------------------------------------ a hero earned in play */

/** The ten heroes earned in play (`contentHeroes.ts`; each by a hero quest's end since SECRET-HEROES and HERO-TALES-2): the land the reveal stands in, what the narrator says of the milestone, and the hero's first words. */
const EARNED: Readonly<Record<string, { look: Area; title: string; blurb: string; why: string; says: string }>> = {
  werewolf: { look: 'forest', title: 'Werewolf Enlists', blurb: 'A formidable beast earned through conquest rather than recruitment.', why: 'Old Maud\'s fold is quiet again. Her lodger has come in from the dark at last.', says: 'Not half bad, for a couple of hairless bipeds in dented tin.' },
  reaper: { look: 'dungeon', title: 'Reaper Enlists', blurb: 'A collector of debts earned through persistence in the field.', why: 'The thirteenth bell is quiet. The visitor at the chapel gate has closed the ledger.', says: 'Your host was overdue. I have merely come to tally the remains.' },
  demonSwordsman: { look: 'volcano', title: 'Demon Swordsman Enlists', blurb: 'A cursed blade changes masters after a dispute over wages.', why: 'The Host\'s collectors went home empty-handed. The customer from Lantern Row has redeemed his blade.', says: 'I have left my old employers. The pension was atrocious.' },
  samuraiCommander: { look: 'highlands', title: 'Samurai Commander Enlists', blurb: 'A decorated tactician decides to align his banner with a superior formation.', why: 'A hundred lanterns burned till dawn. The soldier under the banner is done holding.', says: 'A splendid drill. I claim the silk banner; you may keep the turf.' },
  juggernaut: { look: 'dungeon', title: 'Juggernaut Enlists', blurb: 'A walking fortress decides to lend its bulk to the keep\'s defence.', why: 'The Foreman stopped counting. The walker from the Forge set down its door and came to the fire.', says: 'Forge quiet now. Stone marches. I carry the luggage.' },
  dreadPirate: { look: 'snow', title: 'Dread Pirate Enlists', blurb: 'A captain fished out of the moat in chains signs on for a wage and a share.', why: 'The spring tide went out of the moat. The prisoner in chains stayed behind, laughing.', says: 'Twice drowned. Third time, I fancy, it will be somebody else.' },
  tyrant: { look: 'dungeon', title: 'Tyrant Enlists', blurb: 'An imperial magistrate descends from his high dais to offer supervision.', why: 'The appeal was dismissed. The one on the second throne has stood up at last.', says: 'Court is adjourned. I shall sit with you now. Cease hovering, and bow.' },
  timeWitch: { look: 'desert', title: 'Time Witch Enlists', blurb: 'A temporal sorceress arrives precisely when she intended, which is yesterday.', why: 'Every clock struck the hour at once. Yesterday\'s visitor is back, as she said.', says: 'Fret not regarding the future. I have already read the final chapter.' },
  dragoon: { look: 'volcano', title: 'Queen Dragoon Enlists', blurb: 'An aerial monarch investigates a sudden plume of volcanic heat.', why: 'The net-men are off the crags. The rider by the scorched nest has come down.', says: 'Adequately toasty. Shall we find something larger to annoy?' },
  sage: { look: 'forest', title: 'Great Sage Enlists', blurb: 'A senior scholar reviews the bestiary and points out several errors.', why: 'The fallen star is back in its gap. The star-counter has come down off the roof.', says: 'Fascinating. You have three beasts in completely the wrong genus.' },
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
