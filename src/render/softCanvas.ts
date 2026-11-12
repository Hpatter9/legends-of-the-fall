// WAVE-DELAY (docs/notes/wave-delay.md): the small canvases a board is painted on (its columns, the floors cut for them, the portraits,
// the field's lights) are asked for as software canvases. A browser may keep a canvas on the graphics card; a picture drawn from such
// a canvas onto an ordinary one, or handed to WebGL from it, is then read back from the card each time, and a board is hundreds of
// those. In the installed app (an Android WebView) the next board's build was one stop of 7 to 10 s on a phone whose browser built
// it in a fraction of a second. `willReadFrequently` keeps a canvas in ordinary memory in every browser, so none of it is read back.
export const SOFT: CanvasRenderingContext2DSettings = { willReadFrequently: true };
