// RELEASE-TRIM (docs/notes/release-trim.md): the hooks the developer's tools reach the page by (`window.__game`, `__castSpell`,
// `__forceLucky`, `__forceDrop`, the screenshot tools' handles...) are put on the page, and the forcing ones honoured, only when the page is
// driven by a browser under automation: `navigator.webdriver`, which the tools' Playwright sets and a player's browser never does. So no
// build, the web's or the store's, hands a player a console helper that gives a reward or skips progress. Plain DOM, no game rules.

/** Whether the page is being driven by the developer's tools (a browser under automation). */
export const toolsOn = (): boolean => typeof navigator !== 'undefined' && navigator.webdriver === true;

/** Put a tools' hook on the window, only for the tools. */
export function toolHook(name: string, value: unknown): void {
  if (toolsOn()) (window as unknown as Record<string, unknown>)[name] = value;
}
