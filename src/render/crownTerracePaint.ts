// Painted architecture and independently growing landmarks. Characters stay live in CastleScene.
import { RULERS, type RulerId } from '../rulerRules';
import { RULER_COURTS, TERRACE_HEIGHT, TERRACE_LANDMARKS, TERRACE_WIDTH, landmarkState, terraceArtUrl } from '../crownTerrace';
import type { Meta } from '../sim/meta';
import { loadImage } from './loadImage';
import { LifePainter } from './ambientPaint';
import type { SceneLife } from './ambientScenes';
import { motionPlan } from './ambient';
import hayUrl from '../art/castle/hay.png';

const W = TERRACE_WIDTH, H = TERRACE_HEIGHT;

function courtLife(id: RulerId): SceneLife {
  const theme = RULER_COURTS[id];
  return {
    size: [W, H],
    regions: [
      { kind: 'cloth', poly: [[.755, .015], [.99, .015], [.99, .545], [.81, .55], [.755, .4]], amp: .0025, anchor: 'top', pace: .65 },
      { kind: 'foliage', poly: [[.005, .77], [.13, .78], [.17, .98], [.005, .99]], amp: .002, anchor: 'bottom', pace: .7 },
    ],
    lights: [{ at: [.73, .73], r: .23, kind: 'window', colour: theme.light, power: .13, squash: .25 }],
    spouts: theme.weather === 'embers' ? [{kind:'embers', at:[.93,.55], count:10, spread:.025, rise:.16, life:3, colour:theme.light}] : [],
    drifts: [
      { kind: theme.weather === 'stars' ? 'wisps' : 'motes', box: [.1,.6,.8,.9], count: 9, colour: theme.light },
      { kind: 'birds', box: [.07,.19,.36,.28], count: 3, colour: 0x3a3540 },
    ],
  };
}

export class CrownTerracePainter {
  readonly backgrounds = new Map<RulerId, HTMLImageElement>();
  readonly buildings = new Map<string, HTMLImageElement>();
  readonly heroes = new Map<string, HTMLImageElement>();
  readonly rulers = new Map<RulerId, HTMLImageElement>();
  readonly duchess: HTMLImageElement[] = [];
  readonly ready: Promise<void>;
  private life = new Map<RulerId, LifePainter>();
  private kingdom = document.createElement('canvas');
  private kingdomKey = '';
  private kingdomRevision = 0;
  private characterLoads = new Map<string, Promise<void>>();

  constructor(private onReady: () => void) {
    this.kingdom.width = W; this.kingdom.height = H;
    const names = [...TERRACE_LANDMARKS.map(p => p.id), 'works'];
    this.ready = Promise.all([
      loadImage(hayUrl).then(image => { this.buildings.set('nest',image); }),
      ...Array.from({length:8},async (_,i) => { this.duchess[i] = await loadImage(terraceArtUrl(`duchess-${i}`)); }),
      ...RULERS.map(async ({id}) => {
        const image = await loadImage(terraceArtUrl(id));
        this.backgrounds.set(id, image);
        const life = new LifePainter(courtLife(id), true);
        life.layout(image, W, H, {x:0,y:0,w:W,h:H});
        this.life.set(id, life);
        onReady();
      }),
      ...names.flatMap(name => [1,2,3].map(async stage => {
        const key = `${name}-${stage}`;
        this.buildings.set(key, await loadImage(terraceArtUrl(key)));
        this.kingdomRevision++;
      })),
    ]).then(() => { onReady(); });
    // A failed asset must not become an unhandled rejection. The caller exposes readiness for browser checks.
    void this.ready.catch(() => onReady());
  }

  /** Load only the displayed companions; the service worker still caches the entire roster for offline changes. */
  characters(kinds: readonly string[], ruler: RulerId): Promise<void> {
    const names = [...kinds.map(kind => `hero-${kind}`), `ruler-${ruler}`];
    return Promise.all(names.map(name => {
      let pending = this.characterLoads.get(name);
      if (!pending) {
        pending = loadImage(terraceArtUrl(name)).then(image => {
          if (name.startsWith('hero-')) this.heroes.set(name.slice(5), image);
          else this.rulers.set(name.slice(6) as RulerId,image);
          this.onReady();
        });
        this.characterLoads.set(name,pending);
      }
      return pending;
    })).then(() => undefined);
  }

  background(g: CanvasRenderingContext2D, id: RulerId, meta: Meta | null, time: number, reduced: boolean, saver: boolean): void {
    g.imageSmoothingEnabled = true;
    const background = this.backgrounds.get(id);
    if (!background) { g.fillStyle = '#142019'; g.fillRect(0,0,W,H); return; }
    g.drawImage(background, 0,0,W,H);
    this.life.get(id)?.regions(g, time / 1000, motionPlan({reduced,saver,hidden:false}));
    if (meta) {
      const states = TERRACE_LANDMARKS.map(p => landmarkState(meta,p.id));
      const key = `${id}:${this.kingdomRevision}:${states.map(s => `${s.level}:${s.working}`).join('|')}`;
      if (key !== this.kingdomKey) {
        this.kingdomKey = key;
        const k = this.kingdom.getContext('2d')!;
        k.clearRect(0,0,W,H);
        // Landmarks stand only in the distant open arches, never on the foreground columns or balustrade.
        k.save();
        k.beginPath();
        k.rect(45,300,255,324); k.rect(362,310,73,303); k.clip();
        TERRACE_LANDMARKS.forEach((plot,i) => {
          const state = states[i];
          const image = this.buildings.get(`${plot.id}-${state.stage}`);
          if (image && state.level) {
            const w = plot.w * state.scale;
            const h = w * image.naturalHeight / image.naturalWidth;
            k.drawImage(image, plot.x-w/2, plot.y-h, w,h);
          }
          if (state.working) {
            const image = this.buildings.get(`works-${Math.max(1,state.stage)}`);
            if (image) {
              const w = plot.w * .62, h = w * image.naturalHeight / image.naturalWidth;
              k.drawImage(image, plot.x-w*.2, plot.y-h+5,w,h);
            }
          }
        });
        k.restore();
        // Atmospheric light belongs to the realm; it is confined to the landmark alpha.
        k.globalCompositeOperation = 'source-atop';
        k.globalAlpha = id === 'iron_stag' ? .08 : .30;
        k.fillStyle = RULER_COURTS[id].shade; k.fillRect(0,0,W,H);
        k.globalAlpha = 1; k.globalCompositeOperation = 'source-over';
      }
      g.drawImage(this.kingdom,0,0);
    }
    this.weather(g,id,time,reduced,saver);
  }

  atmosphere(g: CanvasRenderingContext2D, id: RulerId, time: number, reduced: boolean, saver: boolean): void {
    const life = this.life.get(id);
    const plan = motionPlan({reduced,saver,hidden:false});
    life?.smoke(g,time/1000,plan);
    life?.lights(g,time/1000,plan);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  private weather(g: CanvasRenderingContext2D, id: RulerId, time: number, reduced: boolean, saver: boolean): void {
    const weather = RULER_COURTS[id].weather;
    if (reduced || weather !== 'snow' && weather !== 'rain') return;
    // Effects only: snowflakes/rain crossing the open air, clipped away from the covered court.
    g.save(); g.beginPath(); g.rect(42,230,260,395); g.clip();
    const t = time / 1000;
    for (let i=0; i<(saver ? 12 : 28); i++) {
      const x = 40 + ((i*73 + t*(weather==='snow' ? 9 : 28)) % 275);
      const y = 230 + ((i*97 + t*(weather==='snow' ? 22 : 210)) % 395);
      g.fillStyle = 'rgba(225,239,255,.65)';
      if (weather === 'snow') { g.beginPath(); g.arc(x+Math.sin(t+i)*6,y,1.5,0,Math.PI*2); g.fill(); }
      else g.fillRect(x,y,1,12);
    }
    g.restore();
  }
}
