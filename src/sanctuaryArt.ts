// The original six-world atlas stays intact; SVG viewports select its equal panels.
import sanctuary from './art/rift-sanctuary/sanctuary.webp';
import destinations from './art/rift-sanctuary/destinations.webp';
import { WORLD_IDS, type RiftWorld } from './sim/sanctuary';
export { sanctuary };
export function worldPicture(world: RiftWorld, cls = ''): SVGSVGElement {
  const i = WORLD_IDS.indexOf(world), ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `${i % 2 * 627} ${Math.floor(i / 2) * 418} 627 418`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('class', `riftLandscape ${cls}`);
  svg.setAttribute('aria-hidden', 'true');
  const img = document.createElementNS(ns, 'image');
  img.setAttribute('href', destinations);
  img.setAttribute('width', '1254');img.setAttribute('height', '1254');
  svg.append(img);
  return svg;
}
