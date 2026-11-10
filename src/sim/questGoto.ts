// "Take me there" (UI batch 1): where a quest's goal is done. Every goal kind has a destination, so no quest is left without a way in:
//   - a goal that names a quest battle opens that battle;
//   - a goal that names an army, a tier or a boss opens that army's start screen on that tier (the Armies screen if it is not open yet);
//   - a goal that names a mode (the daily, the Last Stand, the Calamity) opens that mode, and the goals only a mode can meet
//     (clear a daily, the Last Stand's waves and rooms, the Calamity's guardians) open it too;
//   - a goal counted across fights (ultimates, spells, duos, kills, damage...) opens the next fight that can progress it: the army the
//     war table shows (the first open one not yet cleared, else the newest).
// Pure rules: no Pixi, no DOM. The page turns a destination into a tap (`home.ts`).

import { ARMIES, armyById, armyCleared, armyUnlocked, bossesOf, tierOpen, waveFoes, type Army } from './armies';
import type { Meta } from './meta';
import { heroName } from './heroNames';
import type { Cond, Goal, QuestDef } from './questData';
import { objectiveDone, objectivesOf, type QuestActive } from './quests';
import { TIERS } from './tiers';

export type Destination =
  /** A quest battle (the party with its cast locked in, then the story). */
  | { to: 'battle'; battle: string }
  /** An army's start screen (its party pick, then the fight) on this tier. */
  | { to: 'army'; army: string; tier: number }
  /** The Armies screen, ready on this army (the goal's army or tier is not open yet). */
  | { to: 'armies'; army?: string }
  | { to: 'daily' }
  | { to: 'stand' }
  | { to: 'calamity' };

/** The army the war table shows: the first open one not cleared yet, else the newest open one. */
export function frontArmy(m: Meta): Army {
  const open = ARMIES.filter((a) => armyUnlocked(m, a.id));
  return open.find((a) => !armyCleared(m, a.id)) ?? open[open.length - 1] ?? ARMIES[0];
}

/** The army a goal's riders point at, if they name one: its `army`, the army whose boss `boss` names, or the army whose foes `foes` or `ofArmy` name. */
function armyNamed(g: Goal): Army | undefined {
  const c = g as { army?: string; boss?: readonly string[]; foes?: readonly string[]; ofArmy?: string };
  if (c.army) return armyById(c.army);
  if (c.ofArmy) return armyById(c.ofArmy);
  if (c.boss) return ARMIES.find((a) => bossesOf(a).some((b) => c.boss!.includes(b.id)));
  if (c.foes) return ARMIES.find((a) => a.waves.some((_, i) => waveFoes(a, i + 1).some((f) => c.foes!.includes(f))));
  return undefined;
}

/** A goal's destination for this save. */
export function destinationOf(m: Meta, goal: Goal): Destination {
  switch (goal.kind) {
    case 'battle':
      return { to: 'battle', battle: goal.battle };
    case 'clearDaily':
      return { to: 'daily' };
    case 'standWave':
    case 'standRoom':
    case 'holdLine':
      return { to: 'stand' };
    case 'calGuardian':
    case 'calClear':
      return { to: 'calamity' };
    case 'wavesWon':
    case 'bossDown':
    case 'kills':
    case 'clearArmy':
    case 'tally':
    case 'ults':
    case 'spells':
    case 'duos':
    case 'teamCombo':
    case 'mvp':
      return fightDestination(m, goal);
    default: {
      // (a new goal kind must be given a destination here: this stops the build until it is)
      const never: never = goal;
      return never;
    }
  }
}

/** A fight goal: its mode if it names one, else the army it names, else the next army to fight. */
function fightDestination(m: Meta, goal: Extract<Goal, { kind: 'wavesWon' | 'bossDown' | 'kills' | 'clearArmy' | 'tally' | 'ults' | 'spells' | 'duos' | 'teamCombo' | 'mvp' }>): Destination {
  if (goal.mode === 'daily') return { to: 'daily' };
  if (goal.mode === 'tower' || goal.mode === 'stand') return { to: 'stand' };
  if (goal.mode === 'calamity') return { to: 'calamity' };
  const named = armyNamed(goal);
  // (a goal open to any army, with a tier asked: the furthest army that has that tier open, so the hard fight is one the player can start)
  const want0 = Math.max(0, Math.min(TIERS.length - 1, goal.tier ?? 0));
  const tiered = !named && want0 > 0 ? [...ARMIES].reverse().find((a) => armyUnlocked(m, a.id) && tierOpen(m, a, want0)) : undefined;
  const army = named ?? tiered ?? frontArmy(m);
  if (!armyUnlocked(m, army.id)) return { to: 'armies', army: army.id };
  // (a tier asked for: that one if it is open, else the Armies screen shows what opens it)
  const want = Math.max(0, Math.min(TIERS.length - 1, goal.tier ?? 0));
  if (!tierOpen(m, army, want)) return { to: 'armies', army: army.id };
  return { to: 'army', army: army.id, tier: want };
}

/** Where a quest is done (QUESTS-3): the place of its first unfinished objective (every objective has one, since each is a goal), and the rules to show there. */
export interface QuestPlace {
  /** Which objective the place is for (0 the quest's `goal`, 1 and up its `goals`). */
  objective: number;
  dest: Destination;
  /** The rules the objective, and the quest as a whole, ask of the fight ("No ultimates in this fight", "Level 30 or lower"). */
  rules: string[];
}

/** The rules a quest and one objective ask, in plain words (British spelling). */
export function ruleLines(q: QuestDef, goal: Goal = q.goal): string[] {
  const c = goal as Goal & Cond;
  const out: string[] = [];
  if (q.ordered) out.push('Objectives in order');
  // (QUEST-POSSIBLE: a one-run quest counts in any one run; the daily's say so)
  if (q.oneRun) out.push(objectivesOf(q).some((x) => (x as Cond).mode === 'daily' || x.kind === 'clearDaily') ? 'All in one daily' : 'All in one army run');
  if (q.streak) out.push(`${q.streak} days running`);
  if (q.within) out.push(`Within ${q.within} day${q.within === 1 ? '' : 's'} of taking it`);
  // (QUEST-POSSIBLE: the Auto switches would break these rules by themselves, so the chip says which to turn off)
  if (c.noUlts) out.push('No ultimates in this fight (ULT Auto off)');
  if (c.noSpells) out.push("No king's spells (SPELL Auto off)");
  if (c.noHires) out.push('No sellsword hired at the cart');
  if (c.noHeart) out.push('No heart spent');
  if (c.flawless) out.push('No hero falls');
  if (c.quick !== undefined) out.push(`Win within ${c.quick} seconds`);
  if (c.levelCap !== undefined) out.push(`Heroes of level ${c.levelCap} or lower`);
  if (c.benchBest) out.push('Your best hero sits out');
  if (c.without?.length) out.push(`Without ${c.without.map(heroName).join(', ')}`);
  if (c.exactly !== undefined) out.push(`Exactly ${c.exactly} heroes`);
  if (c.most !== undefined) out.push(`At most ${c.most} hero${c.most === 1 ? '' : 'es'}`);
  return out;
}

/** The place of a quest for this save: its first unfinished objective (the first, for a quest not begun), with the rules to show there. */
export function questPlace(m: Meta, q: QuestDef, a?: QuestActive): QuestPlace {
  const objs = objectivesOf(q);
  const i = a ? Math.max(0, objs.findIndex((_, k) => !objectiveDone(a, q, k))) : 0;
  return { objective: i, dest: destinationOf(m, objs[i]), rules: ruleLines(q, objs[i]) };
}
