// Gorm's chain (EIDOLON-CHAIN-5, `docs/notes/eidolon-chain-5.md`): the data (three parts, three pieces, Duchess's prologue, a binding with no
// horn beats), its own quest battle (The Buried Foundation, cast from both starter packs only), offered only once Gorm is bound and the
// Infernal Host cleared, the parts in order (a bronze chest each), the trial (Gorm himself, his kit seen in a real
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
const gorm = chainById('gorm')!;
const win = (army: string, more: Partial<QuestFight> = {}): QuestFight => ({ won: true, waves: 1, boss: false, heroes: ['knight'], flawless: true, kills: [], dailyCleared: false, mode: 'army', army, spells: [], ...more });
const bossWin = (army: string, boss: string): QuestFight => win(army, { boss: true, kills: [boss], bosses: [boss] });

/** Askel, Nivra, Aurelan and Gorm bound, the Infernal Host cleared, Gorm's chain begun at `part` (3: every piece in). */
function atPart(seed: number, pack: 0 | 1, part: number): Meta {
  const m = packSave(seed, pack);
  clear(m, 'orcs', 'beasts', 'wildwood', 'labyrinth', 'infernal');
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
  m.quests!.chains!.voltara = { part: 3, progress: 0, trialWon: true };
  m.quests!.pieces.push('copperCoil', 'clockFace', 'stormGlass');
  assert.ok(bindChain(m, 'voltara'));
  assert.ok(beginChain(m, 'gorm'));
  m.quests!.chains!.gorm = { part, progress: 0 };
  m.quests!.pieces.push(...['emberCrack', 'masonsMark', 'knockingStone'].slice(0, part));
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

test("the data: three parts and pieces, Duchess at the Sanctum, a binding with no horn beats ending on the seal, a trial of its own", () => {
  assert.equal(gorm.parts.length, 3);
  assert.equal(gorm.giver.name, 'Duchess');
  assert.deepEqual(gorm.opens, { kind: 'army', army: 'infernal' });
  assert.deepEqual(gorm.parts.map((p) => p.goal.kind), ['bossDown', 'battle', 'tally']);
  assert.ok(gorm.parts.every((p) => p.reward.chest === 'bronze' && PIECES.has(p.piece.id)));
  assert.equal(PIECES.size, 18);
  assert.equal(gorm.binding!.at(-1)!.beat, 'bound');
  assert.ok(!gorm.binding!.some((b) => b.beat === 'horn' || b.beat === 'hornFull'));
  const lines = gorm.prologue!.shots.flatMap((s) => s.lines ?? []);
  assert.ok(lines.length >= 8 && lines.some((l) => 'who' in l && l.who === 'duchess'));
  assert.ok(gorm.prologue!.shots.every((s) => s.lines?.every((l) => lineLen(l) > 0)));
  assert.ok(gorm.call && /goat/.test(gorm.call.title));
  assert.equal(stepsOf(gorm), 4);
  assert.ok(trialOf(gorm));
});

test('the battle: The Buried Foundation is its own chain battle, cast from either starter pack, with a named boss', () => {
  const qb = questBattleById('buriedFoundation')!;
  assert.ok(CHAIN_BATTLES.includes(qb) && !QUEST_BATTLES.includes(qb));
  assert.equal(qb.boss?.name, 'The Clerk of Works');
  for (const slot of qb.cast) for (const k of [...slot.heroes, ...(slot.standIns ?? [])]) assert.ok(STARTERS.includes(k), k);
  for (const pack of [0, 1] as const) assert.ok(castOf(packSave(1, pack), qb), `pack ${pack}`);
  assert.ok(qb.before(['knight']).shots.length >= 3 && qb.after(['knight']).shots.length >= 1);
});

test('offered once Voltara is bound and the Infernal Host cleared, not before; the parts go in order with bronze chests', () => {
  const m = packSave(5, 0);
  clear(m, 'orcs', 'beasts', 'wildwood', 'labyrinth');
  bindEidolon(m, 'askel');
  bindEidolon(m, 'nivra');
  bindEidolon(m, 'aurelan');
  bindEidolon(m, 'voltara');
  assert.equal(offeredChain(m), undefined, 'not before the Infernal Host');
  clear(m, 'infernal');
  assert.equal(offeredChain(m), gorm);
  const p = atPart(6, 1, 0);
  assert.equal(activeChain(p), gorm);
  assert.equal(chainWantsBattle(p, 'buriedFoundation'), false, 'the battle only on its part');
  assert.deepEqual(noteChains(p, bossWin('orcs', 'orcWarlord')), []);
  const stash = p.stash.length;
  const found = noteChains(p, bossWin('infernal', 'demonLord'));
  assert.deepEqual(found.map((f) => f.piece.id), ['emberCrack']);
  assert.equal(p.stash.length, stash + 1);
  assert.ok(chainWantsBattle(p, 'buriedFoundation') && canFightBattle(p, 'buriedFoundation'));
  playThrough(p, 'buriedFoundation', true);
  assert.equal(currentPart(p)?.index, 1, 'a loss counts nothing');
  playThrough(p, 'buriedFoundation');
  assert.equal(currentPart(p)?.index, 2);
  // (part 3: 25,000 damage taken, won or lost)
  noteChains(p, win('orcs', { stats: [{ kind: 'knight', dealt: 0, healed: 0, taken: 12000, kills: 0 }] }));
  assert.ok(p.quests!.chains!.gorm.progress > 0);
  noteChains(p, win('orcs', { stats: [{ kind: 'knight', dealt: 0, healed: 0, taken: 14000, kills: 0 }] }));
  assert.equal(currentPart(p), undefined);
  assert.ok(trialDue(p));
});

test("the trial is one entry: Gorm's fighter, kit, great attacks, second form; it faces the trial before the binding", () => {
  const t = trialOf(gorm)!;
  assert.equal(FOES[t.boss.id].sheet, 'eidolon_gorm');
  assert.deepEqual(SIGNATURES[t.boss.id].map((s) => [s.key, s.shape.kind, s.el, s.rider]), [['landslide', 'ring', 'earth', 'shove'], ['risingPillars', 'rain', 'earth', 'stun']]);
  assert.ok(PHASE2[t.boss.id].shield! > 0 && KITS[t.boss.id].passive?.steady);
  const m = atPart(30, 0, 3);
  assert.equal(bindChain(m, 'gorm'), false, 'not before the trial');
  assert.equal(trialDue(m)?.trial.id, 'gormTrial');
  playThrough(m, 'gormTrial');
  assert.equal(readyToBind(m), gorm);
});

test('the binding: Gorm is bound and chosen, a gold chest is paid, the horn is untouched, his Bound card shows', () => {
  const m = atPart(31, 1, 3);
  m.quests!.chains!.gorm.trialWon = true;
  m.eidolons!.horn = 300;
  const stash = m.stash.length;
  assert.ok(bindChain(m, 'gorm'));
  assert.equal(chosenOf(m), 'gorm');
  assert.deepEqual([...boundOf(m)].sort(), ['askel', 'aurelan', 'gorm', 'nivra', 'voltara']);
  assert.equal(m.stash.length, stash + 1);
  assert.equal(m.stash.at(-1)!.at, 10, 'a gold chest');
  assert.equal(m.eidolons!.horn, 300);
  assert.equal(bindChain(m, 'gorm'), false, 'once');
  assert.ok(chainDone(m, gorm));
  const card = revealCard({ kind: 'eidolon', id: 'gorm' }, m)!;
  assert.equal(card.label, 'Bound');
  assert.match(card.name, /Gorm/);
});

test('the save keeps the chain (junk dropped)', () => {
  const m = atPart(40, 0, 2);
  const map = new Map<string, string>();
  saveMeta(m, { setItem: (k, v) => void map.set(k, v) });
  const back = loadMeta(1, { getItem: (k) => map.get(k) ?? null });
  assert.deepEqual(back.quests!.chains!.gorm, { part: 2, progress: 0 });
  assert.deepEqual(readChainState({ chains: { gorm: { part: 2, progress: 0, trialWon: true } } }), { chains: { gorm: { part: 2, progress: 0 } } });
  assert.deepEqual(readChainState({ chains: { gorm: { part: 9, progress: 9, bound: true } } }), { chains: { gorm: { part: 3, progress: 0, bound: true } } });
});

/** The trial fought as the rating tool fights it. */
function fightTrial(level: number, seed: number): { won: boolean; events: string[]; boss: { phased: boolean; called: number } } {
  const party = ['knight', 'peasant', 'samurai', 'archer', 'wizard'];
  const m = savedAt(level, party, seed);
  m.unlocked = [...new Set([...m.unlocked, ...party])];
  m.party = [...party];
  for (const a of ARMIES) m.armies[a.id] = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
  m.quests = { active: [], offers: [], done: [], won: ['gormTrial'] };
  const run = startQuestBattle(m, 'gormTrial', party)!;
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
    const au = b.units.find((u) => u.def === 'gormTitan');
    if (au) boss = { phased: !!au.phase?.done, called: b.units.filter((u) => u.owner === au.id && u.def === 'stoneGolem').length };
    const ok = b.phase === 'won';
    if (!ok && canRetry(run)) {
      retryWave(run);
      continue;
    }
    finish(run, ok);
  }
  return { won: !!run.cleared, events, boss };
}

test('the trial battle is deterministic, and Gorm fights with his kit: the landslide, the rising pillars, his golems, the second form', () => {
  const a = fightTrial(70, 2003);
  assert.deepEqual(a, fightTrial(70, 2003), 'the same seed, the same fight');
  const kinds = a.events.map((e) => e.split(':').slice(1, 3).join(':'));
  for (const k of ['bossSig:landslide', 'bossSig:risingPillars', 'skill:', 'phase:']) assert.ok(kinds.some((x) => x.startsWith(k)), `${k} in ${[...new Set(kinds)].join(' ')}`);
  assert.ok(a.boss.phased && a.boss.called > 0, JSON.stringify(a.boss));
  assert.notDeepEqual(fightTrial(70, 2004).events, a.events);
});
