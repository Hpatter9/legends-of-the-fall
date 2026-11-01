// Nivra's chain (EIDOLON-CHAIN-2, `docs/notes/eidolon-chain-2.md`): the data (three parts, three pieces, the hunter's prologue, a binding
// with no horn beats), its own quest battle (The Glass Mere, cast from both starter packs only), offered only once Askel is bound and the
// Beast Packs cleared (an older save too), the parts in order with their pieces and bronze chests, the binding (chosen over Askel, a gold
// chest, the horn left as it was, the "Bound" end card), and the save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordOf } from '../src/sim/armies';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { settleRun } from '../src/sim/modes';
import { finish, startStage } from '../src/sim/run';
import { FIXED_PACKS } from '../src/sim/starter';
import { bindEidolon, boundOf, chosenOf, hornHeld } from '../src/sim/warHorn';
import { castOf, CHAIN_BATTLES, QUEST_BATTLES, questBattleById } from '../src/sim/questBattles';
import { canFightBattle, startQuestBattle } from '../src/sim/questRun';
import { standFight, type QuestFight } from '../src/sim/quests';
import { chainById, PIECES, readChainState } from '../src/sim/eidolonChainData';
import { activeChain, beginChain, bindChain, chainDone, chainOfBattle, chainWantsBattle, currentPart, noteChains, offeredChain, partBlocked, piecesOf, readyToBind, summonerWaiting, trialDue } from '../src/sim/eidolonChains';
import { lineLen, sceneSeconds } from '../src/sim/sceneKit';
import { revealCard } from '../src/sim/sceneReveal';

const clear = (m: Meta, ...ids: string[]) => ids.forEach((id) => (m.armies[id] = { ...recordOf(m, id), clears: 1 }));
const packSave = (seed: number, pack: 0 | 1): Meta => {
  const m = startedMeta(seed);
  m.unlocked = [...FIXED_PACKS[pack].heroes];
  m.party = [...m.unlocked];
  return m;
};
const STARTERS = FIXED_PACKS.flatMap((p) => p.heroes);
const nivra = chainById('nivra')!;
const askel = chainById('askel')!;

/** A won army fight, as the goals read it. */
const win = (army: string, more: Partial<QuestFight> = {}): QuestFight => ({ won: true, waves: 1, boss: false, heroes: ['knight'], flawless: true, kills: [], dailyCleared: false, mode: 'army', army, spells: [], ...more });
const bossWin = (army: string, boss: string): QuestFight => win(army, { boss: true, kills: [boss], bosses: [boss] });

/** Askel's chain played to its binding at the Summoner, as the page does (the first binding: it gives the horn). */
function bindAskel(m: Meta): void {
  clear(m, 'orcs');
  assert.ok(beginChain(m, 'askel'));
  m.quests!.chains!.askel = { part: 3, progress: 0 };
  m.quests!.pieces = [...(m.quests!.pieces ?? []), 'emberHeart', 'kennelCollar', 'kennelBell'];
  assert.ok(bindChain(m, 'askel'));
}

/** Play the Glass Mere through to a win (its three waves), settled as the page settles them. */
function winMere(m: Meta): void {
  const run = startQuestBattle(m, 'glassMere', m.party)!;
  assert.ok(run, 'the battle starts');
  for (const stage of [1, 2, 3]) {
    const b = startStage(run);
    for (const u of b.units) if (u.side === 'foe') u.alive = false;
    b.phase = 'won';
    finish(run, true);
    settleRun(m, run, { won: true, stage, stars: 3, battle: b });
  }
  assert.ok(run.cleared);
}

/* ------------------------------------------------------------------ the data */

test("Nivra's chain: three parts with their pieces, the hunter's prologue, and a binding with her line and no horn beats", () => {
  assert.equal(nivra.order, 2);
  assert.deepEqual(nivra.opens, { kind: 'army', army: 'beasts' });
  assert.equal(nivra.giver.name, 'A frost-bitten hunter');
  assert.equal(nivra.parts.length, 3);
  for (const p of nivra.parts) assert.ok(p.title && p.text && p.begin && p.goal.n >= 1 && p.piece.lines.length === 2 && p.reward.chest === 'bronze', p.id);
  assert.deepEqual(nivra.parts.map((p) => p.piece.name), ['The Rime Scale', 'The Mere-Pearl', 'The Held Breath']);
  assert.ok(nivra.parts.every((p) => PIECES.get(p.piece.id) === p.piece));
  // (one part beats an existing boss again, one is the chain's own battle, one a quiet goal)
  assert.deepEqual(nivra.parts.map((p) => p.goal.kind), ['bossDown', 'battle', 'wavesWon']);
  // (the binding: beats in order, her line, ending on the seal; the horn was handed over at Askel's binding, so no horn beats)
  const at = nivra.binding!.map((b) => b.at);
  assert.deepEqual(at, [...at].sort((a, b) => a - b));
  assert.equal(nivra.binding!.at(-1)!.beat, 'bound');
  assert.ok(!nivra.binding!.some((b) => b.beat === 'horn' || b.beat === 'hornFull'));
  assert.ok(nivra.binding!.some((b) => b.who === 'eidolon' && /remembers/.test(b.text ?? '')));
  // (the prologue: a short scene in the cinematics' shape, the hunter speaking, its lines readable; the Sanctum's plaque names the hunter)
  const pro = nivra.prologue!;
  assert.equal(pro.moment?.kind, 'eidolon');
  assert.ok(sceneSeconds(pro) >= 15 && sceneSeconds(pro) <= 75, String(sceneSeconds(pro)));
  for (const s of pro.shots) for (const l of s.lines ?? []) assert.ok(lineLen(l) <= 9 && (l.who === 'narrator' || l.who in pro.cast), l.text);
  assert.ok(pro.shots.some((s) => s.lines?.some((l) => l.who === 'hunter')));
  assert.match(nivra.call!.title, /hunter/);
});

test('The Glass Mere is the chain\'s own battle (not one of the ordinary eleven), asking only for starter heroes, from both packs', () => {
  const qb = questBattleById('glassMere')!;
  assert.ok(qb && CHAIN_BATTLES.includes(qb) && !QUEST_BATTLES.includes(qb));
  assert.equal(chainOfBattle('glassMere'), nivra);
  assert.equal(chainOfBattle('frozenMeadow'), undefined, 'The Frozen Meadow stays an ordinary quest battle');
  assert.equal(qb.waves.at(-1)!.boss, 'final');
  assert.ok(qb.boss?.name && qb.boss.title);
  for (const slot of qb.cast) {
    const all = [...slot.heroes, ...(slot.standIns ?? [])];
    assert.ok(all.every((k) => STARTERS.includes(k)), 'starter heroes only');
    for (const p of FIXED_PACKS) assert.ok(p.heroes.some((k) => all.includes(k)), `${p.id} can fill it`);
  }
  assert.deepEqual(castOf(packSave(1, 0), qb), ['samurai'], 'Sword and Shield: Kenji');
  assert.deepEqual(castOf(packSave(1, 1), qb), ['kunoichi'], 'Blade and Spell: Ayame');
  const one = packSave(2, 0);
  one.unlocked = ['wizard'];
  assert.deepEqual(castOf(one, qb), ['wizard'], 'a stand-in takes the part');
  const none = packSave(3, 0);
  none.unlocked = ['werewolf'];
  assert.ok(partBlocked(none, nivra.parts[1])?.includes('kunoichi'));
  // (its stories name whoever came, and the boss speaks)
  assert.ok(qb.before(['samurai']).shots.length >= 3 && qb.after(['samurai']).shots.length >= 1);
  assert.ok(qb.before(['samurai']).shots.some((s) => s.lines?.some((l) => l.who === 'warden')));
});

/* ------------------------------------------------------------------ offered after Askel and the Beast Packs */

test('offered only once Askel is bound and the Beast Packs cleared (an older save as soon as it loads), and begun once', () => {
  // (the Beast Packs cleared, Askel not bound: Askel's chain comes first)
  const a = packSave(4, 0);
  clear(a, 'orcs', 'undead', 'beasts');
  assert.equal(offeredChain(a), askel);
  beginChain(a, 'askel');
  assert.equal(offeredChain(a), undefined, "none while Askel's goes");
  // (Askel bound, the Beast Packs not cleared: nothing yet)
  const b = packSave(5, 1);
  bindAskel(b);
  assert.equal(offeredChain(b), undefined);
  assert.equal(summonerWaiting(b), false);
  // (then the Beast Packs fall: the hunter comes)
  clear(b, 'undead', 'beasts');
  assert.equal(offeredChain(b), nivra);
  assert.ok(summonerWaiting(b));
  assert.equal(beginChain(b, 'voltara'), false);
  assert.ok(beginChain(b, 'nivra'));
  assert.equal(beginChain(b, 'nivra'), false, 'once');
  assert.equal(activeChain(b), nivra);
  assert.equal(currentPart(b)?.index, 0);
  // (an older save, from before Nivra's chain was written, with Askel bound and the Beast Packs long cleared: offered as it loads)
  const old = packSave(6, 0);
  bindAskel(old);
  clear(old, 'undead', 'beasts', 'wildwood');
  const map = new Map<string, string>();
  saveMeta(old, { setItem: (k, v) => void map.set(k, v) });
  const back = loadMeta(1, { getItem: (k) => map.get(k) ?? null });
  assert.equal(offeredChain(back), nivra);
  // (and a save whose Askel was bound by the dev flag, not the Summoner, is offered it too)
  const dev = packSave(7, 1);
  clear(dev, 'orcs', 'beasts');
  bindEidolon(dev, 'askel');
  assert.equal(offeredChain(dev), nivra);
});

/* ------------------------------------------------------------------ the parts, in order */

test('the parts go in order, each finding its piece and paying a bronze chest; the Glass Mere opens only on its part', () => {
  const m = packSave(8, 1);
  bindAskel(m);
  clear(m, 'beasts');
  beginChain(m, 'nivra');
  const stash = m.stash.length;
  // (the later parts' goals met first count for nothing)
  for (let i = 0; i < 6; i++) assert.deepEqual(noteChains(m, win('orcs')), []);
  assert.equal(canFightBattle(m, 'glassMere'), false, 'the battle waits for its part');
  // (part 1: a Beast Packs boss, not another army's, and a lost fight counts nothing)
  assert.deepEqual(noteChains(m, bossWin('orcs', 'orcWarlord')), []);
  assert.deepEqual(noteChains(m, { ...bossWin('beasts', 'alphaWolf'), won: false }), []);
  const found = noteChains(m, bossWin('beasts', 'boarKing'));
  assert.deepEqual(found.map((f) => [f.chain, f.part, f.piece.id]), [['nivra', 0, 'rimeScale']]);
  assert.equal(m.stash.length, stash + 1);
  // (part 2: the Glass Mere, now open from the chain)
  assert.ok(chainWantsBattle(m, 'glassMere') && canFightBattle(m, 'glassMere'));
  winMere(m);
  assert.deepEqual(piecesOf(m, nivra).map((p) => p.id), ['rimeScale', 'merePearl']);
  assert.equal(currentPart(m)?.index, 2);
  // (a replay of the Glass Mere won is practice)
  const prac = startQuestBattle(m, 'glassMere', m.party)!;
  assert.ok(prac.mode?.kind === 'quest' && prac.mode.practice);
  // (part 3: army waves won with no king's spell; a spell cast, the Last Stand or a lost wave counts nothing)
  assert.deepEqual(noteChains(m, win('orcs', { spells: ['fireball'] })), []);
  assert.deepEqual(noteChains(m, standFight(12, { best: 12 })), []);
  assert.deepEqual(noteChains(m, { ...win('orcs'), won: false }), []);
  assert.equal(currentPart(m)?.progress, 0);
  for (let i = 0; i < 4; i++) assert.deepEqual(noteChains(m, win('undead')), []);
  assert.equal(currentPart(m)?.progress, 4);
  assert.equal(noteChains(m, win('wildwood'))[0].piece.id, 'heldBreath');
  assert.equal(m.stash.length, stash + 3);
  // (EIDOLON-TRIAL, the owner's call: every piece in, Nivra's trial comes before the binding; `eidolon-trial.test.ts` plays it)
  assert.equal(readyToBind(m), undefined);
  assert.equal(trialDue(m)?.trial.id, 'nivraTrial');
  assert.equal(summonerWaiting(m), false);
  assert.deepEqual(noteChains(m, bossWin('beasts', 'alphaWolf')), [], 'nothing more counts once every piece is in');
});

/* ------------------------------------------------------------------ the binding */

test('binding: Nivra is bound and chosen over Askel, a gold chest is paid, the horn is left as it was, and her "Bound" card shows', () => {
  const m = packSave(9, 0);
  bindAskel(m);
  clear(m, 'beasts');
  beginChain(m, 'nivra');
  assert.equal(bindChain(m, 'nivra'), false, 'not before every piece is in');
  m.quests!.chains!.nivra = { part: 3, progress: 0 };
  m.quests!.pieces!.push('rimeScale', 'merePearl', 'heldBreath');
  // (EIDOLON-TRIAL: and not before her trial is won)
  assert.equal(bindChain(m, 'nivra'), false, 'not before the trial is won');
  m.quests!.chains!.nivra.trialWon = true;
  assert.ok(hornHeld(m));
  m.eidolons!.horn = 300; // (blown since Askel's binding, and part refilled)
  const stash = m.stash.length;
  assert.equal(chosenOf(m), 'askel');
  assert.ok(bindChain(m, 'nivra'));
  assert.deepEqual([...boundOf(m)].sort(), ['askel', 'nivra']);
  assert.equal(chosenOf(m), 'nivra');
  assert.equal(m.stash.length, stash + 1);
  assert.equal(m.stash.at(-1)!.at, 10, 'a gold chest');
  assert.ok(chainDone(m, nivra) && m.quests!.chains!.nivra.bound);
  // (the horn's fill is not touched: only the first binding fills it)
  assert.equal(m.eidolons!.horn, 300);
  assert.equal(bindChain(m, 'nivra'), false, 'once');
  assert.equal(summonerWaiting(m), false);
  // (the end card: Bound, Nivra, who answers now, and where to choose)
  const card = revealCard({ kind: 'eidolon', id: 'nivra' }, m)!;
  assert.equal(card.label, 'Bound');
  assert.equal(card.name, 'Nivra, the Rime Wyrm');
  assert.match(card.where, /Pact Gallery/);
  // (the next chain, Aurelan's, opens once the Wildwood is cleared)
  assert.equal(offeredChain(m), undefined, 'not before the Wildwood');
  clear(m, 'wildwood');
  assert.equal(offeredChain(m)?.id, 'aurelan');
});

/* ------------------------------------------------------------------ determinism and saves */

test("the same fights give the same chain, and the save keeps Nivra's (junk dropped)", () => {
  const play = () => {
    const m = packSave(10, 1);
    bindAskel(m);
    clear(m, 'beasts');
    beginChain(m, 'nivra');
    noteChains(m, bossWin('beasts', 'alphaWolf'));
    return m;
  };
  assert.deepEqual(play(), play());
  const m = play();
  const map = new Map<string, string>();
  saveMeta(m, { setItem: (k, v) => void map.set(k, v) });
  const back = loadMeta(1, { getItem: (k) => map.get(k) ?? null });
  assert.deepEqual(back.quests!.chains!.nivra, { part: 1, progress: 0 });
  assert.ok(back.quests!.pieces!.includes('rimeScale'));
  assert.equal(activeChain(back), nivra);
  assert.equal(currentPart(back)?.part.id, 'nivra2');
  // (junk: parts out of range, a count beyond the goal, a "bound" before the pieces are in, unknown pieces)
  assert.deepEqual(readChainState({ chains: { nivra: { part: 2, progress: 99, bound: true } }, pieces: ['merePearl', 'icicle'] }), { chains: { nivra: { part: 2, progress: 5 } }, pieces: ['merePearl'] });
  assert.deepEqual(readChainState({ chains: { nivra: { part: -3 } } }), { chains: { nivra: { part: 0, progress: 0 } } });
});
