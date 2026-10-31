// The director (CINE-001, the owner's ask: "make the cinematics more epic, and movie-like. Different camera angles, close-ups,
// lines"; docs/notes/cinematics.md). A scene is written as shots (`sceneKit.ts`); the director turns each into coverage the way a
// film is cut: an establishing shot first, a close-up on whoever speaks, a reaction now and then, a low angle as a boss arrives, a
// smash cut into the fight. A shot the author framed (its own `angle`) is kept as written, and only dressed (its move, its cut, its
// weather); a shot left to the director with several lines is split into one shot a line, so every line has its own framing. The
// lines, their order and their time are kept: a directed scene runs as long as the written one, plus its few reaction beats.
// Reduced motion (`calm`): every move held still, no tilt, every cut a cross-fade. Pure: no Pixi, no DOM, no randomness.

import type { Area } from './board';
import { ALL_HEROES } from './units';
import type { Act, Angle, Cut, Fx, Line, Move, Scene, Shot, Weather } from './sceneKit';

/** A reaction shot's length (s): a held look between lines, no words. */
export const REACT_S = 0.9;
/** A scene has at most this many reactions (so it runs no more than a couple of seconds longer than written). */
export const MAX_REACTS = 2;

/** The air of each land, as a shot's weather when it names none. */
export const WEATHER_OF: Record<Area, Weather> = {
  volcano: 'embers', forge: 'embers', warcamp: 'ash', snow: 'snow', desert: 'dust', ruins: 'dust', oasis: 'dust', dungeon: 'motes', crystal: 'motes',
  temple: 'motes', shrine: 'motes', forest: 'motes', autumn: 'leaves', swamp: 'rain', graveyard: 'rain', highlands: 'none', plains: 'none',
};
/** Lands with light worth slanting through a wide shot. */
const RAY_LANDS: ReadonlySet<Area> = new Set<Area>(['temple', 'shrine', 'forest', 'autumn', 'ruins', 'crystal', 'oasis', 'highlands']);

/** Each framing's own move, when a shot names none. */
export const MOVE_OF: Record<Angle, Move> = {
  wide: 'drift', medium: 'drift', two: 'drift', close: 'pushIn', extreme: 'pushIn', ots: 'drift', low: 'pushIn', high: 'pullOut', dutch: 'drift',
};

/** The effects that tint or tremble a whole shot, carried on to the shots a split makes; the one-shot ones stay with the first. */
const LASTING_FX: readonly Fx[] = ['darken', 'glow', 'rumble'];

export interface DirectOpts {
  /** Reduced motion: no moves, no tilt, cross-fades for cuts. */
  calm?: boolean;
}

/** Whether an actor is a big foe (a boss, a herald, a warlord): cast larger than life, and not one of the heroes. */
export function bigFoe(scene: Scene, id: string): boolean {
  const m = scene.cast[id];
  if (!m || !m.role.startsWith('unit:')) return false;
  return (m.scale ?? 1) >= 1.3 && !ALL_HEROES.includes(m.role.slice(5));
}

/** Whether an actor is on the heroes' side (a party role, the lead, the king, a hero kind, the goat). */
export function onSide(scene: Scene, id: string): boolean {
  const m = scene.cast[id];
  if (!m) return false;
  if (m.role === 'hero' || m.role === 'duchess' || m.role.startsWith('party:') || m.role.startsWith('face:')) return true;
  const kind = m.role.slice(5);
  return kind === 'standKing' || ALL_HEROES.includes(kind);
}

/** The big foe that comes on in a shot (its arrival), if any. */
function arrival(scene: Scene, s: Shot): string | null {
  for (const a of s.acts ?? []) if ('enter' in a && bigFoe(scene, a.who)) return a.who;
  return null;
}

const single = (on: Shot['cam']['on']): string | null => (typeof on === 'string' ? on : Array.isArray(on) && on.length === 1 ? on[0] : null);

/** The framing a whole shot gets when its author named none: the first is the establishing view, a boss's arrival is seen from
 *  the ground, a close camera on one figure is a close-up, on two a two-shot, else wide. */
function framingOf(scene: Scene, s: Shot, i: number): Pick<Shot, 'angle' | 'subject'> {
  const boss = arrival(scene, s);
  if (boss) return { angle: 'low', subject: boss };
  if (i === 0) return { angle: 'wide' };
  const zoom = s.cam.zoom ?? 1;
  const one = single(s.cam.on);
  if (one && zoom >= 1.5) return bigFoe(scene, one) && (s.fx ?? []).includes('flash') ? { angle: 'low', subject: one } : { angle: 'close', subject: one };
  if (Array.isArray(s.cam.on) && s.cam.on.length >= 2 && zoom >= 1.5) return { angle: 'two' };
  if (Array.isArray(s.cam.on) && s.cam.on.length >= 2) return { angle: 'medium' };
  return { angle: 'wide' };
}

/** The framing of the shot for line `k` of a split (k >= 1): the speaker's close-up (over the shoulder when two are trading
 *  lines), a big foe's shout from below, a whisper in tight, the narrator back on the master's view. */
function lineFraming(scene: Scene, master: Pick<Shot, 'angle' | 'subject'>, l: Line, prev: Line | null, k: number): Pick<Shot, 'angle' | 'subject'> {
  if (l.who === 'narrator' || !scene.cast[l.who]) return { angle: master.angle === 'low' || master.angle === 'close' ? 'medium' : master.angle ?? 'wide', ...(master.subject ? { subject: master.subject } : {}) };
  if (l.tone === 'shout' && bigFoe(scene, l.who)) return { angle: k % 2 ? 'low' : 'dutch', subject: l.who };
  if (l.tone === 'whisper') return { angle: 'extreme', subject: l.who };
  const trading = prev && prev.who !== 'narrator' && prev.who !== l.who && !!scene.cast[prev.who];
  return { angle: trading && k % 2 === 1 ? 'ots' : 'close', subject: l.who };
}

/** An act moved into the shot of its line (it starts as that shot does). */
const moved = (a: Act): Act => {
  const { line: _line, ...rest } = a as Act & { line?: number };
  return rest as Act;
};

/** Split a shot with several lines into a shot a line; acts waiting for a line go with it, poses are held on. */
function split(scene: Scene, s: Shot, i: number): Shot[] {
  const lines = s.lines ?? [];
  const master = framingOf(scene, s, i);
  const actsOf = (k: number): Act[] =>
    (s.acts ?? []).flatMap((a) => {
      const at = a.line ?? 0;
      if (at === k) return [k === 0 ? a : moved(a)];
      // (a pose held over the whole shot is held over each shot made of it)
      if (k > at && 'pose' in a && a.pose !== 'down') return [moved(a)];
      return [];
    });
  const lasting = (s.fx ?? []).filter((f) => LASTING_FX.includes(f));
  return lines.map((l, k): Shot => {
    const last = k === lines.length - 1;
    if (k === 0) {
      const { lines: _l, hold: _h, ...rest } = s;
      const fx = (s.fx ?? []).filter((f) => f !== 'fadeOut' || last);
      return { ...rest, ...master, acts: actsOf(0), fx, lines: [l], ...(last && s.hold !== undefined ? { hold: s.hold } : {}) };
    }
    const fx: Fx[] = [...lasting, ...(last && (s.fx ?? []).includes('fadeOut') ? (['fadeOut'] as Fx[]) : [])];
    return {
      cam: s.cam,
      ...lineFraming(scene, master, l, lines[k - 1], k),
      acts: actsOf(k),
      ...(fx.length ? { fx } : {}),
      ...(s.slow !== undefined ? { slow: s.slow } : {}),
      lines: [l],
      ...(last && s.hold !== undefined ? { hold: s.hold } : {}),
    };
  });
}

/** The cut into shot `i` of the directed list, when its author named none. */
function cutOf(shots: Shot[], i: number, fromSplit: boolean[]): Cut {
  const s = shots[i];
  if (i === 0) return 'fade';
  const prev = shots[i - 1];
  if (s.look && prev && s.look !== lookBefore(shots, i - 1)) return 'dissolve';
  if (s.angle === 'low' && !fromSplit[i]) return (s.fx ?? []).includes('flash') ? 'flash' : 'smash';
  if ((s.fx ?? []).includes('flash')) return 'flash';
  if (fromSplit[i] && s.subject && s.subject === prev.subject) return 'match';
  return 'cut';
}

const lookBefore = (shots: Shot[], i: number): Area | undefined => {
  for (let k = i; k >= 0; k--) if (shots[k].look) return shots[k].look;
  return undefined;
};

/** The hero nearest the speaker of a line, for a reaction (who looks back at a shouting foe). */
function reactor(scene: Scene, shots: Shot[], k: number, speaker: string): string | null {
  // (whoever speaks next on the heroes' side, else the first of them seen in the scene so far)
  for (let j = k + 1; j < shots.length && j < k + 3; j++) {
    const who = shots[j].lines?.[0]?.who;
    if (who && who !== speaker && onSide(scene, who) && !scene.cast[who].role.startsWith('face:')) return who;
  }
  const onStage = (id: string): boolean => onSide(scene, id) && scene.cast[id].role !== 'duchess' && !scene.cast[id].role.startsWith('face:');
  for (let j = 0; j <= k; j++) for (const a of shots[j].acts ?? []) if ('enter' in a && onStage(a.who)) return a.who;
  const first = Object.keys(scene.cast).find((id) => onStage(id) && !scene.cast[id].hidden);
  return first ?? null;
}

/** A written scene, cut as a film. The same lines in the same order; each shot framed, moved, cut in, with its air. */
export function direct(scene: Scene, opts: DirectOpts = {}): Scene {
  const calm = !!opts.calm;
  const shots: Shot[] = [];
  const fromSplit: boolean[] = [];
  scene.shots.forEach((s, i) => {
    const lines = s.lines ?? [];
    // (a framed shot, a cut-in's, or one with a line or none: kept whole)
    if (s.angle || scene.short || lines.length <= 1) {
      shots.push(s.angle ? s : { ...s, ...framingOf(scene, s, i) });
      fromSplit.push(false);
      return;
    }
    split(scene, s, i).forEach((x, k) => {
      shots.push(x);
      fromSplit.push(k > 0);
    });
  });
  // reactions: after a big foe shouts, a held look at the hero who must answer it (two a scene at most, none in a cut-in)
  if (!scene.short) {
    let reacts = 0;
    for (let k = 0; k < shots.length - 1 && reacts < MAX_REACTS; k++) {
      const l = shots[k].lines?.[0];
      if (!l || l.tone !== 'shout' || !bigFoe(scene, l.who) || shots[k].lines!.length !== 1) continue;
      const who = reactor(scene, shots, k, l.who);
      if (!who) continue;
      shots.splice(k + 1, 0, { cam: { on: who, zoom: 1.5 }, angle: 'close', subject: who, react: true, hold: REACT_S });
      fromSplit.splice(k + 1, 0, true);
      reacts++;
      k++;
    }
  }
  // a boss's arrival gets its name on a title card, under the scene's chapter line (`{id}`: filled with the actor's name as played)
  if (scene.sting === 'sceneBoss' && !shots.some((s) => s.title)) {
    const at = shots.findIndex((s) => s.angle === 'low' && s.subject && bigFoe(scene, s.subject) && !scene.cast[s.subject].shade && (s.acts ?? []).some((a) => 'enter' in a && a.who === s.subject));
    const over = scene.shots.find((s) => s.caption)?.caption ?? '';
    if (at >= 0) shots[at] = { ...shots[at], title: { over, name: `{${shots[at].subject}}` } };
  }
  // every shot dressed: its cut, its move, its air
  let look: Area | undefined;
  const out = shots.map((s, i): Shot => {
    look = s.look ?? look;
    const angle: Angle = s.angle ?? 'wide';
    let move: Move = s.move ?? MOVE_OF[angle];
    let cut: Cut = s.cut ?? cutOf(shots, i, fromSplit);
    let shotAngle = angle;
    if (calm) {
      move = 'still';
      if (cut !== 'fade') cut = i === 0 ? 'fade' : 'dissolve';
      if (shotAngle === 'dutch') shotAngle = 'close';
    }
    const weather = s.weather ?? (look ? WEATHER_OF[look] : 'none');
    const rays = s.rays ?? (!!look && RAY_LANDS.has(look) && (angle === 'wide' || angle === 'low'));
    return { ...s, angle: shotAngle, move, cut, weather, rays };
  });
  const ending = scene.out ?? (scene.sting === 'sceneBoss' ? 'smash' : scene.short ? undefined : 'fade');
  return { ...scene, shots: out, ...(ending ? { out: calm && ending === 'smash' ? 'fade' : ending } : {}) };
}

/** Every line of a scene, in order (a directed scene keeps them all). */
export const linesOf = (scene: Scene): Line[] => scene.shots.flatMap((s) => s.lines ?? []);
