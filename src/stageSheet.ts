// EIDOLON-BLENDER (docs/notes/eidolon-blender.md): a staged sheet played as a strip on the Eidolon's layer, over the fighters (the pillar,
// the blast, a tile's fire, the smoke). It is one element whose picture is the sheet's single row of frames, stepped by the layer's own
// strip animation (`ecFxPlay` in eidolons.css), so it freezes with the rest in the hit-stop and holds its steady frame with reduced
// motion as the painted strips do. Kept small and apart so a general frame-sheet player can take it over.
import { STAGE_PX, stageUrl, type StageSheet } from './eidolonStage';

/** The strip of `s` with its ground point at (x, y) (client px), `scale` screen px to a sheet px times `mul`; it plays once over `ms`
 *  (the sheet's own when not given) after `delay` ms, unseen until then. */
export function stageEl(s: StageSheet, x: number, y: number, scale: number, o: { delay?: number; ms?: number; mul?: number; cls?: string; flip?: boolean } = {}): HTMLElement {
  const d = document.createElement('i');
  d.className = `ecFx ecStage${o.cls ? ` ${o.cls}` : ''}`;
  const k = scale * (o.mul ?? 1);
  d.style.width = `${Math.round(s.fw * k)}px`;
  d.style.height = `${Math.round(s.fh * k)}px`;
  d.style.left = `${Math.round(x)}px`;
  d.style.top = `${Math.round(y)}px`;
  d.style.setProperty('--foot', `${((s.foot / s.fh) * 100).toFixed(2)}%`);
  if (o.flip) d.style.scale = '-1 1';
  d.style.backgroundImage = `url(${stageUrl(s)})`;
  d.style.backgroundSize = `${s.cols * 100}% 100%`;
  d.style.setProperty('--hold', `${s.n > 1 ? (s.hold / (s.n - 1)) * 100 : 0}%`);
  const ms = Math.round(o.ms ?? s.ms);
  const delay = Math.round(o.delay ?? 0);
  d.style.setProperty('--life', `${ms}ms`);
  d.style.setProperty('--delay', `${Math.max(0, delay)}ms`);
  const wait = delay > 0 ? `, ecFxIn 1ms linear ${delay}ms both` : '';
  d.style.animation = `ecFxPlay ${ms}ms steps(${s.n}, jump-none) ${delay}ms both${wait}, ecFxEnd 80ms linear ${delay + ms - 80}ms forwards`;
  return d;
}

/** Screen px to a sheet px, for a board drawn `k` screen px to its own. */
export const stageScale = (k: number): number => STAGE_PX * k;
