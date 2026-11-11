// EIDOLON-BLENDER (docs/notes/eidolon-blender.md): a staged sheet played as a strip on the Eidolon's layer, over the fighters (the pillar,
// the explosion, a tile's fire, the smoke, the embers). It is one element whose picture is the sheet's frames, stepped by the layer's own
// strip animation (`ecFxPlay` in eidolons.css), so it freezes with the rest in the hit-stop and holds its steady frame with reduced
// motion as the painted strips do. Kept small and apart so a general frame-sheet player can take it over.
import { glowUrl, STAGE_PX, stageUrl, type StageSheet } from './eidolonStage';

/** The strip of `s` with its ground point at (x, y) (client px), `scale` screen px to a sheet px times `mul`; it plays once over `ms`
 *  (the sheet's own when not given) after `delay` ms, unseen until then, or over and over (`loop`). A sheet of several rows steps along
 *  each row in turn. `glow` draws the sheet's glow sheet instead (the same frames, soft, added as light). */
export function stageEl(s: StageSheet, x: number, y: number, scale: number, o: { delay?: number; ms?: number; mul?: number; cls?: string; flip?: boolean; loop?: boolean; glow?: boolean } = {}): HTMLElement {
  const d = document.createElement('i');
  d.className = `ecFx ecStage${o.glow ? ' ecStageGlow' : ''}${o.cls ? ` ${o.cls}` : ''}`;
  const k = scale * (o.mul ?? 1);
  const rows = Math.ceil(s.n / s.cols);
  d.style.width = `${Math.round(s.fw * k)}px`;
  d.style.height = `${Math.round(s.fh * k)}px`;
  d.style.left = `${Math.round(x)}px`;
  d.style.top = `${Math.round(y)}px`;
  d.style.setProperty('--foot', `${((s.foot / s.fh) * 100).toFixed(2)}%`);
  if (o.flip) d.style.scale = '-1 1';
  d.style.backgroundImage = `url(${o.glow ? glowUrl(s) : stageUrl(s)})`;
  d.style.backgroundSize = `${s.cols * 100}% ${rows * 100}%`;
  d.style.setProperty('--hold', `${s.cols > 1 ? ((s.hold % s.cols) / (s.cols - 1)) * 100 : 0}%`);
  d.style.setProperty('--holdY', `${rows > 1 ? (Math.floor(s.hold / s.cols) / (rows - 1)) * 100 : 0}%`);
  const ms = Math.round(o.ms ?? s.ms);
  const delay = Math.round(o.delay ?? 0);
  d.style.setProperty('--life', `${ms}ms`);
  d.style.setProperty('--delay', `${Math.max(0, delay)}ms`);
  if (o.loop) {
    d.style.animation = `ecFxPlay ${ms}ms steps(${s.cols}, jump-none) ${delay}ms infinite, ecFxIn 500ms ease-out ${Math.max(0, delay)}ms both`;
    return d;
  }
  const wait = delay > 0 ? `, ecFxIn 1ms linear ${delay}ms both` : '';
  const along = `ecFxPlay ${Math.round(ms / rows)}ms steps(${s.cols}, jump-none) ${delay}ms ${rows} both`;
  const down = rows > 1 ? `, ecFxRows ${ms}ms steps(${rows}, jump-none) ${delay}ms both` : '';
  d.style.animation = `${along}${down}${wait}, ecFxEnd 80ms linear ${delay + ms - 80}ms forwards`;
  return d;
}

/** A strip with its glow under it, when its sheet has one: the glow first, so the strip is drawn over it. */
export function stageEls(s: StageSheet, x: number, y: number, scale: number, o: Parameters<typeof stageEl>[4] = {}): HTMLElement[] {
  return s.lit ? [stageEl(s, x, y, scale, { ...o, glow: true }), stageEl(s, x, y, scale, o)] : [stageEl(s, x, y, scale, o)];
}

/** Screen px to a sheet px, for a board drawn `k` screen px to its own. */
export const stageScale = (k: number): number => STAGE_PX * k;
