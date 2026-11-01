import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { fight, place, startBattle, stepBattle, swing, type Battle, type BattleEvent, type Pending, type Unit } from '../src/sim/battle';
import { acAgainst, blowFit, blowShare, blowStatsOf, bossBlockOn, DODGE_PER_AC, HIGH_AC_MAX, INIT_MAX_MS, INIT_MS, initiativeWaits, matchOf, rollBlow } from '../src/sim/blow';
import { TALL_AC } from '../src/sim/board';
import { FIELD_BANDS, isBoss } from '../src/sim/foes';
import { gradeBoost, stageBoost } from '../src/sim/run';
import { mixSeed, Rng } from '../src/sim/rng';
import { blowResult, d20At, derivedOf, foeStatsOf, initiativeRoll, JOINT, STAT_PROFILES, TIER_PROFICIENCY } from '../src/sim/stats';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { deploySpots, pickTeam } from '../tools/heroSweep';

// STATS batch 4, "AC and the blow" (docs/notes/stats-4.md; the design is docs/notes/rpg-stats-design.md, section 3.2): every ordinary blow
// rolls a d20 + to hit against Armour Class (hit, glance, miss, a natural 20's crit), crits on a hit from DEX, initiative, blow speed by DEX,
// the dodges and tall grass as AC, height as cover, the foes' blocks, `BLOW_SCALE`.

/** A fight on bare level ground with one hero and one foe, placed, not yet begun. */
function duel(hero = 'knight', foe = 'skeleton', level = 1): { b: Battle; h: Unit; f: Unit } {
  const b = bareBoard(startBattle(41, [foe]));
  place(b, hero, 3, b.board.d - 1, undefined, gradeBoost(1, 0, level));
  const h = b.units.find((u) => u.side === 'hero')!;
  const f = b.units.find((u) => u.side === 'foe')!;
  return { b, h, f };
}

test("the odds table: over 10,000 hashed rolls, each number the d20 needs gives the design's hit, glance and miss", () => {
  // (the design's table: needs 6, 8, 10, 12, 14 -> hit / glance / miss; a natural 20 is in the hits)
  const want: [number, number, number, number][] = [[6, 75, 20, 5], [8, 65, 25, 10], [10, 55, 25, 20], [12, 45, 25, 30], [14, 35, 25, 40]];
  for (const [need, hit, glance, miss] of want) {
    const n = { hit: 0, glance: 0, miss: 0 };
    for (let i = 0; i < 10000; i++) {
      const r = blowResult(d20At(7, need, i), 5, 5 + need);
      n[r === 'crit' ? 'hit' : r]++;
    }
    assert.ok(Math.abs(n.hit / 100 - hit) < 1.5, `needs ${need}: hit ${n.hit / 100}% (want ${hit})`);
    assert.ok(Math.abs(n.glance / 100 - glance) < 1.5, `needs ${need}: glance ${n.glance / 100}% (want ${glance})`);
    assert.ok(Math.abs(n.miss / 100 - miss) < 1.5, `needs ${need}: miss ${n.miss / 100}% (want ${miss})`);
  }
});

test("a fighter's blow numbers: a hero's from its scores, a foe's from its family's block; DEX quickens a grown hero's blows", () => {
  const { b, h, f } = duel('knight', 'skeleton');
  const k = derivedOf(STAT_PROFILES.knight);
  const s0 = foeStatsOf(UNITS.skeleton);
  assert.deepEqual(blowStatsOf(b, h), { toHit: k.toHit, aim1: k.toHit, ac1: k.ac, ac: k.ac, dexCrit: 0, quick: 1, init: k.initiative });
  // (the joint rebalance: no fit, the skeleton's block shows in what it deals and takes, `JOINT.families`)
  assert.equal(blowFit(b, h, f), 1);
  assert.equal(blowFit(b, f, h), 1);
  assert.equal(blowStatsOf(b, h).ac, 16, 'the Knight is in plate');
  const s = foeStatsOf(UNITS.skeleton);
  assert.deepEqual(blowStatsOf(b, f), { toHit: s.toHit, aim1: s.toHit, ac1: s.ac, ac: s.ac, dexCrit: s.crit - 0.05, quick: 1, init: s.initiative });
  assert.equal(s0.toHit, s.toHit);
  // (a boss fights with its block since the joint rebalance: +2 proficiency, +2 to two scores, +2 AC, `JOINT.bossBlock`)
  const boss = Object.keys(UNITS).find((id) => isBoss(id) && UNITS[id].side === 'foe')!;
  const bb = bareBoard(startBattle(41, [boss]));
  const bu = bb.units[0];
  assert.equal(bossBlockOn(), true);
  assert.equal(blowStatsOf(bb, bu).ac, foeStatsOf(UNITS[boss]).ac);
  assert.equal(blowStatsOf(bb, bu).ac, foeStatsOf(UNITS[boss], 0, false).ac + 2);
  assert.ok(blowStatsOf(bb, bu).toHit >= foeStatsOf(UNITS[boss], 0, false).toHit + 2);
  // (the Gunslinger at level 20 has DEX 20, +5, against 17's +3: 2% quicker a point than its kind's level-1 blows)
  const g = duel('gunslinger', 'skeleton', 20);
  assert.ok(Math.abs(blowStatsOf(g.b, g.h).quick - 1.1 / 1.06) < 1e-9);
  assert.ok(Math.abs(blowStatsOf(g.b, g.h).dexCrit - 0.05) < 1e-9, 'DEX +5 crits 5% of its hits');
});

test('the heroes\u2019 armour and aim show from level 1 (the owner\u2019s answer); the foes\u2019 families show (the joint rebalance)', () => {
  // (an armoured skeleton, a shooter, a brute, a skirmisher and a caster: their to hit runs +3 to +5 and their AC 12 to 15)
  const foes = ['skeleton', 'boneArcher', 'orcBrute', 'wolfBlack', 'orcShaman'].filter((id) => UNITS[id]?.side === 'foe');
  assert.ok(foes.length >= 4, foes.join(' '));
  // (a family's block moves how often it hits and is hit, and so how much it deals and takes: nothing is fitted out)
  for (const foe of foes) {
    const { b, h, f } = duel('samurai', foe);
    assert.equal(blowFit(b, f, h), 1, `${foe} strikes`);
    assert.equal(blowFit(b, h, f), 1, `${foe} is struck`);
  }
  // (the samurai lands less on the plated skeleton, AC 15, than on the brute, AC 12)
  const bones = duel('samurai', 'skeleton');
  const brute = duel('samurai', 'orcBrute');
  const lands = (d: ReturnType<typeof duel>) => blowShare(blowStatsOf(d.b, d.h).toHit, blowStatsOf(d.b, d.f).ac);
  assert.ok(lands(bones) < lands(brute) * 0.85, `${lands(bones)} against ${lands(brute)}`);
  // (a hero is not fitted: the plated Knight takes less from the same foe than the robed Wizard, and the STR 10 Beastmaster deals less)
  const knight = duel('knight', 'orcBrute');
  const wizard = duel('wizard', 'orcBrute');
  const taken = (d: ReturnType<typeof duel>) => blowFit(d.b, d.f, d.h) * blowShare(blowStatsOf(d.b, d.f).toHit, blowStatsOf(d.b, d.h).ac);
  assert.ok(taken(knight) < taken(wizard) * 0.85, `${taken(knight)} against ${taken(wizard)}`);
  const beast = duel('beastmaster', 'orcBrute');
  const gun = duel('gunslinger', 'orcBrute');
  const dealt = (d: ReturnType<typeof duel>) => blowFit(d.b, d.h, d.f) * blowShare(blowStatsOf(d.b, d.h).toHit, blowStatsOf(d.b, d.f).ac);
  assert.ok(dealt(beast) < dealt(gun) * 0.85, `${dealt(beast)} against ${dealt(gun)}`);
});

test('cover: tall grass is +2 AC, higher ground +1 a level to three, and every 7% of an old dodge share +1', () => {
  const { b, h, f } = duel('knight', 'skeleton');
  const base = blowStatsOf(b, h).ac;
  assert.equal(acAgainst(b, h, 0, 0, false).ac, base);
  assert.equal(acAgainst(b, h, 0, 0, true).ac, base + TALL_AC);
  assert.equal(acAgainst(b, h, 0, 2, false).ac, base + 2);
  assert.equal(acAgainst(b, h, 0, 9, false).ac, base + HIGH_AC_MAX, 'cover stops at three levels');
  assert.equal(acAgainst(b, h, 3, 0, false).ac, base, 'no cover from standing lower');
  h.eq = { ...(h.eq ?? {}), dodge: 0.14 } as Unit['eq'];
  assert.equal(acAgainst(b, h, 0, 0, false).ac, base + 2, "14% of gear's dodge is +2 AC");
  assert.equal(DODGE_PER_AC, 0.07);
  assert.equal(acAgainst(b, f, 0, 0, true).cover, TALL_AC);
});

test('a natural 20 always crits, a miss never does, and any blow that lands crits at the DEX and kit chance (a keen glance as a full crit)', () => {
  const { b, h, f } = duel('gunslinger', 'skeleton', 20);
  const me = blowStatsOf(b, h);
  let landed = 0;
  let crits = 0;
  for (let t = 0; t < 20000; t += 1) {
    b.t = t * 100;
    const roll = d20At(b.seed, b.t, h.id, f.id);
    const r = rollBlow(b, h, f, 0, 0, false, 0.1, 1.75);
    const plain = blowResult(roll, me.toHit, blowStatsOf(b, f).ac);
    if (roll === 20) assert.ok(r.res === 'crit' && r.crit === 1.75, 'a natural 20 crits at the kit\u2019s size');
    if (plain === 'miss') assert.deepEqual([r.res, r.crit], ['miss', 1]);
    if (plain === 'hit' || plain === 'glance') {
      landed++;
      if (r.crit > 1) {
        crits++;
        assert.equal(r.res, 'hit', 'a crit lands in full');
      } else assert.equal(r.res, plain);
    }
  }
  // (DEX +5 is 5%, the kit's 10% on top)
  assert.ok(Math.abs(crits / landed - 0.15) < 0.01, `a blow that lands crits ${((100 * crits) / landed).toFixed(1)}%`);
});

test('a dodge share that is not a whole 5% is a part of a point of AC, made whole that part of the time', () => {
  const { b, h, f } = duel('knight', 'skeleton');
  h.eq = { ...(h.eq ?? {}), dodge: 0.042 } as Unit['eq'];
  assert.ok(Math.abs(acAgainst(b, h, 0, 0, false).cover - 0.6) < 1e-9);
  // (the skeleton, +4, needs 12 against AC 16 and 13 against 17: at 0.6 of a point, its misses on 1 to 6 grow by 0.6 of a roll)
  let missed = 0;
  const n = 20000;
  for (let t = 0; t < n; t++) {
    b.t = t * 100;
    if (rollBlow(b, f, h, 0, 0, false, 0, 1.5).res === 'miss') missed++;
  }
  const want = (6 + 0.6) / 20;
  assert.ok(Math.abs(missed / n - want) < 0.012, `missed ${(missed / n).toFixed(3)} (want ${want.toFixed(3)})`);
});

test('a miss its cover turned is marked as the cover’s doing, and only then', () => {
  const { b, h, f } = duel('knight', 'skeleton');
  for (let t = 0; t < 4000; t++) {
    b.t = t * 100;
    const roll = d20At(b.seed, b.t, f.id, h.id);
    const r = rollBlow(b, f, h, 0, 0, true, 0, 1.5);
    const bare = blowResult(roll, blowStatsOf(b, f).toHit, blowStatsOf(b, h).ac);
    assert.equal(r.turned, r.res === 'miss' && bare !== 'miss');
  }
});

test('a swing carries its d20, and a glance deals half a hit', () => {
  const { b, h, f } = duel('knight', 'skeleton', 30);
  fight(b);
  f.u = h.u;
  f.v = h.v - 1;
  const seen = { hit: [] as number[], glance: [] as number[], miss: 0 };
  const out: BattleEvent[] = [];
  for (let t = 0; t < 3000; t++) {
    b.t = 100000 + t * 100;
    b.pending = [];
    swing(b, h, f, new Rng(1), out);
    const p = b.pending[0] as Pending;
    if (p.res === 'hit') seen.hit.push(p.dmg);
    if (p.res === 'glance') seen.glance.push(p.dmg);
    if (p.res === 'miss') seen.miss++;
  }
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(seen.glance.length > 0 && seen.miss > 0 && seen.hit.length > 0);
  assert.ok(Math.abs(mean(seen.glance) / mean(seen.hit) - 0.5) < 0.06, `a glance is half a hit (${(mean(seen.glance) / mean(seen.hit)).toFixed(2)})`);
});

test('the fight’s events: a glance is tagged on its hit, and a miss shows as a dodge with no hit', () => {
  const b = startBattle(17, FIELD_BANDS[3], stageBoost(5));
  const spots = deploySpots(b, new Rng(5));
  pickTeam(new Rng(9)).forEach((id, i) => place(b, id, spots[i][0], spots[i][1]));
  fight(b);
  let glances = 0;
  let misses = 0;
  while (b.phase === 'fight') {
    for (const e of stepBattle(b)) {
      if (e.kind === 'hit' && e.glance) {
        glances++;
        assert.equal(e.src, 'blow');
      }
      if (e.kind === 'dodge') misses++;
    }
  }
  assert.ok(glances > 10 && misses > 5, `glances ${glances}, misses ${misses}`);
});

test('initiative: every fighter rolls d20 + DEX as the fight starts, and waits 30 ms a point behind the best, at most 0.6 s', () => {
  const b = startBattle(23, FIELD_BANDS[1], stageBoost(5));
  const spots = deploySpots(b, new Rng(3));
  pickTeam(new Rng(4)).forEach((id, i) => place(b, id, spots[i][0], spots[i][1]));
  fight(b);
  const rolls = b.units.map((u) => initiativeRoll(b.seed, u.id, blowStatsOf(b, u).init));
  const top = Math.max(...rolls);
  b.units.forEach((u, i) => assert.equal(u.busyUntil, Math.min(INIT_MAX_MS, (top - rolls[i]) * INIT_MS), u.def));
  assert.ok(b.units.some((u) => u.busyUntil === 0) && b.units.some((u) => u.busyUntil > 0));
  const waits = initiativeWaits(b);
  for (const u of b.units) assert.equal(waits.get(u.id), u.busyUntil);
});

test('the foes fight at their tier’s proficiency (the joint rebalance): not matched to the heroes’ growth; a hero’s summon still grows with them', () => {
  const one = duel('gunslinger', 'skeleton', 1);
  fight(one.b);
  assert.deepEqual(matchOf(one.b), { aim: 0, ac: 0, dc: 0, save: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, str: 0 });
  const thirty = duel('gunslinger', 'skeleton', 30);
  fight(thirty.b);
  const g = STAT_PROFILES.gunslinger;
  const m = matchOf(thirty.b);
  assert.equal(m.aim, derivedOf(g, { level: 30 }).toHit - derivedOf(g).toHit);
  assert.ok(m.aim > 0);
  // (the skeleton's AC and to hit are its block's at the Normal tier's +2, whatever the heroes' level)
  assert.equal(blowStatsOf(thirty.b, thirty.f).ac, foeStatsOf(UNITS.skeleton).ac);
  assert.equal(blowStatsOf(thirty.b, thirty.f).toHit, foeStatsOf(UNITS.skeleton).toHit);
  // (a Legendary fight's foes, proficiency +5, hit 3 more and their DC is 3 more; their AC is the block's)
  const leg = bareBoard(startBattle(41, ['skeleton'], { foes: { prof: TIER_PROFICIENCY[3] } }));
  const lf = leg.units[0];
  assert.equal(blowStatsOf(leg, lf).toHit, foeStatsOf(UNITS.skeleton).toHit + 3);
  assert.equal(blowStatsOf(leg, lf).ac, foeStatsOf(UNITS.skeleton).ac);
  // (with the switch off, batch 6's match: the foe's AC rises with the heroes' to hit)
  JOINT.tierProf = false;
  try {
    const old = duel('gunslinger', 'skeleton', 30);
    fight(old.b);
    assert.equal(blowStatsOf(old.b, old.f).ac, foeStatsOf(UNITS.skeleton).ac + matchOf(old.b).aim);
  } finally {
    JOINT.tierProf = true;
  }
});

/** Every hero in a seeded team of five (grades 1 to 3) at `level` against a field band at `stage`, three times over: the fights' mean
 *  length (ms), their wins, and a hash of their blows. */
function meanLength(level: number, stage: number, rounds = 3): { t: number; won: number; log: string } {
  let t = 0;
  let won = 0;
  let n = 0;
  let h = 0x811c9dc5;
  for (let s = 0; s < rounds; s++)
    ALL_HEROES.forEach((kind, i) => {
      const seed = 5000 + level * 1000 + s * 100 + i;
      const b = startBattle(seed, FIELD_BANDS[seed % FIELD_BANDS.length], stageBoost(stage));
      const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
      const team = [kind, ...pickTeam(new Rng(mixSeed(seed, 0x7ea4))).filter((k) => k !== kind)].slice(0, 5);
      team.forEach((id, j) => place(b, id, spots[j][0], spots[j][1], undefined, gradeBoost(1 + (seed % 3), 0, level)));
      fight(b);
      while (b.phase === 'fight') for (const e of stepBattle(b)) if (e.kind === 'hit') h = Math.imul(h ^ (e.dmg + e.to * 7919 + b.t), 0x01000193) >>> 0;
      t += b.t;
      n++;
      if (b.phase === 'won') won++;
    });
  return { t: t / n, won, log: h.toString(16) };
}

test('a fight replays the same: the same seed, placing and orders give the same blows', () => {
  assert.deepEqual(meanLength(10, 24, 1), meanLength(10, 24, 1));
});

test("fights last within 10% of main's: every hero in a team at level 1, 10 and 30", () => {
  // (main's mean fight length on these 135 fights a level, measured on 0.321.0, with stats batch 2, before this batch: this batch's were
  // 21,046, 23,564 and 12,649 ms, +2.8%, +1.7% and +2.1%)
  // (the joint rebalance, docs/notes/joint-rebalance.md: the field's foes now fight at the Normal tier's +2 where they were matched to the
  // heroes' growth, so a level-10 team wins at stage 27 what it won at 24, and a level-30 one at 45 what it won at 39: main's lengths are
  // held against those stages, the same fights in difficulty; at the old stages the stronger heroes end them about a tenth sooner. Measured
  // here: 20,660, 22,759 and 12,253 ms, +0.9%, -1.8% and -1.1%)
  const main: [number, number, number][] = [[1, 5, 20469], [10, 27, 23174], [30, 45, 12386]];
  for (const [level, stage, was] of main) {
    const now = meanLength(level, stage).t;
    assert.ok(Math.abs(now / was - 1) <= 0.1, `level ${level}: ${Math.round(now)} ms against main's ${was}`);
  }
});
