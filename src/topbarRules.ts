// The camp's top bar, its pure rules (TOPBAR-FIT, docs/notes/topbar-fit.md): no DOM here, so the tests can read it.
/** A top-bar count, short from 100,000 up (TOPBAR-FIT): 99999 stays whole, 123456 is "123k", 1234567 is "1.2M", 12345678 "12M". */
export function chipNumber(n: number): string {
  if (n < 100_000) return String(n);
  if (n < 1_000_000) return `${Math.floor(n / 1000)}k`;
  const m = n / 1_000_000;
  return m < 10 ? `${Math.floor(m * 10) / 10}M` : `${Math.floor(m)}M`;
}
