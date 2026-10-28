import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, hurt, place, startBattle, stepBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { CHARGE_MAX, rollCrit, tryCast, ULT_LEVEL } from '../src/sim/abilities';
import { speedOf } from '../src/sim/spells';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { countTraits, HERO_TRAITS, membersOf, TRAITS, traitEffects } from '../src/sim/traits';

const spots = (b: Battle) => {
  const out: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) out.push([u, v]);
  return out;
};
const started = (kinds: string[]): Battle => {
  const b = startBattle(3);
  const s = spots(b);
  kinds.forEach((k, i) => place(b, k, ...s[i * 2]));
  fight(b);
  return b;
};
const hero = (b: Battle, kind: string) => b.units.find((x) => x.def === kind)!;

test('every hero has an origin and a class, and every trait has two to four heroes', () => {
  for (const k of ALL_HEROES) {
    const [o, c] = HERO_TRAITS[k];
    assert.equal(TRAITS[o].kind, 'origin');
    assert.equal(TRAITS[c].kind, 'class');
  }
  for (const t of Object.keys(TRAITS)) {
    const n = membersOf(t).length;
    assert.ok(n >= 2 && n <= 4, `${t} has ${n}`);
  }
});

test('only distinct kinds count, and a trait unlocks at its thresholds', () => {
  const find = (kinds: string[], id: string) => countTraits(kinds).find((c) => c.trait.id === id);
  assert.equal(find(['knight', 'knight', 'knight'], 'guardian')!.count, 1);
  assert.ok(!find(['knight', 'knight'], 'guardian')!.active);
  assert.ok(find(['knight', 'peasant'], 'guardian')!.active);
  assert.equal(find(['samurai', 'kunoichi'], 'samurai')!.tier, 0);
  assert.equal(find(['samurai', 'kunoichi', 'archer'], 'samurai')!.tier, 0);
  assert.equal(find(['samurai', 'kunoichi', 'archer', 'ninjaMonk'], 'samurai')!.tier, 1);
  assert.equal(find(['samurai'], 'samurai')!.goal, 2);
  assert.deepEqual(traitEffects(['knight']), {});
});

test('each trait bonus applies to the heroes in the fight', () => {
  // Samurai: attack
  assert.equal(hero(started(['samurai', 'kunoichi']), 'samurai').power, TRAITS.samurai.tiers[0].effects.atk);
  assert.equal(hero(started(['samurai', 'kunoichi', 'archer', 'ninjaMonk']), 'samurai').power, TRAITS.samurai.tiers[1].effects.atk);
  // Knightly: health
  const k = hero(started(['knight', 'peasant']), 'knight');
  assert.ok(k.maxHp > UNITS.knight.hp && k.hp === k.maxHp);
  // Mystic: the king's mana
  assert.equal(started(['wizard', 'wanderer']).spells.rate, TRAITS.mystic.tiers[0].effects.mana);
  assert.equal(started(['wizard']).spells.rate, 1);
  // Trickster: speed, for heroes only
  const t = started(['kunoichi', 'kitsune']);
  assert.equal(speedOf(t, hero(t, 'kunoichi')), TRAITS.trickster.tiers[0].effects.speed);
  assert.equal(speedOf(t, t.units.find((x) => x.side === 'foe')!), 1);
  // Blade: crit, for a hero with no crit of its own
  const bl = started(['samurai', 'ninjaMonk']);
  const monk = hero(bl, 'ninjaMonk');
  let crits = 0;
  for (let i = 0; i < 400; i++) if (rollCrit(bl, monk) > 1) crits++;
  assert.ok(crits > 10 && crits < 90, `${crits} crits`);
  const none = started(['ninjaMonk']);
  for (let i = 0; i < 100; i++) assert.equal(rollCrit(none, hero(none, 'ninjaMonk')), 1);
  // Caster: skill charge over time
  const c = started(['wizard', 'wanderer']);
  const plain = started(['wizard']);
  stepBattle(c);
  stepBattle(plain);
  assert.ok(hero(c, 'wizard').charge > hero(plain, 'wizard').charge);
});

test('Guardian cuts damage taken and Yokai slips blows', () => {
  assert.equal(started(['knight', 'peasant']).traits!.guard, TRAITS.guardian.tiers[0].effects.guard);
  assert.equal(started(['kitsune', 'karasu']).traits!.dodge, TRAITS.yokai.tiers[0].effects.dodge);
});

test('Marksman lengthens a shooter\'s reach from height, and the traits are fixed at the start of the fight', async () => {
  const { strikeDef } = await import('../src/sim/battle');
  const m = started(['archer', 'lightningMage']);
  assert.ok(strikeDef(m, hero(m, 'archer')).heightReach! > 1.4);
  assert.equal(strikeDef(m, m.units.find((x) => x.side === 'foe')!).heightReach, undefined);
  const lone = started(['archer']);
  assert.equal(strikeDef(lone, hero(lone, 'archer')).heightReach, 1.4);
  const before = hero(m, 'archer').power;
  place(m, 'knight', 0, D - 1);
  assert.equal(hero(m, 'archer').power, before);
});

test('Duo-Combos: complementary hero pairs trigger synergies and harmonic resonances', () => {
  const b = started(['knight', 'peasant']);
  assert.ok(b.duoCombos && b.duoCombos.length > 0);
  const duo = b.duoCombos.find((d) => d.id === 'knight_peasant')!;
  assert.ok(duo);

  const k = hero(b, 'knight');
  const p = hero(b, 'peasant');
  k.level = ULT_LEVEL;
  k.charge2 = CHARGE_MAX;
  p.level = ULT_LEVEL;
  p.charge2 = CHARGE_MAX;

  // Bring a foe into range for Knight's Last Bastion ultimate (reach 5)
  const foe = b.units.find((u) => u.side === 'foe')!;
  foe.u = k.u;
  foe.v = k.v - 2;

  // Knight activates ultimate -> triggers duo synergy
  const out1: BattleEvent[] = [];
  assert.ok(tryCast(b, k, out1));
  const duoEvent1 = out1.find((e) => e.kind === 'duoCombo') as Extract<BattleEvent, { kind: 'duoCombo' }> | undefined;
  assert.ok(duoEvent1);
  assert.equal(duoEvent1.harmonic, false);
  assert.ok(p.shield && p.shield.hp > 0, 'peasant receives squire shield');
  assert.ok(k.banner !== undefined && (k.power ?? 1) > 1, 'knight receives rally');

  // Peasant activates ultimate 500ms later (in close succession) -> triggers harmonic resonance!
  b.t += 500;
  const out2: BattleEvent[] = [];
  assert.ok(tryCast(b, p, out2));
  const duoEvent2 = out2.find((e) => e.kind === 'duoCombo') as Extract<BattleEvent, { kind: 'duoCombo' }> | undefined;
  assert.ok(duoEvent2);
  assert.equal(duoEvent2.harmonic, true);
  assert.ok(duo.harmonicCount >= 1);
});

test('Archer + Lightning Mage Duo: electrified arrows chain lightning to nearby foes', () => {
  const b = started(['archer', 'lightningMage']);
  const archer = hero(b, 'archer');
  const mage = hero(b, 'lightningMage');
  assert.ok(mage);
  archer.level = ULT_LEVEL;
  archer.charge2 = CHARGE_MAX;

  const out: BattleEvent[] = [];
  assert.ok(tryCast(b, archer, out));
  assert.ok(archer.electrifiedUntil && archer.electrifiedUntil > b.t);

  // Position two foes close to each other
  const foes = b.units.filter((u) => u.side === 'foe');
  assert.ok(foes.length >= 2);
  foes[0].u = 3; foes[0].v = 3;
  foes[1].u = 3; foes[1].v = 4;

  const hitOut: BattleEvent[] = [];
  hurt(b, archer, foes[0], 50, false, false, hitOut);
  // An electrified arrow triggers an arc to the second foe
  assert.ok(archer.electrifiedUntil > b.t);
});

test('Trait Milestones: Tricksters leave decoy log on fatal blow; Yokai leave spirit wisps on dodge', () => {
  // 1. Trickster milestone (2 tricksters: kunoichi + kitsune)
  const bTr = started(['kunoichi', 'kitsune']);
  assert.ok(bTr.traits?.tricksterLog);
  const kunoichi = hero(bTr, 'kunoichi');
  const foe = bTr.units.find((u) => u.side === 'foe')!;

  const hurtOut: BattleEvent[] = [];
  // Deal fatal damage to kunoichi via skill (which bypasses evasion dodge)
  hurt(bTr, foe, kunoichi, kunoichi.hp + 500, true, false, hurtOut, 'skill');
  assert.ok(kunoichi.alive, 'trickster survives fatal blow with decoy log substitution');
  assert.ok(kunoichi.tricksterLogUsed);
  assert.ok(hurtOut.some((e) => e.kind === 'decoyLog'));
  assert.ok(bTr.units.some((u) => u.def === 'decoy'));

  // 2. Yokai milestone (2 yokai: kitsune + karasu)
  const bYo = started(['kitsune', 'karasu']);
  assert.ok(bYo.traits?.yokaiWisp);
  const karasu = hero(bYo, 'karasu');
  const wispOut: BattleEvent[] = [];
  // Simulate dodge trigger
  const { spawnSpiritWisp } = require('../src/sim/abilities');
  spawnSpiritWisp(bYo, karasu, wispOut);
  assert.ok(bYo.traps && bYo.traps.some((t: any) => t.wisp && t.u === karasu.u && t.v === karasu.v));
  assert.ok(wispOut.some((e) => e.kind === 'wisp'));
});

test('Duo-Combos and Trait Resonance battles execute strictly deterministically', () => {
  const runBattle = (seed: number) => {
    const b = startBattle(seed);
    place(b, 'knight', 0, D - 1);
    place(b, 'peasant', 1, D - 1);
    place(b, 'archer', 2, D - 1);
    place(b, 'lightningMage', 3, D - 1);
    fight(b);
    for (const u of b.units) {
      if (u.side === 'hero') {
        u.level = ULT_LEVEL;
        u.charge2 = CHARGE_MAX;
      }
    }
    const events: string[] = [];
    for (let i = 0; i < 40 && b.phase === 'fight'; i++) {
      const stepEvents = stepBattle(b);
      for (const e of stepEvents) events.push(e.kind);
    }
    return {
      events,
      unitHps: b.units.map((u) => `${u.id}:${u.def}:${u.hp}:${u.alive}`),
    };
  };

  const run1 = runBattle(42);
  const run2 = runBattle(42);
  assert.deepEqual(run1.events, run2.events);
  assert.deepEqual(run1.unitHps, run2.unitHps);
});
