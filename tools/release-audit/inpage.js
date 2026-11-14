// RELEASE-AUDIT (docs/notes/release-audit-code.md): put in the page before the game loads. Counts, by the place in the code that asked
// for it, every animation frame, timer and listener the page runs, and keeps the observers, audio contexts and workers that are alive,
// so the driver can say what keeps working on a screen where nothing should. Reads only; changes nothing the game does.
(() => {
  const A = (window.__audit = { rafs: {}, timers: {}, intervals: new Map(), listeners: {}, observers: { live: 0, made: {} }, audio: [], workers: 0, errors: [], probe: null });
  // (the first frame of the stack that is the game's own: "game.js:<line>")
  const site = () => {
    const s = new Error().stack?.split('\n') ?? [];
    for (const l of s.slice(3)) {
      const m = l.match(/game\.js:(\d+)/);
      if (m) return m[1];
    }
    return '?';
  };
  const bump = (o, k) => (o[k] = (o[k] ?? 0) + 1);
  const realRaf = window.requestAnimationFrame.bind(window);
  // (a hidden tab's frames do not come: held while "hidden", let go when shown, as the browser does)
  let held = [];
  const raf = (cb) => realRaf((t) => (A.hiddenNow ? held.push(cb) : cb(t)));
  window.requestAnimationFrame = (cb) => {
    const at = site();
    return raf((t) => {
      bump(A.rafs, at);
      cb(t);
    });
  };
  A.setHidden = (on) => {
    A.hiddenNow = on;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => on });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (on ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
    if (!on) {
      const h = held;
      held = [];
      for (const cb of h) realRaf(cb);
    }
  };
  const st = window.setTimeout.bind(window);
  window.setTimeout = (cb, ms, ...a) => {
    const at = site();
    return st(typeof cb === 'function' ? (...x) => (bump(A.timers, at), cb(...x)) : cb, ms, ...a);
  };
  const si = window.setInterval.bind(window);
  const ci = window.clearInterval.bind(window);
  window.setInterval = (cb, ms, ...a) => {
    const at = site();
    const id = si(typeof cb === 'function' ? (...x) => (bump(A.timers, 'iv:' + at), cb(...x)) : cb, ms, ...a);
    A.intervals.set(id, { at, ms });
    return id;
  };
  window.clearInterval = (id) => (A.intervals.delete(id), ci(id));
  const ael = EventTarget.prototype.addEventListener;
  const rel = EventTarget.prototype.removeEventListener;
  const live = new WeakMap();
  // (only the long-lived targets: a listener on an element dropped from the page goes with it)
  const lasting = (t) => t === window || t === document || t === document.body || t === document.documentElement || t instanceof MediaQueryList || t?.constructor?.name === 'AudioContext';
  A.globalSites = {};
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    if (fn && lasting(this)) {
      let m = live.get(this);
      if (!m) live.set(this, (m = new Map()));
      const key = type + (o === true || o?.capture ? ':c' : '');
      let s = m.get(key);
      if (!s) m.set(key, (s = new Set()));
      if (!s.has(fn)) {
        s.add(fn);
        bump(A.listeners, type);
        bump(A.globalSites, type + '@' + site());
      }
    }
    return ael.call(this, type, fn, o);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, o) {
    const key = type + (o === true || o?.capture ? ':c' : '');
    const s = fn && live.get(this)?.get(key);
    if (s?.delete(fn)) A.listeners[type]--;
    return rel.call(this, type, fn, o);
  };
  for (const name of ['ResizeObserver', 'MutationObserver', 'IntersectionObserver']) {
    const Real = window[name];
    if (!Real) continue;
    window[name] = class extends Real {
      constructor(cb) {
        super(cb);
        A.observers.live++;
        bump(A.observers.made, name + '@' + site());
      }
      disconnect() {
        if (!this.__gone) A.observers.live--;
        this.__gone = true;
        return super.disconnect();
      }
    };
  }
  for (const name of ['AudioContext', 'OfflineAudioContext']) {
    const Real = window[name];
    if (!Real) continue;
    window[name] = class extends Real {
      constructor(...a) {
        super(...a);
        A.audio.push(this);
      }
    };
  }
  const W = window.Worker;
  window.Worker = class extends W {
    constructor(...a) {
      super(...a);
      A.workers++;
    }
  };
  window.addEventListener('error', (e) => A.errors.push(['error', String(e.message)]));
  window.addEventListener('unhandledrejection', (e) => A.errors.push(['rejection', String(e.reason?.stack ?? e.reason)]));
  // (the frame probe: its own frames are not counted above)
  A.startProbe = () => {
    const p = (A.probe = { gaps: [], last: performance.now(), on: true });
    const go = (t) => {
      if (!p.on) return;
      p.gaps.push(t - p.last);
      p.last = t;
      raf(go);
    };
    raf(go);
  };
  A.stopProbe = () => {
    const p = A.probe;
    if (!p) return null;
    p.on = false;
    const g = p.gaps.slice(1).sort((a, b) => a - b);
    return { frames: g.length, mean: g.length ? g.reduce((s, x) => s + x, 0) / g.length : 0, p95: g[Math.floor(g.length * 0.95)] ?? 0, max: g[g.length - 1] ?? 0 };
  };
  A.snap = () => ({ rafs: { ...A.rafs }, timers: { ...A.timers } });
  A.reset = () => {
    A.rafs = {};
    A.timers = {};
  };
})();
