// STATUS-FX: what a fighter's ailments look like on it (docs/notes/status-fx.md, section 7). The body parts of its two latest ailments
// (one on the battery saver), placed by `statusStyles.ts` round the body: the ground and back parts behind it, the front, halo and
// motes in front; and a row of round chips just over the health bar, one for each ailment it holds. The parts' frames come only from
// the ailments' atlas (`statusArt.ts`), so painted sheets drop in with no code change.
//
// Made when what it shows changes; each frame only re-frames and moves what is there. With reduced motion every part holds its first
// frame and stays put; nothing ever blinks off.

import { Container, Graphics, Sprite } from 'pixi.js';
import type { Unit } from '../sim/battle';
import { statusFrames, STATUS_CELL } from './statusArt';
import { MAX_CHIPS, STATUS_STYLES, maxBodyFx, partAlpha, shownAilments, statusKey, type AilmentKey, type StatusPart } from './statusStyles';

/** One drawn piece: its sprite, its strip, where it rests, its own beat, and which mote it is. */
interface Bit {
  sp: Sprite;
  key: string;
  part: StatusPart;
  y: number;
  beat: number;
  mote?: number;
}

/** The chip's rim and disc, and its icon's size inside it (px). */
export const CHIP_R = 6.5;
const CHIP_GAP = 14;
const ICON_PX = 12.5;

/** The tint a fighter takes from its ailments: the first (latest) one that has a tint. */
export function ailmentTint(list: readonly AilmentKey[]): number | undefined {
  for (const k of list) if (STATUS_STYLES[k].tint !== undefined) return STATUS_STYLES[k].tint;
  return undefined;
}

/** A small round chip with an ailment's icon in it (crossed out when it was shrugged off), its icon piece added to `bits` to be played. */
export function ailmentChip(key: AilmentKey, bits?: Bit[], crossed = false): Container {
  const style = STATUS_STYLES[key];
  const c = new Container();
  const g = new Graphics();
  g.circle(0, 0, CHIP_R).fill({ color: 0x140c08, alpha: 0.9 }).stroke({ color: style.rim, width: 1.5 });
  c.addChild(g);
  const part = style.parts.icon!;
  const sp = new Sprite(statusFrames(statusKey(key, 'icon'))[0]);
  sp.anchor.set(0.5);
  sp.scale.set(ICON_PX / STATUS_CELL);
  if (part.tint !== undefined) sp.tint = part.tint;
  c.addChild(sp);
  bits?.push({ sp, key: statusKey(key, 'icon'), part, y: 0, beat: (bits.length % 5) * 0.37 });
  if (crossed) {
    const x = new Graphics();
    x.moveTo(-5, -5).lineTo(5, 5).stroke({ color: 0xffffff, width: 1.6, alpha: 0.95 });
    c.addChild(x);
  }
  return c;
}

export class AilmentFx {
  /** Behind the fighter (ground rings, back layers) and in front of it (the rest, and the chips). */
  readonly back = new Container();
  readonly front = new Container();
  private bits: Bit[] = [];
  private key = '';
  private list: AilmentKey[] = [];

  /** What it shows now (the latest first). */
  get shown(): readonly AilmentKey[] {
    return this.list;
  }

  /** Bring the look up to the fighter's ailments at time `t`, and play it. */
  update(u: Unit, tall: number, t: number, calm: boolean, saver: boolean): void {
    const list = shownAilments(u, t);
    const key = `${list.join(',')}|${Math.round(tall)}|${saver ? 1 : 0}`;
    if (key !== this.key) {
      this.key = key;
      this.list = list;
      this.build(list, tall, saver);
    }
    if (!this.bits.length) return;
    for (const b of this.bits) {
      const frames = statusFrames(b.key);
      if (!frames.length) continue;
      b.sp.texture = calm ? frames[0] : frames[Math.floor(t / b.part.frameMs + b.beat * 3) % frames.length];
      if (b.mote !== undefined) {
        // (motes drift round the body on their own beats)
        const a = calm ? b.beat : t / 1400 + b.beat;
        b.sp.position.set(Math.cos(a) * tall * 0.32, b.y + Math.sin(a * 1.3) * tall * 0.08);
      }
    }
  }

  private build(list: readonly AilmentKey[], tall: number, saver: boolean): void {
    for (const c of [this.back, this.front]) for (const x of c.removeChildren()) x.destroy({ children: true });
    this.bits = [];
    if (!list.length) return;
    // (the body parts of the latest ailments)
    for (const [i, a] of list.slice(0, maxBodyFx(saver)).entries()) {
      const parts = STATUS_STYLES[a].parts;
      for (const place of ['ground', 'back', 'front', 'halo', 'motes'] as const) {
        const part = parts[place];
        if (!part || (saver && part.saver)) continue;
        for (let m = 0; m < (part.n ?? 1); m++) {
          const key = statusKey(a, place);
          const sp = new Sprite(statusFrames(key)[0]);
          sp.anchor.set(0.5);
          sp.scale.set((tall * part.size) / STATUS_CELL);
          // (FX-CLEAR: the parts in front of the body are see-through)
          sp.alpha = partAlpha(part);
          if (part.tint !== undefined) sp.tint = part.tint;
          const y = -tall * part.at;
          sp.position.set(0, y);
          (place === 'ground' || place === 'back' ? this.back : this.front).addChild(sp);
          this.bits.push({ sp, key, part, y, beat: i * 1.3 + m * 2.1 + place.length * 0.4, mote: place === 'motes' ? m : undefined });
        }
      }
    }
    // (a chip for each ailment, in a row just over the health bar)
    const chips = list.slice(0, MAX_CHIPS);
    chips.forEach((key, i) => {
      const c = ailmentChip(key, this.bits);
      c.position.set((i - (chips.length - 1) / 2) * CHIP_GAP, -tall - 17);
      this.front.addChild(c);
    });
  }
}
