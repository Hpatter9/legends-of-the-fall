// RELICS-3: the Eidolons' reliquaries (docs/notes/relics-3.md): eighteen relics in six reliquaries of three, found only in the Calamity;
// two of one give a small bonus, all three the bound echo (the War Horn fills 25% faster and that Eidolon's rider lasts half as long again).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterBlow } from '../src/sim/abilities';
import { addUnit, fight, hurt, stepBattle, type Battle, type BattleEvent, type Stage } from '../src/sim/battle';
import { armEidolon, RIDER } from '../src/sim/eidolons';
import { orderEidolon } from '../src/sim/orders';
import { convertRelics, fightRelics, GREAT_RELIC_IDS, RELIC_BOOK, RELIC_IDS, RELIC_NOTE, relicEffects, RELICS, pickRelic } from '../src/sim/relics';
import { relicBlow, relicStart, relicCharge, relicDodge, relicEcho, relicFoeSlow, relicSkill, relicStruck, relicTaken } from '../src/sim/relicFight';
import { ECHO_FILL, echoOn, hornEcho, SET_IDS, setBonus, SETS } from '../src/sim/relicSets';
import { EIDOLON_IDS } from '../src/sim/eidolons';
import { loadRun, newRun, saveRun } from '../src/sim/run';
import { bareBoard } from './bare';
import { readyBattle } from './helpers';
import { startBattle } from '../src/sim/battle';

const EIDOLON_SETS = SET_IDS.filter((id) => SETS[id].eidolon);
const withRelics = (ids: string[], seed = 7): Battle => {
  const { relics, atk, hp, mana } = fightRelics(relicEffects(ids));
  const stage: Stage = { relics, heroes: { hp: hp ?? 1, atk: atk ?? 1 }, mana };
  const b = readyBattle(seed, undefined, stage);
  fight(b);
  return b;
};
const heroes = (b: Battle) => b.units.filter((u) => u.side === 'hero' && u.alive);
const foes = (b: Battle) => b.units.filter((u) => u.side === 'foe' && u.alive);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test('six reliquaries of three, one for each Eidolon, every relic with lore and a rule, found only in the Calamity', () => {
  assert.deepEqual(EIDOLON_SETS.map((id) => SETS[id].eidolon).sort(), [...EIDOLON_IDS].sort());
  const all = EIDOLON_SETS.flatMap((id) => SETS[id].relics);
  assert.equal(all.length, 18);
  for (const id of EIDOLON_SETS) assert.equal(SETS[id].relics.length, 3);
  for (const id of all) {
    const r = RELICS[id];
    assert.equal(r.rarity, 'eidolon', id);
    assert.ok(r.lore && r.text, `${id}: lore and a rule`);
    assert.ok(!RELIC_IDS.includes(id) && !GREAT_RELIC_IDS.includes(id), `${id}: not in the ordinary pool (the road, the market, the Last Stand)`);
  }
  assert.equal(RELIC_IDS.length, 24);
});

test('two of a reliquary give a small bonus; all three give the bound echo, and the Unfinished Chronicle counts one more', () => {
  const small: Record<string, object> = { askel: { atk: 1.03 }, nivra: { guard: 0.03 }, aurelan: { hp: 1.03 }, voltara: { speed: 1.03 }, gorm: { hp: 1.03 }, vaelkhar: { first: 300 } };
  for (const id of EIDOLON_SETS) {
    const [a, b, c] = SETS[id].relics;
    assert.deepEqual(setBonus([a]), { fx: {}, hooks: {} });
    assert.deepEqual(setBonus([a, b]).fx, small[id], id);
    assert.equal(setBonus([a, b]).hooks.echo, undefined);
    assert.deepEqual(setBonus([a, b, c]).hooks.echo, [SETS[id].eidolon]);
    assert.ok(echoOn([a, b, c], SETS[id].eidolon));
    assert.ok(!echoOn([a, b], SETS[id].eidolon));
    assert.ok(echoOn([a, b, 'unfinishedChronicle'], SETS[id].eidolon), 'two and the Chronicle');
    assert.ok(!echoOn([a, b, c], 'askel') || id === 'askel', 'only its own Eidolon');
  }
});

test('the bound echo: the horn fills 25% faster only for the chosen Eidolon of a whole reliquary', () => {
  const askel = SETS.askel.relics;
  assert.equal(hornEcho(askel, 'askel'), ECHO_FILL);
  assert.equal(ECHO_FILL, 1.25);
  assert.equal(hornEcho(askel, 'nivra'), 1, "another Eidolon's horn is not helped");
  assert.equal(hornEcho(askel.slice(0, 2), 'askel'), 1);
  assert.equal(hornEcho(undefined, 'askel'), 1);
  assert.equal(hornEcho(askel, undefined), 1);
});

test("the bound echo: the Eidolon's rider lasts half as long again, for the bound one only", () => {
  // (Askel's burn: the zones last 6 s, 9 s with the echo)
  const burn = (relics: readonly string[]) => {
    const b = startBattle(3);
    bareBoard(b);
    b.units = [];
    b.phase = 'fight';
    b.kits = {};
    const { relics: r } = fightRelics(relicEffects(relics));
    b.relics = r;
    addUnit(b, 'knight', 3, 9);
    addUnit(b, 'lichKing', 3, 1, { hp: 400 });
    armEidolon(b, 'askel');
    orderEidolon(b, 'askel');
    const ev: BattleEvent[] = stepBattle(b);
    return ev.filter((e) => e.kind === 'zone').map((e) => (e as { ms: number }).ms)[0];
  };
  assert.equal(burn([]), RIDER.BURN_MS);
  assert.equal(burn(SETS.askel.relics), RIDER.BURN_MS * 1.5);
  assert.equal(burn(SETS.nivra.relics), RIDER.BURN_MS, "another Eidolon's reliquary");
  assert.equal(burn(SETS.askel.relics.slice(0, 2)), RIDER.BURN_MS, 'two are not the echo');
});

test('Cinder Collar: +14% attack, heroes heal 20% less', () => {
  const b = withRelics(['cinderCollar']);
  const plain = withRelics([]);
  heroes(b).forEach((x) => {
    assert.ok(near(x.healMult ?? 1, 0.8));
    assert.equal(plain.units.find((u) => u.id === x.id)!.healMult, undefined);
  });
  assert.equal(relicEffects(['cinderCollar']).atk, 1.14);
  assert.ok(RELICS.cinderCollar.price);
});

test("Hound's Ash-Tooth: each kill gives that hero +4% attack, to +20%, for the fight", () => {
  const b = withRelics(['ashTooth']);
  const [x, y] = heroes(b);
  const target = foes(b)[0];
  assert.equal(relicBlow(b, x, target, 1, false), 1);
  for (let k = 1; k <= 7; k++) {
    const foe = addUnit(b, 'skeleton', 0, 0);
    hurt(b, x, foe, 99999, false, false, []);
    assert.ok(near(relicBlow(b, x, target, 1, false), 1 + Math.min(0.2, 0.04 * k)), `after ${k} kills`);
  }
  assert.equal(relicBlow(b, y, target, 1, false), 1, "another hero's blows are its own");
  relicStart(b);
  assert.equal(relicBlow(b, x, target, 1, false), 1, 'a new fight begins the count again');
});

test('Ember Brand: crits leave the foe burning, plain blows do not', () => {
  const b = withRelics(['emberBrand']);
  const x = heroes(b)[0];
  const foe = foes(b)[0];
  assert.equal(relicEffects(['emberBrand']).crit, 0.08);
  afterBlow(b, x, foe, false, 10, []);
  assert.ok(!foe.ail?.some((a) => a.kind === 'burn'), 'a plain blow leaves nothing');
  afterBlow(b, x, foe, true, 10, []);
  assert.ok(foe.ail?.some((a) => a.kind === 'burn'), 'a crit burns');
});

test('Rime Pearl: a foe that strikes a hero is slowed 5% for 2 seconds', () => {
  const b = withRelics(['rimePearl']);
  const foe = foes(b)[0];
  assert.equal(relicFoeSlow(b, foe), 1);
  relicStruck(b, foe);
  assert.ok(near(relicFoeSlow(b, foe), 0.95));
  b.t += 2100;
  assert.equal(relicFoeSlow(b, foe), 1);
  assert.equal(relicFoeSlow(withRelics([]), foe), 1);
});

test("Wyrm's Breath Vial: the first skill each fight freezes the foe it struck for a second, once", () => {
  const b = withRelics(['wyrmVial']);
  const x = heroes(b)[0];
  const [f1, f2] = foes(b);
  assert.ok(near(relicCharge(b, x), 1));
  assert.equal(relicEffects(['wyrmVial']).charge, 1.1);
  const hit = (to: number): BattleEvent => ({ kind: 'hit', by: x.id, to, dmg: 5, heavy: false, splash: false, killed: false, src: 'skill' });
  relicSkill(b, x, [hit(f1.id)], 0);
  assert.ok((f1.stunUntil ?? 0) >= b.t + 1000, 'frozen');
  assert.ok(b.relicFroze);
  relicSkill(b, x, [hit(f2.id)], 0);
  assert.ok((f2.stunUntil ?? 0) <= b.t, 'the second skill does not');
});

test('Glacier Step: heroes slip 2% of blows, 6% while they stand still', () => {
  const b = withRelics(['glacierStep']);
  const x = heroes(b)[0];
  assert.equal(relicEffects(['glacierStep']).dodge, 0.02);
  assert.ok(near(relicDodge(b, x), 0.04), 'standing: 4% more on the 2%');
  x.step = { u: 0, v: 0, h: 0, at: b.t, ms: 100 };
  assert.equal(relicDodge(b, x), 0, 'walking');
});

test('Mane-Gold Thread: the first hero to drop under a quarter health heals 25%, once a fight', () => {
  const b = withRelics(['maneThread']);
  const [x, y] = heroes(b);
  const foe = foes(b)[0];
  const out: BattleEvent[] = [];
  x.hp = Math.round(x.maxHp * 0.27);
  y.hp = Math.round(y.maxHp * 0.27);
  hurt(b, foe, x, Math.round(x.maxHp * 0.1), false, false, out);
  assert.ok(x.hp > x.maxHp * 0.3 && x.hp < x.maxHp * 0.5, `rescued to ${x.hp}/${x.maxHp}`);
  assert.ok(out.some((e) => e.kind === 'relic' && e.id === 'maneThread'));
  assert.ok(b.relicRescued);
  const before = y.hp;
  hurt(b, foe, y, Math.round(y.maxHp * 0.1), false, false, []);
  assert.ok(y.hp < before, 'no second rescue: it stays low');
  assert.ok(y.hp < y.maxHp * 0.25);
  assert.equal(relicEffects(['maneThread']).hp, 1.06);
});

test("Lion's Oath-Ring: heroes heal 2% whenever a foe falls", () => {
  const b = withRelics(['oathRing']);
  const hs = heroes(b);
  for (const h of hs) h.hp = Math.round(h.maxHp * 0.5);
  const foe = foes(b)[0];
  hurt(b, hs[0], foe, 99999, false, false, []);
  assert.equal(foe.alive, false);
  for (const h of hs) assert.equal(h.hp, Math.round(h.maxHp * 0.5) + Math.round(h.maxHp * 0.02), 'each hero');
});

test('The Dawn Chart, Thunder Horn, Copper Torc, Granite Heart, Doom Helm: plain numbers', () => {
  assert.equal(relicEffects(['dawnChart']).mana, 1.25);
  assert.equal(relicEffects(['thunderHorn']).speed, 1.06);
  const torc = relicEffects(['copperTorc']);
  assert.deepEqual([torc.charge, torc.hp], [1.2, 0.98]);
  assert.ok(RELICS.copperTorc.price);
  const heart = relicEffects(['graniteHeart']);
  assert.deepEqual([heart.hp, heart.speed], [1.1, 0.97]);
  const helm = relicEffects(['doomHelm']);
  assert.deepEqual([helm.guard, helm.first], [0.06, 500]);
});

test('Tempest Ring: every sixth blow strikes a second foe nearby', () => {
  const b = withRelics(['tempestRing']);
  const x = heroes(b)[0];
  const [first] = foes(b);
  const others = () => foes(b).filter((f) => f !== first).reduce((n, f) => n + f.hp, 0);
  const was = others();
  assert.ok(was > 0 && foes(b).some((f) => f !== first && Math.abs(f.u - first.u) + Math.abs(f.v - first.v) <= 2), 'a foe is near');
  for (let i = 0; i < 5; i++) relicEcho(b, x, first, 20, []);
  assert.equal(others(), was, 'five blows: nothing');
  const out: BattleEvent[] = [];
  relicEcho(b, x, first, 20, out);
  assert.ok(others() < was, 'the sixth');
  assert.ok(out.some((e) => e.kind === 'arc'));
  assert.equal(relicEffects(['tempestRing']).crit, 0.06);
});

test('Quarry Gauntlet: 5% less damage, 10% for heroes who have not moved this fight', () => {
  const b = withRelics(['quarryGauntlet']);
  const x = heroes(b)[0];
  const foe = foes(b)[0];
  assert.equal(relicEffects(['quarryGauntlet']).guard, 0.05);
  assert.ok(near(relicTaken(b, x, foe), 0.95), 'still: 5% more on the 5%');
  x.u += 1;
  assert.equal(relicTaken(b, x, foe), 1, 'moved');
});

test('Moss Bell: heroes heal 0.7% of their health a second', () => {
  const b = withRelics(['mossBell']);
  const x = heroes(b)[0];
  x.hp = Math.round(x.maxHp / 2);
  const at = x.hp;
  for (let i = 0; i < 40 && x.alive; i++) stepBattle(b);
  assert.ok(x.hp !== at);
  assert.ok(b.relics?.hooks?.regen === 0.007);
});

test('Void Shard: +12% against the Calamity\'s guardians only; the Sigil quickens ultimates too', () => {
  const b = withRelics(['voidShard', 'dragonSigil']);
  const x = heroes(b)[0];
  const guardian = addUnit(b, 'calBoss1', 4, 0);
  assert.ok(near(relicBlow(b, x, guardian, 1, false), 1.12));
  assert.equal(relicBlow(b, x, foes(b)[0], 1, false), 1);
  const plain = withRelics([]);
  assert.equal(heroes(plain)[0].ultPace, undefined);
  assert.ok(near(x.ultPace ?? 1, 1.15));
  assert.equal(relicEffects(['dragonSigil']).charge, 1.15);
});

test('old Calamity relics convert to the Eidolons\', merged pairs paid back, and a run is only told once', () => {
  assert.deepEqual(convertRelics(['bloodVial', 'rubyLocket', 'mossAmulet', 'earthenBell', 'starChart', 'whetstone']), { ids: ['cinderCollar', 'mossBell', 'dawnChart', 'whetstone'], refund: 140, changed: true });
  for (const old of ['thunderHorn', 'cloudTreads', 'thunderPendant', 'tempestRing', 'graniteHeart', 'stoneGauntlet', 'bloodstoneRing', 'reaverHelm', 'cometShard', 'moonLantern', 'astralCirclet', 'riftShard', 'voidSigil', 'doomHelm', 'lastLight'])
    assert.ok(convertRelics([old]).ids.length === 1 && RELICS[convertRelics([old]).ids[0]], `${old} has a home`);
  const store: Record<string, string> = {};
  const io = { setItem: (k: string, v: string) => void (store[k] = v), getItem: (k: string) => store[k] ?? null };
  // (a run saved in the second catalogue, holding old Calamity pieces: converted, and told)
  const mid = newRun(5);
  mid.relics = ['bloodVial', 'rubyLocket', 'banner'];
  mid.relicBook = 2;
  store['legends.run'] = JSON.stringify(mid);
  const back = loadRun(io)!;
  assert.deepEqual(back.relics, ['cinderCollar', 'banner']);
  assert.equal(back.gold, mid.gold + 70);
  assert.equal(back.relicNote, RELIC_NOTE);
  assert.equal(back.relicBook, RELIC_BOOK);
  // (a second-catalogue run with nothing to change is moved on without a word)
  const calm = newRun(6);
  calm.relics = ['banner', 'whetstone'];
  calm.relicBook = 2;
  store['legends.run'] = JSON.stringify(calm);
  const quiet = loadRun(io)!;
  assert.equal(quiet.relicNote, undefined);
  assert.equal(quiet.relicBook, RELIC_BOOK);
  saveRun(quiet, io);
  assert.deepEqual(loadRun(io)!.relics, ['banner', 'whetstone']);
});

test('the draw weights an Eidolon relic like a common one', () => {
  const pool = ['cinderCollar', 'phoenix'];
  let eid = 0;
  for (let i = 0; i < 400; i++) if (pickRelic(() => (i + 0.5) / 400, pool) === 'cinderCollar') eid++;
  assert.equal(eid, 300, 'three to one against a Rare');
});
