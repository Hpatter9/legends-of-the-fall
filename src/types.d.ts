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
/** The usual board's size as "8x11", set by the build (`node build.mjs --board 7x9`); the sim reads it with `typeof` so tests, which do not define it, get the default. */
declare const __BOARD__: string | undefined;
