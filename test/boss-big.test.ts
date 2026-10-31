// BOSS-BIG (docs/notes/boss-big-attacks.md): the bosses' signature attacks. Every boss has them; a windup is a real state (`warnings`)
// that the heroes step out of and the king's spells answer; they come on a cooldown, at the turns of the boss's health, and in a rage once
// a fight drags; and a fight with them plays the same every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, stepBattle, TIME_LIMIT_MS, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { BOSS_IDS } from '../src/sim/foes';
import { CAL_BOSSES } from '../src/sim/calamityBosses';
import { ARMIES, bossesOf, bossOf } from '../src/sim/armies';
import { BOSS_BANDS, FOE_BANDS } from '../src/sim/foes';
import { BOSS_BIG, dangerFor, dodgeStep, SIG, SIGNATURES, sigTiles } from '../src/sim/bossAttacks';
import { castSpell } from '../src/sim/spells';
import { readyBattle } from './helpers';

type Sig = Extract<BattleEvent, { kind: 'bossSig' }>;

/** A fight against `id`, the boss tamed so the heroes live through a few of its signatures. */
function bossFight(id: string, seed = 3): { b: Battle; boss: Unit } {
  const b = readyBattle(seed, [id, 'orcGrunt'], { boss: { size: 1.5, hp: 1.2, atk: 0.3 } });
  fight(b);
  return { b, boss: b.units.find((u) => u.def === id)! };
}

/** Step until a windup begins (or the fight ends): the event, or undefined. */
function untilWarn(b: Battle, log: BattleEvent[] = []): Sig | undefined {
  while (b.phase === 'fight' && b.t < TIME_LIMIT_MS) {
    const out = stepBattle(b);
    log.push(...out);
    const w = out.find((e): e is Sig => e.kind === 'bossSig' && e.phase === 'warn');
    if (w) return w;
  }
  return undefined;
}

/** Step until windup `n` lands: the tick's events. */
function untilLand(b: Battle, n: number): BattleEvent[] {
  while (b.phase === 'fight') {
    const out = stepBattle(b);
    if (out.some((e) => e.kind === 'bossSig' && e.n === n && e.phase !== 'warn')) return out;
  }
  return [];
}

test('every boss has one or two signatures of its own: each army boss, the Calamity guardians and the Last Stand bosses', () => {
  const all = new Set([...BOSS_IDS, ...CAL_BOSSES, ...ARMIES.flatMap((a) => bossesOf(a).map((x) => x.id)), ...BOSS_BANDS.map((n) => FOE_BANDS[n][0])]);
  const keys: string[] = [];
  for (const id of all) {
    const list = SIGNATURES[id];
    assert.ok(list && list.length >= 1 && list.length <= 2, `${id} has its signatures`);
    for (const s of list) {
      keys.push(s.key);
      assert.ok(s.power * SIG.POWER >= 0.95 && SIG.FLOOR >= 0.2, `${s.key} hits hard`);
      assert.notEqual(s.name, s.rage, `${s.key} has a rage name`);
    }
  }
  assert.equal(new Set(keys).size, keys.length, 'each signature is its own');
  // (an army's last boss and every Calamity guardian has two)
  for (const id of [...ARMIES.map(bossOf), ...CAL_BOSSES]) assert.equal(SIGNATURES[id].length, 2, `${id} has two`);
});

test('a windup is a real state: the tiles are marked, the boss gathers, and it lands when the warning runs out', () => {
  const { b, boss } = bossFight('orcWarlord');
  const w = untilWarn(b);
  assert.ok(w, 'the warlord lets one go');
  assert.equal(w.by, boss.id);
  assert.ok(w.tiles.length >= 4, 'a wide spread of tiles');
  assert.equal(w.ms, SIG.WARN_MS);
  const st = b.warnings![0];
  assert.deepEqual(st.tiles, w.tiles);
  assert.equal(st.at, b.t + SIG.WARN_MS);
  assert.equal(boss.busyUntil, b.t + SIG.CAST_MS, 'the boss stands gathering a moment, then fights on while it falls');
  const out = untilLand(b, w.n);
  assert.equal(b.t, st.at, 'it lands on time');
  assert.ok(out.some((e) => e.kind === 'bossSig' && e.phase === 'land'));
  assert.ok(!b.warnings?.length, 'the warning is gone once it lands');
});

test('the heroes step off the marked tiles: fewer are struck than when they stand still', () => {
  const struck = (dodge: boolean) => {
    BOSS_BIG.dodge = dodge;
    let n = 0;
    for (const id of ['orcWarlord', 'boarKing', 'lichKing', 'devilLeader', 'forgeTitan', 'calBoss4']) {
      for (const seed of [1, 2, 3]) {
        const { b, boss } = bossFight(id, seed);
        for (let k = 0; k < 3; k++) {
          const w = untilWarn(b);
          if (!w) break;
          n += untilLand(b, w.n).filter((e) => e.kind === 'hit' && e.by === boss.id && e.heavy && e.src === 'skill').length;
        }
      }
    }
    BOSS_BIG.dodge = true;
    return n;
  };
  const still = struck(false);
  const moved = struck(true);
  assert.ok(still > 0);
  assert.ok(moved < still * 0.75, `dodging halves the strikes: ${moved} against ${still}`);
});

test('a hero on marked ground steps to an unmarked tile; one on safe ground stays', () => {
  const { b } = bossFight('hornedOgre');
  const w = untilWarn(b)!;
  const danger = new Set(w.tiles);
  // (the heroes see the marks a moment after they appear)
  assert.equal(dangerFor(b, b.units.find((x) => x.side === 'hero' && x.alive)!), null, 'not at once');
  b.warnings![0].from -= SIG.REACT_MS;
  const hero = b.units.find((x) => x.side === 'hero' && x.alive)!;
  // (put the hero in the middle of the marks, on a free tile)
  const spot = w.tiles.find((i) => !b.units.some((x) => x.alive && x.v * b.board.w + x.u === i))!;
  hero.u = spot % b.board.w;
  hero.v = Math.floor(spot / b.board.w);
  assert.deepEqual(dangerFor(b, hero), danger);
  const next = dodgeStep(b, hero, danger);
  assert.ok(next >= 0, 'it has a way out');
  const outside = [...Array(b.board.w * b.board.d).keys()].find((i) => !danger.has(i) && !b.units.some((x) => x.alive && x.v * b.board.w + x.u === i))!;
  hero.u = outside % b.board.w;
  hero.v = Math.floor(outside / b.board.w);
  assert.equal(dodgeStep(b, hero, danger), -1, 'safe where it is');
  // (the boss's own side never fears its marks)
  assert.equal(dangerFor(b, b.units.find((x) => x.side === 'foe')!), null);
});

test('the king’s spells answer: a Shield soaks the blow, a Blinked hero is not struck', () => {
  BOSS_BIG.dodge = false;
  try {
    // (the same fight twice: the second time the king answers the windup)
    const play = (spell?: 'shield' | 'blink') => {
      const { b, boss } = bossFight('orcWarlord', 5);
      const w = untilWarn(b)!;
      const on = new Set(w.tiles);
      const hero = b.units.find((x) => x.side === 'hero' && x.alive && on.has(x.v * b.board.w + x.u))!;
      b.spells.mana = 10;
      if (spell === 'shield') assert.ok(castSpell(b, 'shield', hero.u, hero.v));
      if (spell === 'blink') {
        // (Blink moves the most wounded hero, this one, and hides it for 1.5s: cast late in the windup, so it is still hidden as it lands)
        while (b.warnings![0].at - b.t > 1000) stepBattle(b);
        hero.hp = 1;
        const to = [...Array(b.board.w * b.board.d).keys()].find((i) => !on.has(i) && !b.units.some((x) => x.alive && x.v * b.board.w + x.u === i) && i > b.board.w * 6)!;
        assert.ok(castSpell(b, 'blink', to % b.board.w, Math.floor(to / b.board.w)));
      }
      const hp = hero.hp;
      const out = untilLand(b, w.n);
      const hit = out.filter((e) => e.kind === 'hit' && e.by === boss.id && e.to === hero.id);
      return { lost: hp - hero.hp, hit: hit.length };
    };
    const bare = play();
    const shielded = play('shield');
    assert.ok(bare.hit >= 1 && bare.lost > 0, 'the bare hero is struck');
    assert.ok(shielded.lost < bare.lost, `the shield soaks it: ${shielded.lost} against ${bare.lost}`);
    assert.equal(play('blink').hit, 0, 'the blinked hero is out of reach');
  } finally {
    BOSS_BIG.dodge = true;
  }
});

test('it lets one go at once as its health turns past 60%, and in a dragging fight the rage version is wider and named so', () => {
  const { b, boss } = bossFight('orcWarlord');
  const first = untilWarn(b)!;
  untilLand(b, first.n);
  const st = b.sigs![boss.id];
  // (well before its cooldown, its health falls past 60%)
  assert.ok(st.next > b.t + 2000);
  boss.hp = Math.round(boss.maxHp * 0.55);
  const turn = untilWarn(b)!;
  assert.ok(b.t < st.next - 2000 || turn, 'it came early');
  assert.ok(turn.n > first.n);
  // (the rage: a long fight)
  const s = SIGNATURES.orcWarlord[0];
  assert.ok(sigTiles(b, boss, s, true).length > sigTiles(b, boss, s, false).length, 'the rage version reaches further');
  untilLand(b, turn.n);
  st.born = b.t - SIG.RAGE_MS;
  st.next = b.t;
  const rage = untilWarn(b)!;
  assert.ok(rage.rage, 'enraged');
  assert.equal(rage.ms, SIG.RAGE_WARN_MS);
  assert.ok([s.rage, SIGNATURES.orcWarlord[1].rage].includes(rage.name));
});

test('a fight with signatures plays the same every time; a fight with no boss never marks a tile', () => {
  const log = (id: string) => {
    const { b } = bossFight(id, 7);
    const all: BattleEvent[] = [];
    while (b.phase === 'fight') all.push(...stepBattle(b));
    return JSON.stringify(all);
  };
  for (const id of ['lichKing', 'demonLord', 'calBoss6']) {
    const one = log(id);
    assert.ok(one.includes('"bossSig"'), `${id} lets one go`);
    assert.equal(log(id), one, `${id} replays`);
  }
  const b = readyBattle(2, 'orcs');
  fight(b);
  while (b.phase === 'fight') assert.ok(!stepBattle(b).some((e) => e.kind === 'bossSig') && !b.warnings);
});

test('with the switch off no boss lets one go', () => {
  BOSS_BIG.on = false;
  try {
    const { b } = bossFight('forgeTitan');
    assert.equal(untilWarn(b), undefined);
  } finally {
    BOSS_BIG.on = true;
  }
});
