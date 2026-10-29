// STATUS-FX phase A: a rough prototype of how the ailments look, for the mock-up screenshots only. Nothing in the game
// calls it: the page's console (or tools/status-fx/shots.mjs) sets ailments on fighters by unit id through
// `window.__statusMock`, and each fighter's sprite draws them (the one hook is at the end of `UnitSprite.update`). It
// never touches the battle. The parts and their places are `statusStyles.ts`; their frames come from the atlas
// (`statusArt.ts`), so painted art drops in. Phase B replaces this file with the real status layer (docs/notes/status-fx.md).

import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Unit } from '../sim/battle';
import { loadStatusArt, statusFrames, STATUS_CELL } from './statusArt';
import { IMMUNE_COLOUR, MAX_CHIPS, SHATTER_COLOUR, STATUS_STYLES, maxBodyFx, statusKey, type AilmentKey, type StatusPart } from './statusStyles';
import { settings } from '../settings';

interface MockState {
  list: AilmentKey[];
  /** Numbers rising over it, each in its ailment's colour ('hit' is a plain white blow). */
  nums: { n: number; key: AilmentKey | 'hit' | 'shatter' }[];
  /** It shrugged this ailment off. */
  immune?: AilmentKey;
  /** Its frozen crust has just shattered. */
  shatter?: boolean;
}

/** One drawn piece: its sprite, its part and strip, where it rests, and its own beat. */
interface Bit { sp: Sprite; key: string; part: StatusPart; x: number; y: number; beat: number; mote?: number }

const state = new Map<number, MockState>();
const overlays = new WeakMap<Container, { back: Container; front: Container; bits: Bit[]; key: string }>();
const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let ready = false;
if (typeof window !== 'undefined') void loadStatusArt().then(() => (ready = true));

function bit(key: string, part: StatusPart, tall: number, beat: number, mote?: number): Bit {
  const sp = new Sprite(statusFrames(key)[0]);
  sp.anchor.set(0.5);
  sp.scale.set((tall * part.size) / STATUS_CELL);
  sp.alpha = part.alpha;
  if (part.tint !== undefined) sp.tint = part.tint;
  const y = -tall * part.at;
  return { sp, key, part, x: 0, y, beat, mote };
}

/** A small round chip with the ailment's icon inside (crossed out when it was shrugged off). */
function chip(key: AilmentKey, bits: Bit[], crossed = false): Container {
  const style = STATUS_STYLES[key];
  const c = new Container();
  const g = new Graphics();
  g.circle(0, 0, 6.5).fill({ color: 0x140c08, alpha: 0.9 }).stroke({ color: style.rim, width: 1.5 });
  c.addChild(g);
  const part = style.parts.icon!;
  const b = bit(statusKey(key, 'icon'), part, 1, bits.length * 0.37);
  b.sp.scale.set(part.size / STATUS_CELL * 1.25);
  b.y = 0;
  c.addChild(b.sp);
  bits.push(b);
  if (crossed) {
    const x = new Graphics();
    x.moveTo(-5, -5).lineTo(5, 5).stroke({ color: 0xffffff, width: 1.6, alpha: 0.95 });
    c.addChild(x);
  }
  return c;
}

function word(text: string, fill: number, size: number): Text {
  const t = new Text({ text, style: { fontFamily: "'Press Start 2P', monospace", fontSize: size, fill, stroke: { color: 0x1a1008, width: 3 } }, resolution: 3 });
  t.anchor.set(0.5, 1);
  return t;
}

function build(st: MockState, tall: number): { back: Container; front: Container; bits: Bit[] } {
  const back = new Container();
  const front = new Container();
  const bits: Bit[] = [];
  const saver = settings().saver;
  // (the body parts of the first ailments, as many as the saver allows; ground and back go behind the fighter)
  for (const [i, a] of st.list.slice(0, maxBodyFx(saver)).entries()) {
    const parts = STATUS_STYLES[a].parts;
    for (const place of ['ground', 'back', 'front', 'halo', 'motes'] as const) {
      const part = parts[place];
      if (!part || (saver && part.saver)) continue;
      for (let m = 0; m < (part.n ?? 1); m++) {
        const b = bit(statusKey(a, place), part, tall, i * 1.3 + m * 2.1 + place.length * 0.4, place === 'motes' ? m : undefined);
        (place === 'ground' || place === 'back' ? back : front).addChild(b.sp);
        bits.push(b);
      }
    }
  }
  if (st.shatter) {
    // (the crust bursts: the burst over the body, and a cold ring left on the ground)
    const ring = bit(statusKey('freeze', 'ground'), STATUS_STYLES.freeze.parts.ground!, tall * 1.3, 0);
    back.addChild(ring.sp);
    bits.push(ring);
    const burst = bit(statusKey('freeze', 'burst'), STATUS_STYLES.freeze.parts.burst!, tall, 0);
    front.addChild(burst.sp);
    bits.push(burst);
  }
  // (the chips over the head, one for each ailment, in a row just above the health bar)
  const chips = st.list.slice(0, MAX_CHIPS);
  chips.forEach((key, i) => {
    const c = chip(key, bits);
    c.position.set((i - (chips.length - 1) / 2) * 14, -tall - 17);
    front.addChild(c);
  });
  let top = -tall - (chips.length || st.immune ? 26 : 12);
  if (st.immune) {
    // (the ailment it shrugged off: its chip crossed out where the chips sit, and the word over it)
    const c = chip(st.immune, bits, true);
    c.position.set(chips.length ? (chips.length / 2 + 0.5) * 14 : 0, -tall - 17);
    const w = word('Immune', IMMUNE_COLOUR, 8);
    w.position.set(0, top);
    front.addChild(c, w);
    top -= 13;
  }
  for (const n of st.nums) {
    const fill = n.key === 'hit' ? 0xffffff : n.key === 'shatter' ? SHATTER_COLOUR : STATUS_STYLES[n.key].number ?? 0xffffff;
    const t = word(String(n.n), fill, n.key === 'shatter' ? 13 : 9);
    t.position.set(0, top);
    front.addChild(t);
    if (n.key === 'shatter') {
      const s = word('SHATTER', SHATTER_COLOUR, 7);
      s.position.set(0, top - 15);
      front.addChild(s);
      top -= 15;
    }
    top -= n.key === 'shatter' ? 16 : 12;
  }
  return { back, front, bits };
}

/** The hook `UnitSprite.update` calls last: draw (or clear) this fighter's mock ailments. */
export function statusMockHook(root: Container, body: Sprite, u: Unit, tall: number, t: number): void {
  const st = u.alive && ready ? state.get(u.id) : undefined;
  const have = overlays.get(root);
  const key = st ? `${JSON.stringify(st)}|${Math.round(tall)}|${settings().saver}` : '';
  if (have && have.key !== key) {
    have.back.destroy({ children: true });
    have.front.destroy({ children: true });
    overlays.delete(root);
  }
  if (!st) return;
  let o = overlays.get(root);
  if (!o) {
    const made = build(st, tall);
    root.addChildAt(made.back, Math.max(0, root.getChildIndex(body) - 1));
    root.addChild(made.front);
    o = { ...made, key };
    overlays.set(root, o);
  }
  root.setChildIndex(o.front, root.children.length - 1);
  // (a fighter takes the tint of its first ailment that has one; a shattered one is pale)
  const tinted = st.shatter ? 0xd8f4ff : st.list.map((k) => STATUS_STYLES[k].tint).find((x) => x !== undefined);
  if (tinted !== undefined) body.tint = tinted;
  // (each part plays its strip on its own beat; motes drift round the body; with reduced motion every part holds its first frame and stays put)
  const still = calm();
  for (const b of o.bits) {
    const frames = statusFrames(b.key);
    if (!frames.length) continue;
    // (a burst is one-off: the mock holds it late, the shards flying apart; phase B plays it once from the start)
    b.sp.texture = b.part.place === 'burst' ? frames[Math.floor(frames.length * 0.7)] : still ? frames[0] : frames[Math.floor(t / b.part.frameMs + b.beat * 3) % frames.length];
    if (b.mote !== undefined) {
      const a = still ? b.beat : t / 1400 + b.beat;
      b.sp.position.set(Math.cos(a) * tall * 0.32, b.y + Math.sin(a * 1.3) * tall * 0.08);
    } else b.sp.position.set(b.x, b.y);
  }
}

/** The console's handle on the prototype. */
const api = {
  set(id: number, list: AilmentKey[]) { const s = state.get(id) ?? { list: [], nums: [] }; s.list = list; state.set(id, s); },
  num(id: number, n: number, key: AilmentKey | 'hit' | 'shatter') { const s = state.get(id) ?? { list: [], nums: [] }; s.nums.push({ n, key }); state.set(id, s); },
  immune(id: number, key: AilmentKey) { const s = state.get(id) ?? { list: [], nums: [] }; s.immune = key; state.set(id, s); },
  shatter(id: number) { const s = state.get(id) ?? { list: [], nums: [] }; s.shatter = true; state.set(id, s); },
  clear() { state.clear(); },
};
if (typeof window !== 'undefined') (window as unknown as { __statusMock: typeof api }).__statusMock = api;
