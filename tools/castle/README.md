# Castle art

`gen.py <outdir> <seeds> [names]` asks PixelLab (`create-image-pixflux`, credentials from the proxy) for each piece at its
final pixel size, six requests at a time, and logs each request to `jobs.log` before sending it. `pick.py <outdir>` copies the
chosen seed of each piece into `src/art/castle/`, trimmed to its pixels. `shots.mjs` takes the Castle tab samples.
