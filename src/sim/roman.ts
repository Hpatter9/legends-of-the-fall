// Roman numerals for the page's numbered things (a hero's number on its summoning card). Pure: no Pixi, no DOM.

const PARTS: readonly [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

/** `n` (1 to 3999) in Roman numerals: 67 is LXVII. (FIRST-HOUR: the card's own list had no L or XC, so hero 67 read "XLXVII".) */
export function roman(n: number): string {
  let s = '';
  let left = Math.max(0, Math.floor(n));
  for (const [v, r] of PARTS)
    while (left >= v) {
      s += r;
      left -= v;
    }
  return s;
}
