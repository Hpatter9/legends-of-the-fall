// The king's spells' rendered sounds, loaded and played: each file (`sfx/<id>.opus`, listed in `spellSfxManifest.ts` and cached by
// the service worker for offline play) is fetched and decoded once, on the first tap, and played from a buffer on the effects bus,
// panned to where the spell lands. Which file plays when is decided in `spellSfx.ts`. A file that will not load or decode (an old
// Safari has no Opus) is simply missing, and `sound.ts` plays the old synthesised cues in its place.

import { SPELL_FILES } from './spellSfx';
import type { SpellSfxId } from './spellSfxManifest';

export class SpellBank {
  private readonly buffers = new Map<SpellSfxId, AudioBuffer>();
  private loading: Promise<void> | null = null;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly out: AudioNode,
    private readonly base = 'sfx/',
  ) {}

  /** Every file decoded (until then, and if any fails, the spells keep their synthesised cues). */
  get ready(): boolean {
    return this.buffers.size === SPELL_FILES.length;
  }

  /** Fetches and decodes every file (once; later calls return the same promise). Never rejects. */
  load(): Promise<void> {
    this.loading ??= Promise.all(
      SPELL_FILES.map(async (id) => {
        try {
          const res = await fetch(`${this.base}${id}.opus`);
          if (!res.ok) return;
          this.buffers.set(id, await this.ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          /* (left out: its fallback cues play) */
        }
      }),
    ).then(() => undefined);
    return this.loading;
  }

  has(id: SpellSfxId): boolean {
    return this.buffers.has(id);
  }

  /** Plays `id` at context time `t`: `gain` on top of the bus, `pan` -1 to 1, `rate` a playback rate (1 as rendered). False if
   *  the file is not decoded. */
  play(id: SpellSfxId, t: number, gain: number, pan: number, rate = 1): boolean {
    const buf = this.buffers.get(id);
    if (!buf) return false;
    const src = new AudioBufferSourceNode(this.ctx, { buffer: buf, playbackRate: rate });
    const g = new GainNode(this.ctx, { gain });
    src.connect(g);
    if (pan) g.connect(new StereoPannerNode(this.ctx, { pan })).connect(this.out);
    else g.connect(this.out);
    src.start(t);
    // (let go of the nodes once it has rung out)
    src.onended = () => g.disconnect();
    return true;
  }
}
