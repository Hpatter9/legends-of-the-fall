import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, fight, playOut, stepBattle, startBattle, place, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, KITS, afterBlow, onStrike, tickStatus } from '../src/sim/abilities';
import { ALL_HEROES, HEROES, UNITS } from '../src/sim/units';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import layout from '../src/art/units/sheets.json';

const NEW = ['ninjaMonk', 'peasant', 'lightningMage', 'wanderer', 'kitsune', 'karasu', 'yamabushi'];

function arena(): Battle {
  const b = startBattle(3);
  for (const t of b.board.tiles) (t.h = 0), (t.rock = false);
  b.units = [];
  b.phase = 'fight';
  return b;
}
const spawn = (b: Battle, def: string, u: number, v: number, charge = 0): Unit => {
  const x = addUnit(b, def, u, v);
  x.charge = charge;
  return x;
};
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end; ) out.push(...stepBattle(b));
  return out;
};

test('the seven new heroes are registered with kits, rarities and sensible scale', () => {
  assert.equal(HEROES.length, 5);
  for (const id of NEW) {
    assert.ok(ALL_HEROES.includes(id), id);
    const d = UNITS[id];
    assert.equal(d.side, 'hero');
    assert.ok(d.rarity, id);
    assert.ok(KITS[id].skill.name && KITS[id].passive.name, id);
    const fig = (layout as Record<string, { figure: number }>)[d.sheet].figure * d.scale;
    assert.ok(fig > 40 && fig < 52, `${id} ${fig}`);
  }
});

test('Thousand Fists strikes three times and stuns', () => {
  const b = arena();
  const m = spawn(b, 'ninjaMonk', 3, 5, CHARGE_MAX);
  const s = spawn(b, 'skeleton', 3, 4);
  const out = run(b, 100);
  assert.equal(out.filter((e) => e.kind === 'hit' && e.src === 'skill').length, 3);
  assert.ok(s.busyUntil >= m.busyUntil + 500 || s.busyUntil >= 1500);
});

test('Iron Fists ignore defence', () => {
  const b = arena();
  const m = spawn(b, 'ninjaMonk', 3, 5);
  const s = spawn(b, 'skeleton', 3, 4);
  s.facing = 1;
  const hp = s.hp;
  const out = run(b, 700);
  const hit = out.find((e) => e.kind === 'hit' && e.by === m.id) as Extract<BattleEvent, { kind: 'hit' }>;
  assert.ok(hit && hit.dmg >= 15 - (UNITS.skeleton.def - 3) - 5);
  assert.ok(s.hp < hp);
});

test('Peasant reaches two tiles and grows tougher beside allies', () => {
  assert.equal(UNITS.peasant.range, 2);
  const b = arena();
  const p = spawn(b, 'peasant', 3, 5);
  const foe = spawn(b, 'skeleton', 3, 2);
  const alone = onStrike(b, foe, p, 100, 'blow', false, [])!;
  spawn(b, 'knight', 2, 5);
  spawn(b, 'knight', 4, 5);
  const crowded = onStrike(b, foe, p, 100, 'blow', false, [])!;
  assert.ok(crowded < alone);
  assert.equal(crowded, 86);
});

test('Hold the Line guards allies within two tiles', () => {
  const b = arena();
  const p = spawn(b, 'peasant', 3, 5, CHARGE_MAX);
  const ally = spawn(b, 'knight', 4, 6);
  const far = spawn(b, 'knight', 0, 8);
  spawn(b, 'skeleton', 3, 3);
  run(b, 100);
  assert.ok((p.guardUntil ?? 0) > b.t && (ally.guardUntil ?? 0) > b.t);
  assert.equal(far.guardUntil, undefined);
});

test('Chain Lightning jumps through foes, weaker each time', () => {
  const b = arena();
  spawn(b, 'lightningMage', 3, 8, CHARGE_MAX);
  const f = [spawn(b, 'skeleton', 3, 5), spawn(b, 'skeleton', 4, 5), spawn(b, 'skeleton', 5, 5), spawn(b, 'skeleton', 6, 7)];
  const out = run(b, 100);
  const hits = out.filter((e) => e.kind === 'hit' && e.src === 'skill') as Extract<BattleEvent, { kind: 'hit' }>[];
  assert.ok(hits.length >= 3);
  assert.ok(hits[1].dmg < hits[0].dmg);
  assert.ok(new Set(hits.map((h) => h.to)).size === hits.length);
  assert.ok(out.some((e) => e.kind === 'arc'));
  assert.ok(f.some((x) => x.hp < x.maxHp));
});

test('Static arcs a blow to a second foe', () => {
  const b = arena();
  const m = spawn(b, 'lightningMage', 3, 8);
  const a = spawn(b, 'skeleton', 3, 6);
  const c = spawn(b, 'skeleton', 4, 6);
  let n = 0;
  for (let i = 0; i < 40; i++) {
    const out: BattleEvent[] = [];
    afterBlow(b, m, a, false, 30, out);
    n += out.filter((e) => e.kind === 'arc').length;
  }
  assert.ok(n > 3 && n < 25);
  assert.ok(c.hp < c.maxHp);
});

test('Mending Light heals the most hurt ally, never past full', () => {
  const b = arena();
  const w = spawn(b, 'wanderer', 3, 8);
  const k = spawn(b, 'knight', 3, 6);
  const s = spawn(b, 'samurai', 4, 6);
  k.hp = 100;
  s.hp = s.maxHp - 3;
  tickStatus(b, []);
  b.t += 2500;
  const out: BattleEvent[] = [];
  tickStatus(b, out);
  assert.equal(k.hp, 100 + Math.round(UNITS.wanderer.atk * 1.2));
  assert.equal(s.hp, s.maxHp - 3);
  assert.ok(w.hp <= w.maxHp);
});

test('Sanctuary heals and shields everyone, only when someone is hurt', () => {
  const b = arena();
  spawn(b, 'wanderer', 3, 8, CHARGE_MAX);
  const k = spawn(b, 'knight', 3, 6);
  spawn(b, 'skeleton', 3, 1);
  run(b, 100);
  assert.equal(k.guardUntil, undefined);
  k.hp = 50;
  run(b, 2000);
  assert.ok(k.hp > 50 && (k.guardUntil ?? 0) > b.t);
});

test('Fox Charm turns a foe on its own side', () => {
  const b = arena();
  spawn(b, 'kitsune', 3, 8, CHARGE_MAX);
  const strong = spawn(b, 'skeleton', 3, 6);
  const other = spawn(b, 'spearman', 3, 5);
  strong.power = 3;
  run(b, 3000);
  assert.ok(strong.charmUntil !== undefined);
  assert.ok(other.hp < other.maxHp, 'the charmed foe struck its friend');
});

test('Spirit Drain heals the kitsune', () => {
  const b = arena();
  const k = spawn(b, 'kitsune', 3, 6);
  k.hp = 100;
  afterBlow(b, k, spawn(b, 'skeleton', 3, 5), false, 40, []);
  assert.equal(k.hp, 110);
});

test('Karasu Tengu flies up cliffs and dives on shooters', () => {
  const b = arena();
  b.board.tiles[5 * b.board.w + 3].h = 6;
  const k = spawn(b, 'karasu', 3, 7, CHARGE_MAX);
  spawn(b, 'skeleton', 3, 4);
  const shooter = spawn(b, 'boneArcher', 0, 0);
  const out = run(b, 100);
  assert.ok(out.some((e) => e.kind === 'blink' && e.by === k.id));
  assert.ok(shooter.hp < shooter.maxHp);
  assert.ok(Math.abs(k.u - 0) + Math.abs(k.v - 0) === 1);
  // flying: a tall step costs no extra time
  const b2 = arena();
  b2.board.tiles[6 * b2.board.w + 3].h = 6;
  const k2 = spawn(b2, 'karasu', 3, 7);
  spawn(b2, 'skeleton', 3, 0);
  run(b2, 100);
  assert.equal(k2.v, 6);
  assert.equal(k2.busyUntil, b2.t + UNITS.karasu.moveMs);
});

test('Hunter\'s Eye: blows hit shooters harder', () => {
  const b = arena();
  const k = spawn(b, 'karasu', 3, 5);
  const a = spawn(b, 'boneArcher', 3, 4);
  const s = spawn(b, 'skeleton', 4, 5);
  const dmgs: Record<number, number> = {};
  for (const target of [a, s]) {
    const bb = arena();
    const kk = spawn(bb, 'karasu', 3, 5);
    const t = spawn(bb, target.def, 3, 4);
    t.facing = 1;
    t.hp = t.maxHp = 9999;
    const out = run(bb, 1000);
    const hit = out.find((e) => e.kind === 'hit' && e.by === kk.id) as Extract<BattleEvent, { kind: 'hit' }>;
    dmgs[target.id] = hit.dmg / (24 - UNITS[target.def].def);
  }
  assert.ok(dmgs[a.id] > dmgs[s.id] * 1.2);
  assert.ok(k.alive);
});

test('Wind Gust shoves foes a tile and a drop of two hurts', () => {
  const b = arena();
  b.board.tiles[4 * b.board.w + 3].h = 3;
  b.board.tiles[3 * b.board.w + 3].h = 0;
  b.board.tiles[4 * b.board.w + 3].h = 0;
  const y = spawn(b, 'yamabushi', 3, 5, CHARGE_MAX);
  const f = spawn(b, 'skeleton', 3, 4);
  b.board.tiles[3 * b.board.w + 3].h = -2;
  run(b, 100);
  assert.equal(f.v, 3);
  assert.ok(f.hp < f.maxHp - 20 + 1, 'fall damage on top of the gust');
  assert.ok(y.alive);
});

test('Mountain Breath heals each second', () => {
  const b = arena();
  const y = spawn(b, 'yamabushi', 3, 8);
  y.hp = 100;
  spawn(b, 'skeleton', 3, 0);
  b.t = 900;
  const out: BattleEvent[] = [];
  b.t = 1000;
  tickStatus(b, out);
  assert.equal(y.hp, 100 + Math.round(y.maxHp * 0.02));
});

test('any team of five new heroes is about as strong as the starting five', () => {
  const wins = (ids: string[]) => {
    let w = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const b = startBattle(seed);
      const spots: [number, number][] = [];
      for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
      ids.forEach((id, i) => place(b, id, ...spots[(i * 3) % spots.length]));
      fight(b);
      if (playOut(b).phase === 'won') w++;
    }
    return w;
  };
  const base = wins([...HEROES]);
  // (a tank first, as with the knight)
  for (const team of [['yamabushi', 'ninjaMonk', 'peasant', 'lightningMage', 'wanderer'], ['peasant', 'yamabushi', 'kitsune', 'karasu', 'lightningMage'], ['yamabushi', 'kitsune', 'wanderer', 'karasu', 'lightningMage']]) {
    const w = wins(team);
    assert.ok(w >= base * 0.6 && w <= base * 1.4, `${team} won ${w}, base ${base}`);
  }
});
