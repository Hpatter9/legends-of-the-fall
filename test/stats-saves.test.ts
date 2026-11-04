import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { fight, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { AIL, gate, poisonFor } from '../src/sim/ailments';
import { landArea } from '../src/sim/abilities';
import { matchOf } from '../src/sim/blow';
import { isBoss } from '../src/sim/foes';
import { gradeBoost } from '../src/sim/run';
import { CONTEST_GAP, dcAgainst, meanShare, rollSave, SAVE_OF, SAVE_SHARE, SAVES, saveChance, saveFit, saveStatsOf, shoveTiles } from '../src/sim/saves';
import { derivedOf, foeStatsOf, JOINT, STAT_PROFILES, TIER_PROFICIENCY } from '../src/sim/stats';
import { LEGENDARY_RESISTANCE, LIVE, scoreWhy } from '../src/sim/statLines';
import { previewMove } from '../src/sim/toolkit/move';
import { UNITS } from '../src/sim/units';

// STATS batch 5, "Saves" (docs/notes/stats-5.md; the design is docs/notes/rpg-stats-design.md, section 3.3): skill DCs, the six saves, a
// save halving an ailment, a hold or a blast ("Saved"), the shoves' contest of STR (a saved shove is a tile shorter), and the bosses'
// Legendary Resistance (their old ladder). The joint rebalance (docs/notes/joint-rebalance.md) turned three of batch 5's stand-ins into the design's
// rules: no fit (a save's halving is felt), the foes at their tier's proficiency (not matched to the heroes' growth), and a boss saves, every
// save trained, with its ladder after.

/** A fight on bare level ground with heroes (kind and level) and foes, placed, not yet begun. */
function field(heroes: [string, number][], foes: string[]): { b: Battle; hs: Unit[]; fs: Unit[] } {
  const b = bareBoard(startBattle(41, foes));
  heroes.forEach(([k, level], i) => place(b, k, 1 + 2 * i, b.board.d - 1, undefined, gradeBoost(1, 0, level)));
  return { b, hs: b.units.filter((u) => u.side === 'hero'), fs: b.units.filter((u) => u.side === 'foe') };
}

/** The share of `n` moments at which `to` saves against `by`'s `what`. */
function rate(b: Battle, by: Unit, to: Unit, what: keyof typeof SAVE_OF, n = 4000): number {
  let saved = 0;
  for (let i = 0; i < n; i++) {
    b.t = i * 100;
    if (rollSave(b, by, to, what, false).saved) saved++;
  }
  b.t = 0;
  return saved / n;
}

test('a skill DC is 8 + proficiency + the casting ability; each save its modifier, + proficiency in the two trained', () => {
  const { b, hs } = field([['knight', 1], ['wizard', 20]], ['skeleton']);
  const [knight, wizard] = hs;
  const k = derivedOf(STAT_PROFILES.knight);
  const w = derivedOf(STAT_PROFILES.wizard, { level: 20 });
  assert.equal(saveStatsOf(b, knight)!.dc, 8 + 2 + k.mods[STAT_PROFILES.knight.cast]);
  assert.equal(saveStatsOf(b, wizard)!.dc, 8 + 4 + w.mods.int);
  assert.equal(saveStatsOf(b, knight)!.saves.con, k.mods.con + 2, 'the Knight is trained in CON');
  assert.equal(saveStatsOf(b, knight)!.saves.dex, k.mods.dex, 'and not in DEX');
  // (the saves the design names for each thing)
  assert.equal(SAVE_OF.poison, 'con');
  assert.equal(SAVE_OF.shove, 'str');
  assert.equal(SAVE_OF.blast, 'dex');
  assert.equal(SAVE_OF.silence, 'int');
  assert.equal(SAVE_OF.fear, 'wis');
  assert.equal(SAVE_OF.curse, 'cha');
});

test('a CON 20 hero shakes off poison more often than a CON 12 one', () => {
  // (the Knight at level 20 has CON 20, the Wizard at level 1 CON 12; one skeleton's grave-rot against each)
  const { b, hs, fs } = field([['knight', 20], ['wizard', 1]], ['skeleton']);
  const [knight, wizard] = hs;
  assert.equal(derivedOf(STAT_PROFILES.knight, { level: 20 }).scores.con, 20);
  assert.equal(derivedOf(STAT_PROFILES.wizard).scores.con, 12);
  const strong = rate(b, fs[0], knight, 'poison');
  const weak = rate(b, fs[0], wizard, 'poison');
  assert.ok(strong > weak + 0.3, `CON 20 saves ${strong}, CON 12 ${weak}`);
  // (each near what the d20 gives against the skeleton's DC, matched to the heroes' growth)
  const dc = dcAgainst(b, fs[0], 'con')!;
  assert.ok(Math.abs(strong - saveChance(dc, saveStatsOf(b, knight)!.saves.con)) < 0.03);
  assert.ok(Math.abs(weak - saveChance(dc, saveStatsOf(b, wizard)!.saves.con)) < 0.03);
  // and in a real lay: a saved poison is half as long as one that took, and says "Saved"
  const lens = { saved: new Set<number>(), not: new Set<number>() };
  for (let i = 1; i < 80; i++) {
    b.t = i * 100;
    wizard.ail = [];
    const from = b.spells.events.length;
    poisonFor(b, fs[0], wizard);
    const len = wizard.ail![0].until - b.t;
    const saved = b.spells.events.slice(from).some((e) => e.kind === 'saved' && e.to === wizard.id && e.what === 'poison');
    lens[saved ? 'saved' : 'not'].add(len);
  }
  assert.equal(lens.saved.size, 1);
  assert.equal(lens.not.size, 1);
  assert.equal([...lens.saved][0], Math.round([...lens.not][0] * SAVE_SHARE));
});

test('no fit (the joint rebalance): a lay is its written length, halved on a save, so a saved stun is half and an unsaved one whole', () => {
  const { b, hs, fs } = field([['knight', 1]], ['skeleton', 'orcGrunt']);
  assert.equal(saveFit(b, fs[0], hs[0], 'con'), 1);
  assert.equal(saveFit(b, hs[0], fs[1], 'con'), 1);
  const seen = new Set<number>();
  for (let i = 0; i < 40; i++) {
    b.t = i * 100;
    seen.add(rollSave(b, hs[0], fs[1], 'stun', false).mult);
  }
  assert.deepEqual([...seen].sort(), [SAVE_SHARE, 1]);
  // (with the switch off, batch 5's fit: the ordinary hero, on average over the roster, takes a foe's ailment as long as before)
  JOINT.saves = false;
  try {
    const f = saveFit(b, fs[0], hs[0], 'con');
    const dc = foeStatsOf(UNITS.skeleton).dc;
    const heroes = Object.values(STAT_PROFILES).map((p) => derivedOf(p).saves.con);
    assert.ok(Math.abs(f * (heroes.reduce((n, x) => n + meanShare(dc, x), 0) / heroes.length) - 1) < 1e-12);
  } finally {
    JOINT.saves = true;
  }
});

test('the foes at their tier’s proficiency (the joint rebalance): their DC and saves are their block’s, not matched to the heroes’ growth', () => {
  const { b, fs } = field([['knight', 30]], ['skeleton']);
  fight(b);
  const s = foeStatsOf(UNITS.skeleton, 0, false);
  assert.ok(matchOf(b).dc > 0);
  assert.equal(dcAgainst(b, fs[0], 'con'), s.dc);
  assert.equal(saveStatsOf(b, fs[0])!.saves.con, s.saves.con);
  // (a Mythic fight's foes, proficiency +6: their DC and their trained saves 4 more than the Normal tier's)
  const myth = bareBoard(startBattle(41, ['skeleton'], { foes: { prof: TIER_PROFICIENCY[4] } }));
  assert.equal(dcAgainst(myth, myth.units[0], 'con'), s.dc + 4);
  assert.equal(saveStatsOf(myth, myth.units[0])!.saves.con, s.saves.con + 4);
  assert.equal(saveStatsOf(myth, myth.units[0])!.saves.int, s.saves.int, 'an untrained save has no proficiency');
});

test('a saved shove is a tile shorter; the contest of STR moves it a tile either way', () => {
  // (the Knight, STR +2, shoves a Wizard-strength foe and a brute; the contest by the modifiers, the save by the d20)
  const { b, hs, fs } = field([['knight', 1]], ['skeleton']);
  const [knight] = hs;
  const skel = fs[0];
  knight.u = 3;
  knight.v = 5;
  skel.u = 3;
  skel.v = 4;
  const gap = saveStatsOf(b, knight)!.str - saveStatsOf(b, skel)!.str;
  const contest = gap >= CONTEST_GAP ? 1 : gap <= -CONTEST_GAP ? -1 : 0;
  const seen = { saved: -1, not: -1 };
  for (let i = 0; i < 200 && (seen.saved < 0 || seen.not < 0); i++) {
    b.t = i * 100;
    const t = shoveTiles(b, knight, skel, 2);
    const plan = previewMove(b, knight, skel, 2, 2, 'shove');
    assert.equal(plan?.path.length ?? 0, t.n);
    if (t.saved) seen.saved = t.n;
    else seen.not = t.n;
  }
  assert.equal(seen.not, 2 + contest);
  assert.equal(seen.saved, 2 + contest - 1, 'a saved shove is a tile shorter');
  // (the contest: a shover 2 points of STR above goes a tile further, 2 below a tile less, with the save held off)
  SAVES.on = false;
  assert.equal(shoveTiles(b, knight, skel, 2).n, 2, 'with the saves off, no contest either');
  SAVES.on = true;
  const strong = saveStatsOf(b, knight)!;
  const old = strong.str;
  strong.str = saveStatsOf(b, skel)!.str + CONTEST_GAP;
  const further = [...Array(40)].map((_, i) => ((b.t = i * 100), shoveTiles(b, knight, skel, 2))).find((t) => !t.saved)!;
  assert.equal(further.n, 3);
  strong.str = saveStatsOf(b, skel)!.str - CONTEST_GAP;
  const shorter = [...Array(40)].map((_, i) => ((b.t = i * 100), shoveTiles(b, knight, skel, 2))).find((t) => !t.saved)!;
  assert.equal(shorter.n, 1);
  strong.str = old;
});

test('a saved blast deals half; the pop says "Saved"', () => {
  const { b, hs, fs } = field([['wizard', 1]], ['orcGrunt']);
  const [wiz] = hs;
  const orc = fs[0];
  orc.u = 3;
  orc.v = 3;
  const dealt = { saved: new Set<number>(), not: new Set<number>() };
  for (let i = 0; i < 60; i++) {
    b.t = i * 100;
    orc.hp = orc.maxHp;
    const out: BattleEvent[] = [];
    landArea(b, 'rain', wiz, 3, 3, 40, out);
    const hit = out.find((e) => e.kind === 'hit' && e.to === orc.id) as { dmg: number } | undefined;
    const saved = out.some((e) => e.kind === 'saved' && e.to === orc.id && e.what === 'blast');
    dealt[saved ? 'saved' : 'not'].add(hit!.dmg);
  }
  assert.ok(dealt.saved.size >= 1 && dealt.not.size >= 1);
  const [s] = [...dealt.saved];
  const [n] = [...dealt.not];
  assert.ok(Math.abs(s - n * SAVE_SHARE) <= 1, `saved ${s}, not ${n}`);
});

test('a boss saves (the joint rebalance): every save trained, and its Legendary Resistance follows; the card names it', () => {
  const boss = Object.keys(UNITS).find((id) => isBoss(id) && UNITS[id].side === 'foe')!;
  const { b, hs, fs } = field([['knight', 30]], [boss]);
  const st = saveStatsOf(b, fs[0])!;
  const f = foeStatsOf(UNITS[boss]);
  // (+2 proficiency on the Normal tier's +2, in every save)
  for (const a of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) assert.equal(st.saves[a], f.mods[a] + TIER_PROFICIENCY[0] + 2, a);
  // (it saves, some of the time, and a saved stun is half of the ladder's own)
  const out: number[] = [];
  for (let i = 0; i < 40; i++) {
    b.t = i * 20000;
    fs[0].cc = undefined;
    out.push(gate(b, fs[0], 'stun', 2000, hs[0]));
  }
  const saved = b.spells.events.filter((e) => e.kind === 'saved').length;
  assert.ok(saved > 0 && saved < 40, `${saved} of 40 saved`);
  const whole = Math.round(2000 * AIL.BOSS_SHARE);
  assert.ok(out.includes(whole) && out.includes(Math.round(whole * SAVE_SHARE)), out.join(' '));
  // (with the switch off, batch 5's rule: a boss makes no save, its ladder alone)
  JOINT.bossSaves = false;
  try {
    const c = field([['knight', 30]], [boss]);
    for (let i = 0; i < 6; i++) {
      c.b.t = i * 3000;
      gate(c.b, c.fs[0], 'stun', 2000, c.hs[0]);
    }
    assert.equal(c.b.spells.events.filter((e) => e.kind === 'saved').length, 0);
  } finally {
    JOINT.bossSaves = true;
  }
  assert.equal(LEGENDARY_RESISTANCE.name, 'Legendary Resistance');
  assert.match(LEGENDARY_RESISTANCE.text, /three in a row/);
});

test('the same moment gives the same save, and a fight replays the same with the saves', () => {
  const { b, hs, fs } = field([['knight', 1]], ['skeleton']);
  b.t = 1200;
  const a = rollSave(b, fs[0], hs[0], 'poison', false);
  assert.deepEqual(rollSave(b, fs[0], hs[0], 'poison', false), a);
  const run = () => {
    const { b } = field([['knight', 10], ['wizard', 10], ['archer', 10], ['cleric', 10], ['minotaur', 10]], ['skeleton', 'skeleton', 'orcArcher', 'orcGrunt', 'wolfRed']);
    fight(b);
    let saved = 0;
    while (b.phase === 'fight' && b.t < 120000) saved += stepBattle(b).filter((e) => e.kind === 'saved').length;
    return JSON.stringify([b.phase, b.t, saved, b.units.map((u) => [u.hp, u.u, u.v])]);
  };
  const once = run();
  assert.equal(once, run());
  assert.ok(JSON.parse(once)[2] > 0, 'saves are made in a real fight');
});

test('the page: STR’s line names the shoves now they are live (and the climb, since STATS batch 6 put Athletics in fights)', () => {
  assert.equal(LIVE.shove, true);
  const p = STAT_PROFILES.minotaur;
  assert.match(scoreWhy(p, derivedOf(p), 'str'), /shoves further/);
  assert.match(scoreWhy(p, derivedOf(p), 'str'), /climbs a step higher at \+4/, 'STR 17 is +3: the climb is a step away');
  assert.match(scoreWhy(p, derivedOf(p, { level: 4 }), 'str'), /climbs a step higher \(Athletics\)/);
});
