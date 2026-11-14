// The Android app's "Update available" line. Only the installed app (Capacitor) asks; the web page never does.
// One fetch to the public releases API on start; offline or any error is ignored quietly.
// STORE-READY (docs/notes/store-readiness.md): a build for a store (`node build.mjs --store play`) never asks. Google Play's rules
// forbid an app from updating itself, or sending its players elsewhere for updates, outside Play; Play updates it itself.

const RELEASES_API = 'https://api.github.com/repos/hpatter9/legends-of-the-fall/releases/latest';

export interface AppUpdate {
  version: string;
  url: string;
}

/** True when the page is running inside the Capacitor app (not a browser). */
export function inApp(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/** Is release tag `a` ("v0.320.0" or "0.320.0") newer than `b`? Compares the dotted numbers. */
export function newerThan(a: string, b: string): boolean {
  const parts = (s: string) => s.replace(/^v/i, '').split('·')[0].trim().split('.').map((n) => parseInt(n, 10) || 0);
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

/** The store this build is for ('play'), or '' for the web page and the GitHub release's app. */
export const STORE: string = typeof __STORE__ === 'string' ? __STORE__ : '';

/** Does this build look for a newer release? Only the GitHub release's app: not the web page, and never a store's build. */
export function updateCheckOn(store: string, app: boolean): boolean {
  return app && store === '';
}

let found: AppUpdate | null = null;

/** The newer release found at start, if any. */
export const appUpdate = (): AppUpdate | null => found;

/** Check once (app only). Calls `then` if a newer release exists. */
export function checkAppUpdate(current: string, then?: (u: AppUpdate) => void): void {
  if (!updateCheckOn(STORE, inApp())) return;
  fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { tag_name?: string; html_url?: string } | null) => {
      if (!j?.tag_name || !j.html_url || !newerThan(j.tag_name, current)) return;
      found = { version: j.tag_name.replace(/^v/i, ''), url: j.html_url };
      then?.(found);
    })
    .catch(() => {});
}
