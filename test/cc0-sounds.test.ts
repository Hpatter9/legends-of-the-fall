import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { CUES, type Cue } from '../src/render/soundRules';
import { SOUNDS } from '../src/render/audioProcessors';
import { busOf } from '../src/render/audioMix';
import { CUE_SAMPLES, SAMPLE_FILES, TakePicker, sampleRate } from '../src/render/cueSamples';
import { CueBank } from '../src/render/cueBank';
import { FakeContext, FakeNode, installFakeAudio } from './audioFake';
// @ts-expect-error (plain JS data: the tool's list of takes, and of the cues kept synthesised with why)
import { KEPT, TAKES } from '../tools/cc0-sounds/sources.mjs';

const cues = Object.keys(CUES) as Cue[];

test('every cue resolves to a recording or a synth, and every recorded cue keeps its synth to fall back on', () => {
  for (const c of cues) {
    assert.equal(typeof SOUNDS[c], 'function', `${c} has a synthesised voice`);
  }
  for (const c of Object.keys(CUE_SAMPLES) as Cue[]) {
    assert.ok(c in CUES, `${c} is a cue`);
    const takes = CUE_SAMPLES[c] ?? [];
    assert.ok(takes.length >= 1 && takes.length <= 3, `${c} has one to three takes`);
    for (const f of takes) {
      assert.ok(f.gain > 0 && f.gain <= 4, `${f.file}'s gain ${f.gain} is sane`);
      assert.ok(f.seconds > 0.03 && f.seconds <= 3.2, `${f.file} is ${f.seconds} s`);
    }
  }
  // (each cue is either recorded, as the tool's list says, or kept synthesised with a reason: never both, never neither)
  for (const c of cues) {
    const recorded = c in CUE_SAMPLES;
    assert.equal(recorded, c in TAKES, `${c}: the manifest and the tool's list agree`);
    assert.equal(recorded, !(c in KEPT), `${c} is recorded or kept, not both`);
    if (!recorded) assert.ok((KEPT as Record<string, string>)[c].length > 5, `${c} says why it keeps its synth`);
  }
  // (the very frequent cues have more than one take, so a run of blows never repeats a recording)
  for (const c of ['swingLight', 'swingSword', 'hitLight', 'hitSword', 'hitHeavy', 'hitFist', 'block', 'arrowHit', 'steps'] as Cue[]) {
    assert.ok((CUE_SAMPLES[c]?.length ?? 0) >= 2, `${c} has variants`);
  }
});

test('the files on disk are the manifest, each its own size, small, and every one is in the service worker\'s list', () => {
  const onDisk = readdirSync('src/sfx/cues').filter((f) => f.endsWith('.opus')).map((f) => f.slice(0, -5)).sort();
  assert.deepEqual(onDisk, [...SAMPLE_FILES].sort());
  let total = 0;
  for (const takes of Object.values(CUE_SAMPLES)) {
    for (const f of takes ?? []) {
      const bytes = statSync(`src/sfx/cues/${f.file}.opus`).size;
      assert.equal(bytes, f.bytes, f.file);
      total += bytes;
    }
  }
  assert.ok(total < 1024 * 1024, `all the recordings are ${total} bytes, under 1 MB`);
  // (build.mjs copies src/sfx/cues into sfx/cues/ and lists each in the service worker's FILES, so the game plays offline)
  const build = readFileSync('build.mjs', 'utf8');
  assert.match(build, /readdirSync\('src\/sfx\/cues'\)[\s\S]{0,200}AUDIO_FILES\.push\(`sfx\/cues\/\$\{f\}`\)/);
  assert.match(build, /\$\{AUDIO_FILES\.map\(/);
  try {
    const sw = readFileSync('out/web/sw.js', 'utf8');
    for (const f of SAMPLE_FILES) assert.ok(sw.includes(`'sfx/cues/${f}.opus'`), `${f} is cached by the built service worker`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
});

test('a take is never the one just played, and every take comes round', () => {
  let n = 0;
  const seq = [0.1, 0.9, 0.5, 0.0, 0.99, 0.3, 0.7];
  const p = new TakePicker(() => seq[n++ % seq.length]);
  let last = -1;
  const seen = new Set<number>();
  for (let i = 0; i < 40; i++) {
    const k = p.next('hitLight', 3);
    assert.ok(k >= 0 && k < 3);
    assert.notEqual(k, last);
    seen.add(k);
    last = k;
  }
  assert.equal(seen.size, 3);
  // (two takes alternate; one is always the one)
  const q = new TakePicker(() => 0.4);
  assert.deepEqual([q.next('block', 2), q.next('block', 2), q.next('block', 2)], [0, 1, 0]);
  assert.equal(q.next('crit', 1), 0);
  assert.equal(sampleRate(1), 1);
  assert.ok(Math.abs(sampleRate(1.07) - 1.035) < 1e-9);
});

test('the bank plays a recording on the cue\'s own bus at its level and pan, and a cue with nothing decoded falls back to the synth', async () => {
  const restore = installFakeAudio();
  const realFetch = globalThis.fetch;
  try {
    const ctx = new FakeContext();
    const decoded: string[] = [];
    (ctx as unknown as { decodeAudioData: (b: ArrayBuffer) => Promise<unknown> }).decodeAudioData = async () => ({ duration: 0.3 });
    // (every file loads but the hitLight takes, as a browser that could not fetch them)
    globalThis.fetch = (async (url: string) => {
      decoded.push(url);
      return { ok: !url.includes('hitLight'), arrayBuffer: async () => new ArrayBuffer(8) };
    }) as unknown as typeof fetch;
    const buses = { sfx: new FakeNode(ctx), ui: new FakeNode(ctx), show: new FakeNode(ctx), music: new FakeNode(ctx), ambience: new FakeNode(ctx) };
    const bank = new CueBank(ctx as unknown as BaseAudioContext, (n) => buses[n] as unknown as AudioNode);
    await bank.load();
    assert.equal(decoded.length, SAMPLE_FILES.length);
    assert.ok(decoded.every((u) => u.startsWith('sfx/cues/') && u.endsWith('.opus')));
    assert.equal(bank.has('hitLight'), false);
    assert.equal(bank.play('hitLight', 0, { gain: 1, pitch: 1, bus: 'sfx' }), null, 'no take: the synth plays');
    assert.equal(bank.has('tap'), false, 'tap keeps its synth');

    const file = bank.play('hitHeavy', 0.5, { gain: 0.8, pitch: 1.04, bus: busOf('hitHeavy'), pan: 0.3 });
    assert.ok(file && file.startsWith('hitHeavy-'));
    const take = CUE_SAMPLES.hitHeavy!.find((f) => f.file === file)!;
    const made = FakeContext.made;
    const src = made.find((x) => x.started && x.playbackRate.value !== 1)!;
    assert.ok(Math.abs(src.playbackRate.value - 1.02) < 1e-9);
    const g = src.to[0];
    assert.ok(Math.abs(g.gain.value - 0.8 * take.gain) < 1e-9);
    const pan = g.to[0];
    assert.equal(pan.pan.value, 0.3);
    assert.equal(pan.to[0], buses.sfx);

    // (a page cue on the ui bus, centred: no panner)
    const coin = bank.play('coin', 0, { gain: 1, pitch: 1, bus: busOf('coin') });
    assert.ok(coin);
    const last = FakeContext.made.filter((x) => x.started).pop()!;
    assert.equal(last.to[0].to[0], buses[busOf('coin')]);
  } finally {
    globalThis.fetch = realFetch;
    restore();
  }
});
