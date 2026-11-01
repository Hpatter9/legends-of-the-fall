// Voltara's chain (EIDOLON-CHAIN-4, `docs/notes/eidolon-chain-4.md`): the data (three parts, three pieces, the Crown's prologue, a binding with no
// horn beats), its own quest battle (The Copper Works, cast from both starter packs only), offered only once Nivra is bound and the
// Labyrinth cleared, the parts in order (a bronze chest each), the trial (Voltara herself, her kit seen in a real
// fight), the binding (gold chest, chosen, horn untouched) and the save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordOf } from '../src/sim/armies';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { settleRun } from '../src/sim/modes';
import { finish, startStage, canRetry, retryWave } from '../src/sim/run';
import { FIXED_PACKS } from '../src/sim/starter';
import { bindEidolon, boundOf, chosenOf } from '../src/sim/warHorn';
import { castOf, CHAIN_BATTLES, QUEST_BATTLES, questBattleById } from '../src/sim/questBattles';
import { canFightBattle, startQuestBattle } from '../src/sim/questRun';
import type { QuestFight } from '../src/sim/quests';
import { chainById, PIECES, readChainState } from '../src/sim/eidolonChainData';
import { activeChain, beginChain, bindChain, chainDone, chainWantsBattle, currentPart, noteChains, offeredChain, readyToBind, stepsOf, trialDue, trialOf } from '../src/sim/eidolonChains';
import { lineLen } from '../src/sim/sceneKit';
import { revealCard } from '../src/sim/sceneReveal';
import { KITS } from '../src/sim/abilities';
import { SIGNATURES } from '../src/sim/bossAttacks';
import { PHASE2 } from '../src/sim/bossPhases';
import { FOES } from '../src/sim/foes';
import { fight, stepBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { autoDeploy, autoEvent, pickSquad } from '../src/sim/autoplay';
import { autoMerge } from '../src/sim/merge';
import { savedAt } from '../tools/autoplay';
import { ARMIES } from '../src/sim/armies';
import { summon } from '../src/sim/run';

const clear = (m: Meta, ...ids: string[]) => ids.forEach((id) => (m.armies[id] = { ...recordOf(m, id), clears: 1 }));
const packSave = (seed: number, pack: 0 | 1): Meta => {
  const m = startedMeta(seed);
  m.unlocked = [...FIXED_PACKS[pack].heroes];
  m.party = [...m.unlocked];
  return m;
};
const STARTERS = FIXED_PACKS.flatMap((p) => p.heroes);
const voltara = chainById('voltara')!;
const win = (army: string, more: Partial<QuestFight> = {}): QuestFight => ({ won: true, waves: 1, boss: false, heroes: ['knight'], flawless: true, kills: [], dailyCleared: false, mode: 'army', army, spells: [], ...more });
const bossWin = (army: string, boss: string): QuestFight => win(army, { boss: true, kills: [boss], bosses: [boss] });

/** Askel, Nivra and Aurelan bound, the Labyrinth cleared, Voltara's chain begun at `part` (3: every piece in). */
function atPart(seed: number, pack: 0 | 1, part: number): Meta {
  const m = packSave(seed, pack);
  clear(m, 'orcs', 'beasts', 'wildwood', 'labyrinth');
  assert.ok(beginChain(m, 'askel'));
  m.quests!.chains!.askel = { part: 3, progress: 0 };
  m.quests!.pieces = ['emberHeart', 'kennelCollar', 'kennelBell'];
  assert.ok(bindChain(m, 'askel'));
  assert.ok(beginChain(m, 'nivra'));
  m.quests!.chains!.nivra = { part: 3, progress: 0, trialWon: true };
  m.quests!.pieces.push('rimeScale', 'merePearl', 'heldBreath');
  assert.ok(bindChain(m, 'nivra'));
  assert.ok(beginChain(m, 'aurelan'));
  m.quests!.chains!.aurelan = { part: 3, progress: 0, trialWon: true };
  m.quests!.pieces.push('dawnThread', 'sunCrown', 'dawnLamp');
  assert.ok(bindChain(m, 'aurelan'));
  assert.ok(beginChain(m, 'voltara'));
  m.quests!.chains!.voltara = { part, progress: 0 };
  m.quests!.pieces.push(...['copperCoil', 'clockFace', 'stormGlass'].slice(0, part));
  return m;
}

function playThrough(m: Meta, id: string, lose = false): void {
  const run = startQuestBattle(m, id, m.party)!;
  assert.ok(run, `${id} starts`);
  const waves = questBattleById(id)!.waves.length;
  for (let stage = 1; stage <= waves; stage++) {
    const b = startStage(run);
    const ok = !(lose && stage === waves);
    if (ok) for (const u of b.units) if (u.side === 'foe') u.alive = false;
    b.phase = ok ? 'won' : 'lost';
    finish(run, ok);
    settleRun(m, run, { won: ok, stage, stars: ok ? 3 : 0, battle: b });
    if (!ok) break;
  }
}

test("the data: three parts and pieces, the Crown's courier at the Sanctum, a binding with no horn beats ending on the seal, a trial of its own", () => {
  assert.equal(voltara.parts.length, 3);
  assert.equal(voltara.giver.name, 'The Crown');
  assert.deepEqual(voltara.opens, { kind: 'army', army: 'labyrinth' });
  assert.deepEqual(voltara.parts.map((p) => p.goal.kind), ['bossDown', 'battle', 'ults']);
  assert.ok(voltara.parts.every((p) => p.reward.chest === 'bronze' && PIECES.has(p.piece.id)));
  assert.equal(PIECES.size, 12);
  assert.equal(voltara.binding!.at(-1)!.beat, 'bound');
  assert.ok(!voltara.binding!.some((b) => b.beat === 'horn' || b.beat === 'hornFull'));
  const lines = voltara.prologue!.shots.flatMap((s) => s.lines ?? []);
  assert.ok(lines.length >= 8 && lines.some((l) => 'who' in l && l.who === 'crown'));
  assert.ok(voltara.prologue!.shots.every((s) => s.lines?.every((l) => lineLen(l) > 0)));
  assert.ok(voltara.call && /courier/.test(voltara.call.title));
  assert.equal(stepsOf(voltara), 4);
  assert.ok(trialOf(voltara));
});

test('the battle: The Copper Works is its own chain battle, cast from either starter pack, with a named boss', () => {
  const qb = questBattleById('copperWorks')!;
  assert.ok(CHAIN_BATTLES.includes(qb) && !QUEST_BATTLES.includes(qb));
  assert.equal(qb.boss?.name, 'The Mint-Warden');
  for (const slot of qb.cast) for (const k of [...slot.heroes, ...(slot.standIns ?? [])]) assert.ok(STARTERS.includes(k), k);
  for (const pack of [0, 1] as const) assert.ok(castOf(packSave(1, pack), qb), `pack ${pack}`);
  assert.ok(qb.before(['knight']).shots.length >= 3 && qb.after(['knight']).shots.length >= 1);
});

test('offered once Nivra is bound and the Labyrinth cleared, not before; the parts go in order with bronze chests', () => {
  const m = packSave(5, 0);
  clear(m, 'orcs', 'beasts', 'wildwood');
  bindEidolon(m, 'askel');
  bindEidolon(m, 'nivra');
  bindEidolon(m, 'aurelan');
  assert.equal(offeredChain(m), undefined, 'not before the Labyrinth');
  clear(m, 'labyrinth');
  assert.equal(offeredChain(m), voltara);
  const p = atPart(6, 1, 0);
  assert.equal(activeChain(p), voltara);
  assert.equal(chainWantsBattle(p, 'copperWorks'), false, 'the battle only on its part');
  assert.deepEqual(noteChains(p, bossWin('orcs', 'orcWarlord')), []);
  const stash = p.stash.length;
  const found = noteChains(p, bossWin('labyrinth', 'gorgonQueen'));
  assert.deepEqual(found.map((f) => f.piece.id), ['copperCoil']);
  assert.equal(p.stash.length, stash + 1);
  assert.ok(chainWantsBattle(p, 'copperWorks') && canFightBattle(p, 'copperWorks'));
  playThrough(p, 'copperWorks', true);
  assert.equal(currentPart(p)?.index, 1, 'a loss counts nothing');
  playThrough(p, 'copperWorks');
  assert.equal(currentPart(p)?.index, 2);
  // (part 3: six ultimates fired, won or lost)
  noteChains(p, win('orcs', { ults: ['knight', 'knight', 'knight'] }));
  assert.equal(p.quests!.chains!.voltara.progress, 3);
  noteChains(p, win('orcs', { ults: ['knight', 'knight', 'knight'] }));
  assert.equal(currentPart(p), undefined);
  assert.ok(trialDue(p));
});

test("the trial is one entry: Voltara's fighter, kit, great attacks, second form; it faces the trial before the binding", () => {
  const t = trialOf(voltara)!;
  assert.equal(FOES[t.boss.id].sheet, 'eidolon_voltara');
  assert.deepEqual(SIGNATURES[t.boss.id].map((s) => [s.key, s.shape.kind, s.el, s.rider]), [['chainArc', 'line', 'lightning', 'stun'], ['stormMark', 'rain', 'lightning', 'burn']]);
  assert.ok(PHASE2[t.boss.id].shield! > 0 && KITS[t.boss.id].passive?.arc);
  const m = atPart(30, 0, 3);
  assert.equal(bindChain(m, 'voltara'), false, 'not before the trial');
  assert.equal(trialDue(m)?.trial.id, 'voltaraTrial');
  playThrough(m, 'voltaraTrial');
  assert.equal(readyToBind(m), voltara);
});

test('the binding: Voltara is bound and chosen, a gold chest is paid, the horn is untouched, his Bound card shows', () => {
  const m = atPart(31, 1, 3);
  m.quests!.chains!.voltara.trialWon = true;
  m.eidolons!.horn = 300;
  const stash = m.stash.length;
  assert.ok(bindChain(m, 'voltara'));
  assert.equal(chosenOf(m), 'voltara');
  assert.deepEqual([...boundOf(m)].sort(), ['askel', 'aurelan', 'nivra', 'voltara']);
  assert.equal(m.stash.length, stash + 1);
  assert.equal(m.stash.at(-1)!.at, 10, 'a gold chest');
  assert.equal(m.eidolons!.horn, 300);
  assert.equal(bindChain(m, 'voltara'), false, 'once');
  assert.ok(chainDone(m, voltara));
  const card = revealCard({ kind: 'eidolon', id: 'voltara' }, m)!;
  assert.equal(card.label, 'Bound');
  assert.match(card.name, /Voltara/);
});

test('the save keeps the chain (junk dropped)', () => {
  const m = atPart(40, 0, 2);
  const map = new Map<string, string>();
  saveMeta(m, { setItem: (k, v) => void map.set(k, v) });
  const back = loadMeta(1, { getItem: (k) => map.get(k) ?? null });
  assert.deepEqual(back.quests!.chains!.voltara, { part: 2, progress: 0 });
  assert.deepEqual(readChainState({ chains: { voltara: { part: 2, progress: 0, trialWon: true } } }), { chains: { voltara: { part: 2, progress: 0 } } });
  assert.deepEqual(readChainState({ chains: { voltara: { part: 9, progress: 9, bound: true } } }), { chains: { voltara: { part: 3, progress: 0, bound: true } } });
});

/** The trial fought as the rating tool fights it. */
function fightTrial(level: number, seed: number): { won: boolean; events: string[]; boss: { phased: boolean; called: number } } {
  const party = ['knight', 'peasant', 'samurai', 'archer', 'wizard'];
  const m = savedAt(level, party, seed);
  m.unlocked = [...new Set([...m.unlocked, ...party])];
  m.party = [...party];
  for (const a of ARMIES) m.armies[a.id] = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
  m.quests = { active: [], offers: [], done: [], won: ['voltaraTrial'] };
  const run = startQuestBattle(m, 'voltaraTrial', party)!;
  const ids = run.roster.map((h) => h.id);
  const events: string[] = [];
  let boss = { phased: false, called: 0 };
  while (!run.over) {
    autoEvent(run);
    autoMerge(run);
    while (summon(run)) autoMerge(run);
    run.squad = pickSquad(run, m, ids).slice(0, 5).map((h) => h.id);
    const b: Battle = startStage(run);
    autoDeploy(b, run, m);
    fight(b);
    for (let n = 0; b.phase === 'fight' && n < 30000; n++)
      for (const e of stepBattle(b) as BattleEvent[]) if (e.kind === 'bossSig' || e.kind === 'phase' || e.kind === 'skill') events.push(`${b.t}:${e.kind}:${'key' in e ? e.key : ''}:${'phase' in e ? e.phase : ''}`);
    const au = b.units.find((u) => u.def === 'voltaraGoddess');
    if (au) boss = { phased: !!au.phase?.done, called: b.units.filter((u) => u.owner === au.id && u.def === 'crystalGolem').length };
    const ok = b.phase === 'won';
    if (!ok && canRetry(run)) {
      retryWave(run);
      continue;
    }
    finish(run, ok);
  }
  return { won: !!run.cleared, events, boss };
}

test('the trial battle is deterministic, and Voltara fights with her kit: the chain arc, the marked storm, her sentries, the overcharged form', () => {
  const a = fightTrial(40, 2003);
  assert.deepEqual(a, fightTrial(40, 2003), 'the same seed, the same fight');
  const kinds = a.events.map((e) => e.split(':').slice(1, 3).join(':'));
  for (const k of ['bossSig:chainArc', 'bossSig:stormMark', 'skill:', 'phase:']) assert.ok(kinds.some((x) => x.startsWith(k)), `${k} in ${[...new Set(kinds)].join(' ')}`);
  assert.ok(a.boss.phased && a.boss.called > 0, JSON.stringify(a.boss));
  assert.notDeepEqual(fightTrial(40, 2004).events, a.events);
});
