// The aura round an awakened hero, drawn from the parts `auraStyles.ts` gives its class: pack strips (the 5000 Pixel
// Effects pack, packed into `src/art/fx/aura/atlas.png` by `tools/awaken/aura-sheets.py`) laid under its feet, behind
// its body, over its head and circling it. The sprites are made once, when the art is ready, and only moved and given
// the next frame after that, so a fight allocates nothing for them. Reduced motion holds every part still on one frame
// (it never disappears); battery saver leaves out the extra parts.

import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import atlasUrl from '../art/fx/aura/atlas.png';
import atlasMeta from '../art/fx/aura/atlas.json';
import { loadImage } from './loadImage';
import { auraParts, type AuraPart } from './auraStyles';

const STRIPS = new Map<string, Texture[]>();
let loading: Promise<void> | null = null;

/** Cut the atlas into its strips (once; the fight's loader awaits it). */
export function loadAuraArt(): Promise<void> {
  loading ??= loadImage(atlasUrl).then((img) => {
    const base = Texture.from(img);
    base.source.style.scaleMode = 'nearest';
    for (const [name, [row, n]] of Object.entries(atlasMeta as Record<string, number[]>)) {
      const frames: Texture[] = [];
      for (let i = 0; i < n; i++) frames.push(new Texture({ source: base.source, frame: new Rectangle(i * 32, row * 32, 32, 32) }));
      STRIPS.set(name, frames);
    }
  });
  return loading;
}

interface Bit {
  sp: Sprite;
  part: AuraPart;
  frames: Texture[];
  /** Which of its part's copies it is. */
  i: number;
  /** Its own beat, in ms, so copies don't move in step. */
  phase: number;
}

export class AwakenAura {
  /** Behind the body, and in front of it. */
  readonly back = new Container();
  readonly front = new Container();
  private bits: Bit[] = [];
  private built = false;
  private readonly parts: readonly AuraPart[];

  constructor(kind: string, step: number, saver: boolean) {
    this.parts = auraParts(kind, step, saver);
  }

  private build(): void {
    this.built = true;
    for (const part of this.parts) {
      const frames = STRIPS.get(part.sheet);
      if (!frames?.length) continue;
      const n = part.count ?? 1;
      for (let i = 0; i < n; i++) {
        const sp = new Sprite(frames[0]);
        const low = part.place === 'motes' && /flame|smoke/.test(part.sheet);
        sp.anchor.set(0.5, part.place === 'rise' || low ? 1 : 0.5);
        sp.blendMode = part.add ? 'add' : 'normal';
        (part.front ? this.front : this.back).addChild(sp);
        this.bits.push({ sp, part, frames, i, phase: i * 397 + part.sheet.length * 53 });
      }
    }
  }

  /** Place every part for the time `t` (ms), round a hero `tall` px high facing `dir` (1 right, -1 left). */
  update(t: number, tall: number, dir: number, calm: boolean): void {
    if (!this.built) {
      if (!STRIPS.size) return;
      this.build();
    }
    for (const b of this.bits) {
      const { sp, part, frames, i } = b;
      const n = part.count ?? 1;
      sp.texture = frames[calm ? frames.length >> 1 : Math.floor((t + b.phase) / part.frameMs) % frames.length];
      const k = (part.size * tall) / 32;
      let alpha = part.alpha;
      switch (part.place) {
        case 'ground': {
          // (a flat ring under the feet, its width set by the footprint rather than the height, so a giant's stays sensible)
          const w = (part.size * Math.max(26, Math.min(44, tall * 0.7))) / 32;
          const round = /rune|glyph/.test(part.sheet);
          sp.position.set(0, round ? 0 : -1);
          sp.scale.set(w, round ? w * 0.42 : w);
          break;
        }
        case 'wrap':
          sp.position.set(0, -tall * 0.45);
          sp.scale.set(k);
          break;
        case 'rise': {
          const w = (part.size * Math.max(26, tall * 0.8)) / 32;
          sp.position.set(0, 3);
          sp.scale.set(w, w * 1.15);
          break;
        }
        case 'halo':
          sp.position.set(0, -tall * 1.02 + (calm ? 0 : Math.sin(t / 420) * 1.2));
          sp.scale.set(k, k * 0.38);
          break;
        case 'orbit': {
          const a = (calm ? 0.6 : t * 0.0021) + (i * Math.PI * 2) / n;
          const r = tall * 0.42;
          const s = Math.sin(a);
          sp.position.set(Math.cos(a) * r, -tall * 0.45 + s * r * 0.32);
          sp.scale.set(k * (s < 0 ? 0.8 : 1));
          // (behind the body, it dims, so the circle reads as going round)
          if (s < 0) alpha *= 0.4;
          sp.rotation = /slash/.test(part.sheet) ? a + Math.PI / 2 : 0;
          break;
        }
        case 'motes': {
          const side = i % 2 ? 1 : -1;
          const low = /flame|smoke/.test(part.sheet);
          const out = tall * (0.26 + (i >> 1) * 0.1);
          sp.position.set(side * out, low ? 2 - (i >> 1) * 3 : -tall * (0.2 + ((i * 3) % 5) * 0.14));
          sp.scale.set(k * (low && i > 1 ? 0.85 : 1));
          break;
        }
        case 'trail':
          // (speed lines streaming back from the body, the way it faces)
          sp.position.set(-dir * tall * (0.32 + (i % 2) * 0.08), -tall * (0.22 + i * 0.2));
          sp.scale.set(k * dir, k);
          break;
      }
      sp.alpha = alpha;
    }
  }
}
