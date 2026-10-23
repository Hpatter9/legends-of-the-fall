// The cinematics' scripts (the owner's ask: "Let's explore adding some cinematics"; docs/notes/cinematics.md). A scene is
// data, borrowed from Chronos Settlement's cutscenes: a cast (heroes and foes drawn from their own sheets), and shots
// played in order. A shot sets the backdrop (one of the areas' painted ones), the camera (on an actor or a point, how
// close, and where it drifts to over the shot), what the actors do (walk, enter, leave, turn, strike, fall), the effects
// (a one-shot shake or flash, fades, a pall, a rumble) and the lines spoken, each by an actor or the narrator. A shot
// with no lines holds for `hold` seconds. The clock is `render/sceneClock.ts`, the player `render/sceneView.ts`, when a
// scene is queued `sceneRules.ts`. Pure data: no Pixi, no DOM, no randomness.
//
// The voice: wry and warm, in British spelling. The Calamity is the end of the world; the heroes take it about as
// seriously as a delayed train. Running gags to keep: the villains' staffing problems, heroes who would rather stand
// further back, and the king (the player), who places everyone and then only watches.

import type { Area } from './board';

/** The stage, in art px: a backdrop layer's size. The actors' feet stand on `FEET`. */
export const STAGE_W = 576;
export const STAGE_H = 324;
export const FEET = 262;

export type Facing = 'left' | 'right';
/** `down`: fallen and staying down; `talk`: stands as idle, breathing as they speak (every speaker does that anyway). */
export type Pose = 'idle' | 'strike' | 'cast' | 'hurt' | 'down';

/** Who an actor is, filled in when the scene is played: `party:<i>`, the i-th hero of the player's party; `hero`, the hero
 *  the run began with (the party's first when there is no run); `unit:<id>`, a fighter by its id in `UNITS` (a foe, or a
 *  hero kind); `duchess`, the goat (her art arrives with the humour branch: until then she is not drawn, and a scene
 *  that casts her plays on without her). */
export type Role = `party:${number}` | 'hero' | `unit:${string}` | 'duchess';

export interface CastMember {
  role: Role;
  x: number;
  facing: Facing;
  /** Off the stage until an act brings them on. */
  hidden?: boolean;
  /** Drawn this much bigger (a herald looming). */
  scale?: number;
  /** A black silhouette (seen against the light, or not yet introduced). */
  shade?: boolean;
}

/** Where the camera looks: at a stage point, or on an actor (their middle) or between a few. `zoom` is a multiple of
 *  the base size (1 wide, 1.5 close, 2 very close); the picture is only ever drawn at a whole-number scale, so a drift
 *  from one zoom to another steps up a whole size at its midpoint rather than blurring the pixels. */
export interface Cam {
  on?: string | string[];
  x?: number;
  y?: number;
  zoom?: number;
}

/** What an actor does in a shot: walk to x, come on to x (from a side of the stage, or from an x just out of the picture),
 *  go off a side, turn, take a pose. Any act can wait
 *  for a line (`line`: it starts as that line of the shot is spoken). */
export type Act = (
  | { who: string; walk: number }
  | { who: string; enter: number; from: Facing | number }
  | { who: string; exit: Facing }
  | { who: string; face: Facing }
  | { who: string; pose: Pose }
) & { line?: number };

/** `shake` and `flash` happen once as the shot begins (a flash is one pulse of at most half an alpha for about 120 ms; a
 *  shake follows the shake setting and reduced motion, as the fight's does); `rumble` is a faint steady tremble; `darken`
 *  and `glow` tint the picture; `fadeIn` and `fadeOut` are to and from black. Nothing loops. */
export type Fx = 'shake' | 'flash' | 'fadeIn' | 'fadeOut' | 'darken' | 'rumble' | 'glow';
/** A sound as the shot begins (a cue of `render/soundRules.ts`). */
export type SceneCue = 'boom' | 'slam' | 'eliteSting' | 'earthRumble' | 'steps';

export interface Line {
  /** An actor's id in the cast, or `narrator`. */
  who: string;
  /** May hold `{actor id}`: that actor's name. */
  text: string;
  /** Shouted (the box is brighter) or whispered (dimmer). */
  tone?: 'shout' | 'whisper';
}

export interface Shot {
  /** The backdrop: an area's painted layers; kept from the shot before if left out. */
  look?: Area;
  cam: Cam;
  /** Where the camera drifts to over the shot (a pan, a push in, a pull out). */
  to?: Cam;
  acts?: Act[];
  fx?: Fx[];
  cue?: SceneCue;
  /** A chapter card over the shot's first moments. */
  caption?: string;
  lines?: Line[];
  /** Seconds for a shot without lines (or a pause after them). */
  hold?: number;
}

/** When a scene comes up. `starter`: a new save has just picked its first heroes. `calBoss`: a Calamity's boss floor of
 *  this map is about to be fought. */
export type Moment = { kind: 'starter' } | { kind: 'calBoss'; map: number };

export interface Scene {
  id: string;
  title: string;
  /** One line for the Scenes list. */
  blurb: string;
  moment: Moment;
  cast: Record<string, CastMember>;
  shots: Shot[];
}

/** How long a line stays up: a beat to read it (seconds), so a scene plays through on its own; a tap moves on sooner. */
export const lineSeconds = (text: string): number => Math.min(9, 1.6 + text.length * 0.05);
/** A shot's hold (seconds after its lines; a shot with no lines holds 2.5 s at least). */
export const holdOf = (s: Shot): number => s.hold ?? (s.lines?.length ? 0 : 2.5);
/** A whole scene's length (seconds), as played untouched (the lines are filled with names that are not counted). */
export const sceneSeconds = (c: Scene): number => c.shots.reduce((n, s) => n + (s.lines?.reduce((m, l) => m + lineSeconds(l.text), 0) ?? 0) + holdOf(s), 0);

/** A line with its `{actor}` names filled in (one left unknown stays as written). */
export const fillLine = (text: string, names: Readonly<Record<string, string>>): string => text.replace(/\{(\w+)\}/g, (all, k: string) => names[k] ?? all);

/* ------------------------------------------------------------ shorthands */

const say = (who: string, text: string, tone?: Line['tone']): Line => ({ who, text, ...(tone ? { tone } : {}) });
const tell = (text: string): Line => ({ who: 'narrator', text });
/** A wide shot round x, and a close one on someone or a pair. */
const wide = (x: number, y = 200, zoom = 1): Cam => ({ x, y, zoom });
const close = (on: string | string[], zoom = 1.5): Cam => ({ on, zoom });

/* ------------------------------------------------------------ the scenes */

export const SCENES: Record<string, Scene> = {
  // ---------------------------------------------------------------- the opening: after a new save has picked its heroes
  opening: {
    id: 'opening',
    title: 'The Road Begins',
    blurb: 'Your first three heroes, and the Calamity that wants a word.',
    moment: { kind: 'starter' },
    cast: {
      front: { role: 'party:0', x: 262, facing: 'right', hidden: true },
      striker: { role: 'party:1', x: 228, facing: 'right', hidden: true },
      back: { role: 'party:2', x: 194, facing: 'right', hidden: true },
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
        lines: [tell('The king places them. That is you.'), tell('After that they get on with it. You may cheer, or drop a meteor.'), say('front', 'Cheering is optional. The meteors are not.')],
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
    blurb: 'Gorvak the Ashen, the Calamity’s first herald, keeps a tidy toll road.',
    moment: { kind: 'calBoss', map: 1 },
    cast: {
      hero: { role: 'hero', x: 285, facing: 'right', hidden: true },
      gorvak: { role: 'unit:calBoss1', x: 395, facing: 'left', hidden: true, scale: 1.5 },
      grunt: { role: 'unit:orcGrunt', x: 455, facing: 'left' },
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
        cam: close(['gorvak', 'grunt'], 1.5),
        lines: [say('grunt', 'You did ask us to watch the other roads, boss.'), say('gorvak', 'AND?'), say('grunt', 'We were a grunt short.')],
      },
      {
        cam: close('gorvak', 1.5),
        acts: [{ who: 'gorvak', pose: 'strike' }],
        fx: ['flash', 'shake'],
        cue: 'slam',
        lines: [say('gorvak', 'THEN I SHALL BURN THEM MYSELF.', 'shout'), tell('Behold the first herald. His ribbon is on its way.')],
      },
    ],
  },
};

/** Every scene in the order the Scenes list shows them. */
export const SCENE_ORDER: readonly string[] = ['opening', 'gorvak'];
