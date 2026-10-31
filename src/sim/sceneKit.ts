// The cinematics' kit: the types, the timing and the shorthands every script file uses (the owner's ask: "Let's explore adding some cinematics"; docs/notes/cinematics.md). A scene is
// data, borrowed from Chronos Settlement's cutscenes: a cast (heroes and foes drawn from their own sheets), and shots
// played in order. A shot sets the backdrop (one of the areas' painted ones), the camera (on an actor or a point, how
// close, and where it drifts to over the shot), what the actors do (walk, enter, leave, turn, strike, fall), the effects
// (a one-shot shake or flash, fades, a pall, a rumble) and the lines spoken, each by an actor or the narrator. A shot
// with no lines holds for `hold` seconds. The clock is `render/sceneClock.ts`, the player `render/sceneView.ts`, when a
// scene is queued `sceneRules.ts`. Pure data: no Pixi, no DOM, no randomness.
//
// The voice: wry and warm, in British spelling. The Calamity is a portal that ripped open over the keep, with the void beyond it
// and an invasion pouring out; the heroes take it about as seriously as a delayed train. Running gags to keep: the villains'
// staffing problems, heroes who would rather stand further back, and the king (the player), who places everyone and then only
// watches. The king is always the player; Duchess is the court's goat ("Her Grace"), never the king: a shot about the king shows
// the king (`unit:standKing`) or nobody, not her.

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
 *  hero kind); `duchess`, the goat (drawn from her own sheet, `art/duchess/goat.png`, standing or
 *  walking: she has no fighter, so `castOf` gives her none); `face:<giver>`, a quest's giver (Gwen, the pedlar, the hunter ...),
 *  not on the stage: when they speak, their face fills the picture (CINE-001; the art is `questArt.ts` `FACES`). */
export type Role = `party:${number}` | 'hero' | `unit:${string}` | 'duchess' | `face:${string}`;

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
  /** Wears the awakened look from the start (1 or 2: the step; `awakenLook.ts`). An act can change it. */
  look?: 0 | 1 | 2;
  /** The name the lines call them, where the fighter's own is not it (a quest battle's heroes by their own names, its boss by its title's name). */
  name?: string;
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
  | { who: string; look: 0 | 1 | 2 }
  | { who: string; hide: true }
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
  /** May hold `{actor id}`: that actor's name, and `*a word*`: said with weight (drawn brighter, typed a touch slower). */
  text: string;
  /** Seconds of silence after the line, before the next beat (a held breath; CINE-001). */
  beat?: number;
  /** Shouted (the box is brighter) or whispered (dimmer). */
  tone?: 'shout' | 'whisper';
  /** Seconds it stays up, where the usual beat to read it (`lineSeconds`) is too long (an oath in a quick cut-in). */
  secs?: number;
}

/* ------------------------------------------------------------ the shot language (CINE-001, docs/notes/cinematics.md) */

/** How the camera frames a shot. `wide`: the establishing view; `medium`: a figure or a pair from the knees up; `two`: two
 *  figures together; `close`: one face (a hero's painted portrait, any other figure's head drawn large); `extreme`: the eyes, or
 *  a weapon; `ots`: over the shoulder of the one listening, on the one speaking; `low`: from the ground, looking up (a boss's
 *  arrival); `high`: from above, looking down (the small and the beaten); `dutch`: tilted, for menace. */
export type Angle = 'wide' | 'medium' | 'two' | 'close' | 'extreme' | 'ots' | 'low' | 'high' | 'dutch';
/** How the camera moves over a shot: `still`; `pushIn` / `pullOut` (slowly closer, further); `pan` (sideways across the stage);
 *  `track` (with the subject as it walks); `rack` (the focus pulled from the land onto the subject, the back blurring); `snapZoom`
 *  (a sudden lunge in); `drift` (a small, slow sway); `shake` (a hand-held judder). Reduced motion holds every one still. */
export type Move = 'still' | 'pushIn' | 'pullOut' | 'pan' | 'track' | 'rack' | 'snapZoom' | 'drift' | 'shake';
/** How a shot comes in from the one before: `cut`; `match` (a cut that keeps the framing's place); `fade` (up from black);
 *  `smash` (a hard cut through black, with a hit); `flash` (through white); `dissolve` (a cross-fade; what every cut becomes
 *  with reduced motion). */
export type Cut = 'cut' | 'match' | 'fade' | 'smash' | 'flash' | 'dissolve';
/** What drifts through the air of a shot (a battery saver draws fewer, reduced motion holds them still). */
export type Weather = 'embers' | 'snow' | 'rain' | 'dust' | 'motes' | 'ash' | 'leaves' | 'none';

export interface Shot {
  /** The framing (CINE-001): left out, the director (`cineDirector.ts`) picks one from what the shot does. */
  angle?: Angle;
  /** Who the framing is on (an actor id); left out, the speaker, else the camera's `on`. */
  subject?: string;
  /** The camera's move over the shot; left out, the angle's own. */
  move?: Move;
  /** How the shot comes in; left out, a cut (a fade for the first, a dissolve when the land changes). */
  cut?: Cut;
  /** What drifts in the air; left out, the land's own (embers on a volcano, snow on the snow ...). */
  weather?: Weather;
  /** Shafts of light slanting down through the picture. */
  rays?: boolean;
  /** A reaction: a held look at someone, no words (the director's, between lines). */
  react?: boolean;
  /** A title card over the picture, like a film's: a small line over a big name ("ACT II" over "The Library"; a boss's title over
   *  its name). It comes up after the shot's first moment and stays the shot. */
  title?: { over: string; name: string };
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
  /** The shot's clock runs at this share of its pace (0.5: slow motion); a shot with nothing in it but a beat. Still when reduced motion is on. */
  slow?: number;
}

/** When a scene comes up. `starter`: a new save has just picked its first heroes. `calOpen`: the Calamity has opened (its
 *  reveal: the portal). `calBoss`: a Calamity's boss of this map is about to be fought. `calVictory`: the Calamity's last herald has fallen. `armyClear`: an army cleared for
 *  the first time. `awaken` / `earned`: a hero awakened, or joined by a milestone. `combo`: a five-unit combo's mega ultimate
 *  fires. `firstLoss`. `duchessJoins`: she joins a fight as a fighter for the first time (`duchessFight.ts`; it was her first visit to a fight's edge until DUCHESS-FIGHTS). `castle`: a build is raised. `spire`: the Last Stand's milestone
 *  waves (the old endless tower's moment, kept so a save's seen scenes still match).
 *  `bossForm`: a boss changes form mid-fight. `mythic`: Mythic opened on an army. `elite`, `ascension`,
 *  `dailyBoss`: the first of each. */
export type Moment =
  | { kind: 'starter' }
  | { kind: 'calOpen' }
  | { kind: 'calBoss'; map: number }
  | { kind: 'calVictory' }
  | { kind: 'armyClear'; army: string }
  | { kind: 'awaken'; hero: string }
  | { kind: 'earned'; hero: string }
  | { kind: 'combo'; set: string }
  | { kind: 'comboCut'; set: string }
  | { kind: 'firstLoss' }
  | { kind: 'duchessJoins' }
  | { kind: 'castle'; site: string }
  | { kind: 'spire'; floor: number }
  | { kind: 'bossForm'; boss: string }
  | { kind: 'mythic' }
  | { kind: 'elite' }
  | { kind: 'ascension' }
  | { kind: 'dailyBoss' }
  /** An army's first march on the keep (CINE-001): its warlord's entrance, the first time a run of that army is set up. */
  | { kind: 'armyIntro'; army: string }
  /** A quest battle's story, before it or after a win (`questBattleData.ts`; played by the page, not kept in the Scenes list). */
  | { kind: 'questBattle'; battle: string }
  /** An Eidolon chain's story (`eidolonChainData.ts`: the giver's prologue; played by the page, not kept in the Scenes list). */
  | { kind: 'eidolon'; chain: string };

/** A moment's key: its kind and what it is about (the map, the army, the hero ...). */
export const momentKey = (m: Moment): string => {
  const o = m as Record<string, unknown>;
  return [m.kind, o.map ?? o.army ?? o.hero ?? o.set ?? o.site ?? o.floor ?? o.boss ?? ''].join(':');
};

export interface Scene {
  id: string;
  title: string;
  /** One line for the Scenes list. */
  blurb: string;
  moment: Moment;
  /** A scene made once for many (every hero, army, building ...): the Scenes list folds the ones not yet seen into one line. */
  family?: string;
  /** Heroes that stand in for the party when the scene comes before the player has one (the opening, before the starter pick). */
  trio?: readonly string[];
  /** The scene's score (an id `render/sound.ts` `playScene` knows: `opening`, `gorvak`, `herald2` to `herald6`, `triumph`, `comic`, `solemn`, `spire`); none leaves the music as it is. */
  music?: string;
  /** A sting as the scene begins (a cue of `render/soundRules.ts`): a boss arriving, or a victory. */
  sting?: 'sceneBoss' | 'sceneVictory';
  /** A cut-in of a few seconds, not a scene (it need not reach 10 s). */
  short?: boolean;
  /** Plays every time its moment comes, not once (the short Last Oath); the Scenes list still plays it again. */
  again?: boolean;
  /** A scene of the Calamity's story: due only once the Calamity has opened (`modeOpen(m, 'calamity')`). */
  calamity?: boolean;
  /** How the scene goes out at its end (CINE-001): `smash` (a hard cut to black with a hit: into the fight), `fade` (to black), else it just ends. */
  out?: 'smash' | 'fade';
  cast: Record<string, CastMember>;
  shots: Shot[];
}

/** How long a line stays up: a beat to read it (seconds), so a scene plays through on its own; a tap moves on sooner. */
export const lineSeconds = (text: string): number => Math.min(9, 1.6 + plainText(text).length * 0.05);
/** A line's words without the emphasis marks (`*so*` is said "so", with weight). */
export const plainText = (text: string): string => text.replace(/\*/g, '');
/** A shot's hold (seconds after its lines; a shot with no lines holds 2.5 s at least). */
/** How long a line stays up: its own `secs`, else the beat to read it. */
export const lineLen = (l: Line): number => (l.secs ?? lineSeconds(l.text)) + (l.beat ?? 0);
export const holdOf = (s: Shot): number => s.hold ?? (s.lines?.length ? 0 : 2.5);
/** A whole scene's length (seconds), as played untouched (the lines are filled with names that are not counted). */
export const sceneSeconds = (c: Scene): number => c.shots.reduce((n, s) => n + (s.lines?.reduce((m, l) => m + lineLen(l), 0) ?? 0) + holdOf(s), 0);

/** A line with its `{actor}` names filled in (one left unknown stays as written). */
export const fillLine = (text: string, names: Readonly<Record<string, string>>): string => text.replace(/\{(\w+)\}/g, (all, k: string) => names[k] ?? all);

/* ------------------------------------------------------------ shorthands */

/** A line, and (CINE-001) a beat of silence after it, in seconds. */
export const say = (who: string, text: string, tone?: Line['tone'], beat?: number): Line => ({ who, text, ...(tone ? { tone } : {}), ...(beat ? { beat } : {}) });
export const tell = (text: string): Line => ({ who: 'narrator', text });
/** A wide shot round x, and a close one on someone or a pair. */
export const wide = (x: number, y = 200, zoom = 1): Cam => ({ x, y, zoom });
export const close = (on: string | string[], zoom = 1.5): Cam => ({ on, zoom });
/** A shot's framing in one go (CINE-001): `shoot('low', 'boss', 'pushIn')`. */
export const shoot = (angle: Angle, subject?: string, move?: Move, cut?: Cut): Pick<Shot, 'angle' | 'subject' | 'move' | 'cut'> => ({ angle, ...(subject ? { subject } : {}), ...(move ? { move } : {}), ...(cut ? { cut } : {}) });

