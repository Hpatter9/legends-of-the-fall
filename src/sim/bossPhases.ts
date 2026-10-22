// Boss phases: the final boss of each army, and each calamity map's boss, changes form once, when its health first falls to
// half (earlier on a high calamity ascension, `ascension.ts`). The fight stops for `PHASE_PAUSE_MS` (a cutscene the page plays:
// nothing in the fight moves, `Battle.pause`), then the boss carries on in its second form: a surge of attack, and some of
// a shield, a second wind, adds, a quickening, a leap to the heroes' line, and a skill of a different kind. What each boss
// becomes is plain data here (`PHASE2`, by the fighter's id); the page reacts to the `phase` event. Deterministic: no random
// choice, the adds and the leap take the nearest free tiles in a fixed order.

import { standable, tileAt, type At } from './board';
import { addUnit, apart, defOf, tileOf, unitAt, wayTo, type Battle, type BattleEvent, type Unit } from './battle';
import { CHARGE_MAX, KITS, foesOf, type Kit, type Passive } from './abilities';

/** The share of its health at which a boss changes form. */
export const PHASE_AT = 0.5;
/** How long the fight is held while the boss changes (ms). */
export const PHASE_PAUSE_MS = 1500;
/** How long a phase shield lasts. */
const SHIELD_MS = 10_000;

/** What a boss becomes in its second form. Every field but the line and the surge is optional. */
export interface PhaseKit {
  /** The words on the banner. */
  line: string;
  /** Its attack is multiplied by this (the stat surge). */
  atk: number;
  /** A share of its health comes back. */
  heal?: number;
  /** A shield of this share of its health, for ten seconds. */
  shield?: number;
  /** Hasted for this many ms. */
  haste?: number;
  /** Fighters called up beside it, of the kind, at the foes' strength. */
  adds?: { kind: string; n: number };
  /** The fighter whose skill (and ultimate) it uses from now on: a name in `KITS`. */
  skill?: string;
  ultimate?: string;
  /** The ultimate is full (it goes off the moment the fight resumes). */
  primed?: boolean;
  /** It leaps to the heroes' line. */
  teleport?: boolean;
  /** Passive traits it gains (or sharpens). */
  passive?: Partial<Passive>;
}

const burn = { kind: 'burn' as const, dmg: 4, every: 500, ms: 2500 };

/** The second form of each boss, by fighter id: the nine armies' last bosses, then the calamity's six. */
export const PHASE2: Record<string, PhaseKit> = {
  // the armies' final bosses
  orcWarlord: { line: 'WAAAGH! Burn it all down!', atk: 1.25, adds: { kind: 'orcGrunt', n: 2 }, haste: 5000 },
  lichKing: { line: 'Rise, my legion, and take them!', atk: 1.15, shield: 0.12, primed: true, passive: { leech: 0.25 } },
  boarKing: { line: 'Out of my way, little ones!', atk: 1.3, skill: 'minotaur', haste: 7000, passive: { frenzy: { per: 0.2, ms: 4000, max: 3 } } },
  forestBoss3: { line: 'The grove answers me!', atk: 1.2, adds: { kind: 'groveSatyr3', n: 2 }, skill: 'satyr' },
  minotaurChampion: { line: 'The maze closes. There is no way out.', atk: 1.3, teleport: true, skill: 'boarKing', passive: { finish: { under: 0.6, mult: 1.3 } } },
  hornedOgre: { line: 'The mountain does not fall!', atk: 1.2, heal: 0.08, shield: 0.15, ultimate: 'orcWarlord', passive: { steady: true, block: 0.3 } },
  demonLord: { line: 'Burn, all of you!', atk: 1.2, adds: { kind: 'imp', n: 2 }, skill: 'devilLeader' },
  oniKing: { line: 'Hear the thunder drum!', atk: 1.2, skill: 'yokaiSeer', primed: true, haste: 5000 },
  forgeTitan: { line: 'The forge runs white-hot!', atk: 1.25, shield: 0.1, skill: 'crystalGolem', passive: { ignite: burn } },
  // the calamity's bosses
  calBoss1: { line: 'The ashes remember!', atk: 1.2, adds: { kind: 'orcGrunt', n: 2 } },
  calBoss2: { line: 'The thorns bloom!', atk: 1.15, shield: 0.15, ultimate: 'orcWarlord' },
  calBoss3: { line: 'Come, my court!', atk: 1.15, adds: { kind: 'imp', n: 2 }, skill: 'devilLeader' },
  calBoss4: { line: 'The mountain walks!', atk: 1.2, teleport: true, primed: true },
  calBoss5: { line: 'Let the last flame take you!', atk: 1.2, heal: 0.1, haste: 5000, skill: 'boarKing', passive: { ignite: burn } },
  calBoss6: { line: 'There is no end but me.', atk: 1.25, adds: { kind: 'orcBrute', n: 2 }, shield: 0.1, haste: 6000, teleport: true },
};

/** Whether this fighter will change form (armed at the start of the fight, and not yet changed). */
export const awaiting = (u: Unit): boolean => !!u.phase && !u.phase.done;

/** The free tiles round a fighter within two steps, nearest first (the ones it can climb to). */
function spotsAround(b: Battle, me: Unit): At[] {
  const jump = defOf(me).jump;
  const h = tileOf(b, me).h;
  const spots: At[] = [];
  for (let dv = -2; dv <= 2; dv++)
    for (let du = -2; du <= 2; du++) {
      const at = { u: me.u + du, v: me.v + dv };
      const t = tileAt(b.board, at.u, at.v);
      if (apart(me, at) >= 1 && t && standable(t) && !unitAt(b, at.u, at.v) && Math.abs(t.h - h) <= jump) spots.push(at);
    }
  return spots.sort((x, y) => apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u);
}

/** The boss leaps to the free tile beside the hero farthest from it (the back of the line). */
function leap(b: Battle, me: Unit, out: BattleEvent[]): void {
  const heroes = foesOf(b, me).sort((x, y) => apart(me, y) - apart(me, x) || x.id - y.id);
  for (const f of heroes) {
    const to = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]
      .map(([du, dv]) => ({ u: f.u + du, v: f.v + dv }))
      .filter((c) => {
        const t = tileAt(b.board, c.u, c.v);
        return t && standable(t) && !unitAt(b, c.u, c.v);
      })
      .sort((x, y) => apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u)[0];
    if (!to) continue;
    const from = { u: me.u, v: me.v };
    me.u = to.u;
    me.v = to.v;
    me.step = undefined;
    me.facing = wayTo(me, f);
    out.push({ kind: 'blink', by: me.id, from, to });
    return;
  }
}

/** The boss changes form: the fight is held, and the boss takes on its second form (`PHASE2`). */
export function enterPhase(b: Battle, me: Unit, out: BattleEvent[]): void {
  const p = me.phase!;
  p.done = true;
  const k = PHASE2[me.def];
  if (!k) return;
  b.pause = PHASE_PAUSE_MS;
  me.power = (me.power ?? 1) * k.atk;
  if (k.heal) me.hp = Math.min(me.maxHp, me.hp + Math.round(me.maxHp * k.heal));
  if (k.shield) me.shield = { hp: Math.round(me.maxHp * k.shield) + (me.shield?.hp ?? 0), until: b.t + SHIELD_MS };
  if (k.haste) me.hasteUntil = b.t + k.haste;
  // (the new skill: its own meter starts part full, so it is seen soon)
  const was: Kit | undefined = KITS[me.def];
  if (was && (k.skill || k.ultimate || k.passive)) {
    const kit: Kit = { skill: k.skill ? KITS[k.skill].skill : was.skill, passive: k.passive ? { ...was.passive, ...k.passive } : was.passive };
    const ult = k.ultimate ? KITS[k.ultimate].skill : k.skill ? KITS[k.skill].ultimate ?? was.ultimate : was.ultimate;
    if (ult) kit.ultimate = ult;
    me.kit = kit;
  }
  me.charge = Math.max(me.charge, 60);
  if (k.primed && (me.kit ?? KITS[me.def])?.ultimate) me.charge2 = CHARGE_MAX;
  if (k.teleport) leap(b, me, out);
  if (k.adds) {
    const foe = b.foeBoost;
    for (const at of spotsAround(b, me).slice(0, k.adds.n)) addUnit(b, k.adds.kind, at.u, at.v, { hp: foe?.hp, atk: foe?.atk }).owner = me.id;
  }
  out.push({ kind: 'phase', by: me.id, phase: 2, line: k.line, ms: PHASE_PAUSE_MS });
}
