// The Mythics finished (docs/notes/mythics-finish.md): every move a Mythic has is a look of its own, painted, larger and fuller than an
// ordinary hero's; each has a showcase and a cut-in of its own; replaying a trial pays a few rank shards, capped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KITS, keyOf } from '../src/sim/abilities';
import { HERO_KITS } from '../src/sim/heroKits';
import { UNITS } from '../src/sim/units';
import { MYTHIC_KINDS, isMythic } from '../src/sim/mythicRules';
import { SIGNATURES, type Step } from '../src/render/signatures';
import { KIT_LOOKS } from '../src/render/kitLooks';
import { abilitySource } from '../src/render/abilityLooks';
import { existsSync } from 'node:fs';
import { MYTHIC_CUTS, mythicCut, mythicPainting } from '../src/mythicCutRules';
import { SHOWCASES } from '../src/ultShowRules';
import { addUnit, startBattle, type BattleEvent } from '../src/sim/battle';
import { mythicHeroKits } from '../src/sim/mythicCombat';
import { startedMeta } from '../src/sim/meta';
import { newRun } from '../src/sim/run';
import { payTrialShards, TRIAL_SHARDS, trialMythic, trialShardsDue } from '../src/sim/mythicEcho';
import { SHARD_CAP } from '../src/sim/awakenRules';
import { bareBoard } from './bare';

/** Every move of a Mythic: its three skills and its ultimate. */
const moves = (k: string): string[] => [...HERO_KITS()[k].slots.map((s) => keyOf(s.skill)), keyOf(KITS[k].ultimate!)];
const layer = (st: Step) => (st.art ? `${st.s}:art:${abilitySource(st.art)}` : `${st.s}:${st.k}:${st.t ?? 0}`);
const ordinaryHeroes = Object.keys(KITS).filter((id) => UNITS[id]?.side === 'hero' && !UNITS[id]?.summon && !isMythic(id));

test('every Mythic move has a painted look of its own: none borrowed, every lead a painting no other move or spell uses', () => {
  const all = MYTHIC_KINDS.flatMap(moves);
  assert.equal(all.length, 20);
  const sources = new Set<string>();
  for (const name of all) {
    const sig = SIGNATURES[name];
    assert.ok(sig, `${name}: a signature of its own`);
    assert.ok(!KIT_LOOKS[name], `${name}: borrows no look`);
    assert.equal(sig.cast[0].art, `skill:${name}`);
    const src = abilitySource(`skill:${name}`);
    assert.ok(src, `${name}: a painted source cell`);
    assert.ok(!sources.has(src!), `${name}: its own cell`);
    sources.add(src!);
  }
});

test('no layer of a Mythic move is shared with any other look, and no other look leads with a Mythic move\'s strip', () => {
  const mine = new Set(MYTHIC_KINDS.flatMap(moves));
  const bad: string[] = [];
  for (const name of mine) {
    const keys = new Set(SIGNATURES[name].cast.map(layer));
    for (const [other, sig] of Object.entries(SIGNATURES)) {
      if (other === name) continue;
      for (const st of sig.cast) if (keys.has(layer(st))) bad.push(`${name} / ${other}: ${layer(st)}`);
      if (sig.cast[0].k === SIGNATURES[name].cast[0].k) bad.push(`${name} and ${other} both lead with ${sig.cast[0].k}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('a Mythic\'s looks are grander than an ordinary hero\'s: more layers, and an ultimate as large as the largest', () => {
  let skillLayers = 0, ultLayers = 0, ultZ = 0;
  for (const id of ordinaryHeroes) {
    const k = KITS[id];
    skillLayers = Math.max(skillLayers, SIGNATURES[keyOf(k.skill)]?.cast.length ?? 0);
    if (k.ultimate) {
      const u = SIGNATURES[keyOf(k.ultimate)];
      ultLayers = Math.max(ultLayers, u?.cast.length ?? 0);
      // (a rain or a beam is many copies of its painting; a single release is the one compared for size)
      if (u && !u.cast[0].n) ultZ = Math.max(ultZ, u.cast[0].z ?? 1);
    }
  }
  for (const k of MYTHIC_KINDS) {
    for (const name of moves(k).slice(0, 3)) assert.ok(SIGNATURES[name].cast.length >= skillLayers, `${name}: ${SIGNATURES[name].cast.length} layers`);
    const ult = SIGNATURES[keyOf(KITS[k].ultimate!)];
    assert.ok(ult.cast.length > ultLayers, `${k}: its ultimate has more layers than any ordinary hero's`);
    if (!ult.cast[0].n) assert.ok((ult.cast[0].z ?? 1) >= ultZ - 0.4, `${k}: its ultimate is drawn about as large as the largest`);
    // (and every ultimate keeps a wind-up of three layers, its gathering power)
    assert.ok(ult.wind.length >= 3, `${k}: its ultimate's wind-up`);
  }
});

test('each Mythic opens its ultimate with a cut-in of its own: its own entrance, sigil and colours; no other hero has one', () => {
  const entries = new Set<string>(), sigils = new Set<string>(), glows = new Set<string>();
  for (const k of MYTHIC_KINDS) {
    const cut = mythicCut(k);
    assert.ok(cut, k);
    entries.add(cut!.entry); sigils.add(cut!.sigil); glows.add(cut!.glow);
    assert.ok(existsSync(`src/art/ult-show/${cut!.sigil}.webp`), `${k}: its sigil is painted`);
    assert.ok(existsSync(`src/art/${mythicPainting(k)}`), `${k}: its painting`);
    // (its showcase says what it does in words of its own)
    assert.ok(SHOWCASES[k] && SHOWCASES[k].line.length > 40, k);
  }
  assert.equal(entries.size, 5); assert.equal(sigils.size, 5); assert.equal(glows.size, 5);
  assert.equal(Object.keys(MYTHIC_CUTS).length, 5);
  for (const k of ordinaryHeroes) assert.equal(mythicCut(k), null, k);
  assert.equal(new Set(MYTHIC_KINDS.map((k) => SHOWCASES[k].line)).size, 5);
});

test('a Mythic\'s trial replayed and won pays it two rank shards, once a day, never past the shard cap', () => {
  const m = startedMeta(5);
  m.unlocked.push('vael');
  const run = newRun(9);
  run.mode = { kind: 'quest', quest: 'mythic-vael', cast: [], practice: true };
  run.cleared = true;
  assert.equal(trialMythic('mythic-vael'), 'vael');
  assert.equal(trialMythic('nivraTrial'), null);
  assert.deepEqual(payTrialShards(m, run, 20261108), { kind: 'vael', n: TRIAL_SHARDS });
  assert.equal(m.shards.vael, 2);
  // (once a day)
  assert.equal(payTrialShards(m, run, 20261108), null);
  assert.equal(m.shards.vael, 2);
  assert.deepEqual(payTrialShards(m, run, 20261109), { kind: 'vael', n: 2 });
  // (capped: one short of the cap pays one, then nothing)
  m.shards.vael = SHARD_CAP - 1;
  assert.deepEqual(payTrialShards(m, run, 20261110), { kind: 'vael', n: 1 });
  assert.equal(m.shards.vael, SHARD_CAP);
  assert.equal(payTrialShards(m, run, 20261111), null);
  // (nothing for the first win (it gives the legend), a lost try, a Mythic not owned, or the tools' fights with no day)
  const first = { ...run, mode: { kind: 'quest' as const, quest: 'mythic-astrax', cast: [] } };
  m.unlocked.push('astrax');
  assert.equal(trialShardsDue(m, first, 20261108), null);
  assert.equal(trialShardsDue(m, { ...run, cleared: false }, 20261112), null);
  assert.equal(trialShardsDue(m, { ...run, mode: { ...run.mode, quest: 'mythic-orrun' } }, 20261112), null);
  assert.equal(trialShardsDue(m, { ...run, mode: { ...run.mode, quest: 'mythic-astrax' } }, undefined), null);
});

test('Fate Shard aims at a foe she has foretold, strikes it far harder and holds the mark a second longer', () => {
  const b = startBattle(7); bareBoard(b); b.units = []; b.phase = 'fight'; b.t = 1000;
  const me = addUnit(b, 'nyxara', 3, 7, { level: 30 });
  const near = addUnit(b, 'skeleton', 3, 6, { hp: 5000 });
  const far = addUnit(b, 'skeleton', 3, 4, { hp: 5000 });
  const out: BattleEvent[] = [];
  const shard = mythicHeroKits().nyxara.s1.skill;
  assert.ok(shard.cast(b, me, out));
  const plain = near.maxHp - near.hp;
  assert.ok(plain > 0 && far.hp === far.maxHp, 'unmarked: the nearest');
  far.mythic = { foretold: { by: me.id, until: b.t + 3000 } };
  assert.ok(shard.cast(b, me, out));
  assert.ok(far.maxHp - far.hp > plain * 1.4, 'the foretold foe, far harder');
  assert.equal(far.mythic.foretold!.until, b.t + 4000);
});
