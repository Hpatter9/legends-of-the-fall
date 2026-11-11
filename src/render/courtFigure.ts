// Small mesh movements of the painted cutouts: feet stay planted, the upper body breathes and cloth stirs.
// A greeting leans the upper body forward and returns to rest; the painting's anatomy and equipment stay intact.
export function drawCourtFigure(g: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, height: number, right: boolean, time: number, reduced: boolean, greeting = 0): void {
  const width = height * image.naturalWidth / image.naturalHeight;
  g.save(); g.translate(x,y);
  if (!right) g.scale(-1,1);
  if (reduced) g.drawImage(image,-width/2,-height,width,height);
  else {
    const breath = Math.sin(time/1350)*height*.004;
    const sway = Math.sin(time/2100)*width*.008;
    // Bounded one-shot bow. Ground and the bottom quarter never move.
    const bow = Math.sin(Math.max(0,Math.min(1,greeting))*Math.PI);
    const strips = 40;
    for (let row=0;row<strips;row++) {
      const u=row/strips;
      const upper=Math.max(0,1-u/.8);
      const shift=sway*upper+bow*width*.065*upper;
      const lift=breath*upper-bow*height*.018*upper;
      const sy=image.naturalHeight*u;
      const sh=Math.min(image.naturalHeight-sy,image.naturalHeight/strips+1);
      g.drawImage(image,0,sy,image.naturalWidth,sh,-width/2+shift,-height+height*u-lift,width,height*sh/image.naturalHeight+.35);
    }
  }
  g.restore();
}
