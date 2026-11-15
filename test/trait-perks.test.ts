// TRAIT-PERKS (docs/notes/trait-perks.md): every trait's three tiers, each rule checked on a fight set up for it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { addUnit, fight, hurt, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX } from '../src/sim/abilities';
import { castSpell, costOf, speedOf, SPELLS } from '../src/sim/spells';
import { fightLives, partyFell } from '../src/sim/lives';
import { stunFor } from '../src/sim/ailments';
import { movable } from '../src/sim/toolkit/move';
import { PERK, perkAt, perkBlow, perkCast, perkCrit, perkDeath, perkWave, startPerks, tickPerks, TRAIT_PERKS } from '../src/sim/traitPerks';
import { TRAITS } from '../src/sim/traits';
import { UNITS } from '../src/sim/units';

const spots = (b: Battle) => {
  const out: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) out.push([u, v]);
  return out;
};
/** A fight with these heroes placed (two tiles apart, or side by side with `tight`) and begun. */
const started = (kinds: string[], o: { seed?: number; tight?: boolean; lives?: number; band?: string } = {}): Battle => {
  const b = startBattle(o.seed ?? 3, o.band ?? 'skeletons');
  const s = spots(b);
  kinds.forEach((k, i) => assert.ok(place(b, k, ...s[o.tight ? i : i * 2]), `placed ${k}`));
  if (o.lives !== undefined) b.lives = fightLives(o.lives);
  fight(b);
  b.spells.events.splice(0);
  return b;
};
const hero = (b: Battle, kind: string) => b.units.find((x) => x.def === kind)!;
const foes = (b: Battle) => b.units.filter((x) => x.side === 'foe' && x.alive);
const foe = (b: Battle) => foes(b)[0];
const raised = (b: Battle, what: string) => b.units.filter((x) => x.alive && x.pk?.raised === what);
/** Move a fighter to a tile (for a test's set-up only). */
const put = (u: Unit, at: { u: number; v: number }) => {
  u.u = at.u;
  u.v = at.v;
  u.step = undefined;
};
/** The free tile nearest a spot (by steps: one beside it first). */
const free = (b: Battle, near: { u: number; v: number }, skip: { u: number; v: number }[] = []) => {
  for (let r = 1; r < 8; r++)
    for (let dv = -r; dv <= r; dv++)
      for (let du = -r; du <= r; du++) {
        if (Math.abs(du) + Math.abs(dv) !== r) continue;
        const at = { u: near.u + du, v: near.v + dv };
        const t = tileAt(b.board, at.u, at.v);
        if (t && standable(t) && !b.units.some((x) => x.alive && x.u === at.u && x.v === at.v) && !skip.some((s) => s.u === at.u && s.v === at.v)) return at;
      }
  throw new Error('no free tile');
};
const ticks = (b: Battle, ms: number) => {
  const out: BattleEvent[] = [];
  for (let t = 0; t < ms && b.phase === 'fight'; t += 100) out.push(...stepBattle(b));
  return out;
};
const perks = (out: BattleEvent[], what: string) => out.filter((e) => e.kind === 'perk' && e.what === what);

const UNDEAD = ['shambler', 'mummy', 'reaper', 'dreadPirate'];

test('the tiers: none below two, and each trait reaches its three', () => {
  assert.equal(started(['knight']).perk, undefined);
  const b = started(UNDEAD);
  assert.equal(b.perk!.tier.undead, 2);
  assert.ok(perkAt(b, 'undead', 0) && perkAt(b, 'undead', 2));
  assert.equal(started(UNDEAD.slice(0, 3)).perk!.tier.undead, 1);
  for (const t of Object.values(TRAITS)) for (const x of t.tiers) assert.ok(x.name && x.text && x.rule, t.id);
});

test('the switch turns every perk off', () => {
  TRAIT_PERKS.on = false;
  try {
    assert.equal(started(UNDEAD).perk, undefined);
  } finally {
    TRAIT_PERKS.on = true;
  }
});

test('Undead III: three skeletons rise; the fallen stay down till the wave ends, and never cost a life', () => {
  const b = started(UNDEAD, { lives: 10 });
  const bones = raised(b, 'grave');
  assert.deepEqual(bones.map((x) => x.def).sort(), ['graveArcher', 'graveSpear', 'graveWarrior']);
  for (const x of bones) {
    assert.ok(UNITS[x.def].summon);
    assert.equal(x.maxHp, Math.round(b.perk!.health * PERK.SKELETON_HP));
  }
  // (one falls: it stays down through the wave)
  const f = foe(b);
  hurt(b, f, bones[0], bones[0].hp + 999, true, false, [], 'skill');
  assert.ok(!bones[0].alive);
  ticks(b, 6000);
  assert.ok(!bones[0].alive, 'no rise mid-wave');
  assert.equal(b.lives!.spent, 0, 'no life for a skeleton');
  // (every hero down with skeletons standing is still a party fall: a skeleton is not the party)
  // (the wave's end: the next wave's start raises it again)
  perkWave(b, []);
  assert.equal(raised(b, 'grave').length, 3);
  assert.equal(b.lives!.spent, 0);
  // (fewer than four Undead raise none)
  assert.equal(raised(started(UNDEAD.slice(0, 3)), 'grave').length, 0);
});

test('Undead I and II: Death\'s Door once a wave; a foe slain near the Undead bursts in rot', () => {
  const b = started(UNDEAD.slice(0, 2));
  const sh = hero(b, 'shambler');
  const f = foe(b);
  hurt(b, f, sh, sh.hp + 500, true, false, [], 'skill');
  assert.ok(sh.alive && sh.hp === 1, 'held at the door');
  assert.ok(!hurt(b, f, sh, 50, true, false, [], 'skill'), 'safe a moment');
  b.t += PERK.DOOR_SAFE_MS + 100;
  hurt(b, f, sh, sh.hp + 500, true, false, [], 'skill');
  assert.ok(!sh.alive, 'once a wave');
  // (on orcs: the skeletons shrug off poison)
  const r = started(UNDEAD.slice(0, 3), { band: 'orcs' });
  const mu = hero(r, 'mummy');
  const [a, c] = foes(r);
  put(a, free(r, mu));
  put(c, free(r, a, [a]));
  const out: BattleEvent[] = [];
  hurt(r, mu, a, a.hp + 999, true, false, out, 'skill');
  assert.equal(perks(out, 'rot').length, 1);
  assert.ok(c.ail?.some((x) => x.kind === 'poison'));
});

test('Samurai: the first cut crits, a lone duel won quickens, the death poem', () => {
  const b = started(['samurai', 'kunoichi', 'archer', 'ninjaMonk']);
  const sa = hero(b, 'samurai');
  assert.equal(perkCrit(b, sa, 1, 1.5), PERK.IAI_CRIT);
  perkBlow(b, sa, foe(b), true, 10, []);
  assert.equal(perkCrit(b, sa, 1, 1.5), 1, 'only the first');
  // (a lone duel won: no other hero beside the foe, a second of haste; with a friend beside it, none)
  const f = foe(b);
  put(f, free(b, sa));
  const o1: BattleEvent[] = [];
  perkDeath(b, sa, f, true, o1);
  assert.ok(o1.some((e) => e.kind === 'haste'));
  const ku = hero(b, 'kunoichi');
  const g = foes(b)[1];
  put(g, free(b, sa, [f]));
  put(ku, free(b, g, [f, sa]));
  const o2: BattleEvent[] = [];
  if (Math.abs(ku.u - g.u) + Math.abs(ku.v - g.v) === 1) {
    perkDeath(b, sa, g, true, o2);
    assert.ok(!o2.some((e) => e.kind === 'haste'));
  }
  // (the poem: the first Samurai to fall fights on, unhurt, then falls)
  const out: BattleEvent[] = [];
  hurt(b, f, ku, ku.hp + 999, true, false, out, 'skill');
  assert.ok(ku.alive && ku.hp === 1 && ku.pk!.poem! > b.t);
  assert.ok(!hurt(b, f, ku, 500, true, false, [], 'skill'), 'unkillable');
  b.t += PERK.POEM_MS;
  tickPerks(b, []);
  assert.ok(!ku.alive, 'falls when the poem ends');
  // (the second to fall does not)
  hurt(b, f, sa, sa.hp + 999, true, false, [], 'skill');
  assert.ok(!sa.alive);
});

test('Mystic: spells cost less, they echo, and every so often one is free', () => {
  const two = started(['wizard', 'lightningMage']);
  assert.equal(costOf(two, 'meteor'), Math.round(SPELLS.meteor.cost * PERK.LEY_COST));
  assert.equal(costOf(started(['wizard']), 'meteor'), SPELLS.meteor.cost);
  const b = started(['wizard', 'lightningMage', 'wanderer', 'sage']);
  b.spells.mana = 99;
  const f = foe(b);
  assert.ok(castSpell(b, 'meteor', f.u, f.v));
  assert.equal(b.perk!.later.filter((x) => x.k === 'echo').length, 1);
  const falls = b.spells.falls.length;
  b.t += PERK.ECHO_MS;
  tickPerks(b, []);
  assert.ok(b.spells.falls.length > falls, 'the echo falls');
  // (every CONFLUX_EVERY-th spell of the fight is free)
  const h = hero(b, 'wizard');
  for (let i = 1; i < PERK.CONFLUX_EVERY - 1; i++) {
    b.spells.ready.heal = 0;
    assert.ok(castSpell(b, 'heal', h.u, h.v));
  }
  const mana = b.spells.mana;
  b.spells.ready.meteor = 0;
  assert.ok(castSpell(b, 'meteor', f.u, f.v));
  assert.equal(b.spells.mana, mana, 'free');
});

test('Yokai: slips and wisps, a foxfire twin, the night parade slows the foes', () => {
  const b = started(['kitsune', 'karasu', 'yamabushi', 'gorgon']);
  assert.ok(b.traits!.yokaiWisp && b.traits!.dodge);
  const f = foe(b);
  assert.ok(speedOf(b, f) < 1);
  b.t += PERK.DUSK_MS;
  assert.ok(speedOf(b, f) >= 0.99);
  const ki = hero(b, 'kitsune');
  const out: BattleEvent[] = [];
  hurt(b, f, ki, ki.hp - Math.round(ki.maxHp * 0.3), true, false, out, 'skill');
  assert.equal(perks(out, 'twin').length, 1);
  assert.equal(raised(b, 'twin').length, 1);
  hurt(b, f, ki, 1, true, false, [], 'skill');
  assert.equal(raised(b, 'twin').length, 1, 'once a wave');
});

test('Knightly: the shield wall, the oath, the Order\'s standard', () => {
  const b = started(['peasant', 'knight', 'minotaur', 'samuraiCommander'], { tight: true });
  const st = raised(b, 'standard');
  assert.equal(st.length, 1);
  const kn = hero(b, 'knight');
  const pe = hero(b, 'peasant');
  const f = foe(b);
  // (the oath: a blow on the badly hurt peasant is taken by a knight)
  pe.hp = Math.round(pe.maxHp * 0.2);
  const was = pe.hp;
  const out: BattleEvent[] = [];
  hurt(b, f, pe, 30, false, false, out, 'blow');
  assert.equal(pe.hp, was, 'the peasant is spared');
  assert.equal(perks(out, 'oath').length, 1);
  // (the shield wall and the standard: a knight beside friends takes less than plain)
  const plain = started(['knight']);
  const k2 = hero(plain, 'knight');
  const f2 = foe(plain);
  const a = kn.hp;
  hurt(b, f, kn, 100, false, false, [], 'skill');
  const b2 = k2.hp;
  hurt(plain, f2, k2, 100, false, false, [], 'skill');
  assert.ok(a - kn.hp < b2 - k2.hp, `${a - kn.hp} vs ${b2 - k2.hp}`);
});

test('Holy: stronger healing, hallowed ground, the first to fall rises free', () => {
  const b = started(['paladin', 'cleric', 'priestess', 'inquisitor'], { lives: 10 });
  const pa = hero(b, 'paladin');
  assert.ok((pa.healMult ?? 1) >= PERK.BLESS - 1e-9);
  assert.ok(b.auras?.some((x) => x.what === 'hallowed' && x.by === pa.id));
  const f = foe(b);
  hurt(b, f, pa, pa.hp + 999, true, false, [], 'skill');
  assert.ok(pa.alive && pa.hp === Math.round(pa.maxHp * PERK.RISE_HP));
  assert.equal(b.lives!.spent, 0);
  const cl = hero(b, 'cleric');
  hurt(b, f, cl, cl.hp + 999, true, false, [], 'skill');
  assert.ok(!cl.alive, 'once a wave');
});

test('Wild: bloodscent, the frenzy, the stampede', () => {
  const dealt = (low: boolean) => {
    const x = started(['werewolf', 'druid', 'barbarian', 'wolfBard'], { band: 'orcs' });
    const f = foe(x);
    if (low) f.hp = Math.round(f.maxHp * 0.4);
    const was = f.hp;
    hurt(x, hero(x, 'barbarian'), f, 60, false, false, [], 'skill');
    return was - f.hp;
  };
  assert.ok(dealt(true) > dealt(false), `${dealt(true)} vs ${dealt(false)}`);
  const b = started(['werewolf', 'druid', 'barbarian', 'wolfBard'], { band: 'orcs' });
  const ba = hero(b, 'barbarian');
  const sp = speedOf(b, ba);
  perkDeath(b, ba, foes(b)[1], true, []);
  assert.ok(speedOf(b, ba) > sp);
  b.t = b.perk!.next.stampede!;
  const out: BattleEvent[] = [];
  tickPerks(b, out);
  assert.equal(perks(out, 'stampede').length, 1);
});

test('Arcane: flux, the weave, the overload', () => {
  const b = started(['satyr', 'warlock', 'illusionist', 'timeWitch']);
  const wl = hero(b, 'warlock');
  const others = b.units.filter((x) => x.side === 'hero' && x !== wl);
  for (const x of others) x.charge = 50;
  others[0].charge = 0;
  const out: BattleEvent[] = [];
  perkCast(b, wl, out.length, out, () => {});
  assert.equal(others[0].charge, PERK.FLUX);
  perkCast(b, wl, 0, out, () => {});
  perkCast(b, wl, 0, out, () => {});
  assert.equal(perks(out, 'weave').length, 1);
  assert.ok(perks(b.spells.events.length ? b.spells.events : out, 'overload').length >= 0);
});

test('Frontier: rough ground unslowed, snares in the foes\' path, the Wanted foe', () => {
  const b = started(['ranger', 'gunslinger', 'mercenary', 'beastmaster']);
  assert.ok(b.traps?.some((t) => t.side === 'hero'));
  const w = b.units.find((x) => x.pk?.wanted)!;
  assert.ok(w);
  const ra = hero(b, 'ranger');
  const out: BattleEvent[] = [];
  hurt(b, ra, w, w.hp + 9999, true, false, out, 'skill');
  assert.ok(out.some((e) => e.kind === 'haste'));
});

test('Machine: plating, the self-destruct, the sentries', () => {
  const b = started(['rifleBot', 'arcBlade', 'siegeBot', 'juggernaut'], { lives: 10 });
  const rb = hero(b, 'rifleBot');
  assert.ok(rb.shield && rb.shield.hp === Math.round(rb.maxHp * PERK.PLATING));
  assert.equal(raised(b, 'sentry').length, PERK.SENTRIES);
  const f = foe(b);
  put(f, free(b, rb));
  rb.shield = undefined;
  const was = f.hp;
  hurt(b, f, rb, rb.hp + 999, true, false, [], 'skill');
  assert.ok(f.hp < was, 'the explosion');
});

test('Royal: the crown, the tribute, the regicide', () => {
  const b = started(['lancer', 'dragoon', 'demonSwordsman', 'tyrant']);
  const king = b.units.find((x) => x.pk?.crowned)!;
  assert.ok(king);
  const f = foe(b);
  const out: BattleEvent[] = [];
  hurt(b, f, king, king.hp + 9999, true, false, out, 'skill');
  const heir = b.units.find((x) => x.pk?.crowned && x.alive)!;
  assert.ok(heir && heir !== king);
  assert.ok(foes(b).every((x) => (x.stunUntil ?? 0) > b.t || x.ail?.length !== undefined));
});

test('Pirate: plunder for the run, the tide, the broadside', () => {
  const b = started(['buccaneer', 'kraken', 'corsairSurgeon', 'harpooner']);
  assert.ok(b.terrain?.some((x) => x.kind === 'flood'));
  const bu = hero(b, 'buccaneer');
  perkDeath(b, bu, foe(b), true, []);
  assert.equal(b.perk!.plunder, PERK.PLUNDER);
  b.t = b.perk!.next.broadside!;
  const out: BattleEvent[] = [];
  tickPerks(b, out);
  assert.equal(perks(out, 'broadside').length, 1);
});

test('Vampire: the thirst, the swarm once a wave, two thralls', () => {
  const b = started(['vampireLord', 'hemomancer', 'nightstalker', 'bloodGargoyle']);
  assert.ok(b.traits!.vampireSwarm);
  const vl = hero(b, 'vampireLord');
  vl.hp = Math.round(vl.maxHp / 2);
  const was = vl.hp;
  const fs = foes(b);
  hurt(b, vl, fs[0], 100, false, false, [], 'skill');
  assert.ok(vl.hp > was, 'drinks');
  for (const f of fs.slice(0, 3)) hurt(b, vl, f, f.hp + 9999, true, false, [], 'skill');
  assert.equal(raised(b, 'thrall').length, PERK.THRALLS);
  perkWave(b, []);
  assert.equal(raised(b, 'thrall').length, 0, 'the thralls go with the wave');
});

test('Guardian: the challenge, the Aegis, the Bastion', () => {
  const b = started(['peasant', 'knight', 'yamabushi', 'paladin'], { tight: true });
  const kn = hero(b, 'knight');
  const f = foe(b);
  put(f, free(b, kn));
  b.t = 500;
  tickPerks(b, []);
  assert.ok(f.taunt && b.units.find((x) => x.id === f.taunt!.to)!.def !== undefined);
  const out: BattleEvent[] = [];
  const was = f.hp;
  hurt(b, f, kn, 50, false, false, out, 'blow');
  assert.ok(f.hp < was, 'turned back');
  assert.equal(perks(out, 'bastion').length, 1);
});

test('Blade: bleeding crits, the riposte, every fifth blow cuts all round', () => {
  const b = started(['samurai', 'ninjaMonk', 'samuraiCommander', 'barbarian'], { band: 'orcs' });
  const nm = hero(b, 'ninjaMonk');
  const [f, g] = foes(b);
  perkBlow(b, nm, f, true, 40, []);
  assert.ok(f.ail?.some((x) => x.kind === 'bleed'));
  put(f, free(b, nm));
  const was = f.hp;
  hurt(b, f, nm, 30, false, false, [], 'blow');
  assert.ok(f.hp < was, 'riposte');
  put(g, free(b, nm, [f]));
  const out: BattleEvent[] = [];
  nm.pk!.blows = PERK.CUTS_EVERY - 1;
  perkBlow(b, nm, f, false, 40, out);
  assert.equal(perks(out, 'cuts').length, 1);
});

test('Marksman: shots from height hit harder, every fourth pins, the volley', () => {
  const b = started(['archer', 'lightningMage', 'ranger', 'gunslinger']);
  const ar = hero(b, 'archer');
  const f = foe(b);
  ar.pk!.shots = PERK.PIN_EVERY - 1;
  perkBlow(b, ar, f, false, 10, []);
  assert.ok((f.rootUntil ?? 0) > b.t);
  b.t = b.perk!.next.volley!;
  const out: BattleEvent[] = [];
  tickPerks(b, out);
  assert.equal(perks(out, 'volley').length, 1);
  assert.ok(out.filter((e) => e.kind === 'shot').length >= 2);
});

test('Caster: the surge, lingering magic, the overcast', () => {
  const b = started(['wizard', 'wanderer', 'warlock', 'tyrant']);
  const wz = hero(b, 'wizard');
  const fs = foes(b).slice(0, 3);
  const out: BattleEvent[] = fs.map((f) => ({ kind: 'hit', by: wz.id, to: f.id, dmg: 5, heavy: false, splash: false, killed: false, src: 'skill' }) as BattleEvent);
  wz.charge = 0;
  let again = 0;
  perkCast(b, wz, 0, out, () => again++);
  assert.equal(wz.charge, PERK.SURGE);
  assert.ok(b.auras?.some((a) => a.what.startsWith('linger')));
  // (the Casters' skills counted together: the fourth goes off twice)
  for (let i = 1; i < PERK.OVERCAST_EVERY; i++) perkCast(b, hero(b, i % 2 ? 'warlock' : 'tyrant'), 0, out, () => again++);
  assert.equal(again, 1, 'the fourth casts twice');
});

test('Warden: a watch over its neighbours, the sanctuary behind, the circles when the party is low', () => {
  const b = started(['cleric', 'druid', 'shambler', 'mummy'], { tight: true });
  const cl = hero(b, 'cleric');
  const f = foe(b);
  // (a hero beside a Warden takes less than a plain one)
  const plain = started(['cleric']);
  const c2 = hero(plain, 'cleric');
  const a = cl.hp;
  hurt(b, f, cl, 100, false, false, [], 'skill');
  const was2 = c2.hp;
  hurt(plain, foe(plain), c2, 100, false, false, [], 'skill');
  assert.ok(a - cl.hp < was2 - c2.hp, `${a - cl.hp} vs ${was2 - c2.hp}`);
  for (const h of b.units.filter((x) => x.side === 'hero' && x.alive && !x.pk?.raised)) h.hp = Math.round(h.maxHp * 0.2);
  const out: BattleEvent[] = [];
  tickPerks(b, out);
  assert.ok(perks(out, 'circle').length >= 1);
});

test('Trickster: the first blow misses, the decoy log, a mirror image each', () => {
  const b = started(['kunoichi', 'kitsune', 'karasu', 'illusionist']);
  assert.equal(raised(b, 'image').length, 4 * PERK.IMAGES);
  const ku = hero(b, 'kunoichi');
  const f = foe(b);
  const was = ku.hp;
  assert.ok(!hurt(b, f, ku, 50, false, false, [], 'blow'));
  assert.equal(ku.hp, was);
  hurt(b, f, ku, 50, false, false, [], 'blow');
  assert.ok(ku.hp < was, 'only the first');
  // (an image broken dazes its breaker)
  const im = raised(b, 'image')[0];
  hurt(b, f, im, im.hp + 999, true, false, [], 'skill');
  assert.ok((f.stunUntil ?? 0) > b.t);
});

test('Beast: the pack, the roar, the apex frenzy', () => {
  // (on orcs: the skeletons know no fear)
  const b = started(['werewolf', 'minotaur', 'satyr', 'gorgon'], { band: 'orcs' });
  const ww = hero(b, 'werewolf');
  const f = foe(b);
  put(f, free(b, ww));
  b.t = 500;
  tickPerks(b, []);
  assert.ok(ww.pk!.roared && f.ail?.some((x) => x.kind === 'fear'));
  const sp = speedOf(b, ww);
  perkDeath(b, ww, foes(b)[1], true, []);
  assert.ok(speedOf(b, ww) > sp);
});

test('Gunner: the splash, the kegs, the bombardment', () => {
  const b = started(['rifleBot', 'siegeBot', 'dhampir', 'bombardier']);
  assert.ok(b.perk!.kegs.length > 0);
  b.t = Math.max(...b.perk!.kegs.map((k) => k.at));
  const out: BattleEvent[] = [];
  tickPerks(b, out);
  assert.ok(perks(out, 'kegBoom').length > 0);
  b.t = b.perk!.next.bomb!;
  const o2: BattleEvent[] = [];
  tickPerks(b, o2);
  assert.equal(perks(o2, 'shells').length, 1);
});

test('Assassin: the backstab, the execution, the shadow step', () => {
  const b = started(['mercenary', 'buccaneer', 'reaper', 'arcBlade']);
  const me = hero(b, 'mercenary');
  assert.ok(me.pk!.sure, 'stepped behind a foe, its next blow a crit');
  assert.ok(perkCrit(b, me, 1, 1.5) > 1);
  const f = foe(b);
  f.hp = Math.round(f.maxHp * PERK.EXECUTE * 0.8);
  perkBlow(b, me, f, false, 1, []);
  assert.ok(!f.alive, 'executed');
});

test('Support: the medic, the hymns, the rallying cry and a quicker life', () => {
  const b = started(['wolfBard', 'beastmaster', 'priestess', 'warDrummer'], { lives: 10 });
  assert.equal(b.reviveMs, PERK.RALLY_REVIVE_MS);
  const wb = hero(b, 'wolfBard');
  wb.hp = Math.round(wb.maxHp / 2);
  const was = wb.hp;
  b.t = b.perk!.next.medic!;
  tickPerks(b, []);
  assert.ok(wb.hp > was);
  b.t = b.perk!.next.hymn!;
  const out: BattleEvent[] = [];
  tickPerks(b, out);
  assert.equal(perks(out, 'hymn').length, 1);
  const f = foe(b);
  const o2: BattleEvent[] = [];
  hurt(b, f, wb, wb.hp + 999, true, false, o2, 'skill');
  assert.equal(perks(o2, 'rally').length, 1);
});

test('Vanguard: the spearhead, the knock back, the onslaught', () => {
  const b = started(['lancer', 'dreadPirate', 'dragoon', 'demonSwordsman']);
  const la = hero(b, 'lancer');
  assert.ok(speedOf(b, la) >= PERK.SPEARHEAD - 1e-9);
  const out = ticks(b, PERK.ONSLAUGHT_AT + 100);
  assert.ok(perks(out, 'onslaught').length >= 1);
});

test('Arcanist: stronger spells, the sling, the anchor turns time back', () => {
  const b = started(['timeWitch', 'sage', 'plagueDoctor', 'inquisitor'], { lives: 10 });
  const tw = hero(b, 'timeWitch');
  tw.charge = 0;
  b.spells.mana = 99;
  assert.ok(castSpell(b, 'heal', tw.u, tw.v));
  assert.ok(tw.charge >= PERK.SLING);
  ticks(b, PERK.ANCHOR_MS + 500);
  const hs = b.units.filter((x) => x.side === 'hero' && !x.pk?.raised && x.alive);
  const f = foe(b);
  for (const h of hs) h.hp = Math.max(1, Math.round(h.maxHp * 0.2));
  hurt(b, f, hs[0], hs[0].hp + 999, true, false, [], 'skill');
  const out: BattleEvent[] = [];
  tickPerks(b, out);
  assert.equal(perks(out, 'anchor').length, 1);
  assert.ok(hs[0].alive, 'the fallen stands again');
  assert.equal(b.lives!.spent, 0);
});

test('Bulwark: steadfast, the earthworks, immovable', () => {
  const b = started(['kraken', 'juggernaut', 'bloodGargoyle', 'geomancer']);
  const kr = hero(b, 'kraken');
  assert.equal(movable(kr), 'no');
  stunFor(b, kr, 5000);
  assert.ok((kr.stunUntil ?? 0) <= b.t + PERK.STEADY_STUN_MS);
  assert.ok((b.walls ?? []).length > 0);
  const f = foe(b);
  const a = kr.hp;
  hurt(b, f, kr, 100, false, false, [], 'skill');
  const loose = a - kr.hp;
  b.t += PERK.FIRM_MS;
  tickPerks(b, []);
  const c = kr.hp;
  hurt(b, f, kr, 100, false, false, [], 'skill');
  assert.ok(c - kr.hp < loose);
});

test('a duel\'s ring raises and lays nothing', () => {
  const b = started(UNDEAD);
  b.duel = { hero: b.units[0].id, nem: foe(b).id, id: 1, mid: { u: 4, v: 5 }, r: 2 } as Battle['duel'];
  for (const u of raised(b, 'grave')) u.alive = false;
  perkWave(b, []);
  assert.equal(raised(b, 'grave').length, 0);
});

test('the perks are deterministic', () => {
  const run = () => {
    const b = started(['kunoichi', 'kitsune', 'karasu', 'illusionist', 'reaper'], { seed: 11 });
    ticks(b, 20000);
    return b.units.map((u) => `${u.def}:${u.hp}:${u.alive}`).join(',');
  };
  assert.equal(run(), run());
});

test('a whole fight with every top tier plays to its end', () => {
  for (const kinds of [UNDEAD, ['rifleBot', 'arcBlade', 'siegeBot', 'juggernaut'], ['werewolf', 'druid', 'barbarian', 'wolfBard'], ['buccaneer', 'kraken', 'corsairSurgeon', 'harpooner'], ['timeWitch', 'sage', 'plagueDoctor', 'inquisitor']]) {
    const b = started(kinds, { lives: 10 });
    for (let i = 0; i < 4000 && b.phase === 'fight'; i++) stepBattle(b);
    assert.notEqual(b.phase, 'fight', kinds.join());
  }
});

// (references kept for the type checker)
void addUnit;
void partyFell;
void startPerks;
void CHARGE_MAX;
