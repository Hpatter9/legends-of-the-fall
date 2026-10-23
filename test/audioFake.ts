// A stand-in for the Web Audio API, enough for the audio processors to be built and driven under Node: nodes that remember
// their connections, and params that remember what was scheduled on them. Nothing is heard; the tests read what was done.

export class FakeParam {
  value: number;
  calls: [string, ...number[]][] = [];
  constructor(v = 0) {
    this.value = v;
  }
  setValueAtTime(v: number, t: number) { this.calls.push(['set', v, t]); this.value = v; return this; }
  linearRampToValueAtTime(v: number, t: number) { this.calls.push(['lin', v, t]); return this; }
  exponentialRampToValueAtTime(v: number, t: number) { this.calls.push(['exp', v, t]); return this; }
  setTargetAtTime(v: number, t: number, tc: number) { this.calls.push(['target', v, t, tc]); return this; }
  cancelScheduledValues(t: number) { this.calls.push(['cancel', t]); return this; }
  cancelAndHoldAtTime(t: number) { this.calls.push(['hold', t]); return this; }
  /** The last target this param was sent to by `setTargetAtTime`. */
  get target(): number | undefined {
    const c = [...this.calls].reverse().find((x) => x[0] === 'target');
    return c?.[1];
  }
}

export class FakeNode {
  to: FakeNode[] = [];
  started = false;
  stopped = false;
  context: FakeContext | null = null;
  numberOfInputs = 1;
  numberOfOutputs = 1;
  channelCount = 2;
  type = '';
  buffer: unknown = null;
  loop = false;
  pan = new FakeParam(0);
  gain = new FakeParam(1);
  frequency = new FakeParam(440);
  detune = new FakeParam(0);
  Q = new FakeParam(1);
  offset = new FakeParam(1);
  playbackRate = new FakeParam(1);
  threshold = new FakeParam(-24);
  knee = new FakeParam(30);
  ratio = new FakeParam(12);
  attack = new FakeParam(0.003);
  release = new FakeParam(0.25);
  constructor(ctx?: FakeContext, opts: Record<string, unknown> = {}) {
    this.context = ctx ?? null;
    for (const [k, v] of Object.entries(opts)) {
      const cur = (this as unknown as Record<string, unknown>)[k];
      if (cur instanceof FakeParam) cur.value = v as number;
      else (this as unknown as Record<string, unknown>)[k] = v;
    }
    FakeContext.made.push(this);
  }
  connect<T>(n: T): T { if (n instanceof FakeNode) this.to.push(n); return n; }
  disconnect(n?: FakeNode) { this.to = n ? this.to.filter((x) => x !== n) : []; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

export class FakeContext {
  static made: FakeNode[] = [];
  currentTime = 0;
  sampleRate = 8000;
  state: AudioContextState = 'running';
  destination = new FakeNode();
  audioWorklet = undefined;
  createMediaElementSource() { return new FakeNode(this); }
  createGain() { return new FakeNode(this); }
  createOscillator() { return new FakeNode(this); }
  createBiquadFilter() { return new FakeNode(this); }
  createBufferSource() { return new FakeNode(this); }
  createConstantSource() { return new FakeNode(this); }
  createStereoPanner() { return new FakeNode(this); }
  createDynamicsCompressor() { return new FakeNode(this); }
  createChannelMerger() { return new FakeNode(this); }
  createChannelSplitter() { return new FakeNode(this); }
  createDelay() { return new FakeNode(this); }
  createBuffer(_c: number, n: number) { const d = new Float32Array(n); return { getChannelData: () => d, length: n, duration: n / this.sampleRate }; }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async close() { this.state = 'closed'; }
}

/** A media element that only remembers what it was told. */
export class FakeAudio {
  src: string;
  paused = true;
  currentTime = 0;
  duration = 100;
  loop = false;
  playbackRate = 1;
  crossOrigin: string | null = null;
  preload = '';
  plays = 0;
  constructor(src = '') { this.src = src; }
  addEventListener() {}
  removeEventListener() {}
  load() {}
  removeAttribute() {}
  async play() { this.paused = false; this.plays++; }
  pause() { this.paused = true; }
}

/** Defines the Web Audio constructors the processors use as globals (Node has none). Returns how to take them away again. */
export function installFakeAudio(): () => void {
  const g = globalThis as unknown as Record<string, unknown>;
  const names = ['GainNode', 'BiquadFilterNode', 'OscillatorNode', 'AudioBufferSourceNode', 'ConstantSourceNode', 'StereoPannerNode', 'DynamicsCompressorNode', 'ChannelMergerNode', 'ChannelSplitterNode', 'DelayNode', 'ConvolverNode'];
  const old = new Map(names.map((n) => [n, g[n]]));
  for (const n of names) g[n] = FakeNode;
  const param = g.AudioParam;
  g.AudioParam = FakeParam;
  const audio = g.Audio;
  g.Audio = FakeAudio;

  const raf = g.requestAnimationFrame;
  const caf = g.cancelAnimationFrame;
  g.requestAnimationFrame = () => 0;
  g.cancelAnimationFrame = () => {};
  FakeContext.made = [];
  return () => {
    for (const [n, v] of old) g[n] = v;
    g.AudioParam = param;
    g.Audio = audio;
    g.requestAnimationFrame = raf;
    g.cancelAnimationFrame = caf;
  };
}
