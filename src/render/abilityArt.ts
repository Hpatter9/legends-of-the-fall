// Each named skill/spell gets its own painted source cell. Prepare small reusable surfaces, then release the decoded atlases.
import { Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import { materialFrames } from './cinematicArt';
import { cleanAtlasCell } from './atlasCell';
import { ABILITY_ART } from './abilityLooks';
import type { Family } from './fxRules';
import a0 from '../art/fx/abilities/atlas-0.png';
import a1 from '../art/fx/abilities/atlas-1.png';
import a2 from '../art/fx/abilities/atlas-2.png';
import a3 from '../art/fx/abilities/atlas-3.png';
import a4 from '../art/fx/abilities/atlas-4.png';
import a5 from '../art/fx/abilities/atlas-5.png';
import a6 from '../art/fx/abilities/atlas-6.png';
import a7 from '../art/fx/abilities/atlas-7.png';
import a8 from '../art/fx/abilities/atlas-8.png';
// (KING-SPELLS batch 5: the schools' fourteen spells' own emblems, `tools/king-spells/icons.py`)
import a9 from '../art/fx/abilities/atlas-9.png';
// (the nine heroes joined from the twenty: their skill 1 and ultimate paintings, `tools/heroes-20/import-ability-icons.py`)
import a10 from '../art/fx/abilities/atlas-10.png';
// (the five Mythics: their skill 1 and ultimate leads, cut from the painted spell sheets by `tools/mythics/ability-art.py`)
import a11 from '../art/fx/abilities/atlas-11.png';
// (the other eleven of the twenty: their skill 1 and ultimate leads, `tools/heroes-20/import-ability-icons-2.py`; six share atlas-11)
import a12 from '../art/fx/abilities/atlas-12.png';

const bases = new Map<string, Texture>();
const frames = new Map<string, Texture[]>();
let loading: Promise<void> | undefined;

export function loadAbilityArt(): Promise<void> {
  return loading ??= (async () => {
    const images = await Promise.all([a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12].map(loadImage));
    for (const row of ABILITY_ART) {
      const image = images[row.atlas];
      const columns = row.atlas === 8 ? 1 : 4;
      const cell = image.width / columns;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d')!;
      g.drawImage(image, (row.cell % columns) * cell, Math.floor(row.cell / columns) * cell, cell, cell, 4, 4, 120, 120);
      const pixels = g.getImageData(0, 0, 128, 128);
      cleanAtlasCell(pixels.data, 128);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const x = (i / 4) % 128, y = Math.floor(i / 4 / 128);
        const edge = Math.max(0, Math.min(1, Math.min(x, y, 127 - x, 127 - y) / 12));
        pixels.data[i + 3] *= edge * edge * (3 - 2 * edge);
      }
      g.putImageData(pixels, 0, 0);
      const base = Texture.from(canvas);
      base.source.style.scaleMode = 'linear';
      bases.set(row.id, base);
    }
  })();
}

export function abilityFrames(id: string, family: Family = 'hit'): Texture[] | undefined {
  const key = `${id}/${family}`;
  const existing = frames.get(key);
  if (existing) return existing;
  const base = bases.get(id);
  if (!base) return undefined;
  const strip = materialFrames(base, family);
  frames.set(key, strip);
  return strip;
}
