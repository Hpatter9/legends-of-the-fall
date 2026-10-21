// Pictures are bundled as data URLs (esbuild's `dataurl` loader).
declare module '*.png' {
  const url: string;
  export default url;
}

declare const __GAME_VERSION__: string;
