// The fight HUD's words and numbers (BATTLE-HUD, docs/notes/battle-hud.md): what each hero row's skill chips, its ultimate and a skill's
// sheet show, and how the rows are laid out for the party's size. Pure: it reads the battle and the kit data (names, costs, gaps, blood
// costs, tier skills, revive faces), so a renamed or re-costed skill shows as it now is; no DOM, no Pixi, so the tests read it.

import { type Battle, type Unit } from './sim/battle';
import { keyOf, kitOf, ultimateOf, ULT_LEVEL, type Skill } from './sim/abilities';
import { costOf, heroKitOf, resMax, resOf, reviveCost, reviveReady, SLOT_LEVELS, slotOpen, ultFull, type HeroKit, type Slot } from './sim/heroKits';
import { REVIVE } from './sim/kits/revive';

/** Which of a hero's moves a chip or a sheet shows: skill 1, 2 or 3 (the skills overhaul's batch 4), or the ultimate. */
export type Which = 1 | 2 | 3 | 'ult';
/** A skill slot's number. */
export type SlotNo = 1 | 2 | 3;
/** A hero's slot `n`, when its kit has one. */
const slotAt = (hk: HeroKit, n: SlotNo): Slot | undefined => hk.slots[n - 1];

/** The pool's short tag, as the bars and chips show it. */
export const poolTag = (hk: HeroKit): 'MP' | 'SP' => (hk.pool === 'mana' ? 'MP' : 'SP');

/** The shortest time between two casts of a slot: its cooldown. */
export const gapOf = (_hk: HeroKit, slot: Slot): number => slot.cd;

/** The one rank line a skill's sheet shows (the skills overhaul's batch 3): merging no longer changes a skill. */
export const EVERY_RANK = { title: 'Every rank', text: 'The same at every rank: a rank gives more health and attack, never a better skill.', on: true, now: false };

/** What a skill chip shows. */
export interface ChipView {
  which: SlotNo;
  skill: Skill;
  name: string;
  /** What it costs this hero now (the tier 3 discount taken off), rounded. */
  cost: number;
  /** A share of max health it also costs (the blood heroes), or 0. */
  blood: number;
  tag: 'MP' | 'SP';
  gap: number;
  /** The share of its gap still to run (1 just cast, 0 ready). */
  cd: number;
  /** How much of the cost the pool holds (0 to 1). */
  pay: number;
  open: boolean;
  /** Open but the pool cannot pay yet. */
  short: boolean;
  /** A healer's skill 2 shows its revive face: it is ready and a friend lies fallen. */
  revive: boolean;
}

/** A hero's skill chip, as it stands at the battle's time. */
export function chipOf(b: Battle, u: Unit, which: SlotNo): ChipView | undefined {
  const hk = heroKitOf(u);
  const slot = hk && slotAt(hk, which);
  if (!hk || !slot) return undefined;
  const revive = which === 2 && !!hk.s2.revive && reviveReady(b, u);
  const skill = revive ? hk.s2.revive!.skill : slot.skill;
  const open = slotOpen(u, which);
  const cost = revive ? reviveCost(hk) : costOf(u, slot);
  const gap = revive ? REVIVE.GAP_MS : gapOf(hk, slot);
  const at = revive ? u.ks?.atRev : which === 1 ? u.ks?.at1 : which === 2 ? u.ks?.at2 : u.ks?.at3;
  const cd = at === undefined ? 0 : Math.max(0, Math.min(1, (at + gap - b.t) / gap));
  const res = resOf(u, hk.pool);
  return {
    which,
    skill,
    name: skill.name,
    cost: Math.round(cost),
    blood: revive ? 0 : slot.hpCost ?? 0,
    tag: poolTag(hk),
    gap,
    cd,
    pay: cost > 0 ? Math.min(1, res / cost) : 1,
    open,
    short: open && res + 1e-9 < cost,
    revive,
  };
}

/** The chip's second line: "30 SP", "25 SP +10%HP" for a blood cost, "· 2.4s" while it cools; "Lv 10" while locked. `compact` is the cost
 *  alone (the small chips of a party over five; their sheet has the rest). */
export function chipLine(c: ChipView, compact = false): string {
  if (!c.open) return compact ? `Lv${SLOT_LEVELS[c.which - 1]}` : `Lv ${SLOT_LEVELS[c.which - 1]}`;
  if (compact) return `${c.cost}`;
  const cool = c.cd > 0 ? ` · ${((c.cd * c.gap) / 1000).toFixed(1)}s` : '';
  return `${c.cost} ${c.tag}${c.blood ? ` +${Math.round(c.blood * 100)}%HP` : ''}${cool}`;
}

/** What the ultimate's part of a row shows. */
export interface UltView {
  skill?: Skill;
  /** 0 to 1. */
  meter: number;
  ready: boolean;
  queued: boolean;
  locked: boolean;
}

export function ultOf(b: Battle, u: Unit): UltView {
  const ult = ultimateOf(u);
  const queued = u.ultOrder !== undefined || !!b.orders?.some((o) => o.kind === 'ult' && o.unit === u.id);
  return { skill: ult, meter: ult ? Math.min(1, (u.charge2 ?? 0) / ult.need) : 0, ready: !!ult && ultFull(u) && u.alive, queued: queued && u.alive, locked: !ult };
}

/** The bars' numbers: health and the pool, "1419/1978" and "48/60 SP". */
export function barNumbers(u: Unit): { hp: string; pool: string; hpShare: number; poolShare: number } {
  const hk = heroKitOf(u);
  const max = hk ? resMax(hk.pool) : 1;
  const res = hk ? resOf(u, hk.pool) : 0;
  return {
    hp: `${Math.max(0, Math.ceil(u.hp))}/${u.maxHp}`,
    pool: hk ? `${Math.floor(res)}/${max} ${poolTag(hk)}` : '',
    hpShare: Math.max(0, Math.min(1, u.hp / u.maxHp)),
    poolShare: Math.max(0, Math.min(1, res / max)),
  };
}

/** Which move a `skill` event's key is, for this hero (its revive face counts as skill 2), or null. */
export function whichCast(u: Unit, key: string): Which | null {
  const hk = heroKitOf(u);
  if (!hk) return null;
  if (keyOf(hk.s1.skill) === key) return 1;
  if (keyOf(hk.s2.skill) === key || (hk.s2.revive && keyOf(hk.s2.revive.skill) === key)) return 2;
  if (hk.s3 && keyOf(hk.s3.skill) === key) return 3;
  const ult = ultimateOf(u);
  return ult && keyOf(ult) === key ? 'ult' : null;
}

/** A skill's sheet: its heading, what it does, its numbers as label and words, and its tier lines. */
export interface SheetView {
  name: string;
  /** "Skill 1", "Skill 2", "Skill 3" or "Ultimate". */
  label: string;
  skill: Skill;
  text: string;
  rows: [string, string][];
  tiers: { title: string; text: string; on: boolean; now: boolean }[];
}

const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** The sheet for one of a hero's moves (the ultimate's too). `auto` is whether the ultimates fire on their own. */
export function sheetOf(b: Battle, u: Unit, which: Which, auto = false): SheetView | undefined {
  const hk = heroKitOf(u);
  if (!hk) return undefined;
  if (which === 'ult') {
    const ult = kitOf(u)?.ultimate;
    if (!ult) return undefined;
    const v = ultOf(b, u);
    const rows: [string, string][] = [];
    if (v.locked) rows.push(['Locked', `Opens at level ${ult.unlock ?? ULT_LEVEL}`]);
    else {
      rows.push(['Meter', `${Math.round(v.meter * 100)}%: it fills as the hero deals and takes blows, and a little each second`]);
      rows.push(['To fire', auto ? 'Auto is on: it goes off by itself when full' : 'Tap the hero’s row when it shows TAP']);
    }
    rows.push(['Cast time', secs(ult.castMs)]);
    return { name: ult.name, label: 'Ultimate', skill: ult, text: ult.text, rows, tiers: [EVERY_RANK] };
  }
  const slot = slotAt(hk, which);
  if (!slot) return undefined;
  const s = slot.skill;
  const open = slotOpen(u, which);
  const rows: [string, string][] = [];
  if (!open) rows.push(['Locked', `Opens at level ${SLOT_LEVELS[which - 1]}`]);
  rows.push(['Cost', `${Math.round(costOf(u, slot))} ${hk.pool}${slot.hpCost ? ` and ${Math.round(slot.hpCost * 100)}% of max health` : ''}`]);
  rows.push(['Cooldown', `${secs(gapOf(hk, slot))} between casts`]);
  rows.push(['Strength', `${Math.round(slot.tune * 100)}% of attack`]);
  rows.push(['Cast time', secs(s.castMs)]);
  if (slot.revive) rows.push(['Revive', `${slot.revive.skill.name}: with a friend fallen, it raises them instead (${reviveCost(hk)} ${hk.pool}, once every ${REVIVE.GAP_MS / 1000}s)`]);
  // (the skills overhaul's batch 3, the owner's rule: a rank gives health and attack only, never a better skill)
  const tiers = [EVERY_RANK];
  return { name: s.name, label: `Skill ${which}`, skill: s, text: s.text, rows, tiers };
}

/** How the rows are laid out for `n` heroes: one full row each up to five; more (the Last Stand's eight, a Calamity's ten) in two columns of
 *  compact rows (portrait, name, bars with numbers, two small skill chips), `rows` deep. */
export function hudLayout(n: number): { pairs: boolean; rows: number } {
  return n > 5 ? { pairs: true, rows: Math.ceil(n / 2) } : { pairs: false, rows: Math.max(1, n) };
}
