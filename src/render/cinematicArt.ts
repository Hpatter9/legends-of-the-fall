// The painted source atlas is bundled into game.js for offline play. Small, shared colour surfaces are prepared once;
// every effect still has a logical 32px frame, so the existing skill choreography retains its battlefield footprint.
import { Rectangle, Sprite, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import atlasUrl from '../art/fx/cinematic/painted-atlas.png';
import accentsUrl from '../art/fx/cinematic/accents-atlas.png';
import { FORMS, PALETTE, formOf, paintedPose, type Form, type PaintedElement } from './cinematicRules';
import type { Element, Family } from './fxRules';

interface Material { family: Family }
const materials = new WeakMap<Texture, Material>();
const sources = new Map<string, Texture>();
const strips = new Map<string, Texture[]>();
let atlas: HTMLImageElement;
let accents: HTMLImageElement;
let loading: Promise<void> | undefined;

export function loadPaintedArt(): Promise<void> {
  return loading ??= Promise.all([loadImage(atlasUrl), loadImage(accentsUrl)]).then(([main, detail]) => { atlas = main; accents = detail; });
}

const native: Partial<Record<Form, Element>> = { slash: 'wind', orb: 'fire', fire: 'fire', bolt: 'lightning', ice: 'ice', shield: 'light', rune: 'light', heal: 'forest', poison: 'poison', dark: 'dark', spark: 'light', stone: 'earth', wind: 'wind', blood: 'blood', pillar: 'light',
  arrow: 'wind', bone: 'earth', heart: 'light', cross: 'forest', ripple: 'ice', splash: 'ice', sparks: 'light', dust: 'earth', dash: 'wind', soul: 'dark', fireRing: 'fire', vines: 'forest', beam: 'light', snare: 'earth', nova: 'dark', electric: 'lightning' };

/** Keep native painted colour; other elements receive a luminance-preserving palette, with pale hot cores. */
function surface(form: Form, el: PaintedElement): Texture {
  const key = `${form}/${el}`;
  const existing = sources.get(key);
  if (existing) return existing;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const slot = FORMS.indexOf(form);
  const image = slot < 16 ? atlas : accents;
  const cell = image.width / 4;
  const index = slot % 16;
  // Insets prevent neighbouring cells from bleeding into a filtered texture.
  ctx.drawImage(image, (index % 4) * cell + 2, Math.floor(index / 4) * cell + 2, cell - 4, cell - 4, 4, 4, size - 8, size - 8);
  {
    const pixels = ctx.getImageData(0, 0, size, size);
    const c = PALETTE[el];
    const rgb = [c >> 16, (c >> 8) & 255, c & 255];
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (native[form] !== el && form !== 'smoke') {
        const l = Math.max(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]) / 255;
        const hot = Math.max(0, (l - 0.72) / 0.28) * 0.65;
        for (let k = 0; k < 3; k++) pixels.data[i + k] = Math.round((rgb[k] * (1 - hot) + 255 * hot) * (0.25 + l * 0.75));
      }
      const x = (i / 4) % size;
      const y = Math.floor(i / 4 / size);
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y) / 12;
      // Feather the cell margin, including tall flames, so its bounds cannot become a visible rectangle.
      const a = Math.max(0, Math.min(1, edge));
      pixels.data[i + 3] *= a * a * (3 - 2 * a);
    }
    ctx.putImageData(pixels, 0, 0);
  }
  const tex = Texture.from(canvas);
  tex.source.style.scaleMode = 'linear';
  sources.set(key, tex);
  return tex;
}

export function paintedStrip(el: PaintedElement, family: Family, form = formOf(el, family)): Texture[] {
  const key = `${el}-${family}/${form}`;
  const existing = strips.get(key);
  if (existing) return existing;
  const base = surface(form, el);
  const frames = materialFrames(base, family);
  strips.set(key, frames);
  return frames;
}

/** Register a shared source with a logical 32px frame and continuous material motion. */
export function materialFrames(base: Texture, family: Family): Texture[] {
  base.source.style.scaleMode = 'linear';
  const texture = new Texture({ source: base.source, frame: new Rectangle(0, 0, base.source.width, base.source.height), orig: new Rectangle(0, 0, 32, 32) });
  materials.set(texture, { family });
  return Array<Texture>(6).fill(texture);
}

/** Return false for ordinary fighter/prop textures, which retain their own animation and blending. */
export function paintSprite(sp: Sprite, elapsed: number, life: number, scale: number, rotation: number, alpha: number, loop: boolean, calm: boolean): boolean {
  const material = materials.get(sp.texture);
  if (!material) return false;
  const pose = paintedPose(material.family, elapsed / Math.max(1, life), elapsed, loop, calm);
  sp.scale.set(scale * pose.x, scale * pose.y);
  sp.rotation = rotation + pose.turn;
  sp.alpha = alpha * pose.alpha;
  // Normal blending preserves coloured flames, smoky edges and crystal detail under overlapping spell layers.
  // Only the tiny sparks add light; large additive paintings would wash the fighters out.
  sp.blendMode = material.family === 'sparkle' || material.family === 'cross' ? 'add' : 'normal';
  return true;
}
