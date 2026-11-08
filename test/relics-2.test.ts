// RELICS-2: the relics redone as the keep's lost artefacts (docs/notes/relics-2.md): growing relics, prices, conditions, the Storied
// relics, the Chapters, old saves converted, and the fight hooks (`relicFight.ts`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, hurt, startBattle, place, stepBattle, type Battle, type Stage } from '../src/sim/battle';
import { convertRelics, effectsOf, fightRelics, GREAT_RELIC_IDS, pickRelic, pricedFor, RELIC_BOOK, RELIC_IDS, RELIC_NOTE, relicEffects, relicName, relicPriceOf, RELICS, theRelic } from '../src/sim/relics';
import { relicBlow, relicCharge, relicDodge, relicMana, relicSpeed, relicTaken, isBeast } from '../src/sim/relicFight';
import { CHAPTER_IDS, setBonus, setCount, SETS } from '../src/sim/relicSets';
import { finish, loadRun, newRun, noteFight, saveRun, startStage } from '../src/sim/run';
import { loadStand, newStandRun, roleOfKind, saveStand, startStand, type Stand, type StandSetup } from '../src/sim/stand';
import { gradeBoost } from '../src/sim/run';
import { newCastle } from '../src/sim/castle';
import { stockMarket } from '../src/sim/market';
import { relicSuits } from '../src/sim/autoplay';
import { UNITS } from '../src/sim/units';
import { readyBattle } from './helpers';

/** A fight with these relics, its heroes placed, begun. */
const withRelics = (ids: string[], seed = 7, band?: string): Battle => {
  const { relics, atk, hp, mana } = fightRelics(relicEffects(ids));
  const stage: Stage = { relics, heroes: { hp: hp ?? 1, atk: atk ?? 1 }, mana };
  const b = readyBattle(seed, band, stage);
  fight(b);
  return b;
};
const heroes = (b: Battle) => b.units.filter((u) => u.side === 'hero' && u.alive);
const foes = (b: Battle) => b.units.filter((u) => u.side === 'foe' && u.alive);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test('every relic of the keep and every Storied relic has a story; six Chapters of four, each with its line', () => {
  for (const id of [...RELIC_IDS, ...GREAT_RELIC_IDS]) assert.ok(RELICS[id].lore, id);
  assert.equal(CHAPTER_IDS.length, 6);
  const inChapters = CHAPTER_IDS.flatMap((c) => SETS[c].relics);
  assert.deepEqual([...inChapters].sort(), [...RELIC_IDS].sort(), 'the 24 are the six chapters');
  for (const c of CHAPTER_IDS) assert.ok(SETS[c].story && SETS[c].relics.length === 4);
  // (a price is a sentence of its own, shown in red)
  for (const id of ['ironShield', 'emberRuby', 'shadowCloak', 'swiftBoots', 'gildedIngot', 'jewelCrown', 'sunCrown', 'dragonHeart', 'stormRing', 'voidLens']) assert.ok(RELICS[id].price, id);
});

test('growing relics grow with the run tally, to their most', () => {
  assert.ok(near(effectsOf('whetstone')!.atk!, 1.03));
  assert.ok(near(effectsOf('whetstone', { marks: { won: 5 } })!.atk!, 1.08));
  assert.ok(near(effectsOf('whetstone', { marks: { won: 99 } })!.atk!, 1.12));
  assert.ok(near(effectsOf('scholarScroll', { marks: { won: 10 } })!.charge!, 1.4));
  assert.ok(near(effectsOf('hawkEye', { marks: { elites: 4 } })!.crit!, 0.14));
  assert.ok(near(effectsOf('bookOfNames', { marks: { fallen: 3 } })!.atk!, 1.12));
  assert.ok(near(effectsOf('bookOfNames', { marks: { fallen: 40 } })!.atk!, 1.6));
});

test('a fight noted adds to the tally: a win, the heroes fallen, the elites felled, the Phoenix rises', () => {
  const run = newRun(5);
  const b = withRelics(['phoenix']);
  const [x, y] = heroes(b);
  const foe = foes(b)[0];
  hurt(b, foe, x, 99999, false, false, []);
  hurt(b, foe, x, 99999, false, false, []);
  hurt(b, foe, y, 99999, false, false, []);
  b.phase = 'won';
  noteFight(run, b);
  assert.deepEqual(run.relicMarks, { won: 1, fallen: 2, rises: 1 });
  noteFight(run, b);
  assert.equal(run.relicMarks!.won, 2);
});

test('the Phoenix Feather burns out to Phoenix Ash after five rises', () => {
  assert.equal(effectsOf('phoenix', { marks: { rises: 4 } })!.revive, true);
  const ash = effectsOf('phoenix', { marks: { rises: 5 } })!;
  assert.equal(ash.revive, undefined);
  assert.ok(near(ash.atk!, 1.05));
  assert.equal(relicName('phoenix', { marks: { rises: 5 } }), 'Phoenix Ash');
  const run = newRun(5);
  run.relics = ['phoenix'];
  run.relicMarks = { rises: 5 };
  assert.equal(startStage(run).relics?.revive, undefined);
});

test('the Unfinished Chronicle counts one more for every chapter begun', () => {
  const holy = SETS.holy;
  assert.equal(setCount(holy, ['banner']), 1);
  assert.equal(setCount(holy, ['banner', 'unfinishedChronicle']), 2);
  assert.equal(setCount(holy, ['unfinishedChronicle']), 0, 'a chapter not begun is not counted');
  assert.equal(setCount(holy, ['banner', 'scholarScroll', 'holyChalice', 'saintMedal', 'unfinishedChronicle']), 4, 'never past the whole');
  assert.ok(near(setBonus(['banner', 'unfinishedChronicle']).fx.hp!, 1.02));
  assert.equal(setBonus(['banner', 'scholarScroll', 'unfinishedChronicle']).hooks.regen, 0.005);
});

test('prices: the Pawned Crown takes gold from a win, never below nothing; the Tax Ingot makes the cart dearer; a Rare costs more', () => {
  const a = newRun(9);
  const b = newRun(9);
  b.relics = ['jewelCrown'];
  finish(a, true);
  finish(b, true);
  assert.equal(a.gold - b.gold, 10);
  assert.equal(pricedFor(['gildedIngot'], 100), 110);
  assert.equal(pricedFor([], 100), 100);
  const plain = newRun(3);
  const taxed = newRun(3);
  taxed.relics = ['gildedIngot'];
  const p = stockMarket(plain, 4).map((w) => w.cost);
  const q = stockMarket(taxed, 4).map((w) => w.cost);
  p.forEach((c, i) => assert.equal(q[i], Math.round(c * 1.1)));
  assert.equal(relicPriceOf('hawkEye', 100), 150);
  assert.equal(relicPriceOf('whetstone', 100), 100);
});

test('a draw picks a Rare a third as often as a Common, on one number from the stream', () => {
  const pool = ['whetstone', 'hawkEye'];
  // (weights 3 and 1: below 0.75 is the Common, above is the Rare)
  assert.equal(pickRelic(() => 0.74, pool), 'whetstone');
  assert.equal(pickRelic(() => 0.76, pool), 'hawkEye');
  let calls = 0;
  pickRelic(() => (calls++, 0.5), RELIC_IDS);
  assert.equal(calls, 1);
});

test('old saves convert: merged relics kept once and paid back, a note once, renamed names read well', () => {
  assert.deepEqual(convertRelics(['coinHoard', 'luckyCoin', 'goldBand', 'nope']), { ids: ['luckyCoin', 'gildedIngot'], refund: 70, changed: true });
  const store: Record<string, string> = {};
  const io = { setItem: (k: string, v: string) => void (store[k] = v), getItem: (k: string) => store[k] ?? null };
  const old = newRun(5);
  old.relics = ['coinHoard', 'luckyCoin', 'whetstone'];
  store['legends.run'] = JSON.stringify(old);
  const back = loadRun(io)!;
  assert.deepEqual(back.relics, ['luckyCoin', 'whetstone']);
  assert.equal(back.gold, old.gold + 70);
  assert.equal(back.relicNote, RELIC_NOTE);
  back.relicNote = undefined;
  saveRun(back, io);
  const again = loadRun(io)!;
  assert.equal(again.relicNote, undefined, 'converted once only');
  assert.deepEqual(again.relics, ['luckyCoin', 'whetstone']);
  // (a run of this version with relics is never given the note)
  const fresh = newRun(6);
  fresh.relics = ['banner'];
  saveRun(fresh, io);
  assert.equal(loadRun(io)!.relicNote, undefined);
  // (a run with no relics is converted quietly)
  store['legends.run'] = JSON.stringify(newRun(7));
  assert.equal(loadRun(io)!.relicNote, undefined);
  // (the Last Stand's save)
  const stand = newStandRun(4, ['knight', 'archer', 'wizard', 'cleric', 'samurai']);
  stand.relics = ['goldBand', 'gildedIngot'];
  stand.offer = ['coinHoard', 'banner'];
  store['legends.stand'] = JSON.stringify(stand);
  const sb = loadStand(io)!;
  assert.deepEqual(sb.relics, ['gildedIngot']);
  assert.equal(sb.gold, stand.gold + 70);
  assert.deepEqual(sb.offer, ['luckyCoin', 'banner']);
  assert.equal(sb.relicNote, RELIC_NOTE);
  saveStand(sb, io);
  assert.equal(JSON.parse(store['legends.stand']).relicBook, RELIC_BOOK);
  assert.equal(theRelic('banner'), 'the First Banner');
  assert.equal(theRelic('phoenix'), 'the Phoenix Feather');
});

test('fight start: the Ember wounds, the Ring strikes one hero (the same each time), the Cup gives mana, the Crown and the Eye raise the foes', () => {
  const plain = withRelics([]);
  const ember = withRelics(['emberRuby']);
  heroes(ember).forEach((x, i) => assert.equal(x.hp, Math.max(1, Math.round(heroes(plain)[i].maxHp * 0.92))));
  const ring = withRelics(['stormRing']);
  const hurtOnes = heroes(ring).filter((x) => x.hp < x.maxHp);
  assert.equal(hurtOnes.length, 1);
  assert.equal(hurtOnes[0].hp, Math.round(hurtOnes[0].maxHp * 0.85));
  assert.equal(heroes(withRelics(['stormRing'])).findIndex((x) => x.hp < x.maxHp), heroes(ring).indexOf(hurtOnes[0]), 'the same hero from the same seed');
  assert.equal(withRelics(['holyChalice']).spells.mana, plain.spells.mana + 2);
  const crown = withRelics(['sunCrown']);
  const top = (b: Battle) => Math.max(...foes(b).map((f) => f.maxHp));
  assert.equal(top(crown), Math.round(top(plain) * 1.12));
  const eye = withRelics(['voidLens']);
  foes(eye).forEach((f, i) => assert.equal(f.maxHp, Math.round(foes(plain)[i].maxHp * 1.06)));
});

test("the Sentry's Cloak gives the back row more hp", () => {
  const make = (ids: string[]) => {
    const { relics, hp } = fightRelics(relicEffects(ids));
    const b = startBattle(7, undefined, { relics, heroes: { hp: hp ?? 1, atk: 1 } });
    place(b, 'knight', 3, b.board.d - 1);
    place(b, 'archer', 5, b.board.d - 3);
    fight(b);
    return b;
  };
  const plain = make([]);
  const cloak = make(['winterCloak']);
  const [back, front] = heroes(cloak);
  assert.equal(back.maxHp, Math.round(Math.round(heroes(plain)[0].maxHp * 1.05) * 1.067));
  assert.equal(front.maxHp, Math.round(heroes(plain)[1].maxHp * 1.05));
});

test('blows: the First Banner until a hero falls, beasts for the Necklace, a crit on the wounded for the Fang, a shot from above for the Glass', () => {
  const b = withRelics(['banner', 'wolfFang', 'viperFang', 'spyglass']);
  const [x, y] = heroes(b);
  const foe = foes(b)[0];
  const shot = UNITS[x.def].shot ? 1.1 : 1;
  assert.ok(near(relicBlow(b, x, foe, 1, false), 1.1 * (isBeast(foe.def) ? 1.15 : 1) * shot));
  foe.hp = Math.floor(foe.maxHp / 3);
  assert.ok(near(relicBlow(b, x, foe, 1.5, true), 1.1 * (isBeast(foe.def) ? 1.15 : 1) * 1.6 * shot * 1.09));
  hurt(b, foe, y, 99999, false, false, []);
  assert.ok(near(relicBlow(b, x, foe, 1, false), (isBeast(foe.def) ? 1.15 : 1) * shot), 'a hero has fallen: the Banner is down');
  assert.equal(relicBlow(b, foe, x, 1.5, true), 1, "a foe's blow is its own");
  assert.ok(isBeast('wolfBlack') && isBeast('packRed') && !isBeast('skeleton'));
});

test("the Warden's Medal: the last hero standing heals and takes less", () => {
  const b = withRelics(['saintMedal']);
  const hs = heroes(b);
  const foe = foes(b)[0];
  const last = hs[hs.length - 1];
  last.hp = Math.round(last.maxHp * 0.2);
  const out: never[] = [];
  for (const x of hs.slice(0, -1)) hurt(b, foe, x, 99999, false, false, out);
  assert.equal(b.lastStood, last.id);
  assert.equal(last.hp, Math.round(last.maxHp * 0.2) + Math.round(last.maxHp * 0.6));
  assert.ok(near(relicTaken(b, last, foe), 0.6));
});

test('the Harness quickens the rest after a fall, three at most; the Charm and the Hourglass work early; the Sapphire at full health; the Scale against bosses', () => {
  const b = withRelics(['beastHarness', 'featherCharm', 'hourglass', 'frostSapphire', 'dragonScale']);
  const hs = heroes(b);
  const foe = foes(b)[0];
  assert.equal(relicSpeed(b, hs[0]), 1);
  for (const x of hs.slice(1, 5)) hurt(b, foe, x, 99999, false, false, []);
  assert.ok(near(relicSpeed(b, hs[0]), 1 + 0.25 * 3));
  assert.ok(near(relicDodge(b, hs[0]), 0.15));
  assert.equal(relicMana(b), 2);
  assert.ok(near(relicCharge(b, hs[0]), hs[0].hp > hs[0].maxHp * 0.5 ? 1.2 : 1));
  hs[0].hp = Math.floor(hs[0].maxHp * 0.5);
  assert.equal(relicCharge(b, hs[0]), 1);
  // (eleven seconds on: past the Charm's eight, the Hourglass's ten and the Harness's eight)
  b.t += 11000;
  assert.equal(relicDodge(b, hs[0]), 0);
  assert.equal(relicMana(b), 1);
  assert.equal(relicSpeed(b, hs[0]), 1, 'the haste wears off');
  const boss = { ...foe, def: 'orcWarlord' };
  assert.ok(near(relicTaken(b, hs[0], boss), 1 - 0.031));
  assert.equal(relicTaken(b, hs[0], foe), 1);
});

test('the same relics play out the same; a fight with none is as it was', () => {
  const run = (ids: string[]) => {
    const b = withRelics(ids, 11);
    for (let i = 0; i < 600 && b.phase === 'fight'; i++) stepBattle(b);
    return JSON.stringify(b.units.map((u) => [u.hp, u.alive]));
  };
  const all = ['banner', 'emberRuby', 'stormRing', 'beastHarness', 'saintMedal', 'featherCharm', 'wolfFang'];
  assert.equal(run(all), run(all));
  assert.equal(run([]), run([]));
  assert.equal(startStage(newRun(9)).relics, undefined);
});

test('Auto leaves a price it cannot pay well', () => {
  const run = newRun(5);
  run.gold = 10;
  assert.equal(relicSuits(run, 'jewelCrown'), false);
  run.gold = 100;
  assert.equal(relicSuits(run, 'jewelCrown'), true);
  assert.equal(relicSuits(run, 'whetstone'), true);
});

test("the Sentry's Cloak in the Last Stand: the inner ring by the king (shooters and healers) counts as the back row, bought or loaded", () => {
  const EIGHT = ['knight', 'paladin', 'samurai', 'kunoichi', 'archer', 'ranger', 'wizard', 'cleric'];
  const setup: StandSetup = { boost: () => gradeBoost(1, 0, 20), castle: newCastle() };
  const hpOf = (s: Stand, kind: string) => s.b.units.find((u) => u.side === 'hero' && u.def === kind)!.maxHp;
  const plain = startStand(newStandRun(5, EIGHT), setup);
  const run = newStandRun(5, EIGHT);
  run.relics = ['winterCloak'];
  const cloak = startStand(run, setup);
  assert.equal(roleOfKind('archer'), 'inner');
  assert.equal(roleOfKind('knight'), 'tank');
  assert.ok(Math.abs(hpOf(cloak, 'archer') / hpOf(plain, 'archer') - 1.05 * 1.067) < 0.01, 'the inner ring: +12%');
  assert.ok(Math.abs(hpOf(cloak, 'knight') / hpOf(plain, 'knight') - 1.05) < 0.01, 'the rest: +5%');
});
