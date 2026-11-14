// BLENDER-FX (docs/notes/blender-fx.md): the Blender-rendered, pixelated effect sheets. The owner's call: every battle effect is to be one
// of these, so everything matches. This holds the pipeline's manifest together (every clip inside its atlas, anchored, timed), the rules
// that play a clip (frames, reduced motion's one held frame, the battery saver's budget), and the first batch: every king's spell has its
// own rendered sheets, no two of them the same scene in the same element.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import '../src/sim/battle';
import { BFX_CLIPS, BFX_CORE, BFX_DENSITY, BFX_GLOW_SHRINK, BFX_PX, BFX_SOFT } from '../src/render/blenderFxData';
import {
  BFX_FADE_MS, BFX_SCALE, BFX_WALL_SPELL, SPELL_LAY, SPELL_STANDS, ULT_BFX, bfxAlpha, bfxBox, bfxBudget, bfxCentre, bfxClip, bfxFrame, bfxLife, bfxRect, bfxStage, spellBfx,
  standPhase, ultBfx, ultPlace, beatBfx, beatKeys, beatLine, BEAT_LINE, type BeatClip,
  type BfxClip, type SpellPartName,
} from '../src/render/blenderFxRules';
import { SPELL_IDS, SPELLS, WALLS } from '../src/sim/spells';
import { spellTiles } from '../src/render/fxPlace';
import { TW } from '../src/render/iso';
import { makeBoard } from '../src/sim/board';
import { STAGE_ART, STAGE_NAMES, ULT_STAGES, ultWeight } from '../src/ultStageRules';
import { SHOWCASES } from '../src/ultShowRules';
import { ELEMENTS } from '../src/render/fxRules';


const PARTS: SpellPartName[] = ['cast', 'hit', 'fly', 'land', 'stand'];
const clips = Object.entries(BFX_CLIPS);

test('the manifest holds together: every clip lies inside its atlas, has its frames, its anchor and its time', () => {
  assert.ok(clips.length >= 55, `${clips.length} clips`);
  for (const [key, c] of clips) {
    const [aw, ah] = BFX_PX[c.a] ?? [0, 0];
    assert.ok(aw > 0, `${key}: atlas ${c.a}`);
    assert.ok(c.n >= 6 && c.cols >= 1 && c.w > 0 && c.h > 0, `${key}: frames`);
    for (let i = 0; i < c.n; i++) {
      const [x, y, w, h] = bfxRect(c, i);
      assert.ok(x >= 0 && y >= 0 && x + w <= aw && y + h <= ah, `${key}: frame ${i} outside its atlas`);
    }
    // (HIT-SPARKS: a blow's spark is over in under 300 ms, the director's order; everything else plays 400 ms and more)
    // (SWINGS: a weapon's stroke and a gun's flash are of the same quick kind as the spark they come with)
    const quick = key.startsWith('hit-') || key.startsWith('swing-') || key === 'shot-muzzle';
    assert.ok(quick ? c.ms >= 150 && c.ms < 300 : c.ms >= 400 && c.ms <= 6000, `${key}: ${c.ms} ms`);
    assert.ok(c.hold >= 0 && c.hold < c.n, `${key}: its held frame`);
    // (the tile's middle sits across the frame's width; a tall clip's may sit below its frames' lowest pixel, never far off)
    assert.ok(c.ax > -c.w && c.ax < 2 * c.w && c.ay > -c.h && c.ay < 2 * c.h, `${key}: anchor ${c.ax}, ${c.ay}`);
    if (c.g) {
      const [gw, gh] = BFX_SOFT[c.g.a] ?? [0, 0];
      const [x, y, w, h] = bfxRect(c.g, c.n - 1);
      assert.ok(x + w <= gw && y + h <= gh, `${key}: its glow outside the glow atlas`);
    }
  }
  // (no two clips' blocks overlap in an atlas)
  for (let a = 0; a < BFX_PX.length; a++) {
    const blocks = clips.filter(([, c]) => c.a === a).map(([key, c]) => ({ key, x0: c.x, y0: c.y, x1: c.x + c.cols * c.w, y1: c.y + Math.ceil(c.n / c.cols) * c.h }));
    for (let i = 0; i < blocks.length; i++)
      for (let j = i + 1; j < blocks.length; j++) {
        const p = blocks[i], q = blocks[j];
        assert.ok(p.x1 <= q.x0 || q.x1 <= p.x0 || p.y1 <= q.y0 || q.y1 <= p.y0, `${p.key} and ${q.key} overlap`);
      }
  }
});

test('the atlases are in the repo, small enough for a phone, and the build lists them for offline play', () => {
  const dir = 'src/art/fx/blender';
  const files = readdirSync(dir).filter((f) => f.endsWith('.webp')).sort();
  assert.deepEqual(files, [...BFX_PX.map((_, i) => `px-${i}.webp`), ...BFX_SOFT.map((_, i) => `soft-${i}.webp`)].sort());
  // (2048 a side at most: what every phone's graphics can hold; an ultimate's strike is too large a block for 1024)
  for (const [w, h] of [...BFX_PX, ...BFX_SOFT]) assert.ok(w <= 2048 && h <= 2048, `an atlas of ${w}x${h}`);
  const build = readFileSync('build.mjs', 'utf8');
  assert.match(build, /BLENDER_FX_FILES\.push\(`fx\/blender\/\$\{f\}`\)/);
  assert.match(build, /\$\{BLENDER_FX_FILES\.map/, 'the service worker\'s FILES list them');
  // (the sources that make them are kept, so anything can be rendered again)
  for (const f of ['build.py', 'lib.py', 'scenes.py', 'effects.py', 'render.py', 'pixelate.py', 'pack.py']) assert.ok(existsSync(`tools/blender-fx/${f}`), f);
});

test('the pixels are the heroes\' size: a tile is 45 of an effect\'s pixels, drawn whole', () => {
  assert.equal(BFX_DENSITY, 45);
  assert.ok(Math.abs(BFX_SCALE - TW / 45) < 1e-9);
  assert.equal(BFX_GLOW_SHRINK, 4);
  // (the art source is drawn with hard pixels: the loader asks for nearest sampling on the pixel atlases and smooth on the glows)
  const art = readFileSync('src/render/blenderFxArt.ts', 'utf8');
  assert.match(art, /Texture\.from\(pic\);\n\s+base\.source\.style\.scaleMode = 'nearest';/);
  assert.match(art, /soft-\$\{i\}\.webp`\)\);\n\s+base\.source\.style\.scaleMode = 'linear';/);
});

const clip = (over: Partial<BfxClip> = {}): BfxClip => ({ a: 0, x: 0, y: 0, w: 40, h: 30, n: 10, cols: 5, ax: 20, ay: 24, ms: 1000, loop: false, hold: 6, layer: 'over', el: 'fire', ...over });

test('a clip played once runs through its frames in its time and holds its last', () => {
  const c = clip();
  assert.equal(bfxFrame(c, 0, false), 0);
  assert.equal(bfxFrame(c, 99, false), 0);
  assert.equal(bfxFrame(c, 100, false), 1);
  assert.equal(bfxFrame(c, 950, false), 9);
  assert.equal(bfxFrame(c, 5000, false), 9);
  assert.equal(bfxFrame(c, -50, false), 0);
  // (slowed to half speed, each frame lasts twice as long)
  assert.equal(bfxFrame(c, 199, false, false, 2), 0);
  assert.equal(bfxFrame(c, 200, false, false, 2), 1);
  assert.equal(bfxLife(c), 1000);
  assert.equal(bfxLife(c, 2), 2000);
  assert.deepEqual(bfxRect(c, 7), [80, 30, 40, 30]);
});

test('a loop goes round; the battery saver steps it at half its rate', () => {
  const c = clip({ loop: true, hold: 0 });
  assert.equal(bfxFrame(c, 1000, false), 0);
  assert.equal(bfxFrame(c, 1350, false), 3);
  const seen = new Set(Array.from({ length: 40 }, (_, i) => bfxFrame(c, i * 50, false, true)));
  assert.deepEqual([...seen].sort((a, b) => a - b), [0, 2, 4, 6, 8]);
  assert.deepEqual(bfxBudget(false), { glow: true, hits: 8 });
  assert.deepEqual(bfxBudget(true), { glow: false, hits: 3 });
});

test('reduced motion holds a clip\'s one readable frame, steady, and brings it in and out softly', () => {
  const c = clip();
  for (let t = 0; t <= 1000; t += 37) assert.equal(bfxFrame(c, t, true), 6);
  assert.equal(bfxFrame(clip({ loop: true, hold: 0 }), 730, true), 0);
  // (moving, a clip's own frames carry its coming and going; held, its one frame fades in and out so it does not pop)
  assert.equal(bfxAlpha(500, 1000, false), 1);
  assert.equal(bfxAlpha(0, 1000, true), 0);
  assert.equal(bfxAlpha(BFX_FADE_MS / 2, 1000, true), 0.5);
  assert.equal(bfxAlpha(500, 1000, true), 1);
  assert.ok(bfxAlpha(1000 - BFX_FADE_MS / 4, 1000, true) < 0.3);
  // (every clip's held frame shows something: the pipeline picks the fullest frame of a clip played once)
  for (const [key, c2] of clips) if (!c2.loop) assert.ok(c2.hold > 0, `${key} holds its empty first frame`);
});

test('a clip stands on its tile: its box runs from its anchor, at the heroes\' pixel size', () => {
  const c = clip();
  const [l, t, r, b] = bfxBox(c, 100, 200);
  assert.ok(Math.abs(l - (100 - 20 * BFX_SCALE)) < 1e-9 && Math.abs(r - (100 + 20 * BFX_SCALE)) < 1e-9);
  assert.ok(Math.abs(t - (200 - 24 * BFX_SCALE)) < 1e-9 && Math.abs(b - (200 + 6 * BFX_SCALE)) < 1e-9);
  // (every spell's clip stands with its tile's middle inside or just under its frames, in the lower part for one that stands up)
  for (const [key, c2] of clips) if (c2.h > c2.w * 1.3) assert.ok(c2.ay > c2.h * 0.5, `${key}: a tall clip anchored at ${c2.ay} of ${c2.h}`);
});

test('a staged clip says which stage a frame is in (a wind-up, a strike, an aftermath)', () => {
  const c = clip({ n: 30, cuts: [[0, 10], [10, 16], [16, 29]] });
  assert.equal(bfxStage(c, 0), 0);
  assert.equal(bfxStage(c, 9), 0);
  assert.equal(bfxStage(c, 10), 1);
  assert.equal(bfxStage(c, 16), 2);
  assert.equal(bfxStage(c, 29), 2);
  assert.equal(bfxStage(clip(), 5), 0);
  // (the catalogue's staged clips carry their stages)
  const staged = clips.filter(([, c2]) => c2.cuts);
  assert.ok(staged.length >= 1);
  for (const [key, c2] of staged) for (const [from, to] of c2.cuts!) assert.ok(from >= 0 && to < c2.n && from <= to, key);
});

/** The scene that carries each spell's own look (its leading part's, in `tools/blender-fx/effects.py`): no two the same. */
const LEAD: Record<string, string> = {
  heal: 'motes', meteor: 'meteor', haste: 'spiral', shield: 'dome', smite: 'strike', chain: 'bolt', poison: 'cloud', frost: 'nova', rally: 'flare', quake: 'crack',
  resurrect: 'halo', cleanse: 'rain', blink: 'portal', hex: 'implode', lance: 'beam', renewal: 'swarm', deepfreeze: 'crystal', warcry: 'shout', bulwark: 'slab',
  wolves: 'claws', starfall: 'comet', firewall: 'wall', icewall: 'palisade', shatter: 'shatter', gale: 'gust', thunderclap: 'shockwave', snare: 'vines', charm: 'hearts',
  foresight: 'eye', sunbeam: 'shaft', venom: 'bite', mirage: 'veil', drain: 'siphon', bonewall: 'ribs', raisedead: 'souls',
};

test('every king\'s spell has its own rendered sheets, and each leads with a scene no other spell leads with', () => {
  const recipe = readFileSync('tools/blender-fx/effects.py', 'utf8').split('\n');
  assert.deepEqual(Object.keys(LEAD).sort(), [...SPELL_IDS].sort());
  assert.equal(new Set(Object.values(LEAD)).size, SPELL_IDS.length, '35 spells, 35 scenes');
  for (const id of SPELL_IDS) {
    const parts = PARTS.filter((p) => spellBfx(id, p));
    assert.ok(parts.length >= 1, `${id} has no rendered part`);
    // (a spell that goes everywhere touches each fighter, or is cast at their middle)
    if (SPELLS[id].target === 'all') assert.ok(spellBfx(id, 'hit') || spellBfx(id, 'cast'), id);
    // (its leading scene is in one of its parts' recipes, as the scene or as a stage)
    const lines = recipe.filter((l) => l.startsWith(`spell('${id}', `));
    assert.equal(lines.length, parts.length, `${id}: the recipe's parts and the manifest's`);
    assert.ok(lines.some((l) => l.includes(`'${LEAD[id]}'`)), `${id} leads with ${LEAD[id]}`);
  }
});

test('a spell\'s parts fit how it works: what falls flies and lands, a wall stands, a line is laid tile by tile', () => {
  for (const id of ['meteor', 'starfall'] as const) {
    assert.ok(bfxClip(spellBfx(id, 'fly')!)!.loop, `${id} flies as a loop`);
    assert.ok(!bfxClip(spellBfx(id, 'land')!)!.loop);
  }
  for (const [kind, id] of Object.entries(BFX_WALL_SPELL)) {
    assert.ok(Object.values(WALLS).some((w) => w.kind === kind), kind);
    assert.ok(bfxClip(spellBfx(id!, 'stand')!)!.loop, `${id} stands as a loop`);
    assert.equal(SPELL_STANDS[id!], 'wall');
  }
  assert.equal(SPELL_STANDS.poison, 'cloud');
  // (a standing clip is one tile's worth: no wider than a tile and a half)
  for (const id of Object.keys(SPELL_STANDS) as (keyof typeof SPELL_STANDS)[]) assert.ok(bfxClip(spellBfx(id, 'stand')!)!.w <= BFX_DENSITY * 1.5, id);
  // (the Lance runs down its column and the Sunbeam along its row: one piece a tile, each a beat after the one before)
  const board = makeBoard(1);
  assert.ok(SPELL_LAY.lance?.tiles && SPELL_LAY.lance.flip && spellTiles(board, 'lance', 3, 5).every((t) => t.u === 3));
  assert.ok(SPELL_LAY.sunbeam?.tiles && !SPELL_LAY.sunbeam.flip && spellTiles(board, 'sunbeam', 3, 5).every((t) => t.v === 5));
  // (the lights keep their glow: heals, holy and lightning)
  for (const key of ['spell-heal-cast', 'spell-shield-cast', 'spell-smite-hit', 'spell-chain-hit', 'spell-resurrect-hit', 'spell-renewal-cast']) assert.ok(bfxClip(key)!.g, `${key} has no glow`);
  for (const key of ['spell-meteor-land', 'spell-frost-cast', 'spell-quake-cast', 'spell-poison-stand', 'spell-snare-cast']) assert.ok(!bfxClip(key)!.g, `${key} is hard pixels`);
});

test('neighbouring tiles of a standing clip are never in step', () => {
  for (let u = 0; u < 8; u++)
    for (let v = 0; v < 11; v++) {
      const p = standPhase(u, v, 10);
      assert.ok(p >= 0 && p < 10);
      assert.notEqual(p, standPhase(u + 1, v, 10));
      assert.notEqual(p, standPhase(u, v + 1, 10));
    }
});

test('the renderer plays the sheets through the effects\' own paths, and never touches the battle', () => {
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  // (a spell's rendered sheets take the place of its older layers, the tiles' marks stay under it)
  assert.match(fx, /const rendered = this\.bfxSpell\(b, e, centre\);/);
  assert.match(fx, /this\.alivePatch\(b, spellTiles\(b\.board, e\.id, e\.u, e\.v, rankOf\(b, e\.id\)\)/);
  // (ON-FIGHTER, the owner's order: a clip over a fighter goes under that fighter's body, whole (it was thinned to six tenths over
  // it, FX-CLEAR); one lying on the ground goes under the fighters)
  assert.match(fx, /const host = paint \? undefined : this\.bodyAt\(/);
  assert.match(fx, /host\.underLayer\(\)\.addChild\(view\);/);
  assert.match(fx, /c\.layer === 'ground' && o\.lie \? this\.groundPaint\(/);
  // (reduced motion and the battery saver reach every helper)
  assert.ok((fx.match(/bfxFrame\(c, t.*this\.reduced/g) ?? []).length >= 3);
  assert.match(fx, /bfxBudget\(settings\(\)\.saver\)/);
  for (const f of ['src/render/blenderFxRules.ts', 'src/render/blenderFxData.ts']) {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /from 'pixi\.js'|document\.|window\./, `${f} is pure`);
    assert.doesNotMatch(src, /Math\.random|Date\.now/, f);
  }
});

// ---- the ultimates (the second batch after the spells and the ground loops) ----

test('every hero\'s ultimate has its three stages hung on STAGE_ART: its own strike, a wind-up by its weight, an aftermath by its element', () => {
  const kinds = Object.keys(SHOWCASES);
  assert.equal(kinds.length, 70);
  const biggestSpell = Math.max(...clips.filter(([key]) => key.startsWith('spell-')).map(([, c]) => c.w * c.h));
  for (const kind of kinds) {
    const arts = STAGE_ART[kind];
    assert.ok(arts, `${kind} has no sheets`);
    for (const stage of STAGE_NAMES) {
      const art = arts[stage];
      assert.ok(art, `${kind}.${stage}`);
      const c = bfxClip(art.sheet)!;
      assert.equal(art.sheet, ultBfx(kind, stage, ultWeight(kind)));
      assert.equal(art.frames, c.n);
      assert.equal(art.on, stage === 'windup' ? 'caster' : 'struck');
      assert.ok(!c.loop && c.n >= 7, `${art.sheet}: played once across its stage`);
      // (a show's sheets are drawn big: a wind-up wraps the caster, a strike covers two tiles and more)
      // (ULT-AUDIT: a strike that plays on each fighter the ability touches, or round the caster, is a fighter's size and a little more)
      assert.ok(art.tiles >= (stage === 'strike' ? (ultPlace(kind) === 'one' ? 3 : 1.2) : 1.2) && art.tiles <= 12, `${art.sheet}: ${art.tiles} tiles`);
    }
    assert.equal(arts.strike!.sheet, `ult-${kind}-strike`);
    // (ULT-AUDIT: no strike has the great blow under it (a core, shock rings, rubble: it made eight heroes one picture); every strike
    // is its own scenes alone, two or three of them staged one into the other)
    const strike = bfxClip(arts.strike!.sheet)!;
    assert.ok(!strike.sc!.includes('impact'), `${kind}: ${strike.sc}`);
    assert.ok(strike.cuts!.length >= 2 && strike.cuts!.length <= 4, kind);
    if (ultPlace(kind) === 'one') {
      // (one thing in the midst of what it struck: three tiles and more across or high)
      const most = Math.max(strike.w, strike.h) / BFX_DENSITY;
      assert.ok(most >= 3, `${kind}'s strike is ${strike.w}x${strike.h}: ${most.toFixed(1)} tiles`);
      assert.ok(strike.w * strike.h > biggestSpell * 0.5, `${kind}'s strike is no bigger than a spell`);
    }
    // (its own wind-up once its turn has come, else the one its weight and element share)
    assert.ok(arts.windup!.sheet === `ult-${kind}-windup` || arts.windup!.sheet.startsWith(`ultwind-${ultWeight(kind)}-`), `${kind} winds up as a ${ultWeight(kind)}`);
    // (one element through its three stages; but Vael's sweep is gold, as his words say, between a dark wind-up and a dark aftermath:
    // the director's order, 2026-11-12)
    if (kind === 'vael') {
      assert.equal(bfxClip(arts.strike!.sheet)!.el, 'holy');
      assert.equal(bfxClip(arts.windup!.sheet)!.el, bfxClip(arts.aftermath!.sheet)!.el, 'vael: dark before and after his golden sweep');
    } else for (const stage of STAGE_NAMES) assert.equal(bfxClip(arts[stage]!.sheet)!.el, bfxClip(arts.strike!.sheet)!.el, `${kind}: one element through its three stages`);
  }
  // (a kind with no show has none, and plays what the game has)
  assert.equal(STAGE_ART.skeleton, undefined);
  assert.equal(ultBfx('skeleton', 'strike', 'wave'), undefined);
});

test('no two ultimates strike alike: each pairs two scenes in its element, and no other hero has that pair and element', () => {
  const recipe = readFileSync('tools/blender-fx/effects.py', 'utf8');
  const rows = [...recipe.matchAll(/(\w+)=\('(\w+)', '(\w+)', '(\w+)', '(\w+)'\)/g)].map((m) => ({ kind: m[1], look: `${m[2]}/${m[3]}+${m[4]}`, style: m[5] }));
  assert.deepEqual(rows.map((r) => r.kind).sort(), Object.keys(SHOWCASES).sort());
  assert.equal(new Set(rows.map((r) => r.look)).size, rows.length);
  // (the recipe's style for each is the showcase's own, so its weight is the page's)
  for (const r of rows) assert.equal(r.style, SHOWCASES[r.kind].style, r.kind);
  // (a strike's two scenes differ)
  for (const r of rows) assert.notEqual(r.look.split('/')[1].split('+')[0], r.look.split('+')[1], r.kind);
});

test('a sheet on the moment\'s layer is put by its frame\'s middle so its tile\'s middle lands on the spot; the moment hands the hero\'s kind on', () => {
  const c = clip({ w: 100, h: 80, ax: 50, ay: 60 });
  const [x, y] = bfxCentre(c, 200, 300);
  assert.ok(Math.abs(x - 200) < 1e-9 && Math.abs(y - (300 - 20 * BFX_SCALE)) < 1e-9);
  const [x2, y2] = bfxCentre(clip({ w: 100, h: 80, ax: 30, ay: 60 }), 0, 0, 2);
  assert.ok(Math.abs(x2 - 40 * BFX_SCALE) < 1e-9 && Math.abs(y2 + 40 * BFX_SCALE) < 1e-9);
  assert.ok(ULT_BFX.SPOTS_SAVER < ULT_BFX.SPOTS && ULT_BFX.ECHO < 1);
  // (the blow is one great strike at the middle of what it struck, not one on every spot)
  assert.match(readFileSync('src/render/fx.ts', 'utf8'), /this\.bfxUlt\(kind, 'strike', at\.reduce\(\(n, p\) => n \+ p\[0\], 0\) \/ at\.length/);
  const moment = readFileSync('src/ultMoment.ts', 'utf8');
  assert.match(moment, /ultImpact\(b, el, spots, 1, m\.kind, t\)/);
  assert.match(moment, /ultImpact\(b, m\.el \?\? 'light', spots, 0\.6, m\.kind\)/);
  assert.match(moment, /ultAfter\(b, el, spots, ms, m\.kind\)/);
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /if \(this\.bfxUlt\(by\.unit\.def, 'windup', by\.x, by\.y, ms, 1, 0, by\.unit\)\) return;/);
  assert.match(fx, /const held = this\.reduced \? \[frames\[c\.hold\]\] : frames;/, 'reduced motion holds the one frame');
});

test('a hero whose turn has come has its own wind-up and aftermath, like no other hero\'s, and a great strike', () => {
  const own = Object.keys(SHOWCASES).filter((kind) => bfxClip(`ult-${kind}-windup`));
  assert.ok(own.length >= 15, `${own.length} heroes done`);
  const seen = new Map<string, string>();
  for (const kind of own) {
    const [wind, strike, after] = STAGE_NAMES.map((stage) => bfxClip(`ult-${kind}-${stage}`)!);
    assert.ok(wind && strike && after, `${kind} has all three of its own`);
    assert.equal(STAGE_ART[kind].windup!.sheet, `ult-${kind}-windup`);
    assert.equal(STAGE_ART[kind].aftermath!.sheet, `ult-${kind}-aftermath`);
    // (no two wind-ups and no two aftermaths are the same scenes in the same element)
    for (const [stage, c] of [['windup', wind], ['aftermath', after]] as const) {
      const look = `${stage}:${c.el}:${c.sc!.join('+')}`;
      assert.ok(!seen.has(look), `${kind} and ${seen.get(look)} share ${look}`);
      seen.set(look, kind);
    }
    // (each stage has the frames for its length)
    // (the strike keeps the most frames; the wind-up and the aftermath fewer, played slower: the download's limit)
    assert.ok(strike.n >= 13 && wind.n >= 12 && after.n >= 9 && strike.n > wind.n && wind.n > after.n, `${kind}: ${wind.n}, ${strike.n}, ${after.n} frames`);
    // (the wind-up builds: more than one scene, the hero's own part joining the weight's)
    assert.ok(wind.sc!.length >= 2 && after.sc!.length === 2, kind);
    // (each is made for its stage's own length)
    const st = ULT_STAGES[kind];
    assert.ok(Math.abs(wind.ms - st.windup.ms) <= 1, `${kind}: wind-up ${wind.ms} ms against ${st.windup.ms}`);
    assert.ok(Math.abs(after.ms - st.aftermath.ms) <= 1, `${kind}: aftermath ${after.ms} against ${st.aftermath.ms}`);
  }
});

test('the atlases are held only when needed: a core set up front, each pair of heroes\' ultimates in atlases of their own', () => {
  // (the core: every spell and ground loop, and nothing of the ultimates)
  const core = new Set(BFX_CORE);
  assert.ok(core.size >= 1 && core.size <= 4, `${core.size} core atlases`);
  for (const [key, c] of clips) assert.equal(core.has(c.a), !key.startsWith('ult') && !key.startsWith('beat-'), `${key} in atlas ${c.a}`);
  // (a hero's three stages of its own lie in one group; no atlas holds more than two heroes' own sheets)
  const byAtlas = new Map<number, Set<string>>();
  for (const [key, c] of clips) {
    if (!key.startsWith('ult-')) continue;
    const set = byAtlas.get(c.a) ?? new Set<string>();
    set.add(key.split('-')[1]);
    byAtlas.set(c.a, set);
  }
  for (const [a, heroes] of byAtlas) assert.ok(heroes.size <= 2, `atlas ${a} holds ${[...heroes].join(', ')}`);
  // (a fight of five heroes holds at most its core, the shared sheets and five heroes' groups: far from all of them)
  const perHero = Object.keys(SHOWCASES).map((kind) => new Set(STAGE_NAMES.map((stage) => bfxClip(STAGE_ART[kind][stage]!.sheet)!.a)).size);
  assert.ok(Math.max(...perHero) <= 5, `a hero's ultimate spans ${Math.max(...perHero)} atlases`);
  const art = readFileSync('src/render/blenderFxArt.ts', 'utf8');
  assert.match(art, /for \(const a of BFX_CORE\) book\.ask\(a, t\);/, 'only the core loads up front');
  assert.match(readFileSync('src/render/fx.ts', 'utf8'), /void warmBfx\(/, 'a fight warms its heroes\' ultimates');
});

test('a strike is held to a least size, not a most (the cap on bytes was lifted), and the dim is lifted over a playing sheet', () => {
  // (the director withdrew the cap on bytes: they go where they buy force. What is held is the least a strike may be: its full count of
  // frames, and colours enough for a great core of fire, ice or light not to band flat)
  const recipe = readFileSync('tools/blender-fx/effects.py', 'utf8');
  assert.ok(Number(/^STRIKE_COLOURS = (\d+)$/m.exec(recipe)?.[1]) >= 16, 'a strike has sixteen colours or more');
  assert.ok(Number(/^WIND_FRAMES, STRIKE_FRAMES, AFTER_FRAMES = \d+, (\d+), \d+$/m.exec(recipe)?.[1]) >= 13, 'a strike keeps thirteen frames or more');
  for (const kind of Object.keys(SHOWCASES)) assert.ok(bfxClip(`ult-${kind}-strike`)!.n >= 13, `${kind}'s strike has ${bfxClip(`ult-${kind}-strike`)!.n} frames`);
  // (a wind-up and a strike play on the board, under the moment's dim: the dim leaves them lit, so they are seen at full strength)
  assert.match(readFileSync('src/render/fx.ts', 'utf8'), /if \(stage !== 'aftermath'\) this\.bfxLit\.push\(/);
  assert.match(readFileSync('src/ultMoment.ts', 'utf8'), /for \(const l of this\.opts\.fx\?\.momentLights\(\) \?\? \[\]\)/);
  assert.ok(ULT_BFX.LIGHT >= 0.8);
  // (an ultimate's sheet is cut hard with a dark edge, in fewer colours: the recipe marks them, the pixelate step does it)
  assert.match(readFileSync('tools/blender-fx/pixelate.py', 'utf8'), /frames = \[edged\(f, pal\) for f in frames\]/);
});

test('a showcase\'s beats are rendered clips in its element: every clip in every element, a line a row of small clips', () => {
  const each: BeatClip[] = ['puff', 'appear', 'cut', 'blow', 'dust', 'link', 'crash', 'cloud', 'snare', 'smite', 'nova', 'call', 'ring', 'gather', 'mark', 'sky'];
  const only: BeatClip[] = ['bolt', 'flame', 'rise', 'tunnel', 'gaze'];
  for (const el of ELEMENTS) {
    for (const clip of each) assert.equal(beatBfx(clip, el), `beat-${clip}-${el}`, `${clip} in ${el}`);
    // (the few that are one element's only are the same clip whatever the showcase's element)
    for (const clip of only) assert.equal(beatBfx(clip, el), `beat-${clip}`);
    const keys = beatKeys(el);
    assert.equal(keys.length, each.length + only.length, `${el}: ${keys.length} clips`);
    // (an element's beats lie in small atlases of their own, none of them the core's: each loads the first time a beat of it is played)
    const atlases = new Set(keys.filter((k) => k.endsWith(`-${el}`)).map((k) => bfxClip(k)!.a));
    for (const a of atlases) assert.ok(BFX_PX[a][0] <= 1024 && BFX_PX[a][1] <= 1024, `atlas ${a}`);
    for (const a of atlases) assert.ok(!BFX_CORE.includes(a));
  }
  // (what loops, loops: the cloud over a caster and what falls from the sky; the rest play once)
  for (const el of ELEMENTS) for (const clip of each) assert.equal(bfxClip(beatBfx(clip, el)!)!.loop, clip === 'cloud' || clip === 'sky', `${clip}`);
  // (a line: two clips at least and nine at most, evenly along it, the far end last; never a clip turned to lie along it)
  assert.deepEqual(beatLine(0, 0, 10, 0), [[5, 0], [10, 0]]);
  const long = beatLine(0, 0, 600, 300);
  assert.equal(long.length, BEAT_LINE.MAX);
  assert.deepEqual(long[long.length - 1], [600, 300]);
  const mid = beatLine(0, 0, 0, BEAT_LINE.STEP * 4);
  assert.equal(mid.length, 4);
  assert.deepEqual(mid[0], [0, BEAT_LINE.STEP]);
  // (every beat the showcases plan has a rendered path, tried before the painted parts and the pack's; the fight warms them)
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /if \(this\.bfxShowBeat\(kind, x, y, el, o\.to, o\.how, o\.hero\)\) return;/);
  const beats = /export type ShowBeat = ([^;]+);/.exec(fx)![1].split('|').map((k) => k.trim().replace(/'/g, ''));
  const body = fx.slice(fx.indexOf('private bfxShowBeat('), fx.indexOf('/** ULT-SHOW: a painted prop'));
  for (const kind of beats) assert.ok(body.includes(`case '${kind}':`), `${kind} has a rendered beat`);
  assert.doesNotMatch(body, /rotation/, 'no clip is turned');
  // (EMIT-POINTS, the director's order: one exception. A breath is blown from its caster's mouth, and its small flames are turned the
  // way it goes; that is `breathRun`, a helper of its own which a showcase's shot of flame calls. Nothing else is turned.)
  assert.match(body, /this\.breathRun\(mouth, to\.x, to\.y - to\.tall \* 0\.5, el\)/);
});
