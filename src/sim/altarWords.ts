// The altar told in plain words (ALTAR-CLEAR, `docs/notes/altar-clear.md`). Every number here is worked out from the
// rules' own constants (`altarRules.ts`), so the card can never say one thing while the fight does another; the tests in
// `test/altar-words.test.ts` check the words against the numbers, and the numbers against a real fight.
// Pure: no DOM, no state changed.
import type { Run } from './run';
import { heroLevel } from './climb';
import { COMMAND_MULT, CORRUPT, EVOLUTION, OFFERING_MULT, PATRON_PULSE, PULSE } from './altarRules';
import { COMMANDMENTS, OFFERINGS, PATRONS, pendingAltar, riftRank, type AltarStep, type Commandment, type Offering, type Patron, type Rift } from './rift';

/** A share as a whole percentage (0.45 → 45). */
export const pct = (x: number): number => Math.round(x * 100);
/** Milliseconds as seconds. */
export const secs = (ms: number): number => ms / 1000;

export const STEPS: readonly AltarStep[] = ['patron', 'offering', 'commandment'];
/** Each step: its number, its name, when it comes, and what it decides. */
export const STEP_INFO: Record<AltarStep, { n: number; name: string; when: string; what: string }> = {
  patron: { n: 1, name: 'Patron', when: 'after your first victory', what: 'the pulse your starter sends out in every fight' },
  offering: { n: 2, name: 'Offering', when: 'after you beat the first guardian', what: 'a trade between your starter’s health and damage' },
  commandment: { n: 3, name: 'Commandment', when: 'after you beat the second guardian', what: 'the formation that makes the pulse stronger' },
};
/** "Altar 2 of 3 · Offering" */
export const stepLabel = (step: AltarStep): string => `Altar ${STEP_INFO[step].n} of ${STEPS.length} · ${STEP_INFO[step].name}`;

/** The size of a patron's pulse at an evolution (1 to 3): a share of attack (Ember) or health (Bastion), or skill charge (Echo). */
export function pulseAmount(patron: Patron, rank: number): number {
  const p = PATRON_PULSE[patron];
  return p.base + (Math.max(1, rank) - 1) * p.per;
}
/** The pulse's size as words: "45% of their attack", "8% of their maximum health", "12 skill charge". */
function amountWords(patron: Patron, amount: number): string {
  return patron === 'ember' ? `${pct(amount)}% of their attack` : patron === 'bastion' ? `${pct(amount)}% of their own maximum health` : `${Math.round(amount * 100) / 100} skill charge`;
}
const short = (patron: Patron, amount: number) => patron === 'echo' ? `${Math.round(amount * 100) / 100}` : `${pct(amount)}%`;

/** What a patron's pulse does at an evolution, in one sentence. */
export function patronLine(patron: Patron, rank: number): string {
  const a = pulseAmount(patron, rank), every = secs(PULSE.everyMs), reach = PULSE.reach;
  if (patron === 'ember') return `Every ${every} s your starter burns the nearest foe, at any distance, for ${amountWords(patron, a)}.`;
  if (patron === 'bastion') return `Every ${every} s your starter and each ally within ${reach} tiles gain a shield worth ${amountWords(patron, a)}, lasting ${secs(PULSE.shieldMs)} s.`;
  return `Every ${every} s your starter and each ally within ${reach} tiles gain ${amountWords(patron, a)} (a skill fires at 100).`;
}
/** How the pulse grows with the later altar steps: "Grows to 60% at evolution 2 and 75% at evolution 3." */
export function patronGrowth(patron: Patron, rank: number): string {
  const later = [2, 3].filter((k) => k > rank);
  if (!later.length) return 'Fully grown: your starter has evolved three times.';
  return `Grows to ${later.map((k) => `${short(patron, pulseAmount(patron, k))} at evolution ${k}`).join(' and ')}.`;
}

/** An offering's trade: "+35% maximum health, −10% damage". */
export function offeringLine(offering: Offering): string {
  const m = OFFERING_MULT[offering];
  const sign = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(pct(x))}%`;
  return `Your starter: ${sign(m.hp - 1)} maximum health, ${sign(m.dmg - 1)} damage, for the rest of the run.`;
}

/** A commandment's rule, and what it makes of the chosen patron's pulse at an evolution. */
export function commandmentLine(commandment: Commandment, patron?: Patron, rank = 3): string {
  const mult = COMMAND_MULT[commandment];
  const rule = commandment === 'together'
    ? `Your patron’s pulse is ${pct(mult - 1)}% stronger while at least one ally stands within ${PULSE.reach} tiles of your starter.`
    : `Your patron’s pulse is ${pct(mult - 1)}% stronger while no ally stands within ${PULSE.reach} tiles of your starter.`;
  if (!patron) return rule;
  const a = pulseAmount(patron, rank);
  return `${rule} ${PATRONS[patron].name}: ${short(patron, a)} becomes ${short(patron, a * mult)}.`;
}

/** What evolving to `rank` gives the starter in every fight, and the level it guarantees. */
export function evolutionLine(rank: number): string {
  return `Your starter evolves (${rank} of ${STEPS.length}): +${pct(rank * EVOLUTION.hp)}% health and +${pct(rank * EVOLUTION.atk)}% attack in fights, and at least level ${EVOLUTION.levels[rank]}.`;
}

/** What `n` points of corruption do, as a list (empty when there is none). */
export function corruptionLines(n: number, patron?: Patron): string[] {
  if (!n) return [];
  const boss = `Each guardian sends out its own Calamity pulse, centred on it, every ${secs(CORRUPT.boss.everyMs)} s (warned ${secs(CORRUPT.boss.warnMs)} s before) that hits each hero for ${pct(n * CORRUPT.boss.hit)}% of their maximum health`;
  const extra = patron === 'bastion' ? `, and shields the guardian for ${pct(n * CORRUPT.bastionShield)}% of its maximum health` : patron === 'echo' ? `, and drains ${n * CORRUPT.echoDrain} skill charge from each hero` : '';
  return [
    `Your starter: +${pct(n * CORRUPT.starterAtk)}% attack. Won fights pay +${pct(n * CORRUPT.gold)}% gold.`,
    `Every foe: +${pct(n * CORRUPT.foeHp)}% health and +${pct(n * CORRUPT.foeAtk)}% attack.`,
    `${boss}${extra}. It stops when the guardian falls, even with its escort still standing.`,
  ];
}

/** Consecrate against corrupt, side by side: what each gains and costs, for the step being chosen (and the patron it will serve). */
export interface Seal { gains: string[]; costs: string[] }
export function sealChoices(r: Rift, step: AltarStep, choice?: string): { consecrate: Seal; corrupt: Seal } {
  const n = r.corruption, to = n + 1;
  const patron = step === 'patron' && choice && Object.hasOwn(PATRONS, choice) ? choice as Patron : r.patron;
  const bossNow = pct(n * CORRUPT.boss.hit), bossThen = pct(to * CORRUPT.boss.hit);
  const extra = patron === 'bastion' ? `; it also shields the guardian (${pct(to * CORRUPT.bastionShield)}% of its health)` : patron === 'echo' ? `; it also drains ${to * CORRUPT.echoDrain} skill charge from each hero` : '';
  return {
    consecrate: { gains: ['The blessing, safely'], costs: ['Nothing'] },
    corrupt: {
      gains: [`Starter +${pct(CORRUPT.starterAtk)}% attack`, `+${pct(CORRUPT.gold)}% gold from won fights`],
      costs: [
        `Foes +${pct(CORRUPT.foeHp)}% health, +${pct(CORRUPT.foeAtk)}% attack`,
        n ? `Guardian pulse: ${bossNow}% → ${bossThen}% of each hero’s health every ${secs(CORRUPT.boss.everyMs)} s${extra}` : `Guardians pulse every ${secs(CORRUPT.boss.everyMs)} s for ${bossThen}% of each hero’s health${extra}`,
        'Lasts the whole run',
      ],
    },
  };
}

/** What comes after choosing this step. */
export function nextLine(step: AltarStep): string {
  const i = STEPS.indexOf(step);
  const next = STEPS[i + 1];
  return next ? `Next: ${stepLabel(next)}, ${STEP_INFO[next].when}.` : 'That is the last altar step. A campfire can still reforge your patron.';
}
/** Why the rift will not open. */
export const BLOCKED_LINE = 'The rift stays shut until you choose: each altar step is settled before the next crossing.';

/** The ⓘ panel and the first-visit explainer: how the altar works, in five lines. */
export const HOW_ALTAR_WORKS: readonly string[] = [
  `Your starter (the hero you began with) grows here. Each altar step evolves them: +${pct(EVOLUTION.hp)}% health and +${pct(EVOLUTION.atk)}% attack in fights, and a guaranteed level.`,
  `There are three altar steps: ${STEPS.map((s) => `${STEP_INFO[s].name} ${STEP_INFO[s].when}`).join(', ')}. You choose before travelling on.`,
  `The Patron sends out a pulse every ${secs(PULSE.everyMs)} s: Ember burns a foe, Bastion shields, Echo charges skills. The Offering trades health against damage. The Commandment makes the pulse stronger together or alone.`,
  `Consecrate is safe. Corrupt adds +${pct(CORRUPT.starterAtk)}% starter attack and +${pct(CORRUPT.gold)}% gold, but foes get +${pct(CORRUPT.foeHp)}% health and +${pct(CORRUPT.foeAtk)}% attack and each guardian hurts everyone with its own pulse until it falls. It lasts the run.`,
  'At a campfire you can reforge: swap your patron for another, instead of resting or training. Evolutions and corruption stay.',
];

/** Whether a step was consecrated or corrupted. Older saves kept only the count: when it cannot be told, `unknown`. */
export function sealOf(r: Rift, step: AltarStep): 'consecrated' | 'corrupted' | 'unknown' | undefined {
  if (!r[step]) return undefined;
  if (r.corrupted) return r.corrupted.includes(step) ? 'corrupted' : 'consecrated';
  if (!r.corruption) return 'consecrated';
  return r.corruption >= riftRank(r) ? 'corrupted' : 'unknown';
}

/** "Your altar": everything chosen so far, the starter, and what is still to come. */
export interface AltarRow { step: AltarStep; label: string; chosen?: string; seal?: 'consecrated' | 'corrupted' | 'unknown'; lines: string[] }
export interface AltarSummary { starter?: { level: number; tier: number }; rank: number; rows: AltarRow[]; corruption: number; corruptionLines: string[]; pending?: AltarStep }
export function altarSummary(run: Run): AltarSummary | undefined {
  const r = run.rift;
  if (!r) return undefined;
  const h = run.roster.find((x) => x.id === r.starter);
  const rank = riftRank(r);
  const rows = STEPS.map((step): AltarRow => {
    const chosen = r[step];
    const label = stepLabel(step);
    if (!chosen) return { step, label, lines: [`Comes ${STEP_INFO[step].when}: ${STEP_INFO[step].what}.`] };
    const lines = step === 'patron' ? [patronLine(r.patron!, rank)] : step === 'offering' ? [offeringLine(r.offering!)] : [commandmentLine(r.commandment!, r.patron, rank)];
    const name = step === 'patron' ? PATRONS[r.patron!].name : step === 'offering' ? OFFERINGS[r.offering!].name : COMMANDMENTS[r.commandment!].name;
    return { step, label, chosen: name, seal: sealOf(r, step), lines };
  });
  return {
    ...(h ? { starter: { level: heroLevel(h), tier: h.grade } } : {}),
    rank, rows, corruption: r.corruption, corruptionLines: corruptionLines(r.corruption, r.patron), pending: pendingAltar(run),
  };
}

/** The starter's line on the map: "Lv 6 · Tier 1 · Evolution 1 of 3". */
export const starterLine = (s: AltarSummary): string => `${s.starter ? `Lv ${s.starter.level} · Tier ${s.starter.tier} · ` : ''}Evolution ${s.rank} of ${STEPS.length}`;

/** The altar's button on the map: what to do now, or what is set. */
export function altarButtonLine(r: Rift, pending?: AltarStep): string {
  if (pending) return `${stepLabel(pending).split(' · ')[0]} · choose now`;
  if (!r.patron) return `Altar · wakes ${STEP_INFO.patron.when}`;
  return `${PATRONS[r.patron].name} · ${riftRank(r)} of ${STEPS.length} altar steps`;
}

/** In a fight: how long until the patron's next pulse, and the guardian's (each fires when the fight's clock is a multiple of its period). */
export const untilPulse = (t: number, every: number = PULSE.everyMs): number => every - (t % every);
