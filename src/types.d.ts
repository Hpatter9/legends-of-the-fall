// Pictures are bundled as data URLs (esbuild's `dataurl` loader).
declare module '*.png' {
  const url: string;
  export default url;
}
declare module '*.webp' {
  const url: string;
  export default url;
}

declare const __GAME_VERSION__: string;
/** The tactics whose painted icon is in the build (`build.mjs`: ui/tactics/<id>.png); none until they are drawn. */
declare const __TACTIC_ART__: string[];
/** The usual board's size as "8x11", set by the build (`node build.mjs --board 7x9`); the sim reads it with `typeof` so tests, which do not define it, get the default. */
declare const __BOARD__: string | undefined;
/** The store this build is for (`node build.mjs --store play`), or '' for the web page and the GitHub release's app; read with `typeof`, as `__BOARD__` is. */
declare const __STORE__: string | undefined;
/** Text files taken into the bundle as a string (`import md from '../CREDITS.md' with { type: 'text' }`; esbuild reads it at build time). */
declare module '*.md' {
  const text: string;
  export default text;
}
