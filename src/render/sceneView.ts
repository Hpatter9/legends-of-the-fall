// Playing a cinematic (sim/sceneScripts.ts; the clock in sceneClock.ts; which fighters play it in sim/sceneRules.ts). Over
// the whole page, like the Chronos cutscenes: a painted backdrop from the areas' layers (drifting at their own pace as the
// camera pans), the actors drawn from their own sheets, the camera cutting and drifting as each shot asks (always at a
// whole-number scale, so the pixels stay square), the effects over it. Round it, in the page (DOM): the black bars of a
// film, a chapter card, the speaker's name and the line typed out, Skip in the corner. A tap finishes the line or goes
// on; Skip ends it at once. The picture lives on its own small Pixi canvas, made when a scene starts and dropped when it
// ends, so nothing costs anything the rest of the time. It never touches a battle.

import { Application, Container, Graphics, Rectangle, Sprite, TilingSprite, Texture } from 'pixi.js';
import { FEET, fillLine, STAGE_H, STAGE_W, SCENES, type Scene, type SceneCue, type Shot } from '../sim/sceneScripts';
import { castOf, namesOf, type Cast, type Players } from '../sim/sceneRules';
import { UNITS } from '../sim/units';
import { backdropFiles } from './backdrop';
import { loadImage } from './loadImage';
import { facesRightOf, framesOf, figureOf, type Anim } from './sheets';
import { actorsAt, cameraAt, keepInside, lineNow, lineStart, lookAt, next, scaleOf, shotLength, start, tick, TYPE_RATE, typedChars, type ActorNow, type Cursor } from './sceneClock';
import { play } from './sound';
import { goatSheet } from '../duchess';
import { FRAME as GOAT_FRAME } from './duchessRules';
import { settings } from '../settings';
import type { Area } from '../sim/board';

/** The bars of a film, as shares of the screen's height: thin at the top, deeper at the foot for the subtitles. */
const BAR_TOP = 0.07;
const BAR_FOOT = 0.2;
/** Held upright, the picture is this tall for its width. */
const FRAME = 1.4;
/** A one-shot shake lasts this long (s), and a flash this long, at most this bright (the page's own flash is 110 ms). */
const SHAKE_S = 0.5;
const FLASH_S = 0.12;
const FLASH_ALPHA = 0.5;
/** A fade to or from black lasts this long (s). */
const FADE_S = 1.2;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const reduced = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Whether the screen is to stay still: shake off in the settings, or reduced motion on the device (the fight's own rule). */
const calm = (): boolean => reduced() || !settings().shake;

const textures = new Map<string, Promise<Texture>>();
const textureOf = (url: string): Promise<Texture> => {
  let t = textures.get(url);
  if (!t) {
    t = loadImage(url).then((img) => Texture.from(img));
    textures.set(url, t);
  }
  return t;
};

/** Duchess's six frames (48 px: three steps walking left, then three walking right; the middle one of each is standing), cut once. */
let goat: Promise<Texture[]> | null = null;
const goatFrames = (): Promise<Texture[]> =>
  (goat ??= goatSheet().then((img) => {
    const base = Texture.from(img);
    return Array.from({ length: 6 }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(i * GOAT_FRAME, 0, GOAT_FRAME, GOAT_FRAME) }));
  }));

/** What a scene's end was: played to the end, or skipped. */
export type Ending = 'done' | 'skipped';

/** The page's part: the bars, the caption, the subtitles, Skip. */
class Hud {
  readonly root = el('div');
  readonly host = el('div', 'csStage');
  private readonly who = el('div', 'csWho');
  private readonly text = el('div', 'csText');
  private readonly more = el('div', 'csMore', '▾');
  private readonly cap = el('div', 'csCaption');
  private readonly top = el('div', 'csBar csTop');
  private readonly foot = el('div', 'csBar csFoot');
  readonly skip = el('button', 'csSkip', 'Skip');

  constructor() {
    this.root.id = 'cutscene';
    this.root.hidden = true;
    this.skip.type = 'button';
    this.skip.setAttribute('aria-label', 'Skip this scene');
    this.top.append(this.skip);
    this.foot.append(this.who, this.text, this.more);
    this.root.append(this.host, this.top, this.cap, this.foot);
    document.body.append(this.root);
  }

  show(on: boolean): void {
    this.root.hidden = !on;
  }

  layout(bandTop: number, bandH: number, h: number): void {
    this.top.style.height = `${bandTop}px`;
    this.foot.style.top = `${bandTop + bandH}px`;
    this.foot.style.height = `${h - bandTop - bandH}px`;
    this.cap.style.top = `${Math.max(0, bandTop - 44)}px`;
  }

  line(who: string | null, text: string, tone: string, full: boolean): void {
    if (this.who.textContent !== (who ?? '')) this.who.textContent = who ?? '';
    this.who.hidden = !who;
    if (this.text.textContent !== text) this.text.textContent = text;
    this.text.dataset.tone = tone;
    this.more.hidden = !full || !text;
  }

  caption(text: string | null, alpha: number): void {
    if (this.cap.textContent !== (text ?? '')) this.cap.textContent = text ?? '';
    this.cap.style.opacity = text ? String(alpha) : '0';
  }
}

/** One actor on the stage: its shadow and its sprite. */
interface Figure {
  box: Container;
  body: Sprite;
}

export class ScenePlayer {
  private hud: Hud | null = null;
  private busy = false;
  private run: Run | null = null;

  /** Whether a scene is playing now. */
  get playing(): boolean {
    return this.busy;
  }

  /** Play a scene to its end (or until it is skipped) and say which. A scene already playing is not interrupted: this one ends at once, skipped. */
  async play(id: string, players: Players): Promise<Ending> {
    const scene = SCENES[id];
    if (!scene || this.busy) return 'skipped';
    this.busy = true;
    try {
      this.run = new Run(scene, players, (this.hud ??= new Hud()));
      return await this.run.go();
    } finally {
      this.busy = false;
      this.run = null;
    }
  }

  /** Jump to a line of a shot (and `sec` seconds into it), for previews and screenshots (`__game.scenes.seek(1, 2, 1.5)`: the clock holds there until a tap). */
  seek(shot: number, beat = 0, sec = 0): void {
    this.run?.seek(shot, beat, sec);
  }
}

class Run {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly back = new Container();
  private readonly actors = new Container();
  private readonly veil = new Graphics();
  private readonly figures = new Map<string, Figure>();
  private photo: TilingSprite[] = [];
  private cursor: Cursor = start();
  private readonly cast: Record<string, Cast>;
  private readonly names: Record<string, string>;
  private w = 1;
  private h = 1;
  private bandTop = 0;
  private bandH = 1;
  private cued = -1;
  private frozen = false;
  private goat: Texture[] | null = null;
  private ended: ((e: Ending) => void) | null = null;
  private now = 0;
  private readonly keys = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.finish('skipped');
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.tap();
    }
  };
  private readonly resize = (): void => this.layout();

  constructor(
    private readonly scene: Scene,
    players: Players,
    private readonly hud: Hud,
  ) {
    this.cast = castOf(scene, players);
    this.names = namesOf(this.cast);
  }

  /** Play to the end. A stage that cannot start (no WebGL, say) is a scene skipped: the game goes on without it. */
  async go(): Promise<Ending> {
    const hud = this.hud;
    hud.show(true);
    hud.line(null, '', '', false);
    hud.caption(null, 0);
    const tapped = (): void => this.tap();
    const skipped = (e: Event): void => {
      e.stopPropagation();
      this.finish('skipped');
    };
    let result: Ending = 'skipped';
    try {
      // (the stage first: a canvas as big as the column, black until the backdrop has loaded)
      await this.app.init({ resizeTo: hud.host, backgroundColor: 0x000000, antialias: false, roundPixels: true, autoDensity: true, resolution: Math.min(3, devicePixelRatio || 1) });
      hud.host.append(this.app.canvas);
      this.world.addChild(this.back, this.actors);
      this.app.stage.addChild(this.world, this.veil);
      this.layout();
      window.addEventListener('resize', this.resize);
      window.addEventListener('keydown', this.keys);
      hud.root.addEventListener('click', tapped);
      hud.skip.addEventListener('click', skipped);
      if (Object.values(this.scene.cast).some((m) => m.role === 'duchess')) this.goat = await goatFrames();
      // (the backdrops of every shot are loaded up front, so a cut never shows an empty stage)
      this.loadLooks().catch(() => undefined);
      const ending = new Promise<Ending>((ok) => (this.ended = ok));
      this.app.ticker.add((tk) => this.frame(tk.deltaMS / 1000, tk.lastTime));
      result = await ending;
    } catch {
      /* (skipped) */
    } finally {
      window.removeEventListener('resize', this.resize);
      window.removeEventListener('keydown', this.keys);
      hud.root.removeEventListener('click', tapped);
      hud.skip.removeEventListener('click', skipped);
      // (the stage's own things go; the sheets' and backdrops' textures are shared and stay)
      try {
        this.app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
      } catch {
        /* (it never got as far as a renderer) */
      }
      hud.show(false);
    }
    return result;
  }

  /** Jump there and hold the clock still (a tap lets it go on), so a screenshot is of exactly that moment. */
  seek(shot: number, beat: number, sec: number): void {
    const s = this.scene.shots[shot];
    if (!s) return;
    this.cursor = { shot, beat, t: sec, shotT: lineStart(s, beat) + sec };
    this.frozen = true;
  }

  private finish(how: Ending): void {
    const done = this.ended;
    this.ended = null;
    done?.(how);
  }

  private layout(): void {
    const w = Math.min(innerWidth, 480);
    const h = innerHeight;
    this.w = w;
    this.h = h;
    const top = Math.round(h * BAR_TOP);
    const foot = Math.round(h * BAR_FOOT);
    const room = h - top - foot;
    this.bandH = Math.min(room, Math.round(w * FRAME));
    this.bandTop = top + Math.round((room - this.bandH) * 0.4);
    this.hud.layout(this.bandTop, this.bandH, h);
  }

  /** The backdrop of an area: its layers, back to front, tiled across the stage; swapped in when loaded. */
  private look = '';
  private setLook(area: Area): void {
    if (this.look === area) return;
    this.look = area;
    for (const l of this.photo) l.destroy();
    this.photo = [];
    Promise.all(backdropFiles(area).map(textureOf))
      .then((tex) => {
        if (this.look !== area) return;
        this.photo = tex.map((t) => {
          const l = new TilingSprite({ texture: t, width: STAGE_W * 3, height: STAGE_H });
          l.x = -STAGE_W;
          return l;
        });
        this.back.addChild(...this.photo);
      })
      .catch(() => undefined);
  }

  private async loadLooks(): Promise<void> {
    const areas = new Set<Area>();
    for (let i = 0; i < this.scene.shots.length; i++) areas.add(lookAt(this.scene, i) as Area);
    await Promise.all([...areas].flatMap((a) => backdropFiles(a).map(textureOf)));
  }

  /** A tap: the line typed out in full, else the next line or shot, else the end. */
  private tap(): void {
    this.frozen = false;
    const line = lineNow(this.cursor, this.scene);
    const text = line ? fillLine(line.text, this.names) : '';
    if (line && !reduced() && typedChars(text, this.cursor.t) < text.length) {
      // (still typing: the line shown whole, the beat going on from there)
      const t = text.length / TYPE_RATE;
      this.cursor = { ...this.cursor, shotT: this.cursor.shotT + (t - this.cursor.t), t };
      return;
    }
    const n = next(this.cursor, this.scene);
    if (!n) return this.finish('done');
    this.cursor = n;
  }

  private frame(dt: number, now: number): void {
    if (!this.ended) return;
    this.now = now;
    const scene = this.scene;
    const moved = tick(this.cursor, scene, this.frozen ? 0 : Math.min(dt, 0.1));
    if (!moved) return this.finish('done');
    this.cursor = moved;
    const c = this.cursor;
    const shot = scene.shots[c.shot];
    this.setLook(lookAt(scene, c.shot) as Area);
    if (this.cued !== c.shot) {
      this.cued = c.shot;
      if (shot.cue) this.cue(shot.cue);
    }
    const actors = actorsAt(scene, c);
    const cam = cameraAt(scene, c, actors, reduced());
    // the camera: a whole-number scale (at least what covers the picture), the centre on a whole art pixel
    const k = scaleOf(cam.zoom, Math.max(this.w / STAGE_W, this.bandH / STAGE_H));
    const mid = keepInside(cam, k, this.w, this.bandH);
    let sx = 0;
    let sy = 0;
    const fx = shot.fx ?? [];
    if (!calm()) {
      if (fx.includes('shake') && c.shotT < SHAKE_S) {
        const a = (1 - c.shotT / SHAKE_S) * 6;
        sx = Math.round(Math.sin(c.shotT * 90) * a);
        sy = Math.round(Math.cos(c.shotT * 70) * a * 0.6);
      }
      if (fx.includes('rumble')) {
        sx += Math.round(Math.sin(now / 37));
        sy += Math.round(Math.cos(now / 29) * 0.6);
      }
    }
    this.world.scale.set(k);
    this.world.pivot.set(Math.round(mid.x), Math.round(mid.y));
    this.world.position.set(Math.round(this.w / 2) + sx, Math.round(this.bandTop + this.bandH / 2) + sy);
    // (the layers drift at their own pace as the camera pans: far ones slower)
    this.photo.forEach((l, i) => (l.tilePosition.x = Math.round(mid.x * (1 - (i + 1) / this.photo.length) * 0.5)));
    this.drawActors(actors, c);
    this.drawVeil(shot, c.shotT);
    // the words
    const line = lineNow(c, scene);
    const text = line ? fillLine(line.text, this.names) : '';
    const shown = text.slice(0, typedChars(text, c.t, reduced()));
    const who = line && line.who !== 'narrator' ? (this.names[line.who] ?? line.who) : null;
    this.hud.line(who, shown, line?.tone ?? (line && !who ? 'narrator' : ''), shown.length === text.length);
    const capAlpha = shot.caption && c.shotT < 4 ? Math.max(0, Math.min(1, c.shotT / 0.8, (4 - c.shotT) / 0.8)) : 0;
    this.hud.caption(shot.caption ?? null, reduced() ? (capAlpha > 0 ? 1 : 0) : capAlpha);
  }

  private cue(name: SceneCue): void {
    play(name);
  }

  /** Each actor from its own sheet: walking, striking, fallen or standing (the speaker breathing a little). */
  private drawActors(actors: Record<string, ActorNow>, c: Cursor): void {
    const speaking = lineNow(c, this.scene)?.who;
    for (const [id, a] of Object.entries(actors)) {
      const kind = this.cast[id]?.kind;
      let f = this.figures.get(id);
      if (!kind) {
        if (this.scene.cast[id].role === 'duchess') this.drawGoat(id, a);
        else if (f) f.box.visible = false;
        continue;
      }
      const def = UNITS[kind];
      if (!f) {
        const box = new Container();
        const shadow = new Graphics().ellipse(0, 0, 13, 4).fill({ color: 0x000000, alpha: 0.32 });
        const body = new Sprite();
        body.anchor.set(0.5, 1);
        box.addChild(shadow, body);
        this.actors.addChild(box);
        f = { box, body };
        this.figures.set(id, f);
        shadow.scale.set(((figureOf(def.sheet) * def.scale) / 40) * (this.scene.cast[id].scale ?? 1));
      }
      f.box.visible = a.visible;
      if (!a.visible) continue;
      const m = this.scene.cast[id];
      const anim: Anim = a.walking ? 'walk' : a.pose === 'strike' || a.pose === 'cast' ? 'attack' : a.pose === 'hurt' ? 'hurt' : a.pose === 'down' ? 'dead' : 'idle';
      const list = framesOf(def.sheet, anim);
      const frame = anim === 'dead' ? list.length - 1 : anim === 'walk' ? Math.floor(a.walked * 9) : anim === 'attack' ? Math.floor(this.now / 120) : Math.floor(this.now / 170);
      f.body.texture = list[frame % list.length];
      const dir = (a.facing === 'right' ? 1 : -1) * (facesRightOf(def.sheet) ? 1 : -1);
      const k = def.scale * (m.scale ?? 1);
      f.body.scale.set(k * dir, k);
      f.body.tint = m.shade ? 0x000000 : 0xffffff;
      const bob = speaking === id && a.pose !== 'down' && !reduced() ? Math.round(Math.sin(this.now / 160)) : 0;
      f.body.y = -bob;
      f.box.position.set(Math.round(a.x), FEET);
    }
  }

  /** Duchess: her sheet's standing frame (chewing, a pixel up and down on a slow beat) or her steps, facing as cast. */
  private drawGoat(id: string, a: ActorNow): void {
    let f = this.figures.get(id);
    if (!f) {
      const box = new Container();
      const shadow = new Graphics().ellipse(0, 0, 11, 3.5).fill({ color: 0x000000, alpha: 0.32 });
      const body = new Sprite();
      body.anchor.set(0.5, 1);
      box.addChild(shadow, body);
      this.actors.addChild(box);
      f = { box, body };
      this.figures.set(id, f);
    }
    f.box.visible = a.visible && !!this.goat;
    if (!f.box.visible || !this.goat) return;
    const step = a.walking ? [0, 1, 2, 1][Math.floor(a.walked * 4) % 4] : 1;
    f.body.texture = this.goat[(a.facing === 'right' ? 3 : 0) + step];
    f.body.y = a.walking || reduced() ? 0 : Math.floor(this.now / 420) % 2;
    f.box.position.set(Math.round(a.x), FEET);
  }

  /** The effects over the picture: a pall, a warm glow, a fade, the one-shot flash. Nothing loops. */
  private drawVeil(shot: Shot, t: number): void {
    const fx = shot.fx ?? [];
    const v = this.veil.clear();
    const { w, h } = this;
    if (fx.includes('darken')) v.rect(0, 0, w, h).fill({ color: 0x000010, alpha: 0.3 });
    if (fx.includes('glow')) v.rect(0, 0, w, h).fill({ color: 0xff8a30, alpha: 0.1 });
    if (fx.includes('fadeIn') && t < FADE_S) v.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 1 - t / FADE_S });
    if (fx.includes('fadeOut')) {
      const left = shotLength(shot) - t;
      if (left < FADE_S) v.rect(0, 0, w, h).fill({ color: 0x000000, alpha: Math.min(1, 1 - left / FADE_S) });
    }
    if (fx.includes('flash') && !calm() && t < FLASH_S) v.rect(0, 0, w, h).fill({ color: 0xffffff, alpha: FLASH_ALPHA * (1 - t / FLASH_S) });
  }
}
