// ULT-AUDIT (docs/notes/ult-audit.md): an ultimate's effect must show what the ability does. The owner's report (2026-11-12): Spirit
// Guardians no longer showed guardians circling the Cleric. They were still drawn, but 0.6 of a tile tall and thin, lost under everything
// else. This holds what was restored: the spirits are a fighter's size, several, circling her out past her own body, for as long as the
// aura lasts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/sim/battle';
import { AURA_MOTES } from '../src/render/movePaints';
import { auraLook } from '../src/render/toolkitLooks';
import { BFX_CLIPS } from '../src/render/blenderFxData';
import { BEAT_OWN, ULT_LASTS, ULT_LINE, ULT_LINK_MS, beatBfx, lineRun, ultLinkClip, ultLinked, ultPlace, ultSpots } from '../src/render/blenderFxRules';
import { SHOWCASES } from '../src/ultShowRules';

test('Spirit Guardians shows its guardians: spirits a fighter tall circling the Cleric for as long as the aura lasts', () => {
  const look = auraLook('Spirit Guardians');
  assert.equal(look.paint, 'spirit-guardians');
  const own = AURA_MOTES[look.paint!];
  assert.ok(own, 'the spirits have their own size and ring');
  // (the painted spirit is 0.6 of a tile: at 2.2 times it is about a fighter's height)
  assert.ok(own.mult * 0.6 >= 1.2, `a spirit is ${own.mult * 0.6} tiles tall`);
  assert.ok(own.n >= 4 && own.saver >= 3, 'four of them, three on the battery saver: still a ring of guardians');
  assert.ok(own.r >= 1 && own.r <= 2, 'they circle outside her own body, inside the aura');
  // (they are the aura's own loop: drawn while the aura lives, turning unless motion is reduced, over the fighters)
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /const own = AURA_MOTES\[sheet\];/);
  assert.match(fx, /\}, live, \{ tint: o\.tint, \.\.\.\(own \? \{ mult: own\.mult, depthOf: \(\) => 9999 \} : \{\}\) \}\);/);
  assert.match(fx, /this\.reduced \? 0 : \(performance\.now\(\) - born\) \/ \(own\?\.turn \?\? 1400\)/);
});

test('no strike has the great blow under it: each of the eight that had it has a strike of its own shape (the owner: "unique and extremely varied")', () => {
  // (a white-hot core that tore open lay under eight strikes, and for half a second those eight were one picture, a great ball in a
  // colour over the field; the director's order, 2026-11-12, is that none may be)
  for (const kind of Object.keys(SHOWCASES)) assert.ok(!BFX_CLIPS[`ult-${kind}-strike`].sc?.includes('impact'), `${kind} has the great blow`);
  // (what each of the eight is instead: a cut, a landing, a crash, a shell, meteors, a nova, a column, shells)
  const own: Record<string, string> = { samurai: 'arc+sparks', barbarian: 'crack+shockwave+gust', bloodGargoyle: 'shockwave+slab+crack', siegeBot: 'shaft+crack+smoke', wizard: 'meteors+crack+smoke', astrologer: 'implode+nova+sigil', seraph: 'pillar+wings+ring', bombardier: 'strike+flames' };
  for (const [kind, look] of Object.entries(own)) assert.equal(BFX_CLIPS[`ult-${kind}-strike`].sc!.join('+'), look, kind);
  // (and none of the eight is a ball of flame: `burst` is the fireball)
  for (const kind of Object.keys(own)) assert.ok(!BFX_CLIPS[`ult-${kind}-strike`].sc!.includes('burst'), kind);
  // (the Samurai's cut lies along his line, the Bombardier's shells fall on each foe)
  assert.equal(ultPlace('samurai'), 'line');
  assert.equal(ultPlace('bombardier'), 'each');
});

test('a strike plays where the ability lands: on each fighter it touches, round the caster, or once in the midst of what it struck', () => {
  // (a heal lands on each friend healed, a ward on each warded, a mark on each foe marked, a flurry's cut on each foe cut, the called
  // where each arrives)
  for (const kind of ['gorgon', 'kitsune', 'timeWitch', 'ranger', 'kunoichi', 'mercenary', 'beastmaster', 'illusionist']) assert.equal(ultPlace(kind), 'each', kind);
  // (a heal, a blessing, a ward on friends: on the caster and each friend helped, a line of light run out to each)
  for (const kind of ['wanderer', 'sage', 'ilyra', 'priestess', 'satyr', 'corsairSurgeon']) assert.equal(ultPlace(kind), 'friends', kind);
  // (a wall stands along the tiles it blocks)
  assert.equal(ultPlace('geomancer'), 'tiles');
  // (an aura, a ward of his own, a change, a pull towards him: round the caster)
  for (const kind of ['cleric', 'knight', 'banneret', 'warlock', 'werewolf', 'demonSwordsman', 'kraken', 'plagueDoctor']) assert.equal(ultPlace(kind), 'self', kind);
  // (a landing, a storm on its tiles, a wall where it stands: once)
  for (const kind of ['barbarian', 'wizard', 'archer', 'lightningMage', 'druid', 'lancer']) assert.equal(ultPlace(kind), 'one', kind);
  // (a cut or a breath along a line lies on the line: the Samurai's one cut was a great blow at one spot until the director's order
  // that no strike be one)
  for (const kind of ['samurai', 'dragoon']) assert.equal(ultPlace(kind), 'line', kind);
  assert.equal(ultPlace('skeleton'), 'one');
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /if \(place === 'self'\) \{/);
  assert.match(fx, /\} else if \(place !== 'one'\) \{/);
  // (Spirit Guardians' strike is the spirits arriving, with the ring they circle in: no core, no rubble)
  assert.deepEqual(BFX_CLIPS['ult-cleric-strike'].sc, ['souls', 'motes', 'ring']);
});

test('with the colour taken out no two heroes strike alike, wind up alike or leave the same aftermath: each has its own scenes, in its own order', () => {
  for (const stage of ['strike', 'windup', 'aftermath'] as const) {
    const seen = new Map<string, string>();
    for (const kind of Object.keys(SHOWCASES)) {
      const c = BFX_CLIPS[`ult-${kind}-${stage}`];
      const look = c.sc!.join('+');
      assert.ok(look.includes('+'), `${kind}'s ${stage} is one scene alone`);
      assert.ok(!seen.has(look), `${kind} and ${seen.get(look)} ${stage} alike: ${look}`);
      seen.set(look, kind);
    }
  }
  // (a wind-up is the ability beginning, not the circle and pillar every "wave" once shared)
  const pillars = Object.keys(SHOWCASES).filter((kind) => BFX_CLIPS[`ult-${kind}-windup`].sc!.join('+').startsWith('sigil+motes+pillar'));
  assert.deepEqual(pillars, []);
  assert.deepEqual(BFX_CLIPS['ult-cleric-windup'].sc, ['ring', 'souls']);
  assert.deepEqual(BFX_CLIPS['ult-lightningMage-windup'].sc, ['cloud', 'sparks']);
  assert.deepEqual(BFX_CLIPS['ult-knight-windup'].sc, ['slab', 'dome']);
});

test('a strike on each one the ability touched finds them: the friends helped (and the caster), the tiles taken, the foes struck', () => {
  const t = { struck: [7, 8], helped: [2, 3, 1], tiles: [{ u: 4, v: 5 }, { u: 5, v: 5 }] };
  // (a heal lands on the caster and each friend, whoever it also struck; the caster once)
  assert.deepEqual(ultSpots('friends', t, 1, 5), [{ unit: 1 }, { unit: 2 }, { unit: 3 }]);
  assert.deepEqual(ultSpots('friends', { struck: [], helped: [], tiles: [] }, 1, 5), [{ unit: 1 }]);
  // (a wall's slabs stand on its tiles)
  assert.deepEqual(ultSpots('tiles', t, 1, 5), [{ u: 4, v: 5 }, { u: 5, v: 5 }, { unit: 1 }, { unit: 2 }, { unit: 3 }]);
  // (a wall that found no line to stand on: what is left of the ability, its shields, is on the caster and each friend)
  assert.deepEqual(ultSpots('tiles', { struck: [7], helped: [2], tiles: [] }, 1, 5), [{ unit: 1 }, { unit: 2 }]);
  // (a mark, a cut: the foes struck; with none, the tiles (the called arrive on them); with none, the friends; with none, the caster)
  assert.deepEqual(ultSpots('each', t, 1, 5), [{ unit: 7 }, { unit: 8 }]);
  assert.deepEqual(ultSpots('each', { struck: [], helped: [2], tiles: [{ u: 1, v: 1 }] }, 1, 5), [{ u: 1, v: 1 }]);
  assert.deepEqual(ultSpots('each', { struck: [], helped: [2], tiles: [] }, 1, 5), [{ unit: 2 }]);
  assert.deepEqual(ultSpots('each', { struck: [], helped: [], tiles: [] }, 1, 5), [{ unit: 1 }]);
  // (the battery saver's cap holds)
  assert.equal(ultSpots('each', { struck: [1, 2, 3, 4, 5, 6], helped: [], tiles: [] }, 9, 2).length, 2);
  // (a healer's light runs out from her hands to each friend, the Gorgon's gaze to each foe; a cut does not)
  for (const kind of ['wanderer', 'sage', 'priestess', 'gorgon']) assert.ok(ultLinked(kind), kind);
  for (const kind of ['kunoichi', 'samurai', 'cleric', 'beastmaster']) assert.ok(!ultLinked(kind), kind);
  // (a blessing's line is sparks of light; the Gorgon's is her gaze, a row of eyes, a clip of its own that the pipeline has made)
  assert.equal(ultLinkClip('priestess'), 'link');
  assert.equal(ultLinkClip('gorgon'), 'gaze');
  assert.equal(beatBfx('gaze', 'poison'), 'beat-gaze');
  // (High Noon: each of the six shots is a bullet's path of sparks from her to its target, then a small sharp impact there)
  assert.ok(ultLinked('gunslinger'));
  assert.equal(ultLinkClip('gunslinger'), 'blow');
  assert.deepEqual(BFX_CLIPS['ult-gunslinger-strike'].sc, ['sparks', 'ring']);
  // (no fire is left on the ground by bullets)
  assert.ok(!BFX_CLIPS['ult-gunslinger-aftermath'].sc!.includes('flames'));
});

test('Vael\'s totality lasts: a black sun hangs over him for its eight seconds, his sweep is gold; Ilyra\'s is wings and a halo, not a dome; the Kunoichi\'s one cut and a mark', () => {
  assert.deepEqual(ULT_LASTS.vael, { clip: 'aura-eclipse', ms: 8000 });
  assert.ok(BFX_CLIPS['aura-eclipse'].loop);
  assert.equal(BFX_CLIPS['ult-vael-strike'].el, 'holy');
  assert.ok(BFX_CLIPS['ult-vael-windup'].sc!.includes('eclipse'));
  assert.match(readFileSync('src/render/fx.ts', 'utf8'), /this\.bfxStand\(lasts\.clip, this\.root, \.\.\.over\(\), \(\) => b\.t < until && me\.alive/);
  assert.deepEqual(BFX_CLIPS['ult-ilyra-strike'].sc, ['wings', 'halo']);
  for (const kind of ['ilyra', 'seraph', 'samurai']) assert.ok(!BFX_CLIPS[`ult-${kind}-strike`].sc!.includes('dome'), kind);
  assert.deepEqual(BFX_CLIPS['ult-kunoichi-strike'].sc, ['arc', 'cross', 'ring']);
  assert.ok(ULT_LINK_MS >= 100 && ULT_LINK_MS <= 400);
  // (what the abilities are: beasts bursting out where each is called, stone creeping over each foe, slabs along the wall's tiles, shields)
  assert.deepEqual(BFX_CLIPS['ult-beastmaster-strike'].sc, ['beast', 'trail']);
  assert.deepEqual(BFX_CLIPS['ult-beastmaster-windup'].sc, ['eyes', 'swarm']);
  assert.deepEqual(BFX_CLIPS['ult-gorgon-strike'].sc, ['crystal', 'smoke']);
  assert.deepEqual(BFX_CLIPS['ult-gorgon-windup'].sc, ['vines', 'eye']);
  assert.deepEqual(BFX_CLIPS['ult-geomancer-strike'].sc, ['slab', 'crack']);
  assert.equal(BFX_CLIPS['ult-sage-strike'].sc![0], 'dome');
});

test('on the caster a showcase gathers with the hero\'s own wind-up, not one circle for every hero; its call and finish are small', () => {
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  // (the hero's kind reaches the beat from the showcase)
  assert.match(readFileSync('src/ultShow.ts', 'utf8'), /fx\.showBeat\(b\.kind, p\[0\], p\[1\], \{ tall, el, hero: plan\.kind \}\);/);
  assert.match(fx, /if \(own && this\.bfxUlt\(own, 'windup', x, y, BEAT_OWN\.GATHER_MS\)\) return true;/);
  assert.match(fx, /if \(own\) return B\('dust', x, y\);/);
  assert.match(fx, /return own \? B\('appear', x, y, \{ mult: BEAT_OWN\.FINISH \}\) : B\('nova', x, y\);/);
  // (every hero has a wind-up of its own to gather with)
  for (const kind of Object.keys(SHOWCASES)) assert.ok(BFX_CLIPS[`ult-${kind}-windup`], kind);
  assert.ok(BEAT_OWN.GATHER_MS >= 1000 && BEAT_OWN.FINISH < 1);
});

test('breath down a line burns along the line; a fleet\'s broadside is one picture, the ghost ship and its shot falling in front of it', () => {
  assert.equal(ultPlace('dragoon'), 'line');
  // (it was three bursts, one on each foe; the director's order, 2026-11-12: its own scene, the ship's side and cannon shot arcing in)
  assert.equal(ultPlace('dreadPirate'), 'one');
  // (a line: its tiles and nothing else; with none, the foes struck)
  const t = { struck: [7, 8], helped: [2], tiles: [{ u: 1, v: 2 }, { u: 1, v: 3 }, { u: 1, v: 4 }] };
  assert.deepEqual(ultSpots('line', t, 1, 5), [{ u: 1, v: 2 }, { u: 1, v: 3 }, { u: 1, v: 4 }]);
  assert.deepEqual(ultSpots('line', { struck: [7], helped: [2], tiles: [] }, 1, 5), [{ unit: 7 }]);
});

test('a strike along a line runs out from its caster: nearest first, each later and larger, so a breath leaves the mouth and widens', () => {
  // (three tiles of a line given out of order; the caster stands at the origin)
  const run = lineRun([[90, 0], [30, 0], [60, 0]], 0, 0);
  assert.deepEqual(run.map((r) => r.i), [1, 2, 0]);
  assert.deepEqual(run.map((r) => r.delay), [0, ULT_LINE.LAG, 2 * ULT_LINE.LAG]);
  assert.ok(run[0].size < run[1].size && run[1].size < run[2].size);
  assert.equal(run[0].size, ULT_LINE.FROM);
  // (a long line stops growing)
  const long = lineRun(Array.from({ length: 12 }, (_, i) => [i * 10, 0] as const), 0, 0);
  assert.equal(long[11].size, ULT_LINE.MAX);
  // (the Dragoon's breath and the Samurai's cut are laid so; the Dread Pirate's broadside is one picture, the ship and its shot)
  assert.equal(ultPlace('dragoon'), 'line');
  assert.equal(ultPlace('dreadPirate'), 'one');
  assert.deepEqual(BFX_CLIPS['ult-dreadPirate-strike'].sc, ['broadside', 'crack']);
  assert.match(readFileSync('src/render/fx.ts', 'utf8'), /for \(const r of lineRun\(shown, caster\.x, caster\.y\)\)/);
});
