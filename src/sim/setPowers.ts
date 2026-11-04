// The full-set powers and the named legends' powers (SEVEN-SLOT GEAR batch 2, docs/notes/gear-runes-design.md sections 2 and 3): rules of
// their own that change how a hero plays, beyond the signature abilities `equipFx.ts` runs. A hero's worn kit lists them
// (`EquipStats.powers`: a full set's power at strength 1, a legend's by its renown), and they run on the same hooks as the abilities
// (`equipFx.ts` calls in after a blow, when struck, on a kill, at the start and every tick) and on five more: a damage step in `onStrike`,
// a skill cast in `powered`, a dodge in `onDodged` (`abilities.ts`), and a fall in `hurt` (`battle.ts`). Every hook is a no-op in a fight
// where no hero wears a power (`powersOn`), so every other fight plays out as before. Chances come from the fight's skill stream (`roll`),
// as the abilities' do. Pure rules: no Pixi, no DOM.

import { apart, atkOf, defenceOf, hurt, tileOf, unitAt, type Battle, type BattleEvent, type Unit } from './battle';
import { BANNER_MULT, CHARGE_MAX, foesOf, gain, mendUnit, powered, roll, ultimateOf, type Skill } from './abilities';
import { ailBoss, chillFor, dotOf, freezeFor, isFrozen, putOut, setDot, stunFor } from './ailments';
import { raiseWraith } from './kits/effects';
import { standable, tileAt } from './board';

/** A power a worn kit switches on, and how strong: 1 for a full set's, a legend's by its renown (`legends.ts`). */
export interface ActivePower {
  id: string;
  name: string;
  s: number;
}

const ON = new WeakSet<Battle>();
/** Whether any fighter of this fight wears a power (set as the fight starts). */
export const powersOn = (b: Battle): boolean => ON.has(b);
/** The strength of a power a fighter wears (0 when it wears none). */
export const powerOf = (u: Unit, id: string): number => u.eq?.powers?.find((p) => p.id === id)?.s ?? 0;
const key = (u: Unit, k: string) => u.fx?.[k] ?? 0;
const setKey = (u: Unit, k: string, n: number) => ((u.fx ??= {})[k] = n);
const bump = (u: Unit, k: string): number => setKey(u, k, key(u, k) + 1);
const once = (u: Unit, k: string): boolean => (key(u, `${k}#used`) ? false : (setKey(u, `${k}#used`, 1), true));
/** How many times a power has fired for this fighter (for the fight stats and the tests). */
export const powerFired = (u: Unit, id: string): number => key(u, `${id}#fired`);
function fired(u: Unit, id: string, out: BattleEvent[], show = true): void {
  bump(u, `${id}#fired`);
  if (show) out.push({ kind: 'skill', by: u.id, name: u.eq?.powers?.find((p) => p.id === id)?.name ?? id, ms: 700 });
}
const allies = (b: Battle, me: Unit) => b.units.filter((x) => x.alive && x.side === me.side);
const lucky = (b: Battle, p: number): boolean => p >= 1 || roll(b) < p;
/** The strongest foe standing (the most health, the older on a tie). */
const strongest = (b: Battle, me: Unit): Unit | undefined => foesOf(b, me).filter((f) => f.alive).sort((x, y) => y.maxHp - x.maxHp || x.id - y.id)[0];
/** A tile a fighter may be put on now: on the board, ground to stand on, not deep water, nobody on it. */
const free = (b: Battle, u: number, v: number): boolean => {
  const t = tileAt(b.board, u, v);
  return !!t && standable(t) && t.ground !== 'deep' && !t.bar && !unitAt(b, u, v);
};
/** Move a fighter one tile along (du, dv) if it may stand there and the step up is one it could climb. */
function nudge(b: Battle, x: Unit, du: number, dv: number): boolean {
  const u = x.u + du;
  const v = x.v + dv;
  if (!free(b, u, v) || tileAt(b.board, u, v)!.h - tileOf(b, x).h > 1) return false;
  x.u = u;
  x.v = v;
  x.step = undefined;
  return true;
}
const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
/** The main step from `a` towards `c` (the longer axis). */
const towards = (a: { u: number; v: number }, c: { u: number; v: number }): [number, number] => {
  const du = c.u - a.u;
  const dv = c.v - a.v;
  return Math.abs(du) >= Math.abs(dv) ? [sign(du), 0] : [0, sign(dv)];
};
/** Raise the attack of the allies near `me` (the War Banner's +25%) for `ms`. */
function rally(b: Battle, me: Unit, ms: number, reach: number): void {
  for (const x of allies(b, me)) {
    if (apart(x, me) > reach) continue;
    if (x.banner === undefined) x.power = (x.power ?? 1) * BANNER_MULT;
    x.banner = { until: Math.max(x.banner?.until ?? 0, b.t + ms) };
  }
}
/** End an ailment of these kinds on a fighter (an immunity: the Helm of Seven Winters, the Girdle of the Giant-King). */
function shake(b: Battle, u: Unit, kinds: readonly string[]): void {
  if (kinds.includes('stun') && (u.stunUntil ?? 0) > b.t && !isFrozen(b, u)) {
    u.stunUntil = undefined;
    u.busyUntil = Math.min(u.busyUntil, b.t);
  }
  if (kinds.includes('freeze') && isFrozen(b, u)) {
    u.stunUntil = undefined;
    u.busyUntil = Math.min(u.busyUntil, b.t);
    u.brittleUntil = undefined;
  }
  if (kinds.includes('chill')) u.slowUntil = undefined;
  if (u.ail?.length) u.ail = u.ail.filter((a) => !kinds.includes(a.kind));
}
const skillHit = (b: Battle, me: Unit, to: Unit, n: number, out: BattleEvent[]) => hurt(b, me, to, Math.max(1, Math.round(n)), false, true, out, 'skill');

// ---- the hooks -------------------------------------------------------------------------------------------------------------

/** The start of the fight (from `fxStart`, once for each hero). */
export function powerStart(b: Battle, me: Unit): void {
  if (!me.eq?.powers?.length) return;
  ON.add(b);
  const out: BattleEvent[] = [];
  // (Thousand Duels: the strongest foe is challenged, and must go for the wearer)
  if (powerOf(me, 'thousandDuels')) challenge(b, me);
  // (the Mask of the Laughing Fox: the wearer and the nearest ally are unseen for a while)
  const fox = powerOf(me, 'laughingFox');
  if (fox) {
    const ms = 3000 * fox;
    me.hideUntil = b.t + ms;
    const pal = allies(b, me).filter((x) => x !== me).sort((x, y) => apart(x, me) - apart(y, me) || x.id - y.id)[0];
    if (pal) pal.hideUntil = b.t + ms;
    fired(me, 'laughingFox', out, false);
  }
  // (Seven-League Boots: a leap of up to 4 tiles towards the nearest foe)
  if (powerOf(me, 'sevenLeague')) {
    const foe = foesOf(b, me).filter((f) => f.alive).sort((x, y) => apart(x, me) - apart(y, me) || x.id - y.id)[0];
    if (foe) {
      const [du, dv] = towards(me, foe);
      let n = 0;
      while (n < 4 && apart(me, foe) > 1 && nudge(b, me, du, dv)) n++;
      if (n) fired(me, 'sevenLeague', out, false);
    }
  }
}

function challenge(b: Battle, me: Unit): void {
  const foe = strongest(b, me);
  if (!foe) return;
  setKey(me, 'duel', foe.id);
  foe.taunt = { to: me.id, until: b.t + 600000 };
  bump(me, 'thousandDuels#fired');
}

/** A blow or skill about to land (from `onStrike`, after the kits' own turns): what the powers make of its damage. Null when it is
 *  turned aside or taken by another (the Last Wall, the Shield of a Hundred Names). */
export function powerStrike(b: Battle, by: Unit, to: Unit, dmg: number, src: 'blow' | 'skill' | 'dot', splash: boolean, out: BattleEvent[]): number | null {
  const blow = src === 'blow' && !splash;
  // (burning heals what the Wyrmhide of Vaelkhar is made of)
  if (src === 'dot' && powerOf(to, 'wyrmhide') && dotOf(to)?.kind === 'burn') {
    mendUnit(to, dmg, out);
    bump(to, 'wyrmhide#fired');
    return null;
  }
  if (src !== 'dot' && by.side !== to.side) {
    // (the striker's powers)
    const duel = powerOf(by, 'thousandDuels');
    if (duel) {
      const mark = b.units.find((x) => x.id === key(by, 'duel'));
      if (!mark?.alive) challenge(b, by);
      if (to.id === key(by, 'duel')) dmg *= 1.3;
    }
    if (by.side === 'hero') {
      const hunt = HUNT.get(b);
      if (hunt !== undefined) {
        const mark = b.units.find((x) => x.id === hunt);
        if (!mark?.alive) {
          const next = strongest(b, by);
          if (next) HUNT.set(b, next.id);
        }
        if (to.id === HUNT.get(b)) dmg *= 1.2;
      }
    }
    if (powerOf(by, 'pyreWalker') && dotOf(to)?.kind === 'burn') dmg *= 1.2;
    const fox = powerOf(by, 'laughingFox');
    if (fox && blow && (by.hideUntil ?? 0) > b.t) dmg *= 1.5;
    const widow = powerOf(by, 'widowsBow');
    if (widow && blow && once(by, 'widowFirst') && to === strongest(b, by)) {
      dmg *= 1 + 0.5 * widow;
      fired(by, 'widowsBow', out);
    }
    // (the struck's powers, and its allies')
    if (to.side === 'hero') {
      const king = allies(b, to).some((x) => powerOf(x, 'lastKing') && apart(x, to) <= 2);
      if (king) dmg *= 0.94;
      const names = powerOf(to, 'hundredNames');
      if (names && blow && bump(to, 'namesN') % 4 === 0) {
        const hp = Math.round(to.maxHp * 0.05 * names);
        if (!to.shield || to.shield.hp < hp) to.shield = { hp, until: b.t + 6000 };
        fired(to, 'hundredNames', out, false);
        out.push({ kind: 'dodge', to: to.id });
        return null;
      }
      if (blow && !TAKING.has(b)) {
        // (the Last Wall: a blow on an ally beside the wearer is the wearer's, at 40% less)
        const wall = allies(b, to).find((x) => x !== to && powerOf(x, 'lastWall') && apart(x, to) === 1);
        if (wall) {
          TAKING.add(b);
          try {
            hurt(b, by, wall, Math.max(1, Math.round(dmg * 0.6)), false, false, out, 'blow');
          } finally {
            TAKING.delete(b);
          }
          fired(wall, 'lastWall', out, false);
          return null;
        }
        // (the Aegis of Saint Odile: a third of every blow on the weakest ally)
        const odile = allies(b, to).find((x) => x !== to && powerOf(x, 'aegisOdile'));
        if (odile && to === allies(b, to).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0]) {
          const share = Math.round(dmg * Math.min(0.5, powerOf(odile, 'aegisOdile') / 3));
          if (share > 0) {
            TAKING.add(b);
            try {
              hurt(b, by, odile, share, false, false, out, 'blow');
            } finally {
              TAKING.delete(b);
            }
            fired(odile, 'aegisOdile', out, false);
            dmg -= share;
          }
        }
      }
    }
  }
  return dmg;
}
/** The fights where a blow is being passed on (so it is not passed on again). */
const TAKING = new WeakSet<Battle>();
/** The Wild Hunt's mark, by fight. */
const HUNT = new WeakMap<Battle, number>();

/** After a blow lands (from `fxBlow`). */
export function powerBlow(b: Battle, by: Unit, to: Unit, crit: boolean, dmg: number, out: BattleEvent[]): void {
  if (!by.eq?.powers?.length) return;
  // (Long Winter: a frozen foe struck by a crit shatters)
  if (crit && to.alive && powerOf(by, 'longWinter') && isFrozen(b, to)) {
    skillHit(b, by, to, to.maxHp * (ailBoss(to) ? 0.08 : 0.2), out);
    fired(by, 'longWinter', out);
  }
  // (Eye of the Storm: every 4th blow, lightning leaps to three more foes, each leap feeding the skill)
  if (powerOf(by, 'eyeOfStorm') && bump(by, 'stormN') % 4 === 0) {
    let from = to;
    const hit = new Set([to.id]);
    for (let i = 0; i < 3; i++) {
      const next = foesOf(b, by).filter((f) => f.alive && !hit.has(f.id) && apart(f, from) <= 2).sort((x, y) => apart(x, from) - apart(y, from) || x.id - y.id)[0];
      if (!next) break;
      hit.add(next.id);
      out.push({ kind: 'arc', from: from.id, to: next.id });
      skillHit(b, by, next, dmg * 0.5, out);
      gain(by, 4);
      from = next;
    }
    fired(by, 'eyeOfStorm', out, false);
  }
  // (the Wild Hunt: the first shot marks the strongest foe)
  if (powerOf(by, 'wildHunt') && !HUNT.has(b)) {
    const mark = strongest(b, by);
    if (mark) HUNT.set(b, mark.id);
    fired(by, 'wildHunt', out);
  }
  if (!to.alive) return;
  // (Undertow: the foe is pulled a tile towards the wearer)
  if (powerOf(by, 'undertow') && apart(by, to) > 1 && !ailBoss(to)) {
    const [du, dv] = towards(to, by);
    if (nudge(b, to, du, dv)) fired(by, 'undertow', out, false);
  }
  // (King of the Hill: from higher ground, a knock back and a short stun)
  if (powerOf(by, 'kingOfHill') && tileOf(b, by).h > tileOf(b, to).h) {
    const [du, dv] = towards(by, to);
    if (!ailBoss(to)) nudge(b, to, du, dv);
    stunFor(b, to, 500, false, 'stun', by);
    fired(by, 'kingOfHill', out, false);
  }
  // (Captain Rook's Bandolier: every 6th blow, a free shot at the furthest foe)
  const rook = powerOf(by, 'rookBandolier');
  if (rook && bump(by, 'rookN') % 6 === 0) {
    const far = foesOf(b, by).filter((f) => f.alive).sort((x, y) => apart(y, by) - apart(x, by) || x.id - y.id)[0];
    if (far) {
      skillHit(b, by, far, atkOf(by) * 0.8 * rook - defenceOf(far), out);
      fired(by, 'rookBandolier', out);
    }
  }
}

/** A blow taken (from `fxStruck`). */
export function powerStruck(b: Battle, attacker: Unit, me: Unit, out: BattleEvent[]): void {
  if (!me.eq?.powers?.length || !attacker.alive) return;
  const winter = powerOf(me, 'sevenWinters');
  if (winter && chillFor(b, attacker, 1500 * winter, false, true, me)) bump(me, 'sevenWinters#fired');
  const gorgon = powerOf(me, 'gorgonEye');
  if (gorgon && apart(attacker, me) === 1 && lucky(b, 0.25 * gorgon)) {
    stunFor(b, attacker, 1000, false, 'stun', me);
    fired(me, 'gorgonEye', out);
  }
}

/** A kill (from `fxKill`). */
export function powerKill(b: Battle, by: Unit, victim: Unit, out: BattleEvent[]): void {
  if (!by.eq?.powers?.length || !by.alive) return;
  // (Army of the Dead: the slain rises as a wraith for the heroes, two at most)
  if (powerOf(by, 'armyOfDead') && b.units.filter((x) => x.alive && x.owner === by.id && x.def === 'wraith').length < 2 && raiseWraith(b, by, victim, 8000, out)) fired(by, 'armyOfDead', out);
  const song = powerOf(by, 'gravesong');
  if (song) {
    mendUnit(by, by.maxHp * 0.06 * song, out);
    if (key(by, 'songN') < 10) {
      bump(by, 'songN');
      by.power = (by.power ?? 1) * 1.02;
    }
    fired(by, 'gravesong', out, false);
  }
  // (Last Light: a kill makes the next skill ready)
  if (powerOf(by, 'lastLight')) {
    gain(by, CHARGE_MAX, true);
    fired(by, 'lastLight', out, false);
  }
  // (Shadow Dance: unseen behind the furthest foe within 4, and a crit)
  if (powerOf(by, 'shadowDance')) {
    const far = foesOf(b, by).filter((f) => f.alive && apart(f, by) <= 4).sort((x, y) => apart(y, by) - apart(x, by) || x.id - y.id)[0];
    if (far) {
      const [du, dv] = towards(by, far);
      const u = far.u + du;
      const v = far.v + dv;
      if (free(b, u, v)) {
        out.push({ kind: 'blink', by: by.id, from: { u: by.u, v: by.v }, to: { u, v } });
        by.u = u;
        by.v = v;
        by.step = undefined;
        by.hideUntil = b.t + 1000;
        hurt(b, by, far, Math.max(1, Math.round(atkOf(by) * 1.5 - defenceOf(far))), true, false, out, 'skill');
        fired(by, 'shadowDance', out);
      }
    }
  }
}

/** Every tick (from `fxTick`). */
export function powerTick(b: Battle, me: Unit, out: BattleEvent[]): void {
  if (!me.eq?.powers?.length || !me.alive) return;
  if (powerOf(me, 'sevenWinters')) shake(b, me, ['chill', 'freeze']);
  if (powerOf(me, 'giantKing') && (me.stunUntil ?? 0) > b.t && !isFrozen(b, me)) {
    shake(b, me, ['stun']);
    bump(me, 'giantKing#fired');
  }
  if (powerOf(me, 'ashwalker') && dotOf(me)?.kind === 'burn') putOut(me);
  if (b.t % 1000 !== 0) return;
  // (Dragon's Heart: below half health, draconic: more attack, and fire on the foes near every 5 seconds)
  if (powerOf(me, 'dragonsHeart') && me.hp < me.maxHp / 2) {
    if (once(me, 'heart')) {
      me.power = (me.power ?? 1) * 1.25;
      fired(me, 'dragonsHeart', out);
    }
    if (bump(me, 'heartN') % 5 === 1) for (const f of foesOf(b, me).filter((x) => x.alive && apart(x, me) <= 2)) skillHit(b, me, f, atkOf(me) * 0.6 - defenceOf(f), out);
  }
  // (Tailwind: the wearer and the allies beside it are hastened)
  if (powerOf(me, 'tailwind')) {
    for (const x of allies(b, me))
      if (apart(x, me) <= 1) x.hasteUntil = Math.max(x.hasteUntil ?? 0, b.t + 1100);
    bump(me, 'tailwind#fired');
  }
  // (Undertow: on water the wearer mends)
  const tide = powerOf(me, 'undertow');
  const ground = tileOf(b, me).ground;
  if (tide && (ground === 'water' || ground === 'deep')) mendUnit(me, me.maxHp * 0.02, out);
  // (Ashwalker Sabatons: the foes beside the wearer catch fire)
  const ash = powerOf(me, 'ashwalker');
  if (ash && b.t % 2000 === 0)
    for (const f of foesOf(b, me).filter((x) => x.alive && apart(x, me) === 1 && !dotOf(x))) {
      setDot(b, f, { kind: 'burn', dmg: Math.max(1, Math.round(atkOf(me) * 0.15 * ash)), every: 1000, ms: 3000, by: me.id, next: b.t + 1000, until: b.t + 3000 });
      bump(me, 'ashwalker#fired');
    }
  // (the Bell of Ending: once, when every foe left is under 30%, each is stunned)
  const bell = powerOf(me, 'bellOfEnding');
  if (bell && !key(me, 'bell#used')) {
    const left = foesOf(b, me).filter((x) => x.alive);
    if (left.length && left.every((x) => x.hp < x.maxHp * 0.3) && once(me, 'bell')) {
      for (const f of left) stunFor(b, f, 2000 * bell, false, 'stun', me);
      fired(me, 'bellOfEnding', out);
    }
  }
  // (the Time Witch's Hourglass: once, below half health, the skill is ready again)
  if (powerOf(me, 'hourglass') && me.hp < me.maxHp / 2 && once(me, 'hourglass')) {
    gain(me, CHARGE_MAX, true);
    fired(me, 'hourglass', out);
  }
}

/** A skill has gone off (from `powered`). */
export function powerCast(b: Battle, me: Unit, s: Skill, out: BattleEvent[], from: number): void {
  if (!me.eq?.powers?.length || ECHO.has(b)) return;
  // (Long Winter: the first skill of the fight freezes every foe within 2 tiles)
  if (powerOf(me, 'longWinter') && once(me, 'winter')) {
    for (const f of foesOf(b, me).filter((x) => x.alive && apart(x, me) <= 2)) freezeFor(b, f, 2000, false, me);
    fired(me, 'longWinter', out);
  }
  // (Pyre Walker: what the skill struck is set burning)
  if (powerOf(me, 'pyreWalker'))
    for (const e of out.slice(from))
      if (e.kind === 'hit' && e.by === me.id) {
        const f = b.units.find((x) => x.id === e.to);
        if (f?.alive && f.side !== me.side && !dotOf(f)) {
          setDot(b, f, { kind: 'burn', dmg: Math.max(1, Math.round(atkOf(me) * 0.15)), every: 1000, ms: 4000, by: me.id, next: b.t + 1000, until: b.t + 4000 });
          bump(me, 'pyreWalker#fired');
        }
      }
  // (the Unwritten Book: every skill fills a tenth of the ultimate)
  const book = powerOf(me, 'unwrittenBook');
  if (book && ultimateOf(me)) {
    me.charge2 = Math.min(CHARGE_MAX, (me.charge2 ?? 0) + CHARGE_MAX * 0.1 * book);
    bump(me, 'unwrittenBook#fired');
  }
  // (Echoing Word: every third skill is cast again at half strength)
  if (powerOf(me, 'echoingWord') && bump(me, 'echoN') % 3 === 0) {
    ECHO.add(b);
    try {
      powered(b, me, s, -0.5, out);
    } finally {
      ECHO.delete(b);
    }
    fired(me, 'echoingWord', out);
  }
}
const ECHO = new WeakSet<Battle>();

/** A hero would fall: the Ferryman's Coat, or an ally's Dawnbringer, holds it up. True when it stands. */
export function powerSpare(b: Battle, to: Unit, out: BattleEvent[]): boolean {
  const ferry = powerOf(to, 'ferryman');
  if (ferry && once(to, 'ferry')) {
    to.hp = Math.max(1, Math.round(to.maxHp * 0.3 * ferry));
    to.hideUntil = b.t + 2000;
    out.push({ kind: 'heal', to: to.id, amount: to.hp });
    fired(to, 'ferryman', out);
    return true;
  }
  if (to.side !== 'hero') return false;
  const dawn = allies(b, to).find((x) => x !== to && powerOf(x, 'dawnbringer') && x.hp > 3 && !key(x, 'dawn#used'));
  if (!dawn || !once(dawn, 'dawn')) return false;
  const give = Math.floor(dawn.hp / 3);
  dawn.hp -= give;
  to.hp = Math.max(1, give);
  for (const x of [dawn, to]) {
    const hp = Math.round(x.maxHp * 0.2);
    if (!x.shield || x.shield.hp < hp) x.shield = { hp, until: b.t + 8000 };
  }
  out.push({ kind: 'heal', to: to.id, amount: to.hp, by: dawn.id });
  fired(dawn, 'dawnbringer', out);
  return true;
}

/** A hero has fallen for good: the Crown of the Last King rallies every ally. */
export function powerFell(b: Battle, to: Unit, out: BattleEvent[]): void {
  const crown = powerOf(to, 'lastKing');
  if (!crown) return;
  rally(b, to, 6000 * crown, 99);
  fired(to, 'lastKing', out);
}

/** A blow was dodged (from `onDodged`): the Slippers of the Moon Court feed the skill. */
export function powerDodged(to: Unit): void {
  const moon = powerOf(to, 'moonSlippers');
  if (moon) {
    gain(to, 6 * moon);
    bump(to, 'moonSlippers#fired');
  }
}
