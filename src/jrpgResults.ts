// What the JRPG results screen shows (JRPG-RECAP), gathered from the game: after a fight (`waveResult`, from what `main.ts` settled)
// and at a run's end (`runResult`, from `run.recap`). The rules are in `sim/jrpgRecap.ts`; the screen is `jrpgRecapView.ts`. This
// file only puts faces, icons and words to them.

import type { Battle } from './sim/battle';
import { awakenedOf } from './sim/awaken';
import { heroGrowth, mvpLine, partyRows, questMoves, resultLines, type QuestMove, type StatMult } from './sim/jrpgRecap';
import { levelBoost } from './sim/levels';
import { heroRank, rankMult, type Meta } from './sim/meta';
import { heroLevel, localBoost } from './sim/climb';
import type { Run } from './sim/run';
import type { FightStats } from './sim/fightStats';
import { mvpOf } from './sim/fightStats';
import { heroTitle } from './sim/heroNames';
import { mvpKind, type RunRecap } from './sim/runRecap';
import type { WaveMoments } from './sim/waveCard';
import { gainText, type WaveGain } from './sim/waveGains';
import { progressOf } from './sim/quests';
import { questById } from './sim/questData';
import { UNITS } from './sim/units';
import { battleSheet } from './render/awakenLook';
import { portrait, sheetInfo } from './render/sheets';
import { gainIcon } from './waveCardView';
import { ICONS } from './menuArt';
import type { JrCount, JrData, JrHero, JrItem } from './jrpgRecapView';

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const face = (meta: Meta, kind: string, grade = 1): HTMLElement => facePortrait(battleSheet(kind, awakenedOf(meta, kind), grade), grade);

/** A portrait that draws itself again once its sheet has loaded (a sheet still decoding as the card opens would leave it blank). */
export function facePortrait(sheet: string, grade = 1): HTMLCanvasElement {
  const c = portrait(sheet, 64, grade);
  const info = sheetInfo(sheet);
  if (info && info.img.complete && info.img.naturalWidth) return c;
  let tries = 0;
  const again = (): void => {
    const now = sheetInfo(sheet);
    if (now && now.img.complete && now.img.naturalWidth) {
      c.getContext('2d')?.drawImage(portrait(sheet, 64, grade), 0, 0);
      return;
    }
    if (++tries < 40) setTimeout(again, 250);
  };
  setTimeout(again, 250);
  return c;
}

/** A kind's lasting stats' multiplier besides its level: its rank (as the hero menu reads it). */
const lastingMult = (meta: Meta, kind: string): StatMult => {
  const m = rankMult(heroRank(meta, kind));
  return { hp: m, atk: m };
};

/** The items a fight brought in, as chips with their icons. */
export function gainItems(gains: readonly WaveGain[]): JrItem[] {
  return gains.map((g) => ({ icon: gainIcon(g), text: gainText(g), cls: `${g.kind}${g.rarity ? ` r${g.rarity}` : ''}` }));
}

/** The quests' progress, to compare before and after a fight. */
export const questSnap = (m: Meta): Record<string, number> => Object.fromEntries((m.quests?.active ?? []).map((a) => [a.id, a.progress]));

/** The quests a fight moved: finished, found, advanced. */
export function questsMoved(m: Meta, before: Record<string, number>, done: readonly string[], found: readonly string[]): QuestMove[] {
  const after = Object.fromEntries((m.quests?.active ?? []).map((a) => [a.id, progressOf(a)]));
  return questMoves(before, after, done, found.map((id) => ({ id, rift: questById(id)?.giver === 'rift' })), (id) => questById(id)?.title ?? id);
}

/** What `main.ts` settled for a fight. */
export interface FightResultIn {
  meta: Meta;
  run: Run;
  b: Battle;
  stats: FightStats;
  won: boolean;
  card: WaveMoments;
  /** The fighters' XP and the bench's, by kind (lasting levels). */
  gains: Record<string, number>;
  bench: Record<string, number>;
  /** A spire or Calamity run's own levels (`climbXpView`), in place of the lasting ones. */
  own: { gains: Record<string, number>; from: Record<string, number> } | null;
  gold: number;
  /** Crowns paid; null for a fight that pays none (a quest battle). */
  crowns: number | null;
  crownNote?: string;
  notes: string[];
  quests: QuestMove[];
}

/** The screen after a fight. `sub` is the card's heading; the page keeps it up to date (`setSub`). */
export function fightResult(i: FightResultIn, sub: string, hint?: string): JrData {
  const { meta, run, b, won } = i;
  const fighters = b.units.filter((u) => u.side === 'hero' && u.owner === undefined && !UNITS[u.def]?.summon);
  const kinds = [...new Set(fighters.map((u) => u.def))];
  const grade = (k: string) => Math.max(1, ...fighters.filter((u) => u.def === k).map((u) => u.grade ?? 1));
  const fell = new Set(won ? i.card.fell : fighters.filter((u) => !u.alive).map((u) => u.def));
  const mvp = mvpOf(i.stats);
  const rows: JrHero[] = [];
  if (i.own) {
    // (a run's own heroes: their XP and levels are the run's, to 30)
    // (every hero that fought, with what this fight paid it: a lost climb's last fight may have paid nothing)
    const paid = run.tower?.gains ?? [];
    const fought = fighters.filter((u) => u.tag !== undefined).map((u) => paid.find((g) => g.id === Number(u.tag)) ?? { id: Number(u.tag), kind: u.def, xp: 0 });
    for (const g of [...paid, ...fought]) {
      if (rows.some((r) => r.kind === g.kind)) continue;
      const h = run.roster.find((x) => x.id === g.id);
      const xpTo = h?.xp ?? (i.own.from[g.kind] ?? 0) + g.xp;
      const lb = h ? localBoost(h) : null;
      const lv = h ? levelBoost(heroLevel(h)) : null;
      const mult = lb && lv ? { hp: (lb.hp ?? 1) / lv.hp, atk: (lb.atk ?? 1) / lv.atk } : undefined;
      rows.push({ kind: g.kind, growth: heroGrowth(g.kind, xpTo - g.xp, xpTo, 'run', mult), face: face(meta, g.kind, h?.grade ?? 1), fell: fell.has(g.kind), mvp: mvp?.kind === g.kind });
    }
  } else {
    for (const k of kinds) {
      const xpTo = meta.xp[k] ?? 0;
      const got = (i.gains[k] ?? 0) + (i.bench[k] ?? 0);
      rows.push({ kind: k, growth: heroGrowth(k, xpTo - got, xpTo, 'lasting', lastingMult(meta, k)), face: face(meta, k, grade(k)), fell: fell.has(k), mvp: mvp?.kind === k });
    }
    for (const k of Object.keys(i.bench)) {
      if (kinds.includes(k)) continue;
      const xpTo = meta.xp[k] ?? 0;
      rows.push({ kind: k, growth: heroGrowth(k, xpTo - i.bench[k], xpTo, 'lasting', lastingMult(meta, k)), face: face(meta, k), bench: true });
    }
  }
  const heroes = partyRows(rows);
  const benchKinds = Object.keys(i.bench).filter((k) => !heroes.some((h) => h.kind === k));
  const benchEach = benchKinds.length ? i.bench[benchKinds[0]] : 0;
  const standing = fighters.filter((u) => u.alive).length;
  const counts: JrCount[] = [];
  if (i.gold > 0 || won) counts.push({ label: 'Gold', n: i.gold, icon: ICONS.gold });
  if (i.crowns !== null && (i.crowns > 0 || won)) counts.push({ label: 'Crowns', n: i.crowns, icon: ICONS.crowns, ...(i.crownNote ? { note: i.crownNote } : {}) });
  const ms = i.stats.find((s) => s.kind === mvp?.kind);
  return {
    won,
    title: won ? 'VICTORY' : 'DEFEAT',
    sub,
    facts: [
      { label: 'Time', value: clock(b.t) },
      { label: 'Foes felled', value: String(b.units.filter((u) => u.side === 'foe' && !u.alive && u.owner === undefined).length) },
      { label: 'Standing', value: `${standing}/${fighters.length}` },
    ],
    heroes,
    ...(mvp && ms ? { mvp: { face: face(meta, mvp.kind, grade(mvp.kind)), name: heroTitle(mvp.kind), line: mvpLine(ms) } } : {}),
    counts,
    items: gainItems(i.card.gains ?? []),
    lines: resultLines(i.card, { bench: { n: benchKinds.length, each: benchEach }, quests: i.quests }),
    notes: i.notes,
    ...(hint ? { hint } : {}),
  };
}

/** The top of a run's end recap: the run's XP for each hero that fought in it (from where it began the run), its MVP, and the
 *  run's gold, crowns and chests counted up. The rest of the recap (the wave strip, the company's figures) follows it. */
export function runResult(meta: Meta, recap: RunRecap, head: { title: string; tone: 'won' | 'lost'; line: string }, figures: { cleared: number; hearts: number }): JrData {
  const kinds = Object.keys(recap.heroes).filter((k) => UNITS[k]);
  const work = (k: string) => recap.heroes[k].dealt + recap.heroes[k].healed + recap.heroes[k].taken / 2;
  kinds.sort((a, b) => work(b) - work(a));
  const mvp = mvpKind(recap);
  const heroes: JrHero[] = kinds.map((k) => {
    const xpTo = meta.xp[k] ?? 0;
    const xpFrom = recap.xpAt?.[k] ?? xpTo - (recap.xp[k] ?? 0);
    return { kind: k, growth: heroGrowth(k, xpFrom, xpTo, 'lasting', lastingMult(meta, k)), face: face(meta, k, recap.heroes[k].grade), mvp: k === mvp };
  });
  const t = mvp ? recap.heroes[mvp] : undefined;
  const counts: JrCount[] = [
    { label: 'Gold earned', n: recap.earned, icon: ICONS.gold },
    { label: 'Crowns', n: recap.crowns, icon: ICONS.crowns },
  ];
  if (recap.chests) counts.push({ label: 'Chests', n: recap.chests });
  return {
    won: head.tone === 'won',
    title: head.tone === 'won' ? 'VICTORY' : 'DEFEAT',
    sub: head.title,
    facts: [
      { label: 'Waves cleared', value: String(figures.cleared) },
      { label: 'Time fought', value: clock(recap.ms) },
      { label: 'Gold spent', value: Math.round(recap.spent).toLocaleString('en-GB') },
      ...(figures.hearts ? [{ label: 'Hearts burned', value: String(figures.hearts) }] : []),
    ],
    heroes,
    ...(mvp && t ? { mvp: { face: face(meta, mvp, t.grade), name: heroTitle(mvp), line: mvpLine(t) } } : {}),
    counts,
    items: [],
    lines: [],
  };
}
