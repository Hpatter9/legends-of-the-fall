// CC0-SOUNDS: the measuring side of render.mjs, bundled and run in headless Chromium. It renders a synthesised cue (the real CueSynth,
// at gain 1, its `SYNTH_LEVEL` included) and plays a recorded file (decoded by the browser, through a gain of 1, as `CueBank` plays it)
// into OfflineAudioContexts, and meters each one's loudest 400 ms (`meter`, tools/audio-mix/probe.ts), so a file's gain can be set to
// sound exactly as loud as the synth it stands in for. Both play mono into a stereo context, as they do in the game.

import { CueSynth } from '../../src/render/audioProcessors';
import type { Cue } from '../../src/render/soundRules';
import { meter } from '../audio-mix/probe';

const RATE = 48000;
const chans = (b: AudioBuffer) => Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i));

/** A synthesised cue, once, at gain 1: its momentary max (LUFS) and peak. */
async function synth(name: Cue): Promise<{ mMax: number; peak: number }> {
  const oc = new OfflineAudioContext(2, Math.round(3.5 * RATE), RATE);
  const out = new GainNode(oc, { gain: 1 });
  out.connect(oc.destination);
  new CueSynth(oc, () => out).play(name, 0.05, { gain: 1, pitch: 1, bus: 'sfx' });
  const m = meter(chans(await oc.startRendering()), RATE);
  return { mMax: m.mMax, peak: m.peak };
}

/** A recorded file, decoded and played once at gain 1: its momentary max and peak, and its length. */
async function sample(url: string): Promise<{ mMax: number; peak: number; seconds: number }> {
  const bytes = await (await fetch(url)).arrayBuffer();
  const tmp = new OfflineAudioContext(1, 1, RATE);
  const buf = await tmp.decodeAudioData(bytes);
  const oc = new OfflineAudioContext(2, Math.round((buf.duration + 0.5) * RATE), RATE);
  const src = new AudioBufferSourceNode(oc, { buffer: buf });
  src.connect(oc.destination);
  src.start(0.05);
  const m = meter(chans(await oc.startRendering()), RATE);
  return { mMax: m.mMax, peak: m.peak, seconds: buf.duration };
}

(window as unknown as { __cc0: unknown }).__cc0 = { synth, sample };
