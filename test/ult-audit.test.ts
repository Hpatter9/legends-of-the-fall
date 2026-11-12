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
import { BEAT_OWN, ULT_LINK_MS, ultLinked, ultPlace, ultSpots } from '../src/render/blenderFxRules';
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

test('the great blow is only under abilities that are one great blow; a heal, a blessing, a ward, a mark, a summoning, a change and an aura have none', () => {
  const great = Object.keys(SHOWCASES).filter((kind) => BFX_CLIPS[`ult-${kind}-strike`].sc?.[0] === 'impact');
  // (a cut, a leap's landing, a crash from on high, shells, meteors, supernovas: nine of the seventy)
  assert.deepEqual(great.sort(), ['astrologer', 'barbarian', 'bloodGargoyle', 'bombardier', 'dreadPirate', 'samurai', 'seraph', 'siegeBot', 'wizard']);
  for (const kind of Object.keys(SHOWCASES)) {
    const style = SHOWCASES[kind].style;
    // (no showcase that blesses, calls a pack or changes its hero is a great blow)
    if (['bless', 'pack', 'change'].includes(style)) assert.ok(!great.includes(kind) || kind === 'seraph', `${kind} (${style}) has the great blow`);
  }
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
  // (a great blow, a storm on its tiles, a wall where it stands: once)
  for (const kind of ['samurai', 'barbarian', 'wizard', 'archer', 'lightningMage', 'druid', 'lancer']) assert.equal(ultPlace(kind), 'one', kind);
  assert.equal(ultPlace('skeleton'), 'one');
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /if \(place === 'self'\) \{/);
  assert.match(fx, /\} else if \(place !== 'one'\) \{/);
  // (Spirit Guardians' strike is the spirits arriving, with the ring they circle in: no core, no rubble)
  assert.deepEqual(BFX_CLIPS['ult-cleric-strike'].sc, ['souls', 'motes', 'ring']);
});

test('with the colour taken out no two heroes strike alike or wind up alike: each has its own scenes, in its own order', () => {
  for (const stage of ['strike', 'windup'] as const) {
    const seen = new Map<string, string>();
    for (const kind of Object.keys(SHOWCASES)) {
      const c = BFX_CLIPS[`ult-${kind}-${stage}`];
      // (the great blow under a strike is the same for all nine that have it: what is the hero's own is what lies over it)
      const look = c.sc!.filter((sc) => sc !== 'impact').join('+');
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
  assert.ok(ULT_LINK_MS >= 100 && ULT_LINK_MS <= 400);
  // (what the abilities are: beasts bursting out where each is called, stone creeping over each foe, slabs along the wall's tiles, shields)
  assert.deepEqual(BFX_CLIPS['ult-beastmaster-strike'].sc, ['beast', 'crack']);
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
