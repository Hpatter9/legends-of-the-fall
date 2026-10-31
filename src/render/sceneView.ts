// Playing a cinematic (sim/sceneScripts.ts; the clock in sceneClock.ts; which fighters play it in sim/sceneRules.ts). Since CINE-001
// a scene is played as a film is cut (`sim/cineDirector.ts` turns the written shots into coverage; `cineShots.ts` holds the numbers):
// every shot has a framing (wide, medium, close, extreme, over the shoulder, low, high, Dutch), a move (push in, pull out, pan,
// rack focus, snap zoom ...) and a cut (a fade, a smash through black, a flash through white, a cross-fade). The pixel stage is drawn
// sharp at a whole-number size into a texture, then eased to the camera's real size, so a slow push in glides without the pixels
// crawling; a close-up on a hero is their painted portrait over the land thrown out of focus. Over it: the land's weather (embers,
// snow, rain, dust, motes, ash, leaves), shafts of light, a vignette, foreground rocks in the wide views. Round it, in the page (DOM):
// the black bars of a film, a chapter card, a title card, the speaker's name and the line typed out at the pace of its punctuation
// (with a faint blip in the speaker's voice), Skip in the corner. A tap finishes the line or goes on; holding a finger down (or Skip)
// ends the scene. Reduced motion: nothing moves, tilts or zooms, and every cut is a cross-fade. A battery saver: fewer motes, no
// blur, no rays. The picture lives on its own small Pixi canvas, made when a scene starts and dropped when it ends. It never
// touches a battle.

import { Application, BlurFilter, Container, Graphics, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import { FEET, fillLine, plainText, STAGE_H, STAGE_W, SCENES, type Angle, type Scene, type SceneCue, type Shot, type Weather } from '../sim/sceneScripts';
import { castOf, namesOf, type Cast, type Players } from '../sim/sceneRules';
import { direct } from '../sim/cineDirector';
import { ALL_HEROES, UNITS } from '../sim/units';
import { battleSheet } from './awakenLook';
import { backdropFiles } from './backdrop';
import { AREA_URLS } from './areaArt';
import { loadImage } from './loadImage';
import { facesRightOf, framesOf, figureOf, type Anim } from './sheets';
import { actorsAt, cameraAt, keepInside, lineNow, lineStart, lookAt, next, shotLength, start, tick, type ActorNow, type Cursor } from './sceneClock';
import { barsOf, blipsBetween, cutVeil, emphasis, frame, HIT_CUTS, outVeil, PORTRAIT_ANGLES, pressOf, sharpScale, typedCount, typeLength, VOICE_CUE, weightOf, type Aim, type Voice } from './cineShots';
import { duck, endScene, play, playScene } from './sound';
import { goatSheet } from '../duchess';
import { AwakenAura } from './awakenAura';
import { FRAME as GOAT_FRAME } from './duchessRules';
import { settings } from '../settings';
import { rulerTextures } from './rulerArt';
import { rulerFrame, rulerOf, rulerWords, type RulerAction } from '../rulerRules';
import type { Area } from '../sim/board';
import { FACES, GWEN } from '../questArt';
import type { GiverId } from '../sim/questData';

/** The bars of a film, as shares of the screen's height: thin at the top, deeper at the foot for the subtitles. */
const BAR_TOP = 0.07;
const BAR_FOOT = 0.2;
/** Held upright, the picture is this tall for its width. */
const FRAME = 1.4;
/** A one-shot shake lasts this long (s), and a flash this long, at most this bright. */
const SHAKE_S = 0.5;
const FLASH_S = 0.12;
const FLASH_ALPHA = 0.5;
/** A fade to or from black lasts this long (s). */
const FADE_S = 1.2;
/** The stage's base size (screen px to an art px) at zoom 1. */
const BASE_SCALE = 2;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The colour of each land's sky (the top of its first layer), laid under the layers. */
const SKY: Record<Area, number> = {
  highlands: 0xcfc7df, forest: 0x249fde, snow: 0x6b99bc, desert: 0xe9f6fa, volcano: 0x0a0406, dungeon: 0x212a36, plains: 0x3784c4, autumn: 0xd8efff, swamp: 0x336249,
  graveyard: 0x77935c, ruins: 0xc6aa93, temple: 0x98bdc3, crystal: 0x80acae, forge: 0x040204, shrine: 0x000520, warcamp: 0x351c17, oasis: 0x98bdc3,
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

/* ------------------------------------------------------------ the heroes' painted portraits */

/** A hero's painted cutout and where its head is (in the picture's own px): the top of the head, the head's middle, the figure's height. */
interface Portrait {
  tex: Texture;
  top: number;
  hx: number;
  fh: number;
}
const portraits = new Map<string, Promise<Portrait | null>>();
/** The portraits loaded so far (null: none to be had), read as the frames are drawn. */
const portraitsReady = new Map<string, Portrait | null>();
/** The art a hero's close-up uses: the awakened picture once awakened, else the portrait cutout (both kept offline by the build). */
const portraitUrl = (kind: string, look: number): string => (look > 0 ? `heroes/awakened-${kind}.webp` : `heroes/${kind}-portrait.webp`);
/** Heads the scan below cannot find (a weapon held high, a banner, a plume), set by eye: the head's middle across and its top, as
 *  shares of the portrait cutout. */
const FACE_AT: Readonly<Record<string, readonly [number, number]>> = {
  barbarian: [0.36, 0.12], gorgon: [0.39, 0.05], karasu: [0.58, 0.2], siegeBot: [0.44, 0.15], warlock: [0.42, 0.16], gunslinger: [0.47, 0.05], lancer: [0.55, 0.08],
};
/** Load a hero's portrait and find its head: the first rows with paint in them, and the middle of the paint across them. */
function portraitOf(kind: string, look: number): Promise<Portrait | null> {
  const url = portraitUrl(kind, look);
  let p = portraits.get(url);
  if (!p) {
    p = loadImage(url)
      .then((img) => {
        const w = 80;
        const h = Math.max(1, Math.round((img.height / img.width) * w));
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const g = cv.getContext('2d', { willReadFrequently: true });
        if (!g) return null;
        g.drawImage(img, 0, 0, w, h);
        const data = g.getImageData(0, 0, w, h).data;
        const solid = (x: number, y: number): boolean => data[(y * w + x) * 4 + 3] > 60;
        // (each row's widest run of paint: a head is wide, a bow's tip or a spike of hair is not)
        const run = (y: number): { width: number; mid: number } => {
          let best = { width: 0, mid: w / 2 };
          let from = -1;
          for (let x = 0; x <= w; x++) {
            const on = x < w && solid(x, y);
            if (on && from < 0) from = x;
            if (!on && from >= 0) {
              if (x - from > best.width) best = { width: x - from, mid: (from + x) / 2 };
              from = -1;
            }
          }
          return best;
        };
        let top = -1;
        let bottom = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (solid(x, y)) ((top = top < 0 ? y : top), (bottom = y));
        if (top < 0) return null;
        // (the head's top: the first row with a run of paint a tenth of the picture wide; its middle: the runs' middle just under it)
        let head = top;
        while (head < bottom && run(head).width < w * 0.1) head++;
        const band = Math.max(2, Math.round((bottom - top) * 0.08));
        const mids: number[] = [];
        for (let y = head; y < head + band && y < h; y++) mids.push(run(y).mid);
        mids.sort((x, y) => x - y);
        const hx = mids.length ? mids[mids.length >> 1] : w / 2;
        const k = img.width / w;
        const set = look > 0 ? undefined : FACE_AT[kind];
        return { tex: Texture.from(img), top: set ? set[1] * img.height : head * k, hx: set ? set[0] * img.width : hx * k, fh: (bottom - top) * k };
      })
      .catch(() => null)
      .then((x) => {
        portraitsReady.set(url, x);
        return x;
      });
    portraits.set(url, p);
  }
  return p;
}

/** Duchess's six frames (48 px: three steps walking left, then three walking right; the middle one of each is standing), cut once. */
let goat: Promise<Texture[]> | null = null;
const goatFrames = (): Promise<Texture[]> =>
  (goat ??= goatSheet().then((img) => {
    const base = Texture.from(img);
    return Array.from({ length: 6 }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(i * GOAT_FRAME, 0, GOAT_FRAME, GOAT_FRAME) }));
  }));

/** A soft dark ring round the picture's edges, painted once. */
let vignetteTex: Texture | null = null;
function vignette(): Texture {
  if (vignetteTex) return vignetteTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 26, 64, 64, 92);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return (vignetteTex = Texture.from(cv));
}

/** What a scene's end was: played to the end, or skipped. */
export type Ending = 'done' | 'skipped';

/** The page's part: the bars, the caption, the title card, the subtitles, Skip, the ring of a held finger. One for the page. */
class Hud {
  readonly root = el('div');
  readonly host = el('div', 'csStage');
  private readonly who = el('div', 'csWho');
  private readonly text = el('div', 'csText');
  private readonly more = el('div', 'csMore', '▾');
  private readonly cap = el('div', 'csCaption');
  private readonly title = el('div', 'csTitle');
  private readonly titleOver = el('small');
  private readonly titleName = el('b');
  private readonly top = el('div', 'csBar csTop');
  private readonly foot = el('div', 'csBar csFoot');
  readonly ring = el('div', 'csRing');
  readonly skip = el('button', 'csSkip', 'Skip');
  private shown = '';

  constructor() {
    this.root.id = 'cutscene';
    this.root.hidden = true;
    this.skip.type = 'button';
    this.skip.setAttribute('aria-label', 'Skip this scene');
    this.top.append(this.skip);
    this.foot.append(this.who, this.text, this.more);
    this.title.append(this.titleOver, this.titleName);
    this.ring.hidden = true;
    this.root.append(this.host, this.title, this.top, this.cap, this.foot, this.ring);
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
    this.title.style.top = `${bandTop + bandH * 0.2}px`;
  }

  /** The line as typed so far: `n` letters of it, the words said with weight drawn brighter. */
  line(who: string | null, text: string, n: number, tone: string, full: boolean): void {
    if (this.who.textContent !== (who ?? '')) this.who.textContent = who ?? '';
    this.who.hidden = !who;
    const key = `${text}|${n}`;
    if (this.shown !== key) {
      this.shown = key;
      this.text.replaceChildren();
      let left = n;
      for (const r of emphasis(text)) {
        if (left <= 0) break;
        const part = r.text.slice(0, left);
        left -= part.length;
        this.text.append(r.em ? el('em', 'csEm', part) : document.createTextNode(part));
      }
    }
    this.text.dataset.tone = tone;
    this.more.hidden = !full || !text;
  }

  caption(text: string | null, alpha: number): void {
    if (this.cap.textContent !== (text ?? '')) this.cap.textContent = text ?? '';
    this.cap.style.opacity = text ? String(alpha) : '0';
  }

  card(t: { over: string; name: string } | null, alpha: number): void {
    if (t && this.titleName.textContent !== t.name) {
      this.titleOver.textContent = t.over;
      this.titleName.textContent = t.name;
    }
    this.title.style.opacity = t ? String(alpha) : '0';
  }

  press(ring: number): void {
    this.ring.hidden = ring <= 0;
    this.ring.style.setProperty('--p', `${Math.round(ring * 360)}deg`);
  }
}

let sharedHud: Hud | null = null;
/** Whether any player has a scene up now (the page and the Last Stand each have one; only one plays at a time). */
let anyBusy = false;

/** One actor on the stage: its shadow and its sprite. */
interface Figure {
  actionShot?: number;
  action?: RulerAction;
  actionAt?: number;
  box: Container;
  body: Sprite;
  /** The figure's height on the stage (art px), for the camera's framings. */
  height: number;
  /** The awakened step drawn now, and its aura. */
  look?: number;
  aura?: AwakenAura;
}

export class ScenePlayer {
  private run: Run | null = null;

  /** Whether a scene is playing now. */
  get playing(): boolean {
    return anyBusy;
  }

  /** Play a scene to its end (or until it is skipped) and say which. A scene already playing is not interrupted: this one ends at once, skipped. `quick`: any tap ends it, where a tap otherwise moves on a beat. */
  async play(id: string | Scene, players: Players, quick = false): Promise<Ending> {
    const written = typeof id === 'string' ? SCENES[id] : id;
    if (!written || anyBusy) return 'skipped';
    anyBusy = true;
    try {
      this.run = new Run(direct(written, { calm: reduced() }), players, (sharedHud ??= new Hud()), quick);
      return await this.run.go();
    } finally {
      anyBusy = false;
      this.run = null;
    }
  }

  /** Jump to a line of a shot of the directed scene (and `sec` seconds into it), for previews and screenshots (`__game.scenes.seek(1, 2, 1.5)`: the clock holds there until a tap). */
  seek(shot: number, beat = 0, sec = 0): void {
    this.run?.seek(shot, beat, sec);
  }
}

/** A particle of the air (screen px within the picture). */
interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  ph: number;
}

class Run {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly back = new Container();
  private readonly actors = new Container();
  private readonly fore = new Container();
  /** The stage drawn sharp at a whole size, then eased to the camera's real one. */
  private rt: RenderTexture | null = null;
  private rtView: Texture | null = null;
  private rtKey = '';
  private readonly view = new Sprite();
  private readonly face = new Sprite();
  /** A quest giver's face (pixel art, drawn large and sharp), when one of them speaks. */
  private readonly giver = new Sprite();
  private giverFrames = new Map<string, Texture[]>();
  private readonly shoulder = new Graphics();
  private readonly rays = new Graphics();
  private readonly air = new Graphics();
  private readonly vig = new Sprite();
  private readonly prev = new Sprite();
  private prevRt: RenderTexture | null = null;
  private readonly veil = new Graphics();
  private readonly blur = new BlurFilter({ strength: 0, quality: 2 });
  private readonly figures = new Map<string, Figure>();
  private photo: Container[] = [];
  private rocks: Sprite[] = [];
  /** The sky's own colour, under the layers: a layer late to load or lost shows sky, never a blank or white band. */
  private readonly sky = new Graphics();
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
  private motes: Mote[] = [];
  private weather: Weather = 'none';
  private typed = 0;
  private typedLine = '';
  private ducked = false;
  private tight = 0;
  private pressAt = -1;
  private readonly saver = settings().saver;
  private readonly keys = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.finish('skipped');
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.quick) this.finish('skipped');
      else this.tap();
    }
  };
  private readonly resize = (): void => this.layout();

  constructor(
    private readonly scene: Scene,
    players: Players,
    private readonly hud: Hud,
    private readonly quick = false,
  ) {
    this.cast = castOf(scene, players);
    this.names = namesOf(this.cast);
    for (const [id, actor] of Object.entries(this.cast)) if (actor.kind === 'standKing') this.names[id] = rulerOf(settings().ruler).name;
  }

  /** Play to the end. A stage that cannot start (no WebGL, say) is a scene skipped: the game goes on without it. */
  async go(): Promise<Ending> {
    const hud = this.hud;
    hud.show(true);
    hud.line(null, '', 0, '', false);
    hud.caption(null, 0);
    hud.card(null, 0);
    hud.press(0);
    // (a press: a tap moves on, a finger held down skips; Skip itself is a button of its own)
    const down = (e: PointerEvent): void => {
      if (e.target === hud.skip) return;
      this.pressAt = performance.now();
    };
    const up = (e: PointerEvent): void => {
      if (this.pressAt < 0 || e.target === hud.skip) return;
      const p = pressOf(performance.now() - this.pressAt, true);
      this.pressAt = -1;
      hud.press(0);
      if (p.kind === 'skip') return this.finish('skipped');
      if (this.quick) this.finish('skipped');
      else this.tap();
    };
    const cancel = (): void => {
      this.pressAt = -1;
      hud.press(0);
    };
    const skipped = (e: Event): void => {
      e.stopPropagation();
      this.finish('skipped');
    };
    let result: Ending = 'skipped';
    let scored = false;
    try {
      await this.app.init({ resizeTo: hud.host, backgroundColor: 0x000000, antialias: false, roundPixels: true, autoDensity: true, resolution: Math.min(this.saver ? 2 : 3, devicePixelRatio || 1) });
      hud.host.append(this.app.canvas);
      this.back.addChild(this.sky);
      this.world.addChild(this.back, this.actors, this.fore);
      this.actors.sortableChildren = true;
      this.vig.texture = vignette();
      this.rays.blendMode = 'add';
      this.air.blendMode = 'normal';
      this.face.anchor.set(0.5, 0);
      this.giver.anchor.set(0.5, 0.5);
      this.giver.roundPixels = true;
      this.app.stage.addChild(this.view, this.shoulder, this.face, this.giver, this.rays, this.air, this.vig, this.prev, this.veil);
      this.layout();
      window.addEventListener('resize', this.resize);
      window.addEventListener('keydown', this.keys);
      hud.root.addEventListener('pointerdown', down);
      hud.root.addEventListener('pointerup', up);
      hud.root.addEventListener('pointercancel', cancel);
      hud.root.addEventListener('pointerleave', cancel);
      hud.skip.addEventListener('click', skipped);
      if (Object.values(this.scene.cast).some((m) => m.role === 'duchess')) this.goat = await goatFrames();
      if (this.scene.music) {
        playScene(this.scene.music);
        scored = true;
      }
      if (this.scene.sting) play(this.scene.sting);
      // (the backdrops of every shot and the heroes' portraits are loaded up front, so a cut never shows an empty stage)
      this.loadLooks().catch(() => undefined);
      for (const [id, c] of Object.entries(this.cast)) if (c.kind && ALL_HEROES.includes(c.kind)) void portraitOf(c.kind, this.scene.cast[id].look ?? 0);
      await this.loadGivers();
      const ending = new Promise<Ending>((ok) => (this.ended = ok));
      this.app.ticker.add((tk) => this.frame(tk.deltaMS / 1000, tk.lastTime));
      result = await ending;
    } catch {
      /* (skipped) */
    } finally {
      window.removeEventListener('resize', this.resize);
      window.removeEventListener('keydown', this.keys);
      hud.root.removeEventListener('pointerdown', down);
      hud.root.removeEventListener('pointerup', up);
      hud.root.removeEventListener('pointercancel', cancel);
      hud.root.removeEventListener('pointerleave', cancel);
      hud.skip.removeEventListener('click', skipped);
      if (this.ducked) duck(false, 'cinematic');
      try {
        this.rt?.destroy(true);
        this.prevRt?.destroy(true);
        this.app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
      } catch {
        /* (it never got as far as a renderer) */
      }
      hud.press(0);
      hud.show(false);
      if (scored) endScene();
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
    this.vig.position.set(0, this.bandTop);
    this.vig.width = w;
    this.vig.height = this.bandH;
    this.prevRt?.destroy(true);
    this.prevRt = null;
    this.rtKey = '';
  }

  /** The backdrop of an area: its layers, back to front, tiled across the stage; and two of its rocks in the near foreground. */
  private look = '';
  private setLook(area: Area): void {
    if (this.look === area) return;
    this.look = area;
    for (const l of this.photo) l.destroy({ children: true });
    for (const r of this.rocks) r.destroy();
    this.photo = [];
    this.rocks = [];
    this.sky.clear().rect(-STAGE_W, -STAGE_H, STAGE_W * 3, STAGE_H * 3).fill({ color: SKY[area] });
    Promise.all(backdropFiles(area).map((u) => textureOf(u).catch(() => null)))
      .then((tex) => {
        if (this.look !== area) return;
        this.photo = tex
          .filter((t): t is Texture => !!t && t.width > 1 && t.height > 1)
          .map((t) => {
            const l = new Container();
            for (let k = 0; k < 4; k++) {
              const s = new Sprite(t);
              s.x = k * STAGE_W;
              s.y = STAGE_H - t.height;
              l.addChild(s);
            }
            l.x = -2 * STAGE_W;
            return l;
          });
        this.back.addChild(...this.photo);
      })
      .catch(() => undefined);
    // (the near foreground: the land's own boulders, large and in shadow, at the picture's edges in the wide views)
    const urls = AREA_URLS[area]?.boulders ?? [];
    Promise.all(urls.slice(0, 2).map((u) => textureOf(u).catch(() => null)))
      .then((tex) => {
        if (this.look !== area) return;
        this.rocks = tex
          .filter((t): t is Texture => !!t)
          .map((t, i) => {
            const s = new Sprite(t);
            s.anchor.set(0.5, 1);
            s.tint = 0x07060a;
            s.alpha = 0.94;
            s.scale.set((i ? -1 : 1) * 1.3, 1.3);
            this.fore.addChild(s);
            return s;
          });
      })
      .catch(() => undefined);
  }

  /** The givers' faces this scene casts: Gwen's talking frames from her sheet, any other's one picture. */
  private async loadGivers(): Promise<void> {
    for (const m of Object.values(this.scene.cast)) {
      if (!m.role.startsWith('face:')) continue;
      const key = m.role.slice(5);
      try {
        if (key === 'gwen') {
          const base = await textureOf(GWEN.url);
          base.source.scaleMode = 'nearest';
          this.giverFrames.set(key, Array.from({ length: GWEN.talk }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(i * GWEN.cell, GWEN.cell, GWEN.cell, GWEN.cell) })));
        } else {
          const t = await textureOf(FACES[key as GiverId] ?? FACES.gwen);
          t.source.scaleMode = 'nearest';
          this.giverFrames.set(key, [t]);
        }
      } catch {
        /* (no face: the words still come) */
      }
    }
  }

  /** A giver speaking: their face large and sharp in the middle of the picture, over the land out of focus. */
  private drawGiver(who: string | null, typing: boolean, t: number): boolean {
    const role = who ? this.scene.cast[who]?.role : undefined;
    const frames = role?.startsWith('face:') ? this.giverFrames.get(role.slice(5)) : undefined;
    this.giver.visible = !!frames;
    if (!frames) return false;
    const i = typing && frames.length > 1 && !reduced() ? 1 + (Math.floor(this.now / 110) % (frames.length - 1)) : 0;
    this.giver.texture = frames[i];
    const k = Math.max(2, Math.floor(Math.min(this.w * 0.8, this.bandH * 0.62) / frames[0].height));
    this.giver.scale.set(k);
    this.giver.alpha = reduced() ? 1 : Math.min(1, t / 0.25);
    this.giver.position.set(Math.round(this.w / 2), Math.round(this.bandTop + this.bandH * 0.5));
    return true;
  }

  private async loadLooks(): Promise<void> {
    const areas = new Set<Area>();
    for (let i = 0; i < this.scene.shots.length; i++) areas.add(lookAt(this.scene, i) as Area);
    await Promise.all([...areas].flatMap((a) => backdropFiles(a).map(textureOf)));
  }

  /** The line now, filled with its names and the ruler's words. */
  private lineText(c: Cursor): string {
    const line = lineNow(c, this.scene);
    return line ? rulerWords(fillLine(line.text, this.names), settings().ruler) : '';
  }

  /** A tap: the line typed out in full, else the next line or shot, else the end. */
  private tap(): void {
    this.frozen = false;
    const text = this.lineText(this.cursor);
    if (text && !reduced() && typedCount(text, this.cursor.t) < plainText(text).length) {
      const t = typeLength(text);
      this.cursor = { ...this.cursor, shotT: this.cursor.shotT + (t - this.cursor.t), t };
      return;
    }
    const n = next(this.cursor, this.scene);
    if (!n) return this.finish('done');
    this.cursor = n;
  }

  /** The voice a speaker blips in. */
  private voiceOf(who: string): Voice {
    if (who === 'narrator') return 'narrator';
    const m = this.scene.cast[who];
    if (!m) return 'narrator';
    if (m.role === 'duchess') return 'goat';
    const kind = this.cast[who]?.kind;
    if (kind === 'standKing') return 'king';
    if (kind && ALL_HEROES.includes(kind)) return 'hero';
    if ((m.scale ?? 1) >= 1.3) return 'boss';
    const name = UNITS[kind ?? '']?.name.toLowerCase() ?? '';
    return /wolf|boar|beast|bear|hound|fox|crow|spider|drake/.test(name) ? 'beast' : 'hero';
  }

  /** A shot begins: its sound, its cut's hit, the last picture held for a cross-fade. */
  private beginShot(shot: Shot): void {
    if (shot.cue) this.cue(shot.cue);
    if (shot.cut === 'dissolve') this.holdPrev();
    else this.prev.visible = false;
    if (shot.cut && HIT_CUTS.has(shot.cut)) play(shot.cut === 'smash' ? 'cineHit' : 'cineWhoosh');
    if (shot.move === 'snapZoom') play('cineWhoosh');
    if (shot.angle === 'low' && !shot.react) play('cineSwell');
  }

  /** The picture as it stands, kept to fade out over the next shot. */
  private holdPrev(): void {
    const r = this.app.renderer;
    if (!r) return;
    if (!this.prevRt) this.prevRt = RenderTexture.create({ width: this.w, height: this.h, resolution: this.app.renderer.resolution });
    this.prev.visible = false;
    r.render({ container: this.app.stage, target: this.prevRt, clear: true });
    this.prev.texture = this.prevRt;
    this.prev.visible = true;
  }

  private frame(dt: number, now: number): void {
    if (!this.ended) return;
    this.now = now;
    const scene = this.scene;
    const still = reduced();
    const rate = still ? 1 : (scene.shots[this.cursor.shot]?.slow ?? 1);
    const moved = tick(this.cursor, scene, this.frozen ? 0 : Math.min(dt, 0.1) * rate);
    if (!moved) return this.finish('done');
    this.cursor = moved;
    const c = this.cursor;
    const shot = scene.shots[c.shot];
    this.setLook(lookAt(scene, c.shot) as Area);
    if (this.cued !== c.shot) {
      this.cued = c.shot;
      this.beginShot(shot);
    }
    // a held finger: its ring, and the skip once held long enough
    if (this.pressAt >= 0) {
      const p = pressOf(performance.now() - this.pressAt, false);
      this.hud.press(p.ring);
      if (p.kind === 'skip') return this.finish('skipped');
    }
    const angle: Angle = shot.angle ?? 'wide';
    const weight = weightOf(this.saver, still || calm(), shot.weather ?? 'none');
    const actors = actorsAt(scene, c);
    const line = lineNow(c, scene);
    const subject = shot.subject ?? (line && line.who !== 'narrator' ? line.who : undefined) ?? (typeof shot.cam.on === 'string' ? shot.cam.on : undefined);
    const len = shotLength(shot);
    // the camera: the written one for a wide view; the framing on its subject for the rest, moved as the shot asks
    const base = cameraAt(scene, c, actors, still);
    const a = subject ? actors[subject] : undefined;
    const aim: Aim | null = a && a.visible && angle !== 'wide' ? { x: a.x, feet: FEET, height: this.heightOf(subject!), facing: a.facing } : null;
    const f = frame(angle, shot.move ?? 'still', base, aim, c.shotT, len, still || !weight.moves);
    const cover = Math.max(this.w / STAGE_W, this.bandH / STAGE_H);
    const tilt = weight.tilt ? f.tilt : 0;
    const scale = Math.max(cover, BASE_SCALE * f.zoom);
    const mid = keepInside({ x: f.x, y: f.y }, scale, this.w, this.bandH);
    let sx = f.jx;
    let sy = f.jy;
    const fx = shot.fx ?? [];
    if (!calm()) {
      if (fx.includes('shake') && c.shotT < SHAKE_S) {
        const k = (1 - c.shotT / SHAKE_S) * 3;
        sx += Math.sin(c.shotT * 90) * k;
        sy += Math.cos(c.shotT * 70) * k * 0.6;
      }
      if (fx.includes('rumble')) {
        sx += Math.sin(now / 37) * 0.5;
        sy += Math.cos(now / 29) * 0.3;
      }
    }
    // (the portrait close-up: a hero's painted picture over the land thrown out of focus; any other figure is drawn large instead)
    const kind = subject ? this.cast[subject]?.kind : null;
    const look = subject ? (actors[subject]?.look ?? 0) : 0;
    let port: Portrait | null = null;
    if (PORTRAIT_ANGLES.has(angle) && kind && ALL_HEROES.includes(kind) && aim) {
      void portraitOf(kind, look);
      port = portraitsReady.get(portraitUrl(kind, look)) ?? null;
    }
    this.drawActors(actors, c, port ? subject! : null);
    this.drawRocks(mid, angle, Math.max(cover, BASE_SCALE * f.zoom), weight.blur);
    // (a quest giver speaking: their face over the land)
    const giving = this.drawGiver(line?.who ?? null, !!line && typedCount(this.lineText(c), c.t) < plainText(this.lineText(c)).length, c.t);
    // the land's focus: soft behind a close framing, pulled in a rack (none on a battery saver)
    const soft = weight.blur ? Math.max(f.blur, port || giving ? 1 : 0) : 0;
    this.blur.strength = soft * 3;
    this.back.filters = soft > 0.05 ? [this.blur] : null;
    this.drawWorld(mid, scale, tilt, sx, sy);
    this.drawFace(port, a ?? null, angle, c.shotT, len, tilt, still || !weight.moves);
    this.photo.forEach((l, i) => (l.x = -2 * STAGE_W + ((Math.round(mid.x * (1 - (i + 1) / this.photo.length) * 0.5) % STAGE_W) + STAGE_W) % STAGE_W));
    this.drawAir(shot.weather ?? 'none', weight.motes, weight.drift, dt);
    this.drawRays(!!shot.rays && weight.rays, now, still);
    // the letterbox closes in on a close framing and a boss's arrival
    const want = barsOf(angle).top > 0.07 ? 1 : 0;
    this.tight += (want - this.tight) * (still ? 1 : Math.min(1, dt * 4));
    this.vig.alpha = 0.35 + this.tight * 0.3;
    this.drawVeil(shot, c.shotT);
    this.words(c, line?.who ?? null, line?.tone, dt);
    const capAlpha = shot.caption && c.shotT < 4 ? Math.max(0, Math.min(1, c.shotT / 0.8, (4 - c.shotT) / 0.8)) : 0;
    this.hud.caption(shot.caption ? rulerWords(shot.caption, settings().ruler) : null, still ? (capAlpha > 0 ? 1 : 0) : capAlpha);
    const tAlpha = shot.title ? (still ? 1 : Math.max(0, Math.min(1, (c.shotT - 0.35) / 0.5))) : 0;
    this.hud.card(shot.title ? { over: rulerWords(fillLine(shot.title.over, this.names), settings().ruler), name: rulerWords(fillLine(shot.title.name, this.names), settings().ruler) } : null, tAlpha);
  }

  /** A figure's height on the stage (art px). */
  private heightOf(id: string): number {
    const f = this.figures.get(id);
    if (f) return f.height;
    return this.scene.cast[id]?.role === 'duchess' ? 30 : 48;
  }

  /** The stage drawn sharp at the next whole size, then laid on the picture at the camera's real size (and tilt). */
  private drawWorld(mid: { x: number; y: number }, scale: number, tilt: number, sx: number, sy: number): void {
    const r = this.app.renderer;
    const k = sharpScale(scale);
    const res = this.app.renderer.resolution;
    // (the texture holds the picture at the sharp size: the band's size times k / scale; a tilted one takes in a margin round
    // it, so its corners never show the black past the picture)
    const pad = 1 + Math.abs(tilt) * 1.6;
    const cw = Math.ceil((this.w * pad * k) / scale) + 2;
    const ch = Math.ceil((this.bandH * pad * k) / scale) + 2;
    if (!this.rt) {
      this.rt = RenderTexture.create({ width: Math.ceil(this.w * 1.9) + 4, height: Math.ceil(this.bandH * 1.9) + 4, resolution: res, scaleMode: 'linear' });
    } else if (this.rt.width < cw || this.rt.height < ch) {
      this.rt.resize(Math.max(cw, this.rt.width), Math.max(ch, this.rt.height));
      this.rtKey = '';
    }
    const key = `${cw}x${ch}`;
    if (key !== this.rtKey) {
      this.rtKey = key;
      this.rtView?.destroy(false);
      this.rtView = new Texture({ source: this.rt.source, frame: new Rectangle(0, 0, cw, ch) });
      this.view.texture = this.rtView;
    }
    this.world.scale.set(k);
    // (the camera's centre on a whole art pixel, so the sharp picture never shimmers)
    this.world.pivot.set(Math.round(mid.x * k) / k, Math.round(mid.y * k) / k);
    this.world.position.set(cw / 2, ch / 2);
    r.render({ container: this.world, target: this.rt, clear: true });
    this.view.anchor.set(0.5);
    this.view.scale.set(scale / k);
    this.view.rotation = tilt;
    this.view.position.set(this.w / 2 + sx * scale, this.bandTop + this.bandH / 2 + sy * scale);
  }

  /** The hero's painted portrait for a close framing: head and chest filling the picture, room in front of the face, a slow push. */
  private drawFace(p: Portrait | null, a: ActorNow | null, angle: Angle, t: number, len: number, tilt: number, still: boolean): void {
    this.face.visible = !!p && !!a;
    this.shoulder.clear();
    if (!p || !a) return;
    if (this.face.texture !== p.tex) this.face.texture = p.tex;
    // (how much of the figure fills the picture: head and chest; the eyes for an extreme close-up; more of them over a shoulder)
    const share = angle === 'extreme' ? 0.36 : angle === 'ots' ? 0.7 : angle === 'dutch' ? 0.6 : 0.52;
    const u = Math.min(1, t / Math.max(0.1, len));
    const push = still ? 1 : 1 + 0.07 * (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
    const k = ((this.bandH * 0.98) / (p.fh * share)) * push;
    const side = a.facing === 'right' ? 0.42 : 0.58;
    const offX = angle === 'ots' ? (a.facing === 'right' ? 0.16 : -0.16) : 0;
    // (the picture slides in a touch as the shot begins)
    const enter = still ? 1 : Math.min(1, t / 0.3);
    this.face.anchor.set(p.hx / p.tex.width, Math.max(0, p.top - p.fh * 0.05) / p.tex.height);
    this.face.scale.set(k);
    this.face.rotation = tilt;
    this.face.alpha = enter;
    this.face.position.set(this.w * (side + offX) + (1 - enter) * 14 * (a.facing === 'right' ? -1 : 1), this.bandTop + this.bandH * 0.02);
    // (over the shoulder: the listener's dark shoulder in the near corner)
    if (angle === 'ots') {
      const x = a.facing === 'right' ? this.w * 0.02 : this.w * 0.98;
      this.shoulder.ellipse(x, this.bandTop + this.bandH * 0.98, this.w * 0.3, this.bandH * 0.36).fill({ color: 0x050407, alpha: 0.92 });
    }
  }

  /** The foreground rocks: just in at the edges of a wide view, out of focus, sliding faster than the land (they are near). Hidden in
   *  the closer framings. */
  private readonly foreBlur = new BlurFilter({ strength: 2, quality: 2 });
  private drawRocks(mid: { x: number; y: number }, angle: Angle, scale: number, soft: boolean): void {
    // (the wide views only: closer in, a near rock would fill the picture)
    const on = angle === 'wide' || angle === 'high';
    const cx = mid.x;
    const hw = this.w / 2 / scale;
    // (the picture's foot, in stage px: the rocks rise only a little way above it)
    const foot = mid.y + this.bandH / 2 / scale;
    this.fore.filters = on && soft ? [this.foreBlur] : null;
    this.rocks.forEach((r, i) => {
      r.visible = on;
      const side = i === 0 ? -1 : 1;
      r.x = cx + side * (hw - Math.abs(r.width) * 0.22) - (cx - STAGE_W / 2) * 0.35;
      r.y = foot + r.height * 0.55;
    });
  }

  /** The weather: motes of the land's air drifting through the picture (screen px). */
  private drawAir(w: Weather, count: number, drift: boolean, dt: number): void {
    const g = this.air.clear();
    if (w !== this.weather) {
      this.weather = w;
      this.motes = [];
    }
    if (w === 'none' || count <= 0) return;
    const W = this.w;
    const H = this.bandH;
    const top = this.bandTop;
    const spawn = (anywhere: boolean): Mote => {
      const m: Mote = { x: Math.random() * W, y: anywhere ? Math.random() * H : w === 'embers' ? H + 4 : -4, vx: 0, vy: 0, r: 1, a: 1, ph: Math.random() * 6.28 };
      switch (w) {
        case 'embers': m.vx = (Math.random() - 0.5) * 12; m.vy = -(20 + Math.random() * 30); m.r = 1 + Math.random() * 1.5; m.a = 0.6 + Math.random() * 0.4; break;
        case 'snow': m.vx = -6 + Math.random() * 8; m.vy = 18 + Math.random() * 20; m.r = 1 + Math.random() * 2; m.a = 0.7; break;
        case 'rain': m.vx = -40; m.vy = 380 + Math.random() * 140; m.r = 1; m.a = 0.35; break;
        case 'dust': m.vx = 14 + Math.random() * 16; m.vy = (Math.random() - 0.5) * 6; m.r = 1 + Math.random(); m.a = 0.35; break;
        case 'motes': m.vx = (Math.random() - 0.5) * 6; m.vy = -(3 + Math.random() * 6); m.r = 1 + Math.random() * 1.2; m.a = 0.5; break;
        case 'ash': m.vx = 4 + Math.random() * 6; m.vy = 10 + Math.random() * 12; m.r = 1 + Math.random(); m.a = 0.55; break;
        case 'leaves': m.vx = -14 - Math.random() * 10; m.vy = 22 + Math.random() * 16; m.r = 2 + Math.random(); m.a = 0.85; break;
        default: break;
      }
      return m;
    };
    while (this.motes.length < count) this.motes.push(spawn(true));
    this.motes.length = count;
    const COLOUR: Record<Exclude<Weather, 'none'>, number> = { embers: 0xff8a3a, snow: 0xf2f6ff, rain: 0xa8c4e0, dust: 0xd8bf8a, motes: 0xffe6a8, ash: 0x8d8a88, leaves: 0xc8682a };
    const colour = COLOUR[w];
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      if (drift) {
        m.ph += dt * 2;
        m.x += (m.vx + Math.sin(m.ph) * (w === 'leaves' || w === 'embers' ? 10 : 3)) * dt;
        m.y += m.vy * dt;
        if (m.y < -8 || m.y > H + 8 || m.x < -8 || m.x > W + 8) this.motes[i] = spawn(false);
      }
      const y = top + m.y;
      if (w === 'rain') g.moveTo(m.x, y).lineTo(m.x - 3, y + 9).stroke({ color: colour, alpha: m.a, width: 1 });
      else if (w === 'leaves') g.rect(m.x, y, m.r * 1.6, m.r).fill({ color: colour, alpha: m.a });
      else g.circle(m.x, y, m.r).fill({ color: colour, alpha: m.a * (w === 'embers' || w === 'motes' ? 0.6 + 0.4 * Math.sin(m.ph * 2) : 1) });
    }
  }

  /** Shafts of light slanting down from the top of the picture, swaying slowly. */
  private drawRays(on: boolean, now: number, still: boolean): void {
    const g = this.rays.clear();
    if (!on) return;
    const sway = still ? 0 : Math.sin(now / 2400) * 0.04;
    for (let i = 0; i < 3; i++) {
      const x0 = this.w * (0.15 + i * 0.22);
      const spread = this.w * (0.08 + i * 0.03);
      const lean = this.w * (0.22 + sway);
      g.poly([x0, this.bandTop, x0 + spread, this.bandTop, x0 + spread + lean, this.bandTop + this.bandH, x0 + lean, this.bandTop + this.bandH]).fill({ color: 0xffe2a8, alpha: 0.045 + i * 0.01 });
    }
  }

  /** The words: typed at the pace of their punctuation, with a faint blip in the speaker's voice, the music held down meanwhile. */
  private words(c: Cursor, who: string | null, tone: string | undefined, _dt: number): void {
    const text = this.lineText(c);
    const plain = plainText(text);
    const n = typedCount(text, c.t, reduced());
    if (text !== this.typedLine) {
      this.typedLine = text;
      this.typed = 0;
    }
    if (who && n > this.typed && !reduced()) {
      const v = VOICE_CUE[this.voiceOf(who)];
      if (blipsBetween(plain, this.typed, n, v.every)) play(v.cue);
    }
    this.typed = n;
    // (the score is held down while a line is being said, and let up between)
    const saying = !!text && n < plain.length;
    if (saying !== this.ducked) {
      this.ducked = saying;
      duck(saying, 'cinematic');
    }
    const name = who && who !== 'narrator' ? (this.cast[who]?.kind === 'standKing' ? rulerOf(settings().ruler).name : rulerWords(this.names[who] ?? who, settings().ruler)) : null;
    this.hud.line(name, text, n, tone ?? (text && !name ? 'narrator' : ''), n >= plain.length);
  }

  private cue(name: SceneCue): void {
    play(name);
  }

  /** Each actor from its own sheet: walking, striking, fallen or standing (the speaker breathing a little). `hide`: the one whose portrait is up. */
  private drawActors(actors: Record<string, ActorNow>, c: Cursor, hide: string | null): void {
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
        const height = kind === 'standKing' ? 60 * 0.75 * (this.scene.cast[id].scale ?? 1) : figureOf(def.sheet) * def.scale * (this.scene.cast[id].scale ?? 1);
        f = { box, body, height };
        this.figures.set(id, f);
        shadow.scale.set(((figureOf(def.sheet) * def.scale) / 40) * (this.scene.cast[id].scale ?? 1));
      }
      f.box.visible = a.visible && id !== hide;
      if (!f.box.visible) continue;
      const m = this.scene.cast[id];
      f.box.zIndex = Math.round(a.x);
      if (kind === 'standKing') {
        const action: RulerAction = a.walking ? 'walk' : a.pose === 'cast' ? 'cast' : a.pose === 'strike' ? 'strike' : a.pose === 'hurt' ? 'hurt' : a.pose === 'down' ? 'dead' : 'idle';
        if (f.action !== action || f.actionShot !== c.shot) { f.action = action; f.actionAt = this.now; f.actionShot = c.shot; }
        const list = rulerTextures(settings().ruler, action);
        f.body.texture = list[rulerFrame(action, action === 'walk' ? a.walked * 1000 : this.now - (f.actionAt ?? this.now), reduced())];
        const height = 60 * (m.scale ?? 1);
        const scale = height / f.body.texture.height;
        f.body.scale.set(scale * (a.facing === 'right' ? 1 : -1), scale);
        f.body.tint = m.shade ? 0x000000 : 0xffffff;
        f.body.y = 0;
        f.box.position.set(Math.round(a.x), FEET);
        continue;
      }
      const anim: Anim = a.walking ? 'walk' : a.pose === 'strike' || a.pose === 'cast' ? 'attack' : a.pose === 'hurt' ? 'hurt' : a.pose === 'down' ? 'dead' : 'idle';
      const hero = ALL_HEROES.includes(kind);
      const sheet = hero ? battleSheet(kind, a.look ?? 0, 1) : def.sheet;
      const list = framesOf(sheet, anim) ?? framesOf(def.sheet, anim);
      // (a sheet not loaded yet, an awakened one the first time: the figure keeps its last frame for now)
      if (!list?.length) continue;
      const frame = anim === 'dead' ? list.length - 1 : anim === 'walk' ? Math.floor(a.walked * 9) : anim === 'attack' ? Math.floor(this.now / 120) : Math.floor(this.now / 170);
      f.body.texture = list[frame % list.length];
      const dir = (a.facing === 'right' ? 1 : -1) * (facesRightOf(sheet) ? 1 : -1);
      const k = def.scale * (m.scale ?? 1);
      f.body.scale.set(k * dir, k);
      f.body.tint = m.shade ? 0x000000 : 0xffffff;
      if (f.look !== a.look) {
        f.look = a.look;
        if (f.aura) {
          f.aura.back.destroy({ children: true });
          f.aura.front.destroy({ children: true });
          f.aura = undefined;
        }
        if (a.look && !hero) {
          f.aura = new AwakenAura(kind, a.look, settings().saver);
          f.box.addChildAt(f.aura.back, 1);
          f.box.addChild(f.aura.front);
        }
      }
      f.aura?.update(this.now, figureOf(sheet) * k, a.facing === 'right' ? 1 : -1, reduced());
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
      f = { box, body, height: 30 };
      this.figures.set(id, f);
    }
    f.box.visible = a.visible && !!this.goat;
    if (!f.box.visible || !this.goat) return;
    const step = a.walking ? [0, 1, 2, 1][Math.floor(a.walked * 4) % 4] : 1;
    f.body.texture = this.goat[(a.facing === 'right' ? 3 : 0) + step];
    f.body.y = a.walking || reduced() ? 0 : Math.floor(this.now / 420) % 2;
    f.box.zIndex = Math.round(a.x);
    f.box.position.set(Math.round(a.x), FEET);
  }

  /** The veils over the picture: the cut coming in (black, white, the last picture fading), the shot's own effects (a pall, a warm
   *  glow, a fade, the one-shot flash), the scene going out, and the letterbox closing in. Nothing loops. */
  private drawVeil(shot: Shot, t: number): void {
    const fx = shot.fx ?? [];
    const v = this.veil.clear();
    const { w, h } = this;
    const cut = cutVeil(shot.cut ?? 'cut', t);
    if (fx.includes('darken')) v.rect(0, 0, w, h).fill({ color: 0x000010, alpha: 0.3 });
    if (fx.includes('glow')) v.rect(0, 0, w, h).fill({ color: 0xff8a30, alpha: 0.1 });
    if (fx.includes('fadeIn') && t < FADE_S) v.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 1 - t / FADE_S });
    const left = shotLength(shot) - t;
    if (fx.includes('fadeOut') && left < FADE_S) v.rect(0, 0, w, h).fill({ color: 0x000000, alpha: Math.min(1, 1 - left / FADE_S) });
    if (fx.includes('flash') && !calm() && t < FLASH_S) v.rect(0, 0, w, h).fill({ color: 0xffffff, alpha: FLASH_ALPHA * (1 - t / FLASH_S) });
    if (cut.black > 0) v.rect(0, 0, w, h).fill({ color: 0x000000, alpha: cut.black });
    if (cut.white > 0 && !calm()) v.rect(0, 0, w, h).fill({ color: 0xfff6e6, alpha: cut.white });
    this.prev.alpha = cut.prev;
    if (cut.prev <= 0) this.prev.visible = false;
    // (the scene's end: a smash to black, or a fade, over its last moments)
    if (this.cursor.shot === this.scene.shots.length - 1) {
      const out = outVeil(this.scene.out, left);
      if (out > 0) v.rect(0, 0, w, h).fill({ color: 0x000000, alpha: out });
    }
    // (the letterbox's extra depth on a close framing)
    const bar = Math.round(this.tight * this.bandH * 0.05);
    if (bar > 0) {
      v.rect(0, this.bandTop - 1, w, bar + 1).fill({ color: 0x000000 });
      v.rect(0, this.bandTop + this.bandH - bar, w, bar + 1).fill({ color: 0x000000 });
    }
  }
}
