// WEEKLY-TRIAL (docs/notes/weekly-trial.md): the week's trial, as data and the fight's hooks. A short run of seven waves against one army,
// under one or two rules that change each week. Every player meets the same trial in the same week: it is chosen from the week's number
// alone (`trialWeek`; the page reads the week from the day in Mountain time, the week turning at Monday 00:00), with no clock in here.
//
// The rules are real rules of the fight, each a few plain fields (`TrialRule`):
// - who may enter: classes only (`only`), classes barred (`bar`), one hero of each class (`oneClass`), read by the run (`trialAllows`);
// - the fight: a share more harm from some classes (`classAtk`), harm turned back on the striker (`reflect`), both through `trialHurt`,
//   which `hurt` in battle.ts calls only when `Battle.trial` is set; and the floor twists' own fields (`twist`: fog, a wound, mana, pace)
//   and the heroes' healing (`heal`), which the fight already reads;
// - the waves: twice the foes at half their health (`swarm`), laid by `trialArmy` and `startStage`.
// A fight outside the trial has none of it (`Battle.trial` unset, no twist from here), so every other fight and every recorded one plays out
// as it did. No stream is drawn from: the rotation is a fixed cycle and the rules roll nothing. Pure rules: no Pixi, no DOM.

import { ARMIES, bossOf, type Army } from './armies';
import { classOf } from './armyWeakness';
import { DAILY_LAST_STATS, DAILY_MID_STATS } from './daily';
import { SWARM_MAX } from './dailyThemes';
import { mixSeed } from './rng';
import { UNITS } from './units';
import type { TwistFx } from './twists';

/** What a rule does in the fight (the part `Battle.trial` carries). */
export interface TrialFx {
  /** Heroes of these classes deal this much harm (x) to the foes. */
  classAtk?: { classes: readonly string[]; mult: number };
  /** Heroes of these classes turn this share of a foe's blow back on the striker (blows only, not splash, skills or ailments). */
  reflect?: { classes: readonly string[]; share: number };
}

export interface TrialRule {
  id: string;
  name: string;
  /** One line for the card. */
  text: string;
  /** The classes the rule favours (for the card's "shines" line and the tests). */
  shine: readonly string[];
  /** Only heroes of these classes may enter. */
  only?: readonly string[];
  /** Heroes of these classes may not enter. */
  bar?: readonly string[];
  /** No two heroes of one class in the field. */
  oneClass?: boolean;
  /** The fight's own hooks. */
  fx?: TrialFx;
  /** Floor-twist fields the fight already reads (fog, wound, mana, pace). */
  twist?: TwistFx;
  /** Every hero's healing is multiplied by this. */
  heal?: number;
  /** The field waves bring twice the foes, each at `SWARM_HP` of its health. */
  swarm?: boolean;
}

/** The share of their health a horde's foes have (and a horde wave holds at most `SWARM_MAX` foes, as a swarm day's do). */
export const TRIAL_SWARM_HP = 0.5;

const r = (x: TrialRule): TrialRule => x;
/** The rules, eleven of them. The numbers were set by `npm run trial-rate` (`tools/trialRate.ts`) so that every week is won about as often. */
export const TRIAL_RULES: Readonly<Record<string, TrialRule>> = Object.fromEntries(
  [
    r({ id: 'wildKin', name: 'The Wild Kin', text: 'Only Beasts and Wardens may enter, and they strike 25% harder.', shine: ['beast', 'warden'], only: ['beast', 'warden'], fx: { classAtk: { classes: ['beast', 'warden'], mult: 1.25 } } }),
    r({ id: 'noHealers', name: 'No Healers', text: 'No Supports or Wardens may enter.', shine: ['guardian', 'bulwark'], bar: ['support', 'warden'] }),
    r({ id: 'oneEach', name: 'One of Each', text: 'No two heroes of the same class in the field.', shine: [], oneClass: true }),
    r({ id: 'powder', name: 'Powder and String', text: 'Gunners and Marksmen deal double.', shine: ['gunner', 'marksman'], fx: { classAtk: { classes: ['gunner', 'marksman'], mult: 2 } } }),
    r({ id: 'fog', name: 'Fog', text: 'A thick fog: every shooter, hero or foe, reaches 1 tile less.', shine: ['blade', 'vanguard', 'beast'], twist: { fog: 1 } }),
    r({ id: 'shieldWall', name: 'Shield Wall', text: 'Bulwarks and Guardians turn 40% of every blow they take back on the striker.', shine: ['bulwark', 'guardian'], fx: { reflect: { classes: ['bulwark', 'guardian'], share: 0.4 } } }),
    r({ id: 'lastLight', name: 'Last Light', text: 'Heroes start each wave 40% down on health, and all their healing is doubled.', shine: ['support', 'warden'], twist: { wound: 0.4 }, heal: 2 }),
    r({ id: 'spellstorm', name: 'Spellstorm', text: "Casters and Arcanists deal 60% more, and the king's mana fills 50% faster.", shine: ['caster', 'arcanist'], fx: { classAtk: { classes: ['caster', 'arcanist'], mult: 1.6 } }, twist: { mana: 1.5 } }),
    r({ id: 'horde', name: 'The Horde', text: 'Every field wave brings twice the foes, each at half health.', shine: ['caster', 'gunner'], swarm: true }),
    r({ id: 'moonless', name: 'Moonless Night', text: 'Tricksters and Assassins deal 60% more.', shine: ['trickster', 'assassin'], fx: { classAtk: { classes: ['trickster', 'assassin'], mult: 1.6 } } }),
    r({ id: 'charge', name: 'The Charge', text: 'Vanguards, Blades and Beasts deal 40% more, and everyone acts 15% faster.', shine: ['vanguard', 'blade', 'beast'], fx: { classAtk: { classes: ['vanguard', 'blade', 'beast'], mult: 1.4 } }, twist: { pace: 1.15 } }),
  ].map((x) => [x.id, x]),
);
export const TRIAL_RULE_IDS = Object.keys(TRIAL_RULES);

/** A week's trial: its army and its rules (one or two). */
export interface TrialWeek {
  army: string;
  rules: readonly string[];
}

/** The rotation, twelve weeks long, each rule with an army whose weakness fits it (`ARMY_MATCH`), every army at least once. Week n of the
 *  game's calendar (`trialWeek`) is entry n mod 12. The starter packs' heroes (Guardians, a Blade, a Marksman, a Trickster, a Caster) shine
 *  in Shield Wall, Powder and String, Moonless Night, The Charge and Spellstorm. */
export const TRIAL_WEEKS: readonly TrialWeek[] = [
  { army: 'golems', rules: ['powder'] },
  { army: 'orcs', rules: ['shieldWall'] },
  { army: 'wildwood', rules: ['fog'] },
  { army: 'ogres', rules: ['spellstorm'] },
  { army: 'undead', rules: ['noHealers'] },
  { army: 'beasts', rules: ['wildKin'] },
  { army: 'infernal', rules: ['lastLight'] },
  { army: 'labyrinth', rules: ['oneEach', 'moonless'] },
  { army: 'yokai', rules: ['horde'] },
  { army: 'orcs', rules: ['moonless', 'fog'] },
  { army: 'ogres', rules: ['charge'] },
  { army: 'golems', rules: ['horde', 'powder'] },
];

/** The trial's waves: seven, a mid-boss at the fourth and the army's last boss at the seventh. Rewards at 3, 5 and 7 waves (`TRIAL_TIERS`). */
export const TRIAL_WAVES = 7;
export const TRIAL_MID = 4;

/** The foes' strength at wave 1 and what they gain a wave (as the daily's, `daily.ts`), and the bosses' hp and attack at wave 1's strength. */
export const TRIAL_START = 1.0;
export const TRIAL_GROWTH = 0.17;
/** Each army's bosses eased or hardened, so every week is about as hard as another (set by `npm run trial-rate`). */
export const TRIAL_BOSS: Readonly<Record<string, number>> = { orcs: 1.15, undead: 0.65, beasts: 1, wildwood: 1, labyrinth: 1, ogres: 1, infernal: 0.8, yokai: 0.9, golems: 1.1 };

/** The salt of a week's seed. */
export const TRIAL_SALT = 0x7a1a;

/** The week's trial (the week is the game's calendar week, Monday to Sunday). */
export const trialWeek = (week: number): TrialWeek => TRIAL_WEEKS[(((week | 0) % TRIAL_WEEKS.length) + TRIAL_WEEKS.length) % TRIAL_WEEKS.length];
/** A week's rules, as data. */
export const trialRulesOf = (week: number): TrialRule[] => trialWeek(week).rules.map((id) => TRIAL_RULES[id]).filter(Boolean);
/** The seed of a week's trial (its boards, its lands' traps; the same for every player). */
export const trialSeed = (week: number): number => mixSeed(week, TRIAL_SALT);

/** Every rule of a week laid together, as one. */
export function mergedRule(week: number): TrialRule {
  const rules = trialRulesOf(week);
  const out: TrialRule = { id: rules.map((x) => x.id).join('+'), name: rules.map((x) => x.name).join(' · '), text: rules.map((x) => x.text).join(' '), shine: [...new Set(rules.flatMap((x) => x.shine))] };
  const fx: TrialFx = {};
  const twist: TwistFx = {};
  for (const x of rules) {
    if (x.only) out.only = out.only ? out.only.filter((c) => x.only!.includes(c)) : [...x.only];
    if (x.bar) out.bar = [...new Set([...(out.bar ?? []), ...x.bar])];
    if (x.oneClass) out.oneClass = true;
    if (x.swarm) out.swarm = true;
    if (x.heal) out.heal = (out.heal ?? 1) * x.heal;
    if (x.fx?.classAtk) fx.classAtk = fx.classAtk ? { classes: [...new Set([...fx.classAtk.classes, ...x.fx.classAtk.classes])], mult: Math.max(fx.classAtk.mult, x.fx.classAtk.mult) } : x.fx.classAtk;
    if (x.fx?.reflect) fx.reflect = x.fx.reflect;
    Object.assign(twist, x.twist);
  }
  if (Object.keys(fx).length) out.fx = fx;
  if (Object.keys(twist).length) out.twist = twist;
  return out;
}

/** Whether a hero kind may enter a week's trial by its class (the one-of-each rule is the squad's: `trialSquadOk`). */
export function trialAllows(week: number, kind: string): boolean {
  const rule = mergedRule(week);
  const c = classOf(kind);
  if (rule.only && (!c || !rule.only.includes(c))) return false;
  if (rule.bar && c && rule.bar.includes(c)) return false;
  return true;
}

/** Whether `kind` may stand in a squad of `kinds` under a week's rules (its class allowed, and no second of its class on a one-of-each week). */
export function trialSquadOk(week: number, kinds: readonly string[], kind: string): boolean {
  if (!trialAllows(week, kind)) return false;
  if (mergedRule(week).oneClass && kinds.some((k) => k !== kind && classOf(k) === classOf(kind))) return false;
  return true;
}

/** The heroes a week admits, from those given (a save's owned heroes), in their order. */
export const trialEligible = (week: number, kinds: readonly string[]): string[] => kinds.filter((k) => trialAllows(week, k));

const cache = new Map<number, Army>();

/** A week's trial as an army: seven waves of the week's army, its field waves thinned to five, its mid-boss at wave 4 and its last boss at wave 7. */
export function trialArmy(week: number): Army {
  let a = cache.get(week);
  if (a) return a;
  const w = trialWeek(week);
  const host = ARMIES.find((x) => x.id === w.army)!;
  const rule = mergedRule(week);
  const field = host.waves.filter((x) => !x.boss);
  const pick = (i: number) => field[Math.round((i * (field.length - 1)) / 4)];
  const mid = host.waves.find((x) => x.boss === 'mid') ?? field[Math.floor(field.length / 2)];
  const last = host.waves[host.waves.length - 1];
  const waves = Array.from({ length: TRIAL_WAVES }, (_, k) => {
    const n = k + 1;
    if (n === TRIAL_WAVES) return { foes: last.foes, boss: 'final' as const };
    if (n === TRIAL_MID) return { foes: mid.foes, boss: 'mid' as const };
    const foes = pick(n < TRIAL_MID ? n - 1 : n - 2).foes;
    return { foes: rule.swarm ? [...foes, ...foes].slice(0, Math.max(foes.length, SWARM_MAX)) : foes };
  });
  const ease = TRIAL_BOSS[host.id] ?? 1;
  a = {
    id: `trial${week}`,
    name: `Trial: ${host.name}`,
    blurb: `Seven waves ending in the ${UNITS[bossOf(host)].name}.`,
    level: 1,
    area: host.area,
    waves,
    start: TRIAL_START,
    growth: TRIAL_GROWTH,
    mid: { hp: Math.round(DAILY_MID_STATS.hp * ease), atk: Math.round(DAILY_MID_STATS.atk * ease) },
    last: { hp: Math.round(DAILY_LAST_STATS.hp * ease), atk: Math.round(DAILY_LAST_STATS.atk * ease) },
    pay: 0,
    clear: 0,
  };
  if (cache.size > 16) cache.clear();
  cache.set(week, a);
  return a;
}

/** The army a week's trial is of (its weaknesses and resistances hold in the trial's fights). */
export const trialHost = (week: number): Army => ARMIES.find((x) => x.id === trialWeek(week).army)!;

// ---- the fight's hooks ----

/** A fight's hold of a trial: the rules' fx, read by `trialHurt`. */
export interface TrialFight {
  fx: TrialFx;
}

/** What a trial's rule makes of a blow, from `hurt` (only when `Battle.trial` is set): the harm, and the harm turned back on the striker.
 *  `hero` is the credited hero of the striker (itself, or a summon's owner). */
export function trialHurt(t: TrialFight, by: { side: string; def: string }, hero: { side: string; def: string }, to: { side: string; def: string }, dmg: number, src: string, splash: boolean): { dmg: number; back: number } {
  let back = 0;
  const ca = t.fx.classAtk;
  if (ca && hero.side === 'hero' && to.side === 'foe') {
    const c = classOf(hero.def);
    if (c && ca.classes.includes(c)) dmg = Math.max(1, Math.round(dmg * ca.mult));
  }
  const rf = t.fx.reflect;
  if (rf && to.side === 'hero' && by.side === 'foe' && src === 'blow' && !splash) {
    const c = classOf(to.def);
    if (c && rf.classes.includes(c)) back = Math.max(1, Math.round(dmg * rf.share));
  }
  return { dmg, back };
}
