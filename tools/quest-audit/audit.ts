// QUEST-POSSIBLE (docs/notes/quest-possible.md): can every quest, Eidolon chain part, campaign and patron quest be done as the game stands?
// Each objective is checked by rule against the game's own tables (the armies and their bosses' waves, the tiers, the heroes, the foes,
// the spells, the combos, the quest battles, the hidden modes), and the riders that cross each other are caught (a rule that bars what the
// goal counts, a one-run count more than a run holds). The goals a rule cannot settle are then tried against the sim: a real army run's
// fight settled as the quest log reads it (`questFightOf`, `condMet`). It prints one row a quest and exits 1 if any is broken.
//   npx esbuild tools/quest-audit/audit.ts --bundle --platform=node --format=esm --outfile=out/quest-audit.mjs --loader:.png=empty && node out/quest-audit.mjs [--md]
import { QUESTS, type Cond, type Goal, type Need, type QuestDef, type With } from '../../src/sim/questData';
import { objectivesOf, condMet, questFightOf } from '../../src/sim/quests';
import { questShown, questNeedsHiddenMode } from '../../src/sim/hiddenModes';
import { CHAINS } from '../../src/sim/eidolonChainData';
import { ARMIES, bossesOf } from '../../src/sim/armies';
import { TIERS } from '../../src/sim/tiers';
import { ALL_HEROES, UNITS } from '../../src/sim/units';
import { traitsOf } from '../../src/sim/traits';
import { SPELLS, STARTER_SPELLS } from '../../src/sim/spells';
import { COMBOS } from '../../src/sim/combos';
import { questBattleById } from '../../src/sim/questBattles';
import { ULT_LEVEL } from '../../src/sim/abilities';
import { DAILY_WAVES } from '../../src/sim/daily';
import { SQUAD, armyRun, startStage, summon } from '../../src/sim/run';
import { startedMeta } from '../../src/sim/meta';

type Row = { id: string; kind: string; title: string; text: string; state: 'ok' | 'hidden' | 'broken' | 'call'; why: string[] };
const rows: Row[] = [];
const MAX_WAVES = Math.max(...ARMIES.map((a) => a.waves.length));
const armyIds = new Set(ARMIES.map((a) => a.id));
const bossWaves = new Map<string, { army: string; wave: number }[]>();
for (const a of ARMIES) for (const b of bossesOf(a)) bossWaves.set(b.id, [...(bossWaves.get(b.id) ?? []), { army: a.id, wave: b.wave }]);
const heroOk = (k: string) => ALL_HEROES.includes(k);
const withHeroes = (w: With): string[] => ALL_HEROES.filter((k) => !!w.heroes?.includes(k) || !!w.traits?.some((t) => traitsOf(k).includes(t)));

/** The problems of one objective (broken), and what needs the director's call. */
function check(g: Goal, q: { oneRun?: boolean; needs?: Need; within?: number }): { broken: string[]; call: string[] } {
  const c = g as Goal & Cond & { by?: With; foes?: readonly string[]; ofArmy?: string; family?: string; spells?: readonly string[]; combo?: string; battle?: string };
  const broken: string[] = [];
  const call: string[] = [];
  if (c.army && !armyIds.has(c.army)) broken.push(`no army "${c.army}"`);
  if (c.ofArmy && !armyIds.has(c.ofArmy)) broken.push(`no army "${c.ofArmy}"`);
  if (c.tier !== undefined && (c.tier < 0 || c.tier >= TIERS.length)) broken.push(`no tier ${c.tier}`);
  if (c.tier !== undefined && c.mode && c.mode !== 'army') broken.push(`a tier rider counts army fights only, but the mode is ${c.mode}`);
  const waves = c.mode === 'daily' ? DAILY_WAVES : c.army ? ARMIES.find((a) => a.id === c.army)?.waves.length ?? MAX_WAVES : MAX_WAVES;
  if (c.stage !== undefined && c.stage > waves) broken.push(`wave ${c.stage} or later, but the most is ${waves}`);
  for (const b of c.boss ?? []) {
    const at = (bossWaves.get(b) ?? []).filter((x) => !c.army || x.army === c.army);
    if (!UNITS[b]) broken.push(`no foe "${b}"`);
    else if (!at.length && !(c.mode && c.mode !== 'army')) broken.push(`${UNITS[b].name} is not a boss of ${c.army ?? 'any army'}`);
    else if (c.stage !== undefined && at.length && at.every((x) => x.wave < c.stage!)) broken.push(`${UNITS[b].name} stands at wave ${at.map((x) => x.wave).join('/')}, before wave ${c.stage}`);
  }
  for (const f of c.foes ?? []) if (!UNITS[f]) broken.push(`no foe "${f}"`);
  if (c.family && c.family !== 'skeletons') broken.push(`no foe family "${c.family}"`);
  const heroLists: [string, readonly string[] | undefined][] = [['all', c.all], ['without', c.without]];
  for (const [k, l] of heroLists) for (const h of l ?? []) if (!heroOk(h)) broken.push(`${k}: no hero "${h}"`);
  for (const [k, w] of [['with', c.with], ['only', c.only], ['by', c.by]] as const) if (w && !withHeroes(w).length) broken.push(`${k}: no hero fits`);
  if (c.all && c.without?.some((h) => c.all!.includes(h))) broken.push('a hero both asked for and barred');
  const fieldMax = SQUAD + 1;
  if (c.all && c.all.length > fieldMax) broken.push(`${c.all.length} heroes together, but at most ${fieldMax} take the field`);
  if (c.exactly !== undefined && (c.exactly < 1 || c.exactly > fieldMax)) broken.push(`exactly ${c.exactly} heroes`);
  if (c.most !== undefined && c.most < 1) broken.push(`at most ${c.most} heroes`);
  if (c.all && c.most !== undefined && c.all.length > c.most) broken.push(`${c.all.length} heroes together, but at most ${c.most}`);
  if (c.all && c.exactly !== undefined && c.all.length > c.exactly) broken.push(`${c.all.length} heroes together, but exactly ${c.exactly}`);
  if (c.only && c.all && !c.all.every((h) => withHeroes(c.only!).includes(h))) broken.push('a hero asked for who does not fit "only"');
  if (c.with && c.only && !withHeroes(c.with).some((h) => withHeroes(c.only!).includes(h))) broken.push('"with" and "only" share no hero');
  if (c.with && c.without && withHeroes(c.with).every((h) => c.without!.includes(h))) broken.push('every hero "with" asks for is barred');
  // (the riders that bar what the goal counts)
  if (c.noUlts && (g.kind === 'ults' || (c.ultsIn ?? 0) > 0)) broken.push('counts ultimates but bars them');
  if (c.noSpells && (g.kind === 'spells' || c.spellsOnly)) broken.push("counts the king's spells but bars them");
  if (c.levelCap !== undefined && c.levelCap < 1) broken.push(`level cap ${c.levelCap}`);
  if (c.levelCap !== undefined && c.levelCap < ULT_LEVEL && (g.kind === 'ults' || (c.ultsIn ?? 0) > 0)) broken.push(`ultimates open at level ${ULT_LEVEL}, above the level cap ${c.levelCap}`);
  if (c.quick !== undefined && c.quick < 8) call.push(`won within ${c.quick} s`);
  const spells = [...(c.spells ?? []), ...(c.spellsOnly ?? [])];
  for (const s of spells) if (!(s in SPELLS)) broken.push(`no spell "${s}"`);
  const learnt = (n?: Need): string[] => (!n ? [] : n.kind === 'spell' ? [n.id] : n.kind === 'all' ? n.of.flatMap(learnt) : []);
  // (a list of spells is met by any one of them: a save knows the starting three from its first fight, the rest once the Chapel sells them)
  const known = (s: string) => STARTER_SPELLS.includes(s as never) || learnt(q.needs).includes(s);
  if (spells.length && !spells.some(known)) call.push(`asks for ${spells.join(', ')}, which a save learns only at the Chapel (10 stars), and the quest may come sooner`);
  if (g.kind === 'teamCombo' && c.combo && !COMBOS.some((x) => x.id === c.combo)) broken.push(`no combo "${c.combo}"`);
  if (g.kind === 'battle' && !questBattleById(c.battle!)) broken.push(`no quest battle "${c.battle}"`);
  if (g.kind === 'ults' || (c.ultsIn ?? 0) > 0) if (!q.needs || !needsLevel(q.needs, ULT_LEVEL)) call.push(`ultimates open at level ${ULT_LEVEL}; the quest may come sooner`);
  // (one run holds 15 waves (the daily's ten) and its army's bosses; the log starts a one-run quest again when the run changes, any run)
  if (q.oneRun) {
    const most = c.mode === 'daily' ? DAILY_WAVES : MAX_WAVES;
    if (g.kind === 'wavesWon' && g.n > most) broken.push(`${g.n} waves in one run, but a run is ${most}`);
    if (g.kind === 'bossDown') {
      const most = c.army ? bossesOf(ARMIES.find((a) => a.id === c.army)!).length : Math.max(...ARMIES.map((a) => bossesOf(a).length));
      if (g.n > most) broken.push(`${g.n} bosses in one run, but a run has ${most}`);
    }
    if (g.kind === 'clearArmy' && g.n > 1) broken.push(`${g.n} clears in one run`);
    if (g.kind === 'clearDaily' && g.n > 1) broken.push(`${g.n} dailies in one run`);
  }
  if (g.kind === 'bossDown' && c.boss && c.mode === 'daily') call.push('a named boss in the daily (the boss of the day changes)');
  return { broken, call };
}
const needsLevel = (n: Need, lvl: number): boolean => (n.kind === 'level' ? n.n >= lvl : n.kind === 'all' ? n.of.some((x) => needsLevel(x, lvl)) : n.kind === 'tier' || (n.kind === 'armies' && n.n >= 4));

function audit(id: string, kind: string, title: string, text: string, goals: readonly Goal[], q: { oneRun?: boolean; needs?: Need; within?: number }, hidden: boolean) {
  const broken: string[] = [];
  const call: string[] = [];
  goals.forEach((g, i) => {
    const r = check(g, q);
    const tag = goals.length > 1 ? `objective ${i + 1}: ` : '';
    broken.push(...r.broken.map((x) => tag + x));
    call.push(...r.call.map((x) => tag + x));
  });
  rows.push({ id, kind, title, text, state: hidden ? 'hidden' : broken.length ? 'broken' : call.length ? 'call' : 'ok', why: [...broken, ...call] });
}

for (const q of QUESTS as readonly QuestDef[]) {
  const kind = q.hero ? 'patron' : q.length === 'campaign' || q.slot === 'campaign' ? 'campaign' : q.repeat ? 'repeat' : q.giver;
  audit(q.id, kind, q.title, q.text, objectivesOf(q), q, !questShown(q));
}
for (const c of CHAINS) for (const p of c.parts) {
  const hidden = c.opens.kind === 'calCleared' || questNeedsHiddenMode({ needs: { kind: 'any' }, goal: p.goal } as QuestDef);
  audit(p.id, `chain: ${c.title}`, p.title, p.text, [p.goal], { needs: c.opens.kind === 'calCleared' ? undefined : c.opens }, hidden);
}

// ---- tried against the sim: a real army run's heroes are all bought with Hire, and the "no sellsword" rule must still pass
{
  const run = armyRun(21, 'undead', ALL_HEROES.slice(0, 5), undefined, 1);
  run.gold = 3000;
  for (let i = 0; i < 3; i++) summon(run);
  run.stage = 8;
  const b = startStage(run);
  for (const u of b.units) if (u.side === 'foe') u.alive = false;
  const f = questFightOf({ battle: b, won: true, stage: 8, stars: 3, run, meta: startedMeta(2) });
  for (const r of rows) {
    if (r.state === 'hidden') continue;
    const q = QUESTS.find((x) => x.id === r.id);
    const goals = q ? objectivesOf(q) : CHAINS.flatMap((c) => c.parts).filter((p) => p.id === r.id).map((p) => p.goal);
    for (const g of goals) {
      const c = g as Goal & Cond;
      if (!c.noHires) continue;
      if (!condMet({ noHires: true }, f)) (r.state = 'broken'), r.why.push('no sellsword hired: fails for a run whose heroes were all bought with Hire');
    }
  }
}

const md = process.argv.includes('--md');
const count = (s: Row['state']) => rows.filter((r) => r.state === s).length;
if (md) {
  console.log('| Quest | Kind | Goal | State | Why |\n| --- | --- | --- | --- | --- |');
  for (const r of rows) console.log(`| \`${r.id}\` ${r.title.replace(/\|/g, '/')} | ${r.kind} | ${r.text.replace(/\|/g, '/')} | ${r.state} | ${r.why.join('; ').replace(/\|/g, '/')} |`);
} else for (const r of rows.filter((x) => x.state === 'broken' || x.state === 'call')) console.log(`${r.state.toUpperCase()}  ${r.id} (${r.kind}): ${r.text}\n        ${r.why.join('\n        ')}`);
console.log(`\n${rows.length} checked: ${count('ok')} can be done, ${count('hidden')} wait with the hidden modes, ${count('call')} need a call, ${count('broken')} broken`);
process.exit(count('broken') ? 1 : 0);
