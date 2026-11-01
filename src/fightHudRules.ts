// The fight HUD's words and numbers (BATTLE-HUD, docs/notes/battle-hud.md): what each hero row's skill chips, its ultimate and a skill's
// sheet show, and how the rows are laid out for the party's size. Pure: it reads the battle and the kit data (names, costs, gaps, blood
// costs, tier skills, revive faces), so a renamed or re-costed skill shows as it now is; no DOM, no Pixi, so the tests read it.

import { type Battle, type Unit } from './sim/battle';
import { keyOf, kitOf, ultimateOf, ULT_LEVEL, type Skill } from './sim/abilities';
import { costOf, heroKitOf, resMax, resOf, reviveCost, reviveReady, SLOT_LEVELS, slotOpen, ultFull, type HeroKit, type Slot } from './sim/heroKits';
import { REVIVE } from './sim/kits/revive';
import { levelLine, levelOfUse, levelSteps } from './sim/skillLevels';
import type { SkillClass } from './sim/skillRules';

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

/** The one-word name a chip shows (the skills overhaul's batch 7): a chip has room for about 8 letters at 360 px. A name that is one short word
 *  stays whole; the rest are listed here, one word and unique within a hero's kit (a test checks both). The skill's full name is on its sheet. */
export const CHIP_NAMES: Readonly<Record<string, string>> = {
  'Shield Wall': 'Wall', 'Shield Rush': 'Rush', 'Hold Fast': 'Hold', 'Kesa Cut': 'Kesa', 'Sneak Attack': 'Sneak', 'Smoke Bomb': 'Smoke', 'Shuriken Fan': 'Shuriken',
  'Aimed Shot': 'Aimed', 'Double Shot': 'Double', 'Wall of Fire': 'Wall', 'Fire Bolt': 'Bolt', 'Spear Wall': 'Spear', 'Pitchfork Jab': 'Fork', 'Flurry of Blows': 'Flurry',
  'Quivering Palm': 'Palm', 'Step of the Wind': 'Step', 'Healing Draught': 'Draught', 'Healing Mist': 'Mist', 'Elixir of Life': 'Elixir', 'Acid Flask': 'Acid',
  'Chain Lightning': 'Chain', 'Storm Surge': 'Surge', 'Charm Monster': 'Charm', 'Alter Self': 'Alter', 'Fox Wisps': 'Wisps', 'Feather Darts': 'Feather', 'Gust of Wind': 'Gust',
  'Wind Wall': 'Wall', 'Ringing Staff': 'Staff', 'Gore Charge': 'Gore', 'Bull Rush': 'Rush', 'Pipes of Pan': 'Pipes', 'Irresistible Dance': 'Dance', 'Butting Horns': 'Horns',
  'Petrifying Gaze': 'Gaze', 'Flesh to Stone': 'Stone', 'Serpent Bite': 'Bite', 'War Banner': 'Banner', 'Plant the Standard': 'Standard', 'Command Strike': 'Command',
  'Divine Smite': 'Smite', 'Aura of Protection': 'Aura', 'Warding Bond': 'Bond', 'Guiding Bolt': 'Bolt', 'Prayer of Healing': 'Prayer', 'Healing Word': 'Word',
  'Conjure Treant': 'Treant', 'Wild Shape': 'Shape', 'Thorn Whip': 'Whip', 'Reckless Swing': 'Reckless', 'Spike Growth': 'Spikes', 'Barbed Arrow': 'Barbed',
  'Eldritch Blast': 'Blast', 'Drain Life': 'Drain', 'Curse of Weakness': 'Curse', 'Mirror Image': 'Mirror', 'Phantasmal Blade': 'Blade', 'Piercing Shot': 'Pierce',
  'Fan the Hammer': 'Fan', 'Skip Shot': 'Skip', 'Rapid Shot': 'Rapid', 'Suppressing Fire': 'Suppress', 'Barrier Drone': 'Drone', 'Hunter\'s Mark': 'Mark', 'Dirty Trick': 'Trick',
  'Hold Person': 'Hold', 'Dominate Monster': 'Dominate', 'Tomb Rot': 'Rot', 'Grappling Hook': 'Hook', 'Loaded Dice': 'Dice', 'Pistol Shot': 'Pistol', 'Vicious Mockery': 'Mockery',
  'Bardic Inspiration': 'Inspire', 'Summon Beast': 'Summon', 'Pack Tactics': 'Pack', 'Mend the Pack': 'Mend', 'Grasping Tentacles': 'Tentacle', 'Tidal Wave': 'Tidal',
  'Ink Cloud': 'Ink', 'Animate Dead': 'Animate', 'Soul Snare': 'Snare', 'Hourglass Bolt': 'Glass', 'Thunder Step': 'Thunder', 'Static Edge': 'Static', 'Powder Keg': 'Keg',
  'Siege Mode': 'Siege', 'Flak Burst': 'Flak', 'Cure Wounds': 'Cure', 'Death Ward': 'Ward', 'Sacred Flame': 'Sacred', 'Dragon Breath': 'Breath', 'Dragon Dive': 'Dive',
  'Scale Ward': 'Scale', 'Seismic Slam': 'Slam', 'Tunnel Strike': 'Tunnel', 'Wall of Stone': 'Wall', 'Magic Missile': 'Missile', 'Font of Magic': 'Font', 'Arcane Ward': 'Ward',
  'Blood Pact': 'Pact', 'Infernal Brand': 'Brand', 'Lance Sweep': 'Sweep', Resurrection: 'Raise', Revivify: 'Revive', Reincarnate: 'Rebirth', Cannonade: 'Cannon', Grapeshot: 'Grape',
  Judgement: 'Judge', Contagion: 'Plague', Transposition: 'Swap', Shapechange: 'Shift', Disengage: 'Retreat', Whirlwind: 'Whirl', Countercharm: 'Counter', Thunderwave: 'Wave',
};

/** A skill's chip name: its entry in `CHIP_NAMES`, else its first word (cut to 8 letters). */
export const chipName = (s: Skill): string => CHIP_NAMES[s.name] ?? s.name.split(' ')[0].slice(0, 8);

/** A skill class in words, as the sheet's Class row says it. */
export const CLASS_WORDS: Readonly<Record<SkillClass, string>> = {
  jab: 'Jab: cheap and quick',
  strike: 'Strike: the bread and butter',
  heavy: 'Heavy: big, saved for the right moment',
  utility: 'Utility: a lasting aura, banner, summon or shape',
  guard: 'Guard: an escape, ward or save, cast at once when it is needed',
};

/** A slot in a few words for the hero sheet and the codex: "Strike · 24 SP · 5.0s". */
export const slotBrief = (hk: HeroKit, slot: Slot): string =>
  `${slot.cls[0].toUpperCase()}${slot.cls.slice(1)} · ${slot.cost} ${poolTag(hk)}${slot.hpCost ? ` and ${Math.round(slot.hpCost * 100)}% health` : ''} · ${(slot.cd / 1000).toFixed(1)}s`;

/** What a skill chip shows. */
export interface ChipView {
  which: SlotNo;
  skill: Skill;
  name: string;
  /** The one-word name the chip shows. */
  chip: string;
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
    chip: chipName(skill),
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

/** The chip's second line: "30 SP"; "Lv 20" while locked. The cooldown shows as the sweep (its seconds and a blood cost are on the sheet).
 *  `compact` is the cost alone (the small chips of a party over five) and "L20" while locked. */
export function chipLine(c: ChipView, compact = false): string {
  if (!c.open) return compact ? `L${SLOT_LEVELS[c.which - 1]}` : `Lv ${SLOT_LEVELS[c.which - 1]}`;
  return compact ? `${c.cost}` : `${c.cost} ${c.tag}`;
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

/** The sheet for one of a hero's moves (the ultimate's too). `auto` is whether the ultimates fire on their own; `use` (when the page has the save)
 *  gives the hero kind's use points with a skill, by key, for its level's progress. */
export function sheetOf(b: Battle, u: Unit, which: Which, auto = false, use?: (key: string) => number): SheetView | undefined {
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
  rows.push(['Class', CLASS_WORDS[slot.cls]]);
  rows.push(['Cost', `${Math.round(costOf(u, slot))} ${hk.pool}${slot.hpCost ? ` and ${Math.round(slot.hpCost * 100)}% of max health` : ''}`]);
  rows.push(['Cooldown', `${secs(gapOf(hk, slot))} between casts`]);
  rows.push(['Strength', `${Math.round(slot.tune * 100)}% of attack`]);
  rows.push(['Cast time', secs(s.castMs)]);
  // (the skills overhaul's batch 5: the level it has reached by use, and the level it fights at here: Level 1 in the spire and the Calamity)
  const lv = slot.lv ?? 1;
  const points = use?.(keyOf(s));
  const has = points === undefined ? lv : levelOfUse(points);
  rows.push(['Level', `${points === undefined ? `Level ${lv}` : levelLine(points)}${has !== lv ? ` · Level ${lv} here` : ''}`]);
  if (slot.revive) rows.push(['Revive', `${slot.revive.skill.name}: with a friend fallen, it raises them instead (${reviveCost(hk)} ${hk.pool}, once every ${REVIVE.GAP_MS / 1000}s)`]);
  // (the skills overhaul's batch 3, the owner's rule: a rank gives health and attack only, never a better skill; batch 5: the skill's levels by
  // use take the tier lines' place)
  const tiers = levelSteps(keyOf(s)).map((line, i) => {
    const [title, text] = line.split(': ');
    return { title, text, on: i < lv, now: i === lv - 1 };
  });
  return { name: s.name, label: `Skill ${which}`, skill: s, text: s.text, rows, tiers };
}

/** How the rows are laid out for `n` heroes: one full row each up to five; more (the Last Stand's eight, a Calamity's ten) in two columns of
 *  compact rows (portrait, name, bars with numbers, three small skill chips), `rows` deep. */
export function hudLayout(n: number): { pairs: boolean; rows: number } {
  return n > 5 ? { pairs: true, rows: Math.ceil(n / 2) } : { pairs: false, rows: Math.max(1, n) };
}
