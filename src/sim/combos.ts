// Five-hero combos (the "Last Oath", the owner's name; `COMBO_NAME` is the one place the page reads it from): eight sets of five named heroes that,
// fighting together, fill a bar on the left side of the fight and, when it is full, perform one big shared move. All of it is data
// (`COMBOS`) read by one engine: `startCombo` when the fight begins, `tickCombo` every tick (feeds the bar and fires the move) and
// `landCombo` when the move lands (its `beats`). No randomness: nothing here draws from any stream, so a fight plays out the same.
//
// The rules: the five must all be on the board (not summons) when the fight starts. The bar fills from what they do: each second, each blow
// they deal, each blow they take and each skill they cast. A fallen member takes its fifth of the feeding with it, and with fewer than three standing the bar stops (the page dims it). When full, the survivors
// stop for a moment (`CAST_MS`), the move lands (`LAND_MS` later), the bar empties and fills again.

import { atkOf, defOf, hurt, type Battle, type BattleEvent, type Unit } from './battle';
import { callSummon, foesOf, gain, mendUnit, net } from './abilities';
import type { Meta } from './meta';
import { charmFor, chillFor, cleanse, setDot, stunFor } from './ailments';

/** What the page calls the combo: the owner's pick of the names below. */
export const COMBO_NAME = 'Last Oath';
/** Other names proposed for it (`docs/notes/hero-skills.md`). */
export const COMBO_NAME_IDEAS: readonly string[] = ['Accord', 'Grand Concord', 'Legend Strike', 'Fellowship Finale', 'Last Oath', 'Oathsong'];

/** The bar's size, and how it fills: per second per hero, per blow dealt, per blow taken, per skill cast. */
export const COMBO_NEED = 100;
const FEED_SEC = 0.6;
const FEED_DEALT = 1;
const FEED_TAKEN = 0.8;
const FEED_CAST = 8;
/** How long the five are busy casting, and when the move lands after it starts (ms). */
export const CAST_MS = 1600;
export const LAND_MS = 1100;
/** The fewest of the five that must still stand for the bar to fill and the move to go off. */
export const MIN_ALIVE = 3;

/** What a combo's move does when it lands: each beat is one effect, in order. */
export type Beat =
  /** Every foe takes `mult` of the five heroes' attack together. */
  | { k: 'hurt'; mult: number }
  | { k: 'stun'; ms: number }
  | { k: 'slow'; ms: number }
  /** Every foe takes `mult` of that every half second for `ms`. */
  | { k: 'burn'; mult: number; ms: number; kind: 'burn' | 'curse' | 'bleed' }
  /** Every ally heals `share` of its max hp (and is cleansed). */
  | { k: 'heal'; share: number }
  | { k: 'ward'; share: number; ms: number }
  | { k: 'haste'; ms: number }
  /** Every ally's skill meter (a hero's pool: half a point of its pool's share for each) jumps by `amount`. */
  | { k: 'charge'; amount: number }
  /** Every ally takes half damage for `ms`. */
  | { k: 'guard'; ms: number }
  /** `n` of `unit` rise beside the five. */
  | { k: 'summon'; unit: string; n: number }
  /** The `n` strongest foes fight their own side for `ms`. */
  | { k: 'charm'; n: number; ms: number }
  /** The five heal `share` of their max hp. */
  | { k: 'mendFive'; share: number };

/** The look of a combo's move: the page reads it for colours and the effect layers (`render/comboFx.ts`). */
export type ComboTone = 'holy' | 'arcane' | 'shadow' | 'sea' | 'wild' | 'spirit' | 'earth' | 'dark';

export interface Combo {
  id: string;
  /** The five heroes' kinds. */
  heroes: readonly [string, string, string, string, string];
  /** The set's name and its move's. */
  name: string;
  move: string;
  tone: ComboTone;
  /** What the move does, in plain words. */
  text: string;
  beats: readonly Beat[];
}

export const COMBOS: readonly Combo[] = [
  {
    id: 'holyOrder', heroes: ['knight', 'paladin', 'cleric', 'priestess', 'wanderer'], name: 'The Holy Order', move: 'Sanctum of Light', tone: 'holy',
    text: 'A pillar of light falls on the field: every ally is healed, cleansed and shielded, and every foe is struck and held for 1.5s',
    beats: [{ k: 'heal', share: 0.3 }, { k: 'ward', share: 0.12, ms: 4000 }, { k: 'hurt', mult: 0.28 }, { k: 'stun', ms: 1500 }],
  },
  {
    id: 'arcaneCouncil', heroes: ['wizard', 'lightningMage', 'sage', 'warlock', 'timeWitch'], name: 'The Arcane Council', move: 'Elemental Cataclysm', tone: 'arcane',
    text: 'Fire, lightning and starlight crash on every foe, leaving them burning for 4s; every ally is shielded and its pool fills by a fifth',
    beats: [{ k: 'hurt', mult: 0.9 }, { k: 'burn', mult: 0.08, ms: 4000, kind: 'burn' }, { k: 'ward', share: 0.12, ms: 4000 }, { k: 'charge', amount: 40 }],
  },
  {
    id: 'shadowClan', heroes: ['samurai', 'kunoichi', 'ninjaMonk', 'karasu', 'mercenary'], name: 'The Shadow Clan', move: 'Thousand Cuts', tone: 'shadow',
    text: 'The five flash through the field: every foe takes a storm of cuts and bleeds for 4s, and the five are hastened for 5s',
    beats: [{ k: 'hurt', mult: 0.77 }, { k: 'burn', mult: 0.055, ms: 4000, kind: 'bleed' }, { k: 'haste', ms: 5000 }],
  },
  {
    id: 'fleet', heroes: ['buccaneer', 'dreadPirate', 'kraken', 'siegeBot', 'gunslinger'], name: 'The Black Fleet', move: 'Full Broadside', tone: 'sea',
    text: 'A ghost fleet fires every gun at once: every foe is hurt and slowed for 4s, and a tide of water shields the five',
    beats: [{ k: 'hurt', mult: 0.66 }, { k: 'slow', ms: 4000 }, { k: 'ward', share: 0.15, ms: 4000 }],
  },
  {
    id: 'wildHunt', heroes: ['beastmaster', 'werewolf', 'druid', 'ranger', 'wolfBard'], name: 'The Wild Hunt', move: 'The Great Hunt', tone: 'wild',
    text: 'The pack answers: three wolves and a dire wolf rise, every ally is hastened for 5s, and every foe is hurt',
    beats: [{ k: 'hurt', mult: 0.39 }, { k: 'summon', unit: 'wolf', n: 3 }, { k: 'summon', unit: 'direWolf', n: 1 }, { k: 'haste', ms: 5000 }],
  },
  {
    id: 'nightParade', heroes: ['kitsune', 'yamabushi', 'gorgon', 'satyr', 'illusionist'], name: 'The Night Parade', move: 'March of a Hundred Spirits', tone: 'spirit',
    text: 'A parade of spirits drifts through the foes: the three strongest turn on their own side for 4s and the rest are held for 1.2s',
    beats: [{ k: 'hurt', mult: 0.33 }, { k: 'stun', ms: 1200 }, { k: 'charm', n: 3, ms: 4000 }],
  },
  {
    id: 'ironVanguard', heroes: ['juggernaut', 'minotaur', 'lancer', 'barbarian', 'samuraiCommander'], name: 'The Iron Vanguard', move: 'Charge of Legends', tone: 'earth',
    text: 'The vanguard charges as one: every foe is hurt hard and held for 1s, and every ally takes half damage for 3s',
    beats: [{ k: 'hurt', mult: 0.5 }, { k: 'stun', ms: 1000 }, { k: 'guard', ms: 3000 }],
  },
  {
    id: 'dreadCourt', heroes: ['tyrant', 'reaper', 'demonSwordsman', 'shambler', 'mummy'], name: 'The Dread Court', move: 'Reign of the Damned', tone: 'dark',
    text: 'The court passes judgement: every foe is cursed for 5s and slowed, and the five drink back a little of their health',
    beats: [{ k: 'hurt', mult: 0.35 }, { k: 'burn', mult: 0.04, ms: 5000, kind: 'curse' }, { k: 'slow', ms: 2500 }, { k: 'mendFive', share: 0.05 }],
  },
];

export const comboById = (id: string): Combo | undefined => COMBOS.find((c) => c.id === id);

/** What a fight keeps of its combo: which one, how full the bar is, how many times it has gone off, and whether a member has fallen. */
export interface ComboState {
  id: string;
  charge: number;
  fired: number;
  /** Too many of the five have fallen (fewer than `MIN_ALIVE` stand): the bar waits (and shows dim) and the move cannot go off. */
  broken: boolean;
  /** How many of the five have fallen (the bar fills slower, and shows it). */
  fallen: number;
  /** The ids of the five fighters. */
  ids: number[];
  /** When the move lands, while it is under way (ms into the fight); the bar holds until then. */
  landAt?: number;
}

/** The combo whose five heroes are all among these kinds (the first one, if two are). */
export const comboOf = (kinds: readonly string[]): Combo | undefined => COMBOS.find((c) => c.heroes.every((k) => kinds.includes(k)));

/** Look for a combo among the placed heroes as the fight starts. */
export function startCombo(b: Battle): void {
  const placed = b.units.filter((x) => x.side === 'hero' && x.alive && !defOf(x).summon);
  const c = comboOf(placed.map((x) => x.def));
  if (!c) return;
  b.combo = { id: c.id, charge: 0, fired: 0, broken: false, fallen: 0, ids: c.heroes.map((k) => placed.find((x) => x.def === k)!.id) };
}

const membersOf = (b: Battle, s: ComboState): Unit[] => s.ids.map((id) => b.units.find((x) => x.id === id)!).filter((x) => x && x.alive);

/** One tick: feed the bar from what the five did this tick (the events so far), and let the move go when it is full. */
export function tickCombo(b: Battle, out: BattleEvent[]): void {
  const s = b.combo;
  if (!s) return;
  const members = membersOf(b, s);
  s.broken = members.length < MIN_ALIVE;
  s.fallen = s.ids.length - members.length;
  if (s.broken || s.landAt !== undefined) return;
  const mine = new Set(s.ids);
  let feed = FEED_SEC * members.length * 0.1;
  for (const e of out) {
    if (e.kind === 'hit') {
      if (e.src === 'blow' && !e.splash && mine.has(e.by)) feed += FEED_DEALT;
      if (e.src !== 'dot' && mine.has(e.to)) feed += FEED_TAKEN;
    } else if (e.kind === 'skill' && mine.has(e.by)) feed += FEED_CAST;
  }
  // (a fallen member takes its share of the feeding with it)
  s.charge = Math.min(COMBO_NEED, s.charge + (feed * members.length) / s.ids.length);
  if (s.charge < COMBO_NEED || !foesOf(b, members[0]).length) return;
  // (the five stop and cast together; the move lands a moment later)
  const c = comboById(s.id)!;
  s.charge = 0;
  s.fired++;
  s.landAt = b.t + LAND_MS;
  for (const m of members) {
    m.cast = { at: b.t, ms: CAST_MS, anim: 'attack2' };
    m.swing = undefined;
    m.step = undefined;
    m.busyUntil = Math.max(m.busyUntil, b.t + CAST_MS);
  }
  out.push({ kind: 'comboCast', id: c.id, name: c.move, ms: CAST_MS, landMs: LAND_MS, by: [...s.ids] });
  b.pending.push({ at: s.landAt, kind: 'combo', by: members[0].id, to: members[0].id, dmg: 0, heavy: false });
}

/** The move lands: every beat in turn. */
export function landCombo(b: Battle, out: BattleEvent[]): void {
  const s = b.combo;
  if (!s) return;
  s.landAt = undefined;
  const c = comboById(s.id)!;
  const members = membersOf(b, s);
  if (!members.length) return;
  const lead = members[0];
  const total = members.reduce((n, m) => n + atkOf(m), 0);
  const allies = b.units.filter((a) => a.alive && a.side === 'hero');
  out.push({ kind: 'comboLand', id: c.id });
  out.push({ kind: 'burst', by: lead.id, reach: 99, tone: 'combo' });
  for (const beat of c.beats) {
    const foes = foesOf(b, lead);
    switch (beat.k) {
      case 'hurt':
        for (const f of foes) hurt(b, lead, f, net(total * beat.mult, f), true, false, out, 'skill');
        break;
      case 'stun':
        for (const f of foes) {
          if (!f.alive) continue;
          stunFor(b, f, beat.ms);
        }
        break;
      case 'slow':
        for (const f of foes) chillFor(b, f, beat.ms);
        break;
      case 'burn':
        for (const f of foes) if (f.alive) setDot(b, f, { kind: beat.kind, dmg: Math.max(1, Math.round(total * beat.mult)), every: 500, ms: beat.ms, by: lead.id, next: b.t + 500, until: b.t + beat.ms });
        break;
      case 'heal':
        for (const a of allies) {
          cleanse(b, a);
          mendUnit(a, a.maxHp * beat.share, out, lead);
        }
        break;
      case 'ward':
        for (const a of allies) a.shield = { hp: Math.max(a.shield?.hp ?? 0, Math.round(a.maxHp * beat.share)), until: b.t + beat.ms };
        break;
      case 'haste':
        for (const a of allies) {
          a.hasteUntil = Math.max(a.hasteUntil ?? 0, b.t + beat.ms);
          out.push({ kind: 'haste', to: a.id, ms: beat.ms });
        }
        break;
      case 'charge':
        for (const a of allies) gain(a, beat.amount, true);
        break;
      case 'guard':
        for (const a of allies) a.guardUntil = Math.max(a.guardUntil ?? 0, b.t + beat.ms);
        break;
      case 'summon':
        for (let i = 0; i < beat.n; i++) callSummon(b, lead, beat.unit, beat.n);
        break;
      case 'charm':
        // (a lone foe has no one to turn on)
        if (foes.length < 2) break;
        for (const f of [...foes].sort((x, y) => atkOf(y) - atkOf(x) || x.id - y.id).slice(0, Math.min(beat.n, foes.length - 1))) {
          charmFor(b, f, beat.ms);
          f.taunt = undefined;
          f.busyUntil = Math.min(f.busyUntil, b.t + 300);
        }
        break;
      case 'mendFive':
        for (const m of members) mendUnit(m, m.maxHp * beat.share, out, lead);
        break;
    }
  }
}

/** Remember the combos a finished fight showed (the codex lists a combo only once it has been seen): the ones that went off. Returns the new ones. */
export function noteCombos(m: Meta, b: Pick<Battle, 'combo'>): string[] {
  const s = b.combo;
  if (!s || !s.fired) return [];
  const seen = (m.combosSeen ??= []);
  if (seen.includes(s.id)) return [];
  seen.push(s.id);
  return [s.id];
}

/** A saved list of the combos seen, read safely. */
export const readCombosSeen = (raw: unknown): string[] => (Array.isArray(raw) ? [...new Set(raw.filter((x): x is string => typeof x === 'string' && COMBOS.some((c) => c.id === x)))] : []);
