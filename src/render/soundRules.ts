// The rules behind the battle's sound, kept free of Web Audio and the DOM so the tests can check them: which sounds a
// tick's events call for (`cuesFor`), and the mixing that keeps a busy fight from turning to noise (`Mixer`: a
// cooldown per sound, a limit on how many play at once, a little random pitch, and quieter at ×2 speed). The sounds
// themselves are made in `sound.ts`.

import type { Battle, BattleEvent, Unit } from '../sim/battle';
import { defOf } from '../sim/battle';
import { kitOf } from '../sim/abilities';
import type { Shot } from '../sim/units';
import { BIG_FOE_HP } from './skillFx';
import { SPELL_ELEMENT, deathKind, impactElement, missileOf, skillElement, type Element } from './fxRules';

/** Every sound the page can make. The first group is the page's own (taps, summons, stingers); the rest are the fight's. */
export type Cue =
  | 'tap' | 'summon' | 'merge' | 'coin' | 'star' | 'levelUp' | 'boom' | 'victory' | 'defeat' | 'skill' | 'spell'
  // blows: the swing, then what it lands as
  | 'swingLight' | 'swingSword' | 'swingHeavy' | 'swingSpear' | 'swingFist'
  | 'hitLight' | 'hitSword' | 'hitHeavy' | 'hitBone' | 'hitFist' | 'hitSpear' | 'crit' | 'block' | 'miss'
  // shots
  | 'bow' | 'arrowFly' | 'arrowHit' | 'gun' | 'shell' | 'bulletHit' | 'throwBone' | 'boneClatter'
  // the elements
  | 'fireWhoosh' | 'fireBoom' | 'frostCrack' | 'frostShatter' | 'crackle' | 'thunder' | 'holyChime' | 'shadowHum' | 'poisonHiss' | 'rustle'
  | 'windGust' | 'earthRumble' | 'meteorFall' | 'arrowRain'
  // help
  | 'heal' | 'shieldHum' | 'horn' | 'pipes'
  // moves and traps
  | 'dash' | 'blink' | 'trap'
  // big moments
  | 'ultimate' | 'bossSkill'
  // the summoning hall's build-up and stinger, and a ribbon slamming in
  | 'riseSummon' | 'stingSummon' | 'slam'
  // deaths
  | 'deathBones' | 'deathBurn' | 'deathThud' | 'deathStone' | 'deathBlood' | 'deathLight'
  // the tower: footsteps on the stairs, a twist's reveal (dark or bright), an elite's sting, a relic set's chime (two pieces, three)
  | 'steps' | 'twistCurse' | 'twistBlessing' | 'eliteSting' | 'setChime2' | 'setChime3'
  // the menus: coins from a recycle and from a claim, a lucky hire's sparkle, an auto-replay's start, stop and finish
  | 'coinRecycle' | 'coinClaim' | 'sparkle' | 'autoStart' | 'autoStop' | 'autoDone'
  // the cinematics' stings, for any scene to reuse: a boss arriving, and a victory
  | 'sceneBoss' | 'sceneVictory'
  // the Last Stand: a boss wave is coming, and the king takes a hit
  | 'standBoss' | 'kingHit';

/** How a sound mixes. `gap`: least ms (real time) between two of it. `ms`: how long it rings, which is how long it holds
 *  its voices. `weight`: voices it uses. `prio`: 0 may be dropped first when the mix is full, 3 always plays. `gain`: its
 *  level against the rest. */
export interface CueSpec {
  gap: number;
  ms: number;
  weight: number;
  prio: 0 | 1 | 2 | 3;
  gain: number;
}

const c = (gap: number, ms: number, weight: number, prio: 0 | 1 | 2 | 3, gain = 1): CueSpec => ({ gap, ms, weight, prio, gain });

export const CUES: Record<Cue, CueSpec> = {
  tap: c(60, 60, 1, 1, 1),
  summon: c(60, 600, 2, 2),
  merge: c(60, 900, 3, 2),
  coin: c(80, 400, 1, 1),
  star: c(120, 300, 2, 1),
  levelUp: c(200, 700, 3, 2),
  boom: c(0, 1000, 3, 3),
  victory: c(0, 1500, 4, 3),
  defeat: c(0, 2000, 4, 3),
  skill: c(150, 400, 3, 1),
  spell: c(200, 400, 2, 1),
  steps: c(300, 600, 2, 1),
  twistCurse: c(400, 900, 2, 2),
  twistBlessing: c(400, 900, 2, 2),
  eliteSting: c(0, 1400, 3, 3),
  standBoss: c(0, 1600, 3, 3),
  kingHit: c(350, 500, 2, 2),
  sceneBoss: c(0, 3000, 2, 2),
  sceneVictory: c(0, 3000, 2, 2),
  setChime2: c(0, 1200, 3, 2),
  setChime3: c(0, 1800, 4, 3),
  coinRecycle: c(100, 600, 2, 1),
  coinClaim: c(100, 800, 2, 1),
  sparkle: c(150, 900, 2, 1),
  autoStart: c(0, 400, 1, 2),
  autoStop: c(0, 600, 2, 2),
  autoDone: c(0, 1000, 3, 2),

  swingLight: c(110, 120, 1, 0, 0.8),
  swingSword: c(110, 160, 1, 0, 0.9),
  swingHeavy: c(160, 320, 2, 1),
  swingSpear: c(130, 140, 1, 0, 0.8),
  swingFist: c(110, 100, 1, 0, 0.8),
  hitLight: c(80, 150, 2, 1),
  hitSword: c(80, 200, 2, 1),
  hitHeavy: c(120, 400, 3, 2),
  hitBone: c(80, 200, 2, 1),
  hitFist: c(80, 200, 2, 1),
  hitSpear: c(80, 160, 2, 1),
  crit: c(100, 500, 3, 2),
  block: c(120, 300, 2, 2),
  miss: c(150, 150, 1, 0, 0.7),

  bow: c(90, 200, 2, 1),
  arrowFly: c(90, 250, 1, 0, 0.8),
  arrowHit: c(70, 100, 1, 0, 0.9),
  gun: c(120, 300, 3, 2),
  shell: c(150, 200, 1, 0),
  bulletHit: c(100, 200, 1, 0),
  throwBone: c(110, 250, 1, 0),
  boneClatter: c(100, 350, 2, 1),

  fireWhoosh: c(200, 400, 2, 1),
  fireBoom: c(140, 600, 3, 2),
  frostCrack: c(140, 250, 2, 1),
  frostShatter: c(140, 300, 3, 2),
  crackle: c(120, 350, 2, 1),
  thunder: c(300, 1000, 3, 2),
  holyChime: c(140, 800, 3, 1),
  shadowHum: c(200, 700, 2, 1),
  poisonHiss: c(160, 450, 2, 1),
  rustle: c(160, 350, 2, 0),
  windGust: c(200, 500, 2, 1),
  earthRumble: c(200, 800, 2, 2),
  meteorFall: c(0, 900, 2, 3),
  arrowRain: c(300, 700, 2, 1),

  heal: c(150, 500, 3, 1),
  shieldHum: c(250, 600, 2, 1),
  horn: c(400, 700, 2, 2),
  pipes: c(400, 600, 2, 1),

  dash: c(120, 250, 1, 0),
  blink: c(150, 250, 2, 1),
  trap: c(200, 300, 2, 1),

  ultimate: c(600, 1400, 6, 3),
  bossSkill: c(500, 900, 4, 3),

  riseSummon: c(0, 2300, 4, 3),
  stingSummon: c(0, 1800, 4, 3),
  slam: c(0, 700, 2, 3),

  deathBones: c(140, 600, 3, 2),
  deathBurn: c(160, 900, 3, 2),
  deathThud: c(160, 600, 3, 2),
  deathStone: c(160, 600, 3, 2),
  deathBlood: c(140, 500, 2, 1),
  deathLight: c(160, 700, 2, 1),
};

/** One sound to make: `delay` ms after the event (a meteor's boom is when it lands), `gain` on top of the sound's own. */
export interface Cued {
  cue: Cue;
  delay?: number;
  gain?: number;
}

/* ------------------------------------------------------------------ events to sounds */

/** The element's own sound, for a spell, a skill's wind-up or a hit of that element. */
function elementCue(el: Element): Cue {
  switch (el) {
    case 'fire': return 'fireWhoosh';
    case 'ice': return 'frostCrack';
    case 'lightning': return 'crackle';
    case 'light': return 'holyChime';
    case 'dark': return 'shadowHum';
    case 'forest': return 'rustle';
    case 'poison': return 'poisonHiss';
    case 'earth': return 'earthRumble';
    case 'wind': return 'windGust';
    case 'blood': return 'swingHeavy';
  }
}

export type Weight = 'light' | 'sword' | 'heavy' | 'spear' | 'fist' | 'bone';

/** How a fighter's weapon sounds, from its name (the same split the slashes use): clubs, axes and claws are heavy, spears
 *  thrust, fists thump, the skeletons clack, daggers and claws of the quick are light, and the rest are swords. */
export function weightOf(name: string): Weight {
  if (/skeleton/i.test(name)) return 'bone';
  if (/ogre|brute|minotaur|warlord|demon lord|boar|werewolf|barbarian|treant|forest boss|gorgon|juggernaut|tyrant|siege bot|shambler|dire wolf/i.test(name)) return 'heavy';
  if (/monk/i.test(name)) return 'fist';
  if (/spear|peasant|yamabushi|staff|cleric|lancer|dragoon/i.test(name)) return 'spear';
  if (/kunoichi|karasu|kitsune|imp|assassin|illusionist|decoy|reaper|arc blade|buccaneer|mercenary/i.test(name)) return 'light';
  return 'sword';
}

const SWING: Record<Weight, Cue> = { light: 'swingLight', sword: 'swingSword', heavy: 'swingHeavy', spear: 'swingSpear', fist: 'swingFist', bone: 'swingSword' };
const HIT: Record<Weight, Cue> = { light: 'hitLight', sword: 'hitSword', heavy: 'hitHeavy', spear: 'hitSpear', fist: 'hitFist', bone: 'hitBone' };
const DEATH = { bones: 'deathBones', burn: 'deathBurn', thud: 'deathThud', stone: 'deathStone', blood: 'deathBlood', light: 'deathLight' } as const;

/** The sound a shot makes as it leaves, from its kind and shooter. The kind is the event's own: a melee hero's ultimate can
 *  throw one too (the Queen Dragoon's), and a hero with no shot of its own broke the sound and froze the fight. */
function leaving(unit: Unit, shot: Shot): Cued[] {
  const m = missileOf(shot, defOf(unit).name);
  if (m.look === 'arrow') return [{ cue: 'bow' }, { cue: 'arrowFly', delay: 40 }];
  if (m.look === 'bone') return [{ cue: 'throwBone' }];
  if (m.look === 'tracer') return [{ cue: 'gun' }, { cue: 'shell', delay: 260 }];
  return [{ cue: elementCue(m.el), gain: 0.8 }];
}

/** The sounds one battle event calls for. `b` is the battle just stepped (for who is who). */
export function cuesFor(b: Battle, e: BattleEvent): Cued[] {
  const unit = (id: number) => b.units.find((x) => x.id === id);
  switch (e.kind) {
    case 'swing': {
      const by = unit(e.by);
      return by && !defOf(by).shot ? [{ cue: SWING[weightOf(defOf(by).name)] }] : [];
    }
    case 'shot': {
      const by = unit(e.by);
      return by ? leaving(by, e.shot) : [];
    }
    case 'dodge':
      return [{ cue: 'miss' }];
    case 'boom':
      return [{ cue: 'fireBoom', gain: 0.9 }];
    case 'hit': {
      const by = unit(e.by);
      const to = unit(e.to);
      if (!to) return [];
      const out: Cued[] = [];
      if (!by) {
        // (no `by` is the king's meteor: its boom is on the 'spell' event)
        if (e.killed) out.push({ cue: DEATH[deathKind(defOf(to).name, to.side)] });
        return out;
      }
      if (e.src === 'dot') {
        if (to.dot?.kind === 'curse') out.push({ cue: 'shadowHum', gain: 0.4 });
        else if (to.dot?.kind !== 'bleed') out.push({ cue: 'fireWhoosh', gain: 0.35 });
      } else if (e.src === 'skill') {
        const name = kitOf(by)?.skill.name ?? '';
        out.push({ cue: elementCue(skillElement(name)), gain: 0.7 });
      } else if (to.guardUntil !== undefined && to.guardUntil > b.t) {
        out.push({ cue: 'block' });
      } else if (defOf(by).shot) {
        const m = missileOf(defOf(by).shot!, defOf(by).name);
        const el = impactElement(m);
        if (m.look === 'arrow') out.push({ cue: 'arrowHit' });
        else if (m.look === 'bone') out.push({ cue: 'boneClatter', gain: 0.6 });
        else if (m.look === 'tracer') out.push({ cue: 'bulletHit' });
        else out.push({ cue: el === 'fire' ? 'fireBoom' : el === 'ice' ? 'frostShatter' : elementCue(el), gain: el === 'fire' ? 0.5 : 0.8 });
      } else {
        out.push({ cue: HIT[weightOf(defOf(by).name)] });
      }
      // (a crit, or a blow from height, lands heavier still)
      if (e.heavy && e.src === 'blow') out.push({ cue: 'crit' });
      if (e.killed) out.push({ cue: DEATH[deathKind(defOf(to).name, to.side)], delay: 40, gain: to.maxHp >= BIG_FOE_HP ? 1.4 : 1 });
      return out;
    }
    case 'skill': {
      const by = unit(e.by);
      const kit = by ? kitOf(by) : undefined;
      if (kit?.ultimate?.name === e.name) return [{ cue: 'ultimate' }];
      const el = skillElement(e.name);
      const out: Cued[] = [{ cue: elementCue(el), gain: 0.8 }];
      if (by && by.side === 'foe' && by.maxHp >= BIG_FOE_HP) out.push({ cue: 'bossSkill', delay: 60 });
      if (el === 'light' || el === 'earth') out.push({ cue: 'shieldHum', delay: 80, gain: 0.6 });
      return out;
    }
    case 'dash':
      return [{ cue: 'dash' }];
    case 'blink':
      return [{ cue: 'blink' }];
    case 'area':
      // (the meteor whistles down and lands with a boom `ms` later; a volley rains)
      return e.id === 'meteor'
        ? [{ cue: 'meteorFall', delay: Math.max(0, e.ms - 850) }, { cue: 'fireBoom', delay: e.ms, gain: 1.5 }, { cue: 'thunder', delay: e.ms + 60, gain: 0.8 }]
        : [{ cue: 'arrowRain' }, { cue: 'arrowHit', delay: Math.max(0, e.ms - 100), gain: 0.8 }];
    case 'arc':
      return [{ cue: 'crackle' }];
    case 'trap':
      return [{ cue: 'trap' }];
    case 'zone':
      return [{ cue: 'fireWhoosh', gain: 0.6 }];
    case 'spell':
      return spellCues(e.id);
    case 'heal':
      return e.amount > 0 ? [{ cue: 'heal' }] : [];
    case 'gaze':
      return [{ cue: 'shadowHum', gain: 0.8 }];
    case 'song':
      return [{ cue: 'pipes' }];
    case 'banner':
      return [{ cue: 'horn' }];
    case 'haste':
      return [];
    // (a combo: the five gather with the big sting, and the move lands with a boom and thunder; a tier skill's ring is a soft swell; a promotion chimes)
    case 'comboCast':
      return [{ cue: 'ultimate' }];
    case 'comboLand':
      return [{ cue: 'fireBoom', gain: 1.2 }, { cue: 'thunder', delay: 80, gain: 0.9 }];
    case 'duoCombo':
      return [{ cue: 'ultimate', gain: 0.8 }, { cue: 'holyChime', delay: 100, gain: 0.7 }];
    case 'decoyLog':
      return [{ cue: 'shadowHum', gain: 0.7 }, { cue: 'fireWhoosh', delay: 60, gain: 0.5 }];
    case 'wisp':
      return [{ cue: 'sparkle', gain: 0.6 }];
    case 'burst':
      return e.tone === 'tier' ? [{ cue: 'shieldHum', gain: 0.5 }] : [];
    case 'promote':
      return e.grade > 2 ? [{ cue: 'merge' }, { cue: 'holyChime', delay: 120 }, { cue: 'sparkle', delay: 260 }] : [{ cue: 'merge' }];
    case 'end':
      return [{ cue: e.won ? 'victory' : 'defeat' }];
    default:
      return [];
  }
}

/** The king's spells: each in its own element's voice. */
function spellCues(id: keyof typeof SPELL_ELEMENT): Cued[] {
  switch (id) {
    case 'heal': return [{ cue: 'heal' }];
    case 'shield': return [{ cue: 'shieldHum' }, { cue: 'holyChime', gain: 0.5, delay: 100 }];
    case 'meteor': return [{ cue: 'meteorFall', delay: 0 }, { cue: 'fireBoom', delay: 850, gain: 1.5 }, { cue: 'thunder', delay: 910, gain: 0.8 }];
    case 'chain': return [{ cue: 'crackle' }, { cue: 'thunder', delay: 120, gain: 0.7 }];
    case 'frost': return [{ cue: 'frostCrack' }, { cue: 'frostShatter', delay: 160 }];
    case 'rally': return [{ cue: 'horn' }, { cue: 'fireWhoosh', gain: 0.6 }];
    case 'quake': return [{ cue: 'earthRumble', gain: 1.4 }];
    case 'smite': return [{ cue: 'holyChime' }, { cue: 'thunder', delay: 80, gain: 0.8 }];
    case 'resurrect': return [{ cue: 'holyChime' }, { cue: 'heal', delay: 200 }];
    case 'haste': return [{ cue: 'windGust' }];
    case 'poison': return [{ cue: 'poisonHiss', gain: 1.2 }];
    case 'cleanse': return [{ cue: 'holyChime' }, { cue: 'heal', delay: 150, gain: 0.7 }];
    // (the blink event plays its own cue)
    case 'blink': return [];
    case 'hex': return [{ cue: 'shadowHum' }];
    case 'lance': return [{ cue: 'holyChime' }, { cue: 'thunder', delay: 60, gain: 0.7 }];
    case 'renewal': return [{ cue: 'heal' }];
    case 'deepfreeze': return [{ cue: 'frostCrack' }, { cue: 'frostShatter', delay: 200, gain: 0.6 }];
    case 'warcry': return [{ cue: 'horn' }];
    case 'bulwark': return [{ cue: 'shieldHum' }, { cue: 'earthRumble', gain: 0.6 }];
    case 'wolves': return [{ cue: 'windGust', gain: 0.8 }, { cue: 'shadowHum', gain: 0.5, delay: 100 }];
    // (each meteor's fall and boom come from its own `area` event)
    case 'starfall': return [{ cue: 'fireWhoosh', gain: 0.5 }];
  }
}

/* ------------------------------------------------------------------ the mix */

/** How loud and how high one play of a sound is. */
export interface Voice {
  gain: number;
  /** A multiplier on the sound's pitch (1 = as written). */
  pitch: number;
}

/** Quieter at ×2: the gain is divided by this much per extra speed step. */
export const SPEED_HUSH = 0.4;
/** The most random pitch change either way (a share). */
export const PITCH_JITTER = 0.07;
/** A sound of priority 0 is dropped once the mix is this full; priority 1 at `FULL`; priority 2 at `FULL` + `HEADROOM`. */
const BUSY = 0.65;
const FULL = 1;
const HEADROOM = 0.5;

export class Mixer {
  private lastAt = new Map<Cue, number>();
  /** The sounds ringing: when each lets go of its voices (ms) and how many it holds. */
  private live: { end: number; weight: number }[] = [];

  /** `limit`: the voices that may ring at once. `rand`: 0 to 1 (the renderer's own; a test passes a fixed one). */
  constructor(
    private limit = 14,
    private rand: () => number = Math.random,
  ) {}

  /** The voices in use at `now` (ms). */
  load(now: number): number {
    this.live = this.live.filter((v) => v.end > now);
    return this.live.reduce((n, v) => n + v.weight, 0);
  }

  /** Asks to play `cue` at `now` (ms, real time) at fight speed `speed`; null if it is held back (too soon after the same
   *  sound, or the mix is full of louder ones), else its gain and pitch. `gain` is the caller's own scale. */
  request(cue: Cue, now: number, speed = 1, gain = 1): Voice | null {
    const spec = CUES[cue];
    // (faster fights fire more events a second: the gap grows with the speed)
    const gap = spec.gap * (1 + 0.5 * (Math.max(1, speed) - 1));
    const last = this.lastAt.get(cue);
    if (last !== undefined && now - last < gap) return null;
    const used = this.load(now);
    const room = spec.prio === 0 ? BUSY : spec.prio === 1 ? FULL : spec.prio === 2 ? FULL + HEADROOM : Infinity;
    if (used + spec.weight > this.limit * room && used > 0) return null;
    this.lastAt.set(cue, now);
    this.live.push({ end: now + spec.ms, weight: spec.weight });
    const hush = 1 / (1 + SPEED_HUSH * (Math.max(1, speed) - 1));
    return { gain: spec.gain * gain * hush, pitch: 1 + (this.rand() * 2 - 1) * PITCH_JITTER };
  }

  /** Forgets everything (a new fight). */
  reset(): void {
    this.lastAt.clear();
    this.live = [];
  }
}

/** How tense the fight is, 0 to 1, from the share of each side still standing: it climbs as either side thins out, so
 *  the battle music can quicken as the fight nears its end. */
export function intensityOf(b: Battle): number {
  let hero = 0, heroAll = 0, foe = 0, foeAll = 0;
  for (const u of b.units) {
    if (defOf(u).summon) continue;
    if (u.side === 'hero') { heroAll++; if (u.alive) hero++; }
    else { foeAll++; if (u.alive) foe++; }
  }
  const low = Math.min(heroAll ? hero / heroAll : 1, foeAll ? foe / foeAll : 1);
  return Math.max(0, Math.min(1, (0.75 - low) / 0.6));
}
