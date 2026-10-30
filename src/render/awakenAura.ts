// The class aura round a promoted combat hero in the Pixi views (the fight board, the Last Stand, the Calamity, the cinematics): the
// parts `auraStyles.ts` gives its class, each drawn from the aura atlas (`auraArt.ts`) and placed by `auraPlace.ts`.
// The sprites are made once, when the art is ready, and only moved and given the next frame after that, so a fight
// allocates nothing for them. Reduced motion holds every part still on one frame (it never disappears); battery saver
// leaves out the extra parts.

import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { AURA_CELL, AURA_PIXEL, auraImage, auraStrip, loadAuraImage } from './auraArt';
import { newPose, poseAura } from './auraPlace';
import { AURA_KEYS, auraParts, type AuraPart } from './auraStyles';

const STRIPS = new Map<string, Texture[]>();
let ready = false;

/** Cut the atlas into the parts' frames (once; the fight's loader awaits it). */
export async function loadAuraArt(): Promise<void> {
  await loadAuraImage();
  if (ready) return;
  const img = auraImage()!;
  const base = Texture.from(img);
  base.source.style.scaleMode = AURA_PIXEL ? 'nearest' : 'linear';
  // (parts that share a strip share its frames)
  const rows = new Map<string, Texture[]>();
  for (const key of AURA_KEYS) {
    const s = auraStrip(key);
    if (!s) continue;
    const at = `${s[0]}:${s[1]}`;
    let frames = rows.get(at);
    if (!frames) {
      frames = [];
      for (let i = 0; i < s[2]; i++) frames.push(new Texture({ source: base.source, frame: new Rectangle((s[0] + i) * AURA_CELL, s[1] * AURA_CELL, AURA_CELL, AURA_CELL) }));
      rows.set(at, frames);
    }
    STRIPS.set(key, frames);
  }
  ready = true;
}

interface Bit {
  sp: Sprite;
  part: AuraPart;
  frames: Texture[];
  /** Which of its part's copies it is. */
  i: number;
}

const pose = newPose();

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
      const frames = STRIPS.get(part.key);
      if (!frames?.length) continue;
      const n = part.count ?? 1;
      for (let i = 0; i < n; i++) {
        const sp = new Sprite(frames[0]);
        sp.blendMode = part.add ? 'add' : 'normal';
        (part.front ? this.front : this.back).addChild(sp);
        this.bits.push({ sp, part, frames, i });
      }
    }
  }

  /** Place every part for the time `t` (ms), round a hero `tall` px high facing `dir` (1 right, -1 left). */
  update(t: number, tall: number, dir: number, calm: boolean): void {
    if (!this.built) {
      if (!ready) return;
      this.build();
    }
    for (const b of this.bits) {
      poseAura(b.part, b.i, b.frames.length, t, tall, dir, calm, AURA_CELL, pose);
      const sp = b.sp;
      sp.texture = b.frames[pose.frame];
      sp.anchor.set(0.5, pose.ay);
      sp.position.set(pose.x, pose.y);
      sp.scale.set(pose.sx, pose.sy);
      sp.rotation = pose.rot;
      sp.alpha = pose.alpha;
    }
  }
}
