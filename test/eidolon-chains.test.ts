// The Eidolon chains (EIDOLON-CHAINS, batch 5): the data and the rails, what opens a chain (and old saves), one chain at a time, parts in
// order with their pieces and pay, the chain's own quest battle (its cast from the starter packs only, hidden-until-owned), the binding,
// and the save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordOf } from '../src/sim/armies';
import { loadMeta, newMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { settleRun } from '../src/sim/modes';
import { finish, startStage } from '../src/sim/run';
import { FIXED_PACKS } from '../src/sim/starter';
import { EIDOLON_IDS } from '../src/sim/eidolons';
import { boundOf, chosenOf, bindEidolon } from '../src/sim/warHorn';
import { castOf, CHAIN_BATTLES, QUEST_BATTLES, questBattleById } from '../src/sim/questBattles';
import { canFightBattle, startQuestBattle } from '../src/sim/questRun';
import { readQuests, type QuestFight } from '../src/sim/quests';
import { CHAINS, PIECES, chainById, readChainState } from '../src/sim/eidolonChainData';
import {
  activeChain,
  beginChain,
  bindChain,
  chainDone,
  chainOfBattle,
  chainsShown,
  chainWantsBattle,
  currentPart,
  noteChains,
  offeredChain,
  partBlocked,
  piecesOf,
  readyToBind,
  summonerWaiting,
} from '../src/sim/eidolonChains';
import { lineLen, sceneSeconds } from '../src/sim/sceneKit';

const clear = (m: Meta, ...ids: string[]) => ids.forEach((id) => (m.armies[id] = { ...recordOf(m, id), clears: 1 }));
/** A save that picked a starter pack (its three heroes only). */
const packSave = (seed: number, pack: 0 | 1): Meta => {
  const m = startedMeta(seed);
  m.unlocked = [...FIXED_PACKS[pack].heroes];
  m.party = [...m.unlocked];
  return m;
};
/** A won army boss wave, as the goals read it. */
const bossWin = (army: string, boss: string): QuestFight => ({ won: true, waves: 1, boss: true, heroes: ['knight'], flawless: true, kills: [boss], dailyCleared: false, mode: 'army', army, bosses: [boss] });
const STARTERS = FIXED_PACKS.flatMap((p) => p.heroes);
const askel = chainById('askel')!;

/** Play the chain's quest battle through to a win (its three waves), settled as the page settles them. */
function winKennel(m: Meta): void {
  const run = startQuestBattle(m, 'kennelFires', m.party)!;
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

/* ------------------------------------------------------------------ the data and the rails */

test('six chains, easiest first, one an Eidolon; only Askel\'s is written, the rest are rails that end in a trial', () => {
  assert.deepEqual(CHAINS.map((c) => c.eidolon), [...EIDOLON_IDS]);
  assert.deepEqual(CHAINS.map((c) => c.order), [1, 2, 3, 4, 5, 6]);
  assert.equal(askel.parts.length, 3);
  assert.equal(askel.trial, false, 'the first is the gentle one: no trial');
  assert.deepEqual(askel.opens, { kind: 'army', army: 'orcs' });
  assert.ok(askel.prologue && askel.binding);
  for (const c of CHAINS.slice(1)) {
    assert.equal(c.trial, true, c.id);
    assert.equal(c.parts.length, 0, `${c.id}: written in its own batch`);
    assert.ok(c.giver.name && c.opensWords, c.id);
  }
  // (each part has its words, a goal, a piece and a little pay; the pieces are all different)
  for (const p of askel.parts) assert.ok(p.title && p.text && p.begin && p.goal.n >= 1 && p.piece.lines.length === 2 && p.reward.chest, p.id);
  assert.equal(PIECES.size, 3);
  assert.deepEqual(askel.parts.map((p) => p.piece.name), ['The Ember Heart', 'The Kennel Collar', 'The Kennel Bell']);
  // (the binding's beats run in order, reach bound, then hand over the War Horn and fill it (HORN-GIFT, the owner's new ask: this test
  //  said the beats ended on bound before the horn became the binding's gift); the Eidolon speaks a line)
  const at = askel.binding!.map((b) => b.at);
  assert.deepEqual(at, [...at].sort((a, b) => a - b));
  assert.deepEqual(askel.binding!.slice(-3).map((b) => b.beat), ['bound', 'horn', 'hornFull']);
  assert.ok(askel.binding!.slice(-2).every((b) => b.text && /horn|fire/i.test(b.text)));
  assert.ok(askel.binding!.some((b) => b.who === 'eidolon' && b.text));
  // (the prologue is a short scene in the cinematics' shape, its lines readable)
  assert.ok(sceneSeconds(askel.prologue!) >= 15 && sceneSeconds(askel.prologue!) <= 60);
  for (const s of askel.prologue!.shots) for (const l of s.lines ?? []) assert.ok(lineLen(l) <= 9 && (l.who === 'narrator' || l.who in askel.prologue!.cast));
});

test('the chain\'s battle is its own (not one of the ordinary eleven), and asks only for starter heroes, from both packs', () => {
  const qb = questBattleById('kennelFires')!;
  assert.ok(qb && CHAIN_BATTLES.includes(qb));
  assert.ok(!QUEST_BATTLES.includes(qb));
  assert.equal(chainOfBattle('kennelFires'), askel);
  assert.equal(chainOfBattle('kilnRoad'), undefined, 'The Kiln Road stays an ordinary quest battle');
  for (const slot of qb.cast) {
    const all = [...slot.heroes, ...(slot.standIns ?? [])];
    assert.ok(all.every((k) => STARTERS.includes(k)), 'starter heroes only');
    for (const p of FIXED_PACKS) assert.ok(p.heroes.some((k) => all.includes(k)), `${p.id} can fill it`);
  }
  // (and no part's goal names a hero beyond the starters)
  for (const p of askel.parts) {
    const g = p.goal as { with?: { heroes?: string[] }; all?: string[] };
    for (const k of [...(g.with?.heroes ?? []), ...(g.all ?? [])]) assert.ok(STARTERS.includes(k), p.id);
  }
  // (its story has its words)
  assert.ok(qb.before(['wizard']).shots.length >= 3 && qb.after(['wizard']).shots.length >= 1);
});

/* ------------------------------------------------------------------ opening, one at a time */

test('Askel\'s chain is offered once the Orc Warband falls (an older save at once), and begins with its first part', () => {
  const m = packSave(1, 0);
  assert.equal(offeredChain(m), undefined);
  assert.equal(chainsShown(m), false);
  clear(m, 'orcs');
  assert.equal(offeredChain(m), askel);
  assert.ok(summonerWaiting(m) && chainsShown(m));
  // (an older save, with no quest state at all, is offered it too)
  const old = packSave(2, 1);
  clear(old, 'orcs', 'undead');
  delete old.quests;
  assert.equal(offeredChain(old), askel);
  // (only the chain on offer can begin)
  assert.equal(beginChain(m, 'nivra'), false);
  assert.ok(beginChain(m, 'askel'));
  assert.equal(beginChain(m, 'askel'), false, 'once');
  assert.equal(activeChain(m), askel);
  assert.equal(currentPart(m)?.index, 0);
  assert.equal(offeredChain(m), undefined);
});

test('one chain at a time: none is offered while one is going, nor before the one before it is bound', () => {
  const m = packSave(3, 0);
  clear(m, 'orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal');
  m.calamity = { best: 30, clears: 1 };
  assert.equal(offeredChain(m), askel, 'the first comes first, however far the save has got');
  beginChain(m, 'askel');
  assert.equal(offeredChain(m), undefined, 'none while Askel\'s goes');
  // (Askel bound: the next chain is a rail, not written yet, so nothing is offered)
  bindEidolon(m, 'askel');
  assert.ok(chainDone(m, askel));
  assert.equal(activeChain(m), undefined);
  assert.equal(offeredChain(m), undefined, 'the rails are never offered until written');
  // (the dev flag binds every Eidolon: no chain is offered)
  const dev = packSave(4, 1);
  clear(dev, 'orcs');
  for (const id of EIDOLON_IDS) bindEidolon(dev, id);
  assert.equal(offeredChain(dev), undefined);
});

/* ------------------------------------------------------------------ the parts, in order */

test('the parts go in order, each finding its piece and paying a bronze chest; the battle opens only on its part', () => {
  const m = packSave(5, 1);
  clear(m, 'orcs');
  beginChain(m, 'askel');
  const stash = m.stash.length;
  // (part 3's goal met first counts for nothing: the parts go in order)
  assert.deepEqual(noteChains(m, bossWin('undead', 'boneCaptain')), []);
  assert.deepEqual(noteChains(m, { ...bossWin('orcs', 'orcWarlord'), won: false }), [], 'a lost fight counts nothing');
  assert.equal(canFightBattle(m, 'kennelFires'), false, 'the battle waits for its part');
  // (part 1: an Orc Warband boss)
  const found = noteChains(m, bossWin('orcs', 'orcChieftain'));
  assert.deepEqual(found.map((f) => [f.chain, f.part, f.piece.id]), [['askel', 0, 'emberHeart']]);
  assert.equal(m.stash.length, stash + 1);
  assert.equal(currentPart(m)?.index, 1);
  assert.equal(currentPart(m)?.progress, 0);
  // (part 2: the chain's quest battle, now open from the chain)
  assert.ok(chainWantsBattle(m, 'kennelFires'));
  assert.ok(canFightBattle(m, 'kennelFires'));
  assert.equal(canFightBattle(m, 'kilnRoad'), false);
  winKennel(m);
  assert.deepEqual(piecesOf(m, askel).map((p) => p.id), ['emberHeart', 'kennelCollar']);
  assert.equal(currentPart(m)?.index, 2);
  // (a replay of the battle won is practice: it counts for nothing)
  assert.ok(canFightBattle(m, 'kennelFires'));
  const prac = startQuestBattle(m, 'kennelFires', m.party)!;
  assert.ok(prac.mode?.kind === 'quest' && prac.mode.practice);
  // (part 3: the Bone Captain, on the Undead Legion)
  assert.deepEqual(noteChains(m, bossWin('ogres', 'boneCaptain')), [], 'the Undead Legion\'s Bone Captain, not another army\'s');
  assert.equal(noteChains(m, bossWin('undead', 'boneCaptain'))[0].piece.id, 'kennelBell');
  assert.equal(m.stash.length, stash + 3);
  assert.equal(currentPart(m), undefined);
  assert.equal(readyToBind(m), askel);
  assert.ok(summonerWaiting(m));
  // (nothing more counts once every piece is in)
  assert.deepEqual(noteChains(m, bossWin('orcs', 'orcWarlord')), []);
});

test('binding: Askel is bound and chosen to answer the horn, a gold chest is paid, and the chain is over', () => {
  const m = packSave(6, 0);
  clear(m, 'orcs');
  beginChain(m, 'askel');
  assert.equal(bindChain(m, 'askel'), false, 'not before every piece is in');
  m.quests!.chains!.askel = { part: 3, progress: 0 };
  m.quests!.pieces = ['emberHeart', 'kennelCollar', 'kennelBell'];
  // (another Eidolon already chosen, as by the dev flag: the newly bound one is chosen)
  bindEidolon(m, 'nivra');
  const stash = m.stash.length;
  assert.ok(bindChain(m, 'askel'));
  assert.ok(boundOf(m).includes('askel'));
  assert.equal(chosenOf(m), 'askel');
  assert.equal(m.stash.length, stash + 1);
  assert.equal(m.stash[m.stash.length - 1].at, 10, 'a gold chest');
  assert.ok(chainDone(m, askel) && m.quests!.chains!.askel.bound);
  assert.equal(bindChain(m, 'askel'), false, 'once');
  assert.equal(readyToBind(m), undefined);
  assert.equal(summonerWaiting(m), false);
});

/* ------------------------------------------------------------------ hidden until owned */

test('the chain\'s battle is cast from whichever starter heroes a save owns; with none it says who it needs', () => {
  const qb = questBattleById('kennelFires')!;
  assert.deepEqual(castOf(packSave(7, 0), qb), ['archer'], 'Sword and Shield: Natsu');
  assert.deepEqual(castOf(packSave(7, 1), qb), ['wizard'], 'Blade and Spell: Ravi');
  const one = packSave(8, 1);
  one.unlocked = ['peasant'];
  assert.deepEqual(castOf(one, qb), ['peasant'], 'a stand-in takes the part');
  const none = packSave(9, 0);
  none.unlocked = ['werewolf'];
  assert.equal(partBlocked(none, askel.parts[1])?.includes('wizard'), true);
  assert.equal(partBlocked(packSave(10, 0), askel.parts[1]), null);
  assert.equal(partBlocked(packSave(10, 0), askel.parts[0]), null, 'a part with no battle is never blocked');
});

/* ------------------------------------------------------------------ determinism and saves */

test('the same fights give the same chain, and the save keeps it (junk dropped; older saves load with nothing begun)', () => {
  const play = () => {
    const m = packSave(11, 1);
    clear(m, 'orcs');
    beginChain(m, 'askel');
    noteChains(m, bossWin('orcs', 'orcWarlord'));
    return m;
  };
  assert.deepEqual(play(), play());
  // (through the page's store and back)
  const m = play();
  const map = new Map<string, string>();
  saveMeta(m, { setItem: (k, v) => void map.set(k, v) });
  const back = loadMeta(1, { getItem: (k) => map.get(k) ?? null });
  assert.deepEqual(back.quests!.chains, { askel: { part: 1, progress: 0 } });
  assert.deepEqual(back.quests!.pieces, ['emberHeart']);
  assert.equal(currentPart(back)?.index, 1);
  // (junk: chains not in the game, rails with no parts, parts out of range, a "bound" before the pieces are in, unknown pieces)
  const r = readChainState({ chains: { gone: { part: 1 }, nivra: { part: 0 }, askel: { part: 9, progress: -4, bound: true } }, pieces: ['emberHeart', 'nope', 'emberHeart', 7] });
  assert.deepEqual(r, { chains: { askel: { part: 3, progress: 0, bound: true } }, pieces: ['emberHeart'] });
  assert.deepEqual(readChainState({ chains: { askel: { part: 1, progress: 5, bound: true } } }), { chains: { askel: { part: 1, progress: 1 } } });
  // (an older save, with quest state but no chains, loads as it was)
  const s = readQuests({ active: [], offers: [], done: [] })!;
  assert.equal(s.chains, undefined);
  assert.equal(s.pieces, undefined);
  assert.equal(newMeta(1).quests, undefined);
});
