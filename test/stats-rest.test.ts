import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, canStrike, fight, flankStep, flankValue, FLANK_BACK, FLANK_SIDE, KITE_MS, kiteStep, place, startBattle, stepBattle, strikeDef, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { blastSave, CHARGE_MAX, ultimateOf } from '../src/sim/abilities';
import { acAgainst } from '../src/sim/blow';
import { TALL_AC } from '../src/sim/board';
import { addRes, cdOf, fillOf, HERO_KITS, poolNumbers, RES, resMax, resOf, startPool, tickPool, topOf } from '../src/sim/heroKits';
import { gradeBoost } from '../src/sim/run';
import { DEX_SAVES, saveAware, saveFit, saveStatsOf, SAVES } from '../src/sim/saves';
import { CLASS_RANGE } from '../src/sim/skillRules';
import { derivedOf, JOINT, PER_POINT, STAT_PROFILES } from '../src/sim/stats';
import { athleticsOf, cooldownOf, heraldOf, perceptionOf, REST, ultFillOf } from '../src/sim/statRest';
import { UNITS } from '../src/sim/units';
import { kitStrike } from '../src/sim/kits/effects';

// STATS batch 6, "The rest" (docs/notes/stats-6.md; the design is docs/notes/rpg-stats-design.md, sections 3.1, 6 and 7): pools by score,
// INT's cooldowns, CHA's ultimate fill and the Eidolons' herald, WIS's perception, STR's Athletics, the AI's flank, kite and weakest-save
// picks, and the DEX saves of the Wall of Fire and the breaths. Each rule's own test; the hero-kit and skill-rule tests stage the written
// numbers with these held off.

/** A fight on bare level ground with heroes (kind and level) and foes, placed, not yet begun. */
function field(heroes: [string, number][], foes: string[] = ['skeleton']): { b: Battle; hs: Unit[]; fs: Unit[] } {
  const b = bareBoard(startBattle(41, foes));
  heroes.forEach(([k, level], i) => place(b, k, 1 + 2 * i, b.board.d - 1, undefined, gradeBoost(1, 0, level)));
  return { b, hs: b.units.filter((u) => u.side === 'hero'), fs: b.units.filter((u) => u.side === 'foe') };
}
/** An empty arena on bare ground, fighting. */
function arena(seed = 3): Battle {
  const b = bareBoard(startBattle(seed));
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}
const hero = (b: Battle, kind: string, u: number, v: number, level = 1): Unit => addUnit(b, kind, u, v, level > 1 ? { level } : {});

// ---- Pools by score ----

test('pools by score: a CON 17 stamina hero has a deeper pool that fills faster than a CON 12 one, each counted from +0 (the joint rebalance)', () => {
  const b = arena();
  const knight = hero(b, 'knight', 1, 1);
  const kunoichi = hero(b, 'kunoichi', 3, 1);
  assert.equal(HERO_KITS().knight.pool, 'stamina');
  assert.equal(HERO_KITS().kunoichi.pool, 'stamina');
  // (counted from +0 since the joint rebalance: CON +3 is 9 SP over the written 60, CON +1 is 3 over; batch 6 counted from the roster's mean)
  assert.ok(Math.abs(topOf(knight) - RES.STAM_MAX - 3 * PER_POINT.STAM_TOP) < 1e-9, `${topOf(knight)}`);
  assert.ok(Math.abs(topOf(kunoichi) - RES.STAM_MAX - PER_POINT.STAM_TOP) < 1e-9, `${topOf(kunoichi)}`);
  // (3 SP a point of CON between them: CON 17 is +3, CON 12 +1)
  assert.ok(Math.abs(topOf(knight) - topOf(kunoichi) - 2 * PER_POINT.STAM_TOP) < 1e-9);
  assert.ok(Math.abs(fillOf(knight) - (1 + 3 * PER_POINT.REFILL)) < 1e-9 && Math.abs(fillOf(kunoichi) - (1 + PER_POINT.REFILL)) < 1e-9);
  assert.ok(Math.abs(fillOf(knight) / fillOf(kunoichi) - (1 + 3 * PER_POINT.REFILL) / (1 + PER_POINT.REFILL)) < 1e-9);
  // (a hero's pool grows with its CON by level: the roster's mean is above the written pool, more so at 60 than at 1)
  const stam = Object.keys(HERO_KITS()).filter((k) => STAT_PROFILES[k] && HERO_KITS()[k].pool === 'stamina');
  const mean = (level: number) => stam.reduce((n, k) => n + poolNumbers(k, { level })!.top, 0) / stam.length;
  assert.ok(RES.STAM_MAX < mean(1) && mean(1) < mean(20) && mean(20) < mean(60), `${mean(1)} ${mean(20)} ${mean(60)}`);
  // (with the switch off, batch 6's rule: the roster's mean is the written pool at every level)
  JOINT.pools = false;
  try {
    for (const level of [1, 20, 60]) assert.ok(Math.abs(mean(level) - RES.STAM_MAX) < 1e-9, `level ${level}: ${mean(level)}`);
  } finally {
    JOINT.pools = true;
  }
});

test("pools by score: a mana hero's pool follows its casting ability, and its points, its start and its refill read its own top", () => {
  const b = arena();
  const wizard = hero(b, 'wizard', 1, 1);
  assert.equal(HERO_KITS().wizard.pool, 'mana');
  const n = poolNumbers('wizard')!;
  assert.equal(topOf(wizard), n.top);
  // (INT 17 is +3; the Satyr casts with CHA 17, +3 too: the same top; the Druid with WIS 17 as well)
  assert.equal(poolNumbers('satyr')!.top, n.top);
  const mana = Object.keys(HERO_KITS()).filter((k) => STAT_PROFILES[k] && HERO_KITS()[k].pool === 'mana');
  assert.equal(n.top, RES.MANA_MAX + 3 * PER_POINT.MANA_TOP, 'INT +3 is 15 MP over the written 100');
  assert.ok(mana.reduce((x, k) => x + poolNumbers(k)!.top, 0) / mana.length > RES.MANA_MAX, 'the mean mana hero has more than 100');
  startPool(wizard);
  assert.ok(Math.abs(resOf(wizard) - RES.MANA_START) < 1e-9, 'a fight starts with the written points');
  addRes(wizard, 10);
  assert.ok(Math.abs(resOf(wizard) - RES.MANA_START - 10) < 1e-9);
  wizard.charge = CHARGE_MAX;
  assert.ok(Math.abs(resOf(wizard) - topOf(wizard)) < 1e-9, 'full is its own top');
  // (its refill a tick is the written one times its fill)
  wizard.charge = 0;
  REST.pools = false;
  const plain = hero(b, 'wizard', 5, 1);
  REST.pools = true;
  plain.charge = 0;
  tickPool(b, wizard, 1000);
  tickPool(b, plain, 1000);
  assert.ok(Math.abs(resOf(wizard) / resOf(plain) - fillOf(wizard)) < 1e-6);
  assert.equal(resMax('mana'), RES.MANA_MAX, 'the written size is unchanged');
});

// ---- INT's quick wits ----

test("INT's cooldowns: an INT 17 Wizard's skills come round sooner than an INT 8 Peasant's, at most 10% from the written, never out of the class", () => {
  const b = arena();
  const wizard = hero(b, 'wizard', 1, 1, 20);
  const peasant = hero(b, 'peasant', 3, 1, 20);
  assert.ok(cooldownOf(wizard) < 1 && cooldownOf(peasant) > 1, `${cooldownOf(wizard)} ${cooldownOf(peasant)}`);
  // (INT +5 is the 10% cap; counted from +0 since the joint rebalance, so the Wizard's are 10% under the written and the Peasant's 2% over)
  assert.ok(Math.abs(cooldownOf(wizard) - 0.9) < 1e-9 && Math.abs(cooldownOf(peasant) - 1.02) < 1e-9, `${cooldownOf(wizard)} ${cooldownOf(peasant)}`);
  for (const [u, k] of [[wizard, 'wizard'], [peasant, 'peasant']] as const)
    for (const s of HERO_KITS()[k].slots) {
      const cd = cdOf(u, s);
      const [lo, hi] = CLASS_RANGE[s.cls].cd;
      assert.ok(cd >= Math.min(lo, s.cd) && cd <= Math.max(hi, s.cd), `${k} ${s.skill.name}: ${cd}`);
    }
  const s1 = HERO_KITS().wizard.s1;
  assert.ok(cdOf(wizard, s1) < s1.cd);
  // (a foe has none)
  const foe = addUnit(b, 'skeleton', 5, 5);
  assert.equal(cooldownOf(foe), 1);
});

// ---- CHA's inspiration and the herald ----

test("CHA's inspiration: a CHA 17 Paladin's ultimate fills faster than a CHA 8 Samurai's, counted from +0 (the joint rebalance)", () => {
  const b = arena();
  const paladin = hero(b, 'paladin', 1, 1, 30);
  const samurai = hero(b, 'samurai', 3, 1, 30);
  assert.ok(ultimateOf(paladin) && ultimateOf(samurai));
  assert.ok(ultFillOf(paladin) > 1 && ultFillOf(samurai) < 1);
  assert.ok(Math.abs(derivedOf(STAT_PROFILES.paladin, { level: 30 }).ultFill - ultFillOf(paladin)) < 1e-9);
  // (a second's time share on the meter, against the same hero with the rule off: each kit's own rate stays)
  const plain = hero(b, 'paladin', 5, 1, 30);
  paladin.charge2 = 0;
  plain.charge2 = 0;
  tickPool(b, paladin, 1000);
  REST.ultFill = false;
  tickPool(b, plain, 1000);
  REST.ultFill = true;
  assert.ok(Math.abs(paladin.charge2! / plain.charge2! - ultFillOf(paladin)) < 1e-9, `${paladin.charge2} ${plain.charge2}`);
});

test("the herald: an Eidolon's rider lasts 5% longer a point of the highest CHA modifier among the living heroes", () => {
  const b = arena();
  const samurai = hero(b, 'samurai', 1, 1);
  assert.equal(heraldOf(b.units), 1 - 0.05, 'CHA 8 is −1');
  const paladin = hero(b, 'paladin', 3, 1);
  assert.equal(heraldOf(b.units), 1 + 0.05 * 3, 'CHA 17 is +3');
  paladin.alive = false;
  assert.equal(heraldOf(b.units), 0.95, 'a fallen herald blows no horn');
  void samurai;
  assert.equal(heraldOf([addUnit(b, 'skeleton', 5, 5)]), 1, 'no hero, no herald');
});

// ---- WIS's perception ----

test("WIS's perception: a WIS 17 Druid sees through 30% of tall grass's cover, a WIS 8 Satyr is fooled 10% more; a foe sees as before", () => {
  const b = arena();
  const druid = hero(b, 'druid', 1, 1);
  const satyr = hero(b, 'satyr', 3, 1);
  const knight = hero(b, 'knight', 5, 1);
  const foe = addUnit(b, 'skeleton', 3, 5);
  assert.ok(Math.abs(perceptionOf(druid) - 0.3) < 1e-9);
  assert.ok(Math.abs(perceptionOf(satyr) + 0.1) < 1e-9);
  assert.equal(perceptionOf(foe), 0);
  assert.ok(Math.abs(acAgainst(b, foe, 0, 0, true, druid).cover - TALL_AC * 0.7) < 1e-9);
  assert.ok(Math.abs(acAgainst(b, foe, 0, 0, true, satyr).cover - TALL_AC * 1.1) < 1e-9);
  assert.equal(acAgainst(b, knight, 0, 0, true, foe).cover, TALL_AC);
  assert.equal(acAgainst(b, foe, 0, 0, false, druid).cover, 0, 'no grass, nothing to see through');
});

test("WIS's perception: a striker in the Kunoichi's smoke misses fewer of its blows the wiser it is", () => {
  // (the smoke's half: over many blows from the same striker, a WIS 17 hero in smoke misses about 35%, a foe about half)
  const misses = (kind: string, side: 'hero' | 'foe'): number => {
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const b = arena(100 + i);
      const by = side === 'hero' ? hero(b, kind, 3, 3) : addUnit(b, kind, 3, 3);
      const to = side === 'hero' ? addUnit(b, 'skeleton', 3, 4) : hero(b, 'knight', 3, 4);
      by.kx = { smoke: 1e9 };
      if (kitStrike(b, by, to, 10, 'blow', false, []) === null) n++;
    }
    return n / 400;
  };
  const druid = misses('druid', 'hero');
  const foe = misses('skeleton', 'foe');
  assert.ok(Math.abs(foe - 0.5) < 0.08, `a foe misses ${foe}`);
  assert.ok(Math.abs(druid - 0.35) < 0.08, `the Druid misses ${druid}`);
});

// ---- STR's Athletics ----

test("STR's Athletics: at STR +4 a hero climbs a step higher and strikes a foe a level further up; below it, as written", () => {
  const b = arena();
  const one = hero(b, 'werewolf', 1, 1, 1);
  const four = hero(b, 'werewolf', 3, 1, 4);
  assert.equal(derivedOf(STAT_PROFILES.werewolf).mods.str, 3);
  assert.equal(derivedOf(STAT_PROFILES.werewolf, { level: 4 }).mods.str, 4);
  assert.equal(athleticsOf(one), 0);
  assert.equal(athleticsOf(four), 1);
  const jump = UNITS.werewolf.jump;
  assert.equal(strikeDef(b, one).jump, jump);
  assert.equal(strikeDef(b, four).jump, jump + 1);
  // (a foe on a ledge one level higher than the written jump: only the climber reaches it)
  const ledge = { u: 3, v: 2 };
  b.board.tiles[ledge.v * b.board.w + ledge.u].h = jump + 1;
  b.board.tiles[2 * b.board.w + 1].h = jump + 1;
  assert.ok(!canStrike(b.board, strikeDef(b, one), one, { u: 1, v: 2 }));
  assert.ok(canStrike(b.board, strikeDef(b, four), four, ledge));
  // (a foe never climbs from its block: the families are evened)
  assert.equal(athleticsOf(addUnit(b, 'orcGrunt', 6, 6)), 0);
});

// ---- The AI ----

test('flanking: a quick melee hero (DEX +3) values a foe\'s back and side tiles over its front; a slow one takes the nearest', () => {
  const f = { facing: 1, u: 4, v: 4 } as Unit;
  // (facing +v: a blow from behind comes the way it faces)
  assert.equal(flankValue({ u: 4, v: 3 }, f), FLANK_BACK);
  assert.equal(flankValue({ u: 4, v: 5 }, f), 0);
  assert.equal(flankValue({ u: 3, v: 4 }, f), FLANK_SIDE);
  // (in a fight: the Kunoichi, DEX 17, walks round a skeleton that faces her; the Knight, DEX 8, walks straight at it)
  const walkTo = (kind: string): { u: number; v: number } => {
    const b = arena(7);
    const h = hero(b, kind, 4, 8);
    const s = addUnit(b, 'skeleton', 4, 4);
    s.facing = 1;
    s.busyUntil = 1e9;
    h.busyUntil = 0;
    // (where it stands for its first blow)
    for (let i = 0; i < 100; i++) if (stepBattle(b).some((e) => e.kind === 'swing' && e.by === h.id)) break;
    return { u: h.u, v: h.v };
  };
  const k = walkTo('kunoichi');
  const n = walkTo('knight');
  assert.deepEqual(n, { u: 4, v: 5 }, 'the Knight comes straight on');
  // (beside a foe's front she steps round, once in 3 s, unless it is fighting her: it would turn to face her anyway)
  const b = arena(7);
  const h = hero(b, 'kunoichi', 4, 5);
  const s = addUnit(b, 'skeleton', 4, 4);
  s.facing = 1;
  assert.ok(flankStep(b, h, strikeDef(b, h), s) >= 0);
  assert.equal(flankStep(b, h, strikeDef(b, h), s), -1, 'not again at once');
  h.flankAt = undefined;
  s.swing = { at: 0, ms: 300, to: h.id };
  assert.equal(flankStep(b, h, strikeDef(b, h), s), -1, 'a foe fighting her turns to face her');
  assert.ok(flankValue(k, { facing: 1, u: 4, v: 4 } as Unit) > 0, `the Kunoichi comes round to (${k.u}, ${k.v})`);
  assert.equal(Math.abs(k.u - 4) + Math.abs(k.v - 4), 1, 'and strikes from there');
});

test('kiting: a quick shooter (DEX +3) steps back from a brute beside it that strikes it, at most once in 3 s, and only where it can still shoot', () => {
  const b = arena(9);
  const archer = hero(b, 'archer', 4, 6);
  const orc = addUnit(b, 'orcGrunt', 4, 5);
  orc.busyUntil = 1e9;
  const def = strikeDef(b, archer);
  // (only from a brute striking it: one busy with a friend is left to the friend)
  assert.equal(kiteStep(b, archer, def, [orc]), -1);
  orc.swing = { at: 0, ms: 300, to: archer.id };
  const step = kiteStep(b, archer, def, [orc]);
  assert.ok(step >= 0, 'it steps back');
  const to = { u: step % b.board.w, v: Math.floor(step / b.board.w) };
  assert.ok(Math.abs(to.u - orc.u) + Math.abs(to.v - orc.v) >= 2, 'out of the brute\'s reach');
  assert.ok(canStrike(b.board, def, to, orc), 'and still shoots it');
  assert.equal(kiteStep(b, archer, def, [orc]), -1, 'not again at once');
  b.t += KITE_MS;
  assert.ok(kiteStep(b, archer, def, [orc]) >= 0, 'again after 3 s');
  // (the Siege Bot, DEX 15, holds its ground)
  const bot = hero(b, 'siegeBot', 1, 6);
  addUnit(b, 'orcGrunt', 1, 5).swing = { at: 0, ms: 300, to: bot.id };
  assert.equal(derivedOf(STAT_PROFILES.siegeBot).mods.dex, 2);
  assert.equal(kiteStep(b, bot, strikeDef(b, bot), b.units.filter((u) => u.side === 'foe')), -1);
});

test("saves-aware control: among foes a skill values the same it picks the weakest save (the Kitsune charms the dim brute, not the witch)", () => {
  const { b, hs, fs } = field([['kitsune', 1]], ['orcGrunt', 'yokaiWitch']);
  const [kit] = hs;
  const brute = fs.find((f) => f.def === 'orcGrunt')!;
  const shaman = fs.find((f) => f.def === 'yokaiWitch')!;
  // (equal value: the brute's WIS save is under the caster's)
  const value = () => 10;
  assert.ok(saveStatsOf(b, brute)!.saves.wis < saveStatsOf(b, shaman)!.saves.wis);
  assert.equal(saveAware(b, kit, [shaman, brute], value, 'charm')[0], brute);
  // (a target valued far higher is still picked first)
  assert.equal(saveAware(b, kit, [shaman, brute], (u) => (u === shaman ? 100 : 10), 'charm')[0], shaman);
  // (a foe's skill keeps its order, as before)
  assert.equal(saveAware(b, brute, [kit, hs[0]], value, 'charm')[0], kit);
  SAVES.on = false;
  assert.equal(saveAware(b, kit, [shaman, brute], value, 'charm')[0], shaman, 'with the saves off, the list as it was');
  SAVES.on = true;
});

// ---- DEX saves on areas ----

test('the Wall of Fire is a DEX save, not a CON one, and a breath is halved on a DEX save', () => {
  assert.ok(DEX_SAVES.wall && DEX_SAVES.breath);
  const { b, hs, fs } = field([['dragoon', 1]], ['skeleton']);
  const [dragoon] = hs;
  const [skel] = fs;
  // (the skeleton's DEX save is not its CON save, so which one the burn reads shows; no fit since the joint rebalance)
  assert.notEqual(saveStatsOf(b, skel)!.saves.dex, saveStatsOf(b, skel)!.saves.con);
  assert.equal(saveFit(b, dragoon, skel, 'dex'), 1);
  // (over many moments, a breath's blast: about the DEX save's share are saved, each "Saved" and half)
  let saved = 0;
  let halves = 0;
  for (let i = 0; i < 2000; i++) {
    b.t = i * 100;
    const out: BattleEvent[] = [];
    const m = blastSave(b, dragoon, skel, out);
    if (out.some((e) => e.kind === 'saved')) {
      saved++;
      if (Math.abs(m / saveFit(b, dragoon, skel, 'dex') - 0.5) < 1e-9) halves++;
    }
  }
  assert.ok(saved > 100 && saved < 1900, `${saved} saved`);
  assert.equal(halves, saved);
});

// ---- Determinism ----

test('a fight replays the same with every rule on (no draw from the fight\'s streams)', () => {
  const run = (): string => {
    const b = startBattle(77, 'orcs');
    for (const [i, k] of ['kunoichi', 'archer', 'wizard', 'werewolf', 'paladin'].entries()) place(b, k, 1 + i, b.board.d - 1, undefined, gradeBoost(1, 0, 20));
    fight(b);
    const log: string[] = [];
    while (b.phase === 'fight' && b.t < 60000) for (const e of stepBattle(b)) log.push(e.kind);
    return `${b.phase}|${b.t}|${log.length}|${b.units.map((u) => `${u.u},${u.v},${u.hp}`).join(';')}`;
  };
  assert.equal(run(), run());
});
