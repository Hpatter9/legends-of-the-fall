// Strip cells can catch tiny fragments of a neighbour's glow. Remove only detached peripheral fragments;
// central details, substantial separate shapes and sparks near the main painting stay intact.
export function cleanAtlasCell(data: Uint8ClampedArray, width: number): void {
  const size = width * width;
  const seen = new Uint8Array(size);
  const groups: number[][] = [];
  for (let p = 0; p < size; p++) {
    if (seen[p] || data[p * 4 + 3] < 24) continue;
    const group = [p];
    seen[p] = 1;
    for (let i = 0; i < group.length; i++) {
      const at = group[i], x = at % width;
      for (const next of [x ? at - 1 : -1, x < width - 1 ? at + 1 : -1, at - width, at + width]) {
        if (next < 0 || next >= size || seen[next] || data[next * 4 + 3] < 24) continue;
        seen[next] = 1;
        group.push(next);
      }
    }
    groups.push(group);
  }
  if (!groups.length) return;
  groups.sort((a, b) => b.length - a.length);
  const distance = new Uint16Array(size).fill(width * 2);
  for (const p of groups[0]) distance[p] = 0;
  for (let p = 0; p < size; p++) distance[p] = Math.min(distance[p], p % width ? distance[p - 1] + 1 : width * 2, p >= width ? distance[p - width] + 1 : width * 2);
  for (let p = size - 1; p >= 0; p--) distance[p] = Math.min(distance[p], p % width < width - 1 ? distance[p + 1] + 1 : width * 2, p < size - width ? distance[p + width] + 1 : width * 2);
  for (const group of groups.slice(1)) {
    if (group.length >= groups[0].length * 0.6) continue;
    let x0 = width, y0 = width, x1 = 0, y1 = 0, sx = 0, sy = 0, gap = width * 2;
    for (const p of group) {
      const x = p % width, y = Math.floor(p / width);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      sx += x; sy += y; gap = Math.min(gap, distance[p]);
    }
    const radius = Math.hypot(sx / group.length - width / 2, sy / group.length - width / 2);
    if (gap <= 6 || radius < width * 0.36) continue;
    for (let y = Math.max(0, y0 - 2); y <= Math.min(width - 1, y1 + 2); y++)
      for (let x = Math.max(0, x0 - 2); x <= Math.min(width - 1, x1 + 2); x++) data[(y * width + x) * 4 + 3] = 0;
  }
}
