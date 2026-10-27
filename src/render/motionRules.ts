// Presentation curves only: these never change an attack's time or outcome.
export function attackMotion(progress: number): { offset: number; stretch: number } {
  const p = Math.max(0, Math.min(1, progress));
  if (p === 0 || p === 1) return { offset: 0, stretch: 0 };
  if (p < 0.25) return { offset: -3 * Math.sin((p / 0.25) * Math.PI / 2), stretch: -0.04 * p / 0.25 };
  if (p < 0.45) {
    const k = (p - 0.25) / 0.2;
    return { offset: -3 + 9 * (1 - (1 - k) ** 3), stretch: -0.04 + 0.12 * k };
  }
  const k = (1 - p) / 0.55;
  return { offset: 6 * k * k, stretch: 0.08 * k * k };
}
