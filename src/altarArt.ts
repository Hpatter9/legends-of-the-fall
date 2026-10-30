// Original altar artwork, bundled with the game so it is available offline.
import atlas from './art/altar/patrons-atlas.webp';
import backdrop from './art/altar/sanctuary.webp';
import manifest from './art/altar/manifest.json';

export const altarBackdrop = backdrop;
export type AltarPicture = keyof typeof manifest.frames;
export function altarPicture(name: AltarPicture, cls = ''): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const f = manifest.frames[name];
  svg.setAttribute('viewBox', `${f.x} ${f.y} ${f.width} ${f.height}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('altarArt');
  if (cls) svg.classList.add(cls);
  const image = document.createElementNS(ns, 'image');
  image.setAttribute('href', atlas);
  image.setAttribute('width', String(manifest.width));
  image.setAttribute('height', String(manifest.height));
  svg.append(image);
  return svg;
}
