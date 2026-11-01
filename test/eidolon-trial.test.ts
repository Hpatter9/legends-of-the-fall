// The Eidolons' trials (EIDOLON-TRIAL, `docs/notes/eidolon-chain-2.md`): Nivra's trial, the fight against the Eidolon herself after the
// three pieces and before the binding. The data (her fighter, kit, great attacks and second form taken into the tables from one entry), the
// trial only after the three pieces, winning it readies the binding (losing it changes nothing), older saves mid-chain, and the trial
// battle itself deterministic, with its breath down a row, its wolves and its ice armour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordOf, ARMIES } from '../src/sim/armies';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { settleRun } from '../src/sim/modes';
import { canRetry, finish, retryWave, startStage, summon } from '../src/sim/run';
import { FIXED_PACKS } from '../src/sim/starter';
import { boundOf, chosenOf } from '../src/sim/warHorn';
import { castOf, CHAIN_BATTLES, QUEST_BATTLES, questArmy, questBattleById, questBossOf } from '../src/sim/questBattles';
import { canFightBattle, startQuestBattle } from '../src/sim/questRun';
import { type QuestFight } from '../src/sim/quests';
import { CHAINS, chainById, readChainState } from '../src/sim/eidolonChainData';
import { activeChain, beginChain, bindChain, chainDone, chainOfBattle, chainWantsBattle, currentPart, noteChains, readyToBind, stepsOf, summonerWaiting, trialDue, trialOf } from '../src/sim/eidolonChains';
import { TRIALS, trialOfBattle, trialOfChainId } from '../src/sim/eidolonTrials';
import { FOES, isBoss } from '../src/sim/foes';
import { KITS } from '../src/sim/abilities';
import { SIGNATURES } from '../src/sim/bossAttacks';
import { PHASE2 } from '../src/sim/bossPhases';
import { fight, stepBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { autoDeploy, autoEvent, pickSquad } from '../src/sim/autoplay';
import { autoMerge } from '../src/sim/merge';
import { savedAt } from '../tools/autoplay';

const clear = (m: Meta, ...ids: string[]) => ids.forEach((id) => (m.armies[id] = { ...recordOf(m, id), clears: 1 }));
const packSave = (seed: number, pack: 0 | 1): Meta => {
  const m = startedMeta(seed);
  m.unlocked = [...FIXED_PACKS[pack].heroes];
  m.party = [...m.unlocked];
  return m;
};
const STARTERS = FIXED_PACKS.flatMap((p) => p.heroes);
const nivra = chainById('nivra')!;
const win = (army: string, more: Partial<QuestFight> = {}): QuestFight => ({ won: true, waves: 1, boss: false, heroes: ['knight'], flawless: true, kills: [], dailyCleared: false, mode: 'army', army, spells: [], ...more });

/** A save with Askel bound and Nivra's chain begun, at part `part` (3: every piece in). */
function atPart(seed: number, pack: 0 | 1, part: number): Meta {
  const m = packSave(seed, pack);
  clear(m, 'orcs');
  assert.ok(beginChain(m, 'askel'));
  m.quests!.chains!.askel = { part: 3, progress: 0 };
  m.quests!.pieces = ['emberHeart', 'kennelCollar', 'kennelBell'];
  assert.ok(bindChain(m, 'askel'));
  clear(m, 'beasts');
  assert.ok(beginChain(m, 'nivra'));
  m.quests!.chains!.nivra = { part, progress: 0 };
  m.quests!.pieces!.push(...['rimeScale', 'merePearl', 'heldBreath'].slice(0, part));
  return m;
}

/** Play a quest battle's waves through as the page settles them, each won (or the last lost). */
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

/* ------------------------------------------------------------------ the data */

test("Nivra's trial is one entry: her fighter, kit, great attacks, second form and the battle are taken into the tables from it", () => {
  const t = trialOfChainId('nivra')!;
  assert.ok(t && trialOf(nivra) === t && trialOfBattle('nivraTrial') === t);
  // (her fighter: a foe drawn in her own sheet, a boss, but not in the meta's boss codex)
  const def = FOES[t.boss.id];
  assert.ok(def && def.side === 'foe' && def.sheet === 'eidolon_nivra' && def.name === 'Nivra');
  assert.equal((def as { title?: string }).title, undefined, 'the title is the intro card\'s, not the fighter\'s');
  assert.ok(isBoss(t.boss.id));
  // (her kit: frost wolves called up, a breath across a row, a ring of ice, and at half health ice armour and more wolves)
  assert.equal(KITS[t.boss.id].skill.name, 'Call of the Mere');
  assert.deepEqual(SIGNATURES[t.boss.id].map((s) => [s.key, s.shape.kind, s.el]), [['rimeBreath', 'row', 'ice'], ['glassTomb', 'ring', 'ice']]);
  assert.ok(PHASE2[t.boss.id].shield! > 0 && PHASE2[t.boss.id].adds?.kind === 'packWhite');
  // (the battle: a chain battle, not one of the eleven, on snow, the Eidolon last under her own name; it lifts her above a mid-boss)
  const qb = questBattleById('nivraTrial')!;
  assert.ok(CHAIN_BATTLES.includes(qb) && !QUEST_BATTLES.includes(qb));
  assert.equal(qb.land, 'snow');
  assert.equal(questBossOf(qb), 'nivraWyrm');
  assert.equal(qb.boss?.name, 'Nivra');
  assert.ok(questArmy('nivraTrial'));
  assert.equal(chainOfBattle('nivraTrial'), nivra);
  // (her lines: the challenge before, and her words after)
  const before = qb.before(['kunoichi']);
  const said = before.shots.flatMap((s) => s.lines ?? []).map((l) => ('text' in l ? l.text : ''));
  assert.ok(said.includes('You have the pieces. Do you have the nerve?'));
  assert.ok(qb.after(['samurai']).shots.length >= 1);
  // (the cast asks only for starter heroes, from both packs)
  for (const slot of qb.cast) for (const k of [...slot.heroes, ...(slot.standIns ?? [])]) assert.ok(STARTERS.includes(k), k);
  for (const pack of [0, 1] as const) assert.ok(castOf(packSave(1, pack), qb), `pack ${pack}`);
  // (every chain after Askel's has its trial written; Askel's has none)
  for (const c of CHAINS.slice(1)) assert.ok(c.trial && trialOf(c), c.id);
  assert.equal(trialOf(chainById('askel')!), undefined);
  assert.equal(stepsOf(nivra), 4);
  assert.equal(stepsOf(chainById('askel')!), 3);
  assert.equal(TRIALS.length, new Set(TRIALS.map((x) => x.chain)).size, 'one trial a chain');
});

/* ------------------------------------------------------------------ the rules */

test('the trial comes only after the three pieces; winning it readies the binding, losing it changes nothing', () => {
  for (const part of [0, 1, 2]) {
    const m = atPart(20 + part, 1, part);
    assert.equal(trialDue(m), undefined, `part ${part}`);
    assert.equal(chainWantsBattle(m, 'nivraTrial'), false);
    assert.equal(canFightBattle(m, 'nivraTrial'), false);
    // (a trial "won" before its time counts nothing)
    noteChains(m, win('beasts', { battle: 'nivraTrial' }));
    assert.equal(m.quests!.chains!.nivra.trialWon, undefined);
  }
  const m = atPart(30, 0, 3);
  assert.equal(currentPart(m), undefined);
  assert.equal(trialDue(m)?.trial.id, 'nivraTrial');
  assert.ok(chainWantsBattle(m, 'nivraTrial') && canFightBattle(m, 'nivraTrial'));
  assert.equal(readyToBind(m), undefined);
  assert.equal(summonerWaiting(m), false);
  assert.equal(bindChain(m, 'nivra'), false);
  // (another battle won, or the trial lost, counts nothing)
  assert.deepEqual(noteChains(m, win('beasts', { battle: 'glassMere' })), []);
  const stash = m.stash.length;
  playThrough(m, 'nivraTrial', true);
  assert.ok(trialDue(m) && !readyToBind(m), 'lost: the trial waits');
  assert.ok(canFightBattle(m, 'nivraTrial'), 'and may be fought again from the log');
  // (won: no piece and no chest, the binding is its reward)
  playThrough(m, 'nivraTrial');
  assert.equal(m.quests!.chains!.nivra.trialWon, true);
  assert.equal(trialDue(m), undefined);
  assert.equal(readyToBind(m), nivra);
  assert.ok(summonerWaiting(m));
  assert.equal(m.stash.length, stash);
  // (winning binds: Nivra bound and chosen, the chain done)
  assert.ok(bindChain(m, 'nivra'));
  assert.ok(chainDone(m, nivra) && boundOf(m).includes('nivra') && chosenOf(m) === 'nivra');
  // (after, the trial is practice)
  assert.ok(canFightBattle(m, 'nivraTrial'));
  const prac = startQuestBattle(m, 'nivraTrial', m.party)!;
  assert.ok(prac.mode?.kind === 'quest' && prac.mode.practice);
});

/* ------------------------------------------------------------------ saves */

test('old saves mid-chain still work: a save at any part loads and goes on; one with every piece in faces the trial; one bound stays bound', () => {
  const round = (m: Meta): Meta => {
    const map = new Map<string, string>();
    saveMeta(m, { setItem: (k, v) => void map.set(k, v) });
    return loadMeta(1, { getItem: (k) => map.get(k) ?? null });
  };
  // (saved at part 2, before trials existed: it carries on there)
  const mid = round(atPart(40, 1, 1));
  assert.equal(currentPart(mid)?.part.id, 'nivra2');
  // (saved with every piece in, before trials existed (it was ready to bind then): now its trial is due)
  const all = round(atPart(41, 0, 3));
  assert.deepEqual(all.quests!.chains!.nivra, { part: 3, progress: 0 });
  assert.equal(activeChain(all), nivra);
  assert.equal(trialDue(all)?.trial.id, 'nivraTrial');
  // (the trial won survives the save)
  all.quests!.chains!.nivra.trialWon = true;
  const won = round(all);
  assert.equal(readyToBind(won), nivra);
  // (bound before trials existed: still bound, nothing asked of it)
  const bound = atPart(42, 1, 3);
  bound.quests!.chains!.nivra.bound = true;
  const back = round(bound);
  assert.ok(chainDone(back, nivra) && !trialDue(back));
  // (junk: a trial "won" before the pieces are in, or not `true`, is dropped)
  assert.deepEqual(readChainState({ chains: { nivra: { part: 2, progress: 0, trialWon: true } } }), { chains: { nivra: { part: 2, progress: 0 } } });
  assert.deepEqual(readChainState({ chains: { nivra: { part: 3, progress: 0, trialWon: 'yes' } } }), { chains: { nivra: { part: 3, progress: 0 } } });
  assert.deepEqual(readChainState({ chains: { nivra: { part: 3, progress: 0, trialWon: true } } }), { chains: { nivra: { part: 3, progress: 0, trialWon: true } } });
});

/* ------------------------------------------------------------------ the battle */

/** The trial fought as the rating tool fights it, at a level, every event kept: the same seed is the same fight. */
function fightTrial(level: number, seed: number): { won: boolean; events: string[]; boss: { hp: number; phased: boolean; called: number } } {
  const party = ['kunoichi', 'knight', 'samurai', 'archer', 'peasant'];
  const m = savedAt(level, party, seed);
  m.unlocked = [...new Set([...m.unlocked, ...party])];
  m.party = [...party];
  for (const a of ARMIES) m.armies[a.id] = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
  m.quests = { active: [], offers: [], done: [], won: ['nivraTrial'] };
  const run = startQuestBattle(m, 'nivraTrial', party)!;
  const ids = run.roster.map((h) => h.id);
  const events: string[] = [];
  let boss = { hp: 0, phased: false, called: 0 };
  while (!run.over) {
    autoEvent(run);
    autoMerge(run);
    while (summon(run)) autoMerge(run);
    run.squad = pickSquad(run, m, ids).slice(0, 5).map((h) => h.id);
    const b: Battle = startStage(run);
    autoDeploy(b, run, m);
    fight(b);
    for (let n = 0; b.phase === 'fight' && n < 30000; n++) {
      for (const e of stepBattle(b) as BattleEvent[]) {
        if (e.kind === 'bossSig' || e.kind === 'phase' || e.kind === 'skill') events.push(`${b.t}:${e.kind}:${'key' in e ? e.key : ''}:${'phase' in e ? e.phase : ''}`);
        // (the breath strikes a whole row: every marked tile on one row, the field's full width where it can be stood on)
        if (e.kind === 'bossSig' && e.phase === 'warn' && e.key === 'rimeBreath') {
          const rows = new Set(e.tiles.map((i) => Math.floor(i / b.board.w)));
          assert.equal(rows.size, 1, 'one row');
          assert.ok(e.tiles.length >= b.board.w - 3, `most of the row: ${e.tiles.length}`);
        }
      }
    }
    const nv = b.units.find((u) => u.def === 'nivraWyrm');
    if (nv) boss = { hp: nv.hp, phased: !!nv.phase?.done, called: b.units.filter((u) => u.owner === nv.id && u.def === 'packWhite').length };
    const ok = b.phase === 'won';
    if (!ok && canRetry(run)) {
      retryWave(run);
      continue;
    }
    finish(run, ok);
  }
  return { won: !!run.cleared, events, boss };
}

test('the trial battle is deterministic, and Nivra fights with her kit: the breath down a row, the ring of ice, wolves, ice armour at half', () => {
  const a = fightTrial(23, 1003);
  const b = fightTrial(23, 1003);
  assert.deepEqual(a, b, 'the same seed, the same fight');
  const kinds = new Set(a.events.map((e) => e.split(':').slice(1, 3).join(':')));
  for (const k of ['bossSig:rimeBreath', 'bossSig:glassTomb', 'skill:', 'phase:']) assert.ok([...kinds].some((x) => x.startsWith(k)), `${k} in ${[...kinds].join(' ')}`);
  assert.ok(a.events.some((e) => e.includes(':phase:')), 'the ice armour');
  assert.ok(a.boss.phased && a.boss.called > 0, JSON.stringify(a.boss));
  // (a different seed is a different fight)
  assert.notDeepEqual(fightTrial(23, 1004).events, a.events);
});
