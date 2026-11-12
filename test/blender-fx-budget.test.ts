// BLENDER-FX (docs/notes/blender-fx.md): the budget on the effect atlases a fight loads as it needs them, for a phone's sake. The rule is
// pure (`src/render/blenderFxBudget.ts`): at most two atlases decoding at once, a hard cap on decoded pixels with the least recently used
// atlas given up first, a cap on the pixels on the graphics card, nothing given up while it may still be on the screen, a hung load given
// up and tried again. The loader (`blenderFxArt.ts`) only carries the rule out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/sim/battle';
import { BFX_MEM, BfxPages, type BfxMem } from '../src/render/blenderFxBudget';
import { BFX_CLIPS, BFX_CORE, BFX_PX } from '../src/render/blenderFxData';
import { beatBfx, ultBfx, type BeatClip } from '../src/render/blenderFxRules';
import { SHOWCASES } from '../src/ultShowRules';
import { ultWeight } from '../src/ultStageRules';

const MEM: BfxMem = { LOADS: 2, DECODED_PX: 1000, UPLOADED_PX: 500, GUARD_MS: 100, TIMEOUT_MS: 1000, RETRY_MS: 500, TRIES: 3 };
/** A book of atlases of 300 px each (atlas 0 pinned). */
const book = (mem: BfxMem = MEM) => new BfxPages(() => 300, (a) => a === 0, mem);
/** Run the book's loads to their end, each taking no time. */
function settle(b: BfxPages, now: number): { drop: number[]; unload: number[] } {
  const out = { drop: [] as number[], unload: [] as number[] };
  for (let i = 0; i < 50; i++) {
    const act = b.step(now);
    out.drop.push(...act.drop);
    out.unload.push(...act.unload);
    for (const a of act.start) b.done(a, true, now);
    if (!act.start.length) break;
  }
  return out;
}

test('at most two atlases decode at once; the rest wait their turn, and one about to be drawn goes to the front', () => {
  const b = book({ ...MEM, DECODED_PX: 5000 });
  for (const a of [1, 2, 3]) b.ask(a, 0);
  assert.deepEqual(b.step(0).start, [1, 2]);
  assert.deepEqual(b.step(1).start, [], 'two are loading: the third waits');
  assert.equal(b.use(5, 2), false, 'not held yet: the caller keeps its older look');
  b.done(1, true, 3);
  assert.deepEqual(b.step(3).start, [5], 'the one something is about to draw goes before the one only warmed');
  b.done(2, true, 4);
  assert.deepEqual(b.step(4).start, [3]);
  assert.ok(b.busy());
  b.done(5, true, 5);
  b.done(3, true, 5);
  assert.ok(!b.busy());
  assert.equal(b.use(5, 6), true);
});

test('the decoded pixels never pass their budget: the least recently used atlas is given up to make room, never one just used, never a pinned one', () => {
  const b = book();
  b.ask(0, 0);
  for (const a of [1, 2, 3]) b.ask(a, 0);
  settle(b, 0);
  assert.equal(b.decodedPx(), 900, 'three atlases of 300 fit in 1000; the pinned one is outside the budget');
  assert.equal(b.held(), 4);
  // (a fourth does not fit, and nothing may be given up yet: it waits, and the budget holds)
  b.use(2, 50);
  b.ask(4, 60);
  assert.deepEqual(b.step(60), { start: [], drop: [], unload: [] });
  assert.equal(b.state(4), 'queued');
  // (later: atlas 1 and 3 were used least recently (1 first, by its number); 2 was used at 50)
  const act = b.step(120);
  assert.deepEqual(act.drop, [1]);
  assert.deepEqual(act.start, [4]);
  assert.equal(b.state(1), undefined, 'given up altogether: asked for again, it loads again');
  b.done(4, true, 121);
  assert.ok(b.decodedPx(true) <= MEM.DECODED_PX);
  // (many more asked for at once: the budget holds at every step, the pinned atlas is never given up)
  for (let a = 5; a < 30; a++) b.ask(a, 130 + a);
  for (let t = 200; t < 6000; t += 37) {
    const step = b.step(t);
    assert.ok(!step.drop.includes(0));
    assert.ok(b.decodedPx(true) <= MEM.DECODED_PX, `${b.decodedPx(true)} px at ${t}`);
    for (const a of step.start) b.done(a, true, t + 5);
  }
  assert.equal(b.state(0), 'ready');
  assert.equal(b.state(29), 'ready', 'every one asked for had its turn');
});

test('the pixels on the graphics card have their own budget: the least recently drawn atlas is taken off it, and stays decoded', () => {
  const b = book();
  for (const a of [1, 2, 3]) b.ask(a, 0);
  settle(b, 0);
  assert.equal(b.uploadedPx(), 0, 'warmed, not drawn: nothing is on the graphics card for it');
  b.use(1, 10);
  b.use(2, 20);
  assert.equal(b.uploadedPx(), 600);
  assert.deepEqual(b.step(30).unload, [], 'over the budget, but both were drawn too lately to take down');
  assert.deepEqual(b.step(115).unload, [1], 'the one drawn longest ago');
  assert.equal(b.uploadedPx(), 300);
  assert.equal(b.decodedPx(), 900, 'it is still decoded');
  assert.equal(b.use(1, 200), true, 'and goes back up when drawn again');
});

test('a load that hangs is given up and tried again later, three times in all; a late answer is thrown away', () => {
  const b = book();
  b.ask(1, 0);
  assert.deepEqual(b.step(0).start, [1]);
  b.step(999);
  assert.equal(b.state(1), 'loading');
  b.step(1000);
  assert.equal(b.state(1), 'failed');
  assert.equal(b.done(1, true, 1100), false, 'its answer comes too late: the loader throws the picture away');
  b.ask(1, 1200);
  assert.equal(b.state(1), 'failed', 'not yet: a failed atlas rests before its next try');
  b.ask(1, 1500);
  assert.deepEqual(b.step(1500).start, [1]);
  assert.equal(b.done(1, false, 1600), true);
  b.ask(1, 2100);
  assert.deepEqual(b.step(2100).start, [1]);
  b.done(1, false, 2200);
  b.ask(1, 9000);
  assert.deepEqual(b.step(9000).start, [], 'three tries, and no more');
  assert.ok(!b.busy(), 'and nothing is left waiting on it');
});

/** The atlases a hero's ultimate plays from: its three stages, and the beats of its showcase's element. */
const STAGES = ['windup', 'strike', 'aftermath'] as const;
const BEATS: BeatClip[] = ['puff', 'appear', 'cut', 'blow', 'dust', 'link', 'crash', 'cloud', 'snare', 'smite', 'nova', 'call', 'ring', 'gather', 'mark', 'sky', 'bolt', 'flame', 'rise', 'tunnel'];
const stagePages = (kind: string): number[] => STAGES.map((s) => BFX_CLIPS[ultBfx(kind, s, ultWeight(kind))!].a);
const beatPages = (kind: string): number[] => [...new Set(BEATS.map((c) => BFX_CLIPS[beatBfx(c, SHOWCASES[kind].el)!].a))];
const px = (a: number): number => BFX_PX[a][0] * BFX_PX[a][1];
const MB = (n: number): string => ((n * 4) / 1048576).toFixed(1);

test('the real atlases under the real budget: a five-hero fight and a session of ten fights with changing parties stay inside it', (t) => {
  const core = new Set(BFX_CORE);
  // (a fight-loaded atlas is a small one: 1024 a side, or one clip's own; any one of them fits the budget many times over)
  for (let a = 0; a < BFX_PX.length; a++) if (!core.has(a)) assert.ok(px(a) <= BFX_MEM.DECODED_PX / 3, `atlas ${a} is ${px(a)} px`);
  const kinds = Object.keys(SHOWCASES);
  const b = new BfxPages(px, (a) => core.has(a));
  let now = 0;
  let peakDecoded = 0;
  let peakUploaded = 0;
  const tick = (ms: number) => {
    // (a load takes 150 ms here; the book is looked over every 50)
    for (const end = now + ms; now < end; now += 50) {
      for (const a of b.step(now).start) loading.set(a, now + 150);
      for (const [a, at] of loading) if (at <= now) (b.done(a, true, now), loading.delete(a));
      peakDecoded = Math.max(peakDecoded, b.decodedPx(true));
      peakUploaded = Math.max(peakUploaded, b.uploadedPx());
    }
  };
  const loading = new Map<number, number>();
  for (const a of BFX_CORE) b.ask(a, now);
  const everAsked = new Set<number>();
  const fight = (party: string[]) => {
    // (the fight begins: its heroes' ultimates are asked for; then each fires in turn, twice, its stages and its beats drawn as they play)
    for (const kind of party) for (const a of stagePages(kind)) (b.ask(a, now), everAsked.add(a));
    tick(3000);
    let shown = 0;
    let asked = 0;
    for (let round = 0; round < 2; round++) {
      for (const kind of party) {
        for (const a of [...stagePages(kind), ...beatPages(kind)]) {
          everAsked.add(a);
          asked++;
          if (b.use(a, now)) shown++;
          tick(600);
        }
        tick(4000);
      }
    }
    return { shown, asked };
  };
  const first = fight(kinds.slice(0, 5));
  t.diagnostic(`a five-hero fight: ${b.held()} atlases held (${BFX_CORE.length} of them the core), ${MB(b.decodedPx())} MB decoded, ${MB(b.uploadedPx())} MB on the graphics card; ${first.shown} of ${first.asked} clips' atlases were there when asked for`);
  // (the ultimates were warmed as the fight began: every stage is there when it is played)
  assert.ok(first.shown >= first.asked * 0.6, `${first.shown} of ${first.asked}`);
  for (let i = 1; i < 10; i++) fight(kinds.slice((i * 7) % 65, ((i * 7) % 65) + 5));
  const before = [...everAsked].reduce((n, a) => n + px(a), 0);
  t.diagnostic(`ten fights with changing parties: ${b.held()} atlases held, ${MB(b.decodedPx())} MB decoded, ${MB(b.uploadedPx())} MB on the graphics card; the most at any moment ${MB(peakDecoded)} MB decoded, ${MB(peakUploaded)} MB uploaded. With nothing ever given up it would be ${everAsked.size} atlases, ${MB(before)} MB`);
  assert.ok(peakDecoded <= BFX_MEM.DECODED_PX, `${peakDecoded} px decoded`);
  // (the uploaded budget is brought back under as soon as what was drawn has been left alone long enough: one show's worth over, at most)
  assert.ok(b.uploadedPx() <= BFX_MEM.UPLOADED_PX + BFX_MEM.DECODED_PX / 3, `${b.uploadedPx()} px uploaded`);
  assert.ok(before > BFX_MEM.DECODED_PX * 2, 'the session asked for far more than is ever held');
});

test('the loader carries the rule out: nothing waits on a load, a fight no longer asks for its showcases\' beats as it begins', () => {
  const art = readFileSync('src/render/blenderFxArt.ts', 'utf8');
  assert.match(art, /const act = book\.step\(now\(\)\);/);
  assert.match(art, /for \(const a of act\.drop\) drop\(a\);/);
  assert.match(art, /base\.source\.unload\(\)/);
  assert.match(art, /held\.bitmap\?\.close\(\)/, 'a given-up atlas gives its decoded pixels back at once');
  assert.match(art, /t\.source = Texture\.EMPTY\.source;/, 'a frame of a given-up atlas draws nothing, never a dead texture');
  assert.match(art, /export function warmBfx\(keys: readonly \(string \| undefined\)\[\]\): void/, 'warming returns nothing to wait on');
  assert.match(art, /export function loadBlenderFx\(\): void/);
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.doesNotMatch(fx, /beatKeys/, 'the beats load the first time they are played');
  assert.doesNotMatch(fx, /await (warmBfx|loadBlenderFx)/);
});
