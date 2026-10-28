import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, hurt, place, startBattle, stepBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { CHARGE_MAX, rollCrit, spawnSpiritWisp, tryCast, ULT_LEVEL } from '../src/sim/abilities';
import { DUO_WINDOW_MS, HARMONIC_MS } from '../src/sim/duoCombos';
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

test('Duo-Combos: a pair fires only when both ultimates land together, harmonic when closer still', () => {
  const b = started(['knight', 'peasant']);
  assert.ok(b.duoCombos && b.duoCombos.length > 0);
  const duo = b.duoCombos.find((d) => d.id === 'knight_peasant')!;
  assert.ok(duo);

  const k = hero(b, 'knight');
  const p = hero(b, 'peasant');
  const ready = () => {
    for (const u of [k, p]) {
      u.level = ULT_LEVEL;
      u.charge2 = CHARGE_MAX;
      u.busyUntil = 0;
    }
  };
  // (bring a foe into range for the Knight's Last Bastion, reach 5)
  const foe = b.units.find((u) => u.side === 'foe')!;
  foe.u = k.u;
  foe.v = k.v - 2;
  const duoOf = (out: BattleEvent[]) => out.find((e) => e.kind === 'duoCombo') as Extract<BattleEvent, { kind: 'duoCombo' }> | undefined;

  // the Knight's ultimate alone is only the first of the pair: no duo yet
  ready();
  const out1: BattleEvent[] = [];
  assert.ok(tryCast(b, k, out1));
  assert.equal(duoOf(out1), undefined);
  assert.equal(p.shield?.hp ?? 0, 0, 'no squire shield from one ultimate');
  assert.equal(duo.triggerCount, 0);

  // the Peasant's 500ms later, within HARMONIC_MS: a Harmonic Resonance
  b.t += 500;
  const out2: BattleEvent[] = [];
  assert.ok(tryCast(b, p, out2));
  const e2 = duoOf(out2);
  assert.ok(e2);
  assert.equal(e2.harmonic, true);
  assert.ok(p.shield && p.shield.hp > 0, 'peasant receives squire shield');
  assert.ok(k.banner !== undefined && (k.power ?? 1) > 1, 'knight receives rally');
  assert.equal(duo.harmonicCount, 1);

  // the pair is spent: a third ultimate soon after starts a new pair rather than firing again
  b.t += 500;
  ready();
  const out3: BattleEvent[] = [];
  assert.ok(tryCast(b, k, out3));
  assert.equal(duoOf(out3), undefined);
  assert.equal(duo.triggerCount, 1);

  // the partner's within DUO_WINDOW_MS but past HARMONIC_MS: the plain duo
  b.t += HARMONIC_MS + 500;
  assert.ok(HARMONIC_MS + 500 <= DUO_WINDOW_MS);
  ready();
  const out4: BattleEvent[] = [];
  assert.ok(tryCast(b, p, out4));
  assert.equal(duoOf(out4)?.harmonic, false);
  assert.equal(duo.triggerCount, 2);

  // and ultimates further apart than the window never fire it
  b.t += 1000;
  ready();
  assert.ok(tryCast(b, k, []));
  b.t += DUO_WINDOW_MS + 1;
  ready();
  const out5: BattleEvent[] = [];
  assert.ok(tryCast(b, p, out5));
  assert.equal(duoOf(out5), undefined);
  assert.equal(duo.triggerCount, 2);
});

test('Archer + Lightning Mage Duo: electrified arrows chain lightning to nearby foes', () => {
  const b = started(['archer', 'lightningMage']);
  const archer = hero(b, 'archer');
  const mage = hero(b, 'lightningMage');
  for (const u of [archer, mage]) {
    u.level = ULT_LEVEL;
    u.charge2 = CHARGE_MAX;
  }
  // (two foes close to each other, within both heroes' reach)
  const foes = b.units.filter((u) => u.side === 'foe');
  assert.ok(foes.length >= 2);
  foes[0].u = archer.u; foes[0].v = archer.v - 3;
  foes[1].u = archer.u + 1; foes[1].v = archer.v - 3;

  assert.ok(tryCast(b, archer, []));
  assert.ok(!archer.electrifiedUntil, 'one ultimate alone does not set the duo off');
  b.t += 300;
  assert.ok(tryCast(b, mage, []));
  assert.ok(archer.electrifiedUntil && archer.electrifiedUntil > b.t);
});

test('Trait Milestones come at three of a trait: Tricksters slip a low blow with a decoy log, Yokai leave spirit wisps, Guardians shield', () => {
  // 1. Trickster milestone: not with two Tricksters, but with three
  assert.ok(!started(['kunoichi', 'kitsune']).traits?.tricksterLog);
  const bTr = started(['kunoichi', 'kitsune', 'karasu']);
  assert.ok(bTr.traits?.tricksterLog);
  const kunoichi = hero(bTr, 'kunoichi');
  const foe = bTr.units.find((u) => u.side === 'foe')!;
  const hurtOut: BattleEvent[] = [];
  // a skill blow (no dodge) that leaves her under 25%: she slips aside, a decoy log in her place, her health as the blow left it
  const left = Math.round(kunoichi.maxHp * 0.1);
  hurt(bTr, foe, kunoichi, kunoichi.hp - left, true, false, hurtOut, 'skill');
  assert.ok(kunoichi.alive);
  assert.equal(kunoichi.hp, left, 'no healing: a dodge, not a second life');
  assert.ok(kunoichi.tricksterLogUsed);
  assert.ok(hurtOut.some((e) => e.kind === 'decoyLog'));
  assert.ok(bTr.units.some((u) => u.def === 'decoy' && u.alive));
  // a fatal blow is fatal: the log is no revive
  const kitsune = hero(bTr, 'kitsune');
  hurt(bTr, foe, kitsune, kitsune.hp + 500, true, false, [], 'skill');
  assert.ok(!kitsune.alive && !kitsune.tricksterLogUsed);

  // 2. Yokai milestone: three Yokai; one wisp a Yokai at a time
  assert.ok(!started(['kitsune', 'karasu']).traits?.yokaiWisp);
  const bYo = started(['kitsune', 'karasu', 'gorgon']);
  assert.ok(bYo.traits?.yokaiWisp);
  const karasu = hero(bYo, 'karasu');
  const wispOut: BattleEvent[] = [];
  spawnSpiritWisp(bYo, karasu, wispOut);
  assert.ok(bYo.traps && bYo.traps.some((t) => t.wisp && t.u === karasu.u && t.v === karasu.v));
  assert.ok(wispOut.some((e) => e.kind === 'wisp'));
  karasu.u += 1;
  spawnSpiritWisp(bYo, karasu, wispOut);
  assert.equal(bYo.traps!.filter((t) => t.wisp && t.by === karasu.id).length, 1);

  // 3. Guardian milestone: three Guardians shield a hero the first time it drops below 30%
  assert.ok(!started(['knight', 'peasant']).traits?.guardianShield);
  const bGu = started(['knight', 'peasant', 'paladin']);
  assert.ok(bGu.traits?.guardianShield);
  assert.equal(bGu.traits!.guard, TRAITS.guardian.tiers[1].effects.guard);
  const knight = hero(bGu, 'knight');
  const gFoe = bGu.units.find((u) => u.side === 'foe')!;
  hurt(bGu, gFoe, knight, knight.hp - Math.round(knight.maxHp * 0.2), true, false, [], 'skill');
  assert.ok(knight.alive && knight.shield && knight.shield.hp === Math.round(knight.maxHp * 0.15));
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
